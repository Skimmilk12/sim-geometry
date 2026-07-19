// Curated-pair factual comparisons, generated from the Value Lab dataset.
// Plan rule: manual, demand-justified pairs only — NEVER all-pairs. Reader-first
// law: facts side by side, differences stated plainly, no winner, no scores,
// no recommendation. Every figure inherits its sourcing from the two records.
import { WHEELBASE_DATA, recordPath, torqueCell, sourceLinks, wbSlug } from './wheelbases.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Demand-justified pairs (SEO recon 2026-07-19: "moza r3 vs r5" ~1,000/mo, KD 0,
// page one is forum threads and thin retailer blogs).
const COMPARISONS = [
  {
    slug: 'moza-r3-vs-r5',
    a: { model: 'R3 Racing Bundle' },
    b: { model: 'R5 Racing Bundle' },
    title: 'MOZA R3 vs R5 — the factual spec comparison',
    h1: 'MOZA R3 vs R5, spec by spec.',
    description: 'MOZA R3 vs R5 compared on published specs only: torque, the Xbox difference, what each bundle includes, dimensions, and what you still need — every number from MOZA’s own pages.',
    dek: 'Published specs only, side by side: torque, platforms, what is actually in each box, and the Xbox compatibility difference between the two bundles.',
    // The single biggest factual difference, stated as facts (this also answers
    // the "moza r5 xbox" question cluster honestly).
    keyDifference: `
      <h2>The Xbox difference, stated plainly</h2>
      <p>The R3 Racing Bundle includes MOZA's Xbox-licensed ESX wheel (280 mm) — the bundle works on
      Xbox Series X|S, Xbox One, and PC as sold. The R5 Racing Bundle includes the ES wheel (11-inch,
      22 buttons), which is PC-only; per MOZA's own wheel-base FAQ, the R5 base runs on Xbox only with
      a separately purchased Xbox-licensed ESX wheel. Neither bundle supports PlayStation.</p>
      <p>On published figures, the bases differ in motor output: the R3's direct-drive servo motor is listed
      at 3.9 Nm peak torque (60 W rated power), the R5's at 5.5 Nm peak (84 W). Both use a 15-bit encoder,
      the same MOZA quick release, four-hole bottom mounting, and ship with an SR-P Lite two-pedal set
      (no clutch) and a table clamp for desks up to 50 mm.</p>`,
  },
];

function findRecord(match) {
  const rec = (WHEELBASE_DATA?.records ?? []).find(
    (r) => r.model === match.model && (!match.brand || r.brand === match.brand),
  );
  if (!rec) throw new Error(`compare: no Value Lab record for ${match.model}`);
  return rec;
}

const show = (v) => (v === null || v === undefined || v === '' ? 'not disclosed' : esc(String(v)));

function platformsCell(rec) {
  const line = (label, c) => {
    if (c === true) return `${label}: Yes`;
    if (c?.supported === true) return `${label}: Yes${c.condition ? ` <span class="note">(${esc(c.condition)})</span>` : ''}`;
    if (c?.supported === false) return `${label}: No${c.condition ? ` <span class="note">(${esc(c.condition)})</span>` : ''}`;
    return `${label}: not disclosed`;
  };
  return [line('PC', rec.platforms.pc), line('PlayStation', rec.platforms.ps), line('Xbox', rec.platforms.xbox)].join('<br>');
}

