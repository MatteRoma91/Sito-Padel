# Infrastructure — DB repos

Split behavior-preserving da `lib/db/queries.ts` (pattern JetHealth JH-2).

- Implementazione: `repos/*.ts` (users, tournaments, matches, …)
- Import pubblico invariato: `@/lib/db/queries` (facade re-export)

Non cambiare lo schema SQL né le firme delle funzioni in questa fase.
