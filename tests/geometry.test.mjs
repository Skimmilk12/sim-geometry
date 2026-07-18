// SG-B2/B3 gate: math engine vs independently derived vectors, 0.1° tolerance,
// plus exact cross-model identities (ray model must reduce to the flat formula)
// and impossible-geometry rejection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  panelFromDiagonal, inchesToMm, flatHorizontalFov, flatVerticalFov,
  curvedHorizontalFov, eyeDistanceSensitivity, pixelsPerDegree, toDegrees,
} from '../src/js/geometry/fov.mjs';
import {
  recommendedYaw, tripleLayout, seamGapMm, seamHiddenPixels,
  bezelCorrectedSpanResolution,
} from '../src/js/geometry/triples.mjs';

const TOL_DEG = 0.1;
const closeDeg = (actualRad, expectedDeg, msg) =>
  assert.ok(Math.abs(toDegrees(actualRad) - expectedDeg) < TOL_DEG,
    `${msg}: got ${toDegrees(actualRad).toFixed(3)}°, expected ${expectedDeg}°`);

// Independent derivation of the same edge angles via vector dot product —
// a second math path (acos of normalized dot) to cross-check atan2 results.
const angleBetween = (p, q) => {
  const dot = p.x * q.x + p.y * q.y;
  return Math.acos(dot / (Math.hypot(p.x, p.y) * Math.hypot(q.x, q.y)));
};

test('panel dimensions from marketed diagonal (27" 16:9)', () => {
  // 27" = 685.8 mm; W = 685.8·16/√337, H = 685.8·9/√337 (hand-derived; matches
  // the commonly published 596.7×335.7 mm visible size within panel rounding).
  const { widthMm, heightMm } = panelFromDiagonal(inchesToMm(27), 16, 9);
  assert.ok(Math.abs(widthMm - 597.71) < 0.05, `W ${widthMm}`);
  assert.ok(Math.abs(heightMm - 336.21) < 0.05, `H ${heightMm}`);
});

test('flat FOV: 27" 16:9 at 600 mm (the canonical example)', () => {
  const { widthMm, heightMm } = panelFromDiagonal(inchesToMm(27), 16, 9);
  // Hand derivation: 2·atan(597.71/1200) = 52.95°; 2·atan(336.21/1200) = 31.30°
  closeDeg(flatHorizontalFov(widthMm, 600), 52.95, 'hFOV');
  closeDeg(flatVerticalFov(heightMm, 600), 31.30, 'vFOV');
});

test('curved FOV: 49" 32:9 1800R at 800 mm; must be narrower than flat', () => {
  const { widthMm } = panelFromDiagonal(inchesToMm(49), 32, 9);
  assert.ok(Math.abs(widthMm - 1198.12) < 0.1, `W ${widthMm}`);
  const { fovRad, sagittaMm } = curvedHorizontalFov(widthMm, 1800, 800);
  // Hand derivation: sagitta = 1800−√(1800²−599.06²) = 102.63 mm;
  // hFOV = 2·atan2(599.06, 902.63) = 67.15°
  assert.ok(Math.abs(sagittaMm - 102.63) < 0.1, `sagitta ${sagittaMm}`);
  closeDeg(fovRad, 67.15, 'curved hFOV');
  const flat = flatHorizontalFov(widthMm, 800);
  assert.ok(fovRad < flat, 'curved edges sit deeper, so FOV must be smaller than flat');
});

test('curved: independent vector-model cross-check', () => {
  const W = 1198.12, R = 1800, D = 800;
  const { fovRad, sagittaMm } = curvedHorizontalFov(W, R, D);
  const edge = { x: W / 2, y: D + sagittaMm };
  const independent = 2 * angleBetween(edge, { x: 0, y: 1 });
  assert.ok(Math.abs(toDegrees(fovRad) - toDegrees(independent)) < 1e-9);
});

