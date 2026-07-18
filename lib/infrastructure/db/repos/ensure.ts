import { getDb } from '@/lib/db/db';
import { initSchema } from '@/lib/db/schema';
import { seed } from '@/lib/db/seed';
let initialized = false;

export function ensureDb() {
  if (!initialized) {
    initSchema();
    seed();
    initialized = true;
  }
}
