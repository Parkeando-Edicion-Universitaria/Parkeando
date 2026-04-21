'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: ReactNode;
    requireAdmin?: boolean;
    requireSuperAdmin?: boolean;
}

/**
 * AuthGuard protege las rutas del lado del cliente.
 * Verifica la sesión al montar y periódicamente mientras el usuario está en la página.
 */
export default function AuthGuard({ children, requireAdmin = false, requireSuperAdmin = false }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, checkAuth, hydrated } = useAuthStore((state: any) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        checkAuth: state.checkAuth,
        hydrated: state.hydrated
    }));

    const [isVerifying, setIsVerifying] = useState(true);
    const replaceRoute = (path: string) => {
        router.replace(path);
    };

    // Verificación inicial y periódica
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const verify = async () => {
            console.log('[AuthGuard] Verificando sesión...');
            try {
                const isValid = await checkAuth();

                if (!isValid) {
                    console.log('[AuthGuard] Sesión inválida, redirigiendo...');
                    replaceRoute(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
                    return;
                }

                if (requireAdmin && !user?.is_admin) {
                    console.log('[AuthGuard] Usuario no es admin, redirigiendo a lobby...');
                    replaceRoute('/lobby');
                    return;
                }

                if (requireSuperAdmin && !user?.is_super_admin) {
                    console.log('[AuthGuard] Usuario no es super admin, redirigiendo a lobby...');
                    replaceRoute('/lobby');
                    return;
                }

                console.log('[AuthGuard] Sesión válida.');
                setIsVerifying(false);
            } catch (error) {
                console.error('[AuthGuard] Error de red verificando sesión:', error);
                // Si ya estábamos verificados, no redirigimos de inmediato por un error de red
                if (isAuthenticated) {
                    console.warn('[AuthGuard] Fallo de red pero mantenemos estado previo (offline-ish mode)');
                    setIsVerifying(false);
                } else {
                    // Si no estábamos verificados y falla la red, esperamos un poco
                    console.log('[AuthGuard] Falla verificación inicial por red, reintentando...');
                }
            }
        };

        // Forzar hidratación si el store ya está listo pero el flag no se activó
        if (!hydrated && (useAuthStore as any).persist?.hasHydrated()) {
            useAuthStore.getState().setHydrated(true);
        }

        if (hydrated) {
            verify();
            intervalId = setInterval(verify, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [hydrated, checkAuth, user, requireAdmin, requireSuperAdmin, router, pathname]);

    if (!hydrated || isVerifying) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-slate-400 text-sm animate-pulse">Verificando sesión...</p>
            </div>
        );
    }

    return <>{children}</>;
}
