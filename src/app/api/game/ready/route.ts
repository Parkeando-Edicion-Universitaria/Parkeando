import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { getActiveGame, GameStatus, GAME_CONSTANTS, getGameForUser } from '@/lib/game-manager';

export const POST = withAuth(async (req) => {
    try {
        const user = req.user!;
        const db = getServiceSupabase();

        const activeGame = await getGameForUser(user.userId);
        if (!activeGame || activeGame.status !== GameStatus.WAITING) {
            return NextResponse.json({ error: 'No hay partida en espera.' }, { status: 400 });
        }

        const isPlayer = activeGame.players.some(p => p.userId === user.userId);
        if (!isPlayer) {
            return NextResponse.json({ error: 'No eres jugador de esta partida.' }, { status: 403 });
        }

        // Usar la tabla 'games' y su columna 'queue' como JSONB store para los estados de listo
        const { data: gameData } = await db.from('games').select('queue').eq('id', activeGame.id).single();
        let queueObj = gameData?.queue || {};
        if (Array.isArray(queueObj)) {
            queueObj = {};
        }

        // alternar listo estado
        const currentReady = queueObj[user.userId] === true;
        queueObj[user.userId] = !currentReady;

        // Actualizar JSONB
        // También limpiaremos o setearemos el countdown aquí
        const activePlayerIds = activeGame.players.map(p => p.userId);
        const readyPlayersCount = activePlayerIds.filter(id => queueObj[id] === true).length;

        let startCountdownAt = null;
        if (activePlayerIds.length >= GAME_CONSTANTS.MIN_PLAYERS && readyPlayersCount === activePlayerIds.length) {
            // Todos listos, activar cuenta regresiva de 10 segundos
            const countdownDate = new Date();
            countdownDate.setSeconds(countdownDate.getSeconds() + 10);
            startCountdownAt = countdownDate.toISOString();
        }

        const { error: updateError } = await db.from('games').update({
            queue: {
                ...queueObj,
                _startCountdownAt: startCountdownAt
            }
        }).eq('id', activeGame.id);

        if (updateError) {
            console.error('[API Ready] DB Error:', updateError);
            throw updateError;
        }

        const stateDesc = !currentReady ? 'Estás listo.' : 'Ya no estás listo.';
        return NextResponse.json({
            success: true,
            message: stateDesc,
            isReady: !currentReady,
            readyCount: readyPlayersCount,
            total: activePlayerIds.length,
            startCountdownAt
        });

    } catch (error) {
        console.error('Error al cambiar estado de Ready:', error);
        return NextResponse.json({ error: 'Error interno o de servidor.' }, { status: 500 });
    }
});
