// SG-B5 gate: the conventions dataset honors its published schema and the
// dataset's own honesty rules (null-beats-guess, sourced fields, adjudicated
// conflicts documented). Stdlib-only structural validation mirroring
// src/data/schema/game-fov-conventions.schema.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/game-fov-conventions.v1.json'), 'utf8'));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAPPINGS = ['visibleEnvelope', 'centerSpan', 'verticalSpan', 'physical-geometry', null];
const TRIPLE = ['native-multi-projection', 'experimental-native-multi-projection', 'single-span', 'unsupported', null];

test('dataset header', () => {
  assert.match(data.version, /^1\./);
  assert.equal(data.dataset, 'game-fov-conventions');
  assert.ok(data.license.length > 0);
  assert.ok(data.method.length > 0);
  assert.ok(data.records.length >= 13, 'core 8 + 5 no-conversion records');
});

for (const rec of data.records) {
  test(`record: ${rec.game}`, () => {
    assert.ok(['convertible', 'no-conversion'].includes(rec.status));
    assert.ok(['high', 'medium', 'low'].includes(rec.confidence));
    assert.match(rec.lastVerified, ISO);
    assert.ok(rec.notes && rec.notes.length > 0, 'notes are mandatory — they carry the null reasons');
    assert.ok(['horizontal', 'vertical', null].includes(rec.convention.axis));
    assert.ok(rec.convention.note && rec.convention.note.length > 0);
    assert.ok(MAPPINGS.includes(rec.calculatorMapping));
    assert.ok(TRIPLE.includes(rec.tripleMode));

    // sources: at least one, all https, all dated
    assert.ok(rec.sources.length >= 1, 'every record needs at least one source');
    for (const s of rec.sources) {
      assert.match(s.url, /^https:\/\//, `${rec.game}: source url`);
      assert.ok(s.kind.length > 0);
      assert.match(s.retrieved, ISO);
    }

    if (rec.range !== null) {
      assert.equal(typeof rec.range.min, 'number');
      assert.equal(typeof rec.range.max, 'number');
      assert.ok(rec.range.max > rec.range.min);
    }
    if (rec.step !== null) assert.equal(typeof rec.step, 'number');

    if (rec.status === 'convertible') {
      assert.ok(rec.units, 'convertible records name their units');
      assert.ok(rec.calculatorMapping !== null, 'convertible records map to a calculator output');
      // The honesty invariant: a convertible record with an UNRESOLVED axis
      // may only ship as low-confidence physical-geometry guidance.
      if (rec.convention.axis === null) {
        assert.equal(rec.confidence, 'low', `${rec.game}: null axis must be low confidence`);
        assert.equal(rec.calculatorMapping, 'physical-geometry', `${rec.game}: null axis must route to the geometry tool`);
      }
    } else {
      assert.equal(rec.calculatorMapping, null, 'no-conversion records must not map to calculator outputs');
    }
  });
}

test('the eight core games and five no-conversion titles are all present', () => {
  const names = data.records.map((r) => r.game);
  for (const g of ['iRacing', 'Assetto Corsa', 'Assetto Corsa Competizione', 'Automobilista 2', 'rFactor 2', 'Le Mans Ultimate', 'RaceRoom Racing Experience', 'BeamNG.drive']) {
    assert.ok(names.includes(g), g);
  }
  assert.equal(data.records.filter((r) => r.status === 'no-conversion').length, 5);
});
