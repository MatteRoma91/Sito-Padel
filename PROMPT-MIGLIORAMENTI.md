# Prompt per l'agente: Miglioramenti webapp Banana Padel Tour

Sei un senior full-stack developer. Devi apportare le seguenti 8 modifiche alla webapp Next.js 15 "Banana Padel Tour" (gestione tornei di padel). Il progetto usa App Router, TypeScript strict, Tailwind CSS, SQLite (better-sqlite3), Socket.io, iron-session. Leggi attentamente ogni punto, i file coinvolti e le istruzioni specifiche.

---

## 1. Validazione Zod su tutte le API mutation non ancora validate

### Problema
Alcune API route accettano JSON raw senza passare per gli schema Zod già definiti in `lib/validations.ts`. Questo crea inconsistenza e rischio di dati invalidi.

### File da modificare

#### `app/api/users/[id]/route.ts` — funzione `PATCH`
- Attualmente a riga 51 fa `const data = await request.json()` e poi destructuring diretto senza validazione.
- Lo schema `updateUserSchema` esiste già in `lib/validations.ts` (righe 20-32) ed è perfettamente allineato ai campi usati dalla route.
- **Azione**: importa `parseOrThrow` e `updateUserSchema` da `@/lib/validations`, wrappa `await request.json()` con `parseOrThrow(updateUserSchema, data)` prima del destructuring. Gestisci il `ValidationError` nel catch restituendo status 400 (come già fanno le altre route, es. `app/api/auth/login/route.ts` righe 31-36).
- **Attenzione**: `updateUserSchema` ha `.strict()`, quindi campi extra verranno rifiutati — questo è il comportamento desiderato. Il campo `is_hidden` nello schema è `z.boolean().optional()`, ma nel codice viene convertito a `0 | 1` per SQLite (riga 96: `updates.is_hidden = is_hidden ? 1 : 0`). Questa conversione deve restare DOPO la validazione Zod, non prima.

#### `app/api/tournaments/[id]/matches/[matchId]/result/route.ts` — funzione `POST`
- Attualmente a riga 21 fa `const { score_pair1, score_pair2 } = await request.json()` e poi validazione manuale (righe 35-41).
- Lo schema `matchResultSchema` esiste già in `lib/validations.ts` (righe 62-66) con campi `score_pair1`, `score_pair2` e `winner_pair_id`.
- **Azione**: importa `parseOrThrow` e `matchResultSchema` da `@/lib/validations`. **Tuttavia**, questa route calcola `winner_pair_id` automaticamente (riga 44: `const winnerId = score_pair1 > score_pair2 ? match.pair1_id : match.pair2_id`), quindi `matchResultSchema` non va bene così com'è perché richiede `winner_pair_id` nel body.
- **Soluzione**: crea un nuovo schema `matchScoreSchema` in `lib/validations.ts` con solo `score_pair1` e `score_pair2` (numeri interi >= 0, max 99) e aggiungi un `.refine()` che verifica `score_pair1 !== score_pair2`. Usa questo nuovo schema nella route. Rimuovi la validazione manuale delle righe 35-41.
- Gestisci il `ValidationError` nel catch con status 400.

---

## 2. Aggiungere `error.tsx` e `loading.tsx`

### Problema
Non esistono error boundary né loading skeleton in nessuna route. Un errore in un Server Component causa un crash non gestito. Il caricamento delle pagine non mostra feedback visivo.

### File da creare

#### `app/(dashboard)/error.tsx`
- Deve essere un Client Component (`'use client'`).
- Riceve `{ error, reset }` come props (interfaccia standard Next.js).
- Mostra un messaggio user-friendly in italiano ("Si è verificato un errore"), un bottone "Riprova" che chiama `reset()`, e un link per tornare alla home `/`.
- Stile coerente con il design system esistente: usa le classi `.card`, `.btn`, `.btn-primary` definite in `app/globals.css`.
- Logga `error.message` in `console.error`.

#### `app/(dashboard)/loading.tsx`
- Mostra un loading skeleton generico: un contenitore `.card` con elementi animati (usa `animate-pulse` di Tailwind).
- Mostra almeno 3 blocchi rettangolari che simulano il caricamento di titolo + contenuto.
- Stile coerente con il resto dell'app (dark mode supportato).

#### `app/(auth)/error.tsx`
- Simile a quello del dashboard, ma più minimale (è la pagina di login). Messaggio di errore e bottone "Riprova".

