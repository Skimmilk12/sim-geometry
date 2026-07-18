// Core field-of-view geometry. Pure functions, millimetres and radians inside;
// degrees only at the formatting edge. Shared by the tool page, the embed, and tests.
//
// Conventions and assumptions (also published on /methodology/):
// - Eye position is centered on the middle screen at perpendicular distance D (mm).
// - "width"/"height" are VISIBLE image dimensions, not cabinet dimensions.
// - Curved panels: the measured flat width is treated as the CHORD of the arc.
// - All functions throw TypeError/RangeError on impossible geometry rather than
//   silently normalizing; the UI layer maps these to user-facing messages.

const DEG = 180 / Math.PI;

function assertFinite(name, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new TypeError(`${name} must be a finite number, got ${v}`);
  }
}
function assertPositive(name, v) {
  assertFinite(name, v);
  if (v <= 0) throw new RangeError(`${name} must be > 0, got ${v}`);
}

export const toDegrees = (rad) => rad * DEG;

/** Visible width/height (mm) from a marketed diagonal (mm) and aspect ratio a:b. */
export function panelFromDiagonal(diagonalMm, aspectW, aspectH) {
  assertPositive('diagonalMm', diagonalMm);
  assertPositive('aspectW', aspectW);
  assertPositive('aspectH', aspectH);
  const hyp = Math.hypot(aspectW, aspectH);
  return {
    widthMm: (diagonalMm * aspectW) / hyp,
    heightMm: (diagonalMm * aspectH) / hyp,
  };
}

export const inchesToMm = (inches) => inches * 25.4;

/** Horizontal FOV (rad) of a centered flat panel of visible width W at eye distance D. */
export function flatHorizontalFov(widthMm, eyeDistanceMm) {
  assertPositive('widthMm', widthMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  return 2 * Math.atan(widthMm / (2 * eyeDistanceMm));
}

/** Vertical FOV (rad) of a centered flat panel of visible height H at eye distance D. */
export function flatVerticalFov(heightMm, eyeDistanceMm) {
  return flatHorizontalFov(heightMm, eyeDistanceMm); // same formula, different axis
}

/**
 * Horizontal FOV (rad) of a horizontally curved panel.
 * widthMm is the CHORD (measured straight across); radiusMm the curvature radius
 * (e.g. an "1800R" panel = 1800 mm). Eye distance is to the CENTER of the panel
 * surface. The panel edges sit deeper than the center by `sagittaMm`.
 * Model: edge angular position = atan2(chord/2, D + sagitta); FOV = 2x that.
 */
export function curvedHorizontalFov(widthMm, radiusMm, eyeDistanceMm) {
  assertPositive('widthMm', widthMm);
  assertPositive('radiusMm', radiusMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  const half = widthMm / 2;
  if (half > radiusMm) {
    throw new RangeError(
      `impossible geometry: half-width ${half}mm exceeds curvature radius ${radiusMm}mm`,
    );
  }
  const sagittaMm = radiusMm - Math.sqrt(radiusMm * radiusMm - half * half);
  return {
    fovRad: 2 * Math.atan2(half, eyeDistanceMm + sagittaMm),
    sagittaMm,
  };
}

/**
 * Sensitivity of a result to eye-distance measurement error.
 * Returns FOV (rad) at D - delta and D + delta (default ±10 mm).
 */
export function eyeDistanceSensitivity(fovFn, eyeDistanceMm, deltaMm = 10) {
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  assertPositive('deltaMm', deltaMm);
  if (deltaMm >= eyeDistanceMm) throw new RangeError('deltaMm must be < eyeDistanceMm');
  return {
    nearRad: fovFn(eyeDistanceMm - deltaMm),
    farRad: fovFn(eyeDistanceMm + deltaMm),
  };
}

/** Pixels per degree across a span. */
export function pixelsPerDegree(horizontalPixels, fovRad) {
  assertPositive('horizontalPixels', horizontalPixels);
  assertPositive('fovRad', fovRad);
  return horizontalPixels / (fovRad * DEG);
}