test('impossible curved geometry is rejected, not normalized', () => {
  assert.throws(() => curvedHorizontalFov(2000, 900, 600), RangeError);
  assert.throws(() => flatHorizontalFov(-500, 600), RangeError);
  assert.throws(() => flatHorizontalFov(500, 0), RangeError);
});

test('triples: yaw 0 with and without bezels reduces EXACTLY to the flat formula', () => {
  const a = 597.71, D = 600;
  for (const b of [0, 7]) {
    const layout = tripleLayout({ activeMm: a, bezelPerSideMm: b, eyeDistanceMm: D, yawRad: 0 });
    // Coplanar span of three panels: total visible outer width = 3a + 4b
    const flat = flatHorizontalFov(3 * a + 4 * b, D);
    assert.ok(Math.abs(layout.totalFovRad - flat) < 1e-12, `bezel ${b}: ray model == flat formula`);
  }
});

test('triples: recommended yaw for 27" + 7 mm bezels at 600 mm', () => {
  // M = 597.71 + 14 = 611.71; 2·atan(611.71/1200) = 54.01° (hand-derived; in the
  // 55–60° neighborhood the community quotes for ~60 cm triples).
  closeDeg(recommendedYaw(597.71, 7, 600), 54.01, 'recommended yaw');
});

test('triples: angled layout is wider than coplanar and seams are positive', () => {
  const base = { activeMm: 597.71, bezelPerSideMm: 7, eyeDistanceMm: 600 };
  const flat0 = tripleLayout({ ...base, yawRad: 0 });
  const angled = tripleLayout({ ...base, yawRad: recommendedYaw(base.activeMm, base.bezelPerSideMm, base.eyeDistanceMm) });
  assert.ok(angled.totalFovRad > flat0.totalFovRad, 'angling toward the eye increases coverage');
  assert.ok(angled.seamPerSideRad > 0, 'seam occlusion is positive');
  assert.ok(angled.activeFovRad < angled.totalFovRad, 'active < total');
  // independent dot-product cross-check of the outer edge angle
  const independent = 2 * angleBetween(angled.right.to, { x: 0, y: 1 });
  assert.ok(Math.abs(independent - angled.totalFovRad) < 1e-9);
});

test('triples: wrap-behind-the-eye geometry is rejected', () => {
  assert.throws(
    () => tripleLayout({ activeMm: 1200, bezelPerSideMm: 5, eyeDistanceMm: 250, yawRad: 2.6 }),
    RangeError,
  );
});

test('seam pixels and bezel-corrected span (2560 px on 597.71 mm, 7 mm bezels)', () => {
  const seam = seamGapMm(7);
  assert.equal(seam, 14);
  // pitch = 597.71/2560 = 0.2335 mm/px → 14 mm ≈ 59.96 px hidden per seam
  const hidden = seamHiddenPixels(seam, 597.71, 2560);
  assert.ok(Math.abs(hidden - 59.96) < 0.05, `hidden ${hidden}`);
  const span = bezelCorrectedSpanResolution(597.71, 7, 2560);
  assert.ok(Math.abs(span.spanPixels - (3 * 2560 + 2 * hidden)) < 1e-9);
});

test('eye-distance sensitivity band brackets the central value', () => {
  const W = 597.71;
  const fn = (d) => flatHorizontalFov(W, d);
  const { nearRad, farRad } = eyeDistanceSensitivity(fn, 600, 10);
  const mid = fn(600);
  assert.ok(nearRad > mid && farRad < mid, 'closer eye = wider FOV, farther = narrower');
  // hand-derived: 2·atan(298.855/590) = 53.71°; 2·atan(298.855/610) = 52.21°
  closeDeg(nearRad, 53.71, 'near');
  closeDeg(farRad, 52.21, 'far');
});

test('pixels per degree', () => {
  const fov = flatHorizontalFov(597.71, 600); // 52.95°
  const ppd = pixelsPerDegree(2560, fov);
  assert.ok(Math.abs(ppd - 2560 / 52.9497) < 0.05, `ppd ${ppd}`);
});