#### `app/(auth)/loading.tsx`
- Loading minimale centrato nella pagina, coerente con il layout auth.

---

## 3. Sostituire `alert()` e `confirm()` nativi con componenti UI custom

### Problema
L'app usa `alert()` in 16+ punti e `confirm()` in 8+ punti. Questi dialog nativi rompono l'esperienza utente, non sono personalizzabili e hanno stile diverso su ogni browser/OS.

### Azione

#### Creare un componente `ConfirmDialog`
- File: `components/ui/ConfirmDialog.tsx`
- Client Component.
- Props: `{ open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'default'; onConfirm: () => void; onCancel: () => void }`
- Renderizza un overlay modale con backdrop semi-trasparente, card centrata con titolo, messaggio, e due bottoni (Annulla + Conferma).
- Il bottone "Conferma" usa `.btn-danger` se `variant === 'danger'`, altrimenti `.btn-primary`.
- Chiudi con click su backdrop o bottone Annulla.
- Supporta `Escape` per chiudere.
- Usa Tailwind per gli stili, coerente con dark mode.

#### Creare un componente `Toast` / notifiche
- File: `components/ui/Toast.tsx`
- Client Component con un context provider (`ToastProvider`) e un hook `useToast()`.
- Il provider mantiene un array di toast attivi nello state.
- `useToast()` espone `showToast(message: string, type?: 'success' | 'error' | 'info')`.
- I toast appaiono in basso a destra, si auto-chiudono dopo 4 secondi, con animazione fade-in/fade-out.
- Stili: verde per success, rosso per error, blu per info. Dark mode supportato.

#### Wrappare l'app con `ToastProvider`
- In `app/(dashboard)/layout.tsx`, wrappa `{children}` con `<ToastProvider>`.

#### Sostituire tutti i `confirm()` con `ConfirmDialog`
Ogni componente che usa `confirm()` deve essere refactorato:

1. **`components/chat/ChatWindow.tsx`** riga 109 — `confirm('Eliminare definitivamente...')` → usa state `showDeleteConfirm` + `ConfirmDialog` con `variant="danger"`.
2. **`components/profiles/EditProfileForm.tsx`** riga 91 — `confirm('Vuoi rimuovere la foto profilo?')` → `ConfirmDialog`.
3. **`components/tournaments/PairsManager.tsx`** riga 115 — `confirm('Vuoi eliminare questa coppia?')` → `ConfirmDialog` con `variant="danger"`.
4. **`components/tournaments/ReopenTournamentButton.tsx`** riga 17 — `confirm(...)` → `ConfirmDialog`.
5. **`components/tournaments/ConsolidateResultsButton.tsx`** riga 17 — `confirm(...)` → `ConfirmDialog`.
6. **`components/tournaments/ReopenMvpVotingButton.tsx`** riga 18 — `confirm(...)` → `ConfirmDialog`.
7. **`components/settings/UsersTab.tsx`** riga 53 — `confirm(...)` → `ConfirmDialog` con `variant="danger"`.
8. **`components/settings/ColorsTab.tsx`** riga 89 — `confirm(...)` → `ConfirmDialog`.
9. **`app/(dashboard)/stats/recalculate-rankings/RecalculateRankingsClient.tsx`** riga 14 — `confirm(...)` → `ConfirmDialog`.
10. **`components/settings/RicalcolaTab.tsx`** riga 18 — `confirm(...)` → `ConfirmDialog`.

#### Sostituire tutti i `alert()` con `useToast()`
Ogni componente che usa `alert()` deve essere refactorato:

1. **`components/bracket/BracketView.tsx`** righe 76, 133, 137, 147, 175, 185 — sostituisci tutti gli `alert(...)` con `showToast(messaggio, 'error')`.
2. **`components/chat/ConversationList.tsx`** righe 69, 74, 92, 110, 122, 128, 143 — sostituisci con `showToast(messaggio, 'error')`.
3. **`components/profiles/DeleteUserButton.tsx`** righe 30, 33 — sostituisci con `showToast(messaggio, 'error')`.
4. **`components/tournaments/ExportPdfButton.tsx`** riga 174 — sostituisci con `showToast(messaggio, 'error')`.
5. **`components/settings/StrumentiTab.tsx`** righe 17, 31, 43, 57 — sostituisci con `showToast(messaggio, 'error')`.

**Nota**: `BracketView.tsx` non è wrappato in un layout che ha `ToastProvider`. Assicurati che il `ToastProvider` sia accessibile dal punto in cui `BracketView` viene renderizzato (è dentro il dashboard layout).

