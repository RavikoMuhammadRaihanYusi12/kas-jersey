import { getDatabase } from '@/database/db';
import type { JobModel } from '@/types';

export const jobModelRepo = {
  all(): Promise<JobModel[]> {
    return getDatabase().then((db) => db.getAllAsync<JobModel>('SELECT * FROM job_models ORDER BY model_name'));
  },
  create(modelName: string, defaultRate: number): Promise<number> {
    return getDatabase().then(async (db) => {
      const r = await db.runAsync(
        'INSERT INTO job_models (model_name, default_rate) VALUES (?, ?)',
        modelName,
        defaultRate,
      );
      return r.lastInsertRowId;
    });
  },
  remove(id: number): Promise<void> {
    return getDatabase()
      .then((db) => db.runAsync('DELETE FROM job_models WHERE id = ?', id))
      .then(() => undefined);
  },
};
