// Value Lab gates: dataset honors its schema and honesty rules; pages
// generate for every record; reader-first invariants (no scores, no process
// prose, nulls stated plainly). Skips gracefully until the dataset lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WHEELBASE_PAGES, WHEELBASE_DATA, wbSlug, recordPath } from '../src/content/wheelbases.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = path.join(ROOT, 'src/data/wheelbases.v1.json');
const ISO = /^\d{4}-\d{2}-\d{2}$/;

test('pipeline is inert until the dataset exists', () => {
  if (!fs.existsSync(DATA_FILE)) {
    assert.equal(WHEELBASE_PAGES.length, 0);
    assert.equal(WHEELBASE_DATA, null);
  }
});

// Minimal JSON-Schema validator for the subset our schema uses (type unions,
// enum, const, required, properties, items, pattern, minLength/minItems, $defs
// refs). No-dependency rule forbids ajv; this keeps the shipped schema honest.
function validateSchema(schema, value, path, errors, root) {
  if (schema.$ref) {
    return validateSchema(root.$defs[schema.$ref.replace('#/$defs/', '')], value, path, errors, root);
  }
  if (schema.const !== undefined) {
    if (value !== schema.const) errors.push(`${path}: expected const ${schema.const}`);
    return;
  }
  if (schema.enum) {
    if (!schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
    return;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const t = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (!types.includes(t)) { errors.push(`${path}: type ${t} not in [${types}]`); return; }
  }
  if (typeof value === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: pattern ${schema.pattern} fails`);
    if (schema.minLength && value.length < schema.minLength) errors.push(`${path}: below minLength`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${path}: below minItems`);
    if (schema.items) value.forEach((v, i) => validateSchema(schema.items, v, `${path}[${i}]`, errors, root));
  } else if (value && typeof value === 'object') {
    for (const req of schema.required ?? []) {
      if (!(req in value)) errors.push(`${path}.${req}: required key missing`);
    }
    for (const [k, sub] of Object.entries(schema.properties ?? {})) {
      if (k in value) validateSchema(sub, value[k], `${path}.${k}`, errors, root);
    }
  }
}

if (fs.existsSync(DATA_FILE)) {
  const data = WHEELBASE_DATA;

  test('dataset validates against its shipped JSON Schema', () => {
    const schema = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/schema/wheelbases.schema.json'), 'utf8'));
    const errors = [];
    validateSchema(schema, data, 'data', errors, schema);
    assert.deepEqual(errors, [], 'schema violations');
  });

  test('field-to-source coverage: torque, price, platforms, warranty each cite a source', () => {
    for (const r of data.records) {
      const coverText = r.sources.flatMap((s) => s.covers ?? []).join(' ').toLowerCase();
      const id = `${r.brand} ${r.model} ${r.variant}`;
      if (r.torque.peakNm !== null || r.torque.holdingNm !== null) {
        assert.match(coverText, /torque/, `${id}: no source covers torque`);
      }
      if (r.priceUSD?.amount !== null && r.priceUSD?.amount !== undefined) {
        assert.match(coverText, /price/, `${id}: no source covers price`);
      }
      assert.match(coverText, /platform|licens|xbox|playstation/, `${id}: no source covers platforms`);
      if (r.warranty !== null) {
        assert.match(coverText, /warrant|guarantee/, `${id}: no source covers warranty`);
      }
    }
  });

  test('wheelbase dataset header + record shape', () => {
    assert.match(data.version, /^1\./);
    assert.equal(data.dataset, 'wheelbases');
    assert.ok(data.records.length >= 20, 'day-one coverage is ~21 configurations');
    for (const r of data.records) {
      assert.ok(r.brand && r.model, 'identity');
      assert.ok(['current', 'discontinued', 'announced'].includes(r.lifecycle));
      assert.ok(['base', 'bundle'].includes(r.productType));
      assert.ok(['high', 'medium', 'low'].includes(r.confidence));
      assert.match(r.lastVerified, ISO);
      assert.ok(r.notes && r.notes.length > 0, `${r.model}: notes carry null reasons`);
      assert.ok(Array.isArray(r.sources) && r.sources.length >= 1, `${r.model}: sourced`);
      for (const s of r.sources) {
        assert.match(s.url, /^https:\/\//);
        assert.match(s.retrieved, ISO);
      }
      // torque honesty: claimType must exist when any torque number exists
      if (r.torque.peakNm !== null || r.torque.holdingNm !== null) {
        assert.ok(r.torque.claimType, `${r.model}: torque number without claim type`);
      }
      // price honesty: an amount requires a source and date
      if (r.priceUSD && r.priceUSD.amount !== null) {
        assert.ok(r.priceUSD.source, `${r.model}: price without source`);
        assert.match(r.priceUSD.retrieved, ISO);
      }
      // base-only units must say what else the buyer needs
      if (r.productType === 'base') {
        assert.ok(r.requiredNotIncluded.length >= 1, `${r.model}: base-only unit must list requiredNotIncluded`);
      }
    }
  });

  test('unique record paths; hub + one page per record', () => {
    assert.equal(WHEELBASE_PAGES.length, data.records.length + 1);
    const paths = WHEELBASE_PAGES.map((p) => p.path);
    assert.equal(new Set(paths).size, paths.length, 'no path collisions');
    assert.ok(paths.includes('/wheelbases/'));
    for (const p of paths) assert.match(p, /^\/wheelbases\//);
  });

  test('reader-first invariants: no scores, no verdict language, no process prose', () => {
    for (const page of WHEELBASE_PAGES) {
      assert.doesNotMatch(page.body, /\b(value score|our score|rating|winner|best overall|we recommend|Research Desk|research pass)\b/i,
        `${page.path}: no scores/verdicts/process prose`);
      assert.match(page.body, /have not driven/,
        `${page.path}: carries the not-driven disclosure`);
    }
  });

  test('every record page links every source', () => {
    for (const rec of data.records) {
      const page = WHEELBASE_PAGES.find((p) => p.path === recordPath(rec));
      assert.ok(page, `${rec.brand} ${rec.model} ${rec.variant}: page exists`);
      for (const s of rec.sources) {
        assert.ok(page.body.includes(s.url), `${rec.model}: source ${s.url} linked`);
      }
    }
  });
}
