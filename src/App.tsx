import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { VendasView } from './components/VendasView';
import { SupabaseView } from './components/SupabaseView';
import { SupabaseModal } from './components/SupabaseModal';
import { db } from './services/supabase';
import { Produto, Venda, ItemVenda, TipoMovimentacao } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'estoque' | 'vendas' | 'supabase'>('dashboard');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State (Initialized as empty array - ZERO mock data)
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [supabaseConnected, setSupabaseConnected] = useState(db.getConfig().isConnected);

  // Load data from DB service (Supabase or LocalStorage)
  const carregarDados = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prods, vends] = await Promise.all([
        db.carregarProdutos(),
        db.carregarVendas(),
      ]);
      setProdutos(prods);
      setVendas(vends);
      setSupabaseConnected(db.getConfig().isConnected);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handler: Save or Update Product
  const handleSalvarProduto = async (prod: Produto) => {
    await db.salvarProduto(prod);
    setProdutos((prev) => {
      const idx = prev.findIndex((p) => p.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = prod;
        return copy;
      }
      return [...prev, prod];
    });
  };

  // Handler: Delete Product
  const handleExcluirProduto = async (id: string) => {
    await db.excluirProduto(id);
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  // Handler: Register Stock Movement
  const handleMovimentarEstoque = async (
    produtoId: string,
    produtoNome: string,
    tipo: TipoMovimentacao,
    quantidade: number,
    motivo?: string
  ) => {
    await db.registrarMovimentacao({
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      produto_id: produtoId,
      produto_nome: produtoNome,
      tipo,
      quantidade,
      motivo,
      data_movimentacao: new Date().toISOString(),
    });
  };

  // Handler: Finalize Sale (Decrements stock automatically!)
  const handleFinalizarVenda = async (novaVenda: Venda) => {
    // 1. Save sale
    await db.salvarVenda(novaVenda);
    setVendas((prev) => [novaVenda, ...prev]);

    // 2. Decrement inventory for each item and log movement
    for (const it of novaVenda.itens) {
      const prodOriginal = produtos.find((p) => p.id === it.produto_id);
      if (prodOriginal) {
        const novoEstoque = Math.max(0, prodOriginal.estoque_atual - it.quantidade);
        const prodAtualizado: Produto = {
          ...prodOriginal,
          estoque_atual: novoEstoque,
          updated_at: new Date().toISOString(),
        };

        await db.salvarProduto(prodAtualizado);
        await handleMovimentarEstoque(
          prodOriginal.id,
          prodOriginal.nome,
          'saida_venda',
          it.quantidade,
          `Venda #${novaVenda.numero_venda}`
        );

        // Update local state
        setProdutos((prev) =>
          prev.map((p) => (p.id === prodAtualizado.id ? prodAtualizado : p))
        );
      }
    }
  };

  // Handler: Cancel Sale
  const handleCancelarVenda = async (vendaId: string) => {
    await db.cancelarVenda(vendaId);
    setVendas((prev) =>
      prev.map((v) => (v.id === vendaId ? { ...v, status: 'cancelada' as const } : v))
    );
  };

  // Handler: Restock Items after Sale Cancellation
  const handleEstornarEstoque = async (itens: ItemVenda[], motivo: string) => {
    for (const it of itens) {
      const prodOriginal = produtos.find((p) => p.id === it.produto_id);
      if (prodOriginal) {
        const novoEstoque = prodOriginal.estoque_atual + it.quantidade;
        const prodAtualizado: Produto = {
          ...prodOriginal,
          estoque_atual: novoEstoque,
          updated_at: new Date().toISOString(),
        };

        await db.salvarProduto(prodAtualizado);
        await handleMovimentarEstoque(
          prodOriginal.id,
          prodOriginal.nome,
          'ajuste_positivo',
          it.quantidade,
          motivo
        );

        setProdutos((prev) =>
          prev.map((p) => (p.id === prodAtualizado.id ? prodAtualizado : p))
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        supabaseConnected={supabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs font-semibold">Carregando sistema do supermercado...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                produtos={produtos}
                vendas={vendas}
                onNavigateToEstoque={() => setCurrentTab('estoque')}
                onNavigateToVendas={() => setCurrentTab('vendas')}
              />
            )}

            {currentTab === 'estoque' && (
              <EstoqueView
                produtos={produtos}
                onSalvarProduto={handleSalvarProduto}
                onExcluirProduto={handleExcluirProduto}
                onMovimentarEstoque={handleMovimentarEstoque}
              />
            )}

            {currentTab === 'vendas' && (
              <VendasView
                produtos={produtos}
                vendas={vendas}
                onFinalizarVenda={handleFinalizarVenda}
                onCancelarVenda={handleCancelarVenda}
                onEstornarEstoque={handleEstornarEstoque}
              />
            )}

            {currentTab === 'supabase' && (
              <SupabaseView onRefreshData={carregarDados} />
            )}
          </>
        )}
      </main>

      {/* Supabase Setup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={carregarDados}
      />
    </div>
  );
}
