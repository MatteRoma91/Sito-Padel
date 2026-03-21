import type { Pair } from '@/lib/types';

export interface PairUpdateInput {
  pair_id: string;
  player1_id: string;
  player2_id: string;
}

export interface PairUpdateValidationResult {
  ok: boolean;
  code?: string;
  error?: string;
  normalizedUpdates: PairUpdateInput[];
}

interface ValidatePairUpdatesArgs {
  existingPairs: Pair[];
  updates: PairUpdateInput[];
  participatingUserIds: string[];
  decidedPairIds: Set<string>;
  acknowledgePlayedMatches: boolean;
}

export function validatePairUpdates({
  existingPairs,
  updates,
  participatingUserIds,
  decidedPairIds,
  acknowledgePlayedMatches,
}: ValidatePairUpdatesArgs): PairUpdateValidationResult {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { ok: false, code: 'INVALID_PAYLOAD', error: 'Nessuna modifica coppie fornita', normalizedUpdates: [] };
  }

  const existingById = new Map(existingPairs.map((pair) => [pair.id, pair]));
  const seenPairIds = new Set<string>();
  const normalizedUpdates: PairUpdateInput[] = [];

  for (const update of updates) {
    if (!update?.pair_id || !update?.player1_id || !update?.player2_id) {
      return { ok: false, code: 'INVALID_UPDATE', error: 'Ogni modifica deve includere pair_id, player1_id e player2_id', normalizedUpdates: [] };
    }
    if (seenPairIds.has(update.pair_id)) {
      return { ok: false, code: 'DUPLICATE_PAIR_UPDATE', error: 'La stessa coppia non puo essere modificata due volte nella stessa richiesta', normalizedUpdates: [] };
    }
    seenPairIds.add(update.pair_id);

    if (!existingById.has(update.pair_id)) {
      return { ok: false, code: 'PAIR_NOT_FOUND', error: 'Una delle coppie selezionate non appartiene al torneo', normalizedUpdates: [] };
    }

    if (update.player1_id === update.player2_id) {
      return { ok: false, code: 'SAME_PLAYER', error: 'I due giocatori della coppia devono essere diversi', normalizedUpdates: [] };
    }

    normalizedUpdates.push({
      pair_id: update.pair_id,
      player1_id: update.player1_id,
      player2_id: update.player2_id,
    });
  }

  const finalById = new Map(existingById);
  let changedLockedPair = false;

  for (const update of normalizedUpdates) {
    const current = existingById.get(update.pair_id)!;
    const changed = current.player1_id !== update.player1_id || current.player2_id !== update.player2_id;
    if (changed && decidedPairIds.has(update.pair_id)) {
      changedLockedPair = true;
    }
    finalById.set(update.pair_id, {
      ...current,
      player1_id: update.player1_id,
      player2_id: update.player2_id,
    });
  }

  if (changedLockedPair && !acknowledgePlayedMatches) {
    return {
      ok: false,
      code: 'NEED_ACK_PLAYED_MATCHES',
      error: 'Alcune coppie hanno gia match completati. Conferma per applicare comunque la modifica.',
      normalizedUpdates,
    };
  }

  const participatingSet = new Set(participatingUserIds);
  const playersUsed = new Set<string>();
  for (const pair of finalById.values()) {
    if (!participatingSet.has(pair.player1_id) || !participatingSet.has(pair.player2_id)) {
      return { ok: false, code: 'PLAYER_NOT_PARTICIPATING', error: 'Tutti i giocatori delle coppie devono essere partecipanti attivi', normalizedUpdates: [] };
    }
    if (playersUsed.has(pair.player1_id) || playersUsed.has(pair.player2_id)) {
      return { ok: false, code: 'PLAYER_DUPLICATED', error: 'Un giocatore non puo comparire in piu coppie', normalizedUpdates: [] };
    }
    playersUsed.add(pair.player1_id);
    playersUsed.add(pair.player2_id);
  }

  return { ok: true, normalizedUpdates };
}
