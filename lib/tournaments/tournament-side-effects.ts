/**
 * Regole condivise tra formati torneo: quando è consentito mutare le coppie
 * e cosa fare dopo cambiamenti che impattano le classifiche.
 */
import {
  getTournamentById,
  getTournamentRankings,
  getPairs,
  getMatches,
  reopenTournament,
  revertTournamentResultFromOverall,
  deleteMatches,
  deletePairs,
  deleteTournamentRankings,
  deleteMvpDataForTournament,
  recalculateCumulativeRankings,
  clearSaliscendiFinalFlags,
} from '@/lib/db/queries';
import { getTournamentFormat } from '@/lib/types';

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

/**
 * Sblocca mutazioni coppie/tabellone per admin: riapertura torneo completato o revert overall.
 * Non cancella coppie/partite (a differenza del reset roster).
 */
export function unlockTournamentForAdminPairMutations(tournamentId: string): void {
  const t = getTournamentById(tournamentId);
  if (!t) return;
  if (t.status === 'completed') {
    reopenTournament(tournamentId);
    return;
  }
  if (t.overall_applied_at) {
    revertTournamentResultFromOverall(tournamentId);
  }
}

export interface AdminRosterPrepareResult {
  didReopen: boolean;
  didResetBracket: boolean;
}

/**
 * Prepara il torneo perché l’admin possa mutare il roster: riapertura/revert se necessario,
 * poi rimozione di tabellone, coppie e classifica torneo se ancora presenti.
 */
export function prepareTournamentForAdminRosterOrBracketChange(
  tournamentId: string
): AdminRosterPrepareResult {
  let didReopen = false;
  let didResetBracket = false;
  const t0 = getTournamentById(tournamentId);
  if (!t0) return { didReopen, didResetBracket };

  if (t0.status === 'completed') {
    reopenTournament(tournamentId);
    didReopen = true;
  } else if (t0.overall_applied_at) {
    revertTournamentResultFromOverall(tournamentId);
  }

  if (getPairs(tournamentId).length > 0 || getMatches(tournamentId).length > 0) {
    deleteMatches(tournamentId);
    deletePairs(tournamentId);
    deleteTournamentRankings(tournamentId);
    const t1 = getTournamentById(tournamentId);
    if (t1 && getTournamentFormat(t1) === 'saliscendi_12') {
      clearSaliscendiFinalFlags(tournamentId);
    }
    deleteMvpDataForTournament(tournamentId);
    didResetBracket = true;
    recalculateCumulativeRankings();
  }

  return { didReopen, didResetBracket };
}

/** Dopo estrazione / modifica coppie che ha già invalidato o aggiornato i ranking torneo. */
export function afterPairsOrExtractMutation(): void {
  recalculateCumulativeRankings();
}

/** True se esiste una classifica salvata per il torneo (ATP cumulativa potrebbe includerlo). */
export function tournamentHasSavedRankings(tournamentId: string): boolean {
  return getTournamentRankings(tournamentId).length > 0;
}
