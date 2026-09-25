import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Printer, 
  CheckCircle2, 
  X, 
  CreditCard, 
  Banknote, 
  QrCode, 
  History, 
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  User,
  Percent
} from 'lucide-react';
import { Produto, Venda, ItemVenda, FormaPagamento } from '../types';
import { 
  formatMoney, 
  formatNumber, 
  formatDateTime, 
  FORMAS_PAGAMENTO_LABELS 
} from '../utils/formatters';

interface VendasViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onFinalizarVenda: (venda: Venda) => Promise<void>;
  onCancelarVenda: (vendaId: string) => Promise<void>;
  onEstornarEstoque: (itens: ItemVenda[], motivo: string) => Promise<void>;
}

export const VendasView: React.FC<VendasViewProps> = ({
  produtos,
  vendas,
  onFinalizarVenda,
  onCancelarVenda,
  onEstornarEstoque,
}) => {
  const [subTab, setSubTab] = useState<'pdv' | 'historico'>('pdv');

  // PDV State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [qtdInput, setQtdInput] = useState<string>('1');
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [desconto, setDesconto] = useState<string>('0');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [valorPago, setValorPago] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alertaPdv, setAlertaPdv] = useState<string>('');
  const [isFinalizando, setIsFinalizando] = useState(false);

  // Receipt Modal State
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Search product dropdown in PDV
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // History Filter
  const [filtroHistorico, setFiltroHistorico] = useState<'todos' | 'hoje' | '7dias'>('todos');
  const [buscaHistorico, setBuscaHistorico] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto focus barcode input when in PDV mode
  useEffect(() => {
    if (subTab === 'pdv' && !isReceiptOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [subTab, isReceiptOpen]);

  // Handle typing search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBarcodeInput(val);
    if (val.trim().length >= 2) {
      const filtered = produtos.filter((p) =>
        p.nome.toLowerCase().includes(val.toLowerCase()) ||
        p.codigo_barras.includes(val)
      ).slice(0, 6);
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // Add product to cart
  const adicionarAoCarrinho = (prod: Produto, qtdDesejada?: number) => {
    const qtd = qtdDesejada !== undefined ? qtdDesejada : (parseFloat(qtdInput.replace(',', '.')) || 1);
    if (qtd <= 0) {
      setAlertaPdv('Informe uma quantidade válida.');
      return;
    }

    // Check available stock
    const itemExistente = carrinho.find((it) => it.produto_id === prod.id);
    const qtdTotalNoCarrinho = (itemExistente ? itemExistente.quantidade : 0) + qtd;

    if (prod.estoque_atual < qtdTotalNoCarrinho) {
      setAlertaPdv(`Atenção: Estoque insuficiente de "${prod.nome}". Disponível: ${prod.estoque_atual} ${prod.unidade}.`);
      // User can still proceed if they acknowledge or keep within available
    } else {
      setAlertaPdv('');
    }

    if (itemExistente) {
      setCarrinho(
        carrinho.map((it) =>
          it.produto_id === prod.id
            ? {
                ...it,
                quantidade: it.quantidade + qtd,
                subtotal: (it.quantidade + qtd) * it.preco_unitario,
              }
            : it
        )
      );
    } else {
      const novoItem: ItemVenda = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        produto_id: prod.id,
        produto_nome: prod.nome,
        codigo_barras: prod.codigo_barras,
        quantidade: qtd,
        unidade: prod.unidade,
        preco_unitario: prod.preco_venda,
        preco_custo: prod.preco_custo,
        subtotal: qtd * prod.preco_venda,
      };
      setCarrinho([...carrinho, novoItem]);
    }

    // Reset inputs and refocus barcode
    setBarcodeInput('');
    setQtdInput('1');
    setShowDropdown(false);
    barcodeInputRef.current?.focus();
  };

  // Handle Enter key on barcode input (Simulates handheld barcode scanner!)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInput.trim();
      if (!code) return;

      // 1. Exact match barcode
      const matchExato = produtos.find(
        (p) => p.codigo_barras.toLowerCase() === code.toLowerCase()
      );
      if (matchExato) {
        adicionarAoCarrinho(matchExato);
        return;
      }

      // 2. Exact match product name
      const matchNome = produtos.find(
        (p) => p.nome.toLowerCase() === code.toLowerCase()
      );
      if (matchNome) {
        adicionarAoCarrinho(matchNome);
        return;
      }

      // 3. First search result
      if (searchResults.length > 0) {
        adicionarAoCarrinho(searchResults[0]);
        return;
      }

      setAlertaPdv(`Produto com código ou nome "${code}" não foi encontrado no estoque.`);
    }
  };

  // Adjust item quantity in cart
  const alterarQtdItem = (id: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((it) => {
          if (it.id === id) {
            const novaQtd = it.quantidade + delta;
            if (novaQtd <= 0) return null;
            return {
              ...it,
              quantidade: novaQtd,
              subtotal: novaQtd * it.preco_unitario,
            };
          }
          return it;
        })
        .filter(Boolean) as ItemVenda[]
    );
  };

  // Remove item
  const removerItem = (id: string) => {
    setCarrinho((prev) => prev.filter((it) => it.id !== id));
  };

  // Clear cart
  const limparCarrinho = () => {
    if (carrinho.length === 0) return;
    if (confirm('Deseja realmente cancelar e limpar todos os itens da venda atual?')) {
      setCarrinho([]);
      setDesconto('0');
      setValorPago('');
      setAlertaPdv('');
      setClienteNome('');
      setClienteCpf('');
      barcodeInputRef.current?.focus();
    }
  };

  // Calculations
  const subtotalVenda = carrinho.reduce((acc, it) => acc + it.subtotal, 0);
  const custoTotalVenda = carrinho.reduce((acc, it) => acc + (it.preco_custo * it.quantidade), 0);
  const descontoNum = Math.min(subtotalVenda, Math.max(0, parseFloat(desconto.replace(',', '.')) || 0));
  const totalPagar = Math.max(0, subtotalVenda - descontoNum);

  const valorPagoNum = parseFloat(valorPago.replace(',', '.')) || 0;
  const troco = formaPagamento === 'dinheiro' && valorPagoNum > totalPagar ? valorPagoNum - totalPagar : 0;

  // Finalize Sale
  const handleFinalizar = async () => {
    if (carrinho.length === 0) {
      setAlertaPdv('Adicione produtos ao carrinho antes de finalizar.');
      return;
    }

    if (formaPagamento === 'dinheiro' && valorPagoNum > 0 && valorPagoNum < totalPagar) {
      setAlertaPdv(`Valor recebido (${formatMoney(valorPagoNum)}) é menor que o total (${formatMoney(totalPagar)}).`);
      return;
    }

    setIsFinalizando(true);
    setAlertaPdv('');

    try {
      const nextNumeroVenda = vendas.length > 0 ? Math.max(...vendas.map((v) => v.numero_venda)) + 1 : 1001;

      const novaVenda: Venda = {
        id: 'venda_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        numero_venda: nextNumeroVenda,
        data_venda: new Date().toISOString(),
        total_itens: carrinho.reduce((acc, it) => acc + it.quantidade, 0),
        subtotal: subtotalVenda,
        desconto: descontoNum,
        valor_total: totalPagar,
        custo_total: custoTotalVenda,
        forma_pagamento: formaPagamento,
        valor_pago: formaPagamento === 'dinheiro' && valorPagoNum > 0 ? valorPagoNum : totalPagar,
        troco: troco > 0 ? troco : undefined,
        cliente_nome: clienteNome.trim() || undefined,
        cliente_cpf: clienteCpf.trim() || undefined,
        status: 'concluida',
        itens: [...carrinho],
        observacoes: observacoes.trim() || undefined,
        created_at: new Date().toISOString(),
      };

      await onFinalizarVenda(novaVenda);

      // Show receipt modal
      setVendaFinalizada(novaVenda);
      setIsReceiptOpen(true);

      // Reset cart
      setCarrinho([]);
      setDesconto('0');
      setValorPago('');
      setClienteNome('');
      setClienteCpf('');
      setObservacoes('');
    } catch (err: any) {
      setAlertaPdv(`Erro ao finalizar venda: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsFinalizando(false);
    }
  };

  // Keyboard shortcut: F2 to finalize sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && subTab === 'pdv' && !isReceiptOpen && carrinho.length > 0) {
        e.preventDefault();
        handleFinalizar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subTab, isReceiptOpen, carrinho, formaPagamento, valorPago, totalPagar]);

  // Cancel previous sale from history
  const handleCancelarVendaHistorico = async (v: Venda) => {
    if (v.status === 'cancelada') return;
    if (confirm(`Tem certeza que deseja cancelar a Venda #${v.numero_venda}? Os itens serão estornados de volta ao estoque.`)) {
      try {
        await onCancelarVenda(v.id);
        await onEstornarEstoque(v.itens, `Estorno por cancelamento da Venda #${v.numero_venda}`);
        alert(`Venda #${v.numero_venda} cancelada e itens devolvidos ao estoque.`);
      } catch (err: any) {
        alert(`Erro ao cancelar venda: ${err.message}`);
      }
    }
  };

  // Filtered sales in history
  const vendasFiltradas = vendas.filter((v) => {
    // Search
    const matchBusca =
      v.numero_venda.toString().includes(buscaHistorico) ||
      (v.cliente_nome && v.cliente_nome.toLowerCase().includes(buscaHistorico.toLowerCase())) ||
      (v.cliente_cpf && v.cliente_cpf.includes(buscaHistorico));

    // Date
    let matchData = true;
    const dataVenda = new Date(v.data_venda);
    const hoje = new Date();
    if (filtroHistorico === 'hoje') {
      matchData =
        dataVenda.getDate() === hoje.getDate() &&
        dataVenda.getMonth() === hoje.getMonth() &&
        dataVenda.getFullYear() === hoje.getFullYear();
    } else if (filtroHistorico === '7dias') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      matchData = dataVenda >= seteDiasAtras;
    }

    return matchBusca && matchData;
  });

  return (
    <div className="space-y-6">
      {/* Sub navigation: PDV vs Histórico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('pdv')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              subTab === 'pdv'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Frente de Caixa (PDV)</span>
          </button>

          <button
            onClick={() => setSubTab('historico')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              subTab === 'historico'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Histórico de Vendas ({vendas.length})</span>
          </button>
        </div>

        {subTab === 'pdv' && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Caixa Aberto · Pronto para leitura de código</span>
          </div>
        )}
      </div>

      {subTab === 'pdv' ? (
        /* ==================== FRENTE DE CAIXA (PDV) ==================== */
        produtos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Barcode className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Nenhum produto cadastrado no estoque
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Para registrar vendas no caixa, você precisa cadastrar produtos no módulo de Estoque primeiro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Leitura de Produtos & Carrinho (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Leitor Barcode & Quantidade */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* Quantidade ou Peso */}
                  <div className="sm:col-span-3">
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">
                      Quantidade / Peso
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={qtdInput}
                      onChange={(e) => setQtdInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-center focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Input Código de Barras / Nome */}
                  <div className="sm:col-span-9 relative">
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">
                      Código de Barras ou Nome do Produto (Enter para bipar)
                    </label>
                    <div className="relative">
                      <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Escaneie o código ou digite o nome do produto..."
                        value={barcodeInput}
                        onChange={handleInputChange}
                        onKeyDown={handleBarcodeKeyDown}
                        className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (searchResults.length > 0) {
                            adicionarAoCarrinho(searchResults[0]);
                          } else {
                            const exact = produtos.find(
                              (p) => p.codigo_barras === barcodeInput.trim() || p.nome.toLowerCase() === barcodeInput.trim().toLowerCase()
                            );
                            if (exact) adicionarAoCarrinho(exact);
                          }
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>

                    {/* Dropdown de sugestão */}
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => adicionarAoCarrinho(p)}
                            className="p-3 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{p.nome}</div>
                              <div className="text-2xs text-slate-500 font-mono">
                                EAN: {p.codigo_barras} · Estoque: {p.estoque_atual} {p.unidade}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatMoney(p.preco_venda)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {alertaPdv && (
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{alertaPdv}</span>
                  </div>
                )}
              </div>

              {/* Lista do Carrinho / Itens da Venda */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Itens do Carrinho ({carrinho.reduce((a, b) => a + b.quantidade, 0)})
                    </h3>
                  </div>

                  {carrinho.length > 0 && (
                    <button
                      onClick={limparCarrinho}
                      className="text-2xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar Carrinho
                    </button>
                  )}
                </div>

                {carrinho.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 stroke-1 opacity-50" />
                    <p className="text-xs font-medium text-slate-500">
                      O carrinho está vazio.
                    </p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Passe o código de barras no leitor ou digite o nome do produto acima.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">Produto</th>
                          <th className="py-2.5 px-3 text-right">Preço Un.</th>
                          <th className="py-2.5 px-4 text-center">Quantidade</th>
                          <th className="py-2.5 px-4 text-right">Subtotal</th>
                          <th className="py-2.5 px-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {carrinho.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-2xs">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{item.produto_nome}</div>
                              <div className="text-2xs text-slate-400 font-mono">
                                {item.codigo_barras}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                              {formatMoney(item.preco_unitario)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => alterarQtdItem(item.id, -1)}
                                  className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2.5 py-1 text-xs font-bold font-mono text-slate-900 tabular-nums">
                                  {formatNumber(item.quantidade, item.unidade === 'kg' ? 3 : 0)} {item.unidade}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => alterarQtdItem(item.id, 1)}
                                  className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                              {formatMoney(item.subtotal)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removerItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Remover item"
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
            </div>

            {/* Lado Direito: Fechamento & Pagamento (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Resumo do Pagamento
                </h3>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal dos itens</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatMoney(subtotalVenda)}
                  </span>
                </div>

                {/* Desconto */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600">Desconto (R$)</span>
                  <div className="w-32">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={subtotalVenda}
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Total a Pagar Destaque */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-2xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Total a Pagar
                  </span>
                  <span className="text-2xl font-black text-emerald-950 tabular-nums font-mono">
                    {formatMoney(totalPagar)}
                  </span>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormaPagamento('dinheiro')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formaPagamento === 'dinheiro'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Dinheiro
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('pix')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formaPagamento === 'pix'
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      PIX
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('cartao_debito')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formaPagamento === 'cartao_debito'
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Débito
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('cartao_credito')}
                      className={`p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formaPagamento === 'cartao_credito'
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Crédito
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormaPagamento('vale_alimentacao')}
                      className={`col-span-2 p-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        formaPagamento === 'vale_alimentacao'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Vale Alimentação / Refeição</span>
                    </button>
                  </div>
                </div>

                {/* Cálculo de Troco se Dinheiro */}
                {formaPagamento === 'dinheiro' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-2xs font-semibold text-slate-600">
                        Valor Recebido (R$):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={totalPagar.toFixed(2)}
                        value={valorPago}
                        onChange={(e) => setValorPago(e.target.value)}
                        className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-mono text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2 font-bold">
                      <span className="text-slate-700">Troco a Devolver:</span>
                      <span className="font-mono text-emerald-700 tabular-nums">
                        {formatMoney(troco)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Identificação de Cliente Opcional */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-2xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Identificação do Cliente (Opcional)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do cliente"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="CPF na nota"
                      value={clienteCpf}
                      onChange={(e) => setClienteCpf(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Botão Finalizar */}
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={carrinho.length === 0 || isFinalizando}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>FINALIZAR VENDA</span>
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* ==================== HISTÓRICO DE VENDAS ==================== */
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número da venda, cliente ou CPF..."
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setFiltroHistorico('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroHistorico === 'todos'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({vendas.length})
              </button>
              <button
                onClick={() => setFiltroHistorico('hoje')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroHistorico === 'hoje'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setFiltroHistorico('7dias')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroHistorico === '7dias'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>
          </div>

          {vendas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Nenhuma venda registrada ainda
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Quando você realizar vendas na aba "Frente de Caixa (PDV)", todas ficarão registradas aqui para controle fiscal e consulta.
              </p>
              <button
                onClick={() => setSubTab('pdv')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Ir para Frente de Caixa
              </button>
            </div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <p className="text-xs font-semibold text-slate-600">Nenhuma venda encontrada com os filtros informados.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Nº Venda</th>
                      <th className="py-3 px-4">Data & Hora</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-3 text-center">Itens</th>
                      <th className="py-3 px-4">Pagamento</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendasFiltradas.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          #{v.numero_venda}
                        </td>
                        <td className="py-3 px-4 text-slate-600 tabular-nums">
                          {formatDateTime(v.data_venda)}
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          {v.cliente_nome || <span className="text-slate-400">Consumidor</span>}
                          {v.cliente_cpf && (
                            <span className="block text-2xs font-mono text-slate-400">
                              CPF: {v.cliente_cpf}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono tabular-nums text-slate-600">
                          {v.total_itens}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">
                            {FORMAS_PAGAMENTO_LABELS[v.forma_pagamento] || v.forma_pagamento}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {formatMoney(v.valor_total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {v.status === 'cancelada' ? (
                            <span className="text-2xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                              Cancelada
                            </span>
                          ) : (
                            <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              Concluída
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setVendaFinalizada(v);
                                setIsReceiptOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Ver / Imprimir Cupom"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {v.status === 'concluida' && (
                              <button
                                onClick={() => handleCancelarVendaHistorico(v)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Cancelar Venda (Estornar Itens ao Estoque)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE RECIBO / CUPOM FISCAL NÃO-FISCAL */}
      {isReceiptOpen && vendaFinalizada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden my-6">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">Comprovante de Venda</span>
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Layout */}
            <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-mono text-xs space-y-4">
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider">SUPERMERCADO GESTOR</h2>
                <p className="text-2xs text-slate-500">SISTEMA INTEGRADO DE GESTÃO</p>
                <p className="text-2xs text-slate-500">CUPOM NÃO FISCAL</p>
              </div>

              <div className="text-2xs space-y-0.5 text-slate-600">
                <div className="flex justify-between">
                  <span>VENDA Nº:</span>
                  <span className="font-bold">#{vendaFinalizada.numero_venda}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATA/HORA:</span>
                  <span>{formatDateTime(vendaFinalizada.data_venda)}</span>
                </div>
                {vendaFinalizada.cliente_nome && (
                  <div className="flex justify-between">
                    <span>CLIENTE:</span>
                    <span>{vendaFinalizada.cliente_nome}</span>
                  </div>
                )}
                {vendaFinalizada.cliente_cpf && (
                  <div className="flex justify-between">
                    <span>CPF:</span>
                    <span>{vendaFinalizada.cliente_cpf}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                <div className="text-2xs font-bold text-slate-500 flex justify-between">
                  <span>ITEM / DESCRIÇÃO</span>
                  <span>TOTAL (R$)</span>
                </div>
                {vendaFinalizada.itens.map((it, idx) => (
                  <div key={idx} className="text-2xs flex justify-between items-start">
                    <div className="pr-2">
                      <div className="font-semibold">{it.produto_nome}</div>
                      <div className="text-slate-500 text-3xs">
                        {it.quantidade} {it.unidade} x {formatMoney(it.preco_unitario)}
                      </div>
                    </div>
                    <span className="font-semibold whitespace-nowrap">{formatMoney(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-2xs pt-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>{formatMoney(vendaFinalizada.subtotal)}</span>
                </div>
                {vendaFinalizada.desconto > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>DESCONTO:</span>
                    <span>- {formatMoney(vendaFinalizada.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold border-t border-slate-300 pt-1">
                  <span>TOTAL PAGO:</span>
                  <span>{formatMoney(vendaFinalizada.valor_total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>PAGAMENTO:</span>
                  <span className="uppercase font-semibold">
                    {FORMAS_PAGAMENTO_LABELS[vendaFinalizada.forma_pagamento] || vendaFinalizada.forma_pagamento}
                  </span>
                </div>
                {vendaFinalizada.valor_pago && (
                  <div className="flex justify-between">
                    <span>VALOR RECEBIDO:</span>
                    <span>{formatMoney(vendaFinalizada.valor_pago)}</span>
                  </div>
                )}
                {vendaFinalizada.troco && vendaFinalizada.troco > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>TROCO:</span>
                    <span>{formatMoney(vendaFinalizada.troco)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-2xs text-slate-400">
                Obrigado pela preferência! Volte sempre.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir Cupom
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
