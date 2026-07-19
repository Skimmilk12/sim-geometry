// Console-compatibility pages, generated from the Value Lab dataset plus the
// small legacy-wheel dataset. Reader-first: sourced yes/no answers with the
// exact condition, never a "best PS5 wheel" list. These pages are the landing
// surface the Console-Safe Upgrade Planner will build on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WHEELBASE_DATA, recordPath } from './wheelbases.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEGACY = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'console-compat.v1.json'), 'utf8'));

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const displayName = (rec) => {
  const name = rec.model.startsWith(rec.brand) ? rec.model : `${rec.brand} ${rec.model}`;
  return rec.variant ? `${name} ${rec.variant}` : name;
};

const DISCLOSURE = `
    <p class="note">We have not driven these products. Every yes and no below is sourced with a
    retrieval date — each linked spec sheet carries its sources, including the one case where a
    maker is silent and a named authorized retailer is cited instead (the sheet says so).</p>`;

function legacySources() {
  const byUrl = new Map();
  for (const rec of LEGACY.records) for (const s of rec.sources) byUrl.set(s.url, s);
  return [...byUrl.values()].map((s) =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.kind)}</a> <span class="note">${esc((s.covers ?? []).join(', '))} · retrieved ${esc(s.retrieved)}</span></li>`).join('\n');
}

// ---------- /compatibility/ps5-racing-wheels/ ----------

function ps5Row(name, href, condition) {
  return `<tr><th scope="row">${href ? `<a href="${href}">${esc(name)}</a>` : esc(name)}</th><td>${condition}</td></tr>`;
}

function ps5Body() {
  const wb = WHEELBASE_DATA.records;
  const yes = [];
  const no = [];

  for (const rec of LEGACY.records) {
    const target = rec.platforms.ps.supported ? yes : no;
    target.push(ps5Row(rec.product, null, esc(rec.platforms.ps.condition)));
  }
  for (const rec of wb) {
    const ps = rec.platforms.ps;
    const row = ps5Row(displayName(rec), recordPath(rec), esc(ps.condition ?? (ps.supported ? 'Yes' : 'No')));
    (ps.supported ? yes : no).push(row);
  }

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / compatibility</p>
    <h1>Which racing wheels work on PS5?</h1>
    <p class="dek">Every wheel and wheelbase in our dataset, sorted into PlayStation-licensed and
    no-PlayStation-support — with the exact condition, because "compatible" often depends on which
    version you buy.</p>
    ${DISCLOSURE}
    <h2>Where the license lives</h2>
    <p>Three different rules produce most of the confusion. On Fanatec's PlayStation bases
    (Gran Turismo DD Pro, ClubSport DD+), the license is in the <strong>base</strong> — any compatible
    Fanatec wheel on top works on PS5. On Logitech and Thrustmaster gear the license is
    <strong>per version</strong>: the same model name is sold as a PlayStation/PC version and an
    Xbox/PC version, and the version you buy determines PlayStation support — though on Logitech's
    newest RS ecosystem, attached Xbox-licensed wheel hardware can add Xbox support to a
    PlayStation/PC base. And MOZA, Simucube, Asetek, and Simagic publish
    <strong>no PlayStation support at all</strong> — no version, no upgrade.</p>
    <h2>PlayStation-licensed</h2>
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">Wheels with PlayStation support</caption>
      <thead><tr><th>Product</th><th>The condition</th></tr></thead>
      <tbody>
      ${yes.join('\n      ')}
      </tbody>
    </table></div>
    <h2>No PlayStation support</h2>
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">Wheels without PlayStation support</caption>
      <thead><tr><th>Product</th><th>What the maker says</th></tr></thead>
      <tbody>
      ${no.join('\n      ')}
      </tbody>
    </table></div>
    <p class="note">MOZA owner wondering about PlayStation? The direct answer:
    <a href="/compatibility/moza-ps5/">is MOZA compatible with PS5</a>. Xbox player:
    <a href="/compatibility/moza-xbox/">which MOZA setups work on Xbox</a>.</p>
    <details><summary>Legacy-wheel sources (Logitech G29/G920/G923)</summary>
      <ul>${legacySources()}</ul>
      <p class="note">Last verified ${esc(LEGACY.records[0].lastVerified)}. Wheelbase rows link their
      full spec sheets, which carry their own dated sources; those are the sources for every
      wheelbase row on this page. This page compares published compatibility statements only.</p>
    </details>`;
}

// ---------- /compatibility/moza-xbox/ ----------

function mozaRecords() {
  return WHEELBASE_DATA.records.filter((r) => r.brand === 'MOZA Racing');
}

