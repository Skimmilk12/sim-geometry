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

// Collision tests run against an ISOLATED copy of the repo in the tmpdir, so
// nothing mutates the real working tree and parallel test files can't observe
// a planted collision (Codex finding, Exchange 23).
function isolatedFixture(mutate) {
  const fix = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-fixture-'));
  for (const dir of ['scripts', 'src']) {
    fs.cpSync(path.join(ROOT, dir), path.join(fix, dir), { recursive: true });
  }
  mutate(fix);
  return fix;
}

function buildIn(fixtureRoot) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-'));
  execFileSync(process.execPath, [path.join(fixtureRoot, 'scripts/build.mjs')], {
    env: { ...process.env, BUILD_OUT: out },
  });
  return out;
}

test('a public/ file colliding with a generated page fails the build (isolated fixture)', () => {
  const fix = isolatedFixture((root) => {
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public', 'index.html'), 'colliding file');
  });
  try {
    assert.throws(() => buildIn(fix), /output collision/);
  } finally {
    fs.rmSync(fix, { recursive: true, force: true });
  }
});

test('a case-folded collision (public/Index.html) also fails the build', () => {
  const fix = isolatedFixture((root) => {
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public', 'Index.html'), 'case-folded collision');
  });
  try {
    assert.throws(() => buildIn(fix), /output collision \(case-insensitive\)/);
  } finally {
    fs.rmSync(fix, { recursive: true, force: true });
  }
});

test('a failing preflight leaves the previous output untouched', () => {
  const fix = isolatedFixture(() => {});
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-'));
  try {
    // first, a good build into out
    execFileSync(process.execPath, [path.join(fix, 'scripts/build.mjs')], {
      env: { ...process.env, BUILD_OUT: out },
    });
    const before = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    // now plant a collision and rebuild into the SAME out — must fail in
    // preflight and leave the previous output intact
    fs.mkdirSync(path.join(fix, 'public'), { recursive: true });
    fs.writeFileSync(path.join(fix, 'public', 'index.html'), 'boom');
    assert.throws(() => execFileSync(process.execPath, [path.join(fix, 'scripts/build.mjs')], {
      env: { ...process.env, BUILD_OUT: out },
    }));
    assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), before,
      'previous output preserved after failed preflight');
  } finally {
    fs.rmSync(fix, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
  }
});
