import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Produto, Venda, MovimentacaoEstoque, ItemVenda } from '../types';

const STORAGE_KEYS = {
  SUPABASE_CONFIG: 'sm_supabase_config',
  LOCAL_PRODUTOS: 'sm_local_produtos',
  LOCAL_VENDAS: 'sm_local_vendas',
  LOCAL_MOVIMENTACOES: 'sm_local_movimentacoes',
};

// SQL Schema for user to copy-paste into Supabase SQL Editor
export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- SCRIPT COMPLETO DE BANCO DE DADOS E ARMAZENAMENTO (SUPABASE)
-- Supermercado Gestor: Tabelas + RLS + Políticas de Armazenamento (Storage)
-- Copie todo este código, cole no 'SQL Editor' do seu Supabase e clique em 'RUN'
-- ==============================================================================

-- 1. TABELA DE PRODUTOS / ESTOQUE
create table if not exists public.produtos (
  id text primary key,
  codigo_barras text not null,
  nome text not null,
  categoria text not null default 'Geral',
  preco_custo numeric(12, 2) not null default 0.00,
  preco_venda numeric(12, 2) not null default 0.00,
  estoque_atual numeric(12, 3) not null default 0.000,
  estoque_minimo numeric(12, 3) not null default 0.000,
  unidade text not null default 'un',
  validade date,
  fornecedor text,
  imagem_url text,
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adiciona a coluna imagem_url caso a tabela já tenha sido criada anteriormente
alter table public.produtos add column if not exists imagem_url text;

-- 2. TABELA DE VENDAS
create table if not exists public.vendas (
  id text primary key,
  numero_venda integer not null,
  data_venda timestamp with time zone default timezone('utc'::text, now()) not null,
  total_itens integer not null default 0,
  subtotal numeric(12, 2) not null default 0.00,
  desconto numeric(12, 2) not null default 0.00,
  valor_total numeric(12, 2) not null default 0.00,
  custo_total numeric(12, 2) not null default 0.00,
  forma_pagamento text not null,
  valor_pago numeric(12, 2),
  troco numeric(12, 2),
  cliente_nome text,
  cliente_cpf text,
  status text not null default 'concluida',
  observacoes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABELA DE ITENS DA VENDA
create table if not exists public.itens_venda (
  id text primary key,
  venda_id text not null references public.vendas(id) on delete cascade,
  produto_id text not null,
  produto_nome text not null,
  codigo_barras text not null,
  quantidade numeric(12, 3) not null,
  unidade text not null default 'un',
  preco_unitario numeric(12, 2) not null,
  preco_custo numeric(12, 2) not null default 0.00,
  subtotal numeric(12, 2) not null
);

-- 4. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
create table if not exists public.movimentacoes_estoque (
  id text primary key,
  produto_id text not null,
  produto_nome text not null,
  tipo text not null,
  quantidade numeric(12, 3) not null,
  motivo text,
  data_movimentacao timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 5. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) NAS TABELAS
-- ==============================================================================
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;
alter table public.movimentacoes_estoque enable row level security;

-- Limpeza de políticas prévias das tabelas para idempotência
drop policy if exists "produtos_select_policy" on public.produtos;
drop policy if exists "produtos_insert_policy" on public.produtos;
drop policy if exists "produtos_update_policy" on public.produtos;
drop policy if exists "produtos_delete_policy" on public.produtos;
drop policy if exists "Acesso total produtos" on public.produtos;

drop policy if exists "vendas_select_policy" on public.vendas;
drop policy if exists "vendas_insert_policy" on public.vendas;
drop policy if exists "vendas_update_policy" on public.vendas;
drop policy if exists "vendas_delete_policy" on public.vendas;
drop policy if exists "Acesso total vendas" on public.vendas;

drop policy if exists "itens_venda_select_policy" on public.itens_venda;
drop policy if exists "itens_venda_insert_policy" on public.itens_venda;
drop policy if exists "itens_venda_update_policy" on public.itens_venda;
drop policy if exists "itens_venda_delete_policy" on public.itens_venda;
drop policy if exists "Acesso total itens_venda" on public.itens_venda;

drop policy if exists "movimentacoes_select_policy" on public.movimentacoes_estoque;
drop policy if exists "movimentacoes_insert_policy" on public.movimentacoes_estoque;
drop policy if exists "movimentacoes_update_policy" on public.movimentacoes_estoque;
drop policy if exists "movimentacoes_delete_policy" on public.movimentacoes_estoque;
drop policy if exists "Acesso total movimentacoes_estoque" on public.movimentacoes_estoque;

-- Políticas de Armazenamento/Acesso das Tabelas (SELECT, INSERT, UPDATE, DELETE)
create policy "produtos_select_policy" on public.produtos for select to public using (true);
create policy "produtos_insert_policy" on public.produtos for insert to public with check (true);
create policy "produtos_update_policy" on public.produtos for update to public using (true) with check (true);
create policy "produtos_delete_policy" on public.produtos for delete to public using (true);

create policy "vendas_select_policy" on public.vendas for select to public using (true);
create policy "vendas_insert_policy" on public.vendas for insert to public with check (true);
create policy "vendas_update_policy" on public.vendas for update to public using (true) with check (true);
create policy "vendas_delete_policy" on public.vendas for delete to public using (true);

create policy "itens_venda_select_policy" on public.itens_venda for select to public using (true);
create policy "itens_venda_insert_policy" on public.itens_venda for insert to public with check (true);
create policy "itens_venda_update_policy" on public.itens_venda for update to public using (true) with check (true);
create policy "itens_venda_delete_policy" on public.itens_venda for delete to public using (true);

create policy "movimentacoes_select_policy" on public.movimentacoes_estoque for select to public using (true);
create policy "movimentacoes_insert_policy" on public.movimentacoes_estoque for insert to public with check (true);
create policy "movimentacoes_update_policy" on public.movimentacoes_estoque for update to public using (true) with check (true);
create policy "movimentacoes_delete_policy" on public.movimentacoes_estoque for delete to public using (true);

-- ==============================================================================
-- 6. POLÍTICAS DE ARMAZENAMENTO DO SUPABASE STORAGE (ARQUIVOS E FOTOS)
-- ==============================================================================

-- Criar o bucket de armazenamento público 'supermercado-arquivos' caso não exista
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supermercado-arquivos',
  'supermercado-arquivos',
  true,
  52428800, -- Limite de 50MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/csv']
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 52428800;

-- Limpar políticas antigas do Storage para o bucket supermercado-arquivos (se existirem)
drop policy if exists "Supermercado - Leitura pública de arquivos" on storage.objects;
drop policy if exists "Supermercado - Upload de arquivos" on storage.objects;
drop policy if exists "Supermercado - Atualização de arquivos" on storage.objects;
drop policy if exists "Supermercado - Exclusão de arquivos" on storage.objects;
drop policy if exists "Permitir leitura pública de arquivos" on storage.objects;
drop policy if exists "Permitir upload de arquivos" on storage.objects;
drop policy if exists "Permitir atualização de arquivos" on storage.objects;
drop policy if exists "Permitir exclusão de arquivos" on storage.objects;

-- Política 1: Leitura pública (Permite visualizar fotos de produtos e comprovantes)
create policy "Supermercado - Leitura pública de arquivos"
on storage.objects for select
to public
using (bucket_id = 'supermercado-arquivos');

-- Política 2: Upload de arquivos (Permite envio de fotos de produtos e anexos)
create policy "Supermercado - Upload de arquivos"
on storage.objects for insert
to public
with check (bucket_id = 'supermercado-arquivos');

-- Política 3: Atualização de arquivos no bucket
create policy "Supermercado - Atualização de arquivos"
on storage.objects for update
to public
using (bucket_id = 'supermercado-arquivos')
with check (bucket_id = 'supermercado-arquivos');

-- Política 4: Exclusão de arquivos no bucket
create policy "Supermercado - Exclusão de arquivos"
on storage.objects for delete
to public
using (bucket_id = 'supermercado-arquivos');
`;

class DatabaseService {
  private client: SupabaseClient | null = null;
  private url: string = '';
  private anonKey: string = '';
  private isConnected: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // 1. Try env variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    let targetUrl = envUrl || '';
    let targetKey = envKey || '';

    // 2. Try localStorage
    if (!targetUrl || !targetKey) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
        if (saved) {
          const parsed = JSON.parse(saved);
          targetUrl = parsed.url || '';
          targetKey = parsed.anonKey || '';
        }
      } catch (err) {
        console.error('Erro ao ler config Supabase do localStorage', err);
      }
    }

    if (targetUrl && targetKey) {
      try {
        this.client = createClient(targetUrl, targetKey);
        this.url = targetUrl;
        this.anonKey = targetKey;
        this.isConnected = true;
      } catch (err) {
        console.error('Falha ao instanciar cliente Supabase', err);
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  public getConfig(): { url: string; anonKey: string; isConnected: boolean } {
    return {
      url: this.url,
      anonKey: this.anonKey,
      isConnected: this.isConnected,
    };
  }

  public async saveConfig(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      // Disconnect
      this.client = null;
      this.url = '';
      this.anonKey = '';
      this.isConnected = false;
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
      return { success: true, message: 'Supabase desconectado. Modo local ativo.' };
    }

    try {
      const testClient = createClient(cleanUrl, cleanKey);
      // Test query to verify connection
      const { error } = await testClient.from('produtos').select('id').limit(1);
      
      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet or invalid key
        if (error.message.includes('relation "produtos" does not exist') || error.code === '42P01') {
          // Connected successfully to Supabase, but schema not created yet!
          this.client = testClient;
          this.url = cleanUrl;
          this.anonKey = cleanKey;
          this.isConnected = true;
          localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
          return { 
            success: true, 
            message: 'Conectado ao Supabase! Lembre-se de rodar o script SQL para criar as tabelas.' 
          };
        }
        return { success: false, message: `Erro de conexão: ${error.message}` };
      }

      this.client = testClient;
      this.url = cleanUrl;
      this.anonKey = cleanKey;
      this.isConnected = true;
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
      return { success: true, message: 'Conectado ao Supabase com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Erro ao inicializar Supabase: ${err.message || 'Verifique a URL e Chave'}` };
    }
  }

  public async testConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const testClient = createClient(url.trim(), anonKey.trim());
      const { error } = await testClient.from('produtos').select('id').limit(1);
      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "produtos" does not exist')) {
          return { 
            success: true, 
            message: 'Credenciais válidas! O banco respondeu, mas a tabela "produtos" ainda precisa ser criada com o script SQL.' 
          };
        }
        return { success: false, message: `Falha: ${error.message}` };
      }
      return { success: true, message: 'Conexão testada com sucesso! As tabelas já estão disponíveis.' };
    } catch (err: any) {
      return { success: false, message: `Erro: ${err.message || 'Verifique as credenciais'}` };
    }
  }

  // ===== PRODUTOS =====
  public async carregarProdutos(): Promise<Produto[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true });

        if (!error && data) {
          const produtos: Produto[] = data.map((item) => ({
            id: item.id,
            codigo_barras: item.codigo_barras,
            nome: item.nome,
            categoria: item.categoria || 'Geral',
            preco_custo: Number(item.preco_custo || 0),
            preco_venda: Number(item.preco_venda || 0),
            estoque_atual: Number(item.estoque_atual || 0),
            estoque_minimo: Number(item.estoque_minimo || 0),
            unidade: item.unidade || 'un',
            validade: item.validade || undefined,
            fornecedor: item.fornecedor || undefined,
            imagem_url: item.imagem_url || undefined,
            observacoes: item.observacoes || undefined,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
          }));
          // Sync to local cache
          localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUTOS, JSON.stringify(produtos));
          return produtos;
        }
      } catch (err) {
        console.warn('Erro ao carregar produtos do Supabase, usando cache local:', err);
      }
    }

    // Local fallback
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_PRODUTOS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public async salvarProduto(produto: Produto): Promise<void> {
    // 1. Update local cache
    const locais = await this.carregarProdutos();
    const index = locais.findIndex((p) => p.id === produto.id);
    let novosLocais: Produto[];
    if (index >= 0) {
      novosLocais = [...locais];
      novosLocais[index] = produto;
    } else {
      novosLocais = [...locais, produto];
    }
    localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUTOS, JSON.stringify(novosLocais));

    // 2. If Supabase connected, upsert
    if (this.client) {
      try {
        await this.client.from('produtos').upsert({
          id: produto.id,
          codigo_barras: produto.codigo_barras,
          nome: produto.nome,
          categoria: produto.categoria,
          preco_custo: produto.preco_custo,
          preco_venda: produto.preco_venda,
          estoque_atual: produto.estoque_atual,
          estoque_minimo: produto.estoque_minimo,
          unidade: produto.unidade,
          validade: produto.validade || null,
          fornecedor: produto.fornecedor || null,
          imagem_url: produto.imagem_url || null,
          observacoes: produto.observacoes || null,
          created_at: produto.created_at,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Erro ao salvar produto no Supabase:', err);
      }
    }
  }

  public async excluirProduto(id: string): Promise<void> {
    const locais = await this.carregarProdutos();
    const filtrados = locais.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.LOCAL_PRODUTOS, JSON.stringify(filtrados));

    if (this.client) {
      try {
        await this.client.from('produtos').delete().eq('id', id);
      } catch (err) {
        console.error('Erro ao excluir produto no Supabase:', err);
      }
    }
  }

  // ===== VENDAS =====
  public async carregarVendas(): Promise<Venda[]> {
    if (this.client) {
      try {
        const { data: vendasData, error: vendasError } = await this.client
          .from('vendas')
          .select('*')
          .order('data_venda', { ascending: false });

        if (!vendasError && vendasData) {
          const { data: itensData } = await this.client.from('itens_venda').select('*');

          const vendas: Venda[] = vendasData.map((v) => {
            const itensDoPedido = (itensData || [])
              .filter((it) => it.venda_id === v.id)
              .map((it) => ({
                id: it.id,
                venda_id: it.venda_id,
                produto_id: it.produto_id,
                produto_nome: it.produto_nome,
                codigo_barras: it.codigo_barras,
                quantidade: Number(it.quantidade || 1),
                unidade: it.unidade || 'un',
                preco_unitario: Number(it.preco_unitario || 0),
                preco_custo: Number(it.preco_custo || 0),
                subtotal: Number(it.subtotal || 0),
              }));

            return {
              id: v.id,
              numero_venda: Number(v.numero_venda),
              data_venda: v.data_venda,
              total_itens: Number(v.total_itens),
              subtotal: Number(v.subtotal),
              desconto: Number(v.desconto || 0),
              valor_total: Number(v.valor_total),
              custo_total: Number(v.custo_total || 0),
              forma_pagamento: v.forma_pagamento,
              valor_pago: v.valor_pago ? Number(v.valor_pago) : undefined,
              troco: v.troco ? Number(v.troco) : undefined,
              cliente_nome: v.cliente_nome || undefined,
              cliente_cpf: v.cliente_cpf || undefined,
              status: v.status || 'concluida',
              observacoes: v.observacoes || undefined,
              created_at: v.created_at,
              itens: itensDoPedido,
            };
          });

          localStorage.setItem(STORAGE_KEYS.LOCAL_VENDAS, JSON.stringify(vendas));
          return vendas;
        }
      } catch (err) {
        console.warn('Erro ao carregar vendas do Supabase, usando cache local:', err);
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_VENDAS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public async salvarVenda(venda: Venda): Promise<void> {
    // 1. Update local cache
    const locais = await this.carregarVendas();
    const novos = [venda, ...locais];
    localStorage.setItem(STORAGE_KEYS.LOCAL_VENDAS, JSON.stringify(novos));

    // 2. If Supabase connected
    if (this.client) {
      try {
        await this.client.from('vendas').insert({
          id: venda.id,
          numero_venda: venda.numero_venda,
          data_venda: venda.data_venda,
          total_itens: venda.total_itens,
          subtotal: venda.subtotal,
          desconto: venda.desconto,
          valor_total: venda.valor_total,
          custo_total: venda.custo_total,
          forma_pagamento: venda.forma_pagamento,
          valor_pago: venda.valor_pago || null,
          troco: venda.troco || null,
          cliente_nome: venda.cliente_nome || null,
          cliente_cpf: venda.cliente_cpf || null,
          status: venda.status,
          observacoes: venda.observacoes || null,
          created_at: venda.created_at,
        });

        // Insert sale items
        if (venda.itens && venda.itens.length > 0) {
          const itensDb = venda.itens.map((it) => ({
            id: it.id,
            venda_id: venda.id,
            produto_id: it.produto_id,
            produto_nome: it.produto_nome,
            codigo_barras: it.codigo_barras,
            quantidade: it.quantidade,
            unidade: it.unidade,
            preco_unitario: it.preco_unitario,
            preco_custo: it.preco_custo,
            subtotal: it.subtotal,
          }));
          await this.client.from('itens_venda').insert(itensDb);
        }
      } catch (err) {
        console.error('Erro ao salvar venda no Supabase:', err);
      }
    }
  }

  public async cancelarVenda(vendaId: string): Promise<void> {
    const locais = await this.carregarVendas();
    const atualizadas = locais.map((v) => (v.id === vendaId ? { ...v, status: 'cancelada' as const } : v));
    localStorage.setItem(STORAGE_KEYS.LOCAL_VENDAS, JSON.stringify(atualizadas));

    if (this.client) {
      try {
        await this.client.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);
      } catch (err) {
        console.error('Erro ao cancelar venda no Supabase:', err);
      }
    }
  }

  // ===== MOVIMENTAÇÕES DE ESTOQUE =====
  public async carregarMovimentacoes(): Promise<MovimentacaoEstoque[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('movimentacoes_estoque')
          .select('*')
          .order('data_movimentacao', { ascending: false });

        if (!error && data) {
          const movs: MovimentacaoEstoque[] = data.map((m) => ({
            id: m.id,
            produto_id: m.produto_id,
            produto_nome: m.produto_nome,
            tipo: m.tipo,
            quantidade: Number(m.quantidade),
            motivo: m.motivo || undefined,
            data_movimentacao: m.data_movimentacao,
          }));
          localStorage.setItem(STORAGE_KEYS.LOCAL_MOVIMENTACOES, JSON.stringify(movs));
          return movs;
        }
      } catch (err) {
        console.warn('Erro ao carregar movimentações do Supabase:', err);
      }
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOCAL_MOVIMENTACOES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  public async registrarMovimentacao(mov: MovimentacaoEstoque): Promise<void> {
    const locais = await this.carregarMovimentacoes();
    const novos = [mov, ...locais];
    localStorage.setItem(STORAGE_KEYS.LOCAL_MOVIMENTACOES, JSON.stringify(novos));

    if (this.client) {
      try {
        await this.client.from('movimentacoes_estoque').insert({
          id: mov.id,
          produto_id: mov.produto_id,
          produto_nome: mov.produto_nome,
          tipo: mov.tipo,
          quantidade: mov.quantidade,
          motivo: mov.motivo || null,
          data_movimentacao: mov.data_movimentacao,
        });
      } catch (err) {
        console.error('Erro ao registrar movimentação no Supabase:', err);
      }
    }
  }

  // ===== SINCRONIZAÇÃO COMPLETA LOCAL -> SUPABASE =====
  public async sincronizarLocalParaSupabase(): Promise<{ success: boolean; message: string; count: number }> {
    if (!this.client) {
      return { success: false, message: 'Supabase não está conectado.', count: 0 };
    }

    try {
      const produtosLocais = await this.carregarProdutos();
      const vendasLocais = await this.carregarVendas();
      const movsLocais = await this.carregarMovimentacoes();

      let totalSync = 0;

      // 1. Sincroniza produtos
      if (produtosLocais.length > 0) {
        const payloadProdutos = produtosLocais.map((p) => ({
          id: p.id,
          codigo_barras: p.codigo_barras,
          nome: p.nome,
          categoria: p.categoria,
          preco_custo: p.preco_custo,
          preco_venda: p.preco_venda,
          estoque_atual: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          unidade: p.unidade,
          validade: p.validade || null,
          fornecedor: p.fornecedor || null,
          imagem_url: p.imagem_url || null,
          observacoes: p.observacoes || null,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        const { error: errProd } = await this.client.from('produtos').upsert(payloadProdutos);
        if (errProd) throw errProd;
        totalSync += payloadProdutos.length;
      }

      // 2. Sincroniza vendas e itens
      if (vendasLocais.length > 0) {
        const payloadVendas = vendasLocais.map((v) => ({
          id: v.id,
          numero_venda: v.numero_venda,
          data_venda: v.data_venda,
          total_itens: v.total_itens,
          subtotal: v.subtotal,
          desconto: v.desconto,
          valor_total: v.valor_total,
          custo_total: v.custo_total,
          forma_pagamento: v.forma_pagamento,
          valor_pago: v.valor_pago || null,
          troco: v.troco || null,
          cliente_nome: v.cliente_nome || null,
          cliente_cpf: v.cliente_cpf || null,
          status: v.status,
          observacoes: v.observacoes || null,
          created_at: v.created_at,
        }));
        const { error: errVenda } = await this.client.from('vendas').upsert(payloadVendas);
        if (errVenda) throw errVenda;

        const allItens: any[] = [];
        vendasLocais.forEach((v) => {
          v.itens?.forEach((it) => {
            allItens.push({
              id: it.id,
              venda_id: v.id,
              produto_id: it.produto_id,
              produto_nome: it.produto_nome,
              codigo_barras: it.codigo_barras,
              quantidade: it.quantidade,
              unidade: it.unidade,
              preco_unitario: it.preco_unitario,
              preco_custo: it.preco_custo,
              subtotal: it.subtotal,
            });
          });
        });

        if (allItens.length > 0) {
          const { error: errItens } = await this.client.from('itens_venda').upsert(allItens);
          if (errItens) throw errItens;
        }
        totalSync += payloadVendas.length;
      }

      // 3. Sincroniza movimentações
      if (movsLocais.length > 0) {
        const payloadMovs = movsLocais.map((m) => ({
          id: m.id,
          produto_id: m.produto_id,
          produto_nome: m.produto_nome,
          tipo: m.tipo,
          quantidade: m.quantidade,
          motivo: m.motivo || null,
          data_movimentacao: m.data_movimentacao,
        }));
        const { error: errMov } = await this.client.from('movimentacoes_estoque').upsert(payloadMovs);
        if (errMov) throw errMov;
        totalSync += payloadMovs.length;
      }

      return {
        success: true,
        message: 'Todos os dados locais foram sincronizados com o Supabase!',
        count: totalSync,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na sincronização: ${err.message || 'Verifique as permissões das tabelas no Supabase.'}`,
        count: 0,
      };
    }
  }

  // ===== SUPABASE STORAGE: UPLOAD DE ARQUIVOS/IMAGENS =====
  public async uploadArquivo(file: File, pasta: string = 'produtos'): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Supabase não está conectado. Conecte sua chave nas configurações.' };
    }

    try {
      const ext = file.name.split('.').pop() || 'png';
      const cleanFileName = `${pasta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { data, error } = await this.client.storage
        .from('supermercado-arquivos')
        .upload(cleanFileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        return { success: false, error: `Erro no upload: ${error.message}` };
      }

      const { data: publicUrlData } = this.client.storage
        .from('supermercado-arquivos')
        .getPublicUrl(data.path);

      return {
        success: true,
        url: publicUrlData.publicUrl,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro inesperado no envio do arquivo' };
    }
  }
}

export const db = new DatabaseService();
