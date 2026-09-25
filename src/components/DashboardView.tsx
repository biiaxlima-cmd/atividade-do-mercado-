import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  Printer, 
  CreditCard,
  Layers,
  Sparkles,
  BarChart2,
  Clock
} from 'lucide-react';
import { Produto, Venda } from '../types';
import { 
  formatMoney, 
  formatNumber, 
  formatDate, 
  FORMAS_PAGAMENTO_LABELS 
} from '../utils/formatters';

interface DashboardViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onNavigateToEstoque: () => void;
  onNavigateToVendas: () => void;
}

type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | 'mes' | 'todos';

export const DashboardView: React.FC<DashboardViewProps> = ({
  produtos,
  vendas,
  onNavigateToEstoque,
  onNavigateToVendas,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30dias');

  // Filter sales by selected period (only concluded sales)
  const vendasFiltradas = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    return vendas.filter((v) => {
      if (v.status !== 'concluida') return false;
      const dataVenda = new Date(v.data_venda);

      if (periodo === 'hoje') {
        return dataVenda >= inicioHoje;
      }
      if (periodo === '7dias') {
        const seteDias = new Date();
        seteDias.setDate(agora.getDate() - 7);
        return dataVenda >= seteDias;
      }
      if (periodo === '30dias') {
        const trintaDias = new Date();
        trintaDias.setDate(agora.getDate() - 30);
        return dataVenda >= trintaDias;
      }
      if (periodo === 'mes') {
        return (
          dataVenda.getMonth() === agora.getMonth() &&
          dataVenda.getFullYear() === agora.getFullYear()
        );
      }
      return true; // 'todos'
    });
  }, [vendas, periodo]);

  // Aggregate Metrics
  const totalFaturado = vendasFiltradas.reduce((acc, v) => acc + v.valor_total, 0);
  const custoTotalVendido = vendasFiltradas.reduce((acc, v) => acc + (v.custo_total || 0), 0);
  const lucroBrutoReal = totalFaturado - custoTotalVendido;
  const margemBrutaPercentual = totalFaturado > 0 ? (lucroBrutoReal / totalFaturado) * 100 : 0;
  const totalVendasConcluidas = vendasFiltradas.length;
  const ticketMedio = totalVendasConcluidas > 0 ? totalFaturado / totalVendasConcluidas : 0;

  // Stock Metrics (Current status)
  const totalItensEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual, 0);
  const valorEstoqueCusto = produtos.reduce((acc, p) => acc + (p.preco_custo * p.estoque_atual), 0);
  const valorEstoqueVenda = produtos.reduce((acc, p) => acc + (p.preco_venda * p.estoque_atual), 0);
  const lucroEstoquePotencial = valorEstoqueVenda - valorEstoqueCusto;

  // Stock Alerts
  const produtosAlertaBaixo = produtos.filter(
    (p) => p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo
  );
  const produtosAlertaZerado = produtos.filter((p) => p.estoque_atual <= 0);

  // Group Sales by Day for Trend Chart
  const vendasPorDia = useMemo(() => {
    const mapaDias: Record<string, { dataStr: string; total: number; lucro: number }> = {};

    vendasFiltradas.forEach((v) => {
      const d = new Date(v.data_venda);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!mapaDias[chave]) {
        mapaDias[chave] = {
          dataStr: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
          total: 0,
          lucro: 0,
        };
      }
      mapaDias[chave].total += v.valor_total;
      mapaDias[chave].lucro += v.valor_total - (v.custo_total || 0);
    });

    return Object.keys(mapaDias)
      .sort()
      .map((k) => mapaDias[k]);
  }, [vendasFiltradas]);

  // Payment method breakdown
  const formasPagamentoMap = useMemo(() => {
    const map: Record<string, { total: number; qtd: number }> = {};
    vendasFiltradas.forEach((v) => {
      const forma = v.forma_pagamento || 'outro';
      if (!map[forma]) map[forma] = { total: 0, qtd: 0 };
      map[forma].total += v.valor_total;
      map[forma].qtd += 1;
    });
    return map;
  }, [vendasFiltradas]);

  // Top Selling Products
  const topProdutos = useMemo(() => {
    const map: Record<string, { nome: string; quantidade: number; receita: number; unidade: string }> = {};

    vendasFiltradas.forEach((v) => {
      v.itens?.forEach((it) => {
        if (!map[it.produto_id]) {
          map[it.produto_id] = {
            nome: it.produto_nome,
            quantidade: 0,
            receita: 0,
            unidade: it.unidade,
          };
        }
        map[it.produto_id].quantidade += it.quantidade;
        map[it.produto_id].receita += it.subtotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);
  }, [vendasFiltradas]);

  // Max value for chart scaling
  const maxGrafico = Math.max(...vendasPorDia.map((d) => d.total), 10);

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard & Relatórios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas reais consolidadas de vendas, faturamento, margem de lucro e estoque
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodo === 'hoje'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('7dias')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodo === '7dias'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriodo('30dias')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodo === '30dias'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodo === 'mes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              periodo === 'todos'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Total
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Faturamento ({periodo})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {formatMoney(totalFaturado)}
          </p>
          <div className="flex items-center gap-1.5 text-2xs text-slate-500 mt-2">
            <span className="font-semibold text-slate-700 tabular-nums">
              {totalVendasConcluidas} {totalVendasConcluidas === 1 ? 'venda' : 'vendas'}
            </span>
            <span>·</span>
            <span>Ticket Médio: <strong className="text-slate-700 font-mono">{formatMoney(ticketMedio)}</strong></span>
          </div>
        </div>

        {/* Lucro Bruto Apurado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Lucro Bruto Real</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {formatMoney(lucroBrutoReal)}
          </p>
          <div className="flex items-center gap-1.5 text-2xs text-slate-500 mt-2">
            <span>Margem média de vendas:</span>
            <span className={`font-bold font-mono ${margemBrutaPercentual >= 25 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {margemBrutaPercentual.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Patrimônio em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Estoque Total</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {formatMoney(valorEstoqueVenda)}
          </p>
          <div className="flex items-center justify-between text-2xs text-slate-500 mt-2">
            <span>Custo: <strong className="text-slate-700 font-mono">{formatMoney(valorEstoqueCusto)}</strong></span>
            <span>{produtos.length} produtos ({formatNumber(totalItensEstoque, 0)} un)</span>
          </div>
        </div>

        {/* Alertas de Estoque Crítico */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Avisos de Estoque</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              produtosAlertaBaixo.length + produtosAlertaZerado.length > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {produtosAlertaBaixo.length + produtosAlertaZerado.length}
          </p>
          <div className="text-2xs text-slate-500 mt-2 flex items-center gap-1.5">
            {produtosAlertaZerado.length > 0 ? (
              <span className="text-rose-600 font-bold">
                {produtosAlertaZerado.length} esgotados
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">Nenhum produto zerado</span>
            )}
            <span>·</span>
            <span>{produtosAlertaBaixo.length} em nível baixo</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {produtos.length === 0 && vendas.length === 0 ? (
        /* Zero Data Guidance */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <BarChart2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Nenhum dado cadastrado no sistema
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Como você solicitou um sistema limpo sem informações modelo fictícias, o dashboard está pronto para calcular seus relatórios reais assim que você cadastrar seus produtos e realizar vendas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNavigateToEstoque}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              1º Passo: Cadastrar Produtos no Estoque
            </button>
            <button
              onClick={onNavigateToVendas}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              2º Passo: Ir para Frente de Caixa (PDV)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Evolução de Vendas Diárias (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Evolução Diária de Vendas
                </h3>
                <p className="text-2xs text-slate-500">
                  Faturamento e lucro nos dias com vendas registradas no período
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Total: {formatMoney(totalFaturado)}
              </span>
            </div>

            {vendasPorDia.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium text-slate-500">
                  Nenhuma venda registrada no período selecionado ({periodo}).
                </p>
                <p className="text-2xs text-slate-400 mt-1">
                  Mude o filtro para "Total" ou registre uma nova venda no PDV.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual SVG Chart */}
                <div className="h-56 w-full pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradientFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={180 - pct * 150}
                        x2="500"
                        y2={180 - pct * 150}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Bars or Line Chart based on number of days */}
                    {vendasPorDia.length === 1 ? (
                      // Single day: centered bar
                      <g>
                        <rect
                          x="220"
                          y={180 - (vendasPorDia[0].total / maxGrafico) * 150}
                          width="60"
                          height={(vendasPorDia[0].total / maxGrafico) * 150}
                          rx="6"
                          className="fill-emerald-600"
                        />
                        <text
                          x="250"
                          y={170 - (vendasPorDia[0].total / maxGrafico) * 150}
                          textAnchor="middle"
                          className="text-[10px] font-mono fill-emerald-800 font-bold"
                        >
                          {formatMoney(vendasPorDia[0].total)}
                        </text>
                        <text
                          x="250"
                          y="195"
                          textAnchor="middle"
                          className="text-[10px] font-mono fill-slate-400"
                        >
                          {vendasPorDia[0].dataStr}
                        </text>
                      </g>
                    ) : (
                      // Multiple days line/area
                      (() => {
                        const stepX = 500 / (vendasPorDia.length - 1);
                        const points = vendasPorDia.map((d, i) => {
                          const x = i * stepX;
                          const y = 180 - (d.total / maxGrafico) * 150;
                          return `${x},${y}`;
                        });
                        const areaPoints = `0,180 ${points.join(' ')} 500,180`;

                        return (
                          <g>
                            <polygon points={areaPoints} fill="url(#gradientFaturamento)" />
                            <polyline
                              fill="none"
                              stroke="#059669"
                              strokeWidth="3"
                              points={points.join(' ')}
                            />
                            {vendasPorDia.map((d, i) => {
                              const x = i * stepX;
                              const y = 180 - (d.total / maxGrafico) * 150;
                              return (
                                <g key={i}>
                                  <circle cx={x} cy={y} r="4" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                                  <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor={i === 0 ? 'start' : i === vendasPorDia.length - 1 ? 'end' : 'middle'}
                                    className="text-[9px] font-mono fill-slate-700 font-semibold"
                                  >
                                    {formatMoney(d.total)}
                                  </text>
                                  <text
                                    x={x}
                                    y="195"
                                    textAnchor="middle"
                                    className="text-[9px] font-mono fill-slate-400"
                                  >
                                    {d.dataStr}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()
                    )}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Formas de Pagamento (4 Cols) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Vendas por Pagamento
              </h3>
            </div>

            {Object.keys(formasPagamentoMap).length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Nenhuma venda no período para exibir meios de pagamento.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(formasPagamentoMap).map(([forma, dados]) => {
                  const perc = totalFaturado > 0 ? (dados.total / totalFaturado) * 100 : 0;
                  return (
                    <div key={forma} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {FORMAS_PAGAMENTO_LABELS[forma] || forma}
                        </span>
                        <span className="font-bold text-slate-900 tabular-nums font-mono">
                          {formatMoney(dados.total)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.max(4, perc)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-2xs text-slate-400">
                        <span>{dados.qtd} {dados.qtd === 1 ? 'venda' : 'vendas'}</span>
                        <span>{perc.toFixed(1)}% do total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top 5 Produtos Mais Vendidos (6 Cols) */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Produtos Mais Vendidos ({periodo})
            </h3>

            {topProdutos.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Nenhum produto vendido ainda no período selecionado.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {topProdutos.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-2xs font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{item.nome}</div>
                        <div className="text-2xs text-slate-400">
                          Quantidade: <strong className="font-mono text-slate-600">{formatNumber(item.quantidade, item.unidade === 'kg' ? 3 : 0)} {item.unidade}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-bold text-slate-900 tabular-nums font-mono">
                      {formatMoney(item.receita)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de Produtos com Estoque Baixo ou Zerado (6 Cols) */}
          <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Reposição Necessária
              </h3>
              <button
                onClick={onNavigateToEstoque}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                Ver Estoque Completo →
              </button>
            </div>

            {produtosAlertaBaixo.length === 0 && produtosAlertaZerado.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <p className="font-semibold text-emerald-700">Tudo em dia!</p>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Nenhum produto está abaixo do estoque mínimo cadastrado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {[...produtosAlertaZerado, ...produtosAlertaBaixo].map((p) => {
                  const isZerado = p.estoque_atual <= 0;
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{p.nome}</div>
                        <div className="text-2xs text-slate-400">
                          Categoria: {p.categoria}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono font-bold ${isZerado ? 'text-rose-600' : 'text-amber-600'}`}>
                          {formatNumber(p.estoque_atual, p.unidade === 'kg' ? 3 : 0)} {p.unidade}
                        </span>
                        <div className="text-3xs text-slate-400">
                          mínimo: {p.estoque_minimo}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
