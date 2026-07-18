// SG-B2.1 gate: corrected physics vs independent vectors (0.1° tolerance),
// exact cross-model identities, structured-error rejection of impossible
// geometry, and the versioned facade.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  panelFromDiagonal, inchesToMm, flatHorizontalFov, flatVerticalFov,
  curvedPhysicalSpan, eyeDistanceSensitivity, pixelsPerDegree, toDegrees,
} from '../src/js/geometry/fov.mjs';
import {
  nominalChordYawRad, tripleLayout, seamGapMm, seamHiddenPixels,
  equivalentBezelCorrectedSpanPixels,
} from '../src/js/geometry/triples.mjs';
import { calculateGeometryV1 } from '../src/js/geometry/geometry.mjs';
import { GeometryError } from '../src/js/geometry/errors.mjs';

const TOL_DEG = 0.1;
const closeDeg = (actualRad, expectedDeg, msg) =>
  assert.ok(Math.abs(toDegrees(actualRad) - expectedDeg) < TOL_DEG,
    `${msg}: got ${toDegrees(actualRad).toFixed(3)}°, expected ${expectedDeg}°`);
const throwsCode = (fn, code) => {
  try { fn(); } catch (e) {
    assert.ok(e instanceof GeometryError, `expected GeometryError, got ${e.name}`);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`expected GeometryError(${code}), nothing thrown`);
};

test('panel dimensions from marketed diagonal (27" 16:9)', () => {
  const { widthMm, heightMm } = panelFromDiagonal(inchesToMm(27), 16, 9);
  assert.ok(Math.abs(widthMm - 597.71) < 0.05, `W ${widthMm}`);
  assert.ok(Math.abs(heightMm - 336.21) < 0.05, `H ${heightMm}`);
});

test('flat FOV: 27" 16:9 at 600 mm (the canonical example)', () => {
  const { widthMm, heightMm } = panelFromDiagonal(inchesToMm(27), 16, 9);
  closeDeg(flatHorizontalFov(widthMm, 600), 52.95, 'hFOV');
  closeDeg(flatVerticalFov(heightMm, 600), 31.30, 'vFOV');
});

test('curved concave span: 49" 32:9 1800R at 800 mm — edges CLOSER, span WIDER than flat', () => {
  const { widthMm } = panelFromDiagonal(inchesToMm(49), 32, 9);
  const { spanRad, sagittaMm, edgeDepthMm } = curvedPhysicalSpan(widthMm, 1800, 800);
  // Correct concave physics (gate Exchange 23): sagitta 102.63 mm,
  // edgeDepth = 800 − 102.63 = 697.37 mm, span = 2·atan2(599.06, 697.37) = 81.33°
  assert.ok(Math.abs(sagittaMm - 102.63) < 0.1, `sagitta ${sagittaMm}`);
  assert.ok(Math.abs(edgeDepthMm - 697.37) < 0.1, `edgeDepth ${edgeDepthMm}`);
  closeDeg(spanRad, 81.33, 'curved physical span');
  assert.ok(spanRad > flatHorizontalFov(widthMm, 800), 'concave wrap widens the span vs flat');
});

test('curved identity: eye at the center of curvature (D = R) gives 2·asin(W/2R)', () => {
  const W = 1198.12, R = 800;
  const { spanRad } = curvedPhysicalSpan(W, R, R);
  const identity = 2 * Math.asin(W / (2 * R));
  assert.ok(Math.abs(spanRad - identity) < 1e-12, `D=R identity: ${spanRad} vs ${identity}`);
});

test('curved limit: R → ∞ approaches the flat formula', () => {
  const W = 1198.12, D = 800;
  const { spanRad } = curvedPhysicalSpan(W, 1e9, D);
  assert.ok(Math.abs(spanRad - flatHorizontalFov(W, D)) < 1e-6);
});

test('impossible curved geometry throws structured codes', () => {
  throwsCode(() => curvedPhysicalSpan(2000, 900, 600), 'IMPOSSIBLE_GEOMETRY'); // W/2 > R
  throwsCode(() => curvedPhysicalSpan(1198.12, 610, 100), 'IMPOSSIBLE_GEOMETRY'); // edge reaches eye
  throwsCode(() => flatHorizontalFov(-500, 600), 'NOT_POSITIVE');
  throwsCode(() => flatHorizontalFov(500, 0), 'NOT_POSITIVE');
  throwsCode(() => inchesToMm(0), 'NOT_POSITIVE');
});

