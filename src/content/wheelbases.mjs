// Direct-Drive Value Lab pages, generated from src/data/wheelbases.v1.json.
// Reader-first (portfolio law): the hub is a decision table (torque, price,
// platforms, QR), record pages are spec sheets where every field group links
// its source. No value scores, no winner badges, no process prose — nulls
// render as plain "not disclosed" style statements.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'wheelbases.v1.json');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const wbSlug = (s) => String(s).normalize('NFKD').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function loadDataset() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

const show = (v, fallback = '—') => (v === null || v === undefined || v === '' ? fallback : esc(String(v)));
const money = (p) => (p && p.amount !== null && p.amount !== undefined ? `$${p.amount.toLocaleString('en-US')}` : '—');

export function recordPath(rec) {
  return `/wheelbases/${wbSlug(rec.brand)}/${wbSlug(`${rec.model}${rec.variant ? '-' + rec.variant : ''}`)}/`;
}

// "Simucube" + "Simucube 3" must not render as "Simucube Simucube 3".
function displayName(rec) {
  return rec.model.startsWith(rec.brand) ? rec.model : `${rec.brand} ${rec.model}`;
}

// Render the manufacturer's own claim wording, not an invented one: "hold"
// must never be stamped onto a constant or overshoot claim (Codex gate #6).
const CLAIM_LABELS = {
  peak: 'peak',
  holding: 'holding',
  constant: 'constant',
  max: 'max',
  'overshoot-noted': 'constant, overshoot noted',
};
const claimLabel = (t) => CLAIM_LABELS[t?.claimType] ?? (t?.claimType || '');

export function torqueCell(t) {
  // Some bases publish only a holding/constant figure (ClubSport DD, T818) —
  // never render those as "not disclosed".
  if (!t || (t.peakNm === null && t.holdingNm === null)) return '—';
  if (t.peakNm !== null && t.holdingNm !== null) {
    if (t.peakNm === t.holdingNm) return `${t.peakNm} Nm <span class="note">(peak/holding)</span>`;
    return `${t.peakNm} Nm peak / ${t.holdingNm} Nm holding`;
  }
  const val = t.peakNm !== null ? t.peakNm : t.holdingNm;
  const label = claimLabel(t);
  return label === 'peak' ? `${val} Nm` : `${val} Nm <span class="note">(${esc(label)})</span>`;
}

function torqueDek(t) {
  if (!t || (t.peakNm === null && t.holdingNm === null)) return 'Torque not disclosed';
  if (t.peakNm !== null && t.holdingNm !== null) {
    return t.peakNm === t.holdingNm
      ? `${t.peakNm} Nm peak/holding`
      : `${t.peakNm} Nm peak / ${t.holdingNm} Nm holding`;
  }
  const val = t.peakNm !== null ? t.peakNm : t.holdingNm;
  return `${val} Nm ${esc(claimLabel(t))}`;
}

function platformCell(p) {
  const parts = [];
  if (p.pc) parts.push('PC');
  if (p.ps?.supported) parts.push('PS');
  if (p.xbox?.supported) parts.push('Xbox');
  return parts.length ? parts.join(' · ') : '—';
}

// ---------- hub ----------

function hubBody(data) {
  const rows = data.records.map((rec) => `
      <tr>
        <th scope="row"><a href="${recordPath(rec)}">${esc(displayName(rec))}${rec.variant ? ` <span class="note">${esc(rec.variant)}</span>` : ''}</a>${rec.lifecycle !== 'current' ? ` <span class="note">(${esc(rec.lifecycle)})</span>` : ''}</th>
        <td data-num>${torqueCell(rec.torque)}</td>
        <td data-num>${money(rec.priceUSD)}</td>
        <td>${platformCell(rec.platforms)}</td>
        <td>${show(rec.quickRelease)}</td>
        <td>${rec.productType === 'bundle' ? 'Bundle' : 'Base only'}</td>
      </tr>`).join('');

  return `
    <p class="eyebrow">Direct-Drive Value Lab</p>
    <h1>Every wheelbase, spec by spec.</h1>
    <p class="dek">Official specifications and current prices for ${data.records.length} direct-drive
    wheelbases — with what's actually in the box, what you still need to buy, and a source
    on every number. Click any base for the full sheet.</p>
    <div class="table-wrap"><table class="results-table wb-table">
      <caption class="sr-only">Direct-drive wheelbase comparison</caption>
      <thead><tr><th>Wheelbase</th><th>Torque</th><th>Price</th><th>Platforms</th><th>Quick release</th><th>Type</th></tr></thead>
      <tbody>${rows}
      </tbody>
    </table></div>
    <p class="note">We have not driven these products — every number here is from the maker's own
    published pages, and each sheet links its sources with retrieval dates. Prices are official-store
    USD list prices; a "—" means no price from a permitted source (the sheet says why). A "base only"
    unit needs at least a wheel rim before you can drive.</p>
    <p class="note">Console player? The sourced compatibility answers:
    <a href="/compatibility/ps5-racing-wheels/">which wheels work on PS5</a> ·
    <a href="/compatibility/moza-xbox/">which MOZA setups work on Xbox</a>.</p>`;
}

// ---------- record pages ----------

