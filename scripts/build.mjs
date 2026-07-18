// Deterministic src -> dist build. Node stdlib only. Same src tree must always
// produce a byte-identical dist tree (no timestamps, no randomness).
// Safety: BUILD_OUT is allowlisted before deletion; every output destination is
// claimed in a manifest so nothing can silently overwrite anything else.
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

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const manifest = new Manifest();

let pages = 0;
for (const page of PAGES) {
  const file = pageOutputFile(OUT, page.path);
  manifest.claim(path.relative(OUT, file), `page ${page.path}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPage(page));
  pages++;
}

// static passthroughs — copied file-by-file so every destination is manifest-checked
const copies = [
  ['src/css', 'styles'],
  ['src/js', 'js'],
  ['public', '.'],
];
let files = 0;
for (const [from, to] of copies) {
  const srcDir = path.join(ROOT, from);
  if (!fs.existsSync(srcDir)) continue;
  const entries = fs.readdirSync(srcDir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
  for (const e of entries) {
    const abs = path.join(e.parentPath ?? e.path, e.name);
    const rel = path.join(to, path.relative(srcDir, abs));
    manifest.claim(rel, `copy ${from}`);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
    files++;
  }
}

// GitHub Pages must serve dist verbatim
manifest.claim('.nojekyll', 'build');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log(`build: ${pages} pages, ${files} static files, ${manifest.size()} outputs -> ${path.relative(ROOT, OUT) || OUT}`);
