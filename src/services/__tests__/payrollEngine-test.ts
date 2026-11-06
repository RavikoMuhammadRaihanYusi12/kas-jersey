import { allocateFifo, grossPay, validate, PayrollError, type PurePieceRateItem } from '@/services/payrollMath';

const item = (qty: number, rate: number): PurePieceRateItem => ({ modelDescription: 'x', qty, ratePerPcs: rate });

describe('grossPay', () => {
  it('sums qty * rate across multiple lines', () => {
    expect(grossPay([item(20, 12000), item(15, 9000)])).toBe(375000);
  });
  it('rounds to 2 decimals', () => {
    expect(grossPay([item(3, 3333.333)])).toBe(10000);
  });
});

describe('validate', () => {
  it('rejects empty items', () => {
    expect(() => validate([], 0, 0)).toThrow(PayrollError);
  });
  it('rejects zero qty', () => {
    expect(() => validate([item(0, 1000)], 0, 0)).toThrow(PayrollError);
  });
  it('rejects deduction above gross', () => {
    expect(() => validate([item(1, 1000)], 2000, 5000)).toThrow(PayrollError);
  });
  it('rejects deduction above remaining kasbon', () => {
    expect(() => validate([item(10, 1000)], 3000, 2000)).toThrow(PayrollError);
  });
  it('accepts valid deduction equal to remaining kasbon', () => {
    expect(() => validate([item(10, 1000)], 2000, 2000)).not.toThrow();
  });
});

describe('allocateFifo', () => {
  it('fully pays the oldest kasbon first', () => {
    const r = allocateFifo([{ id: 1, remaining_amount: 50000 }, { id: 2, remaining_amount: 50000 }], 50000);
    expect(r.allocations).toEqual([{ kasbonId: 1, amount: 50000, newRemaining: 0 }]);
    expect(r.unapplied).toBe(0);
  });
  it('spills into the next kasbon when partial', () => {
    const r = allocateFifo([{ id: 1, remaining_amount: 30000 }, { id: 2, remaining_amount: 40000 }], 50000);
    expect(r.allocations).toEqual([
      { kasbonId: 1, amount: 30000, newRemaining: 0 },
      { kasbonId: 2, amount: 20000, newRemaining: 20000 },
    ]);
    expect(r.unapplied).toBe(0);
  });
  it('applies partially to the first kasbon when deduction is smaller', () => {
    const r = allocateFifo([{ id: 1, remaining_amount: 30000 }], 10000);
    expect(r.allocations).toEqual([{ kasbonId: 1, amount: 10000, newRemaining: 20000 }]);
  });
  it('reports unapplied amount when deduction exceeds all remaining', () => {
    const r = allocateFifo([{ id: 1, remaining_amount: 10000 }], 15000);
    expect(r.unapplied).toBe(5000);
    expect(r.allocations[0]).toEqual({ kasbonId: 1, amount: 10000, newRemaining: 0 });
  });
  it('handles empty kasbon list', () => {
    const r = allocateFifo([], 1000);
    expect(r.allocations).toEqual([]);
    expect(r.unapplied).toBe(1000);
  });
  it('handles fractional amounts without float drift', () => {
    const r = allocateFifo([{ id: 1, remaining_amount: 0.1 }, { id: 2, remaining_amount: 0.2 }], 0.3);
    expect(r.allocations.every((a) => a.newRemaining === 0)).toBe(true);
    expect(r.unapplied).toBe(0);
  });
});
