// Gate for SG-B1: a clean rebuild is deterministic — two builds of the same src
// produce byte-identical trees.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function hashTree(dir) {
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
    .sort();
  const h = crypto.createHash('sha256');
  for (const f of entries) {
    const rel = path.relative(dir, f).replaceAll('\\', '/');
    const body = fs.readFileSync(f);
    // length-prefix both fields so path/content concatenation is unambiguous
    h.update(`${rel.length}:${rel}|${body.length}:`);
    h.update(body);
  }
  return { digest: h.digest('hex'), count: entries.length };
}

test('src -> dist build is deterministic', () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-a-'));
  const b = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-b-'));
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], { env: { ...process.env, BUILD_OUT: a } });
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], { env: { ...process.env, BUILD_OUT: b } });
    const ha = hashTree(a);
    const hb = hashTree(b);
    assert.ok(ha.count > 0, 'build produced files');
    assert.equal(ha.digest, hb.digest, 'two builds are byte-identical');
  } finally {
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  }
});
