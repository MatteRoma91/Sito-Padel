# Prompt per Cursor Composer: Fix vulnerabilità di sicurezza

Sei un senior full-stack developer specializzato in sicurezza. Devi applicare **10 fix di sicurezza** alla webapp Next.js "Banana Padel Tour". Il progetto usa App Router, TypeScript strict, Tailwind CSS, SQLite (better-sqlite3), Socket.io, iron-session.

**REGOLA FONDAMENTALE**: non rompere nessuna funzionalità esistente. Ogni modifica deve essere chirurgica e retrocompatibile. Se un componente funzionava prima, deve funzionare identicamente dopo. Dopo tutte le modifiche esegui `npm run build` e `npm run lint` per verificare che tutto compili senza errori.

---

## 1. CRITICO — Leak di `password_hash` al client via React Server Components

### Problema
In `app/(dashboard)/profiles/[id]/page.tsx` (riga ~426), l'oggetto `user` completo (tipo `User`, che include `password_hash`, `must_change_password`, `is_hidden`, `created_at`) viene passato come prop al componente client `EditProfileForm`. In Next.js, le props passate da un Server Component a un Client Component vengono serializzate e inviate al browser. Questo significa che il **bcrypt hash della password** è visibile nel browser di qualsiasi utente che visualizza la form di modifica profilo.

### File da modificare

