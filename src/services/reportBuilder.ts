import { getDatabase } from '@/database/db';
import { getPieceRateDetails } from './payrollEngine';
import { formatCurrency, formatDate, formatNumber } from '@/config/constants';
import type { Kasbon, Transaction } from '@/types';

/** Builds a printable HTML payroll slip for one transaction. */
export async function buildPayrollSlipHtml(transactionId: number): Promise<string> {
  const db = await getDatabase();
  const tx = await db.getFirstAsync<Transaction & { employee_name: string | null; category_name: string }>(
    `SELECT t.*, e.name AS employee_name, c.name AS category_name
     FROM transactions t
     LEFT JOIN employees e ON e.id = t.employee_id
     JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    transactionId,
  );
  if (!tx) throw new Error('Transaksi tidak ditemukan.');

  const details = await getPieceRateDetails(db, transactionId);
  const settlements = await db.getAllAsync<{ amount_deducted: number; date: string }>(
    'SELECT amount_deducted, date FROM kasbon_settlements WHERE transaction_id = ?',
    transactionId,
  );
  const deduction = settlements.reduce((a, s) => a + s.amount_deducted, 0);
  const gross = (details as { subtotal: number }[]).reduce((a, d) => a + d.subtotal, 0);

  const rows = (details as { model_description: string; qty: number; rate_per_pcs: number; subtotal: number }[])
    .map(
      (d) =>
        `<tr><td>${d.model_description}</td><td style="text-align:right">${formatNumber(d.qty)}</td><td style="text-align:right">${formatCurrency(
          d.rate_per_pcs,
        )}</td><td style="text-align:right">${formatCurrency(d.subtotal)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<style>
  body { font-family: sans-serif; padding: 24px; color:#111; }
  h1 { font-size: 20px; margin:0 0 4px; }
  .muted { color:#666; font-size:12px; }
  table { width:100%; border-collapse: collapse; margin-top:16px; }
  th,td { border-bottom:1px solid #ddd; padding:6px 4px; font-size:13px; }
  th { background:#f3f4f6; text-align:left; }
  .totals { margin-top:16px; width:100%; }
  .totals td { padding:4px 0; font-size:13px; }
  .totals .label { color:#555; }
  .totals .value { text-align:right; }
  .net { font-weight:bold; font-size:15px; border-top:2px solid #111; }
</style></head><body>
  <h1>Slip Upah Borongan</h1>
  <div class="muted">${tx.employee_name ?? 'Tanpa Nama'} &middot; ${formatDate(tx.transaction_date)}</div>
  <table>
    <thead><tr><th>Model</th><th style="text-align:right">Qty</th><th style="text-align:right">Tarif/pcs</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td class="label">Total Upah Kotor</td><td class="value">${formatCurrency(gross)}</td></tr>
    <tr><td class="label">Potongan Kasbon</td><td class="value">- ${formatCurrency(deduction)}</td></tr>
    <tr class="net"><td>Upah Bersih Dibayar</td><td class="value">${formatCurrency(tx.amount)}</td></tr>
  </table>
  <p class="muted">Dicetak: ${formatDate(new Date().toISOString())}</p>
</body></html>`;
}

const REPORT_STYLE = `
  body { font-family: sans-serif; padding: 24px; color:#111; }
  h1 { font-size: 20px; margin:0 0 4px; }
  .muted { color:#666; font-size:12px; }
  table { width:100%; border-collapse: collapse; margin-top:16px; }
  th,td { border-bottom:1px solid #ddd; padding:6px 4px; font-size:12px; }
  th { background:#f3f4f6; text-align:left; }
  td.num, th.num { text-align:right; }
`;

const escapeHtml = (v: string | null): string =>
  (v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function buildLedgerHtml(from: string, to: string): Promise<string> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Transaction & { category_name: string; employee_name: string | null }>(
    `SELECT t.*, c.name AS category_name, e.name AS employee_name
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     LEFT JOIN employees e ON e.id = t.employee_id
     WHERE t.transaction_date BETWEEN ? AND ?
     ORDER BY t.transaction_date ASC, t.id ASC`,
    from,
    to,
  );
  const body = rows
    .map(
      (r) =>
        `<tr><td>${formatDate(r.transaction_date)}</td><td>${escapeHtml(r.category_name)}</td><td>${escapeHtml(
          r.description,
        )}</td><td>${escapeHtml(r.employee_name)}</td><td class="num" style="color:${
          r.type === 'INCOME' ? '#16a34a' : '#dc2626'
        }">${r.type === 'INCOME' ? '+' : '-'} ${formatCurrency(r.amount)}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${REPORT_STYLE}</style></head><body>
  <h1>Laporan Kas</h1>
  <div class="muted">Periode ${formatDate(from)} &ndash; ${formatDate(to)}</div>
  <table>
    <thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Karyawan</th><th class="num">Jumlah</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p class="muted">Dicetak: ${formatDate(new Date().toISOString())}</p>
</body></html>`;
}

export async function buildKasbonHtml(): Promise<string> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Kasbon & { employee_name: string }>(
    `SELECT k.*, e.name AS employee_name FROM kasbon k JOIN employees e ON e.id = k.employee_id ORDER BY k.date DESC`,
  );
  const body = rows
    .map(
      (r) =>
        `<tr><td>${formatDate(r.date)}</td><td>${escapeHtml(r.employee_name)}</td><td class="num">${formatCurrency(
          r.total_amount,
        )}</td><td class="num">${formatCurrency(r.remaining_amount)}</td><td>${r.status}</td><td>${escapeHtml(
          r.notes,
        )}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${REPORT_STYLE}</style></head><body>
  <h1>Laporan Kasbon</h1>
  <div class="muted">Semua karyawan</div>
  <table>
    <thead><tr><th>Tanggal</th><th>Karyawan</th><th class="num">Total</th><th class="num">Sisa</th><th>Status</th><th>Catatan</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p class="muted">Dicetak: ${formatDate(new Date().toISOString())}</p>
</body></html>`;
}
