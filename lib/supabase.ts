import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Singleton lazy para el cliente anónimo (público) ──────────────────────────
// Se crea en la primera llamada de método, no al cargar el módulo.
// Esto permite que `next build` funcione sin .env.local presente.
// En producción se usan la URL y la clave reales en la primera llamada.

let _anon: SupabaseClient | null = null;

const getClient = (): SupabaseClient => {
  if (_anon) return _anon;
  // Usa valores provisionales durante el build; nunca se usan en ejecución real.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';
  _anon = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _anon;
};

/**
 * Export nombrado usado en todo el código.
 * Acceder a cualquier propiedad dispara la creación lazy del cliente.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? (val as Function).bind(client) : val;
  },
});

/**
 * Service-role client — server-solo. singleton para reusar la misma instancia y evitar
 * alloación de objetos en cada API request. La service key nunca rota en runtime.
 */
let _service: SupabaseClient | null = null;

export const getServiceSupabase = (): SupabaseClient => {
  if (_service) return _service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder';
  _service = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _service;
};