#### A) `lib/types.ts`
Aggiungi un nuovo tipo `SafeUser` (subito dopo l'interfaccia `User`, riga ~102) che contiene solo i campi sicuri necessari al client:

```typescript
export type SafeUser = Omit<User, 'password_hash' | 'must_change_password' | 'created_at'>;
```

#### B) `app/(dashboard)/profiles/[id]/page.tsx`
Alla riga dove si passa `user` a `EditProfileForm` (riga ~426-430), crea un oggetto sanitizzato PRIMA di passarlo:

Cerca:
```tsx
<EditProfileForm 
  user={user} 
  isAdmin={isAdmin ?? false}
  isOwnProfile={isOwnProfile ?? false}
/>
```

Sostituisci con:
```tsx
<EditProfileForm 
  user={{
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    nickname: user.nickname,
    role: user.role,
    avatar: user.avatar,
    skill_level: user.skill_level,
    overall_score: user.overall_score,
    bio: user.bio,
    preferred_side: user.preferred_side,
    preferred_hand: user.preferred_hand,
    birth_date: user.birth_date,
    is_hidden: user.is_hidden,
  }}
  isAdmin={isAdmin ?? false}
  isOwnProfile={isOwnProfile ?? false}
/>
```

#### C) `components/profiles/EditProfileForm.tsx`
Cambia il tipo della prop `user` da `User` a `SafeUser`:

1. Nell'import (riga 8), cambia:
   ```typescript
   import type { User, SkillLevel } from '@/lib/types';
   ```
   in:
   ```typescript
   import type { SafeUser, SkillLevel } from '@/lib/types';
   ```

2. Nell'interfaccia `EditProfileFormProps` (riga 24-28), cambia:
   ```typescript
   interface EditProfileFormProps {
     user: User;
   ```
   in:
   ```typescript
   interface EditProfileFormProps {
     user: SafeUser;
   ```

**Verifica**: il componente `EditProfileForm` usa solo questi campi di `user`: `id`, `avatar`, `nickname`, `full_name`, `username`, `birth_date`, `role`, `overall_score`, `skill_level`, `preferred_side`, `preferred_hand`, `bio`. Nessuno di questi viene rimosso, quindi il componente funzionerà identicamente.

---

## 2. ALTO — Protezione path traversal in serve-gallery e serve-avatar

### Problema
`app/api/serve-gallery/[...path]/route.ts` e `app/api/serve-avatar/[...path]/route.ts` usano `filename.includes('..')` per proteggersi dal path traversal. Questa protezione è insufficiente. `path.join()` risolve i `..`, quindi un input crafted potrebbe bypassare il check.

### File da modificare

#### A) `app/api/serve-gallery/[...path]/route.ts`
Dopo la riga `const filepath = path.join(GALLERY_DIR, filename);` (riga 28), aggiungi un controllo robusto:

```typescript
const filepath = path.join(GALLERY_DIR, filename);
const resolved = path.resolve(filepath);
if (!resolved.startsWith(GALLERY_DIR)) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

Il file finale deve avere sia il check `includes('..')` (riga 24) sia il nuovo check `startsWith`.

#### B) `app/api/serve-avatar/[...path]/route.ts`
Stessa identica modifica: dopo `const filepath = path.join(AVATARS_DIR, filename);` (riga 26), aggiungi:

```typescript
const filepath = path.join(AVATARS_DIR, filename);
const resolved = path.resolve(filepath);
if (!resolved.startsWith(AVATARS_DIR)) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```

#### C) `app/api/gallery/[id]/route.ts`
Nella funzione DELETE (riga 33), il `media.file_path` dal database viene usato per eliminare il file. Aggiungi un controllo di sicurezza:

Cerca:
```typescript
const fullPath = path.join(process.cwd(), 'public', media.file_path.replace(/^\//, ''));
if (existsSync(fullPath)) {
```

Sostituisci con:
```typescript
const fullPath = path.join(process.cwd(), 'public', media.file_path.replace(/^\//, ''));
const galleryBase = path.join(process.cwd(), 'public', 'gallery');
if (!path.resolve(fullPath).startsWith(galleryBase)) {
  return NextResponse.json({ success: false, error: 'Percorso file non valido' }, { status: 400 });
}
if (existsSync(fullPath)) {
```

---

## 3. ALTO — Rendere il session secret fallback più sicuro in development

### Problema
`lib/auth.ts` (riga 23) e `server.js` (riga 18) usano un fallback hardcoded `'complex_password_at_least_32_characters_long_for_iron_session'` come session secret. Questo valore è nel codice sorgente e potrebbe essere usato se qualcuno dimentica di impostare `SESSION_SECRET`.

### File da modificare

#### A) `lib/auth.ts`
Modifica la funzione `getSessionPassword()` (righe 18-24). Aggiungi un avviso in console per development e genera un hash dal path del progetto per rendere il fallback unico per ogni installazione:

```typescript
function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('SESSION_SECRET è obbligatorio in produzione');
  }
  if (!secret) {
    console.warn('[SECURITY] SESSION_SECRET non impostato. Usa una variabile d\'ambiente in produzione.');
  }
  return secret || 'complex_password_at_least_32_characters_long_for_iron_session';
}
```

#### B) `server.js`
Stessa cosa per il blocco alle righe 12-19. Aggiungi un avviso console:

```javascript
const SESSION_PASSWORD = (() => {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    console.error('SESSION_SECRET è obbligatorio in produzione');
    process.exit(1);
  }
  if (!secret) {
    console.warn('[SECURITY] SESSION_SECRET non impostato. Usa una variabile d\'ambiente in produzione.');
  }
  return secret || 'complex_password_at_least_32_characters_long_for_iron_session';
})();
```

---

## 4. ALTO — Migliorare il seed admin

### Problema
`lib/db/seed.ts` crea un admin con password `admin123` e logga la password in chiaro nella console (riga 21).

### File da modificare: `lib/db/seed.ts`

1. Aggiungi `import { randomBytes } from 'crypto';` in cima (dopo le altre import).
2. Invece di usare `'admin123'` hardcoded, genera una password casuale:

Sostituisci il blocco della funzione `seed()` con:

```typescript
export function seed() {
  const db = getDb();

  const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (row.count > 0) return;

  try {
    const id = randomUUID();
    const generatedPassword = randomBytes(12).toString('base64url').slice(0, 16);
    const passwordHash = bcrypt.hashSync(generatedPassword, BCRYPT_ROUNDS);
    db.prepare(
      `INSERT INTO users (id, username, password_hash, full_name, nickname, role, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    ).run(id, 'admin', passwordHash, 'Amministratore', 'Admin', 'admin');
    console.log('=== ADMIN INIZIALE CREATO ===');
    console.log(`Username: admin`);
    console.log(`Password: ${generatedPassword}`);
    console.log('CAMBIA LA PASSWORD AL PRIMO ACCESSO!');
    console.log('=============================');
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || err?.message?.includes('UNIQUE constraint')) {
      return;
    }
    throw e;
  }
}
```

**Nota critica**: il `must_change_password` è impostato a `1`, costringendo l'admin a cambiare password al primo login. Questo non rompe nulla perché il meccanismo `must_change_password` è già implementato e funzionante.

**ATTENZIONE**: questa modifica impatta SOLO i database nuovi (quando `users` è vuoto). I database esistenti NON vengono toccati perché il seed esce subito se `row.count > 0`.

Aggiorna anche i file di test e2e che usano `admin123`:

#### `e2e/chat.spec.ts` e `e2e/live-score.spec.ts`
Sostituisci la password hardcoded con una variabile d'ambiente:
- Cerca: `await page.fill('input#password', 'admin123');`
- Sostituisci con: `await page.fill('input#password', process.env.TEST_ADMIN_PASSWORD || 'admin123');`

---

## 5. MEDIO — Autenticazione su GET /api/settings

### Problema
`app/api/settings/route.ts` — la funzione `GET` (riga 10) non richiede autenticazione. Qualsiasi client può leggere la configurazione del sito.

### File da modificare: `app/api/settings/route.ts`

Modifica la funzione `GET` aggiungendo il check di autenticazione. Il `GET` delle settings viene usato da due contesti:
1. **Server Components** che chiamano `getSiteConfig()` direttamente (non passano per questa API route) — NON vengono impattati.
2. **Client Components** che fanno `fetch('/api/settings')` — devono essere autenticati.

Tuttavia, `buildConfigCss` in `app/layout.tsx` chiama `getSiteConfig()` direttamente (import dal modulo `lib/db/queries`), quindi NON usa questa API route. Verifica anche gli altri punti che chiamano `getSiteConfig()` — sono tutti Server Components.

**Controlla prima** se qualche Client Component usa `fetch('/api/settings')`. Se sì, assicurati che sia dentro un layout autenticato. Se nessun client component la usa senza autenticazione, puoi aggiungere il check.

Modifica la funzione GET:

```typescript
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const config = getSiteConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 });
  }
}
```

---

## 6. MEDIO — Validazione range punteggi risultato partita centro sportivo

### Problema
`app/api/sports-center/bookings/[id]/result/route.ts` — i punteggi dei set (`set1.c1`, `set1.c2`, etc.) sono controllati solo per tipo `number` ma non hanno limiti di range. Si possono inserire numeri negativi, NaN, Infinity, o valori enormi.

### File da modificare: `app/api/sports-center/bookings/[id]/result/route.ts`

Dopo il check del tipo sui set (dopo riga 81, prima di `const data`), aggiungi una funzione di validazione e il relativo controllo:

```typescript
function isValidScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 7;
}

// ... (dentro la funzione PATCH, dopo il check dei tipi set1/set2)

if (!isValidScore(set1.c1) || !isValidScore(set1.c2) || !isValidScore(set2.c1) || !isValidScore(set2.c2)) {
  return NextResponse.json(
    { error: 'I punteggi dei set devono essere numeri interi tra 0 e 7' },
    { status: 400 }
  );
}
if (set3 != null && typeof set3 === 'object') {
  if (typeof set3.c1 === 'number' && typeof set3.c2 === 'number') {
    if (!isValidScore(set3.c1) || !isValidScore(set3.c2)) {
      return NextResponse.json(
        { error: 'I punteggi del terzo set devono essere numeri interi tra 0 e 7' },
        { status: 400 }
      );
    }
  }
}
```

Posiziona la funzione `isValidScore` FUORI dalla funzione `PATCH` (in cima al file, sotto gli import). Posiziona i check DOPO il blocco di validazione dei tipi `set1`/`set2` esistente e PRIMA di `const data`.

---

## 7. MEDIO — Validazione closed-slots

### Problema
`app/api/sports-center/closed-slots/route.ts` — `slot_start` e `slot_end` non vengono validati per formato `HH:MM`.

### File da modificare: `app/api/sports-center/closed-slots/route.ts`

Nel ramo `action === 'add'` (riga 38), aggiungi validazione prima di inserire:

Cerca:
```typescript
if (action === 'add' && typeof day_of_week === 'number' && slot_start && slot_end) {
  if (day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json({ error: 'day_of_week deve essere 0-6 (0=domenica)' }, { status: 400 });
  }
  const id = insertClosedSlot({
```

Sostituisci con:
```typescript
if (action === 'add' && typeof day_of_week === 'number' && slot_start && slot_end) {
  if (day_of_week < 0 || day_of_week > 6) {
    return NextResponse.json({ error: 'day_of_week deve essere 0-6 (0=domenica)' }, { status: 400 });
  }
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(String(slot_start)) || !timeRegex.test(String(slot_end))) {
    return NextResponse.json({ error: 'slot_start e slot_end devono essere nel formato HH:MM' }, { status: 400 });
  }
  const id = insertClosedSlot({
```

---

## 8. MEDIO — Limiti di lunghezza su campi prenotazione

### Problema
`app/api/sports-center/bookings/route.ts` — `booking_name`, `guest_name`, `guest_phone` non hanno limiti di lunghezza.

### File da modificare: `app/api/sports-center/bookings/route.ts`

Dopo il check `booking_name` non vuoto (riga 71-76), aggiungi:

```typescript
if (booking_name.trim().length > 200) {
  return NextResponse.json({
    success: false,
    error: 'Il nome della prenotazione non può superare i 200 caratteri',
  }, { status: 400 });
}
if (guest_name && typeof guest_name === 'string' && guest_name.trim().length > 200) {
  return NextResponse.json({
    success: false,
    error: 'Il nome ospite non può superare i 200 caratteri',
  }, { status: 400 });
}
if (guest_phone && typeof guest_phone === 'string' && guest_phone.trim().length > 50) {
  return NextResponse.json({
    success: false,
    error: 'Il telefono ospite non può superare i 50 caratteri',
  }, { status: 400 });
}
```

Posiziona questo blocco **dopo** il check `booking_name` non vuoto (riga 76) e **prima** del check sulla data (riga 78).

---

## 9. MEDIO — Limitare lunghezza path nel page-view analytics

### Problema
`app/api/analytics/page-view/route.ts` — il `path` ricevuto non ha limiti di lunghezza. Qualcuno potrebbe inviare stringhe enormi.

### File da modificare: `app/api/analytics/page-view/route.ts`

Dopo `if (!path)` (riga 19-21), aggiungi un check sulla lunghezza:

```typescript
if (!path || path.length > 500) {
  return NextResponse.json({ error: 'path richiesto' }, { status: 400 });
}
```

Modifica la riga 19 esistente — cambia solo la condizione `if (!path)` in `if (!path || path.length > 500)`.

---

## 10. BASSO — Re-validazione ruolo da database per operazioni admin

### Problema
`lib/auth.ts` — la funzione `getCurrentUser()` restituisce l'utente dal DB (con il ruolo aggiornato), ma la sessione conserva il ruolo originale dal login. La funzione `isAdmin()` (riga 107-110) legge il ruolo DALLA SESSIONE, non dal DB.

### File da modificare: `lib/auth.ts`

Modifica la funzione `isAdmin()` per re-validare dal database:

Cerca:
```typescript
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn && session.role === 'admin';
}
```

Sostituisci con:
```typescript
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user && user.role === 'admin';
}
```

**Nota**: `getCurrentUser()` già fa `getUserById(session.userId)` che legge il ruolo aggiornato dal database. Quindi con questa modifica, `isAdmin()` riflette sempre il ruolo attuale. Non ci sono problemi di performance perché `getCurrentUser()` è già O(1) su SQLite.

Verifica che tutti i punti che usano `isAdmin()` continuino a funzionare — la firma e il tipo di ritorno restano identici (`Promise<boolean>`).

---

## Istruzioni finali

1. **Ordine di esecuzione consigliato**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
2. **Non toccare** file non elencati qui.
3. **Non modificare** la logica di business, il layout, lo stile CSS, o il comportamento visivo.
4. **Non aggiungere dipendenze** npm.
5. **TypeScript strict**: non aggiungere `@ts-ignore`, `any`, o `as any`.
6. **Dopo tutte le modifiche**: esegui `npm run build && npm run lint` e assicurati che non ci siano errori.
7. **Commit**: fai un singolo commit con messaggio `fix: security vulnerabilities - password hash leak, path traversal, input validation`.
