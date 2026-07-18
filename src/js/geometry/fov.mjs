// Core field-of-view geometry. Pure functions; millimetres and RADIANS
// throughout — degree formatting belongs to the presentation edge only.
// Shared by the tool page, the embed, and tests.
//
// Conventions and assumptions (also published on /methodology/):
// - Eye is centered on the middle screen at perpendicular distance D (mm),
//   measured to the CENTER of the panel surface.
// - "width"/"height" are VISIBLE image dimensions, not cabinet dimensions.
// - Curved panels are CONCAVE toward the viewer: the panel is an arc whose
//   center of curvature sits on the viewer's side, so the panel EDGES are
//   CLOSER to the eye than the panel center. Measured flat width is the CHORD.
// - Functions return PHYSICAL angular spans. A game's projected FOV setting is
//   a separate concept, mapped per-game with sources (B5) — a rectilinear
//   projection cannot match a curved surface at every pixel with one number.
// - Impossible geometry throws GeometryError (structured .code), never
//   silently normalizes.
import {
  GeometryError, assertPositive, assertPositiveInteger, assertFinite,
} from './errors.mjs';

const DEG = 180 / Math.PI;
export const toDegrees = (rad) => rad * DEG;

export function inchesToMm(inches) {
  assertPositive('inches', inches);
  return inches * 25.4;
}

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

/** Horizontal physical span (rad) of a centered flat panel of visible width W. */
export function flatHorizontalFov(widthMm, eyeDistanceMm) {
  assertPositive('widthMm', widthMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  return 2 * Math.atan(widthMm / (2 * eyeDistanceMm));
}

/** Vertical physical span (rad) of a centered flat panel of visible height H. */
export function flatVerticalFov(heightMm, eyeDistanceMm) {
  assertPositive('heightMm', heightMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  return 2 * Math.atan(heightMm / (2 * eyeDistanceMm));
}

/**
 * Horizontal PHYSICAL angular span (rad) of a concave curved panel.
 * widthMm = visible CHORD; radiusMm = curvature radius (an "1800R" panel is
 * 1800 mm); eyeDistanceMm = eye to panel CENTER. Because the panel wraps
 * toward the viewer, the edges sit CLOSER than the center by the sagitta:
 *   sagitta = R − √(R² − (W/2)²)
 *   edgeDepth = D − sagitta          (must stay in front of the eye)
 *   span = 2·atan2(W/2, edgeDepth)
 * Identity: with the eye at the center of curvature (D = R),
 *   span = 2·asin(W / 2R).
 */
export function curvedPhysicalSpan(widthMm, radiusMm, eyeDistanceMm) {
  assertPositive('widthMm', widthMm);
  assertPositive('radiusMm', radiusMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  const half = widthMm / 2;
  if (half > radiusMm) {
    throw new GeometryError(
      'IMPOSSIBLE_GEOMETRY',
      `half-width ${half}mm exceeds curvature radius ${radiusMm}mm`,
      'widthMm',
    );
  }
  const sagittaMm = radiusMm - Math.sqrt(radiusMm * radiusMm - half * half);
  const edgeDepthMm = eyeDistanceMm - sagittaMm;
  if (edgeDepthMm <= 0) {
    throw new GeometryError(
      'IMPOSSIBLE_GEOMETRY',
      `panel edges reach the eye plane: eye distance ${eyeDistanceMm}mm minus sagitta ${sagittaMm.toFixed(1)}mm <= 0`,
      'eyeDistanceMm',
    );
  }
  return {
    spanRad: 2 * Math.atan2(half, edgeDepthMm),
    sagittaMm,
    edgeDepthMm,
  };
}

/**
 * Sensitivity of a result to eye-distance measurement error.
 * fn(distanceMm) must return a finite number (rad).
 */
export function eyeDistanceSensitivity(fn, eyeDistanceMm, deltaMm = 10) {
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  assertPositive('deltaMm', deltaMm);
  if (deltaMm >= eyeDistanceMm) {
    throw new GeometryError('IMPOSSIBLE_GEOMETRY', 'deltaMm must be < eyeDistanceMm', 'deltaMm');
  }
  const near = fn(eyeDistanceMm - deltaMm);
  const far = fn(eyeDistanceMm + deltaMm);
  assertFinite('sensitivity callback result (near)', near);
  assertFinite('sensitivity callback result (far)', far);
  return { nearRad: near, farRad: far };
}

/** Pixels per degree across a span. Resolution must be a positive integer. */
export function pixelsPerDegree(horizontalPixels, spanRad) {
  assertPositiveInteger('horizontalPixels', horizontalPixels);
  assertPositive('spanRad', spanRad);
  return horizontalPixels / (spanRad * DEG);
}
