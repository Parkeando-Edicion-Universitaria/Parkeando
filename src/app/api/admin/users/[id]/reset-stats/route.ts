import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

export const POST = withAuth(async (req: AuthenticatedRequest, context: any) => {
    try {
        const { id } = await context.params;
        const db = getServiceSupabase();
        const actorIsSuperAdmin = isSuperAdminPayload(req.user);
        const body = await req.json().catch(() => ({}));
        const mode = typeof body.mode === 'string' ? body.mode : 'all';

        const updates: Record<string, number> = {};

        if (mode === 'all' || mode === 'points') {
            updates.total_points = 0;
        }

        if (mode === 'all' || mode === 'wins') {
            updates.games_won = 0;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'Modo de reseteo no válido' }, { status: 400 });
        }

        const { data: userData, error: fetchError } = await db
            .from('users')
            .select('username, email, email_key')
            .eq('id', id)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if ((isSuperAdminEmailKey(userData.email_key) || isSuperAdminEmail(decryptEmail(userData.email))) && !actorIsSuperAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para modificar al super administrador' }, { status: 403 });
        }

        const { error } = await db
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        const message =
            mode === 'points'
                ? `Puntos reiniciados para ${userData.username}`
                : mode === 'wins'
                    ? `Victorias reiniciadas para ${userData.username}`
                    : `Puntos y victorias reiniciados para ${userData.username}`;

        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}, { requireAdmin: true });
