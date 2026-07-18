// SG-B7c gate: the launch-guide block is complete, discoverable, source-linked,
// and reproducible through calculator share fragments.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { GUIDES, GUIDE_PAGES, GUIDE_SOURCES } from '../src/content/guides.mjs';
import { SITE } from '../src/site.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function textWordCount(html) {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|rsquo|ldquo|rdquo|times|divide);/g, ' ')
    .replace(/[^\p{L}\p{N}°±’–-]+/gu, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

test('guide registry has exactly six canonical, unique launch guides', () => {
  assert.equal(GUIDES.length, 6);
  assert.equal(GUIDE_PAGES.length, 6);
  assert.equal(new Set(GUIDES.map((guide) => guide.slug)).size, 6);
  for (const [index, guide] of GUIDES.entries()) {
    assert.equal(GUIDE_PAGES[index].path, `/guides/${guide.slug}/`);
    assert.ok(guide.description.length >= 150 && guide.description.length <= 160,
      `${guide.slug}: meta description is ${guide.description.length} chars`);
    const words = textWordCount(guide.content);
    assert.ok(words >= 900 && words <= 1500, `${guide.slug}: ${words} words`);
  }
});

test('guide game citations are drawn from the conventions dataset source set', () => {
  const data = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src/data/game-fov-conventions.v1.json'),
    'utf8',
  ));
  const allowed = new Set(data.records.flatMap((record) => record.sources.map((source) => source.url)));
  for (const url of Object.values(GUIDE_SOURCES)) {
    assert.ok(allowed.has(url), `guide source must come from dataset: ${url}`);
  }
});

test('built guide hub and pages satisfy sitemap, source, share-state, and reader-first chrome gates', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-guides-'));
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], {
      env: { ...process.env, BUILD_OUT: out },
    });

    const hubFile = path.join(out, 'guides', 'index.html');
    assert.ok(fs.existsSync(hubFile), '/guides/ hub exists');
    const hub = fs.readFileSync(hubFile, 'utf8');
    assert.equal((hub.match(/class="guide-card panel"/g) ?? []).length, 6);
    assert.match(hub, /href="\/guides\/how-to-measure-eye-to-screen-distance\/"/);

    const sitemap = fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /<loc>https:\/\/simgeometry\.com\/guides\/<\/loc>/);
    for (const guide of GUIDES) {
      const route = `/guides/${guide.slug}/`;
      assert.match(sitemap, new RegExp(`<loc>https:\\/\\/simgeometry\\.com${route}<\\/loc>`),
        `${route} appears in sitemap`);

      const html = fs.readFileSync(path.join(out, 'guides', guide.slug, 'index.html'), 'utf8');
      const externalUrls = new Set(
        [...html.matchAll(/href="(https:\/\/[^"#]+)"/g)].map((match) => match[1]),
      );
      assert.ok(externalUrls.size >= 2, `${guide.slug}: at least two external sources`);
      assert.match(html, /href="\/tools\/fov\/#v=1&amp;l=/,
        `${guide.slug}: calculator link carries a prefilled share fragment`);
      assert.doesNotMatch(html, /class="guide-tool-link" href="\/tools\/fov\/"/,
        `${guide.slug}: no bare calculator guide CTA`);
      assert.doesNotMatch(html, /class="guide-credo"/,
        `${guide.slug}: guide-specific credo line is absent`);
      assert.doesNotMatch(html, new RegExp(SITE.credo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${guide.slug}: credo is absent from guide body and chrome`);
      assert.doesNotMatch(html, /Every number on this site|We do not review hardware/,
        `${guide.slug}: footer process prose is absent`);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
