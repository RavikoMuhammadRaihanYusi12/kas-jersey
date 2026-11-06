import { getDatabase } from '@/database/db';
import type { Employee } from '@/types';

export const employeeRepo = {
  all(activeOnly = true): Promise<Employee[]> {
    const sql = activeOnly
      ? 'SELECT * FROM employees WHERE is_active = 1 ORDER BY name'
      : 'SELECT * FROM employees ORDER BY name';
    return getDatabase().then((db) => db.getAllAsync<Employee>(sql));
  },
  get(id: number): Promise<Employee | null> {
    return getDatabase().then((db) => db.getFirstAsync<Employee>('SELECT * FROM employees WHERE id = ?', id));
  },
  create(name: string, phone: string | null, role: string): Promise<number> {
    return getDatabase().then(async (db) => {
      const r = await db.runAsync(
        'INSERT INTO employees (name, phone, role) VALUES (?, ?, ?)',
        name,
        phone,
        role,
      );
      return r.lastInsertRowId;
    });
  },
  update(id: number, name: string, phone: string | null, role: string): Promise<void> {
    return getDatabase()
      .then((db) => db.runAsync('UPDATE employees SET name = ?, phone = ?, role = ? WHERE id = ?', name, phone, role, id))
      .then(() => undefined);
  },
  setActive(id: number, isActive: boolean): Promise<void> {
    return getDatabase()
      .then((db) => db.runAsync('UPDATE employees SET is_active = ? WHERE id = ?', isActive ? 1 : 0, id))
      .then(() => undefined);
  },
};
