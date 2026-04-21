import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { getGameForUser, GameStatus, GAME_CONSTANTS } from '@/lib/game-manager';

export const POST = withAuth(async (req) => {
    try {
        const user = req.user!;
        const db = getServiceSupabase();

        const activeGame = await getGameForUser(user.userId);
        if (!activeGame || activeGame.status !== GameStatus.WAITING) {
            return NextResponse.json({ error: 'No hay partida en espera.' }, { status: 400 });
        }

        // 1. Obtener datos frescos de la DB
        const { data: gameData } = await db
            .from('games')
            .select('queue, created_at')
            .eq('id', activeGame.id)
            .single();

        const queueObj = gameData?.queue || {};

        if (!queueObj._startCountdownAt) {
            return NextResponse.json({ error: 'La cuenta regresiva no ha iniciado.' }, { status: 400 });
        }

        const countdownDate = new Date(queueObj._startCountdownAt);
        const now = new Date();

        // 2. Verificar que el tiempo ya pasó (margen de 1s para lag)
        if (now.getTime() < countdownDate.getTime() - 1000) {
            return NextResponse.json({
                error: 'Debes esperar a que termine la cuenta regresiva.',
                remaining: Math.max(0, countdownDate.getTime() - now.getTime())
            }, { status: 400 });
        }

        // 3. Verificar que TODOS los jugadores siguen listos
        const activePlayerIds = activeGame.players.map(p => p.userId);
        const readyPlayersCount = activePlayerIds.filter(id => queueObj[id] === true).length;

        if (activePlayerIds.length < GAME_CONSTANTS.MIN_PLAYERS || readyPlayersCount !== activePlayerIds.length) {
            // Alguien se desmarcó o se fue, cancelar inicio
            const resetQueue = { ...queueObj, _startCountdownAt: null };
            await db.from('games').update({ queue: resetQueue }).eq('id', activeGame.id);
            return NextResponse.json({ error: 'Alguien ya no está listo. Inicio cancelado.' }, { status: 400 });
        }

        // 4. ¡Iniciar el juego oficialmente!
        // El primer turno es para cualquiera al azar o por orden de unión
        const firstPlayer = activeGame.players[0];

        const startTimestamp = new Date().toISOString();

        await db.from('games').update({
            status: GameStatus.IN_PROGRESS,
            started_at: startTimestamp,
            updated_at: startTimestamp,
            current_turn: firstPlayer.userId,
            turn_start_time: startTimestamp,
            turn_number: 1,
            queue: { ...queueObj, _startCountdownAt: null } // Limpiar
        }).eq('id', activeGame.id);

        // Reinicia actividad y estados temporales para evitar expulsiones AFK inmediatas
        // cuando los jugadores pasan de sala de espera a partida en curso.
        await db
            .from('game_players')
            .update({
                last_action_at: startTimestamp,
                pending_position: null,
                pending_dice: null,
                pending_card_id: null,
                updated_at: startTimestamp,
            })
            .eq('game_id', activeGame.id)
            .in('status', ['active', 'disconnected']);

        return NextResponse.json({
            success: true,
            message: '¡Partida iniciada con éxito!',
            gameId: activeGame.id
        });

    } catch (error) {
        console.error('Error al iniciar partida:', error);
        return NextResponse.json({ error: 'Error interno o de servidor.' }, { status: 500 });
    }
});
