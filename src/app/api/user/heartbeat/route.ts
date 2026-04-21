import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { isTransientNetworkError, summarizeUnknownError } from '@/lib/network-errors';

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let location = 'lobby';
    try {
      const body = await req.json();
      if (typeof body?.location === 'string' && body.location.trim()) {
        location = body.location.trim();
      }
    } catch {
      // Mantener la ubicación por defecto del lobby cuando el body está vacío o inválido.
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('users')
      .update({
        last_seen_at: new Date().toISOString(),
        current_location: location,
      })
      .eq('id', userId)
      .abortSignal(AbortSignal.timeout(3000));

    if (error) {
      if (isTransientNetworkError(error)) {
        console.warn('[Heartbeat] Transient Supabase issue, heartbeat skipped:', summarizeUnknownError(error));
        return NextResponse.json({ success: false, skipped: true, reason: 'transient_network_issue' });
      }

      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (isTransientNetworkError(error)) {
      console.warn('[Heartbeat] Transient Supabase issue, heartbeat skipped:', summarizeUnknownError(error));
      return NextResponse.json({ success: false, skipped: true, reason: 'transient_network_issue' });
    }

    console.error('[Heartbeat Error]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
});
