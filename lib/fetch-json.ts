export type FetchJsonError = {
  ok: false;
  status: number;
  error: string;
  body?: unknown;
};

export type FetchJsonOk<T> = { ok: true; status: number; data: T };

export type FetchJsonResult<T> = FetchJsonOk<T> | FetchJsonError;

/**
 * fetch + JSON con gestione errori di rete e messaggio da `error` nel body.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, status: 0, error: 'Errore di connessione' };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  if (!res.ok) {
    const err =
      (typeof rec.error === 'string' && rec.error) ||
      (typeof rec.message === 'string' && rec.message) ||
      `Errore HTTP ${res.status}`;
    return { ok: false, status: res.status, error: err, body };
  }

  return { ok: true, status: res.status, data: body as T };
}