const COMPARE_ROWS = [
  ['Torque', (r) => torqueCell(r.torque)],
  ['Motor', (r) => show(r.motorType)],
  ['Encoder', (r) => (r.encoder.tech || r.encoder.resolution ? esc([r.encoder.tech, r.encoder.resolution].filter(Boolean).join(', ')) : 'not disclosed')],
  ['Rotation', (r) => show(r.rotationDeg)],
  ['Platforms', platformsCell],
  ['Quick release', (r) => show(r.quickRelease)],
  ['In the box', (r) => (r.included.length ? r.included.map(esc).join(' · ') : 'not disclosed')],
  ['You still need', (r) => {
    if (r.requiredNotIncluded.length) return r.requiredNotIncluded.map(esc).join(' · ');
    // A "complete" bundle can still be platform-scoped (R5: complete for PC,
    // but Xbox needs the separately purchased licensed wheel) — say so.
    const xbox = r.platforms.xbox;
    const caveat = xbox?.supported === false && /separately purchased/i.test(xbox.condition || '')
      ? ' <span class="note">(for PC; Xbox requires the separately purchased Xbox-licensed wheel noted above)</span>'
      : '';
    return `Nothing — complete as sold${caveat}`;
  }],
  ['Base dimensions', (r) => show(r.dimensions)],
  ['Base weight', (r) => (r.weightKg !== null ? `${r.weightKg} kg` : 'not disclosed')],
  ['Power supply', (r) => show(r.psu)],
  ['Mounting', (r) => show(r.mounting)],
  ['Warranty', (r) => show(r.warranty)],
  ['Price', (r) => (r.priceUSD?.amount != null
    ? `$${r.priceUSD.amount.toLocaleString('en-US')} <span class="note">(official store, ${esc(r.priceUSD.retrieved)})</span>`
    : `No listed price${r.priceUSD?.note ? ` <span class="note">— ${esc(r.priceUSD.note)}</span>` : ''}`)],
];

function compareBody(cmp, a, b) {
  const rows = COMPARE_ROWS.map(([label, fn]) =>
    `<tr><th scope="row">${esc(label)}</th><td>${fn(a)}</td><td>${fn(b)}</td></tr>`).join('\n      ');
  // Dedupe by URL but MERGE provenance: union the covers lists and keep the
  // latest retrieval date, so a shared source never silently loses coverage.
  const byUrl = new Map();
  for (const s of [...a.sources, ...b.sources]) {
    const seen = byUrl.get(s.url);
    if (!seen) {
      byUrl.set(s.url, { ...s, covers: [...(s.covers ?? [])] });
    } else {
      seen.covers = [...new Set([...seen.covers, ...(s.covers ?? [])])];
      if ((s.retrieved ?? '') > (seen.retrieved ?? '')) seen.retrieved = s.retrieved;
    }
  }
  const allSources = [...byUrl.values()];
  const lastVerified = [a.lastVerified, b.lastVerified].sort().at(-1);

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / factual comparison</p>
    <h1>${esc(cmp.h1)}</h1>
    <p class="dek">${esc(cmp.dek)}</p>
    <p class="note">We have not driven these products. Every figure below comes from the linked
    manufacturer sources, each with its retrieval date — and the full sheet for each base goes deeper:
    <a href="${recordPath(a)}">${esc(a.model)}</a> · <a href="${recordPath(b)}">${esc(b.model)}</a>.</p>
    ${cmp.keyDifference}
    <h2>Side by side</h2>
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">${esc(a.model)} vs ${esc(b.model)} specifications</caption>
      <thead><tr><th></th><th>${esc(a.model)}</th><th>${esc(b.model)}</th></tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table></div>
    <p class="note">Fields marked "not disclosed" have no citable figure on MOZA's official pages —
    a dash would hide that; the spec sheets say why in each case.</p>
    <details><summary>Sources for this comparison (${allSources.length})</summary>
      <ul>${sourceLinks({ sources: allSources })}</ul>
      <p class="note">Last verified ${esc(lastVerified)}. This page compares published specifications only;
      it makes no claims about feel, sound, or driving experience.</p>
    </details>`;
}

export const COMPARE_PAGES = WHEELBASE_DATA === null ? [] : COMPARISONS.map((cmp) => {
  const a = findRecord(cmp.a);
  const b = findRecord(cmp.b);
  return {
    path: `/compare/${wbSlug(cmp.slug)}/`,
    title: cmp.title,
    description: cmp.description,
    body: compareBody(cmp, a, b),
  };
});
