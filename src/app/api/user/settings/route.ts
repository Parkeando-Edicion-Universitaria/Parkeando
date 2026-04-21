import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
    try {
        const userId = req.user!.userId;
        const supabaseAdmin = getServiceSupabase();

        const body = await req.json();
        const { username, password } = body;

        const updates: any = {};
        if (username) updates.username = username.slice(0, 15);

        if (password && password.length >= 6) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: password
            });
            if (passwordError) return NextResponse.json({ error: 'Falla al actualizar contraseña' }, { status: 400 });
        }

        if (Object.keys(updates).length > 0) {
            const { error: dbError } = await supabaseAdmin
                .from('users')
                .update(updates)
                .eq('id', userId);

            if (dbError) throw dbError;
        }

        return NextResponse.json({ message: 'Configuración actualizada exitosamente' });
    } catch (error: any) {
        console.error('Settings API Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
});
