import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createAuthServer } from '../index.ts';
import { userStore } from '../models/userStore.ts';
import { clearRevokedSessionsForTesting, validateSessionToken } from '../security/sessionValidator.ts';
import { logger } from '../utils/logger.ts';

describe('auth-service — Registro, Login y Verificación Centralizada de Sesión', () => {
  beforeEach(() => {
    userStore.clear();
    clearRevokedSessionsForTesting();
  });

  it('registra un usuario, inicia sesión, verifica su sesión por el módulo central y revoca en logout', async () => {
    const server = createAuthServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Registro
      const registerRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ana@centavo.app',
          name: 'Ana García',
          password: 'SuperSecretPassword123!',
        }),
      });
      assert.equal(registerRes.status, 201);
      const registerBody = (await registerRes.json()) as {
        user: { id: string; email: string; name: string; passwordHash?: string };
        accessToken: string;
      };
      assert.equal(registerBody.user.email, 'ana@centavo.app');
      assert.equal(registerBody.user.passwordHash, undefined, 'Nunca debe exponer passwordHash');
      assert.ok(registerBody.accessToken);

      // 2. Login
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ana@centavo.app',
          password: 'SuperSecretPassword123!',
        }),
      });
      assert.equal(loginRes.status, 200);
      const loginBody = (await loginRes.json()) as { accessToken: string };
      assert.ok(loginBody.accessToken);

      // 3. Verificación de sesión (GET /auth/verify con Authorization Bearer)
      const verifyRes = await fetch(`${baseUrl}/auth/verify`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginBody.accessToken}` },
      });
      assert.equal(verifyRes.status, 200);
      const verifyBody = (await verifyRes.json()) as {
        valid: boolean;
        user: { email: string };
      };
      assert.equal(verifyBody.valid, true);
      assert.equal(verifyBody.user.email, 'ana@centavo.app');

      // 4. Logout (Revocación en el módulo central)
      const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${loginBody.accessToken}` },
      });
      assert.equal(logoutRes.status, 200);

      // 5. Verificar que la sesión revocada sea rechazada
      const verifyAfterLogout = await fetch(`${baseUrl}/auth/verify`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginBody.accessToken}` },
      });
      assert.equal(verifyAfterLogout.status, 401);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('nunca loguea contraseñas ni tokens JWT en texto plano (regla AGENTS.md)', () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const entry = logger.format('INFO', `Header Bearer ${fakeJwt}`, {
      password: 'MyPlainPassword123',
      accessToken: fakeJwt,
      nested: {
        authorization: `Bearer ${fakeJwt}`,
        safeField: 'visible',
      },
    });

    const serialized = JSON.stringify(entry);
    assert.equal(serialized.includes('MyPlainPassword123'), false, 'La contraseña no debe aparecer en logs');
    assert.equal(serialized.includes(fakeJwt), false, 'El token JWT no debe aparecer en logs');
    assert.equal((entry.meta?.nested as Record<string, unknown>).safeField, 'visible');
  });

  it('rechaza tokens manipulados en el módulo central sessionValidator', () => {
    const result = validateSessionToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.invalidSig');
    assert.equal(result.valid, false);
    assert.equal(result.reason, 'INVALID_SIGNATURE');
  });
});
