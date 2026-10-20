# 🔐 Centavo — `auth-service`

Microservicio encargado de la gestión de identidad, registro de cuentas, inicio de sesión y emisión/validación de tokens seguros (JWT) para autorizar las solicitudes del ecosistema **Centavo**.

---

## 🛡️ Directivas de Seguridad (`AGENTS.md`)

1. **Prohibición de credenciales/tokens en logs**: Todo registro de eventos pasa por `src/utils/logger.ts`, el cual redacta automáticamente campos sensibles (`password`, `passwordHash`, `token`, `authorization`, y patrones `Bearer <token>`).
2. **Validación de sesión en un único módulo central**: Toda validación y verificación de sesiones pasa exclusivamente por `src/security/sessionValidator.ts`. Ningún otro módulo ni ruta valida tokens de forma independiente.
3. **Hashing de contraseñas auditado**: `src/security/passwordHasher.ts` utiliza `scrypt` (`node:crypto`) con sales aleatorias de 128 bits y comparación en tiempo constante (`crypto.timingSafeEqual`). Cualquier cambio a esta lógica requiere justificación explícita en el plan antes de ejecutarse.

---

## 🚀 Endpoints Principales

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Registra un nuevo usuario (`email`, `password`, `name`) y retorna el usuario público + sesión. |
| `POST` | `/auth/login` | Autentica credenciales y emite un token JWT firmado. |
| `GET` / `POST` | `/auth/verify` | Verifica la validez de la sesión actual a través del módulo central `sessionValidator`. |
| `POST` | `/auth/logout` | Revoca el identificador de sesión (`jti`) activo. |
| `GET` | `/health` | Estado de salud del servicio. |

---

## 🛠️ Ejecución y Pruebas

```bash
# Iniciar en modo desarrollo (Puerto 3001 por defecto)
npm run dev

# Ejecutar pruebas automatizadas
npm test
```
