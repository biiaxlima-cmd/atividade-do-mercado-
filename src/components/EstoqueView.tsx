import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Edit3, 
  Trash2, 
  ArrowUpDown, 
  AlertTriangle, 
  Package, 
  Download, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  X, 
  Barcode, 
  Sparkles,
  Calendar,
  Layers,
  DollarSign,
  Image as ImageIcon,
  UploadCloud
} from 'lucide-react';
import { Produto, UnidadeMedida, TipoMovimentacao } from '../types';
import { db } from '../services/supabase';
import { 
  formatMoney, 
  formatNumber, 
  formatDate, 
  gerarCodigoBarrasInterno, 
  CATEGORIAS_SUPERMERCADO 
} from '../utils/formatters';

interface EstoqueViewProps {
  produtos: Produto[];
  onSalvarProduto: (produto: Produto) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  onMovimentarEstoque: (
    produtoId: string, 
    produtoNome: string, 
    tipo: TipoMovimentacao, 
    quantidade: number, 
    motivo?: string
  ) => Promise<void>;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  produtos,
  onSalvarProduto,
  onExcluirProduto,
  onMovimentarEstoque,
}) => {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'baixo' | 'zerado' | 'normal'>('todos');
  const [ordenacao, setOrdenacao] = useState<'nome' | 'estoque_asc' | 'estoque_desc' | 'valor_desc'>('nome');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  // Quick stock adjustment modal
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [produtoParaAjuste, setProdutoParaAjuste] = useState<Produto | null>(null);
  const [tipoAjuste, setTipoAjuste] = useState<TipoMovimentacao>('entrada');
  const [qtdAjuste, setQtdAjuste] = useState<string>('');
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');

  // Form states
  const [codigoBarras, setCodigoBarras] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Mercearia Salgada');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [unidade, setUnidade] = useState<UnidadeMedida>('un');
  const [validade, setValidade] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Calculations for KPI Cards
  const totalProdutosCadastrados = produtos.length;
  const totalUnidadesEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual, 0);
  const valorTotalCusto = produtos.reduce((acc, p) => acc + p.preco_custo * p.estoque_atual, 0);
  const valorTotalVenda = produtos.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0);
  const lucroPotencial = valorTotalVenda - valorTotalCusto;
  const produtosEstoqueBaixo = produtos.filter((p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo).length;
  const produtosZerados = produtos.filter((p) => p.estoque_atual <= 0).length;

  // Filtered and sorted products
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      // Search
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(busca.toLowerCase()) ||
        (p.fornecedor && p.fornecedor.toLowerCase().includes(busca.toLowerCase()));

      // Category
      const matchCategoria = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro;

      // Status
      let matchStatus = true;
      if (statusFiltro === 'zerado') {
        matchStatus = p.estoque_atual <= 0;
      } else if (statusFiltro === 'baixo') {
        matchStatus = p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo;
      } else if (statusFiltro === 'normal') {
        matchStatus = p.estoque_atual > p.estoque_minimo;
      }

      return matchBusca && matchCategoria && matchStatus;
    }).sort((a, b) => {
      if (ordenacao === 'nome') return a.nome.localeCompare(b.nome);
      if (ordenacao === 'estoque_asc') return a.estoque_atual - b.estoque_atual;
      if (ordenacao === 'estoque_desc') return b.estoque_atual - a.estoque_atual;
      if (ordenacao === 'valor_desc') return (b.preco_venda * b.estoque_atual) - (a.preco_venda * a.estoque_atual);
      return 0;
    });
  }, [produtos, busca, categoriaFiltro, statusFiltro, ordenacao]);

  // Open modal for new product
  const handleOpenNewModal = () => {
    setEditingProduto(null);
    setCodigoBarras(gerarCodigoBarrasInterno());
    setNome('');
    setCategoria('Mercearia Salgada');
    setPrecoCusto('');
    setPrecoVenda('');
    setEstoqueAtual('0');
    setEstoqueMinimo('5');
    setUnidade('un');
    setValidade('');
    setFornecedor('');
    setImagemUrl('');
    setObservacoes('');
    setErroForm('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (p: Produto) => {
    setEditingProduto(p);
    setCodigoBarras(p.codigo_barras);
    setNome(p.nome);
    setCategoria(p.categoria);
    setPrecoCusto(p.preco_custo.toString());
    setPrecoVenda(p.preco_venda.toString());
    setEstoqueAtual(p.estoque_atual.toString());
    setEstoqueMinimo(p.estoque_minimo.toString());
    setUnidade(p.unidade);
    setValidade(p.validade || '');
    setFornecedor(p.fornecedor || '');
    setImagemUrl(p.imagem_url || '');
    setObservacoes(p.observacoes || '');
    setErroForm('');
    setIsModalOpen(true);
  };

  // Handle uploading product image to Supabase Storage
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErroForm('');
    try {
      const res = await db.uploadArquivo(file, 'produtos');
      if (res.success && res.url) {
        setImagemUrl(res.url);
      } else {
        setErroForm(res.error || 'Erro ao fazer upload da imagem.');
      }
    } catch (err: any) {
      setErroForm(`Falha no upload: ${err.message || 'Verifique as permissões de storage'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Open fast stock adjustment
  const handleOpenAjuste = (p: Produto) => {
    setProdutoParaAjuste(p);
    setTipoAjuste('entrada');
    setQtdAjuste('');
    setMotivoAjuste('');
    setIsAjusteModalOpen(true);
  };

  // Save product
  const handleSubmitProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErroForm('O nome do produto é obrigatório.');
      return;
    }
    if (!codigoBarras.trim()) {
      setErroForm('O código de barras é obrigatório.');
      return;
    }

    const custo = parseFloat(precoCusto.replace(',', '.')) || 0;
    const venda = parseFloat(precoVenda.replace(',', '.')) || 0;
    const estAtual = parseFloat(estoqueAtual.replace(',', '.')) || 0;
    const estMin = parseFloat(estoqueMinimo.replace(',', '.')) || 0;

    if (venda < 0 || custo < 0) {
      setErroForm('Os preços não podem ser negativos.');
      return;
    }

    setIsSaving(true);
    setErroForm('');

    try {
      const prod: Produto = {
        id: editingProduto ? editingProduto.id : 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        codigo_barras: codigoBarras.trim(),
        nome: nome.trim(),
        categoria,
        preco_custo: custo,
        preco_venda: venda,
        estoque_atual: estAtual,
        estoque_minimo: estMin,
        unidade,
        validade: validade || undefined,
        fornecedor: fornecedor.trim() || undefined,
        imagem_url: imagemUrl.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        created_at: editingProduto ? editingProduto.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSalvarProduto(prod);

      // If initial stock was given during creation, register stock movement
      if (!editingProduto && estAtual > 0) {
        await onMovimentarEstoque(
          prod.id,
          prod.nome,
          'entrada',
          estAtual,
          'Estoque inicial de cadastro'
        );
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setErroForm(`Erro ao salvar produto: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Submit stock adjustment
  const handleConfirmarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoParaAjuste) return;

    const qtd = parseFloat(qtdAjuste.replace(',', '.')) || 0;
    if (qtd <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    let novoEstoque = produtoParaAjuste.estoque_atual;
    if (tipoAjuste === 'entrada' || tipoAjuste === 'ajuste_positivo') {
      novoEstoque += qtd;
    } else {
      if (qtd > produtoParaAjuste.estoque_atual) {
        if (!confirm(`Atenção: A quantidade informada (${qtd}) é maior que o estoque atual (${produtoParaAjuste.estoque_atual}). O estoque ficará negativo. Deseja continuar?`)) {
          return;
        }
      }
      novoEstoque -= qtd;
    }

    try {
      // 1. Update product stock
      const prodAtualizado: Produto = {
        ...produtoParaAjuste,
        estoque_atual: Math.max(0, novoEstoque),
        updated_at: new Date().toISOString(),
      };
      await onSalvarProduto(prodAtualizado);

      // 2. Register stock movement log
      await onMovimentarEstoque(
        produtoParaAjuste.id,
        produtoParaAjuste.nome,
        tipoAjuste,
        qtd,
        motivoAjuste.trim() || undefined
      );

      setIsAjusteModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao ajustar estoque: ${err.message}`);
    }
  };

  // Delete product
  const handleDelete = async (id: string, nomeProd: string) => {
    if (confirm(`Tem certeza que deseja excluir o produto "${nomeProd}"? Esta ação removerá o produto do estoque.`)) {
      await onExcluirProduto(id);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (produtos.length === 0) {
      alert('Não há produtos cadastrados para exportar.');
      return;
    }

    const headers = ['Código de Barras', 'Nome', 'Categoria', 'Unidade', 'Preço Custo', 'Preço Venda', 'Estoque Atual', 'Estoque Mínimo', 'Validade', 'Fornecedor'];
    const rows = produtos.map((p) => [
      `"${p.codigo_barras}"`,
      `"${p.nome.replace(/"/g, '""')}"`,
      `"${p.categoria}"`,
      `"${p.unidade}"`,
      p.preco_custo.toFixed(2),
      p.preco_venda.toFixed(2),
      p.estoque_atual,
      p.estoque_minimo,
      p.validade || '',
      `"${(p.fornecedor || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_supermercado_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated margin in modal
  const custoNum = parseFloat(precoCusto.replace(',', '.')) || 0;
  const vendaNum = parseFloat(precoVenda.replace(',', '.')) || 0;
  const lucroUnitario = vendaNum - custoNum;
  const margemLucro = vendaNum > 0 ? ((lucroUnitario / vendaNum) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Controle de Estoque
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie itens, precificação com margem de lucro e controle de reposição
          </p>
        </div>

        <div className="flex items-center gap-2">
          {produtos.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="Exportar tabela de produtos em arquivo CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Real Data Only) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Produtos Cadastrados</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {totalProdutosCadastrados}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <span className="tabular-nums font-semibold text-slate-700">{formatNumber(totalUnidadesEstoque, 0)}</span> unidades no total
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Investimento em Estoque</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {formatMoney(valorTotalCusto)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Preço de custo das mercadorias
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Potencial de Venda</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 tabular-nums">
            {formatMoney(valorTotalVenda)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Lucro potencial: <span className="text-emerald-700 font-semibold tabular-nums">{formatMoney(lucroPotencial)}</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Alertas de Reposição</span>
            <AlertTriangle className={`w-4 h-4 ${produtosEstoqueBaixo + produtosZerados > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-slate-900 tabular-nums">
              {produtosEstoqueBaixo + produtosZerados}
            </p>
            {produtosZerados > 0 && (
              <span className="text-xs font-bold text-rose-600 tabular-nums">
                ({produtosZerados} esgotados)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {produtosEstoqueBaixo} com estoque baixo
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código de barras, nome do produto ou fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            {busca && (
              <button 
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="todos">Todas as Categorias</option>
              {CATEGORIAS_SUPERMERCADO.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="nome">Ordem: Nome (A-Z)</option>
              <option value="estoque_asc">Menor Estoque</option>
              <option value="estoque_desc">Maior Estoque</option>
              <option value="valor_desc">Maior Valor Total</option>
            </select>
          </div>
        </div>

        {/* Status Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium mr-1">Status:</span>
          
          <button
            onClick={() => setStatusFiltro('todos')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              statusFiltro === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({produtos.length})
          </button>

          <button
            onClick={() => setStatusFiltro('normal')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              statusFiltro === 'normal'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Normal ({produtos.filter((p) => p.estoque_atual > p.estoque_minimo).length})
          </button>

          <button
            onClick={() => setStatusFiltro('baixo')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              statusFiltro === 'baixo'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Estoque Baixo ({produtosEstoqueBaixo})
          </button>

          <button
            onClick={() => setStatusFiltro('zerado')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              statusFiltro === 'zerado'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Esgotado ({produtosZerados})
          </button>
        </div>
      </div>

      {/* Products Table or Zero Data State */}
      {produtos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Nenhum produto cadastrado no estoque
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Você ainda não cadastrou produtos. Clique no botão abaixo para adicionar seu primeiro produto com código de barras, preços e estoque inicial.
          </p>
          <button
            onClick={handleOpenNewModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Primeiro Produto
          </button>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">Nenhum produto encontrado com os filtros selecionados.</p>
          <button
            onClick={() => {
              setBusca('');
              setCategoriaFiltro('todos');
              setStatusFiltro('todos');
            }}
            className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Código / EAN</th>
                  <th className="py-3 px-4">Produto & Categoria</th>
                  <th className="py-3 px-3 text-center">Un.</th>
                  <th className="py-3 px-4 text-right">Preço Custo</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-3 text-right">Margem</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-right">Total em R$</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtosFiltrados.map((p) => {
                  const isEsgotado = p.estoque_atual <= 0;
                  const isBaixo = !isEsgotado && p.estoque_atual <= p.estoque_minimo;
                  const margem = p.preco_venda > 0 ? ((p.preco_venda - p.preco_custo) / p.preco_venda) * 100 : 0;
                  const totalEstoqueValor = p.preco_venda * p.estoque_atual;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-2xs whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.codigo_barras}
                        </span>
                      </td>

                      {/* Product Name & Category */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.imagem_url ? (
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 text-xs">
                              {p.nome}
                            </div>
                            <div className="flex items-center gap-1.5 text-2xs text-slate-500 mt-0.5">
                              <span>{p.categoria}</span>
                              {p.fornecedor && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate max-w-[140px]">{p.fornecedor}</span>
                                </>
                              )}
                              {p.validade && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>Val: {formatDate(p.validade)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 text-center text-slate-600 font-mono uppercase">
                        {p.unidade}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                        {formatMoney(p.preco_custo)}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatMoney(p.preco_venda)}
                      </td>

                      {/* Profit Margin */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span className={`text-2xs font-bold ${
                          margem >= 30 ? 'text-emerald-700' : margem > 10 ? 'text-blue-700' : 'text-amber-700'
                        }`}>
                          {margem.toFixed(1)}%
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-bold font-mono text-xs ${
                            isEsgotado 
                              ? 'text-rose-600' 
                              : isBaixo 
                              ? 'text-amber-600' 
                              : 'text-slate-800'
                          }`}>
                            {formatNumber(p.estoque_atual, p.unidade === 'kg' ? 3 : 0)}
                          </span>
                          <span className="text-2xs text-slate-400">
                            mín: {p.estoque_minimo}
                          </span>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-700">
                        {formatMoney(totalEstoqueValor)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAjuste(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Entrada ou Saída Rápida de Estoque"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Produto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.nome)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Excluir Produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar ou Editar Produto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduto ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduto} className="p-6 space-y-4">
              {erroForm && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                  {erroForm}
                </div>
              )}

              {/* Barcode & Auto Generator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Barras (EAN-13 ou Código Interno) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: 7891000100103"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCodigoBarras(gerarCodigoBarrasInterno())}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    title="Gerar código de barras interno padrão EAN-13"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gerar EAN</span>
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz Branco Tipo 1 5kg"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    {CATEGORIAS_SUPERMERCADO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  >
                    <option value="un">Unidade (UN)</option>
                    <option value="kg">Quilograma (KG)</option>
                    <option value="g">Grama (G)</option>
                    <option value="l">Litro (L)</option>
                    <option value="ml">Mililitro (ML)</option>
                    <option value="cx">Caixa (CX)</option>
                    <option value="pct">Pacote (PCT)</option>
                  </select>
                </div>
              </div>

              {/* Cost, Sale Price & Margin Preview */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={precoCusto}
                      onChange={(e) => setPrecoCusto(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Real-time Profit Preview */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
                  <span>
                    Lucro Bruto: <strong className="text-emerald-700 font-mono">{formatMoney(lucroUnitario)}</strong>
                  </span>
                  <span>
                    Margem de Lucro: <strong className={`font-mono ${margemLucro >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{margemLucro.toFixed(1)}%</strong>
                  </span>
                </div>
              </div>

              {/* Stocks (Current & Minimum) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estoque Atual ({unidade.toUpperCase()})
                  </label>
                  <input
                    type="number"
                    step={unidade === 'kg' ? '0.001' : '1'}
                    min="0"
                    required
                    value={estoqueAtual}
                    onChange={(e) => setEstoqueAtual(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    step={unidade === 'kg' ? '0.001' : '1'}
                    min="0"
                    required
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Validade & Fornecedor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Validade
                  </label>
                  <input
                    type="date"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fornecedor / Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora Alvorada"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Foto do Produto (Supabase Storage) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto do Produto (Armazenamento / Storage)
                </label>
                <div className="flex items-center gap-3">
                  {imagemUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={imagemUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setImagemUrl('')}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-xs hover:bg-rose-700"
                        title="Remover foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6 stroke-1" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5">
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isUploading ? 'Enviando...' : 'Fazer Upload (Storage)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFoto}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                      <span className="text-2xs text-slate-400">ou insira a URL abaixo</span>
                    </div>

                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto-do-produto.jpg"
                      value={imagemUrl}
                      onChange={(e) => setImagemUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Internas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corredor 3, Prateleira B"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2"
                >
                  {editingProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajuste Rápido de Estoque */}
      {isAjusteModalOpen && produtoParaAjuste && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">
                Movimentação de Estoque
              </h2>
              <button
                onClick={() => setIsAjusteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarAjuste} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-900">{produtoParaAjuste.nome}</p>
                <p className="text-slate-500 mt-0.5">
                  Estoque atual: <strong className="font-mono text-slate-800">{produtoParaAjuste.estoque_atual} {produtoParaAjuste.unidade}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Movimentação *
                </label>
                <select
                  value={tipoAjuste}
                  onChange={(e) => setTipoAjuste(e.target.value as TipoMovimentacao)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="entrada">Entrada (Recebimento de Mercadoria / Compra)</option>
                  <option value="ajuste_positivo">Ajuste Positivo (Contagem de Inventário)</option>
                  <option value="perda">Saída por Perda / Avaria / Vencimento</option>
                  <option value="ajuste_negativo">Ajuste Negativo (Correção de Estoque)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade a Movimentar ({produtoParaAjuste.unidade.toUpperCase()}) *
                </label>
                <input
                  type="number"
                  step={produtoParaAjuste.unidade === 'kg' ? '0.001' : '1'}
                  min="0.001"
                  required
                  placeholder="Informe a quantidade"
                  value={qtdAjuste}
                  onChange={(e) => setQtdAjuste(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Observação (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nota Fiscal 1420 / Produto quebrado"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAjusteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
