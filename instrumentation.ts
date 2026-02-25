/**
 * Eseguito all'avvio del server Next.js (next dev / next start).
 * Pre-riscalda il DB per evitare cold start sulla prima richiesta.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { ensureDb } = await import('./lib/db/queries');
      ensureDb();
    } catch {
      // Ignora: DB potrebbe non essere accessibile in build/edge
    }
  }
}
