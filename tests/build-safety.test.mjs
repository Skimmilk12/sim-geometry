// B1.1 gate: build-safety primitives (Codex findings 1-2).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { validateBuildOut, validatePagePath, pageOutputFile, Manifest, validateNav } from '../scripts/build-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('BUILD_OUT allowlist: repo dist and tmp sg-build-* pass', () => {
  assert.equal(validateBuildOut(ROOT, path.join(ROOT, 'dist')), path.join(ROOT, 'dist'));
  const tmp = path.join(os.tmpdir(), 'sg-build-x');
  assert.equal(validateBuildOut(ROOT, tmp), path.resolve(tmp));
  assert.equal(validateBuildOut(ROOT, path.join(os.tmpdir(), 'sg-build-y', 'nested')), path.resolve(os.tmpdir(), 'sg-build-y', 'nested'));
});

test('BUILD_OUT allowlist: dangerous targets are refused', () => {
  for (const bad of [
    ROOT,                              // the repo itself
    path.dirname(ROOT),                // an ancestor
    path.parse(ROOT).root,             // filesystem root
    path.join(ROOT, 'src'),            // source dir
    path.join(os.tmpdir(), 'other'),   // tmp but not sg-build-*
    'C:/Users',                        // arbitrary absolute
  ]) {
    assert.throws(() => validateBuildOut(ROOT, bad), RangeError, `should refuse ${bad}`);
  }
});

test('page paths: canonical forms pass, traversal and junk are refused', () => {
  validatePagePath('/');
  validatePagePath('/tools/fov/');
  validatePagePath('/guides/why-fov-calculators-disagree/');
  for (const bad of ['/../x/', '/tools/../../x/', 'tools/fov/', '/Tools/Fov/', '/a b/', '/a\\b/', '/tools/fov', '//', '/a//b/']) {
    assert.throws(() => validatePagePath(bad), RangeError, `should refuse ${JSON.stringify(bad)}`);
  }
});

test('page output files can never escape the output directory', () => {
  const out = path.join(os.tmpdir(), 'sg-build-t');
  assert.equal(pageOutputFile(out, '/tools/fov/'), path.resolve(out, 'tools', 'fov', 'index.html'));
  assert.throws(() => pageOutputFile(out, '/../escape/'), RangeError);
});

test('manifest refuses duplicate destinations, exact and case-folded', () => {
  const m = new Manifest();
  m.claim('index.html', 'page /');
  m.claim('styles/base.css', 'copy src/css');
  m.claim('CNAME', 'copy public'); // uppercase alone is fine
  assert.throws(() => m.claim('index.html', 'copy public'), /output collision/);
  assert.throws(() => m.claim('styles\\base.css', 'copy public'), /output collision/, 'separator-insensitive');
  assert.throws(() => m.claim('Index.html', 'copy public'), /case-insensitive/, 'case-folded');
  assert.throws(() => m.claim('cname', 'page /cname/'), /case-insensitive/, 'case-folded reverse');
});

test('nav validation: built:true must resolve to a registered page; duplicates refused', () => {
  const site = {
    nav: [{ label: 'Geometry', href: '/tools/fov/', built: true }],
    footNav: [{ label: 'About', href: '/about/', built: false }],
  };
  assert.throws(() => validateNav(site, [{ path: '/' }]), /no page is registered/);
  validateNav(site, [{ path: '/' }, { path: '/tools/fov/' }]); // ok
  assert.throws(
    () => validateNav({ nav: [], footNav: [] }, [{ path: '/' }, { path: '/' }]),
    /duplicate page path/,
  );
});
