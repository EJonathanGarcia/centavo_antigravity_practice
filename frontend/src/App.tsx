import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ModulePlaceholder } from './components/layout/ModulePlaceholder';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('transactions');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium tracking-wide">Cargando Centavo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'transactions' && <DashboardView />}

          {activeTab === 'budgets' && (
            <ModulePlaceholder
              moduleName="Presupuestos por Categoría"
              serviceName="budgets-service"
              description="Define montos máximos por mes y rubro. Evaluará en tiempo real el consumo acumulado contra los umbrales configurados."
            />
          )}

          {activeTab === 'reports' && (
            <ModulePlaceholder
              moduleName="Reportes Consolidados"
              serviceName="reports-service"
              description="Generación automatizada de resúmenes semanales y mensuales de hábitos de consumo, comparativas y balances globales."
            />
          )}

          {activeTab === 'notifications' && (
            <ModulePlaceholder
              moduleName="Centro de Alertas"
              serviceName="notifications-service"
              description="Historial y configuración de advertencias de sobregasto por rebasar el 80% o 100% de los presupuestos asignados."
            />
          )}

          {activeTab === 'settings' && (
            <ModulePlaceholder
              moduleName="Configuración de Cuenta"
              serviceName="auth-service"
              description="Ajustes del perfil, cambio de contraseña segura y gestión de credenciales."
            />
          )}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
