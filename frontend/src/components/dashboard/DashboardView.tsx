import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { transactionsApi } from '../../services/transactionsApi';
import { EmptyTransactionsState } from '../transactions/EmptyTransactionsState';
import { TransactionModal } from '../transactions/TransactionModal';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  Plus, 
  Search, 
  Trash2,
  Calendar,
  Tag
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { token } = useAuth();
  // Empty by default as requested: "un listado vacío de transacciones"
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  useEffect(() => {
    if (!token || token === 'demo_token') return;
    transactionsApi
      .list(token)
      .then((list) => setTransactions(list))
      .catch(() => {
        // Fallback to local state if service is unreachable
      });
  }, [token]);

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpense;

  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    if (token && token !== 'demo_token') {
      try {
        const created = await transactionsApi.create(token, newTxData);
        setTransactions((prev) => [created, ...prev]);
        return;
      } catch {
        // Fallback to local state if service is unreachable
      }
    }
    const newTx: Transaction = {
      ...newTxData,
      id: `tx_${Date.now()}`,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard General</h2>
          <p className="text-xs text-slate-500 mt-1">
            Resumen en tiempo real del estado de tus cuentas y movimientos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {transactions.length > 0 && (
            <button
              onClick={() => setTransactions([])}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-rose-200 bg-white transition-colors"
            >
              Vaciar lista
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Balance Actual</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span>Sincronizado con</span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">transactions-service</span>
          </p>
        </div>

        {/* Card 2: Ingresos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ingresos del Mes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            +${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            0% de variación respecto al periodo anterior
          </p>
        </div>

        {/* Card 3: Gastos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gastos Acumulados</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            -${totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Sin consumos registrados este mes
          </p>
        </div>

        {/* Card 4: Presupuestos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Límites y Alertas</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900 tracking-tight">
            100% <span className="text-xs font-normal text-slate-500">disponible</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Sin alertas de sobregasto activas</span>
          </p>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header with Search and Filter */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Historial de Movimientos</span>
              <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {transactions.length} registrados
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Control de gastos e ingresos registrados en la cuenta
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar descripción o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium w-full sm:w-auto">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'expense'
                    ? 'bg-white text-rose-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterType === 'income'
                    ? 'bg-white text-emerald-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ingresos
              </button>
            </div>
          </div>
        </div>

        {/* Content: Empty State OR List */}
        {transactions.length === 0 ? (
          <div className="p-4 sm:p-8">
            <EmptyTransactionsState onAddTransaction={() => setIsModalOpen(true)} />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No se encontraron movimientos con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex flex-col">
                        <span>{tx.description}</span>
                        {tx.notes && <span className="text-[11px] text-slate-400 font-normal">{tx.notes}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {tx.date}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        title="Eliminar movimiento"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for testing adding a transaction */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTransaction}
      />
    </div>
  );
};
