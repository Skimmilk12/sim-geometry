// Upgrade-path page gates: disambiguation up front, PS-preserving list derived
// from the dataset, nothing-carries-over honesty, no verdict language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADE_PAGES } from '../src/content/upgrades.mjs';
import { COMPAT_PAGES } from '../src/content/compatibility.mjs';
import { WHEELBASE_DATA, WHEELBASE_PAGES, recordPath } from '../src/content/wheelbases.mjs';

if (WHEELBASE_DATA === null) {
  test('upgrade pages are inert without the dataset', () => {
    assert.equal(UPGRADE_PAGES.length, 0);
  });
} else {
  test('g29 upgrade page: disambiguation, dataset-derived PS list, honesty invariants', () => {
    const page = UPGRADE_PAGES.find((p) => p.path === '/upgrades/logitech-g29/');
    assert.ok(page, 'page exists');
    const BANNED = /\b(winner|we recommend|we suggest|best overall|best upgrade|best path|best choice|top pick|our pick|ideal choice|verdict|value score|our score|rating|Research Desk|research pass)\b/i;
    for (const surface of [page.body, page.title, page.description]) {
      assert.doesNotMatch(surface, BANNED, 'no verdict language on any surface');
    }
    // Codex directive: the replace-vs-modify split must come BEFORE any path
    // content — assert it appears before the first h2 that isn't the
    // disambiguation section itself.
    const disambigIdx = page.body.indexOf('not about modifying');
    assert.ok(disambigIdx > 0, 'disambiguation present');
    assert.ok(disambigIdx < page.body.indexOf('What replacing a G29'), 'disambiguation comes first');
    assert.match(page.body, /have not driven/, 'disclosure present');
    // every PS-supporting record appears exactly once; no PS-unsupported record is listed as a path
    for (const rec of WHEELBASE_DATA.records) {
      const count = page.body.split(`href="${recordPath(rec)}"`).length - 1;
      assert.equal(count, rec.platforms.ps.supported ? 1 : 0,
        `${recordPath(rec)} listed iff PlayStation-supported`);
    }
    assert.match(page.body, /href="\/compatibility\/ps5-racing-wheels\/"/, 'links the matrix');
    assert.match(page.body, /Assume nothing carries over/, 'carry-over honesty stated');
    // Whole-brand aggregation: the no-PS-brands sentence must name exactly the
    // brands whose EVERY record is unsupported — never a brand with a
    // PS-licensed product (the Fanatec/Thrustmaster regression).
    const noBrandSentence = page.body.match(/publish no PlayStation support\s*\(([^)]+)\)/)?.[1] ?? '';
    const expected = [...new Set(WHEELBASE_DATA.records.map((r) => r.brand))]
      .filter((b) => WHEELBASE_DATA.records.filter((r) => r.brand === b).every((r) => !r.platforms.ps.supported));
    for (const b of expected) assert.ok(noBrandSentence.includes(b), `${b} listed as no-PS brand`);
    for (const b of ['Fanatec', 'Thrustmaster', 'Logitech G']) {
      assert.ok(!noBrandSentence.includes(b), `${b} must NOT be listed as a no-PS brand`);
    }
    // Required sources and claims
    assert.match(page.body, /does not document a user-removable rim or quick-release/, 'QR claim phrased as documentation absence');
    // The Racing Adapter claim must cover BOTH the shifter and pedals, tied to
    // the RS/PRO ecosystems (not just a mention of the adapter's name)
    assert.match(page.body, /Racing Adapter[\s\S]{0,160}Driving Force Shifter and[\s\S]{0,40}pedals[\s\S]{0,60}RS and PRO/,
      'the shifter-and-pedals-to-RS/PRO exception is stated as a relationship');
    // metadata must keep the documentation-absence qualification too
    assert.match(page.description, /no published path/, 'description stays qualified');
    assert.doesNotMatch(page.description, /can.t move|cannot move/i, 'no absolute hardware claim in metadata');
    for (const url of [
      'logitechg.com/en-us/shop/p/driving-force-shifter',
      '11653359309975',
      '360023463753',
    ]) {
      assert.ok(page.body.includes(url), `source cited: ${url}`);
    }
    assert.match(page.body, /<details>/, 'sources block present');
    // the PS5 matrix links back to this page
    const matrix = COMPAT_PAGES.find((p) => p.path === '/compatibility/ps5-racing-wheels/');
    assert.match(matrix.body, /href="\/upgrades\/logitech-g29\/"/, 'matrix backlink present');
  });

  test('record descriptions: dimensions only when published; price availability always', () => {
    for (const rec of WHEELBASE_DATA.records) {
      const page = WHEELBASE_PAGES.find((p) => p.path === recordPath(rec));
      if (rec.dimensions) {
        assert.match(page.description, /dimensions/, `${page.path}: dimensions promised when published`);
      } else {
        assert.doesNotMatch(page.description, /dimensions/, `${page.path}: no dimensions promise when null`);
      }
      assert.match(page.description, /price availability/, `${page.path}: price framed as availability`);
    }
  });

  test('titleNote records render the exact expected titles', () => {
    const expected = {
      'r3-racing-bundle': 'MOZA Racing R3 (3.9 Nm, Xbox) specs',
      'r5-racing-bundle': 'MOZA Racing R5 (5.5 Nm, PC) specs',
      't598': 'Thrustmaster T598 (5 Nm, PS/PC) specs',
      'clubsport-dd-18': 'Fanatec ClubSport DD+ (18 Nm, PS) specs',
      'rs50-base': 'Logitech G RS50 Base (8 Nm) specs',
    };
    for (const [slugPart, title] of Object.entries(expected)) {
      const page = WHEELBASE_PAGES.find((p) => p.path.includes(slugPart));
      assert.ok(page, `${slugPart}: page found`);
      assert.equal(page.title, title, `${slugPart}: exact title`);
    }
  });

  test('record titles carry the torque figure exactly once', async () => {
    const { WHEELBASE_PAGES } = await import('../src/content/wheelbases.mjs');
    for (const rec of WHEELBASE_DATA.records) {
      const nm = rec.torque?.peakNm ?? rec.torque?.holdingNm;
      if (nm == null) continue;
      const page = WHEELBASE_PAGES.find((p) => p.path === recordPath(rec));
      const hits = page.title.split(`${nm} Nm`).length - 1;
      assert.equal(hits, 1, `${page.title}: torque figure appears exactly once`);
    }
  });
}
