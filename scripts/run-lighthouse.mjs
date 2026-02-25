#!/usr/bin/env node
/**
 * Esegue Lighthouse su /, /login, /profiles/[id].
 *
 * PREREQUISITI:
 * - Server attivo su BASE_URL (default: http://localhost:3000)
 * - Chrome/Chromium installato (impostare CHROME_PATH se necessario)
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 node scripts/run-lighthouse.mjs
 *   CHROME_PATH=/usr/bin/chromium node scripts/run-lighthouse.mjs
 *
 * Per pagine protette (/ e /profiles/[id]): avviare Chrome con debugging, fare login, poi:
 *   chrome --remote-debugging-port=9222
 *   node scripts/run-lighthouse.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PROFILE_ID = process.env.PROFILE_ID || '0f888506-30f7-4c81-afce-1b98c774bb5c';
const REPORTS_DIR = path.join(process.cwd(), 'docs', 'reports');

// Solo /login è accessibile senza auth. Per / e /profiles/[id] seguire docs/LIGHTHOUSE.md (Chrome con --port=9222)
const PAGES = [
  { url: `${BASE_URL}/login`, name: 'login' },
  { url: BASE_URL, name: 'homepage' },
  { url: `${BASE_URL}/profiles/${PROFILE_ID}`, name: 'profiles-id' },
];

function runLighthouse(url, name) {
  return new Promise((resolve, reject) => {
    const outPath = path.join(REPORTS_DIR, `lighthouse-${name}`);
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const args = [
      url,
      '--only-categories=performance,seo',
      '--output=json',
      '--output=html',
      `--output-path=${outPath}`,
      '--quiet',
      '--chrome-flags=--headless --no-sandbox --disable-gpu',
    ];

    const env = { ...process.env };
    if (process.env.CHROME_PATH) {
      env.CHROME_PATH = process.env.CHROME_PATH;
    }

    const child = spawn('npx', ['lighthouse', ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
    });

    let stderr = '';
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(path.join(REPORTS_DIR, `lighthouse-${name}.report.json`));
      } else {
        reject(new Error(`Lighthouse exit ${code}: ${stderr}`));
      }
    });
  });
}

async function main() {
  console.log('Lighthouse - Banana Padel Tour');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  for (const { url, name } of PAGES) {
    console.log(`[${name}] ${url}`);
    try {
      const jsonPath = await runLighthouse(url, name);
      console.log(`  → ${jsonPath}`);
    } catch (e) {
      console.error(`  ERRORE: ${e.message}`);
      if (name === 'login') {
        console.error('\nSuggerimento: imposta CHROME_PATH se Chrome non è nel PATH.');
        console.error('Es: CHROME_PATH=/usr/bin/chromium node scripts/run-lighthouse.mjs');
      }
    }
  }

  console.log('\nEsegui: node scripts/extract-lighthouse-metrics.mjs');
  console.log('per estrarre le metriche e aggiornare il report.');
}

main().catch(console.error);
