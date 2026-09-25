import React, { useState } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Table, 
  Terminal,
  HelpCircle,
  Key
} from 'lucide-react';
import { db, SUPABASE_SCHEMA_SQL } from '../services/supabase';

interface SupabaseViewProps {
  onRefreshData: () => void;
}

export const SupabaseView: React.FC<SupabaseViewProps> = ({ onRefreshData }) => {
  const currentConfig = db.getConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleTest = async () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Preencha a URL e a Chave Anônima antes de testar.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await db.testConnection(url, anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Erro ao conectar' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      const res = await db.saveConfig(url, anonKey);
      setTestResult(res);
      if (res.success) {
        onRefreshData();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await db.sincronizarLocalParaSupabase();
      setSyncResult(res);
      if (res.success) {
        onRefreshData();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          Configuração do Banco Supabase
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Conecte sua conta do Supabase para persistir seus produtos, vendas e movimentações em um banco de dados PostgreSQL na nuvem
        </p>
      </div>

      {/* Status Box */}
      <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
        currentConfig.isConnected 
          ? 'bg-emerald-50/70 border-emerald-200' 
          : 'bg-amber-50/70 border-amber-200'
      }`}>
        {currentConfig.isConnected ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
        )}
        <div className="space-y-1 text-xs">
          <h2 className="text-sm font-bold text-slate-900">
            {currentConfig.isConnected
              ? 'Conexão Supabase Ativa'
              : 'Modo de Armazenamento Local Ativo'}
          </h2>
          <p className="text-slate-600 leading-relaxed">
            {currentConfig.isConnected
              ? 'O sistema está conectado ao seu banco Supabase. Todas as alterações em estoque e novas vendas são gravadas diretamente no PostgreSQL na nuvem.'
              : 'O sistema está gravando localmente no navegador. Você pode cadastrar seus produtos normalmente agora e, a qualquer momento, conectar seu projeto Supabase abaixo para sincronizar tudo.'}
          </p>
          {currentConfig.isConnected && (
            <div className="pt-2">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ArrowRightLeft className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Dados Locais para Supabase
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Credenciais */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            Credenciais do Projeto
          </h2>
          <p className="text-2xs text-slate-500 mt-0.5">
            Localize esses dados em: <em>Supabase Dashboard &gt; Project Settings &gt; API</em>
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project URL
            </label>
            <input
              type="text"
              placeholder="https://sua-instancia.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project API Key (Anon / Public Key)
            </label>
            <textarea
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${
              testResult.success 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {testResult.message}
            </div>
          )}

          {syncResult && (
            <div className={`p-3 rounded-xl text-xs font-medium border ${
              syncResult.success 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {syncResult.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Salvar Credenciais
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Testar Conexão
            </button>

            {currentConfig.isConnected && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setAnonKey('');
                  db.saveConfig('', '');
                  onRefreshData();
                }}
                className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors ml-auto"
              >
                Desconectar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* SQL Script to create tables */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-600" />
              Script SQL com Políticas de Armazenamento (Storage & RLS)
            </h2>
            <p className="text-2xs text-slate-500 mt-0.5">
              Configura as tabelas, RLS completo e as <strong>políticas do Supabase Storage</strong> para o bucket <code>supermercado-arquivos</code>
            </p>
          </div>

          <button
            onClick={copySql}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Script SQL</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl overflow-hidden">
          <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-72 leading-relaxed">
            {SUPABASE_SCHEMA_SQL}
          </pre>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            Como executar no Supabase:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-2xs text-slate-600">
            <li>Acesse o painel do seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-semibold">Supabase Dashboard</a>.</li>
            <li>No menu lateral esquerdo, clique em <strong>SQL Editor</strong>.</li>
            <li>Clique em <strong>New Query</strong>, cole o código acima e clique em <strong>RUN</strong>.</li>
            <li>Pronto! Todas as tabelas e permissões estarão configuradas instantaneamente.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
