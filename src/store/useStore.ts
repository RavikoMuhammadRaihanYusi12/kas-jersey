import { create } from 'zustand';
import { getDatabase, seedMissingCategories } from '@/database/db';
import { categoryRepo } from '@/repositories/categoryRepo';
import { employeeRepo } from '@/repositories/employeeRepo';
import { jobModelRepo } from '@/repositories/jobModelRepo';
import { kasbonRepo } from '@/repositories/kasbonRepo';
import { ledgerRepo, type LedgerRow } from '@/repositories/ledgerRepo';
import { todayISO } from '@/config/constants';
import type { Category, Employee, JobModel } from '@/types';

interface State {
  ready: boolean;
  categories: Category[];
  employees: Employee[];
  jobModels: JobModel[];
  recentLedger: LedgerRow[];
  init: () => Promise<void>;
  reloadLedger: () => Promise<void>;
  reloadEmployees: () => Promise<void>;
  reloadJobModels: () => Promise<void>;
  reloadCategories: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  categories: [],
  employees: [],
  jobModels: [],
  recentLedger: [],

  async init() {
    const db = await getDatabase();
    await seedMissingCategories(db);
    await Promise.all([
      get().reloadCategories(),
      get().reloadEmployees(),
      get().reloadJobModels(),
      get().reloadLedger(),
    ]);
    set({ ready: true });
  },

  async reloadCategories() {
    set({ categories: await categoryRepo.all() });
  },
  async reloadEmployees() {
    set({ employees: await employeeRepo.all() });
  },
  async reloadJobModels() {
    set({ jobModels: await jobModelRepo.all() });
  },
  async reloadLedger() {
    set({ recentLedger: await ledgerRepo.list(50, 0) });
  },
}));

export async function dashboardStats() {
  const to = todayISO();
  const from = to.slice(0, 8) + '01'; // first day of current month
  const [summary, balance, topCategories, kasbon] = await Promise.all([
    ledgerRepo.summary(from, to),
    ledgerRepo.toBalance('0000-01-01', to),
    ledgerRepo.byCategory(from, to),
    kasbonRepo.all(),
  ]);
  const outstandingKasbon = kasbon
    .filter((k) => k.status !== 'PAID')
    .reduce((acc, k) => acc + k.remaining_amount, 0);
  return { summary, balance, topCategories, outstandingKasbon };
}
