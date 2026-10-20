# 🔔 Centavo — `notifications-service`

Microservicio encargado de recibir eventos de nuevas transacciones, contrastarlas contra los presupuestos configurados en `budgets-service` y generar alertas reactivas de advertencia (`warning`, $\ge 80\%$) y sobregasto (`exceeded`, $\ge 100\%$) dentro del ecosistema **Centavo**.

> Scaffold inicial: el almacenamiento de alertas y el acumulado de consumo por periodo es **en memoria** (se pierde al reiniciar). Pendiente: persistencia y despacho externo (correo, push).

---

## 🔐 Autenticación

Todas las rutas de `/notifications` requieren `Authorization: Bearer <token>` emitido por `auth-service`. Este servicio **no valida JWT por sí mismo**: delega en `GET {AUTH_SERVICE_URL}/auth/verify` (`src/middleware/authMiddleware.ts`), manteniendo un único módulo de validación de sesión en el monorepo. Nunca se loguean tokens (`src/utils/logger.ts` los redacta).

---

## 🚀 Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/notifications/events/transaction` | Evalúa un evento de transacción (`amount`, `category`, `date` o `period`, `transactionId` opcional) contra el presupuesto de `budgets-service`. Genera una alerta `warning` ($\ge 80\%$) o `exceeded` ($\ge 100\%$). |
| `GET` | `/notifications` | Lista las alertas generadas para el usuario autenticado. Filtros opcionales: `category`, `period`, `level` (`warning` \| `exceeded`). |
| `GET` | `/health` | Estado de salud del servicio. |

```bash
curl -X POST localhost:3004/notifications/events/transaction \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"transactionId": "tx-01", "amount": 420, "category": "comida", "date": "2026-10-19"}'
```

---

## ⚙️ Configuración

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `NOTIFICATIONS_PORT` / `PORT` | `3004` | Puerto del servicio. |
| `AUTH_SERVICE_URL` | `http://127.0.0.1:3001` | URL de `auth-service`. |
| `BUDGETS_SERVICE_URL` | `http://127.0.0.1:3003` | URL de `budgets-service`. |

---

## 🛠️ Ejecución y Pruebas

```bash
npm run dev   # Puerto 3004 por defecto
npm test
```
