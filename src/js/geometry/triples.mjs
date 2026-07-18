// Triple-monitor geometry via an explicit 2D ray model (top view) — flat AND
// concave-curved identical panels. NOT 3x a single-screen span.
//
// Frame: eye at origin, +y toward the center screen, +x to the right. All
// lengths mm, all angles RADIANS. Results are PHYSICAL angular quantities;
// per-game FOV settings are mapped separately (B5).
//
// Panel model: visible chord `activeMm`, plus a physical bezel of
// `bezelPerSideMm` on each side of the visible image, measured as a CHORD
// extension (for curved panels the sub-millimetre arc-vs-chord bezel
// difference is negligible and this assumption is documented).
// Side monitors pivot at the point where their inner cabinet edge meets the
// center monitor's cabinet edge, yawed toward the viewer by
// `yawFromCoplanarRad` (0 = side chord collinear with the center chord).
import { GeometryError, assertPositive, assertNonNegative, assertPositiveInteger } from './errors.mjs';
import { curvedPhysicalSpan, flatHorizontalFov } from './fov.mjs';

const EPS = 1e-9;

// angle from straight-ahead (+y), positive to the right
const ang = (p) => Math.atan2(p.x, p.y);

/**
 * Recommended side-monitor yaw: the CHORD-TANGENT rule — the angle that puts
 * each side panel's chord tangent to the viewing circle, equal to the angular
 * width one full flat cabinet (active + both bezels) would subtend at the eye:
 *   yaw = 2·atan(cabinet / 2D)
 * The same rule is applied to curved panels (on the chord). Panel curvature
 * changes the SPANS, not this mounting recommendation — a curved panel has no
 * exact tangent solution unless R equals the viewing distance, so the chord
 * rule is the documented v1 assumption (refined with sources in B5).
 * Throws GeometryError('NO_TANGENT_SOLUTION') when no yaw <= 90° exists.
 */
export function recommendedYawRad({ activeMm, bezelPerSideMm, eyeDistanceMm }) {
  assertPositive('activeMm', activeMm);
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  const cabinetMm = activeMm + 2 * bezelPerSideMm;
  const yaw = 2 * Math.atan(cabinetMm / (2 * eyeDistanceMm));
  if (yaw > Math.PI / 2 + EPS) {
    throw new GeometryError(
      'NO_TANGENT_SOLUTION',
      `cabinet width ${cabinetMm}mm subtends more than 90° at ${eyeDistanceMm}mm — no valid tangent yaw`,
      'eyeDistanceMm',
    );
  }
  return Math.min(yaw, Math.PI / 2);
}

// Local-frame side-panel point for curved panels. psi in [-phiC, +phiC];
// origin at the INNER cabinet edge, chord along +x, bulge +y (away from a
// viewer at -y in local terms).
function curvedLocalPoint(psi, radiusMm, phiC) {
  return {
    x: radiusMm * (Math.sin(psi) + Math.sin(phiC)),
    y: radiusMm * (Math.cos(psi) - Math.cos(phiC)),
  };
}

/**
 * Ray-model layout of symmetric identical triples (flat or concave-curved).
 * opts: { activeMm, bezelPerSideMm, eyeDistanceMm, yawFromCoplanarRad, radiusMm? }
 * Returns world coordinates of the visible-image endpoints plus derived
 * physical angles (all radians):
 *   visibleEnvelopeRad        outer visible edge to outer visible edge
 *   activeImageCoverageRad    envelope minus the two seam occlusions
 *   seamOcclusionPerSideRad   angular span hidden behind each seam
 *   centerSpanRad             the center panel's own visible span
 */
