import React from 'react';
import { ReceiptText, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldAlert } from 'lucide-react';

interface EmptyTransactionsStateProps {
  onAddTransaction: () => void;
}

export const EmptyTransactionsState: React.FC<EmptyTransactionsStateProps> = ({ onAddTransaction }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 text-center max-w-3xl mx-auto my-6">
      {/* Icon Graphic */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <div className="absolute inset-0 bg-emerald-100 rounded-3xl transform rotate-6 transition-transform hover:rotate-12 duration-300"></div>
        <div className="relative bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm">
          <ReceiptText className="w-10 h-10 text-emerald-600" />
        </div>
      </div>

      {/* Heading & Subtext */}
      <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
        Aún no hay transacciones registradas
      </h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
        Tu listado de movimientos está vacío. Comienza agregando tus ingresos o gastos cotidianos para mantener tus finanzas ordenadas y activar los controles presupuestarios.
      </p>

      {/* Main Action Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
        <button
          onClick={onAddTransaction}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Registrar primera transacción</span>
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-slate-100 text-left">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Control de Gastos</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Registra consumos diarios clasificados por categorías para no perder ningún detalle.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2.5">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Presupuestos Reales</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Cada movimiento impacta el balance y evalúa límites definidos en <code className="text-slate-600 font-mono">budgets-service</code>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">Alertas Oportunas</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Recibe advertencias tempranas en caso de llegar al 80% o sobrepasar tu límite mensual.
          </p>
        </div>
      </div>
    </div>
  );
};
