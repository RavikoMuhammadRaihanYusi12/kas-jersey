import { round2 } from '@/config/constants';
import type { PieceRateItem } from '@/types';
import type { Database } from '@/database/db';
import { getDatabase } from '@/database/db';
import { allocateFifo, grossPay, validate, PayrollError, type KasbonRow } from './payrollMath';

export { allocateFifo, grossPay, validate, PayrollError };
export type { KasbonRow };

export interface PayrollInput {
  employeeId: number;
  categoryId: number;
  transactionDate: string;
  items: PieceRateItem[];
  kasbonDeduction: number;
  notes?: string;
}

export interface PayrollOutcome {
  transactionId: number;
  grossPay: number;
  kasbonDeduction: number;
  netPay: number;
}

/**
 * Records a piece-rate payroll payment atomically: ledger entry (net pay),
 * per-item details, and FIFO kasbon settlement. All-or-nothing.
 */
export async function processPieceRatePayroll(input: PayrollInput): Promise<PayrollOutcome> {
  const db = await getDatabase();

  const kasbons = await db.getAllAsync<KasbonRow>(
    `SELECT id, remaining_amount FROM kasbon
     WHERE employee_id = ? AND status IN ('UNPAID', 'PARTIAL')
     ORDER BY date ASC, id ASC`,
    input.employeeId,
  );
  const totalKasbon = round2(kasbons.reduce((acc, k) => acc + k.remaining_amount, 0));

  validate(input.items, input.kasbonDeduction, totalKasbon);

  const gross = grossPay(input.items);
  const deduction = round2(input.kasbonDeduction);
  const net = round2(gross - deduction);
  const { allocations } = allocateFifo(kasbons, deduction);

  let transactionId = 0;
  // withTransactionAsync runs all awaited statements in one SQL transaction and
  // rolls back on throw. Safe here: we never await work outside the callback.
  await db.withTransactionAsync(async () => {
    const txRes = await db.runAsync(
      `INSERT INTO transactions (transaction_date, type, category_id, amount, description, employee_id)
       VALUES (?, 'EXPENSE', ?, ?, ?, ?)`,
      input.transactionDate,
      input.categoryId,
      net,
      input.notes || 'Pembayaran Upah Borongan',
      input.employeeId,
    );
    transactionId = txRes.lastInsertRowId;

    for (const it of input.items) {
      await db.runAsync(
        `INSERT INTO payroll_piece_rate_details (transaction_id, model_description, qty, rate_per_pcs, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        transactionId,
        it.modelDescription,
        it.qty,
        it.ratePerPcs,
        round2(it.qty * it.ratePerPcs),
      );
    }

    for (const a of allocations) {
      const status = a.newRemaining <= 0 ? 'PAID' : 'PARTIAL';
      await db.runAsync(
        'UPDATE kasbon SET remaining_amount = ?, status = ? WHERE id = ?',
        a.newRemaining,
        status,
        a.kasbonId,
      );
      await db.runAsync(
        `INSERT INTO kasbon_settlements (kasbon_id, transaction_id, amount_deducted, date)
         VALUES (?, ?, ?, ?)`,
        a.kasbonId,
        transactionId,
        a.amount,
        input.transactionDate,
      );
    }
  });

  return { transactionId, grossPay: gross, kasbonDeduction: deduction, netPay: net };
}

export async function getPieceRateDetails(db: Database, transactionId: number) {
  return db.getAllAsync(
    'SELECT * FROM payroll_piece_rate_details WHERE transaction_id = ? ORDER BY id',
    transactionId,
  );
}
