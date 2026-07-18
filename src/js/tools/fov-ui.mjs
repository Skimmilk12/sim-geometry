// Sim Geometry Lab — tool page controller. Reads the form, calls the FROZEN
// calculateGeometryV1 facade, renders physical spans with warnings and
// assumptions, and mirrors state into a shareable #v=1 fragment. Degrees only
// at this presentation edge.
import { calculateGeometryV1 } from '../geometry/geometry.mjs';
import { toDegrees } from '../geometry/fov.mjs';
import { encodeStateV1, decodeStateV1 } from './url-state.mjs';

const $ = (id) => document.getElementById(id);
const deg = (rad) => `${toDegrees(rad).toFixed(1)}°`;
const UNIT_TO_MM = { mm: 1, cm: 10, in: 25.4 };
const round1 = (v) => Math.round(v * 10) / 10;

// ---------- form <-> state ----------

function readForm() {
  const units = $('units').value;
  const toMm = (v) => round1(Number(v) * UNIT_TO_MM[units]);
  const layout = $('layout').value;
  const sizeMode = $('size-mode').value;

  let widthMm; let heightMm;
  if (sizeMode === 'diagonal') {
    const diagMm = Number($('diagonal').value) * 25.4; // diagonal is always inches
    const [aw, ah] = $('aspect').value.split(':').map(Number);
    const hyp = Math.hypot(aw, ah);
    widthMm = round1((diagMm * aw) / hyp);
    heightMm = round1((diagMm * ah) / hyp);
  } else {
    widthMm = toMm($('width').value);
    heightMm = toMm($('height').value);
  }

  const curved = $('curved').checked;
  const state = {
    layout,
    units,
    widthMm,
    heightMm,
    eyeDistanceMm: toMm($('distance').value),
    curveRadiusMm: curved ? round1(Number($('radius').value)) : null, // radius is always mm ("1800R")
    resolution: $('res-h').value && $('res-v').value
      ? { horizontal: Number($('res-h').value), vertical: Number($('res-v').value) }
      : null,
    bezelPerSideMm: layout === 'triple' ? round1(Number($('bezel').value || 0) * UNIT_TO_MM[units]) : null,
    yaw: layout === 'triple'
      ? ($('yaw-mode').value === 'recommended' ? 'recommended' : Number($('yaw').value) * Math.PI / 180)
      : null,
  };
  return state;
}

function writeForm(state) {
  $('units').value = state.units;
  $('layout').value = state.layout;
  $('size-mode').value = 'measured';
  const fromMm = (v) => round1(v / UNIT_TO_MM[state.units] * 10) / 10;
  $('width').value = fromMm(state.widthMm);
  $('height').value = fromMm(state.heightMm);
  $('distance').value = fromMm(state.eyeDistanceMm);
  $('curved').checked = state.curveRadiusMm !== null;
  $('radius').value = state.curveRadiusMm ?? '';
  $('res-h').value = state.resolution?.horizontal ?? '';
  $('res-v').value = state.resolution?.vertical ?? '';
  if (state.layout === 'triple') {
    $('bezel').value = fromMm(state.bezelPerSideMm ?? 0);
    if (state.yaw === 'recommended') {
      $('yaw-mode').value = 'recommended';
    } else {
      $('yaw-mode').value = 'manual';
      $('yaw').value = (toDegrees(state.yaw)).toFixed(2);
    }
  }
  syncVisibility();
}

function syncVisibility() {
  const layout = $('layout').value;
  $('triple-fields').hidden = layout !== 'triple';
  $('radius-field').hidden = !$('curved').checked;
  $('yaw').closest('.field').hidden = $('yaw-mode').value !== 'manual';
  const measured = $('size-mode').value === 'measured';
  $('measured-fields').hidden = !measured;
  $('diagonal-fields').hidden = measured;
}

// ---------- rendering ----------

function row(label, value, note = '') {
  return `<tr><th scope="row">${label}</th><td data-num>${value}</td><td class="note">${note}</td></tr>`;
}

