import { getDatabase } from '@/database/db';
import type { Category } from '@/types';

export const categoryRepo = {
  all(): Promise<Category[]> {
    return getDatabase().then((db) => db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type, name'));
  },
  byType(type: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
    return getDatabase().then((db) =>
      db.getAllAsync<Category>('SELECT * FROM categories WHERE type = ? ORDER BY name', type),
    );
  },
  findByName(name: string): Promise<Category | null> {
    return getDatabase().then((db) =>
      db.getFirstAsync<Category>('SELECT * FROM categories WHERE name = ? LIMIT 1', name),
    );
  },
};
