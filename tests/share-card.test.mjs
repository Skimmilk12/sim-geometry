// B7b gate: the production share-card action is full-site only, renders the
// required PNG dimensions, falls back to the canonical tool link, and remains
// governed by the successful-result invalidation contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../src/content/pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'src/js/tools/fov-ui.mjs'), 'utf8');

test('share-card action is present on home and tool but absent from the embed', () => {
  const home = PAGES.find((page) => page.path === '/');
  const tool = PAGES.find((page) => page.path === '/tools/fov/');
  const embed = PAGES.find((page) => page.path === '/embed/fov/');
  assert.match(home.body, /id="copy-share-card"/);
  assert.match(tool.body, /id="copy-share-card"/);
  assert.doesNotMatch(embed.body, /id="copy-share-card"/);
});

test('share card is a 1200x630 PNG with required graphite-instrument copy', () => {
  assert.match(source, /canvas\.width = 1200/);
  assert.match(source, /canvas\.height = 630/);
  assert.match(source, /'image\/png'/);
  assert.match(source, /SIM GEOMETRY/);
  assert.match(source, /OWN YOUR VIEW\./);
  assert.match(source, /SIMGEOMETRY\.COM/);
  assert.match(source, /primaryReadouts\(state, out\.results\)/, 'card uses the current result readouts');
});

test('PNG clipboard write has canonical tool-link fallback and stale-result guard', () => {
  assert.match(source, /navigator\.clipboard\.write\(\[new ClipboardItem\(\{ 'image\/png': png \}\)\]\)/);
  assert.match(source, /navigator\.clipboard\.writeText\(shareUrl\)/);
  assert.match(source, /`\$\{location\.origin\}\/tools\/fov\/#\$\{encodeStateV1\(state\)\}`/);
  assert.match(source, /if \(currentState !== state \|\| currentOutput !== out\) return;/);
  assert.match(source, /function invalidateResult\(\) \{[\s\S]*?currentState = null;[\s\S]*?currentOutput = null;[\s\S]*?hideActions\(\);/);
});
