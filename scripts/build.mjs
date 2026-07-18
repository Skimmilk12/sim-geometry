// Deterministic src -> dist build. Node stdlib only. Same src tree must always
// produce a byte-identical dist tree (no timestamps, no randomness).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.BUILD_OUT ? path.resolve(process.env.BUILD_OUT) : path.join(ROOT, 'dist');

const { renderPage } = await import(pathToFileURL(path.join(ROOT, 'src/templates/chrome.mjs')));
const { PAGES } = await import(pathToFileURL(path.join(ROOT, 'src/content/pages.mjs')));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let pages = 0;
for (const page of PAGES) {
  const rel = page.path === '/' ? 'index.html' : path.join(page.path.replace(/^\/|\/$/g, ''), 'index.html');
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPage(page));
  pages++;
}

// static passthroughs
const copies = [
  ['src/css', 'styles'],
  ['src/js', 'js'],
  ['public', '.'],
];
let files = 0;
for (const [from, to] of copies) {
  const src = path.join(ROOT, from);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(OUT, to);
  fs.cpSync(src, dest, { recursive: true });
  files += fs.readdirSync(src, { recursive: true }).length;
}

// GitHub Pages must serve dist verbatim
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`build: ${pages} pages, ${files} static entries -> ${path.relative(ROOT, OUT) || OUT}`);
