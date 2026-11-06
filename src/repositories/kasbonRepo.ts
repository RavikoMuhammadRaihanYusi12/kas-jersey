import { getDatabase } from '@/database/db';
import type { Kasbon } from '@/types';
import { round2 } from '@/config/constants';

export interface KasbonWithEmployee extends Kasbon {
  employee_name: string;
}

export const kasbonRepo = {
  all(): Promise<KasbonWithEmployee[]> {
    return getDatabase().then((db) =>
      db.getAllAsync<KasbonWithEmployee>(
        `SELECT k.*, e.name AS employee_name FROM kasbon k
         JOIN employees e ON e.id = k.employee_id
         ORDER BY k.date DESC, k.id DESC`,
      ),
    );
  },
  activeByEmployee(employeeId: number): Promise<Kasbon[]> {
    return getDatabase().then((db) =>
      db.getAllAsync<Kasbon>(
        `SELECT * FROM kasbon WHERE employee_id = ? AND status IN ('UNPAID', 'PARTIAL')
         ORDER BY date ASC, id ASC`,
        employeeId,
      ),
    );
  },
  historyByEmployee(employeeId: number): Promise<Kasbon[]> {
    return getDatabase().then((db) =>
      db.getAllAsync<Kasbon>('SELECT * FROM kasbon WHERE employee_id = ? ORDER BY date DESC, id DESC', employeeId),
    );
  },
  totalRemainingByEmployee(employeeId: number): Promise<number> {
    return getDatabase().then(async (db) => {
      const row = await db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(remaining_amount) AS total FROM kasbon
         WHERE employee_id = ? AND status IN ('UNPAID', 'PARTIAL')`,
        employeeId,
      );
      return round2(row?.total ?? 0);
    });
  },
  create(employeeId: number, date: string, amount: number, notes: string | null): Promise<number> {
    return getDatabase().then(async (db) => {
      const r = await db.runAsync(
        `INSERT INTO kasbon (employee_id, date, total_amount, remaining_amount, status, notes)
         VALUES (?, ?, ?, ?, 'UNPAID', ?)`,
        employeeId,
        date,
        round2(amount),
        round2(amount),
        notes,
      );
      return r.lastInsertRowId;
    });
  },
};
