# 💸 Centavo — `transactions-service`

Microservicio encargado del registro y categorización de gastos del ecosistema **Centavo**.

> Scaffold inicial: el almacenamiento es **en memoria** (se pierde al reiniciar). Pendiente: persistencia, edición/eliminación, eventos hacia `budgets-service`.

---

## 🔐 Autenticación

Todas las rutas de `/transactions` requieren `Authorization: Bearer <token>` emitido por `auth-service`. Este servicio **no valida JWT por sí mismo**: delega en `GET {AUTH_SERVICE_URL}/auth/verify` (`src/middleware/authMiddleware.ts`), manteniendo un único módulo de validación de sesión en el monorepo. Nunca se loguean tokens (`src/utils/logger.ts` los redacta).

---

## 🚀 Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/transactions` | Crea una transacción: `amount` (número > 0), `category` (texto), `date` (`YYYY-MM-DD`), `description` (opcional). |
| `GET` | `/transactions` | Lista las transacciones del usuario autenticado. Filtros opcionales: `category`, `from`, `to`. |
| `GET` | `/health` | Estado de salud del servicio. |

Las categorías se normalizan a minúsculas.

```bash
curl -X POST localhost:3002/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"amount": 120.5, "category": "comida", "date": "2026-10-15"}'
```

---

## ⚙️ Configuración

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `TRANSACTIONS_PORT` / `PORT` | `3002` | Puerto del servicio. |
| `AUTH_SERVICE_URL` | `http://127.0.0.1:3001` | URL de `auth-service`. |

---

## 🛠️ Ejecución y Pruebas

```bash
npm run dev   # Puerto 3002 por defecto
npm test
```
