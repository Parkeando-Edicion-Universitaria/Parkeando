import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth } from '@/lib/auth-middleware';

async function handler(_req: NextRequest) {
    const supabaseAdmin = getServiceSupabase();
    const { data, error } = await supabaseAdmin
        .from('login_attempts')
        .select('id, user_id, ip_address, user_agent, success, attempted_at')
        .order('attempted_at', { ascending: false })
        .limit(200);

    if (error) {
        return NextResponse.json({ error: 'Error al obtener intentos de login' }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });
}

export const GET = withAuth(handler, { requireAdmin: true });