export function tripleLayout({ activeMm, bezelPerSideMm, eyeDistanceMm, yawFromCoplanarRad, radiusMm = null }) {
  assertPositive('activeMm', activeMm);
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  assertPositive('eyeDistanceMm', eyeDistanceMm);
  assertNonNegative('yawFromCoplanarRad', yawFromCoplanarRad);
  if (yawFromCoplanarRad > Math.PI / 2 + EPS) {
    throw new GeometryError(
      'YAW_OUT_OF_RANGE',
      `yawFromCoplanarRad must be within [0, 90°], got ${yawFromCoplanarRad}`,
      'yawFromCoplanarRad',
    );
  }

  const b = bezelPerSideMm;
  const D = eyeDistanceMm;
  const th = Math.min(yawFromCoplanarRad, Math.PI / 2);
  const rot = (p) => ({ x: p.x * Math.cos(th) + p.y * Math.sin(th), y: -p.x * Math.sin(th) + p.y * Math.cos(th) });

  let centerR, hinge, sideInner, sideOuter, centerSpanRad;

  if (radiusMm === null) {
    // FLAT: straight segments.
    centerR = { x: activeMm / 2, y: D };
    hinge = { x: activeMm / 2 + b, y: D };
    const add = (t) => ({ x: hinge.x + rot({ x: t, y: 0 }).x, y: hinge.y + rot({ x: t, y: 0 }).y });
    sideInner = add(b);
    sideOuter = add(b + activeMm);
    centerSpanRad = flatHorizontalFov(activeMm, D);
  } else {
    // CURVED: each panel is an arc of radius R, concave toward the viewer.
    const cabinetMm = activeMm + 2 * b;
    if (cabinetMm / 2 > radiusMm) {
      throw new GeometryError(
        'IMPOSSIBLE_GEOMETRY',
        `cabinet half-width ${cabinetMm / 2}mm exceeds curvature radius ${radiusMm}mm`,
        'radiusMm',
      );
    }
    const phiV = Math.asin(activeMm / (2 * radiusMm));
    const phiC = Math.asin(cabinetMm / (2 * radiusMm));
    // Center panel arc: P(phi) = (R sin phi, D - R + R cos phi)
    const P = (phi) => ({ x: radiusMm * Math.sin(phi), y: D - radiusMm + radiusMm * Math.cos(phi) });
    centerR = P(phiV);
    hinge = P(phiC);
    const place = (psi) => {
      const l = rot(curvedLocalPoint(psi, radiusMm, phiC));
      return { x: hinge.x + l.x, y: hinge.y + l.y };
    };
    sideInner = place(-phiV);
    sideOuter = place(+phiV);
    centerSpanRad = curvedPhysicalSpan(activeMm, radiusMm, D).spanRad;
  }

  // Postconditions: physically meaningful layout or a structured error.
  for (const [name, p] of [['center edge', centerR], ['side inner edge', sideInner], ['side outer edge', sideOuter]]) {
    if (p.y <= 0) {
      throw new GeometryError('IMPOSSIBLE_GEOMETRY', `${name} reaches the eye plane`, 'yawFromCoplanarRad');
    }
  }
  if (sideOuter.x <= 0) {
    throw new GeometryError('IMPOSSIBLE_GEOMETRY', 'side panel folds across the centerline', 'yawFromCoplanarRad');
  }

  const visibleEnvelopeRad = 2 * ang(sideOuter);
  let seamOcclusionPerSideRad = ang(sideInner) - ang(centerR);
  if (seamOcclusionPerSideRad < -EPS) {
    throw new GeometryError('IMPOSSIBLE_GEOMETRY', 'side visible image overlaps the center image', 'yawFromCoplanarRad');
  }
  seamOcclusionPerSideRad = Math.max(0, seamOcclusionPerSideRad);
  const activeImageCoverageRad = visibleEnvelopeRad - 2 * seamOcclusionPerSideRad;

  if (!(visibleEnvelopeRad > 0)) {
    throw new GeometryError('IMPOSSIBLE_GEOMETRY', 'layout produced a non-positive envelope', 'yawFromCoplanarRad');
  }
  if (!(activeImageCoverageRad > 0) || activeImageCoverageRad > visibleEnvelopeRad + EPS) {
    throw new GeometryError('IMPOSSIBLE_GEOMETRY', 'active coverage outside (0, envelope]', 'yawFromCoplanarRad');
  }

  return {
    center: { to: centerR },
    side: { from: sideInner, to: sideOuter },
    hinge,
    visibleEnvelopeRad,
    activeImageCoverageRad,
    seamOcclusionPerSideRad,
    centerSpanRad,
  };
}

/** Physical seam gap between adjacent visible images: two bezel widths (chord). */
export function seamGapMm(bezelPerSideMm) {
  assertNonNegative('bezelPerSideMm', bezelPerSideMm);
  return 2 * bezelPerSideMm;
}

/** Hidden pixels equivalent to the seam gap, at the panel's pixel pitch. */
export function seamHiddenPixels(seamMm, activeMm, horizontalResolution) {
  assertNonNegative('seamMm', seamMm);
  assertPositive('activeMm', activeMm);
  assertPositiveInteger('horizontalResolution', horizontalResolution);
  return seamMm / (activeMm / horizontalResolution);
}

/**
 * Equivalent bezel-corrected raster span for a triple: the pixel count a game
 * should treat the span as having IF it compensates for physically hidden
 * seams. An EQUIVALENT for that purpose — not a display mode, and not a value
 * every game accepts.
 */
export function equivalentBezelCorrectedSpanPixels(activeMm, bezelPerSideMm, horizontalResolution) {
  const seam = seamGapMm(bezelPerSideMm);
  const hidden = seamHiddenPixels(seam, activeMm, horizontalResolution);
  return { spanPixels: 3 * horizontalResolution + 2 * hidden, hiddenPerSeam: hidden };
}
