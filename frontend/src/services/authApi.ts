import { User } from '../types';

export interface AuthSessionResponse {
  user: User;
  accessToken?: string;
  expiresAt?: string;
  session?: {
    token: string;
    expiresAt?: string;
  };
  token?: string;
}

const AUTH_BASE_URL = '/api/auth';

export const authApi = {
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${AUTH_BASE_URL}/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  async login(email: string, password: string): Promise<AuthSessionResponse> {
    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      return data;
    } catch (err: unknown) {
      // If auth-service is not reachable (e.g. not running yet), throw meaningful error or handle gracefully
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('No se pudo conectar con auth-service (puerto 3001).');
      }
      throw err;
    }
  },

  async register(name: string, email: string, password: string): Promise<AuthSessionResponse> {
    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar usuario');
      }

      return data;
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error('No se pudo conectar con auth-service (puerto 3001).');
      }
      throw err;
    }
  },

  async verify(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return { valid: false };
      const data = await res.json();
      return data;
    } catch {
      return { valid: false };
    }
  },

  async logout(token: string): Promise<void> {
    try {
      await fetch(`${AUTH_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Best-effort logout
    }
  },
};
