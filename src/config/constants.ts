export const DB_NAME = 'kasjersey.db';
export const DATABASE_VERSION = 2;

export const CURRENCY = 'IDR';
export const LOCALE = 'id-ID';

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat(LOCALE).format(value);

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** Local date as YYYY-MM-DD (native SQLite accepts this, not ISO Z). */
export const todayISO = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const DEFAULT_CATEGORIES = [
  { name: 'Penjualan Jersey', type: 'INCOME' as const },
  { name: 'Saldo', type: 'INCOME' as const },
  { name: 'Upah Borongan Jahit', type: 'EXPENSE' as const },
  { name: 'Gaji Bulanan', type: 'EXPENSE' as const },
  { name: 'Belanja Bahan Baku', type: 'EXPENSE' as const },
  { name: 'Pemeliharaan Mesin', type: 'EXPENSE' as const },
  { name: 'Token Listrik', type: 'EXPENSE' as const },
  { name: 'Operasional Lain', type: 'EXPENSE' as const },
];

export const DEFAULT_JOB_MODELS = [
  { model_name: 'Setelan Lengan Panjang + Kerah Polo', default_rate: 12000 },
  { model_name: 'Jersey Short Sleeve Oblong', default_rate: 9000 },
  { model_name: 'Celana Panjang', default_rate: 10000 },
  { model_name: 'Kancing + Finishing', default_rate: 3500 },
];
