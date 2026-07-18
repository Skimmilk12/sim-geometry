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
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/schema/game-fov-conventions.schema.json'), 'utf8'));

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAPPINGS = ['horizontalSpan', 'verticalSpan', 'centerSpan', 'visibleEnvelope', 'physical-geometry', null];
const TRIPLE = ['native-multi-projection', 'experimental-native-multi-projection', 'single-span', 'unsupported', null];

test('dataset header', () => {
  assert.match(data.version, /^1\./);
  assert.equal(data.dataset, 'game-fov-conventions');
  assert.ok(data.license.length > 0);
  assert.ok(data.method.length > 0);
  assert.ok(data.records.length >= 13, 'core 8 + 5 no-conversion records');
});

test('schema freezes layout mappings and honesty invariants', () => {
  const recordSchema = schema.properties.records.items;
  const mappingSchema = recordSchema.properties.calculatorMapping;
  assert.deepEqual(mappingSchema.required, ['single', 'triple']);
  assert.equal(mappingSchema.additionalProperties, false);
  assert.deepEqual(mappingSchema.properties.single.enum, MAPPINGS);
  assert.deepEqual(mappingSchema.properties.triple.enum, MAPPINGS);

  const noConversion = recordSchema.allOf.find((rule) => rule.if?.properties?.status?.const === 'no-conversion');
  assert.equal(noConversion.then.properties.calculatorMapping.properties.single.const, null);
  assert.equal(noConversion.then.properties.calculatorMapping.properties.triple.const, null);

  const nullAxisConvertible = recordSchema.allOf.find((rule) =>
    rule.if?.properties?.status?.const === 'convertible' &&
    rule.if?.properties?.convention?.properties?.axis?.type === 'null'
  );
  assert.equal(nullAxisConvertible.then.properties.confidence.const, 'low');
  assert.equal(nullAxisConvertible.then.properties.calculatorMapping.properties.triple.const, 'physical-geometry');
});

for (const rec of data.records) {
  test(`record: ${rec.game}`, () => {
    assert.ok(['convertible', 'no-conversion'].includes(rec.status));
    assert.ok(['high', 'medium', 'low'].includes(rec.confidence));
    assert.match(rec.lastVerified, ISO);
    assert.ok(rec.notes && rec.notes.length > 0, 'notes are mandatory — they carry the null reasons');
    assert.ok(['horizontal', 'vertical', null].includes(rec.convention.axis));
    assert.ok(rec.convention.note && rec.convention.note.length > 0);
    assert.equal(typeof rec.calculatorMapping, 'object');
    assert.notEqual(rec.calculatorMapping, null);
    assert.deepEqual(Object.keys(rec.calculatorMapping).sort(), ['single', 'triple'], `${rec.game}: mapping shape is frozen`);
    for (const layout of ['single', 'triple']) {
      assert.ok(MAPPINGS.includes(rec.calculatorMapping[layout]), `${rec.game}: ${layout} mapping`);
    }
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
      assert.notEqual(rec.calculatorMapping.single, null, 'convertible single layouts map to a calculator output');
      assert.notEqual(rec.calculatorMapping.triple, null, 'convertible triple layouts map to a calculator output');
      // The honesty invariant: a convertible record with an UNRESOLVED axis
      // may only ship as low-confidence physical-geometry guidance.
      if (rec.convention.axis === null) {
        assert.equal(rec.confidence, 'low', `${rec.game}: null axis must be low confidence`);
        assert.equal(rec.calculatorMapping.triple, 'physical-geometry', `${rec.game}: null axis must route triples to the geometry tool`);
      }
    } else {
      assert.deepEqual(rec.calculatorMapping, { single: null, triple: null }, 'no-conversion records must not map to calculator outputs');
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

test('core-game mappings are explicit per layout', () => {
  const mappings = Object.fromEntries(data.records.map((r) => [r.game, r.calculatorMapping]));
  assert.deepEqual(mappings.iRacing, { single: 'horizontalSpan', triple: 'visibleEnvelope' });
  assert.deepEqual(mappings['Assetto Corsa'], { single: 'verticalSpan', triple: 'physical-geometry' });
  assert.deepEqual(mappings['Assetto Corsa Competizione'], { single: 'verticalSpan', triple: 'physical-geometry' });
  assert.deepEqual(mappings['Automobilista 2'], { single: 'horizontalSpan', triple: 'centerSpan' });
  assert.deepEqual(mappings['rFactor 2'], { single: 'verticalSpan', triple: 'physical-geometry' });
  assert.deepEqual(mappings['Le Mans Ultimate'], { single: 'verticalSpan', triple: 'physical-geometry' });
  assert.deepEqual(mappings['RaceRoom Racing Experience'], { single: 'physical-geometry', triple: 'physical-geometry' });
  assert.deepEqual(mappings['BeamNG.drive'], { single: 'verticalSpan', triple: 'verticalSpan' });
});

test('unsupported executable configuration claims stay non-executable', () => {
  const records = Object.fromEntries(data.records.map((r) => [r.game, r]));
  assert.equal(records.iRacing.configKey, null);
  assert.match(records.iRacing.notes, /drivingCamFOV.*no direct supporting source/i);
  assert.equal(records['Assetto Corsa'].configKey, null);
  assert.match(records['Assetto Corsa'].notes, /\[MODE\]\.FOV.*no direct supporting source/i);
  assert.equal(records['Assetto Corsa Competizione'].configKey, null);
  assert.doesNotMatch(records['Assetto Corsa Competizione'].tripleNotes, /triple(?:Width|Distance|Angle|Bezel)/);
  assert.match(records['Assetto Corsa Competizione'].notes, /tripleWidth.*unverified/i);
  assert.equal(records['BeamNG.drive'].configFile, null);
  assert.equal(records['BeamNG.drive'].configKey, null);
  assert.match(records['BeamNG.drive'].notes, /JBeam.*not verified/i);
});

test('AMS2 center-span guidance preserves evidence confidence distinctions', () => {
  const ams2 = data.records.find((r) => r.game === 'Automobilista 2');
  assert.equal(ams2.confidence, 'medium');
  assert.match(ams2.convention.note, /OFFICIAL: Reiza staff state AMS2 uses horizontal FOV/);
  assert.match(ams2.tripleNotes, /171° total -> 57; 178° total -> 59/);
  assert.match(ams2.tripleNotes, /Source: Reiza staff/);
});
