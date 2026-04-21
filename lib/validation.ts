import validator from 'validator';
import { z } from 'zod';

// Sanitización de inputs
export const sanitizeInput = (input: string): string => {
  return validator.escape(validator.trim(input));
};

export const sanitizeEmail = (email: string): string => {
  return validator.normalizeEmail(email) || email;
};

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_ALLOWED_REGEX = /^[a-zA-Z0-9_]+$/;

export const normalizeUsername = (username: string): string => {
  return validator
    .trim(username)
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, USERNAME_MAX_LENGTH);
};

// Schemas de validación con Zod
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN_LENGTH, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(USERNAME_MAX_LENGTH, 'El nombre de usuario no puede exceder 20 caracteres')
    .regex(USERNAME_ALLOWED_REGEX, 'Solo letras, números y guiones bajos'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(64, 'La contraseña no puede exceder 64 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  hcaptchaToken: z.string().min(1, 'Captcha requerido'),
  acceptedPolicies: z
    .boolean()
    .refine((value) => value === true, {
      message: 'Debes aceptar los términos y la política de privacidad',
    }),
  consentVersion: z.string().trim().max(64).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const qrScanSchema = z.object({
  position: z.number().int().min(0).max(120),
  has_question: z.boolean(),
  qr_code: z.string(),
});

export const answerSchema = z.object({
  question_id: z.string().uuid(),
  answer: z.number().int().min(0).max(3),
});

// Validación de contraseña segura
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Al menos un carácter especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validación de QR
export const validateQRData = (qrData: string): boolean => {
  try {
    const data = JSON.parse(qrData);
    return (
      typeof data.position === 'number' &&
      data.position >= 0 &&
      data.position <= 120 &&
      typeof data.has_question === 'boolean' &&
      typeof data.qr_code === 'string'
    );
  } catch {
    return false;
  }
};
