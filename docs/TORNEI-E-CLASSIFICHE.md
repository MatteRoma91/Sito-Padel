# Tornei e classifiche (operativo)

Documentazione tecnica per amministratori e sviluppo. Il regolamento testuale per i giocatori è in-app (`/regolamento`) e modificabile da **Impostazioni → Testi**.

## Formati torneo

| Giocatori | Formato effettivo | Note |
|-----------|-------------------|------|
| 16 | Tabellone eliminatorio (+ consolazione se prevista) | `format` null o tabellone classico |
| 8 | Girone all'italiana | Categoria BroccoChallenger 500 |
| 12 | Saliscendi (6 coppie, 3 campi logici Oro/Argento/Bronzo) | `format = saliscendi_12` |

## Flusso: consolidamento, ATP, overall

1. **Classifica torneo** (`tournament_rankings`): creata quando l'admin esegue consolidamento (`POST .../rankings/calculate`).
2. **ATP cumulativa** (`cumulative_rankings`): ricalcolata come somma dei punti `tournament_rankings` (`recalculateCumulativeRankings()`).
3. **Overall** (`users.overall_score`): applicato una sola volta per torneo con `tournaments.overall_applied_at`. Funzioni: `applyTournamentResultToOverall`, `revertTournamentResultFromOverall`.

La route di consolidamento usa una **transazione SQLite `BEGIN IMMEDIATE`** per ridurre race tra richieste concorrenti.

## Riapertura ed eliminazione torneo

- **`reopenTournament`**: annulla overall se applicato, elimina `tournament_rankings`, pulisce MVP (`mvp_votes`, `tournament_mvp`), resetta `is_final_round` sui match Saliscendi, imposta `in_progress`, poi **ricalcola l'ATP cumulativa**.
- **`deleteTournament`**: annulla overall, elimina il torneo (CASCADE), poi **ricalcola l'ATP cumulativa**.

## Coppie ed estrazione

- Modifiche a coppie / estrazione con torneo **completato** o con **overall già applicato** sono bloccate (`409`) finché il torneo non viene riaperto.
- **Estrazione coppie** con `overall_applied_at`: `revertTournamentResultFromOverall` prima del wipe, poi `recalculateCumulativeRankings()`.
- **Estrazione automatica** (`POST /api/tournaments/[id]/pairs/extract`): algoritmo **forte+debole** (stesso ordinamento per overall/skill e punti cumulativi) con **matching completo** sui giocatori “forti” vs “deboli”.
  - **Vincolo rigido**: non si può ripetere la stessa coppia (stessi due `user_id` in `pairs`) del **torneo passato immediatamente precedente** rispetto alla data del torneo in estrazione (`ORDER BY date DESC, id DESC` tra i tornei con `date` strettamente minore). Se nessuna permutazione lo rispetta, l’API risponde **400** con messaggio esplicito (nessuna coppia scritta a DB).
  - **Preferenza soft**: tra le soluzioni valide si minimizzano le coppie già viste insieme nei tornei in posizione cronologica **2ª–5ª** (sempre tra i passati rispetto alla data corrente). Implementazione: `lib/pairs.ts`, dati: `getImmediatePreviousTournamentPartnerPairs`, `getOlderRecentPartnerPairs` in `lib/db/queries.ts`.

## Partecipanti

- **Self-enroll**: il giocatore può iscriversi solo con torneo `open` e senza coppie/partite.
- Con coppie o partite presenti, le modifiche ai partecipanti sono bloccate.
- **Admin (gestione roster)**: in bozza si possono aggiungere più giocatori in un colpo solo: selezione multipla nell’elenco disponibili e conferma con un batch di `POST` verso `/api/tournaments/[id]/participants` (`participating: true`), un solo `router.refresh()` a fine batch; il pannello “Aggiungi” non si chiude dopo ogni invio (componente `ParticipantsManager`).

## Push e cron

- Push torneo: solo `tournament_participants` con `participating = 1`.
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (vedi `.env.example`).

## Ricalcolo globale

- **Impostazioni → Ricalcola**: `POST /api/rankings/recalculate-all` per interventi straordinari.
