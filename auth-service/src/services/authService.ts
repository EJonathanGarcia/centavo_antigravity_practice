import { userStore, type PublicUser } from '../models/userStore.ts';
import { hashPassword, verifyPassword } from '../security/passwordHasher.ts';
import {
  issueSessionToken,
  extractAndValidateSession,
  revokeSessionToken,
  type SessionValidationResult,
} from '../security/sessionValidator.ts';
import { logger } from '../utils/logger.ts';

export class AuthError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  expiresAt: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authService = {
  /**
   * Registra un nuevo usuario, hashea su contraseña con scrypt y emite una sesión inicial.
   */
  async register(input: {
    email?: string;
    password?: string;
    name?: string;
  }): Promise<AuthResponse> {
    const email = input.email?.trim().toLowerCase() ?? '';
    const name = input.name?.trim() ?? '';
    const password = input.password ?? '';

    if (!email || !EMAIL_REGEX.test(email)) {
      throw new AuthError('INVALID_EMAIL', 'El correo electrónico proporcionado no es válido.', 400);
    }

    if (!name || name.length < 2) {
      throw new AuthError('INVALID_NAME', 'El nombre es obligatorio y debe tener al menos 2 caracteres.', 400);
    }

    if (!password || password.length < 8) {
      throw new AuthError('WEAK_PASSWORD', 'La contraseña debe tener al menos 8 caracteres.', 400);
    }

    if (userStore.findByEmail(email)) {
      logger.warn('auth.register.conflict', { email });
      throw new AuthError('EMAIL_ALREADY_REGISTERED', 'Ya existe una cuenta con este correo electrónico.', 409);
    }

    const passwordHash = await hashPassword(password);
    const createdUser = userStore.create({ email, name, passwordHash });
    const publicUser = userStore.toPublicUser(createdUser);
    const session = issueSessionToken(publicUser);

    logger.info('auth.register.success', {
      userId: publicUser.id,
      sessionId: session.sessionId,
    });

    return {
      user: publicUser,
      accessToken: session.token,
      expiresAt: session.expiresAt,
    };
  },

  /**
   * Inicia sesión verificando credenciales en tiempo constante y emitiendo un JWT.
   */
  async login(input: { email?: string; password?: string }): Promise<AuthResponse> {
    const email = input.email?.trim().toLowerCase() ?? '';
    const password = input.password ?? '';

    if (!email || !password) {
      throw new AuthError('MISSING_CREDENTIALS', 'Se requieren correo electrónico y contraseña.', 400);
    }

    const existingUser = userStore.findByEmail(email);
    if (!existingUser) {
      logger.warn('auth.login.failed', { reason: 'USER_NOT_FOUND' });
      throw new AuthError('INVALID_CREDENTIALS', 'Credenciales inválidas.', 401);
    }

    const isPasswordValid = await verifyPassword(password, existingUser.passwordHash);
    if (!isPasswordValid) {
      logger.warn('auth.login.failed', { userId: existingUser.id, reason: 'BAD_PASSWORD' });
      throw new AuthError('INVALID_CREDENTIALS', 'Credenciales inválidas.', 401);
    }

    const publicUser = userStore.toPublicUser(existingUser);
    const session = issueSessionToken(publicUser);

    logger.info('auth.login.success', {
      userId: publicUser.id,
      sessionId: session.sessionId,
    });

    return {
      user: publicUser,
      accessToken: session.token,
      expiresAt: session.expiresAt,
    };
  },

  /**
   * Verifica una sesión activa delegando exclusivamente en el módulo central `sessionValidator`.
   */
  verifySession(input: {
    authorizationHeader?: string;
    bodyToken?: string;
  }): SessionValidationResult & { user?: PublicUser } {
    const validation = extractAndValidateSession(input);
    if (!validation.valid || !validation.claims) {
      return validation;
    }

    const userRecord = userStore.findById(validation.claims.sub);
    if (!userRecord) {
      return { valid: false, reason: 'SESSION_REVOKED' };
    }

    return {
      valid: true,
      claims: validation.claims,
      user: userStore.toPublicUser(userRecord),
    };
  },

  /**
   * Cierra la sesión actual revocando su identificador `jti` en el módulo central.
   */
  logout(input: { authorizationHeader?: string; bodyToken?: string }): boolean {
    const rawToken = input.authorizationHeader ?? input.bodyToken;
    return revokeSessionToken(rawToken);
  },
};
