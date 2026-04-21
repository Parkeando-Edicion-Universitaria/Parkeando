import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

async function handler(
    req: AuthenticatedRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = req.user!;
        const actorIsSuperAdmin = isSuperAdminPayload(user);

        const { id: targetUserId } = await context.params;
        const { amount } = await req.json();

        if (!Number.isFinite(amount) || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 });
        }

        const db = getServiceSupabase();

        const { data: userData, error: fetchError } = await db
            .from('users')
            .select('username, email, email_key')
            .eq('id', targetUserId)
            .single();

        if (fetchError || !userData) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        if ((isSuperAdminEmailKey(userData.email_key) || isSuperAdminEmail(decryptEmail(userData.email))) && !actorIsSuperAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para modificar al super administrador' }, { status: 403 });
        }

        const { error: grantError } = await db.rpc('increment_user_points', {
            u_id: targetUserId,
            amount: Math.trunc(amount),
        });

        if (grantError) {
            console.error('Grant points error:', grantError);
            return NextResponse.json({ error: 'Error al otorgar puntos' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Se otorgaron ${amount} puntos a ${userData.username}` });

    } catch (error: any) {
        console.error('[Add Points Admin]', error);
        return NextResponse.json({ error: 'Error interno de servidor' }, { status: 500 });
    }
}

export const POST = withAuth(handler, { requireAdmin: true });
