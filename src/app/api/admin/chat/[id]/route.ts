import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { decryptEmail } from '@/lib/security';
import { isSuperAdminEmail, isSuperAdminEmailKey, isSuperAdminPayload } from '@/lib/super-admin';

export const DELETE = withAuth(async (req: AuthenticatedRequest, context: any) => {
    try {
        const { id } = await context.params;
        const db = getServiceSupabase();
        const actorIsSuperAdmin = isSuperAdminPayload(req.user);

        const { data: messageEvent, error: fetchError } = await db
            .from('game_events')
            .select('id, game_id, event_type, event_data')
            .eq('id', id)
            .eq('event_type', 'chat_message')
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!messageEvent) {
            return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
        }

        const messageAuthorId = messageEvent.event_data?.userId;
        if (messageAuthorId) {
            const { data: messageAuthor } = await db
                .from('users')
                .select('email, email_key')
                .eq('id', messageAuthorId)
                .maybeSingle();

            const targetIsSuperAdmin = messageAuthor
                ? isSuperAdminEmailKey(messageAuthor.email_key) || isSuperAdminEmail(decryptEmail(messageAuthor.email))
                : false;

            if (targetIsSuperAdmin && !actorIsSuperAdmin) {
                return NextResponse.json({ error: 'No tienes permisos para moderar mensajes del super administrador' }, { status: 403 });
            }
        }

        const { data: adminUser } = req.user?.userId
            ? await db.from('users').select('username').eq('id', req.user.userId).maybeSingle()
            : { data: null as { username?: string } | null };

        const { error } = await db
            .from('game_events')
            .delete()
            .eq('id', id)
            .eq('event_type', 'chat_message');

        if (error) throw error;

        await db.from('game_events').insert({
            game_id: messageEvent.game_id,
            event_type: 'chat_message_deleted',
            event_data: {
                deletedMessageId: messageEvent.id,
                actorName: adminUser?.username || 'Administración',
                username: messageEvent.event_data?.username || null,
                userId: messageEvent.event_data?.userId || null,
                message: `${adminUser?.username || 'Administración'} retiró un mensaje del chat.`,
            },
        });

        return NextResponse.json({
            success: true,
            gameId: messageEvent.game_id,
            deletedMessageId: messageEvent.id,
            username: messageEvent.event_data?.username || null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}, { requireAdmin: true });