test('flat triples: yaw 0 with and without bezels reduces EXACTLY to the flat formula', () => {
  const a = 597.71, D = 600;
  for (const b of [0, 7]) {
    const layout = tripleLayout({ activeMm: a, bezelPerSideMm: b, eyeDistanceMm: D, yawFromCoplanarRad: 0 });
    const flat = flatHorizontalFov(3 * a + 4 * b, D);
    assert.ok(Math.abs(layout.visibleEnvelopeRad - flat) < 1e-12, `bezel ${b}: ray model == flat formula`);
  }
});

test('flat triples: nominal chord yaw (27" + 7 mm at 600 mm) and the coverage identity', () => {
  const base = { activeMm: 597.71, bezelPerSideMm: 7, eyeDistanceMm: 600 };
  const rec = nominalChordYawRad(base);
  closeDeg(rec, 54.01, 'nominal yaw');
  // At the tangent yaw, active coverage equals EXACTLY 3× the single-panel
  // active span, bezels included (Codex-confirmed identity, Exchange 23).
  const layout = tripleLayout({ ...base, yawFromCoplanarRad: rec });
  const single = flatHorizontalFov(base.activeMm, base.eyeDistanceMm);
  assert.ok(Math.abs(layout.activeImageCoverageRad - 3 * single) < 1e-9,
    `coverage ${toDegrees(layout.activeImageCoverageRad)} vs 3×single ${toDegrees(3 * single)}`);
});

test('flat triples: angled beats coplanar; envelope/active/seam invariants hold', () => {
  const base = { activeMm: 597.71, bezelPerSideMm: 7, eyeDistanceMm: 600 };
  const flat0 = tripleLayout({ ...base, yawFromCoplanarRad: 0 });
  const angled = tripleLayout({ ...base, yawFromCoplanarRad: nominalChordYawRad(base) });
  assert.ok(angled.visibleEnvelopeRad > flat0.visibleEnvelopeRad);
  assert.ok(angled.seamOcclusionPerSideRad >= 0);
  assert.ok(angled.activeImageCoverageRad > 0);
  assert.ok(angled.activeImageCoverageRad <= angled.visibleEnvelopeRad);
  assert.deepEqual(angled.warnings, [], 'a normal rig carries no warnings');
});

test('curved triples: R → ∞ converges to the flat triple model', () => {
  const base = { activeMm: 708.5, bezelPerSideMm: 7, eyeDistanceMm: 650, yawFromCoplanarRad: 0.9 };
  const flat = tripleLayout(base);
  const curved = tripleLayout({ ...base, radiusMm: 1e9 });
  assert.ok(Math.abs(flat.visibleEnvelopeRad - curved.visibleEnvelopeRad) < 1e-6);
  assert.ok(Math.abs(flat.activeImageCoverageRad - curved.activeImageCoverageRad) < 1e-6);
});

test('curved triples: 32" 1000R rig at 800 mm — invariants and center-span consistency', () => {
  const base = { activeMm: 708.5, bezelPerSideMm: 7, eyeDistanceMm: 800, radiusMm: 1000 };
  const rec = nominalChordYawRad(base);
  const layout = tripleLayout({ ...base, yawFromCoplanarRad: rec });
  assert.ok(layout.visibleEnvelopeRad > 0);
  assert.ok(layout.seamOcclusionPerSideRad >= 0);
  assert.ok(layout.activeImageCoverageRad > 0);
  assert.ok(layout.activeImageCoverageRad <= layout.visibleEnvelopeRad);
  // center panel span must equal the single curved-panel result
  const single = curvedPhysicalSpan(base.activeMm, base.radiusMm, base.eyeDistanceMm).spanRad;
  assert.ok(Math.abs(layout.centerSpanRad - single) < 1e-12);
  // curved center span is wider than a flat panel of the same chord
  assert.ok(layout.centerSpanRad > flatHorizontalFov(base.activeMm, base.eyeDistanceMm));
});

test('curved triples: too-tight rigs return a DEGRADED result with WRAPS_BEHIND_EYE', () => {
  // 32" 1000R triples at 650 mm: at nominal yaw the outer edges cross the eye
  // plane. Geometrically defined (envelope ≈ 183.67°, Codex-verified) —
  // reported with a warning, not refused (gate Exchange 24 ruling).
  const base = { activeMm: 708.5, bezelPerSideMm: 7, eyeDistanceMm: 650, radiusMm: 1000 };
  const rec = nominalChordYawRad(base);
  closeDeg(rec, 58.13, 'nominal chord yaw');
  const layout = tripleLayout({ ...base, yawFromCoplanarRad: rec });
  assert.equal(layout.warnings.length, 1);
  assert.equal(layout.warnings[0].code, 'WRAPS_BEHIND_EYE');
  closeDeg(layout.visibleEnvelopeRad, 183.67, 'wrapped envelope');
});

