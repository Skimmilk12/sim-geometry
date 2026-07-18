// Triple-monitor geometry via an explicit 2D ray model (top view), NOT 3x a
// single-screen FOV. Coordinates: eye at origin; +y toward the center screen;
// x to the right. All lengths mm, all angles radians.
//
// Panel model per monitor: visible active width `activeMm`, plus physical bezel
// widths on each side of the visible image (`bezelMm` per side, symmetric).
// Side monitors pivot around the point where their inner OUTER-CABINET edge
// meets the center monitor's outer cabinet edge (panels touching), yawed
// toward the viewer by `yawRad` (0 = coplanar with center).
import { toDegrees } from './fov.mjs';

function assertPositive(name, v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new RangeError(`${name} must be a finite number > 0, got ${v}`);
  }
}
function assertNonNegative(name, v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new RangeError(`${name} must be a finite number >= 0, got ${v}`);
  }
}

/**
 * Recommended side-monitor yaw: the angle that makes each side panel sit on the
 * circle of correct perspective — equal to the angular width of one full panel
 * (active + both bezels) at the eye. The classic tangent rule.
 */
export function recommendedYaw(activeMm, bezelPerSideMm, eyeDistanceMm) {
  assertPositive('activeMm', activeMm);
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  const outerMm = activeMm + 2 * bezelPerSideMm;
  return 2 * Math.atan(outerMm / (2 * eyeDistanceMm));
}

/**
 * Full ray-model layout of symmetric triples.
 * Returns endpoint coordinates of each visible panel plus derived angles.
 * opts: { activeMm, bezelPerSideMm, eyeDistanceMm, yawRad }
 */
export function tripleLayout({ activeMm, bezelPerSideMm, eyeDistanceMm, yawRad }) {
  assertPositive('activeMm', activeMm);
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  assertNonNegative('yawRad', yawRad);
  if (yawRad >= Math.PI) throw new RangeError('yawRad must be < PI');

  const b = bezelPerSideMm;
  const D = eyeDistanceMm;

  // Center panel: visible span from (-activeMm/2, D) to (+activeMm/2, D).
  const centerL = { x: -activeMm / 2, y: D };
  const centerR = { x: +activeMm / 2, y: D };

  // Right cabinet edge of the center monitor — the hinge where the right side
  // monitor's cabinet meets it.
  const hinge = { x: activeMm / 2 + b, y: D };

  // Right side monitor runs outward from the hinge, rotated toward the viewer
  // by yawRad. Its own visible image starts one bezel past the hinge.
  const dir = { x: Math.cos(yawRad), y: -Math.sin(yawRad) };
  const rightVisStart = { x: hinge.x + dir.x * b, y: hinge.y + dir.y * b };
  const rightVisEnd = {
    x: hinge.x + dir.x * (b + activeMm),
    y: hinge.y + dir.y * (b + activeMm),
  };
  if (rightVisEnd.y <= 0) {
    throw new RangeError('impossible geometry: side panel wraps behind the eye plane');
  }

  const ang = (p) => Math.atan2(p.x, p.y); // angle from straight-ahead, +right

  // Total horizontal FOV: outermost visible edge to outermost visible edge.
  const outerRad = 2 * ang(rightVisEnd);
  // Active coverage excludes the two seam gaps (bezel-occluded spans).
  const seamRad = ang(rightVisStart) - ang(centerR);
  const activeRad = outerRad - 2 * seamRad;

  return {
    center: { from: centerL, to: centerR },
    right: { from: rightVisStart, to: rightVisEnd }, // left mirrors by symmetry
    hinge,
    totalFovRad: outerRad,
    activeFovRad: activeRad,
    seamPerSideRad: seamRad,
    totalFovDeg: toDegrees(outerRad),
  };
}

/** Physical seam gap between adjacent visible images: two bezel widths. */
export function seamGapMm(bezelPerSideMm) {
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  return 2 * bezelPerSideMm;
}

/** Hidden pixels equivalent to the seam gap, at the panel's pixel pitch. */
export function seamHiddenPixels(seamMm, activeMm, horizontalResolution) {
  assertNonNegative('seamMm', seamMm);
  assertPositive('activeMm', activeMm);
  assertPositive('horizontalResolution', horizontalResolution);
  return seamMm / (activeMm / horizontalResolution);
}

/**
 * Bezel-corrected equivalent horizontal resolution for a triple span:
 * the pixel count a game should treat the span as having, if it compensates
 * for the physically hidden seams. Clearly an EQUIVALENT, not a mode.
 */
export function bezelCorrectedSpanResolution(activeMm, bezelPerSideMm, horizontalResolution) {
  const seam = seamGapMm(bezelPerSideMm);
  const hidden = seamHiddenPixels(seam, activeMm, horizontalResolution);
  return { spanPixels: 3 * horizontalResolution + 2 * hidden, hiddenPerSeam: hidden };
}
