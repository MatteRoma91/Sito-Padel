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

## Partecipanti

- **Self-enroll**: il giocatore può iscriversi solo con torneo `open` e senza coppie/partite.
- Con coppie o partite presenti, le modifiche ai partecipanti sono bloccate.

## Push e cron

- Push torneo: solo `tournament_participants` con `participating = 1`.
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (vedi `.env.example`).

## Ricalcolo globale

- **Impostazioni → Ricalcola**: `POST /api/rankings/recalculate-all` per interventi straordinari.
