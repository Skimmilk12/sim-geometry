// Compatibility-page gates: sourced yes/no answers, no review language, no
// invented support, adapters never labeled console-safe. Inert without the
// wheelbase dataset.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPAT_PAGES } from '../src/content/compatibility.mjs';
import { WHEELBASE_DATA, recordPath } from '../src/content/wheelbases.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/console-compat.v1.json'), 'utf8'));

if (WHEELBASE_DATA === null) {
  test('compatibility pages are inert without the dataset', () => {
    assert.equal(COMPAT_PAGES.length, 0);
  });
} else {
  test('legacy-wheel dataset shape and honesty', () => {
    assert.equal(LEGACY.records.length, 3);
    for (const rec of LEGACY.records) {
      assert.ok(rec.product && rec.platforms && rec.sources.length >= 1, `${rec.product}: sourced`);
      for (const s of rec.sources) {
        assert.match(s.url, /^https:\/\//);
        assert.match(s.retrieved, /^\d{4}-\d{2}-\d{2}$/);
      }
      assert.ok(['high', 'medium', 'low'].includes(rec.confidence));
      assert.ok(rec.notes.length > 0);
      // a supported console must state its condition; a denial must say why/what instead
      for (const key of ['ps', 'xbox']) {
        assert.ok(rec.platforms[key].condition, `${rec.product}: ${key} condition stated`);
      }
    }
  });

  test('three pages exist with the reader-first invariants', () => {
    assert.equal(COMPAT_PAGES.length, 3);
    const BANNED = /\b(best (ps5|xbox|racing) wheel|winner|we recommend|best overall|our pick|verdict|value score|our score|rating|Research Desk|research pass)\b/i;
    for (const page of COMPAT_PAGES) {
      for (const surface of [page.body, page.title, page.description]) {
        assert.doesNotMatch(surface, BANNED, `${page.path}: no review/verdict language`);
      }
      assert.match(page.body, /have not driven/, `${page.path}: disclosure present`);
      assert.match(page.body, /<details>/, `${page.path}: sources block present`);
      // scope honesty extends to metadata: no every/any-current overclaims,
      // no makers-own-pages claim (one brand's rows are retailer-sourced)
      for (const surface of [page.title, page.description]) {
        assert.doesNotMatch(surface, /\b(every|any) current\b/i, `${page.path}: metadata scoped to the dataset`);
        assert.doesNotMatch(surface, /makers.{0,3} own pages/i, `${page.path}: metadata does not overclaim sourcing`);
      }
    }
  });

  test('ps5 matrix: G920 and MOZA in the No section, licensed gear in the Yes section', () => {
    const page = COMPAT_PAGES.find((p) => p.path === '/compatibility/ps5-racing-wheels/');
    // Split on the section HEADING, not the bare phrase (which also appears in
    // row conditions).
    const idx = page.body.indexOf('<h2>No PlayStation support</h2>');
    assert.ok(idx > 0, 'No-support section heading present');
    const yesSection = page.body.slice(0, idx);
    const noSection = page.body.slice(idx);
    assert.match(yesSection, /G29/);
    assert.match(yesSection, /G923/);
    assert.match(yesSection, /Gran Turismo DD Pro/);
    assert.match(yesSection, /ClubSport DD\+/);
    assert.match(yesSection, /T598/);
    assert.match(noSection, /G920/);
    assert.match(noSection, /MOZA/);
    assert.match(noSection, /Simucube/);
    // Exact completeness: every record's path appears EXACTLY once, in the
    // bucket its dataset ps field dictates. No duplicates, no omissions.
    for (const rec of WHEELBASE_DATA.records) {
      const href = `href="${recordPath(rec)}"`;
      const count = page.body.split(href).length - 1;
      assert.equal(count, 1, `${recordPath(rec)} appears exactly once in the matrix`);
      const bucket = rec.platforms.ps.supported ? yesSection : noSection;
      assert.ok(bucket.includes(href), `${recordPath(rec)} is in the dataset-dictated bucket`);
    }
  });

  test('moza pages: ESX rule sourced, adapters never called safe, cross-links present', () => {
    const xbox = COMPAT_PAGES.find((p) => p.path === '/compatibility/moza-xbox/');
    const ps5 = COMPAT_PAGES.find((p) => p.path === '/compatibility/moza-ps5/');
    assert.match(xbox.body, /ESX/, 'the license rule is stated');
    assert.match(xbox.body, /wheel-base-faqs/, 'MOZA FAQ linked');
    assert.match(xbox.body, /conflicts with\s+itself/, 'the R9 source conflict is disclosed');
    assert.match(ps5.body, /wheel-base-faqs/, 'MOZA FAQ linked');
    assert.match(ps5.body, /does\s+not treat any unofficial adapter as console-safe/,
      'the adapter stance is stated explicitly');
    assert.doesNotMatch(ps5.body, /\badapters? (are|is) (safe|supported|fine|recommended|a good)/i,
      'no adapter is presented as working or safe');
    assert.match(ps5.body, /href="\/compatibility\/ps5-racing-wheels\/"/, 'routes readers to the licensed list');
    assert.match(xbox.body, /href="\/compatibility\/moza-ps5\/"/);
    // every MOZA record in the dataset appears exactly once on each page
    const moza = WHEELBASE_DATA.records.filter((r) => r.brand === 'MOZA Racing');
    assert.ok(moza.length >= 4, 'dataset has the MOZA bases');
    for (const rec of moza) {
      for (const page of [xbox, ps5]) {
        const count = page.body.split(`href="${recordPath(rec)}"`).length - 1;
        assert.equal(count, 1, `${page.path} covers ${rec.model} exactly once`);
      }
    }
  });
}