test('curved triples: non-monotonic arcs are rejected (interior extremum)', () => {
  // Codex repro (Exchange 24): 500 mm active, 400R, 1500 mm distance, 1.5 rad
  // yaw — the outer endpoint sits at ~17.35° but the arc interior reaches
  // ~18.31°, so endpoint math would under-report the span.
  throwsCode(
    () => tripleLayout({ activeMm: 500, bezelPerSideMm: 7, eyeDistanceMm: 1500, yawFromCoplanarRad: 1.5, radiusMm: 400 }),
    'NON_MONOTONIC_ARC',
  );
});

test('triples: yaw range enforced; deep wrap warns; no-tangent throws', () => {
  const base = { activeMm: 597.71, bezelPerSideMm: 7, eyeDistanceMm: 600 };
  throwsCode(() => tripleLayout({ ...base, yawFromCoplanarRad: 1.8 }), 'YAW_OUT_OF_RANGE'); // > 90°
  // deep wrap at 90° yaw: defined, degraded, warned
  const deep = tripleLayout({ activeMm: 1200, bezelPerSideMm: 5, eyeDistanceMm: 250, yawFromCoplanarRad: Math.PI / 2 });
  assert.equal(deep.warnings[0].code, 'WRAPS_BEHIND_EYE');
  assert.ok(toDegrees(deep.visibleEnvelopeRad) > 180);
  throwsCode(() => nominalChordYawRad({ activeMm: 1300, bezelPerSideMm: 0, eyeDistanceMm: 600 }), 'NO_TANGENT_SOLUTION');
});

test('seam pixels, span equivalent, and integer-resolution validation', () => {
  const seam = seamGapMm(7);
  assert.equal(seam, 14);
  const hidden = seamHiddenPixels(seam, 597.71, 2560);
  assert.ok(Math.abs(hidden - 59.96) < 0.05, `hidden ${hidden}`);
  const span = equivalentBezelCorrectedSpanPixels(597.71, 7, 2560);
  assert.ok(Math.abs(span.spanPixels - (3 * 2560 + 2 * hidden)) < 1e-9);
  throwsCode(() => seamHiddenPixels(14, 597.71, 2560.5), 'NOT_INTEGER');
  throwsCode(() => pixelsPerDegree(0, 1), 'NOT_POSITIVE');
});

test('sensitivity: band brackets the central value; callback results validated', () => {
  const W = 597.71;
  const fn = (d) => flatHorizontalFov(W, d);
  const { nearRad, farRad } = eyeDistanceSensitivity(fn, 600, 10);
  const mid = fn(600);
  assert.ok(nearRad > mid && farRad < mid);
  closeDeg(nearRad, 53.71, 'near');
  closeDeg(farRad, 52.21, 'far');
  throwsCode(() => eyeDistanceSensitivity(() => NaN, 600, 10), 'NOT_FINITE');
});

test('facade: single curved happy path returns radians, assumptions, sensitivity', () => {
  const out = calculateGeometryV1({
    layout: 'single',
    screen: { diagonalMm: inchesToMm(49), aspect: [32, 9] },
    curveRadiusMm: 1800,
    eyeDistanceMm: 800,
    resolution: { horizontal: 5120, vertical: 1440 },
  });
  assert.equal(out.ok, true);
  closeDeg(out.results.horizontalSpanRad, 81.33, 'facade curved span');
  assert.ok(out.results.curve.sagittaMm > 0);
  assert.ok(out.results.pixelsPerDegree > 0);
  assert.ok(out.assumptions.includes('curved-panel-concave-toward-viewer'));
  assert.ok(out.results.sensitivity.near.rad > out.results.horizontalSpanRad);
  assert.deepEqual(out.warnings, []);
});

test('facade: sensitivity endpoint crossing a boundary NEVER erases the central result', () => {
  // 49" 1800R at 105 mm: central edgeDepth = 2.37 mm (valid, extreme); the
  // 95 mm near probe has edgeDepth < 0 and must report structured
  // unavailability while the central answer stands (gate Exchange 24).
  const out = calculateGeometryV1({
    layout: 'single',
    screen: { widthMm: 1198.12, heightMm: 336.9 },
    curveRadiusMm: 1800,
    eyeDistanceMm: 105,
  });
  assert.equal(out.ok, true, 'central result stands');
  assert.ok(out.results.horizontalSpanRad > 0);
  assert.equal(out.results.sensitivity.near.rad, null);
  assert.equal(out.results.sensitivity.near.unavailable.code, 'IMPOSSIBLE_GEOMETRY');
  assert.ok(out.results.sensitivity.far.rad > 0, 'far endpoint still numeric');
});

