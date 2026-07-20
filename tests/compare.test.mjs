// Curated-pair comparison gates: same reader-first honesty rules as the
// Value Lab, plus pair-specific invariants (both records linked, no winner
// language, sources present). Inert until the wheelbase dataset exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPARE_PAGES } from '../src/content/compare.mjs';
import { WHEELBASE_DATA, WHEELBASE_PAGES } from '../src/content/wheelbases.mjs';

if (WHEELBASE_DATA === null) {
  test('compare pages are inert without the dataset', () => {
    assert.equal(COMPARE_PAGES.length, 0);
  });
} else {
  test('every comparison page exists with unique path and full metadata', () => {
    assert.ok(COMPARE_PAGES.length >= 1);
    const paths = COMPARE_PAGES.map((p) => p.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const page of COMPARE_PAGES) {
      assert.match(page.path, /^\/compare\/[a-z0-9-]+\/$/);
      assert.ok(page.title && page.description && page.body);
    }
  });

  test('reader-first invariants: no winner, no verdict, no experience claims', () => {
    const BANNED = /\b(winner|we recommend|best overall|our pick|verdict|value score|our score|rating|better choice|decides it|Research Desk|research pass)\b/i;
    for (const page of COMPARE_PAGES) {
      for (const surface of [page.body, page.title, page.description]) {
        assert.doesNotMatch(surface, BANNED, `${page.path}: no verdict language on any surface`);
      }
      assert.match(page.body, /have not driven/, `${page.path}: carries the not-driven disclosure`);
      assert.match(page.body, /published specifications only/, `${page.path}: scope statement present`);
    }
  });

  test('moza r3-vs-r5: every demanded claim is on the page and sourced', () => {
    const page = COMPARE_PAGES.find((p) => p.path === '/compare/moza-r3-vs-r5/');
    assert.ok(page, 'the demand-justified pair exists');
    // record cross-links, both directions
    assert.match(page.body, /href="\/wheelbases\/moza-racing\/r3-racing-bundle/);
    assert.match(page.body, /href="\/wheelbases\/moza-racing\/r5-racing-bundle/);
    for (const slug of ['r3-racing-bundle', 'r5-racing-bundle']) {
      const recPage = WHEELBASE_PAGES.find((p) => p.path.includes(`/moza-racing/${slug}`));
      assert.ok(recPage?.body.includes('href="/compare/moza-r3-vs-r5/"'), `${slug} record page links back to the comparison`);
    }
    // the claims the page makes, verbatim-checked
    for (const claim of [/3\.9 Nm/, /5\.5 Nm/, /60 W/, /84 W/, /15-bit/, /ESX/, /\bES wheel\b/, /SR-P Lite/, /50 mm/]) {
      assert.match(page.body, claim, `claim present: ${claim}`);
    }
    assert.match(page.body, /PlayStation: No/, 'PlayStation non-support stated in the table');
    // the FAQ that supports the ESX/PlayStation claims must be linked
    assert.match(page.body, /support\.mozaracing\.com[^"]*wheel-base-faqs/, 'MOZA wheel-base FAQ linked as a source');
    // MOZA price rule: no invented prices on the comparison either
    assert.doesNotMatch(page.body, /\$\d+/, 'no price figures for MOZA pending a permitted source');
  });
}