function renderResults(state, out) {
  const box = $('results');
  if (!out.ok) {
    box.innerHTML = `<div class="alert alert-error" role="alert">
      <strong>Can't calculate this rig.</strong> ${out.error.message}
      ${out.error.field ? `<span class="note">(input: ${out.error.field})</span>` : ''}
    </div>`;
    return;
  }

  const r = out.results;
  const warn = out.warnings.map((w) => `
    <div class="alert alert-warn" role="status"><strong>${w.code.replaceAll('_', ' ').toLowerCase()}:</strong> ${w.message}</div>`).join('');

  const sens = (s) => {
    const fmt = (p) => (p.rad !== null ? deg(p.rad) : `unavailable (${p.unavailable.code})`);
    return `at ±${s.deltaMm} mm eye-distance error: ${fmt(s.near)} … ${fmt(s.far)}`;
  };

  let rows = '';
  if (state.layout === 'single') {
    rows += row('Horizontal span', deg(r.horizontalSpanRad), state.curveRadiusMm ? 'physical span of the curved panel' : '');
    rows += row('Vertical span', deg(r.verticalSpanRad));
    if (r.curve) rows += row('Edge depth', `${r.curve.edgeDepthMm.toFixed(0)} mm`, `sagitta ${r.curve.sagittaMm.toFixed(0)} mm — edges sit closer than center`);
    if (r.pixelsPerDegree) rows += row('Pixels per degree', r.pixelsPerDegree.toFixed(1));
    rows += row('Measurement sensitivity', sens(r.sensitivity));
  } else {
    rows += row('Visible envelope', deg(r.visibleEnvelopeRad), 'outer edge to outer edge');
    rows += row('Active image coverage', deg(r.activeImageCoverageRad), 'envelope minus seam occlusion');
    rows += row('Seam occlusion', `${deg(r.seamOcclusionPerSideRad)} / side`, `${r.seamGapMm} mm physical gap`);
    rows += row('Center panel span', deg(r.centerSpanRad));
    rows += row('Vertical span', deg(r.verticalSpanRad));
    const nom = r.nominalYaw.rad !== null ? deg(r.nominalYaw.rad) : `unavailable (${r.nominalYaw.unavailable.code})`;
    rows += row('Side monitor angle', deg(r.requestedYawRad), `${r.nominalYaw.method} suggestion: ${nom}`);
    if (r.seamHiddenPixels) rows += row('Hidden pixels per seam', r.seamHiddenPixels.toFixed(0), `bezel-corrected span equivalent: ${r.equivalentSpan.spanPixels.toFixed(0)} px`);
    if (r.pixelsPerDegree) rows += row('Pixels per degree (center)', r.pixelsPerDegree.toFixed(1));
    rows += row('Measurement sensitivity', sens(r.sensitivity));
  }

  box.innerHTML = `${warn}
    <table class="results-table"><caption class="sr-only">Calculated physical spans</caption>${rows}</table>
    <p class="note">These are <strong>physical angular spans</strong>, not game FOV settings. Per-game
    conversion records — each with its source and verification date — ship with the game dataset.</p>
    <details><summary>Assumptions behind these numbers</summary>
      <ul>${out.assumptions.map((a) => `<li><code>${a}</code></li>`).join('')}</ul>
    </details>`;

  $('actions').hidden = false;
  $('actions').dataset.summary = summaryText(state, out);
  $('actions').dataset.json = JSON.stringify(out, null, 2);
}

function summaryText(state, out) {
  const r = out.results;
  const head = `Sim Geometry Lab — ${state.layout === 'triple' ? 'triple' : 'single'} ${state.curveRadiusMm ? `${state.curveRadiusMm}R curved` : 'flat'} ${state.widthMm}×${state.heightMm} mm at ${state.eyeDistanceMm} mm`;
  const body = state.layout === 'single'
    ? `horizontal ${deg(r.horizontalSpanRad)}, vertical ${deg(r.verticalSpanRad)}`
    : `envelope ${deg(r.visibleEnvelopeRad)}, active ${deg(r.activeImageCoverageRad)}, side angle ${deg(r.requestedYawRad)}`;
  return `${head}\n${body}\n${location.origin}/tools/fov/#${encodeStateV1(state)}`;
}

// ---------- wiring ----------

function calculate({ pushHash = true } = {}) {
  let state;
  try {
    state = readForm();
  } catch {
    return;
  }
  const input = {
    layout: state.layout,
    screen: { widthMm: state.widthMm, heightMm: state.heightMm },
    curveRadiusMm: state.curveRadiusMm,
    eyeDistanceMm: state.eyeDistanceMm,
    resolution: state.resolution,
    triple: state.layout === 'triple'
      ? { bezelPerSideMm: state.bezelPerSideMm, yawFromCoplanarRad: state.yaw }
      : null,
  };
  const out = calculateGeometryV1(input);
  renderResults(state, out);
  if (pushHash && out.ok) history.replaceState(null, '', `#${encodeStateV1(state)}`);
}

function restoreFromHash() {
  const decoded = decodeStateV1(location.hash);
  if (!decoded.ok) return false;
  writeForm(decoded.state);
  calculate({ pushHash: false });
  return true;
}

export function init() {
  const form = $('fov-form');
  form.addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  form.addEventListener('change', () => { syncVisibility(); });
  $('copy-link').addEventListener('click', async () => {
    calculate();
    await navigator.clipboard.writeText(location.href);
    $('copy-link').textContent = 'Link copied';
    setTimeout(() => { $('copy-link').textContent = 'Copy share link'; }, 1500);
  });
  $('copy-summary').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('actions').dataset.summary || '');
  });
  $('copy-json').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('actions').dataset.json || '');
  });
  window.addEventListener('hashchange', restoreFromHash);
  syncVisibility();
  restoreFromHash();
}

init();
