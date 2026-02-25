#!/usr/bin/env node
/**
 * Estrae Performance, SEO, LCP, FCP, TBT, CLS dai report JSON di Lighthouse
 * e genera il markdown per il REPORT-COMPARATIVO.
 *
 * Uso: node scripts/extract-lighthouse-metrics.mjs
 *
 * Legge: docs/reports/lighthouse-{login,homepage,profiles-id}.report.json
 * Output: metriche in JSON + blocco markdown per il report
 */

import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'docs', 'reports');
const NAMES = ['login', 'homepage', 'profiles-id'];

function extractMetrics(lhr) {
  const c = lhr?.categories || {};
  const a = lhr?.audits || {};
  return {
    performance: c.performance != null ? Math.round(c.performance.score * 100) : null,
    seo: c.seo != null ? Math.round(c.seo.score * 100) : null,
    lcp: a['largest-contentful-paint']?.numericValue != null
      ? Math.round(a['largest-contentful-paint'].numericValue)
      : null,
    fcp: a['first-contentful-paint']?.numericValue != null
      ? Math.round(a['first-contentful-paint'].numericValue)
      : null,
    tbt: a['total-blocking-time']?.numericValue != null
      ? Math.round(a['total-blocking-time'].numericValue)
      : null,
    cls: a['cumulative-layout-shift']?.numericValue != null
      ? parseFloat(a['cumulative-layout-shift'].numericValue.toFixed(3))
      : null,
  };
}

function loadReport(name) {
  const candidates = [
    path.join(REPORTS_DIR, `lighthouse-${name}.report.json`),
    path.join(REPORTS_DIR, `lighthouse-${name}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return null;
}

function formatMs(ms) {
  if (ms == null) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms} ms`;
}

function main() {
  const data = {};

  for (const name of NAMES) {
    const lhr = loadReport(name);
    data[name] = lhr ? extractMetrics(lhr) : null;
  }

  const metricsPath = path.join(REPORTS_DIR, 'lighthouse-metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(data, null, 2));
  console.log('Metriche salvate in:', metricsPath);
  console.log(JSON.stringify(data, null, 2));

  // Markdown per il report
  const pageLabels = { login: '/login', homepage: '/', 'profiles-id': '/profiles/[id]' };

  console.log('\n--- Blocco Markdown per REPORT-COMPARATIVO ---\n');

  let md = `| Pagina | Performance | SEO | LCP | FCP | TBT | CLS |
|--------|-------------|-----|-----|-----|-----|-----|
`;

  for (const name of NAMES) {
    const m = data[name];
    const label = pageLabels[name];
    if (!m) {
      md += `| ${label} | *Non misurato* | - | - | - | - | - |\n`;
      continue;
    }
    md += `| ${label} | ${m.performance ?? '-'} | ${m.seo ?? '-'} | ${formatMs(m.lcp)} | ${formatMs(m.fcp)} | ${m.tbt != null ? m.tbt + ' ms' : '-'} | ${m.cls ?? '-'} |\n`;
  }

  console.log(md);
  console.log('\n--- Fine blocco ---');
}

main();
