// Versioned fragment-state codec for the Sim Geometry Lab (spec: annex §4).
// #v=1&l=t&w=597.7&h=336.2&e=600&b=7&y=a&rx=2560&ry=1440&u=in&r=1800
// Rules: v=1 mandatory; dimensions stored normalized in MILLIMETRES (0.1 mm);
// yaw stored in degrees (0.01°) or 'a' for the recommended sentinel; unknown
// keys ignored so v2 decoders stay backward-compatible; no free text.
// The UI treats the DECODED state as canonical, so encode(decode(x)) === x.

const DEG = 180 / Math.PI;
const round = (v, dp) => Math.round(v * 10 ** dp) / 10 ** dp;

const num = (s) => {
  if (typeof s !== 'string' || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};
const int = (s) => {
  const v = num(s);
  return v !== null && Number.isInteger(v) ? v : null;
};

/**
 * state = {
 *   layout: 'single' | 'triple',
 *   units: 'mm' | 'cm' | 'in',            // display preference only
 *   widthMm, heightMm, eyeDistanceMm,     // normalized mm
 *   curveRadiusMm: number | null,
 *   resolution: { horizontal, vertical } | null,
 *   bezelPerSideMm: number | null,        // triple only
 *   yaw: 'recommended' | number (rad),    // triple only
 * }
 */
export function encodeStateV1(state) {
  const p = new URLSearchParams();
  p.set('v', '1');
  p.set('l', state.layout === 'triple' ? 't' : 's');
  p.set('u', state.units);
  p.set('w', String(round(state.widthMm, 1)));
  p.set('h', String(round(state.heightMm, 1)));
  p.set('e', String(round(state.eyeDistanceMm, 1)));
  if (state.curveRadiusMm !== null) p.set('r', String(round(state.curveRadiusMm, 1)));
  if (state.resolution) {
    p.set('rx', String(state.resolution.horizontal));
    p.set('ry', String(state.resolution.vertical));
  }
  if (state.layout === 'triple') {
    p.set('b', String(round(state.bezelPerSideMm ?? 0, 1)));
    p.set('y', state.yaw === 'recommended' ? 'a' : String(round(state.yaw * DEG, 2)));
  }
  return p.toString();
}

/** Returns { ok: true, state } or { ok: false, reason }. Never throws. */
export function decodeStateV1(fragment) {
  const raw = String(fragment ?? '').replace(/^#/, '');
  const p = new URLSearchParams(raw);
  if (p.get('v') !== '1') return { ok: false, reason: 'missing or unsupported version' };

  const layout = { s: 'single', t: 'triple' }[p.get('l')];
  if (!layout) return { ok: false, reason: 'bad layout' };
  const units = ['mm', 'cm', 'in'].includes(p.get('u')) ? p.get('u') : 'mm';

  const widthMm = num(p.get('w'));
  const heightMm = num(p.get('h'));
  const eyeDistanceMm = num(p.get('e'));
  if (widthMm === null || heightMm === null || eyeDistanceMm === null) {
    return { ok: false, reason: 'bad dimensions' };
  }

  const curveRadiusMm = p.has('r') ? num(p.get('r')) : null;
  if (p.has('r') && curveRadiusMm === null) return { ok: false, reason: 'bad radius' };

  let resolution = null;
  if (p.has('rx') || p.has('ry')) {
    const horizontal = int(p.get('rx'));
    const vertical = int(p.get('ry'));
    if (horizontal === null || vertical === null) return { ok: false, reason: 'bad resolution' };
    resolution = { horizontal, vertical };
  }

  let bezelPerSideMm = null;
  let yaw = null;
  if (layout === 'triple') {
    bezelPerSideMm = p.has('b') ? num(p.get('b')) : 0;
    if (bezelPerSideMm === null) return { ok: false, reason: 'bad bezel' };
    const y = p.get('y') ?? 'a';
    if (y === 'a') yaw = 'recommended';
    else {
      const deg = num(y);
      if (deg === null) return { ok: false, reason: 'bad yaw' };
      yaw = deg / DEG;
    }
  }

  return {
    ok: true,
    state: { layout, units, widthMm, heightMm, eyeDistanceMm, curveRadiusMm, resolution, bezelPerSideMm, yaw },
  };
}
