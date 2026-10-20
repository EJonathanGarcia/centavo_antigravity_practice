import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Coins, LogOut, Bell } from 'lucide-react';

interface NavbarProps {
  onOpenNewTransaction?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewTransaction }) => {
  const { user, logout, authServiceOnline } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900 tracking-tight">Centavo</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Control Financiero Personal</p>
            </div>
          </div>

          {/* Microservices status indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-slate-600">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${authServiceOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${authServiceOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-medium text-slate-700">Microservicios</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono">
              auth: <strong className={authServiceOnline ? 'text-emerald-700' : 'text-amber-700'}>{authServiceOnline ? 'online (3001)' : 'local/demo'}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500 font-mono">tx:listo</span>
          </div>

          {/* User actions */}
          <div className="flex items-center gap-3">
            {onOpenNewTransaction && (
              <button
                onClick={onOpenNewTransaction}
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shadow-emerald-600/20"
              >
                + Nuevo Movimiento
              </button>
            )}

            {/* Notifications Button */}
            <button
              title="Notificaciones y Alertas"
              onClick={() => alert('Canal de notificaciones conectado con notifications-service')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* User Profile dropdown/chip */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate max-w-[120px]">{user?.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
