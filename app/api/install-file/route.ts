import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const INSTALL_HTML = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Banana Padel Tour">
  <title>Installa Banana Padel Tour - iPhone</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: linear-gradient(135deg, #1a1f4e, #162079); color: #f1f5f9; line-height: 1.5; min-height: 100vh; }
    .container { max-width: 480px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    .subtitle { color: rgba(241,245,249,0.8); margin-bottom: 24px; }
    .card { background: rgba(12,20,81,0.8); border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(98,112,243,0.5); }
    .step { display: flex; gap: 16px; margin-bottom: 20px; }
    .step:last-child { margin-bottom: 0; }
    .num { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: rgba(250,204,21,0.3); color: #facc15; font-weight: 600; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .step p { margin: 0; }
    .step strong { display: block; margin-bottom: 4px; }
    .step span { font-size: 0.9rem; color: rgba(241,245,249,0.8); }
    .btn { display: block; width: 100%; padding: 16px; border-radius: 12px; text-align: center; text-decoration: none; font-weight: 600; font-size: 1rem; border: none; cursor: pointer; margin-bottom: 12px; }
    .btn-primary { background: #facc15; color: #0c1451; }
    .btn-secondary { background: rgba(98,112,243,0.5); color: #f1f5f9; }
    .small { font-size: 0.85rem; color: rgba(241,245,249,0.6); text-align: center; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Installa Banana Padel Tour su iPhone</h1>
    <p class="subtitle">Tornei, classifiche e calendario padel</p>
    <div class="card">
      <div class="step">
        <span class="num">1</span>
        <div><strong>Apri Safari</strong><span>Usa il browser Safari (non Chrome)</span></div>
      </div>
      <div class="step">
        <span class="num">2</span>
        <div><strong>Tocca Condividi</strong><span>Icona in basso (quadrato con freccia)</span></div>
      </div>
      <div class="step">
        <span class="num">3</span>
        <div><strong>Aggiungi a Home</strong><span>Scorri e seleziona l'opzione</span></div>
      </div>
      <div class="step">
        <span class="num">4</span>
        <div><strong>Conferma</strong><span>Tocca "Aggiungi" per completare</span></div>
      </div>
    </div>
    <a href="BASE_URL" class="btn btn-primary">Apri Banana Padel Tour e aggiungi a Home</a>
    <p class="small">Salva questa pagina nei segnalibri per consultarla in seguito.</p>
  </div>
</body>
</html>`;

export function GET() {
  const baseUrl = getBaseUrl();
  const html = INSTALL_HTML.replace(/BASE_URL/g, baseUrl);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="banana-padel-tour-install.html"',
    },
  });
}
