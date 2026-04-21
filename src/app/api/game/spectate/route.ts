import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { addSpectator, getGameById, removeSpectator } from '@/lib/game-manager';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user;
        if (!user) throw new Error('Usuario no encontrado');
        const body = await req.json().catch(() => ({}));
        const requestedGameId = typeof body.gameId === 'string' ? body.gameId : null;

        let gameId = requestedGameId;
        if (!gameId) {
            const { data: liveGame, error: gameError } = await getServiceSupabase()
                .from('games')
                .select('id')
                .eq('status', 'in_progress')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (gameError || !liveGame) {
                return NextResponse.json({ error: 'No hay juego en curso para espectar' }, { status: 404 });
            }

            gameId = liveGame.id;
        }

        const game = await getGameById(gameId);
        if (!game) {
            return NextResponse.json({ error: 'No hay juego en curso para espectar' }, { status: 404 });
        }

        if (game.status !== 'in_progress') {
            return NextResponse.json(
                { error: 'Solo puedes espectar partidas que ya iniciaron.' },
                { status: 409 }
            );
        }

        const added = await addSpectator(game.id, user.userId);
        if (!added) {
            throw new Error('No se pudo activar el modo espectador');
        }

        return NextResponse.json({ success: true, gameId: game.id });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const user = req.user;
        if (!user) throw new Error('Usuario no encontrado');

        const body = await req.json().catch(() => ({}));
        const gameId = typeof body.gameId === 'string' ? body.gameId : null;

        if (!gameId) {
            return NextResponse.json({ error: 'gameId es requerido' }, { status: 400 });
        }

        const removed = await removeSpectator(gameId, user.userId);
        return NextResponse.json({ success: true, removed });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
