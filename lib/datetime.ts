/** SQLite `datetime('now')` è UTC in forma `YYYY-MM-DD HH:MM:SS` senza `Z`; il Date parser del browser lo tratta spesso come locale. */
export function parseSqliteUtcAsDate(value: string): Date {
  const v = value.trim();
  if (v.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(v)) {
    return new Date(v);
  }
  const iso = v.includes('T') ? v : v.replace(' ', 'T');
  return new Date(`${iso}Z`);
}

export function formatItalyDateTimeFromSqliteUtc(value: string): string {
  return parseSqliteUtcAsDate(value).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
}
