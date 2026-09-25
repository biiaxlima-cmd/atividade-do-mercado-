export function formatMoney(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val || 0);
}

export function formatNumber(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val || 0);
}

export function formatDate(isoDateString?: string): string {
  if (!isoDateString) return '-';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDateString;
  }
}

export function formatDateTime(isoDateString?: string): string {
  if (!isoDateString) return '-';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoDateString;
  }
}

// Generate internal EAN-13 code (starts with 789 Brazil standard prefix or 200 internal)
export function gerarCodigoBarrasInterno(): string {
  const prefix = '789';
  let middle = '';
  for (let i = 0; i < 9; i++) {
    middle += Math.floor(Math.random() * 10);
  }
  const code12 = prefix + middle;
  // Calculate check digit (modulo 10)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10);
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code12 + checkDigit;
}

export const CATEGORIAS_SUPERMERCADO = [
  'Hortifrúti',
  'Açougue e Carnes',
  'Padaria e Confeitaria',
  'Laticínios e Frios',
  'Mercearia Doce',
  'Mercearia Salgada',
  'Bebidas Alcoólicas',
  'Bebidas Não Alcoólicas',
  'Congelados e Resfriados',
  'Limpeza',
  'Higiene e Perfumaria',
  'Bazar e Utilidades',
  'Pet Shop',
  'Outros',
];

export const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  pix: 'PIX',
  vale_alimentacao: 'Vale Alimentação',
  vale_refeicao: 'Vale Refeição',
  outro: 'Outro',
};
