// Sim Geometry Lab — tool page controller. CANONICAL-STATE architecture
// (gate Exchange 27): the canonical state lives in millimetres in
// `currentState`; the form is a VIEW of it. Hash restores compute from the
// decoded state directly — never through a display-unit round trip — so a
// share URL reproduces its result exactly. Degrees only at this edge.
import { calculateGeometryV1 } from '../geometry/geometry.mjs';
import { toDegrees } from '../geometry/fov.mjs';
import { encodeStateV1, decodeStateV1 } from './url-state.mjs';

const $ = (id) => document.getElementById(id);
const deg = (rad) => `${toDegrees(rad).toFixed(1)}°`;
const UNIT_TO_MM = { mm: 1, cm: 10, in: 25.4 };
const round1 = (v) => Math.round(v * 10) / 10;
// lossless-enough display formatting: 3 decimals, trailing zeros trimmed
const fmt = (v) => String(Math.round(v * 1000) / 1000);

let currentState = null; // canonical mm state of the last computed result
let currentOutput = null;
let gameRecords = new Map();
const embedRoot = $('embed-root');
let embedHeightTimer = null;

function syncEmbedAttribution() {
  if (!embedRoot) return;
  $('embed-attribution').href = `https://simgeometry.com/tools/fov/${location.hash}`;
}

// Height messages are write-only: the embed never inspects or listens to its
// parent. Debouncing coalesces result rendering, game-record loading, and the
// ResizeObserver notification that follows either change.
function queueEmbedHeight() {
  if (!embedRoot) return;
  clearTimeout(embedHeightTimer);
  embedHeightTimer = setTimeout(() => {
    const px = Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({ type: 'sim-geometry-embed-height', px }, '*');
  }, 50);
}

const gameSlug = (name) => String(name)
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

// ---------- form -> state (user edits only) ----------

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

  const resH = $('res-h').value.trim();
  const resV = $('res-v').value.trim();
  if ((resH === '') !== (resV === '')) {
    return {
      formError: {
        code: 'INVALID_INPUT',
        message: 'Enter both horizontal and vertical resolution, or leave both empty.',
        field: 'resolution',
      },
    };
  }

  const curved = $('curved').checked;
  return {
    state: {
      layout,
      units,
      game: $('game').value || null,
      widthMm,
      heightMm,
      eyeDistanceMm: toMm($('distance').value),
      curveRadiusMm: curved ? round1(Number($('radius').value)) : null, // radius always mm ("1800R")
      resolution: resH !== '' ? { horizontal: Number(resH), vertical: Number(resV) } : null,
      bezelPerSideMm: layout === 'triple' ? round1(Number($('bezel').value || 0) * UNIT_TO_MM[units]) : null,
      yaw: layout === 'triple'
        ? ($('yaw-mode').value === 'recommended' ? 'recommended' : Number($('yaw').value) * Math.PI / 180)
        : null,
    },
  };
}

// ---------- state -> form (view only; canonical mm preserved elsewhere) ----------

function writeForm(state) {
  $('units').value = state.units;
  $('layout').value = state.layout;
  $('game').value = state.game && gameRecords.has(state.game) ? state.game : '';
  $('size-mode').value = 'measured';
  const fromMm = (v) => fmt(v / UNIT_TO_MM[state.units]);
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
      $('yaw').value = toDegrees(state.yaw).toFixed(2);
    }
  }
  syncVisibility();
  syncUnitEchoes();
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

const UNIT_LABEL = { mm: 'mm', cm: 'cm', in: 'inches' };
function syncUnitEchoes() {
  const u = UNIT_LABEL[$('units').value];
  for (const el of document.querySelectorAll('[data-unit-echo]')) el.textContent = ` (${u})`;
}