function mozaXboxBody() {
  const rows = mozaRecords().map((rec) => {
    const xbox = rec.platforms.xbox;
    const answer = xbox.supported
      ? `Yes <span class="note">— ${esc(xbox.condition ?? '')}</span>`
      : `No <span class="note">— ${esc(xbox.condition ?? '')}</span>`;
    return `<tr><th scope="row"><a href="${recordPath(rec)}">${esc(displayName(rec))}</a></th><td>${answer}</td></tr>`;
  }).join('\n      ');

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / compatibility</p>
    <h1>Which MOZA setups actually work on Xbox?</h1>
    <p class="dek">The one rule, then every MOZA base in our dataset with its sourced yes or no.</p>
    ${DISCLOSURE}
    <h2>The one rule: the license is in the wheel, not the base</h2>
    <p>Per MOZA's own wheel-base FAQ, Xbox support comes from attaching MOZA's Xbox-licensed
    <strong>ESX steering wheel</strong>. A MOZA base with the ESX wheel runs on Xbox Series X|S and
    Xbox One; the same base with any other MOZA wheel is PC-only. That is why the R3 Racing Bundle —
    the one bundle that ships with the ESX wheel — works on Xbox out of the box, and the others don't.</p>
    <h2>Base by base (the four MOZA bases in our dataset)</h2>
    <p class="note">MOZA's larger bases are not in the dataset yet; per MOZA's FAQ the same ESX rule
    is stated brand-wide, but this page only lists hardware we have sourced sheets for.</p>
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">MOZA Xbox compatibility</caption>
      <thead><tr><th>Product</th><th>Works on Xbox?</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table></div>
    <p>PlayStation is a different story — MOZA publishes no PlayStation support for any of this
    hardware: <a href="/compatibility/moza-ps5/">the direct answer on MOZA and PS5</a>.</p>
    <p class="note">One inconsistency worth knowing about: MOZA's R9 support page conflicts with
    itself (its spec table says Xbox-ready via ESX while its R9 V3 FAQ says PC-only). The rows above
    follow MOZA's general wheel-base FAQ; each spec sheet flags the conflict in its notes.</p>
    <details><summary>Sources</summary>
      <ul><li><a href="https://support.mozaracing.com/en/support/solutions/articles/70000627811-wheel-base-faqs" target="_blank" rel="noopener">MOZA wheel-base FAQ</a> <span class="note">Xbox condition, ESX license · retrieved 2026-07-18</span></li></ul>
      <p class="note">Each linked spec sheet carries its full dated source list. Published
      compatibility statements only.</p>
    </details>`;
}

// ---------- /compatibility/moza-ps5/ ----------

function mozaPs5Body() {
  const rows = mozaRecords().map((rec) =>
    `<tr><th scope="row"><a href="${recordPath(rec)}">${esc(displayName(rec))}</a></th><td>No <span class="note">— ${esc(rec.platforms.ps.condition ?? '')}</span></td></tr>`).join('\n      ');

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / compatibility</p>
    <h1>Is MOZA compatible with PS5? No — here is the full picture.</h1>
    <p class="dek">MOZA publishes no PlayStation support — not for the R3, not for the R5, not for
    any version or add-on wheel in our dataset. What that means in practice, stated plainly.</p>
    ${DISCLOSURE}
    <h2>What MOZA actually says</h2>
    <p>MOZA's wheel-base FAQ and product pages list PC (and, with the ESX wheel, Xbox) — PlayStation
    appears nowhere. There is no PlayStation-licensed MOZA wheel, no PlayStation version of any base,
    and no official upgrade path that adds it.</p>
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">MOZA PlayStation compatibility</caption>
      <thead><tr><th>Product</th><th>PS5 / PS4</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table></div>
    <h2>What about adapters?</h2>
    <p>Third-party converter dongles exist that present unsupported hardware to a console as a
    licensed device, and some adapter vendors publish their own MOZA-on-PS5 compatibility lists.
    Those are the vendors' claims, not MOZA's and not Sony's: MOZA's own pages list no PlayStation
    workaround, and adapter vendors' own terms state that compatibility is not guaranteed. So this
    site does not treat any unofficial adapter as console-safe, and none of the "No" answers above
    change because of them.</p>
    <h2>If PlayStation is a requirement</h2>
    <p>The hardware with published PlayStation support is collected in one sourced table:
    <a href="/compatibility/ps5-racing-wheels/">which racing wheels work on PS5</a>.</p>
    <details><summary>Sources</summary>
      <ul>
        <li><a href="https://support.mozaracing.com/en/support/solutions/articles/70000627811-wheel-base-faqs" target="_blank" rel="noopener">MOZA wheel-base FAQ</a> <span class="note">platforms · retrieved 2026-07-18</span></li>
        <li><a href="https://www.brookaccessory.com/products/ras1ution2/index.html" target="_blank" rel="noopener">Example adapter-vendor compatibility claim (Brook Ras1ution 2)</a> <span class="note">vendor's own MOZA/PS5 list · retrieved 2026-07-19</span></li>
        <li><a href="https://collectiveminds.gitbook.io/drivehub/disclaimer" target="_blank" rel="noopener">Example adapter-vendor disclaimer (Collective Minds Drive Hub)</a> <span class="note">compatibility not guaranteed · retrieved 2026-07-19</span></li>
      </ul>
      <p class="note">Each linked spec sheet carries its full dated source list. Published
      compatibility statements only.</p>
    </details>`;
}

// ---------- exports ----------

export const COMPAT_PAGES = WHEELBASE_DATA === null ? [] : [
  {
    path: '/compatibility/ps5-racing-wheels/',
    title: 'Which racing wheels work on PS5? The sourced compatibility table',
    description: 'PS5 racing wheel compatibility with dated sources: which wheels and wheelbases are PlayStation-licensed, which version you need, and which brands publish no PlayStation support.',
    body: ps5Body(),
  },
  {
    path: '/compatibility/moza-xbox/',
    title: 'Which MOZA setups work on Xbox? The ESX rule, base by base',
    description: 'MOZA Xbox compatibility, sourced: the license lives in the Xbox-licensed ESX wheel, so the R3 bundle works as sold while R5/R9/R12 need the separately purchased ESX wheel. Every answer linked to MOZA’s own pages.',
    body: mozaXboxBody(),
  },
  {
    path: '/compatibility/moza-ps5/',
    title: 'Is MOZA compatible with PS5? The sourced answer',
    description: 'MOZA publishes no PlayStation support for any wheelbase in our dataset, and no version adds it. What MOZA’s own pages say, why adapter claims are the vendors’ and not MOZA’s, and the sourced list of wheels that do work on PS5.',
    body: mozaPs5Body(),
  },
];
