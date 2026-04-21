import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { supabase } from '@/lib/supabase';

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { game_id } = body;

    if (game_id) {
      await supabase.from('games').update({ status: 'finished' }).eq('id', game_id);
    } else {
      await supabase.from('games').update({ status: 'finished' }).in('status', ['waiting', 'in_progress']);
    }

    return NextResponse.json({ success: true, message: 'Juego(s) reiniciado(s)' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}, { requireAdmin: true });
