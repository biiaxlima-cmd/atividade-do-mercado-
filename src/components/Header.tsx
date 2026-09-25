import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Database, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'dashboard' | 'estoque' | 'vendas' | 'supabase';
  onSelectTab: (tab: 'dashboard' | 'estoque' | 'vendas' | 'supabase') => void;
  supabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  supabaseConnected,
  onOpenSupabaseModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block">
                Supermercado Gestor
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Controle de Estoque & PDV
              </span>
            </div>
          </div>

          {/* Zone 2: 4 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('estoque')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                currentTab === 'estoque'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Estoque</span>
            </button>

            <button
              onClick={() => onSelectTab('vendas')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                currentTab === 'vendas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Vendas (PDV)</span>
            </button>

            <button
              onClick={() => onSelectTab('supabase')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                currentTab === 'supabase'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Supabase</span>
            </button>
          </nav>

          {/* Zone 3: Primary action & database status indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSupabaseModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                supabaseConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Configurar conexão com o Supabase"
            >
              {supabaseConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Supabase Conectado</span>
                  <span className="sm:hidden">Supabase</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Modo Local (Conectar Supabase)</span>
                  <span className="sm:hidden">Conectar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              currentTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => onSelectTab('estoque')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              currentTab === 'estoque' ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Estoque</span>
          </button>
          <button
            onClick={() => onSelectTab('vendas')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              currentTab === 'vendas' ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Vendas</span>
          </button>
          <button
            onClick={() => onSelectTab('supabase')}
            className={`flex flex-col items-center gap-1 text-xs font-medium ${
              currentTab === 'supabase' ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            <Database className="w-5 h-5" />
            <span>Banco</span>
          </button>
        </div>
      </div>
    </header>
  );
};