---

## 4. Fix socket lifecycle — prevenire leak di connessioni

### Problema
`hooks/useLiveMatchScores.ts` e `components/chat/ChatWindow.tsx` creano nuove connessioni Socket.io ad ogni cambio di ID (torneo o conversazione). La cleanup function potrebbe non disconnettere la socket precedente se `import('socket.io-client')` è ancora in-flight.

### File da modificare

#### `hooks/useLiveMatchScores.ts`
- **Problema specifico**: la `import('socket.io-client')` è asincrona. Se `tournamentId` cambia prima che la promise si risolva, la cleanup function trova `socketRef.current` ancora `null` e la socket orfana non viene mai disconnessa.
- **Soluzione**: usa un flag `cancelled` (come pattern già usato in `ChatWindow.tsx` riga 40). Dentro la `.then()`, controlla `if (cancelled) { socket.disconnect(); return; }` prima di assegnare a `socketRef.current`. Nella cleanup, setta `cancelled = true` oltre a disconnettere `socketRef.current`.

#### `components/chat/ChatWindow.tsx`
- **Problema specifico**: stessa race condition del punto sopra (riga 70-92). Inoltre, nella cleanup (riga 94-100) manca la chiamata a `s.disconnect()` — viene fatto solo `s.emit('chat:leave', ...)` ma la socket resta aperta.
- **Soluzione**: aggiungi un flag `cancelled` come sopra. Nella cleanup, chiama `s.disconnect?.()` dopo `s.emit('chat:leave', ...)`.

---

## 5. Variabili CSS per colori hardcoded