test('facade: wrapped triple returns ok with WRAPS_BEHIND_EYE warning', () => {
  const out = calculateGeometryV1({
    layout: 'triple',
    screen: { widthMm: 708.5, heightMm: 398.5 },
    curveRadiusMm: 1000,
    eyeDistanceMm: 650,
    resolution: null,
    triple: { bezelPerSideMm: 7, yawFromCoplanarRad: 'recommended' },
  });
  assert.equal(out.ok, true);
  assert.equal(out.warnings.length, 1);
  assert.equal(out.warnings[0].code, 'WRAPS_BEHIND_EYE');
  closeDeg(out.results.visibleEnvelopeRad, 183.67, 'wrapped envelope via facade');
  assert.equal(out.results.nominalYaw.method, 'flat-chord-tangent');
  assert.ok(out.assumptions.includes('yaw-recommendation-flat-chord-tangent'));
});

test('facade: triple with recommended yaw; deterministic output', () => {
  const input = {
    layout: 'triple',
    screen: { widthMm: 597.71, heightMm: 336.21 },
    curveRadiusMm: null,
    eyeDistanceMm: 600,
    resolution: { horizontal: 2560, vertical: 1440 },
    triple: { bezelPerSideMm: 7, yawFromCoplanarRad: 'recommended' },
  };
  const a = calculateGeometryV1(input);
  const b = calculateGeometryV1(input);
  assert.equal(a.ok, true);
  assert.deepEqual(a, b, 'same input, same output');
  closeDeg(a.results.nominalYaw.rad, 54.01, 'facade nominal yaw');
  assert.equal(a.results.requestedYawRad, a.results.nominalYaw.rad);
  assert.equal(a.results.yawDeltaFromNominalRad, 0);
  assert.equal(a.results.seamGapMm, 14);
  assert.deepEqual(a.warnings, []);
});

test('facade: structured errors, never throws', () => {
  assert.equal(calculateGeometryV1(null).ok, false);
  assert.equal(calculateGeometryV1({ layout: 'quad', screen: { widthMm: 1, heightMm: 1 }, eyeDistanceMm: 1 }).error.code, 'INVALID_INPUT');
  const bad = calculateGeometryV1({
    layout: 'single',
    screen: { widthMm: 2000, heightMm: 500 },
    curveRadiusMm: 900,
    eyeDistanceMm: 600,
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, 'IMPOSSIBLE_GEOMETRY');
  const missingTriple = calculateGeometryV1({
    layout: 'triple', screen: { widthMm: 500, heightMm: 300 }, eyeDistanceMm: 600,
  });
  assert.equal(missingTriple.error.code, 'INVALID_INPUT');
  // the full resolution contract is validated, not just .horizontal
  const badRes = calculateGeometryV1({
    layout: 'single', screen: { widthMm: 500, heightMm: 300 }, eyeDistanceMm: 600,
    resolution: { horizontal: 2560, vertical: 0 },
  });
  assert.equal(badRes.ok, false);
  assert.equal(badRes.error.code, 'NOT_POSITIVE');
  assert.equal(badRes.error.field, 'resolution.vertical');
});

test('facade: manual yaw works even when no nominal yaw exists (gate Exchange 25 fixture)', () => {
  // 1300 mm active at 600 mm: the chord-tangent comparison exceeds 90°, but a
  // manual 0° layout is perfectly valid (145.79° envelope) and must succeed.
  const screen = { widthMm: 1300, heightMm: 550 };
  const manual = calculateGeometryV1({
    layout: 'triple', screen, eyeDistanceMm: 600,
    triple: { bezelPerSideMm: 0, yawFromCoplanarRad: 0 },
  });
  assert.equal(manual.ok, true, 'manual layout must not fail on the optional nominal comparison');
  closeDeg(manual.results.visibleEnvelopeRad, 145.79, 'manual coplanar envelope');
  assert.equal(manual.results.nominalYaw.rad, null);
  assert.equal(manual.results.nominalYaw.method, 'flat-chord-tangent');
  assert.equal(manual.results.nominalYaw.unavailable.code, 'NO_TANGENT_SOLUTION');
  assert.equal(manual.results.yawDeltaFromNominalRad, null);
  assert.ok(manual.warnings.some((w) => w.code === 'NOMINAL_YAW_UNAVAILABLE'));
  // the 'recommended' sentinel still fails structurally for the same rig
  const auto = calculateGeometryV1({
    layout: 'triple', screen, eyeDistanceMm: 600,
    triple: { bezelPerSideMm: 0, yawFromCoplanarRad: 'recommended' },
  });
  assert.equal(auto.ok, false);
  assert.equal(auto.error.code, 'NO_TANGENT_SOLUTION');
});
