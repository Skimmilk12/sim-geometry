// B6 gate: standalone embed isolation, attribution, registration, and docs.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../src/content/pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let out;

before(() => {
  out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-'));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], {
    env: { ...process.env, BUILD_OUT: out, SG_PRELAUNCH: '0' },
  });
});

after(() => {
  if (out) fs.rmSync(out, { recursive: true, force: true });
});

test('embed page is registered for future sitemap exclusion', () => {
  const page = PAGES.find((candidate) => candidate.path === '/embed/fov/');
  assert.ok(page, '/embed/fov/ is registered');
  assert.equal(page.embed, true);
  assert.equal(page.robots, 'noindex, nofollow');
  assert.deepEqual(page.scripts, ['/js/tools/fov-ui.mjs'], 'embed and full tool share one controller');
});

test('standalone embed output is isolated and permanently noindex', () => {
  const file = path.join(out, 'embed', 'fov', 'index.html');
  assert.ok(fs.existsSync(file), '/embed/fov/index.html exists');
  const html = fs.readFileSync(file, 'utf8');

  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /googletagmanager|\bgtag\s*\(/i);
  assert.doesNotMatch(html, /class="sg-(?:top|nav|foot)"/, 'site chrome is absent');
  assert.doesNotMatch(html, /id="copy-share-card"/, 'embed omits the share-card action');
  assert.match(html, /href="https:\/\/simgeometry\.com\/tools\/fov\/" target="_blank" rel="noopener">Calculated by Sim Geometry<\/a>/);

  const absoluteUrls = html.match(/https:\/\/[^\s"'<>]+/g) ?? [];
  assert.ok(absoluteUrls.length > 0, 'absolute URLs were inspected');
  for (const url of absoluteUrls) {
    assert.ok(url.startsWith('https://simgeometry.com/'), `external URL is forbidden: ${url}`);
  }
});

test('embed light-theme class remains an explicit functional override', () => {
  const tokens = fs.readFileSync(path.join(ROOT, 'src/css/tokens.css'), 'utf8');
  const controller = fs.readFileSync(path.join(ROOT, 'src/js/tools/fov-ui.mjs'), 'utf8');
  assert.match(tokens, /\.theme-light\s*\{/);
  assert.match(tokens, /\.theme-light\s*\{[\s\S]*?color-scheme:\s*light;/);
  assert.match(controller, /embedRoot\.classList\.add\(`theme-\$\{theme\}`\)/);
  assert.match(controller, /\['light', 'dark', 'auto'\]/);
});

test('embed controller has only the allowlisted fetch and no persistent browser storage', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/js/tools/fov-ui.mjs'), 'utf8');
  const fetches = [...source.matchAll(/\bfetch\(([^)]*)\)/g)].map((match) => match[1]);

  assert.deepEqual(fetches, ["'/data/game-fov-conventions.v1.json'"]);
  assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b|document\.cookie/);
  assert.match(source, /type: 'sim-geometry-embed-height', px/);
  assert.doesNotMatch(source, /addEventListener\(['"]message['"]/, 'embed never reads parent messages');
});

test('embed documentation includes privacy, parameters, iframe, and height snippets', () => {
  const html = fs.readFileSync(path.join(out, 'embed', 'index.html'), 'utf8');

  assert.match(html, /class="sg-top"/, 'docs use the site chrome');
  assert.match(html, /no analytics, no cookies, no external requests - audit the network tab/);
  assert.match(html, /&lt;iframe id='sim-geometry-fov'/);
  assert.match(html, /title='Sim Geometry FOV calculator'/);
  assert.match(html, /loading='lazy'/);
  assert.match(html, /sandbox='allow-scripts allow-popups allow-popups-to-escape-sandbox'/);
  assert.match(html, /theme=light\|dark\|auto/);
  assert.match(html, /units=in\|cm\|mm/);
  assert.match(html, /sim-geometry-embed-height/);
  assert.match(html, /event\.source !== frame\.contentWindow/);
});