### Problema
Ci sono ~15 file `.tsx` che usano colori hardcoded come `dark:bg-[#162079]/50`, `dark:bg-[#0c1451]/80`, `dark:border-[#6270F3]/50` invece di usare le variabili CSS del tema. Questo rende impossibile il theming dinamico (che l'app supporta via `buildConfigCss` in `app/layout.tsx`).

### Azione

#### Aggiungere variabili CSS in `app/globals.css`
Nella sezione `:root` (riga 5), aggiungi:
```css
--surface-primary: #162079;
--surface-dark: #0c1451;
--border-accent: #6270F3;
```

#### Aggiornare `tailwind.config.ts`
Aggiungi queste variabili nella sezione `extend.colors` del config Tailwind, in modo da poter usare classi come `bg-surface-primary/50`, `bg-surface-dark/80`, `border-border-accent/50`.

#### Aggiornare `app/globals.css` componenti
- `.card` (riga 42): `dark:bg-[#0c1451]/80` → `dark:bg-surface-dark/80`, `dark:border-[#6270F3]/50` → `dark:border-border-accent/50`.
- `.input` (riga 44-46): `dark:border-[#6270F3]/50` → `dark:border-border-accent/50`, `dark:bg-[#162079]/50` → `dark:bg-surface-primary/50`.

#### Aggiornare `buildConfigCss` in `app/layout.tsx`
Estendi la funzione `buildConfigCss` (riga 35) per generare anche le nuove variabili CSS (`--surface-primary`, `--surface-dark`, `--border-accent`) basandosi sui colori primary del config. Ad esempio, `--surface-primary` dovrebbe derivare da `color_primary_800` e `--surface-dark` da `color_primary_900`.

#### Sostituire i colori hardcoded nei componenti
Cerca tutti i file che usano `#162079`, `#0c1451`, `#6270F3` e sostituisci con le classi Tailwind corrispondenti alle nuove variabili. I file coinvolti sono:
- `components/profiles/ProfileCharts.tsx`
- `app/(dashboard)/profiles/page.tsx`
- `app/(dashboard)/profiles/[id]/page.tsx`
- `app/(dashboard)/tournaments/page.tsx`
- `app/(dashboard)/tournaments/[id]/page.tsx`
- `components/tournaments/PairsManager.tsx`
- `components/tournaments/TournamentRankingView.tsx`
- `app/(dashboard)/stats/reset-password/ResetPasswordClient.tsx`
- `components/home/HomeCalendar.tsx`
- `app/(dashboard)/calendar/page.tsx`
- `app/(dashboard)/page.tsx`
- `components/settings/GalleriaTab.tsx`
- `components/settings/AccessiTab.tsx`
- `components/rankings/UnifiedRankingsCard.tsx`

---

## 6. Migliorare la sicurezza del session secret

### Problema
`lib/auth.ts` (riga 19) e `server.js` (riga 12) hanno un fallback hardcoded per `SESSION_SECRET`. In produzione questo è un rischio.

### Azione

#### `lib/auth.ts`
- Modifica riga 19: se `process.env.NODE_ENV === 'production'` e `process.env.SESSION_SECRET` non è definito, lancia un errore esplicito (`throw new Error('SESSION_SECRET è obbligatorio in produzione')`).
- In development, mantieni il fallback attuale.

#### `server.js`
- Stessa logica a riga 12: in produzione, se `SESSION_SECRET` non è definito, logga un errore e termina il processo (`process.exit(1)`).
- In development, mantieni il fallback.

---

## 7. Migliorare la gestione errori nelle fetch della chat

### Problema
In `components/chat/ChatWindow.tsx`, le fetch che falliscono vengono ignorate silenziosamente (`.catch(() => {})` alle righe 60, 62, 89). L'utente non riceve feedback.

### Azione
- Le fetch per `read` (righe 56, 85) possono restare silenziose (il fallimento del mark-as-read non è critico).
- La fetch dei messaggi (riga 51-62): in caso di errore, mostra un messaggio nello state (es. `setMessages([])` + un messaggio di errore visibile nel componente tipo "Impossibile caricare i messaggi").
- La fetch dei dettagli conversazione (riga 42-49): in caso di errore, imposta un titolo fallback.

---

## 8. Aggiungere `aria-label` mancanti agli elementi interattivi

### Problema
Molti bottoni, specialmente in `BracketView.tsx`, `ConversationList.tsx`, e nei form, mancano di `aria-label`, rendendo l'app meno accessibile per screen reader.

### File da modificare

#### `components/bracket/BracketView.tsx`
- Bottone "Genera Tabellone" (riga ~203): aggiungi `aria-label="Genera tabellone"`.
- Bottone "Rigenera Tabellone/Calendario" (riga ~457, ~549): aggiungi `aria-label="Rigenera tabellone"`.
- Bottone "Modifica Coppie" (riga ~537): aggiungi `aria-label="Modifica coppie quarti di finale"`.
- Bottone "Salva Tutto" (riga ~569): aggiungi `aria-label="Salva assegnazione coppie"`.
- Bottone "Annulla" editing (riga ~577): aggiungi `aria-label="Annulla modifica coppie"`.
- Bottone "Salva" risultato (riga ~336): aggiungi `aria-label="Salva risultato match"`.
- Bottone "Annulla" risultato (riga ~343): aggiungi `aria-label="Annulla inserimento risultato"`.
- Bottone "Inserisci/Modifica risultato" (riga ~350): aggiungi `aria-label` dinamico basato su `isComplete`.
- Input punteggio pair1 e pair2 (righe ~298, ~318): aggiungi `aria-label="Punteggio coppia 1"` e `aria-label="Punteggio coppia 2"`.

#### `components/chat/ConversationList.tsx`
- Eventuali bottoni per avviare nuova chat o selezionare conversazione: aggiungi `aria-label` descrittivi.

#### `components/tournaments/PairsManager.tsx`
- Bottoni per aggiungere/rimuovere coppie: aggiungi `aria-label`.

#### `components/profiles/EditProfileForm.tsx`
- Bottone rimozione avatar: aggiungi `aria-label="Rimuovi foto profilo"`.

---

## Istruzioni generali

1. **Non rompere funzionalità esistenti**: ogni modifica deve essere retrocompatibile.
2. **Mantieni lo stile del codice esistente**: usa lo stesso pattern di import, naming, e formattazione già presente nel progetto.
3. **TypeScript strict**: il progetto ha `"strict": true` nel tsconfig. Non aggiungere `@ts-ignore` o `any`.
4. **Testa la build**: dopo tutte le modifiche, esegui `npm run build` e assicurati che non ci siano errori.
5. **Testa il lint**: esegui `npm run lint` e correggi eventuali warning/errori.
6. **Ordine di esecuzione consigliato**: 1 → 2 → 5 → 6 → 7 → 8 → 4 → 3 (il punto 3 è il più ampio e va fatto per ultimo).
7. **Lingua**: tutti i testi user-facing devono essere in italiano, coerenti con il resto dell'app.
8. **Commit**: fai un commit separato per ogni punto numerato, con messaggio descrittivo in inglese (es. `feat: add Zod validation to all mutation API routes`).
