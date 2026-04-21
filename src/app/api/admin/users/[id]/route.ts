import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { removePlayerByAdmin } from '@/lib/game-manager';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

export const PATCH = withAuth(async (req: AuthenticatedRequest, context: any) => {
    try {
        const { id } = await context.params;
        const body = await req.json();
        const supabase = getServiceSupabase();
        const actorIsSuperAdmin = isSuperAdminPayload(req.user);

        const { data: targetUser, error: targetError } = await supabase
            .from('users')
            .select('id, role, username, is_active, email, email_key')
            .eq('id', id)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const targetIsSuperAdmin =
            isSuperAdminEmailKey(targetUser.email_key) ||
            isSuperAdminEmail(decryptEmail(targetUser.email));

        if (targetIsSuperAdmin && !actorIsSuperAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para modificar al super administrador' }, { status: 403 });
        }

        if (targetUser.role === 'admin' && body.hasOwnProperty('is_active') && !actorIsSuperAdmin) {
            return NextResponse.json({ error: 'Solo el super administrador puede suspender o reactivar cuentas administradoras' }, { status: 403 });
        }

        // Solo permitir actualizar is_active, role y ban_reason
        const updates: any = {};
        if (body.hasOwnProperty('is_active')) updates.is_active = body.is_active;
        if (body.hasOwnProperty('role')) {
            if (!['user', 'admin'].includes(body.role)) {
                return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
            }

            const roleTouchesAdmin = targetUser.role === 'admin' || body.role === 'admin';
            if (roleTouchesAdmin && !actorIsSuperAdmin) {
                return NextResponse.json({ error: 'Solo el super administrador puede asignar o retirar rol admin' }, { status: 403 });
            }

            updates.role = body.role;
        }
        if (body.hasOwnProperty('ban_reason')) updates.ban_reason = body.ban_reason;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Faltan campos para actualizar' }, { status: 400 });
        }

        let data: any = null;
        let error: any = null;

        ({ data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, is_active, role')
            .single());

        if (error && typeof updates.ban_reason !== 'undefined' && String(error.message || '').includes('ban_reason')) {
            const fallbackUpdates = { ...updates };
            delete fallbackUpdates.ban_reason;

            ({ data, error } = await supabase
                .from('users')
                .update(fallbackUpdates)
                .eq('id', id)
                .select('id, is_active, role')
                .single());
        }

        if (error) throw error;

        if (updates.is_active === false) {
            const { data: adminUser } = req.user?.userId
                ? await supabase.from('users').select('username').eq('id', req.user.userId).maybeSingle()
                : { data: null as { username?: string } | null };

            try {
                await removePlayerByAdmin({
                    userId: id,
                    action: 'ban',
                    adminUserId: req.user?.userId ?? null,
                    adminUsername: adminUser?.username ?? 'Administración',
                    adminReason: typeof updates.ban_reason === 'string' ? updates.ban_reason : null,
                });
            } catch (moderationError) {
                console.error('[AdminUser PATCH] Ban cleanup error:', moderationError);
            }
        }

        return NextResponse.json({ success: true, user: data });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}, { requireAdmin: true });

export const DELETE = withAuth(async (req: AuthenticatedRequest, context: any) => {
    try {
        const { id } = await context.params;
        const supabase = getServiceSupabase();
        const actorIsSuperAdmin = isSuperAdminPayload(req.user);

        const { data: targetUser, error: targetError } = await supabase
            .from('users')
            .select('id, role, email, email_key')
            .eq('id', id)
            .single();

        if (targetError || !targetUser) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const targetIsSuperAdmin =
            isSuperAdminEmailKey(targetUser.email_key) ||
            isSuperAdminEmail(decryptEmail(targetUser.email));
        if (targetIsSuperAdmin && !actorIsSuperAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para eliminar al super administrador' }, { status: 403 });
        }

        if (targetUser.role === 'admin') {
            return NextResponse.json({ error: 'No se puede eliminar una cuenta administradora' }, { status: 400 });
        }

        const { data: adminUser } = req.user?.userId
            ? await supabase.from('users').select('username').eq('id', req.user.userId).maybeSingle()
            : { data: null as { username?: string } | null };

        // 1) Si el usuario está en una partida activa, remuévelo primero para mantener el turno consistente.
        try {
            await removePlayerByAdmin({
                userId: id,
                action: 'kick',
                adminUserId: req.user?.userId ?? null,
                adminUsername: adminUser?.username ?? 'Administración',
                adminReason: 'Cuenta eliminada permanentemente por administración',
            });
        } catch (cleanupError) {
            console.error('[AdminUser DELETE] Active game cleanup error:', cleanupError);
        }

        const nowIso = new Date().toISOString();

        // 2) Limpiar referencias directas que pueden romper el DELETE por llaves foráneas.
        const { error: currentTurnRefError } = await supabase
            .from('games')
            .update({ current_turn: null, turn_start_time: null, updated_at: nowIso })
            .eq('current_turn', id);

        if (currentTurnRefError) throw currentTurnRefError;

        const { error: winnerRefError } = await supabase
            .from('games')
            .update({ winner: null, updated_at: nowIso })
            .eq('winner', id);

        if (winnerRefError) throw winnerRefError;

        const { error: configRefError } = await supabase
            .from('system_config')
            .update({ updated_by: null, updated_at: nowIso })
            .eq('updated_by', id);

        if (configRefError && !String(configRefError.message || '').toLowerCase().includes('updated_by')) {
            throw configRefError;
        }

        // 3) Eliminar participación residual en game_players para evitar referencias huérfanas.
        const { error: gamePlayersRefError } = await supabase
            .from('game_players')
            .delete()
            .eq('user_id', id);

        if (gamePlayersRefError) throw gamePlayersRefError;

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}, { requireAdmin: true });
