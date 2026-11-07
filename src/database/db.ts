import * as SQLite from 'expo-sqlite';
import { DB_NAME, DATABASE_VERSION, DEFAULT_CATEGORIES, DEFAULT_JOB_MODELS } from '@/config/constants';

export type Database = SQLite.SQLiteDatabase;

let handle: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!handle) handle = open();
  return handle;
}

async function open(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrate(db);
  return db;
}

async function migrate(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    is_system_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'PENJAHIT',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL,
    default_rate REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kasbon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATETIME NOT NULL,
    total_amount REAL NOT NULL,
    remaining_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date DATETIME NOT NULL,
    type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    employee_id INTEGER NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payroll_piece_rate_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    model_description TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK(qty > 0),
    rate_per_pcs REAL NOT NULL CHECK(rate_per_pcs >= 0),
    subtotal REAL NOT NULL,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kasbon_settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kasbon_id INTEGER NOT NULL,
    transaction_id INTEGER NOT NULL,
    amount_deducted REAL NOT NULL CHECK(amount_deducted > 0),
    date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(kasbon_id) REFERENCES kasbon(id) ON DELETE RESTRICT,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_kasbon_employee ON kasbon(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payroll_details_tx ON payroll_piece_rate_details(transaction_id);
CREATE INDEX IF NOT EXISTS idx_settlements_tx ON kasbon_settlements(transaction_id);
`);
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/**
 * Ensure every default category exists, without touching existing rows.
 * Idempotent: safe to run on every app start, recovers from partial/empty seeds,
 * and never duplicates or deletes user data.
 */
export async function seedMissingCategories(db: Database): Promise<void> {
  // ponytail: rename legacy category label; idempotent, no version bump needed.
  await db.runAsync(`UPDATE categories SET name = 'Saldo' WHERE name = 'Modal Masuk'`);
  for (const c of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (name, type, is_system_default)
       SELECT ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = ?)`,
      c.name,
      c.type,
      c.name,
    );
  }
  seedJobModelsIfEmpty(db);
}

async function seedJobModelsIfEmpty(db: Database): Promise<void> {
  const jm = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM job_models');
  if ((jm?.c ?? 0) !== 0) return;
  for (const m of DEFAULT_JOB_MODELS) {
    await db.runAsync('INSERT INTO job_models (model_name, default_rate) VALUES (?, ?)', m.model_name, m.default_rate);
  }
}

/** Test-only: reset the cached connection. */
export function _resetDatabaseHandle(): void {
  handle = null;
}
