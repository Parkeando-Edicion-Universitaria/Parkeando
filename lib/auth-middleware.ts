import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from './jwt';
import { isSuperAdminPayload } from './super-admin';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export const withAuth = (
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean; requireSuperAdmin?: boolean }
) => {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    try {
      // Obtener token del encabezado
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'No autorizado - Token requerido' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);

      if (!payload) {
        return NextResponse.json(
          { error: 'Token inválido o expirado' },
          { status: 401 }
        );
      }

      // Verificar si requiere admin
      if (options?.requireAdmin && !payload.isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado - Se requieren permisos de administrador' },
          { status: 403 }
        );
      }

      if (options?.requireSuperAdmin && !isSuperAdminPayload(payload)) {
        return NextResponse.json(
          { error: 'Acceso denegado - Se requieren permisos de super administrador' },
          { status: 403 }
        );
      }

      // Agregar usuario al request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = payload;

      return handler(authenticatedReq, context);
    } catch (error) {
      console.error('Error en middleware de autenticación:', error);
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 500 }
      );
    }
  };
};

export const getUserFromRequest = (req: NextRequest): JWTPayload | null => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  return verifyAccessToken(token);
};
