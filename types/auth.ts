export interface User {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  is_super_admin?: boolean;
  created_at: string;
  spent_points?: number;
  inventory?: string[];
  equipped?: {
    avatar: string | null;
    border: string | null;
    title: string | null;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  hcaptchaToken: string;
  acceptedPolicies: boolean;
  consentVersion?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
