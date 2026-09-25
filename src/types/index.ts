export type UnidadeMedida = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'cx' | 'pct';

export type FormaPagamento = 
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'pix'
  | 'vale_alimentacao'
  | 'vale_refeicao'
  | 'outro';

export type StatusVenda = 'concluida' | 'cancelada';

export type TipoMovimentacao = 
  | 'entrada'
  | 'saida_venda'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'perda';

export interface Produto {
  id: string;
  codigo_barras: string;
  nome: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: UnidadeMedida;
  validade?: string;
  fornecedor?: string;
  imagem_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemVenda {
  id: string;
  venda_id?: string;
  produto_id: string;
  produto_nome: string;
  codigo_barras: string;
  quantidade: number;
  unidade: UnidadeMedida;
  preco_unitario: number;
  preco_custo: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  numero_venda: number;
  data_venda: string;
  total_itens: number;
  subtotal: number;
  desconto: number;
  valor_total: number;
  custo_total: number;
  forma_pagamento: FormaPagamento;
  valor_pago?: number;
  troco?: number;
  cliente_nome?: string;
  cliente_cpf?: string;
  status: StatusVenda;
  itens: ItemVenda[];
  observacoes?: string;
  created_at: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo?: string;
  data_movimentacao: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  conectado: boolean;
}
