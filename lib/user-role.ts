/** Ruolo amministratore applicativo (normalizzato). Usabile anche da componenti client. */
export function isAppAdmin(user: { role?: string } | null): boolean {
  const r = user?.role?.trim().toLowerCase();
  return r === 'admin';
}
