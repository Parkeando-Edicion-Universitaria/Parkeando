import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { removePlayerByAdmin } from '@/lib/game-manager';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

/**
 * POST /api/admin/usuarios/:id/kick
 * Remueve a un usuario de cualquier partida activa
 */
export const POST = withAuth(async (_req: AuthenticatedRequest, context: any) => {
  try {
    const { id } = await context.params;
    const db = getServiceSupabase();
    const adminUserId = _req.user?.userId ?? null;
    const actorIsSuperAdmin = isSuperAdminPayload(_req.user);

    const { data: targetUser, error: targetError } = await db
      .from('users')
      .select('email, email_key')
      .eq('id', id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if ((isSuperAdminEmailKey(targetUser.email_key) || isSuperAdminEmail(decryptEmail(targetUser.email))) && !actorIsSuperAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para expulsar al super administrador' }, { status: 403 });
    }

    const { data: adminUser } = adminUserId
      ? await db.from('users').select('username').eq('id', adminUserId).maybeSingle()
      : { data: null as { username?: string } | null };

    const result = await removePlayerByAdmin({
      userId: id,
      action: 'kick',
      adminUserId,
      adminUsername: adminUser?.username ?? 'Administración',
      adminReason: 'Expulsión administrativa desde el panel',
    });

    if (!result.removed) {
      return NextResponse.json({ error: 'El usuario no está en una partida activa' }, { status: 404 });
    }

    return NextResponse.json({
      message: result.message,
      endedGame: result.endedGame,
      winnerId: result.winnerUserId,
      winnerUsername: result.winnerUsername,
    });
  } catch (error: any) {
    console.error('[Kick User Error]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });
