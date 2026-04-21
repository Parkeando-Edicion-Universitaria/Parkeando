import { NextRequest } from 'next/server';

export interface NormalizedIPInfo {
  ip: string;
  private?: boolean;
  message?: string;
  isp?: {
    asn?: string | null;
    org?: string | null;
    isp?: string | null;
  };
  location?: {
    country?: string | null;
    country_code?: string | null;
    city?: string | null;
    state?: string | null;
    zipcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    localtime?: string | null;
  };
  risk?: {
    is_mobile?: boolean | null;
    is_vpn?: boolean | null;
    is_tor?: boolean | null;
    is_proxy?: boolean | null;
    is_datacenter?: boolean | null;
    risk_score?: number | null;
  };
}

const LOCAL_IPS = new Set([
  'unknown',
  '::1',
  '127.0.0.1',
  'localhost',
  '::ffff:127.0.0.1',
]);

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

const PRIVATE_IPV6_RANGES = [/^::1$/i, /^fc/i, /^fd/i, /^fe80:/i];

const toRecord = (value: unknown): Record<string, any> | null =>
  value && typeof value === 'object' ? (value as Record<string, any>) : null;

const readText = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const readNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const readBoolean = (value: unknown) => (typeof value === 'boolean' ? value : null);

export const getRequestIp = (request: Pick<NextRequest, 'headers'>) => {
  const directHeaders = ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'];

  for (const headerName of directHeaders) {
    const rawValue = request.headers.get(headerName);
    if (!rawValue) continue;

    const value = rawValue.split(',')[0]?.trim();
    if (value) return value;
  }

  return 'unknown';
};

export const isPrivateOrLocalIp = (ip?: string | null) => {
  if (!ip) return true;
  if (LOCAL_IPS.has(ip)) return true;
  if (PRIVATE_IPV4_RANGES.some((range) => range.test(ip))) return true;
  if (PRIVATE_IPV6_RANGES.some((range) => range.test(ip))) return true;
  return false;
};

export const createPrivateIpInfo = (ip: string): NormalizedIPInfo => ({
  ip,
  private: true,
  message: 'IP privada/local - sin datos externos de geolocalizacion',
});

export const normalizeIpQueryInfo = (value: unknown): NormalizedIPInfo | null => {
  const raw = toRecord(value);
  if (!raw) return null;

  const ip = readText(raw.ip);
  if (!ip) return null;

  const isp = toRecord(raw.isp);
  const location = toRecord(raw.location);
  const risk = toRecord(raw.risk);
  const privateIp = raw.private === true || isPrivateOrLocalIp(ip);

  return {
    ip,
    private: privateIp || undefined,
    message: readText(raw.message) ?? (privateIp ? 'IP privada/local - sin datos externos de geolocalizacion' : undefined),
    isp: isp
      ? {
          asn: readText(isp.asn),
          org: readText(isp.org),
          isp: readText(isp.isp),
        }
      : undefined,
    location: location
      ? {
          country: readText(location.country),
          country_code: readText(location.country_code),
          city: readText(location.city),
          state: readText(location.state),
          zipcode: readText(location.zipcode),
          latitude: readNumber(location.latitude),
          longitude: readNumber(location.longitude),
          timezone: readText(location.timezone),
          localtime: readText(location.localtime),
        }
      : undefined,
    risk: risk
      ? {
          is_mobile: readBoolean(risk.is_mobile),
          is_vpn: readBoolean(risk.is_vpn),
          is_tor: readBoolean(risk.is_tor),
          is_proxy: readBoolean(risk.is_proxy),
          is_datacenter: readBoolean(risk.is_datacenter),
          risk_score: readNumber(risk.risk_score),
        }
      : undefined,
  };
};

export async function fetchIpQueryInfo(ip: string, timeoutMs = 5000): Promise<NormalizedIPInfo> {
  if (!ip || isPrivateOrLocalIp(ip)) {
    return createPrivateIpInfo(ip || 'unknown');
  }

  const response = await fetch(`https://api.ipquery.io/${encodeURIComponent(ip)}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ParkeandoGame/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`IPQUERY_${response.status}`);
  }

  const text = await response.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('IPQUERY_BAD_JSON');
  }

  const normalized = normalizeIpQueryInfo(parsed);
  if (!normalized) {
    throw new Error('IPQUERY_BAD_PAYLOAD');
  }

  return normalized;
}
