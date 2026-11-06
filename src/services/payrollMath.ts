import { round2 } from '@/config/constants';

export interface PurePieceRateItem {
  modelDescription: string;
  qty: number;
  ratePerPcs: number;
}

export interface KasbonRow {
  id: number;
  remaining_amount: number;
}

export class PayrollError extends Error {}

export function grossPay(items: PurePieceRateItem[]): number {
  return round2(items.reduce((acc, it) => acc + it.qty * it.ratePerPcs, 0));
}

export function validate(
  items: PurePieceRateItem[],
  kasbonDeduction: number,
  totalKasbon: number,
): void {
  if (items.length === 0) throw new PayrollError('Tambahkan minimal satu rincian pekerjaan.');
  if (items.some((it) => it.qty <= 0)) throw new PayrollError('Qty setiap item harus lebih dari 0.');
  if (items.some((it) => it.ratePerPcs < 0)) throw new PayrollError('Tarif per pcs tidak boleh negatif.');
  const gross = grossPay(items);
  const deduction = round2(kasbonDeduction);
  if (deduction < 0) throw new PayrollError('Potongan kasbon tidak boleh negatif.');
  if (deduction > gross) throw new PayrollError('Potongan kasbon tidak boleh melebihi total upah kotor.');
  if (deduction > totalKasbon + 0.001) throw new PayrollError('Potongan kasbon melebihi sisa kasbon karyawan.');
}

/**
 * Pure FIFO allocation: given outstanding kasbon rows (ordered oldest-first)
 * and a deduction, returns per-kasbon amounts to apply plus the leftover.
 */
export function allocateFifo(
  kasbons: KasbonRow[],
  deduction: number,
): { allocations: { kasbonId: number; amount: number; newRemaining: number }[]; unapplied: number } {
  const allocations: { kasbonId: number; amount: number; newRemaining: number }[] = [];
  let left = round2(deduction);
  for (const k of kasbons) {
    if (left <= 0) break;
    const remaining = round2(k.remaining_amount);
    const applied = Math.min(left, remaining);
    left = round2(left - applied);
    allocations.push({ kasbonId: k.id, amount: applied, newRemaining: round2(remaining - applied) });
  }
  return { allocations, unapplied: left };
}
