import type { JWTPayload } from './jwt';
import crypto from 'crypto';

export const normalizeEmail = (email?: string | null): string =>
  String(email || '').trim().toLowerCase();

export const getConfiguredSuperAdminEmail = (): string =>
  normalizeEmail(process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL);

export const getConfiguredSuperAdminEmailKey = (): string => {
  const superAdminEmail = getConfiguredSuperAdminEmail();
  if (!superAdminEmail) return '';
  return crypto.createHash('sha256').update(superAdminEmail).digest('hex');
};

export const isSuperAdminEmail = (email?: string | null): boolean =>
  Boolean(getConfiguredSuperAdminEmail()) &&
  normalizeEmail(email) === getConfiguredSuperAdminEmail();

export const isSuperAdminEmailKey = (emailKey?: string | null): boolean =>
  Boolean(getConfiguredSuperAdminEmailKey()) &&
  String(emailKey || '') === getConfiguredSuperAdminEmailKey();

export const isSuperAdminPayload = (
  payload?: Pick<JWTPayload, 'email'> | null
): boolean => isSuperAdminEmail(payload?.email);
