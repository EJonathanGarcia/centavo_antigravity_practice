import React from 'react';
import { 
  ArrowLeftRight, 
  PieChart, 
  FileText, 
  Bell, 
  Settings, 
  Layers
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'transactions', label: 'Transacciones', icon: ArrowLeftRight, badge: '0' },
    { id: 'budgets', label: 'Presupuestos', icon: PieChart, tag: 'budgets-service' },
    { id: 'reports', label: 'Reportes', icon: FileText, tag: 'reports-service' },
    { id: 'notifications', label: 'Alertas', icon: Bell, tag: 'notif-service' },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 space-y-1">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Módulos
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Monorepo Centavo</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Frontend desacoplado consumiendo APIs REST de microservicios independientes.
          </p>
        </div>
      </div>
    </aside>
  );
};
