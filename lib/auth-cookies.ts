import { NextRequest, NextResponse } from 'next/server';

export const REFRESH_TOKEN_COOKIE_NAME = 'parkeando_rt';
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieSameSite: 'lax' | 'strict' = isProduction ? 'strict' : 'lax';

export const setRefreshTokenCookie = (response: NextResponse, refreshToken: string): void => {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    secure: isProduction,
    sameSite: refreshCookieSameSite,
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
};

export const clearRefreshTokenCookie = (response: NextResponse): void => {
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: refreshCookieSameSite,
    path: '/api/auth',
    maxAge: 0,
  });
};

export const getRefreshTokenFromRequest = (request: NextRequest): string | null => {
  const cookieToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;
  if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return null;
};