import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';

interface ModulePlaceholderProps {
  moduleName: string;
  serviceName: string;
  description: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  moduleName,
  serviceName,
  description,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-700">
        <Layers className="w-6 h-6 text-emerald-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{moduleName}</h3>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono mb-4 border border-slate-200">
        <span>Conectará con:</span>
        <strong className="text-emerald-700">{serviceName}</strong>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-6">
        {description}
      </p>
      <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-4 flex items-center justify-center gap-1">
        <span>Scaffold preparado en el monorepo Centavo</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
};
