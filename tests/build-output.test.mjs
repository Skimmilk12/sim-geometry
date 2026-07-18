// B1.1 gate: correctness of generated output, not just determinism.
// Runs real builds into tmp sg-build-* dirs and inspects the results,
// including a production-mode fixture (SG_PRELAUNCH=0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function build(extraEnv = {}) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-'));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], {
    env: { ...process.env, BUILD_OUT: out, ...extraEnv },
  });
  return out;
}

test('prelaunch build: robots noindex, canonical, stylesheets, .nojekyll, skip link', () => {
  const out = build();
  try {
    const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    assert.match(home, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(home, /<link rel="canonical" href="https:\/\/simgeometry\.com\/">/);
    assert.match(home, /href="\/styles\/tokens\.css"/);
    assert.match(home, /href="\/styles\/base\.css"/);
    assert.match(home, /class="skip-link" href="#main"/);
    assert.match(home, /<main id="main">/);
    assert.ok(fs.existsSync(path.join(out, '.nojekyll')), '.nojekyll present');
    assert.ok(fs.existsSync(path.join(out, 'styles/base.css')), 'css copied');
    assert.match(home, /aria-disabled="true"/, 'soon items are marked disabled');
    assert.doesNotMatch(home, /style="/, 'no inline styles in generated pages');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('production fixture: noindex disappears, canonical paths unchanged', () => {
  const pre = build();
  const prod = build({ SG_PRELAUNCH: '0' });
  try {
    const preHome = fs.readFileSync(path.join(pre, 'index.html'), 'utf8');
    const prodHome = fs.readFileSync(path.join(prod, 'index.html'), 'utf8');
    assert.match(prodHome, /<meta name="robots" content="index, follow">/);
    assert.doesNotMatch(prodHome, /noindex/);
    const canon = (s) => s.match(/<link rel="canonical" href="([^"]+)">/)[1];
    assert.equal(canon(preHome), canon(prodHome), 'canonical identical across modes');
  } finally {
    fs.rmSync(pre, { recursive: true, force: true });
    fs.rmSync(prod, { recursive: true, force: true });
  }
});

test('a public/ file colliding with a generated page fails the build', () => {
  const publicDir = path.join(ROOT, 'public');
  const existed = fs.existsSync(publicDir);
  const probe = path.join(publicDir, 'index.html');
  assert.ok(!fs.existsSync(probe), 'precondition: no real public/index.html');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(probe, 'colliding file');
  try {
    assert.throws(() => build(), /output collision/);
  } finally {
    fs.rmSync(probe);
    if (!existed) fs.rmSync(publicDir, { recursive: true, force: true });
  }
});
