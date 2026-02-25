import fs from 'fs';

const html = fs.readFileSync('.next/analyze/client.html', 'utf8');
const startIdx = html.indexOf('window.chartData = ') + 'window.chartData = '.length;
let depth = 0;
let i = startIdx;
if (html[i] !== '[') throw new Error('chartData not found');
depth = 1;
i++;
while (i < html.length && depth > 0) {
  const c = html[i];
  if (c === '[') depth++;
  else if (c === ']') depth--;
  i++;
}
const data = JSON.parse(html.substring(startIdx, i));

function flatten(item, list = []) {
  if (item.parsedSize && item.path && item.path.includes('node_modules')) {
    list.push({ path: item.path, parsedSize: item.parsedSize, statSize: item.statSize });
  }
  if (item.groups) {
    for (const g of item.groups) flatten(g, list);
  }
  return list;
}

const allItems = [];
for (const chunk of data) {
  if (chunk.groups) allItems.push(...flatten(chunk));
}

const pkgSizes = {};
for (const it of allItems) {
  const m = it.path.match(/node_modules\/([^/]+)/);
  if (m) {
    const pkg = m[1];
    pkgSizes[pkg] = (pkgSizes[pkg] || 0) + (it.parsedSize || it.statSize || 0);
  }
}

// Chunks iniziali (First Load) - framework, main, polyfills, 117, fd9d1056
const initialChunkNames = [
  'framework', 'main', 'main-app', 'polyfills', 'webpack',
  '117-b7af513b8eb8ff5f', 'fd9d1056-f8783a7222605537',
];
function isInitialChunk(c) {
  const name = (c.label || '').split('/').pop() || '';
  return initialChunkNames.some((n) => name.includes(n));
}
const initialFlattened = [];
for (const chunk of data) {
  if (chunk.groups && isInitialChunk(chunk)) initialFlattened.push(...flatten(chunk));
}
const initialPkg = {};
for (const it of initialFlattened) {
  const m = it.path.match(/node_modules\/([^/]+)/);
  if (m) initialPkg[m[1]] = (initialPkg[m[1]] || 0) + (it.parsedSize || it.statSize || 0);
}
const top5Initial = Object.entries(initialPkg).sort((a, b) => b[1] - a[1]).slice(0, 5);

const sorted = Object.entries(pkgSizes).sort((a, b) => b[1] - a[1]);
console.log('=== TOP 5 PACCHETTI nel First Load JS (chunks condivisi ~88 kB) ===');
top5Initial.length > 0
  ? top5Initial.forEach(([n, s]) => console.log(`${n}: ${(s / 1024).toFixed(1)} kB`))
  : sorted.slice(0, 5).forEach(([n, s]) => console.log(`${n}: ${(s / 1024).toFixed(1)} kB`));

console.log('');
console.log('=== Recharts ===');
const r = sorted.find(([n]) => n.toLowerCase().includes('recharts'));
console.log(r ? `${(r[1] / 1024).toFixed(1)} kB` : 'Non presente nel bundle (sostituito da SVG puro)');

console.log('');
console.log('=== jsPDF ===');
const j = sorted.find(([n]) => n.toLowerCase().includes('jspdf'));
const jChunk = data.find((c) => c.groups?.some((g) => (g.path || '').includes('jspdf')));
const jSingle = jChunk?.groups?.[0]?.parsedSize ?? jChunk?.groups?.[0]?.statSize;
console.log(
  jSingle
    ? `${(jSingle / 1024).toFixed(1)} kB (parsed, in un chunk)`
    : j
      ? `${(j[1] / 1024).toFixed(1)} kB totale`
      : 'Non trovato'
);

console.log('');
console.log('=== CHUNK PIU GRANDE (e top 5) ===');
const chunks = data
  .filter((x) => x.label && (x.isAsset || x.label.includes('chunks')))
  .map((c) => ({
    label: c.label?.split('/').pop() || c.label,
    parsedSize: c.parsedSize || c.statSize,
  }))
  .sort((a, b) => b.parsedSize - a.parsedSize);
chunks.slice(0, 5).forEach((c) => console.log(`${c.label}: ${(c.parsedSize / 1024).toFixed(1)} kB`));
