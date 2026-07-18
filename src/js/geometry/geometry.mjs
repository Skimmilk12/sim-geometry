// calculateGeometryV1 — the single stable facade the tool page (B4) and the
// embed (B6) both call. Pure and versioned: same input object always produces
// the same output object. Millimetres in, radians out; degree formatting is
// the caller's presentation concern.
import { GeometryError } from './errors.mjs';
import {
  panelFromDiagonal, flatHorizontalFov, flatVerticalFov, curvedPhysicalSpan,
  eyeDistanceSensitivity, pixelsPerDegree,
} from './fov.mjs';
import {
  recommendedYawRad, tripleLayout, seamGapMm, seamHiddenPixels,
  equivalentBezelCorrectedSpanPixels,
} from './triples.mjs';

const A = {
  EYE_CENTERED: 'eye-centered-on-middle-screen',
  CHORD: 'curved-width-measured-as-chord',
  CONCAVE: 'curved-panel-concave-toward-viewer',
  PHYSICAL: 'physical-span-not-a-game-fov-setting',
  BEZEL_CHORD: 'bezel-measured-as-chord-extension',
  VERTICAL_CENTER_PLANE: 'vertical-span-computed-at-panel-center-plane',
};

function fail(err) {
  if (err instanceof GeometryError) {
    return { ok: false, error: { code: err.code, message: err.message, field: err.field } };
  }
  throw err;
}
const invalid = (message, field) => (
  { ok: false, error: { code: 'INVALID_INPUT', message, field } }
);

/**
 * input = {
 *   layout: 'single' | 'triple',
 *   screen: { widthMm, heightMm } | { diagonalMm, aspect: [w, h] },
 *   curveRadiusMm: number | null,
 *   eyeDistanceMm: number,
 *   resolution: { horizontal, vertical } | null,
 *   triple: { bezelPerSideMm, yawFromCoplanarRad: number | 'recommended' } | null,
 * }
 */
export function calculateGeometryV1(input) {
  try {
    if (!input || typeof input !== 'object') return invalid('input must be an object', null);
    const { layout, screen, curveRadiusMm = null, eyeDistanceMm, resolution = null } = input;
    if (layout !== 'single' && layout !== 'triple') {
      return invalid(`layout must be 'single' or 'triple', got ${JSON.stringify(layout)}`, 'layout');
    }
    if (!screen || typeof screen !== 'object') return invalid('screen is required', 'screen');

    // normalize panel size
    let widthMm; let heightMm;
    if ('widthMm' in screen) {
      ({ widthMm, heightMm } = screen);
    } else if ('diagonalMm' in screen) {
      if (!Array.isArray(screen.aspect) || screen.aspect.length !== 2) {
        return invalid('screen.aspect must be [w, h] when using diagonalMm', 'screen.aspect');
      }
      ({ widthMm, heightMm } = panelFromDiagonal(screen.diagonalMm, screen.aspect[0], screen.aspect[1]));
    } else {
      return invalid('screen needs widthMm/heightMm or diagonalMm/aspect', 'screen');
    }

    const assumptions = [A.EYE_CENTERED, A.PHYSICAL];
    const curved = curveRadiusMm !== null;
    if (curved) assumptions.push(A.CHORD, A.CONCAVE, A.VERTICAL_CENTER_PLANE);

    // vertical span is common to both layouts (center panel, center plane)
    const verticalSpanRad = flatVerticalFov(heightMm, eyeDistanceMm);

    if (layout === 'single') {
      let horizontalSpanRad; let curve = null;
      if (curved) {
        const c = curvedPhysicalSpan(widthMm, curveRadiusMm, eyeDistanceMm);
        horizontalSpanRad = c.spanRad;
        curve = { sagittaMm: c.sagittaMm, edgeDepthMm: c.edgeDepthMm };
      } else {
        horizontalSpanRad = flatHorizontalFov(widthMm, eyeDistanceMm);
      }
      const sens = eyeDistanceSensitivity(
        (d) => (curved ? curvedPhysicalSpan(widthMm, curveRadiusMm, d).spanRad : flatHorizontalFov(widthMm, d)),
        eyeDistanceMm,
      );
      return {
        ok: true,
        normalized: { layout, widthMm, heightMm, curveRadiusMm, eyeDistanceMm, resolution },
        results: {
          horizontalSpanRad,
          verticalSpanRad,
          curve,
          pixelsPerDegree: resolution ? pixelsPerDegree(resolution.horizontal, horizontalSpanRad) : null,
          sensitivity: sens,
        },
        assumptions,
      };
    }

    // triple
    const t = input.triple;
    if (!t || typeof t !== 'object') return invalid('triple options are required for layout "triple"', 'triple');
    assumptions.push(A.BEZEL_CHORD);
    const base = {
      activeMm: widthMm,
      bezelPerSideMm: t.bezelPerSideMm,
      eyeDistanceMm,
      radiusMm: curveRadiusMm,
    };
    const recYaw = recommendedYawRad(base);
    const requestedYawRad = t.yawFromCoplanarRad === 'recommended' ? recYaw : t.yawFromCoplanarRad;
    const layoutResult = tripleLayout({ ...base, yawFromCoplanarRad: requestedYawRad });
    const seamMm = seamGapMm(t.bezelPerSideMm);
    const sens = eyeDistanceSensitivity(
      (d) => tripleLayout({ ...base, eyeDistanceMm: d, yawFromCoplanarRad: requestedYawRad }).visibleEnvelopeRad,
      eyeDistanceMm,
    );
    return {
      ok: true,
      normalized: {
        layout, widthMm, heightMm, curveRadiusMm, eyeDistanceMm, resolution,
        bezelPerSideMm: t.bezelPerSideMm, requestedYawRad,
      },
      results: {
        visibleEnvelopeRad: layoutResult.visibleEnvelopeRad,
        activeImageCoverageRad: layoutResult.activeImageCoverageRad,
        seamOcclusionPerSideRad: layoutResult.seamOcclusionPerSideRad,
        centerSpanRad: layoutResult.centerSpanRad,
        verticalSpanRad,
        recommendedYawRad: recYaw,
        requestedYawRad,
        yawDeltaRad: requestedYawRad - recYaw,
        seamGapMm: seamMm,
        seamHiddenPixels: resolution ? seamHiddenPixels(seamMm, widthMm, resolution.horizontal) : null,
        equivalentSpan: resolution
          ? equivalentBezelCorrectedSpanPixels(widthMm, t.bezelPerSideMm, resolution.horizontal)
          : null,
        pixelsPerDegree: resolution
          ? pixelsPerDegree(resolution.horizontal, layoutResult.centerSpanRad)
          : null,
        sensitivity: sens,
      },
      assumptions,
    };
  } catch (err) {
    return fail(err);
  }
}
