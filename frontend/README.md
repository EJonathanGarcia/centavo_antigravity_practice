# Centavo Frontend 💻🪙

Scaffold de la aplicación cliente (Dashboard) para **Centavo**, desarrollada con React 18, Vite, TypeScript y Tailwind CSS.

---

## 🚀 Inicio Rápido

Para ejecutar el entorno de desarrollo local:

```bash
cd frontend
npm install
npm run dev
```

El servidor local se iniciará en `http://localhost:3000`.

Para compilar para producción:

```bash
npm run build
```

---

## 📱 Pantallas Implementadas

1. **Pantalla de Login (`/src/components/auth/LoginView.tsx`)**:
   - Formulario de autenticación con campos de correo y contraseña.
   - Opción para ver/ocultar contraseña y recordar sesión.
   - Botón de acceso rápido como **Usuario Demo** (`demo@centavo.app`).
   - Preparado para el flujo seguro de tokens JWT con `auth-service`.

2. **Dashboard Principal (`/src/components/dashboard/DashboardView.tsx`)**:
   - Tarjetas de resumen financiero (Balance Actual, Ingresos del Mes, Gastos Acumulados, Disponibilidad de Presupuesto).
   - **Listado vacío de transacciones (`EmptyTransactionsState.tsx`)**:
     - Ilustración y mensaje descriptivo de bienvenida al usuario.
     - Guías de las características clave del ecosistema de microservicios.
     - Botón CTA: *“Registrar primera transacción”*.
   - Modal interactivo para registrar y probar movimientos (`TransactionModal.tsx`).
   - Barra superior con estado en vivo y selector de módulos (`Sidebar.tsx`).

---

## 🏗️ Estructura del Proyecto

```text
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginView.tsx           # Vista de inicio de sesión
│   │   ├── dashboard/
│   │   │   └── DashboardView.tsx       # Vista principal con métricas y lista
│   │   ├── layout/
│   │   │   ├── Navbar.tsx              # Barra superior con branding y sesión
│   │   │   ├── Sidebar.tsx             # Menú lateral de módulos
│   │   │   └── ModulePlaceholder.tsx   # Contenedores para futuros microservicios
│   │   └── transactions/
│   │       ├── EmptyTransactionsState.tsx # Estado vacío cuando no hay transacciones
│   │       └── TransactionModal.tsx    # Modal para creación de movimientos
│   ├── context/
│   │   └── AuthContext.tsx             # Manejo centralizado de sesión y autenticación
│   ├── types/
│   │   └── index.ts                    # Tipado TypeScript (User, Transaction, etc.)
│   ├── App.tsx                         # Orquestador de vistas
│   ├── main.tsx                        # Punto de entrada
│   └── index.css                       # Directivas Tailwind y estilos globales
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
