// Upgrade-path pages: what replacing a specific entry wheel actually involves,
// with the platform consequences generated from the same datasets as the
// compatibility hub. Reader-first: replacement paths as sourced facts, no
// winner, no "best upgrade" language. The interactive Console-Safe Upgrade
// Planner will supersede the hand-authored parts of this page.
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

function g29Body() {
  const g29 = LEGACY.records.find((r) => r.product.includes('G29'));
  const psYes = WHEELBASE_DATA.records.filter((r) => r.platforms.ps.supported);
  // A brand "publishes no PlayStation support" only if EVERY one of its
  // records is unsupported — a brand with any PS-licensed product must never
  // appear in this list (Codex gate catch: Fanatec/Thrustmaster were wrongly
  // swept in by any-record aggregation).
  const brands = [...new Set(WHEELBASE_DATA.records.map((r) => r.brand))];
  const psNoBrands = brands.filter((b) =>
    WHEELBASE_DATA.records.filter((r) => r.brand === b).every((r) => !r.platforms.ps.supported));

  const psRows = psYes.map((rec) =>
    `<li><a href="${recordPath(rec)}">${esc(displayName(rec))}</a><span class="note"> — ${esc(rec.platforms.ps.condition ?? '')}</span></li>`).join('\n        ');

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / upgrade paths</p>
    <h1>Upgrading from a Logitech G29: what actually changes</h1>
    <p class="dek">Replacing the wheel, not modifying it — which direct-drive paths keep PlayStation,
    which paths drop it, and what you should assume carries over. Every claim sourced.</p>
    <p class="note">We have not driven these products. Every yes and no here is sourced with a
    retrieval date — each linked spec sheet carries its sources.</p>
    <h2>First, which question is this?</h2>
    <p>"Upgrade" means two different things around the G29. This page is about
    <strong>replacing it</strong> with a stronger wheelbase. It is not about modifying the G29 you
    own — pedal springs, rim wraps, brake mods — which is community territory we don't cover.</p>
    <h2>What replacing a G29 actually involves</h2>
    <p>The G29 is sold as one integrated unit: gear-driven wheel and base together, pedals in the
    box. Logitech does not document a user-removable rim or quick-release system for the G29, so
    there is no published path that moves the G29 rim onto a direct-drive base — an upgrade means a
    new base plus a compatible wheel (and, on base-only products, pedals too; each spec sheet's
    "you still need" line says exactly what).</p>
    <h2>The G29's platform position — and how to keep it</h2>
    <p>${esc(g29.platforms.ps.condition)} That PlayStation support is the thing an upgrade most
    easily loses: entire direct-drive brands in our dataset publish no PlayStation support
    (${psNoBrands.map(esc).join(', ')}). The paths that keep PlayStation, from the sourced
    records:</p>
    <ul>
        ${psRows}
    </ul>
    <p>The full sourced picture, including everything that does not work on PlayStation, is on
    <a href="/compatibility/ps5-racing-wheels/">the PS5 compatibility table</a>. If PlayStation
    doesn't matter to you, every base in <a href="/wheelbases/">the wheelbase lab</a> is on the
    table — sorted by published torque, price, and platform there.</p>
    <h2>What carries over from your G29</h2>
    <p>Assume nothing carries over unless a maker publishes a port or adapter for it. Within
    Logitech's own ecosystem there are documented exceptions: Logitech's Racing Adapter
    documentation lists official support for connecting the Driving Force Shifter and
    G923/G29/G920 pedals to the newer RS and PRO ecosystems — so both your shifter and your pedals
    have a published path onto Logitech's own upgrade targets. Attaching G29-ecosystem gear to
    another brand's base is not a published, supported configuration: check the "in the box" and
    "you still need" lines on the spec sheet of whatever base you're considering, because that is
    where published support begins and ends.</p>
    <details><summary>Sources</summary>
      <ul>
        ${g29.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.kind)}</a> <span class="note">${esc((s.covers ?? []).join(', '))} · retrieved ${esc(s.retrieved)}</span></li>`).join('\n        ')}
        <li><a href="https://www.logitechg.com/en-us/shop/p/driving-force-shifter" target="_blank" rel="noopener">manufacturer store (Driving Force Shifter)</a> <span class="note">shifter accessory scope (G923/G29/G920) · retrieved 2026-07-19</span></li>
        <li><a href="https://support.logi.com/hc/en-za/articles/11653359309975-What-does-the-Logitech-G-Racing-Adapter-enable" target="_blank" rel="noopener">manufacturer support doc (Racing Adapter)</a> <span class="note">shifter-to-RS/PRO path · retrieved 2026-07-19</span></li>
        <li><a href="https://support.logi.com/hc/en-us/articles/360023463753-G29-Driving-Force-Racing-Wheel-Technical-Specifications" target="_blank" rel="noopener">manufacturer support doc (G29 specifications)</a> <span class="note">integrated unit; no quick-release documented · retrieved 2026-07-19</span></li>
      </ul>
      <p class="note">Last verified ${esc(g29.lastVerified)}. Wheelbase claims come from the linked
      spec sheets, which carry their own dated sources. Published statements only — no claims about
      feel or driving experience.</p>
    </details>`;
}

export const UPGRADE_PAGES = WHEELBASE_DATA === null ? [] : [
  {
    path: '/upgrades/logitech-g29/',
    title: 'Logitech G29 upgrade paths that keep PlayStation',
    description: 'Replacing a G29, not modifying it: why no published path moves the rim to a direct-drive base, which sourced paths keep PlayStation, and what carries over.',
    body: g29Body(),
  },
];
