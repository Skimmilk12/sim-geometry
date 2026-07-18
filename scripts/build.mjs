// Deterministic src -> dist build. Node stdlib only. Same src tree must always
// produce a byte-identical dist tree (no timestamps, no randomness).
// Safety: BUILD_OUT is allowlisted before any deletion; the COMPLETE output
// manifest (pages + copies) is validated BEFORE dist is touched, so a failing
// build never destroys the previous output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateBuildOut, pageOutputFile, Manifest, validateNav } from './build-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = validateBuildOut(ROOT, process.env.BUILD_OUT || path.join(ROOT, 'dist'));

const { renderPage } = await import(pathToFileURL(path.join(ROOT, 'src/templates/chrome.mjs')));
const { PAGES } = await import(pathToFileURL(path.join(ROOT, 'src/content/pages.mjs')));
const { SITE } = await import(pathToFileURL(path.join(ROOT, 'src/site.config.mjs')));

validateNav(SITE, PAGES);

// ---------- phase 1: preflight — render + plan every output, no writes ----------
const manifest = new Manifest();
const pageWrites = [];   // { file, html }
for (const page of PAGES) {
  const file = pageOutputFile(OUT, page.path);
  manifest.claim(path.relative(OUT, file), `page ${page.path}`);
  pageWrites.push({ file, html: renderPage(page) });
}

const copies = [
  ['src/css', 'styles'],
  ['src/js', 'js'],
  ['public', '.'],
];
const copyWrites = [];   // { from, dest }
for (const [from, to] of copies) {
  const srcDir = path.join(ROOT, from);
  if (!fs.existsSync(srcDir)) continue;
  const entries = fs.readdirSync(srcDir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
  for (const e of entries) {
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.join(to, path.relative(srcDir, abs));
    manifest.claim(rel, `copy ${from}`);
    copyWrites.push({ from: abs, dest: path.join(OUT, rel) });
  }
}
manifest.claim('.nojekyll', 'build');

// ---------- phase 2: validated — now (and only now) replace the output ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const { file, html } of pageWrites) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
for (const { from, dest } of copyWrites) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`build: ${pageWrites.length} pages, ${copyWrites.length} static files, ${manifest.size()} outputs -> ${path.relative(ROOT, OUT) || OUT}`);