// Changing units converts the DISPLAYED values so the physical rig is
// preserved (gate finding: 25.59 in must become 650 mm, not 25.59 mm).
let lastUnits = null;
function convertDisplayedUnits() {
  const next = $('units').value;
  if (lastUnits && next !== lastUnits) {
    for (const id of ['width', 'height', 'distance', 'bezel']) {
      const el = $(id);
      if (el.value.trim() !== '' && Number.isFinite(Number(el.value))) {
        const mm = Number(el.value) * UNIT_TO_MM[lastUnits];
        el.value = fmt(mm / UNIT_TO_MM[next]);
      }
    }
  }
  lastUnits = next;
  syncUnitEchoes();
}

// ---------- game convention dataset ----------

function populateGameSelect(records) {
  const select = $('game');
  select.replaceChildren(new Option('No game selected', ''));

  for (const [label, status] of [
    ['Verified conversions', 'convertible'],
    ['No verified conversion', 'no-conversion'],
  ]) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const record of records.filter((candidate) => candidate.status === status)) {
      group.append(new Option(record.game, gameSlug(record.game)));
    }
    select.append(group);
  }
}

async function loadGameRecords() {
  const field = $('game-field');
  const note = $('game-data-note');
  try {
    const response = await fetch('/data/game-fov-conventions.v1.json');
    if (!response.ok) throw new Error(`dataset request returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.records) || data.records.length === 0) throw new Error('dataset has no records');

    const loaded = new Map();
    for (const record of data.records) {
      if (!record || typeof record.game !== 'string' || !['convertible', 'no-conversion'].includes(record.status)) {
        throw new Error('dataset contains an invalid record');
      }
      const slug = gameSlug(record.game);
      if (!slug || loaded.has(slug)) throw new Error('dataset contains an invalid or duplicate game name');
      loaded.set(slug, record);
    }

    gameRecords = loaded;
    populateGameSelect([...loaded.values()]);
    field.hidden = false;
    note.hidden = true;

    if (currentState) {
      $('game').value = currentState.game && gameRecords.has(currentState.game) ? currentState.game : '';
      renderGameRecord(currentState, currentOutput);
    } else if (gameRecords.has('iracing')) {
      // The production instrument opens on the dataset's iRacing record, whose
      // confidence is medium. Guidance remains explicitly pending until a
      // successful geometry result exists to map into the record.
      $('game').value = 'iracing';
      renderPendingGameRecord(gameRecords.get('iracing'));
    }
  } catch {
    gameRecords = new Map();
    field.hidden = true;
    note.textContent = 'Game conversion records are unavailable. The physical FOV calculator still works.';
    note.hidden = false;
    clearGameRecord();
  }
  queueEmbedHeight();
}

// ---------- rendering ----------

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function clearGameRecord() {
  const panel = $('game-record');
  panel.hidden = true;
  panel.replaceChildren();
}

function renderPendingGameRecord(record) {
  const panel = $('game-record');
  if (!record) {
    clearGameRecord();
    return;
  }
  panel.innerHTML = `${recordHeader(record)}
    <div class="game-record__pending"><strong>Game source pending</strong><span>Calculate the current rig to map this dataset record.</span></div>`;
  panel.hidden = false;
}

function sourceList(record) {
  return `<div class="game-record__sources">
    <h3>Sources</h3>
    <ul>${record.sources.map((source, index) => `
      <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Source ${index + 1}: ${escapeHtml(source.kind)}</a>
      <span class="note">retrieved ${escapeHtml(source.retrieved)}</span></li>`).join('')}
    </ul>
  </div>`;
}

function conventionLine(record) {
  const axis = record.convention.axis ? `${record.convention.axis} FOV` : 'axis undisclosed';
  const basis = record.convention.basis ?? 'basis undisclosed';
  return `<p class="game-record__convention"><strong>Convention + basis:</strong> ${escapeHtml(axis)}; ${escapeHtml(basis)}.</p>`;
}

function recordHeader(record) {
  return `<header class="game-record__header">
    <div><p class="game-record__eyebrow">Game setting guidance</p><h2>${escapeHtml(record.game)}</h2></div>
    <span class="confidence-badge confidence-badge--${escapeHtml(record.confidence)}">${escapeHtml(record.confidence.toUpperCase())} CONFIDENCE</span>
  </header>
  <dl class="game-record__facts">
    <div><dt>Setting</dt><dd>${escapeHtml(record.settingName ?? 'No FOV setting')}</dd></div>
    <div><dt>Menu path</dt><dd>${escapeHtml(record.menuPath ?? 'Not documented')}</dd></div>
  </dl>`;
}

function mappedAngle(results, mapping) {
  const radians = {
    horizontalSpan: results.horizontalSpanRad,
    verticalSpan: results.verticalSpanRad,
    centerSpan: results.centerSpanRad,
    visibleEnvelope: results.visibleEnvelopeRad,
  }[mapping];
  return Number.isFinite(radians) ? toDegrees(radians) : null;
}

function stepDecimals(step) {
  if (Number.isInteger(step)) return 0;
  const text = String(step).toLowerCase();
  if (text.includes('e-')) return Math.min(6, Number(text.split('e-')[1]));
  return Math.min(6, (text.split('.')[1] ?? '').length);
}

function displayGameValue(value, step) {
  const increment = Number.isFinite(step) && step > 0 ? step : 0.1;
  const decimals = Number.isFinite(step) && step > 0 ? stepDecimals(step) : 1;
  return (Math.round(value / increment) * increment).toFixed(decimals);
}

function rangeCheck(record, value) {
  if (!record.range) return '<p class="game-record__range note">No verified setting range is available for this record.</p>';
  const outside = value < record.range.min || value > record.range.max;
  const conditions = record.range.conditions ? ` ${escapeHtml(record.range.conditions)}.` : '';
  if (outside) {
    return `<div class="alert alert-warn game-record__range" role="status"><strong>Outside the documented range:</strong>
      ${escapeHtml(record.range.min)}&ndash;${escapeHtml(record.range.max)}. The calculated value may not be enterable.${conditions}</div>`;
  }
  return `<p class="game-record__range"><strong>Range check:</strong> within ${escapeHtml(record.range.min)}&ndash;${escapeHtml(record.range.max)}.${conditions}</p>`;
}

function renderGameRecord(state, out) {
  const record = state?.game ? gameRecords.get(state.game) : null;
  if (!record || !out?.ok) {
    clearGameRecord();
    return;
  }

  const panel = $('game-record');
  const header = recordHeader(record);
  const metadata = `<p class="game-record__verified"><strong>Last verified:</strong> ${escapeHtml(record.lastVerified)}</p>`;
  let body;

  if (record.status === 'no-conversion') {
    body = `${header}
      <div class="game-record__guidance alert alert-warn"><strong>No verified conversion.</strong> ${escapeHtml(record.notes)}</div>
      ${conventionLine(record)}
      <p class="note">${escapeHtml(record.convention.note)}</p>
      ${metadata}
      ${sourceList(record)}`;
  } else {
    const mapping = record.calculatorMapping[state.layout];
    if (mapping === 'physical-geometry') {
      body = `${header}
        <div class="game-record__guidance"><strong>Use the game's physical-geometry setup; no scalar value is shown.</strong>
          <p>${escapeHtml(record.tripleNotes ?? record.notes)}</p>
        </div>
        ${conventionLine(record)}
        <p class="note">${escapeHtml(record.convention.note)}</p>
        ${metadata}
        ${sourceList(record)}`;
    } else {
      const value = mappedAngle(out.results, mapping);
      if (value === null) {
        body = `${header}<div class="alert alert-warn"><strong>No mapped result is available for this layout.</strong></div>${metadata}${sourceList(record)}`;
      } else {
        const shown = displayGameValue(value, record.step);
        body = `${header}
          <div class="game-record__value"><span>The value to enter</span><strong>${escapeHtml(shown)}&deg;</strong></div>
          ${rangeCheck(record, value)}
          ${conventionLine(record)}
          <p class="note">${escapeHtml(record.convention.note)}</p>
          <p class="game-record__honesty">This is the physical span mapped to ${escapeHtml(record.game)}s convention - verified ${escapeHtml(record.lastVerified)}, ${escapeHtml(record.confidence)} confidence. Check the sources if it matters.</p>
          ${metadata}
          ${sourceList(record)}`;
      }
    }
  }

  panel.innerHTML = body;
  panel.hidden = false;
}

function row(label, value, note = '') {
  return `<tr><th scope="row">${label}</th><td data-num>${value}</td><td class="note">${note}</td></tr>`;
}

function hideActions() {
  const a = $('actions');
  a.hidden = true;
  delete a.dataset.summary;
  delete a.dataset.json;
}

function primaryReadouts(state, results) {
  if (state.layout === 'single') {
    return [
      {
        label: 'Horizontal span',
        radians: results.horizontalSpanRad,
        note: state.curveRadiusMm ? 'physical span across the curved panel' : 'physical span across the visible panel width',
      },
      {
        label: 'Vertical span',
        radians: results.verticalSpanRad,
        note: 'physical span across the visible panel height',
      },
    ];
  }
  return [
    {
      label: 'Visible envelope',
      radians: results.visibleEnvelopeRad,
      note: 'outside edge to outside edge across all three panels',
    },
    {
      label: 'Active image coverage',
      radians: results.activeImageCoverageRad,
      note: 'visible envelope less the two bezel seams',
    },
  ];
}

function readoutHtml(readout) {
  return `<div class="degree-readout">
    <span>${readout.label}</span>
    <strong>${toDegrees(readout.radians).toFixed(1)}<small>deg</small></strong>
    <p>${readout.note}</p>
  </div>`;
}

function resetMethodPanel(note = 'Submit the rig to substitute measured dimensions into the active geometry model.') {
  $('method-input').textContent = 'Awaiting a valid rig';
  $('method-panel-width').textContent = 'Visible width required';
  $('method-angles').textContent = 'H --.- / V --.-';
  $('method-equation').textContent = 'H = 2 × atan(W ÷ (2 × D))';
  $('method-note').textContent = note;
}

function updateMethodPanel(state, out) {
  if (!state || !out?.ok) {
    resetMethodPanel(out?.error?.message);
    return;
  }

  const r = out.results;
  $('method-input').textContent = `${state.widthMm} × ${state.heightMm} mm panel / ${state.eyeDistanceMm} mm eye distance`;
  $('method-panel-width').textContent = `${state.widthMm} mm active width`;

  if (state.layout === 'triple') {
    $('method-angles').textContent = `E ${deg(r.visibleEnvelopeRad)} / A ${deg(r.activeImageCoverageRad)}`;
    $('method-equation').textContent = `3 × ${state.widthMm} mm panels + ${r.seamGapMm} mm seams; yaw ${deg(r.requestedYawRad)} → envelope ${deg(r.visibleEnvelopeRad)}`;
    $('method-note').textContent = 'The triple model traces the center and side-panel rays, then reports the outer envelope and subtracts angular seam occlusion for active-image coverage.';
  } else if (state.curveRadiusMm) {
    $('method-angles').textContent = `H ${deg(r.horizontalSpanRad)} / V ${deg(r.verticalSpanRad)}`;
    $('method-equation').textContent = `s = ${state.curveRadiusMm} − √(${state.curveRadiusMm}² − (${state.widthMm} ÷ 2)²) = ${r.curve.sagittaMm.toFixed(1)} mm; H = ${deg(r.horizontalSpanRad)}`;
    $('method-note').textContent = 'The concave-panel model uses chord width and radius to find sagitta, then uses the closer edge depth for the physical horizontal span.';
  } else {
    $('method-angles').textContent = `H ${deg(r.horizontalSpanRad)} / V ${deg(r.verticalSpanRad)}`;
    $('method-equation').textContent = `H = 2 × atan(${state.widthMm} ÷ (2 × ${state.eyeDistanceMm})) = ${deg(r.horizontalSpanRad)}; V = ${deg(r.verticalSpanRad)}`;
    $('method-note').textContent = 'Width, height, and eye distance are all canonical millimetre values. Display units never change the physical rig.';
  }
}

function renderResults(state, out) {
  const box = $('results');
  hideActions();
  clearGameRecord();
  updateMethodPanel(state, out);
  if (!out.ok) {
    box.innerHTML = `<div class="alert alert-error" role="alert">
      <strong>Can't calculate this rig.</strong> ${out.error.message}
      ${out.error.field ? `<span class="note">(input: ${out.error.field})</span>` : ''}
    </div>`;
    queueEmbedHeight();
    return;
  }

  const r = out.results;
  const warn = out.warnings.map((w) => `
    <div class="alert alert-warn" role="status"><strong>${w.code.replaceAll('_', ' ').toLowerCase()}:</strong> ${w.message}</div>`).join('');

  const sens = (s) => {
    const f = (p) => (p.rad !== null ? deg(p.rad) : `unavailable (${p.unavailable.code})`);
    return `at ±${s.deltaMm} mm eye-distance error: ${f(s.near)} … ${f(s.far)}`;
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

  const readouts = primaryReadouts(state, r);
  box.innerHTML = `${warn}
    <div class="readout-grid">${readouts.map(readoutHtml).join('')}</div>
    <div class="table-wrap"><table class="results-table"><caption class="sr-only">Calculated physical spans</caption>${rows}</table></div>
    <p class="note">These are <strong>physical angular spans</strong>, not game FOV settings. Per-game
    conversion records — each with its source and verification date — ship with the game dataset.</p>
    <details><summary>Assumptions behind these numbers</summary>
      <ul>${out.assumptions.map((a) => `<li><code>${a}</code></li>`).join('')}</ul>
    </details>`;

  renderGameRecord(state, out);

  const actions = $('actions');
  actions.hidden = false;
  actions.dataset.summary = summaryText(state, out);
  actions.dataset.json = JSON.stringify(out, null, 2);
  queueEmbedHeight();
}

function summaryText(state, out) {
  const r = out.results;
  const head = `Sim Geometry Lab — ${state.layout === 'triple' ? 'triple' : 'single'} ${state.curveRadiusMm ? `${state.curveRadiusMm}R curved` : 'flat'} ${state.widthMm}×${state.heightMm} mm at ${state.eyeDistanceMm} mm`;
  const body = state.layout === 'single'
    ? `horizontal ${deg(r.horizontalSpanRad)}, vertical ${deg(r.verticalSpanRad)}`
    : `envelope ${deg(r.visibleEnvelopeRad)}, active ${deg(r.activeImageCoverageRad)}, side angle ${deg(r.requestedYawRad)}`;
  return `${head}\n${body}\n${canonicalShareUrl(state)}`;
}

function canonicalShareUrl(state) {
  return `${location.origin}/tools/fov/#${encodeStateV1(state)}`;
}

function shareCardRigSummary(state) {
  const layout = state.layout === 'triple' ? 'TRIPLE' : 'SINGLE';
  const profile = state.curveRadiusMm ? `${state.curveRadiusMm}R CURVED` : 'FLAT';
  return `${layout} / ${profile} / ${state.widthMm} × ${state.heightMm} MM / EYE ${state.eyeDistanceMm} MM`;
}

function fitCanvasText(ctx, text, maxWidth, startSize, minSize, family) {
  let size = startSize;
  do {
    ctx.font = `800 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return;
    size -= 2;
  } while (size >= minSize);
}

function drawShareCard(state, out) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');

  const accent = '#e8a33d';
  const graphite = '#101318';
  const panel = '#171b20';
  const ink = '#f1ede4';
  const muted = '#a6a39a';
  const line = '#3b424a';
  const mono = 'ui-monospace, Consolas, monospace';
  const condensed = '"Arial Narrow", "Roboto Condensed", Impact, sans-serif';
  const readouts = primaryReadouts(state, out.results);

  ctx.fillStyle = graphite;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  for (let x = 72; x <= 1128; x += 24) {
    const tick = x % 96 === 72 ? 12 : 6;
    ctx.beginPath();
    ctx.moveTo(x, 42);
    ctx.lineTo(x, 42 + tick);
    ctx.stroke();
  }

  ctx.fillStyle = accent;
  ctx.fillRect(72, 72, 34, 34);
  ctx.fillStyle = graphite;
  ctx.font = `900 12px ${mono}`;
  ctx.fillText('SG', 80, 94);
  ctx.fillStyle = ink;
  ctx.font = `800 24px ${mono}`;
  ctx.fillText('SIM GEOMETRY', 124, 98);

  ctx.fillStyle = ink;
  ctx.font = `900 54px ${condensed}`;
  ctx.fillText('OWN YOUR VIEW.', 72, 164);

  readouts.forEach((readout, index) => {
    const x = index === 0 ? 72 : 620;
    ctx.fillStyle = panel;
    ctx.fillRect(x, 196, 508, 242);
    ctx.strokeStyle = line;
    ctx.strokeRect(x + 0.5, 196.5, 507, 241);
    ctx.fillStyle = muted;
    ctx.font = `800 17px ${mono}`;
    ctx.fillText(readout.label.toUpperCase(), x + 28, 235);
    ctx.fillStyle = accent;
    ctx.font = `800 104px ${mono}`;
    const value = toDegrees(readout.radians).toFixed(1);
    ctx.fillText(value, x + 24, 354);
    const valueWidth = ctx.measureText(value).width;
    ctx.font = `800 28px ${mono}`;
    ctx.fillText('DEG', x + 34 + valueWidth, 350);
    ctx.fillStyle = muted;
    ctx.font = `600 15px ${mono}`;
    ctx.fillText(index === 0 ? 'PRIMARY PHYSICAL SPAN' : 'SECONDARY PHYSICAL SPAN', x + 28, 404);
  });

  const rig = shareCardRigSummary(state);
  ctx.fillStyle = ink;
  fitCanvasText(ctx, rig, 1056, 24, 16, mono);
  ctx.fillText(rig, 72, 500);
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.moveTo(72, 530);
  ctx.lineTo(1128, 530);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `800 20px ${mono}`;
  ctx.fillText('SIMGEOMETRY.COM', 72, 575);
  ctx.fillStyle = muted;
  ctx.font = `700 15px ${mono}`;
  ctx.textAlign = 'right';
  ctx.fillText('MEASUREMENTS / COMPATIBILITY / COST', 1128, 575);
  ctx.textAlign = 'left';

  return canvas;
}

function canvasPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG encoding failed'));
    }, 'image/png');
  });
}

async function copyShareCard() {
  const state = currentState;
  const out = currentOutput;
  const button = $('copy-share-card');
  if (!button || !state || !out?.ok) return;

  const shareUrl = canonicalShareUrl(state);
  let copiedPng = false;
  try {
    const canvas = drawShareCard(state, out);
    const png = await canvasPng(canvas);
    if (currentState !== state || currentOutput !== out) return;
    if (navigator.clipboard?.write && typeof ClipboardItem === 'function') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      copiedPng = true;
    }
  } catch {
    copiedPng = false;
  }

  if (!copiedPng) {
    if (currentState !== state || currentOutput !== out) return;
    await navigator.clipboard.writeText(shareUrl);
  }

  button.textContent = copiedPng ? 'Share card copied' : 'Link copied instead';
  setTimeout(() => { button.textContent = 'Copy share card'; }, 1800);
}

// ---------- compute paths ----------

// From canonical state (hash restore, share reproduction) — no form reread.
// currentState is only ever set on SUCCESS, so copy actions can never carry a
// stale or failed rig (gate Exchange 28).
function computeFromState(state, { pushHash } = { pushHash: false }) {
  currentState = null;
  currentOutput = null;
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
  if (out.ok) {
    currentState = state;
    currentOutput = out;
  }
  renderResults(state, out);
  if (pushHash && out.ok) history.replaceState(null, '', `#${encodeStateV1(state)}`);
  syncEmbedAttribution();
  queueEmbedHeight();
  return out;
}

// Any user edit invalidates the last result: stale copying must be impossible.
function invalidateResult() {
  currentState = null;
  currentOutput = null;
  hideActions();
  clearGameRecord();
}

// From user-submitted form.
function calculate() {
  const read = readForm();
  if (read.formError) {
    currentState = null;
    currentOutput = null;
    renderResults(null, { ok: false, error: read.formError });
    return;
  }
  computeFromState(read.state, { pushHash: true });
}

function restoreFromHash() {
  const decoded = decodeStateV1(location.hash);
  if (!decoded.ok) return false;
  writeForm(decoded.state);
  lastUnits = decoded.state.units;
  computeFromState(decoded.state, { pushHash: false });
  return true;
}

function selectGame() {
  if (!currentState || !currentOutput?.ok) {
    renderPendingGameRecord(gameRecords.get($('game').value));
    queueEmbedHeight();
    return;
  }
  currentState = { ...currentState, game: $('game').value || null };
  renderGameRecord(currentState, currentOutput);
  history.replaceState(null, '', `#${encodeStateV1(currentState)}`);
  $('actions').dataset.summary = summaryText(currentState, currentOutput);
  syncEmbedAttribution();
  queueEmbedHeight();
}

function configureEmbed() {
  if (!embedRoot) return;

  const params = new URLSearchParams(location.search);
  const theme = ['light', 'dark', 'auto'].includes(params.get('theme'))
    ? params.get('theme')
    : 'auto';
  embedRoot.classList.remove('theme-light', 'theme-dark', 'theme-auto');
  embedRoot.classList.add(`theme-${theme}`);

  const presetUnits = params.get('units');
  if (Object.hasOwn(UNIT_TO_MM, presetUnits) && presetUnits !== $('units').value) {
    $('units').value = presetUnits;
    convertDisplayedUnits();
  }

  syncEmbedAttribution();
  if ('ResizeObserver' in window) {
    new ResizeObserver(queueEmbedHeight).observe(embedRoot);
  } else {
    window.addEventListener('resize', queueEmbedHeight);
  }
  queueEmbedHeight();
}

export function init() {
  const form = $('fov-form');
  lastUnits = $('units').value;
  configureEmbed();
  form.addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  form.addEventListener('input', (e) => {
    if (e.target.id !== 'game') invalidateResult();
  });
  form.addEventListener('change', (e) => {
    if (e.target.id === 'game') {
      selectGame();
      return;
    }
    invalidateResult();
    if (e.target.id === 'units') convertDisplayedUnits();
    syncVisibility();
  });
  $('copy-link').addEventListener('click', async () => {
    if (!currentState) calculate();
    if (!currentState) return;
    await navigator.clipboard.writeText(canonicalShareUrl(currentState));
    $('copy-link').textContent = 'Link copied';
    setTimeout(() => { $('copy-link').textContent = 'Copy share link'; }, 1500);
  });
  $('copy-summary').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('actions').dataset.summary || '');
  });
  $('copy-json').addEventListener('click', async () => {
    await navigator.clipboard.writeText($('actions').dataset.json || '');
  });
  const shareCardButton = $('copy-share-card');
  if (shareCardButton) shareCardButton.addEventListener('click', copyShareCard);
  window.addEventListener('hashchange', restoreFromHash);
  syncVisibility();
  syncUnitEchoes();
  void loadGameRecords();
  restoreFromHash();
}

init();
