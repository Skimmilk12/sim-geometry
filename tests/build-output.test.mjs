// B1.1 gate: correctness of generated output, not just determinism.
// Runs real builds into tmp sg-build-* dirs and inspects the results,
// including a production-mode fixture (SG_PRELAUNCH=0).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GUIDES } from '../src/content/guides.mjs';
import { SITE } from '../src/site.config.mjs';

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
    assert.equal((home.match(/id="fov-form"/g) ?? []).length, 1, 'homepage contains one calculator form');
    assert.doesNotMatch(home, /class="research-card"|Direct-Drive Value Lab|Console-Safe Upgrade Planner|Open CC BY Dataset/,
      'homepage omits the unbuilt research roadmap');
    assert.doesNotMatch(home, /class="data-method"|id="data-method-title"/,
      'homepage omits the former Data & Method section');
    assert.equal((home.match(/class="home-guide-link"/g) ?? []).length, 6,
      'homepage contains six benefit-titled guide links');
    for (const guide of GUIDES) {
      assert.match(home, new RegExp(`href="/guides/${guide.slug}/"`),
        `homepage links ${guide.slug}`);
    }
    assert.match(home, /id="copy-share-card"/, 'homepage calculator includes the share-card action');
    assert.match(home, /href="\/styles\/tool\.css"/, 'homepage carries the shared calculator styling');
    assert.match(home, /src="\/js\/tools\/fov-ui\.mjs"/, 'homepage carries the shared calculator controller');
    const tool = fs.readFileSync(path.join(out, 'tools/fov/index.html'), 'utf8');
    const metaDescription = (html) => html.match(/<meta name="description" content="([^"]+)">/)[1];
    assert.notEqual(metaDescription(home), metaDescription(tool), 'home and canonical tool descriptions stay distinct');
    assert.match(home, /<h1>Get the right view for your rig\.<\/h1>/);
    assert.match(tool, /<h1>Get the FOV your rig actually covers\.<\/h1>/);
    assert.ok(fs.existsSync(path.join(out, '.nojekyll')), '.nojekyll present');
    assert.ok(fs.existsSync(path.join(out, 'styles/base.css')), 'css copied');
    assert.doesNotMatch(home, /aria-disabled="true"|Wheelbases|Upgrade Planner/,
      'chrome contains no unbuilt roadmap links');
    const footer = home.match(/<footer class="sg-foot">([\s\S]*?)<\/footer>/)?.[1] ?? '';
    assert.equal((footer.match(/<a(?: class="quiet")? href=/g) ?? []).length, 4,
      'footer contains four utility links');
    for (const label of ['About', 'Guides', 'Privacy', 'Methodology']) assert.match(footer, new RegExp(`>${label}<`));
    assert.doesNotMatch(footer, new RegExp(SITE.credo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      'credo is absent from site chrome');
    assert.doesNotMatch(footer, /Every number on this site|We do not review hardware/,
      'footer contains no publisher-process prose');
    assert.doesNotMatch(home, /style="/, 'no inline styles in generated pages');
    assert.match(home, /googletagmanager\.com\/gtag\/js\?id=G-MPKRBBQCHF/, 'GA4 stream wired');
    // mojibake guard: UTF-8 bytes read as ANSI leave â€ sequences (the PS5.1 trap)
    for (const page of ['index.html', 'tools/fov/index.html']) {
      const html = fs.readFileSync(path.join(out, page), 'utf8');
      assert.doesNotMatch(html, /â€|Ã©|Â°/, `${page} carries no encoding mojibake`);
    }
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

test('robots and sitemap outputs cover registered non-embed pages', () => {
  const out = build();
  try {
    const robotsFile = path.join(out, 'robots.txt');
    const sitemapFile = path.join(out, 'sitemap.xml');
    assert.ok(fs.existsSync(robotsFile), 'robots.txt exists');
    assert.ok(fs.existsSync(sitemapFile), 'sitemap.xml exists');

    const robots = fs.readFileSync(robotsFile, 'utf8');
    assert.match(robots, /^User-agent: \*\nAllow: \/\nSitemap: https:\/\/simgeometry\.com\/sitemap\.xml\n$/);

    const sitemap = fs.readFileSync(sitemapFile, 'utf8');
    assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n(?:  <url>\n    <loc>https:\/\/simgeometry\.com\/[^<]*<\/loc>\n  <\/url>\n?)+<\/urlset>\n$/);
    assert.match(sitemap, /<loc>https:\/\/simgeometry\.com\/<\/loc>/, 'home is present');
    assert.match(sitemap, /<loc>https:\/\/simgeometry\.com\/tools\/fov\/<\/loc>/, 'FOV tool is present');
    assert.match(sitemap, /<loc>https:\/\/simgeometry\.com\/embed\/<\/loc>/, 'embed docs are present');
    for (const route of ['about', 'methodology', 'privacy']) {
      assert.ok(fs.existsSync(path.join(out, route, 'index.html')), `/${route}/ page exists`);
      assert.match(sitemap, new RegExp(`<loc>https:\\/\\/simgeometry\\.com\\/${route}\\/<\\/loc>`),
        `/${route}/ is present in sitemap`);
    }
    const about = fs.readFileSync(path.join(out, 'about', 'index.html'), 'utf8');
    const methodology = fs.readFileSync(path.join(out, 'methodology', 'index.html'), 'utf8');
    const privacy = fs.readFileSync(path.join(out, 'privacy', 'index.html'), 'utf8');
    assert.match(about, /Sim Geometry Research Desk/);
    assert.match(about, /without invented experience/i);
    assert.match(methodology, /Source hierarchy/);
    assert.match(methodology, /No-scrape stance/);
    assert.match(privacy, /Google Analytics 4/);
    assert.match(privacy, /does not load GA4, set cookies, or make third-party requests/);
    assert.doesNotMatch(sitemap, /<loc>https:\/\/simgeometry\.com\/embed\/fov\/<\/loc>/, 'embed is excluded');
    assert.doesNotMatch(sitemap, /<lastmod>/, 'sitemap has no runtime dates');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
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

test('a public/ file colliding with a generated sitemap fails the build', () => {
  const fix = isolatedFixture((root) => {
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), 'colliding file');
  });
  try {
    assert.throws(() => buildIn(fix), /output collision/);
  } finally {
    fs.rmSync(fix, { recursive: true, force: true });
  }
});

test('a failing preflight leaves the previous output tree byte-identical', () => {
  const fix = isolatedFixture(() => {});
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-build-'));
  const hashTree = (dir) => {
    const crypto = createHash('sha256');
    const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.join(e.parentPath ?? e.path, e.name))
      .sort();
    for (const f of files) {
      const rel = path.relative(dir, f).replaceAll('\\', '/');
      const body = fs.readFileSync(f);
      crypto.update(`${rel.length}:${rel}|${body.length}:`);
      crypto.update(body);
    }
    return crypto.digest('hex');
  };
  try {
    // first, a good build into out
    execFileSync(process.execPath, [path.join(fix, 'scripts/build.mjs')], {
      env: { ...process.env, BUILD_OUT: out },
    });
    const before = hashTree(out);
    // now plant a collision and rebuild into the SAME out — must fail in
    // preflight and leave the ENTIRE previous tree intact
    fs.mkdirSync(path.join(fix, 'public'), { recursive: true });
    fs.writeFileSync(path.join(fix, 'public', 'index.html'), 'boom');
    assert.throws(() => execFileSync(process.execPath, [path.join(fix, 'scripts/build.mjs')], {
      env: { ...process.env, BUILD_OUT: out },
    }));
    assert.equal(hashTree(out), before, 'entire previous output tree preserved after failed preflight');
  } finally {
    fs.rmSync(fix, { recursive: true, force: true });
    fs.rmSync(out, { recursive: true, force: true });
  }
});
