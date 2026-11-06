import { getDatabase } from '@/database/db';
import type { Transaction, TxType } from '@/types';
import { round2 } from '@/config/constants';

export interface LedgerRow extends Transaction {
  category_name: string;
  employee_name: string | null;
}

export interface LedgerInput {
  transactionDate: string;
  type: TxType;
  categoryId: number;
  amount: number;
  description: string | null;
  employeeId: number | null;
}

export const ledgerRepo = {
  list(limit = 100, offset = 0): Promise<LedgerRow[]> {
    return getDatabase().then((db) =>
      db.getAllAsync<LedgerRow>(
        `SELECT t.*, c.name AS category_name, e.name AS employee_name
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         LEFT JOIN employees e ON e.id = t.employee_id
         ORDER BY t.transaction_date DESC, t.id DESC
         LIMIT ? OFFSET ?`,
        limit,
        offset,
      ),
    );
  },
  create(input: LedgerInput): Promise<number> {
    return getDatabase().then(async (db) => {
      const r = await db.runAsync(
        `INSERT INTO transactions (transaction_date, type, category_id, amount, description, employee_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        input.transactionDate,
        input.type,
        input.categoryId,
        round2(input.amount),
        input.description,
        input.employeeId,
      );
      return r.lastInsertRowId;
    });
  },
  remove(id: number): Promise<void> {
    return getDatabase()
      .then((db) => db.runAsync('DELETE FROM transactions WHERE id = ?', id))
      .then(() => undefined);
  },
  toBalance(from: string, to: string): Promise<number> {
    return getDatabase().then(async (db) => {
      const row = await db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(CASE WHEN type = 'INCOME' THEN amount ELSE -amount END) AS total
         FROM transactions WHERE transaction_date BETWEEN ? AND ?`,
        from,
        to,
      );
      return round2(row?.total ?? 0);
    });
  },
  summary(from: string, to: string): Promise<{ income: number; expense: number }> {
    return getDatabase().then(async (db) => {
      const row = await db.getFirstAsync<{ income: number | null; expense: number | null }>(
        `SELECT
           SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) AS expense
         FROM transactions WHERE transaction_date BETWEEN ? AND ?`,
        from,
        to,
      );
      return { income: round2(row?.income ?? 0), expense: round2(row?.expense ?? 0) };
    });
  },
  byCategory(from: string, to: string): Promise<{ category_name: string; type: TxType; total: number }[]> {
    return getDatabase().then((db) =>
      db.getAllAsync(
        `SELECT c.name AS category_name, c.type AS type, SUM(t.amount) AS total
         FROM transactions t JOIN categories c ON c.id = t.category_id
         WHERE t.transaction_date BETWEEN ? AND ?
         GROUP BY c.id ORDER BY total DESC`,
        from,
        to,
      ),
    );
  },
};
