/**
 * Regole condivise tra formati torneo: quando è consentito mutare le coppie
 * e cosa fare dopo cambiamenti che impattano le classifiche.
 */
import {
  getTournamentById,
  getTournamentRankings,
  recalculateCumulativeRankings,
} from '@/lib/db/queries';

/** Messaggio errore in italiano, o null se la modifica coppie è consentita. */
export function getPairEditBlockReason(tournamentId: string): string | null {
  const t = getTournamentById(tournamentId);
  if (!t) return 'Torneo non trovato';
  if (t.status === 'completed') {
    return 'Torneo completato: non è possibile modificare le coppie. Riapri il torneo dall’admin.';
  }
  if (t.overall_applied_at) {
    return 'Classifica già consolidata (overall applicato). Riapri il torneo per modificare le coppie.';
  }
  return null;
}

/** Dopo estrazione / modifica coppie che ha già invalidato o aggiornato i ranking torneo. */
export function afterPairsOrExtractMutation(): void {
  recalculateCumulativeRankings();
}

/** True se esiste una classifica salvata per il torneo (ATP cumulativa potrebbe includerlo). */
export function tournamentHasSavedRankings(tournamentId: string): boolean {
  return getTournamentRankings(tournamentId).length > 0;
}
