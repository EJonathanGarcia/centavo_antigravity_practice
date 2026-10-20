# 🎯 Centavo — `budgets-service`

Microservicio encargado de la definición y consulta de presupuestos por categoría y periodo dentro del ecosistema **Centavo**.

> Scaffold inicial: el almacenamiento es **en memoria** (se pierde al reiniciar). Pendiente: persistencia, evaluación automática contra consumos de `transactions-service` y emisión de alertas hacia `notifications-service`.

---

## 🔐 Autenticación

Todas las rutas de `/budgets` requieren `Authorization: Bearer <token>` emitido por `auth-service`. Este servicio **no valida JWT por sí mismo**: delega en `GET {AUTH_SERVICE_URL}/auth/verify` (`src/middleware/authMiddleware.ts`), manteniendo un único módulo de validación de sesión en el monorepo. Nunca se loguean tokens (`src/utils/logger.ts` los redacta).

---

## 🚀 Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/budgets` | Define o actualiza un presupuesto: `category` (texto), `limitAmount` (número > 0), `period` (`YYYY-MM` o `monthly`/`weekly`/`yearly`). |
| `GET` | `/budgets` | Lista los presupuestos del usuario autenticado. Filtros opcionales: `category`, `period`. |
| `GET` | `/health` | Estado de salud del servicio. |

Las categorías y periodos se normalizan a minúsculas.

```bash
curl -X POST localhost:3003/budgets \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"category": "comida", "limitAmount": 500, "period": "2026-10"}'
```

---

## ⚙️ Configuración

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `BUDGETS_PORT` / `PORT` | `3003` | Puerto del servicio. |
| `AUTH_SERVICE_URL` | `http://127.0.0.1:3001` | URL de `auth-service`. |

---

## 🛠️ Ejecución y Pruebas

```bash
npm run dev   # Puerto 3003 por defecto
npm test
```
