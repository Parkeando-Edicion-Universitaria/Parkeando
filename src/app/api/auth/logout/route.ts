import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';
import { verifyRefreshToken } from '@/lib/jwt';
import { clearRefreshTokenCookie, getRefreshTokenFromRequest } from '@/lib/auth-cookies';

async function handler(req: NextRequest) {
    const supabaseAdmin = getServiceSupabase();
    try {
        const refreshToken = getRefreshTokenFromRequest(req);

        // Revocar refresco token si fue provisto
        if (refreshToken) {
            const payload = verifyRefreshToken(refreshToken);
            if (payload?.jti) {
                await supabaseAdmin
                    .from('refresh_tokens')
                    .update({ revoked: true, revoked_at: new Date().toISOString() })
                    .eq('jti', payload.jti);
            }
        }

        // También revocar todos los refresco tokens del usuario (cierre de sesión global)
        const user = (req as any).user;
        if (user?.userId) {
            await supabaseAdmin
                .from('refresh_tokens')
                .update({ revoked: true, revoked_at: new Date().toISOString() })
                .eq('user_id', user.userId)
                .eq('revoked', false);
        }

        const response = NextResponse.json({ message: 'Sesión cerrada correctamente' });
        clearRefreshTokenCookie(response);
        return response;
    } catch (error) {
        console.error('Error en logout:', error);
        const response = NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
        clearRefreshTokenCookie(response);
        return response;
    }
}

export const POST = withAuth(handler);