export function sourceLinks(rec) {
  return rec.sources.map((s, i) =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.kind)}</a>${s.covers?.length ? ` <span class="note">${esc(s.covers.join(', '))}</span>` : ''} <span class="note">retrieved ${esc(s.retrieved)}</span></li>`).join('\n');
}

function specRow(label, value, note = '') {
  return `<tr><th scope="row">${esc(label)}</th><td>${value}</td><td class="note">${note}</td></tr>`;
}

function consoleLine(c) {
  if (c.supported === null) return 'not disclosed';
  if (!c.supported) return 'No';
  return c.condition ? `Yes <span class="note">— ${esc(c.condition)}</span>` : 'Yes';
}

// Curated comparisons that feature a record (static to avoid an import cycle
// with compare.mjs; extend when a new demand-justified pair ships).
const RECORD_COMPARES = {
  'R3 Racing Bundle': { href: '/compare/moza-r3-vs-r5/', label: 'MOZA R3 vs R5 — the factual comparison' },
  'R5 Racing Bundle': { href: '/compare/moza-r3-vs-r5/', label: 'MOZA R3 vs R5 — the factual comparison' },
};

function recordBody(rec) {
  const needs = rec.requiredNotIncluded.length
    ? `<div class="alert alert-warn">To actually drive, you still need: ${rec.requiredNotIncluded.map(esc).join(' · ')}</div>`
    : '';
  const compare = RECORD_COMPARES[rec.model]
    ? `<p class="note">Compared spec-by-spec: <a href="${RECORD_COMPARES[rec.model].href}">${esc(RECORD_COMPARES[rec.model].label)}</a></p>`
    : '';

  return `
    <p class="eyebrow"><a href="/wheelbases/">Value Lab</a> / ${esc(rec.brand)}</p>
    <h1>${esc(displayName(rec))}${rec.variant ? ` ${esc(rec.variant)}` : ''}</h1>
    <p class="dek">${torqueDek(rec.torque)} ·
    ${rec.priceUSD?.amount != null ? `${money(rec.priceUSD)} <span class="note">(official store, ${esc(rec.priceUSD.retrieved)})</span>` : 'no listed price — see the price row below'} ·
    ${rec.productType === 'bundle' ? 'sold as a bundle' : 'base only'}${rec.lifecycle !== 'current' ? ` · <strong>${esc(rec.lifecycle)}</strong>` : ''}</p>
    <p class="note">We have not driven this product. Every figure below comes from the linked
    manufacturer sources, each with its retrieval date.</p>
    ${compare}
    ${needs}
    <div class="table-wrap"><table class="results-table">
      <caption class="sr-only">Specifications</caption>
      ${specRow('Torque', torqueCell(rec.torque), rec.torque?.note ? esc(rec.torque.note) : '')}
      ${specRow('Price', rec.priceUSD?.amount != null ? `${money(rec.priceUSD)} <span class="note">(${esc(rec.priceUSD.retrieved)})</span>` : 'no listed price', rec.priceUSD?.note ? esc(rec.priceUSD.note) : '')}
      ${specRow('Availability', rec.lifecycle === 'current' ? 'Current model' : esc(rec.lifecycle.charAt(0).toUpperCase() + rec.lifecycle.slice(1)))}
      ${specRow('Slew rate', show(rec.slewRate, 'not disclosed'))}
      ${specRow('Encoder', rec.encoder.tech || rec.encoder.resolution ? `${show(rec.encoder.tech, '')} ${show(rec.encoder.resolution, '')}`.trim() : 'not disclosed')}
      ${specRow('Rotation', show(rec.rotationDeg, 'not disclosed'))}
      ${specRow('Motor', show(rec.motorType, 'not disclosed'))}
      ${specRow('PC', rec.platforms.pc ? 'Yes' : 'No')}
      ${specRow('PlayStation', consoleLine(rec.platforms.ps))}
      ${specRow('Xbox', consoleLine(rec.platforms.xbox))}
      ${specRow('Quick release', show(rec.quickRelease, 'not disclosed'))}
      ${specRow('Mounting', show(rec.mounting, 'not disclosed'))}
      ${specRow('Dimensions', show(rec.dimensions, 'not disclosed'))}
      ${specRow('Weight', rec.weightKg !== null ? `${rec.weightKg} kg` : 'not disclosed')}
      ${specRow('Power supply', show(rec.psu, 'not disclosed'))}
      ${specRow('In the box', rec.included.length ? rec.included.map(esc).join(' · ') : 'not disclosed')}
      ${specRow('Warranty', show(rec.warranty, 'not disclosed'))}
    </table></div>
    <details><summary>Sources for this sheet (${rec.sources.length})</summary>
      <ul>${sourceLinks(rec)}</ul>
      <p class="note">Last verified ${esc(rec.lastVerified)} · confidence: ${esc(rec.confidence)}. ${esc(rec.notes)}</p>
    </details>`;
}

// ---------- exports ----------

const data = loadDataset();

export const WHEELBASE_DATA = data;

export const WHEELBASE_PAGES = data === null ? [] : [
  {
    path: '/wheelbases/',
    title: `Direct-drive wheelbase specs & prices — ${data.records.length} bases compared`,
    description: `Official specs and current prices for ${data.records.length} direct-drive sim racing wheelbases: torque, platforms, quick release, what's in the box — every number sourced and dated.`,
    body: hubBody(data),
  },
  ...data.records.map((rec) => ({
    path: recordPath(rec),
    title: `${displayName(rec)}${rec.variant ? ` ${rec.variant}` : ''} — specs, price, compatibility`,
    description: `${displayName(rec)}: ${rec.torque?.peakNm ?? rec.torque?.holdingNm ?? 'direct-drive'}${typeof (rec.torque?.peakNm ?? rec.torque?.holdingNm) === 'number' ? ' Nm' : ''} wheelbase — official specs, current price, platform support, and what you still need to buy, with sources.`,
    body: recordBody(rec),
  })),
];
