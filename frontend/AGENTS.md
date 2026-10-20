# Frontend Agent Guidelines

1. **Stack**: React 18, Vite, TypeScript, Tailwind CSS y Lucide Icons.
2. **Arquitectura**: Desacoplada del backend. Todas las llamadas a microservicios (`auth-service`, `transactions-service`, `budgets-service`, `notifications-service`, `reports-service`) deben pasar por clientes de API centralizados.
3. **Manejo de Estado**: El contexto de sesión reside en `src/context/AuthContext.tsx`. Nunca almacenes credenciales en texto plano en almacenamiento local (solo tokens emitidos por `auth-service` o datos de perfil seguros).
4. **Validación**: Siempre valida la compilación ejecutando `npm run build` antes de finalizar cualquier cambio.
