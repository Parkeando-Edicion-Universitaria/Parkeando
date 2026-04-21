import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types/auth';
import { Result, ApplicationError, Ok, Err, NetworkError, normalizeNetworkErrorMessage } from '@/lib/result';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  updateTokens: (tokens: AuthTokens) => void;

  hydrated: boolean;
  setHydrated: (val: boolean) => void;

  checkAuth: () => Promise<boolean>;

  /**
   * Intenta refrescar el access token usando el refresco token almacenado.
   * Devuelve el nuevo access token, o null si falla (sesión inválida).
   */
  refreshAccessToken: () => Promise<string | null>;

  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  safeAuthenticatedFetch: <T>(url: string, options?: RequestInit) => Promise<Result<T, ApplicationError>>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      hydrated: false,

      setHydrated: (val) => set({ hydrated: val }),

      setAuth: (user, tokens) => set({ user, tokens, isAuthenticated: true }),

      clearAuth: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
        // Si estamos en una ruta protegida y se limpia el auth, redirigir al login
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/admin') || path.startsWith('/game')) {
            window.location.href = '/auth/login';
          }
        }
      },

      updateTokens: (tokens) => set({ tokens }),

      checkAuth: async (): Promise<boolean> => {
        const { tokens, refreshAccessToken, clearAuth } = get();
        if (!tokens?.accessToken) {
          clearAuth();
          return false;
        }

        try {
          // Decodificación básica del JWT para verificar expiración localmente
          const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
          const expiry = payload.exp * 1000;

          const currentUser = get().user;
          if (payload?.isSuperAdmin && currentUser && !currentUser.is_super_admin) {
            set({ user: { ...currentUser, is_super_admin: true } });
          }

          if (Date.now() >= expiry) {
            // Token expirado, intentar refrescar
            const newToken = await refreshAccessToken();
            return !!newToken;
          }

          return true;
        } catch {
          clearAuth();
          return false;
        }
      },

      refreshAccessToken: async (): Promise<string | null> => {
        const { tokens, clearAuth } = get();
        if (!tokens?.accessToken) {
          clearAuth();
          return null;
        }

        // Evitar múltiples refrescos simultáneos
        if ((useAuthStore as any)._refreshPromise) {
          return (useAuthStore as any)._refreshPromise;
        }

        const refreshPromise = (async () => {
          try {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({}),
            });

            if (!res.ok) {
              clearAuth();
              return null;
            }

            const data = await res.json();
            const newTokens: AuthTokens = {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken ?? tokens.refreshToken,
            };

            // Si el refresco también devolvió datos de usuario, actualizarlos
            if (data.user) {
              set({ user: data.user, tokens: newTokens, isAuthenticated: true });
            } else {
              set({ tokens: newTokens });
            }

            return newTokens.accessToken;
          } catch {
            clearAuth();
            return null;
          } finally {
            (useAuthStore as any)._refreshPromise = null;
          }
        })();

        (useAuthStore as any)._refreshPromise = refreshPromise;
        return refreshPromise;
      },

      authenticatedFetch: async (url: string, options: RequestInit = {}): Promise<Response> => {
        const { tokens, refreshAccessToken, clearAuth } = get();

        const networkErrorResponse = (error: unknown) => {
          return new Response(
            JSON.stringify({
              error: normalizeNetworkErrorMessage(error),
              code: 'NETWORK_ERROR',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        };

        const makeRequest = async (accessToken: string) => {
          try {
            return await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
              },
            });
          } catch (error: unknown) {
            return networkErrorResponse(error);
          }
        };

        if (!tokens?.accessToken) {
          clearAuth();
          // Devolver una respuesta de error tipada
          return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
        }

        // Primer intento
        let response = await makeRequest(tokens.accessToken);

        // Si 401, intentar refresco silencioso (una sola vez — no loop infinito)
        if (response.status === 401) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            response = await makeRequest(newToken);
          }
        }

        return response;
      },

      safeAuthenticatedFetch: async <T>(url: string, options: RequestInit = {}): Promise<Result<T, ApplicationError>> => {
        try {
          const response = await get().authenticatedFetch(url, options);
          if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
              const data = await response.json();
              errorMsg = data.error || errorMsg;
            } catch {}
            return Err(new ApplicationError(errorMsg, "API_ERROR", response.status));
          }
          const data = await response.json();
          return Ok(data as T);
        } catch (e: unknown) {
          return Err(new NetworkError(normalizeNetworkErrorMessage(e)));
        }
      },
    }),
    {
      name: 'parkeando-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          if (!error && rehydratedState) {
            rehydratedState.setHydrated(true);
          }
        };
      },
    }
  )
);
