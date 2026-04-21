import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { fetchIpQueryInfo, isPrivateOrLocalIp } from '@/lib/ipquery';

/**
 * obtener /api/admin/ip-info?ip=1.2.3.4
 *
 * Enriches an IP address con geolocation, ASN, y threat datos
 * using ipquery.io (free, no API key required para basic usage).
 *
 * solo accessible to admins (withAuth + requireAdmin).
 */
async function handler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get('ip')?.trim();

    if (!ip) {
        return NextResponse.json({ error: 'IP requerida' }, { status: 400 });
    }

    // Validar formato de IP (IPv4 o IPv6 básico)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        return NextResponse.json({ error: 'Formato de IP inválido' }, { status: 400 });
    }

    try {
        const data = await fetchIpQueryInfo(ip, 5000);
        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'private, max-age=300', // caché 5 min por admin session
            },
        });
    } catch (err) {
        if (isPrivateOrLocalIp(ip)) {
            return NextResponse.json(await fetchIpQueryInfo(ip, 5000), {
                headers: {
                    'Cache-Control': 'private, max-age=300',
                },
            });
        }
        if (err instanceof Error && err.name === 'TimeoutError') {
            return NextResponse.json({ error: 'Timeout al consultar ipquery.io' }, { status: 504 });
        }
        console.error('[IP Info] Error:', err);
        return NextResponse.json({ error: 'Error al obtener información de la IP' }, { status: 500 });
    }
}

export const GET = withAuth(handler, { requireAdmin: true });
