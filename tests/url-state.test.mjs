// SG-B4 gate: the share-URL codec round-trips exactly (canonical stability)
// and rejects malformed fragments without throwing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeStateV1, decodeStateV1 } from '../src/js/tools/url-state.mjs';

const FIXTURES = [
  {
    name: 'single flat with resolution',
    state: {
      layout: 'single', units: 'in', game: 'iracing', widthMm: 597.7, heightMm: 336.2,
      eyeDistanceMm: 600, curveRadiusMm: null, resolution: { horizontal: 2560, vertical: 1440 },
      bezelPerSideMm: null, yaw: null,
    },
  },
  {
    name: 'single curved ultrawide, no resolution',
    state: {
      layout: 'single', units: 'mm', widthMm: 1198.1, heightMm: 336.9,
      eyeDistanceMm: 800, curveRadiusMm: 1800, resolution: null,
      bezelPerSideMm: null, yaw: null,
    },
  },
  {
    name: 'curved triple with recommended yaw',
    state: {
      layout: 'triple', units: 'cm', widthMm: 708.5, heightMm: 398.5,
      eyeDistanceMm: 800, curveRadiusMm: 1000, resolution: { horizontal: 2560, vertical: 1440 },
      bezelPerSideMm: 7, yaw: 'recommended',
    },
  },
  {
    name: 'flat triple with manual yaw',
    state: {
      layout: 'triple', units: 'mm', widthMm: 597.7, heightMm: 336.2,
      eyeDistanceMm: 600, curveRadiusMm: null, resolution: null,
      bezelPerSideMm: 7, yaw: 54.01 * Math.PI / 180,
    },
  },
];

for (const { name, state } of FIXTURES) {
  test(`round-trip: ${name}`, () => {
    const encoded = encodeStateV1(state);
    const decoded = decodeStateV1(encoded);
    assert.equal(decoded.ok, true, decoded.reason);
    // canonical stability: re-encoding the decoded state is byte-identical
    assert.equal(encodeStateV1(decoded.state), encoded);
    // and the decoded values match the (0.1 mm / 0.01°) canonical rounding
    assert.equal(decoded.state.layout, state.layout);
    assert.equal(decoded.state.units, state.units);
    assert.equal(decoded.state.game, state.game ?? null);
    assert.ok(Math.abs(decoded.state.widthMm - state.widthMm) < 0.05 + 1e-9);
    assert.ok(Math.abs(decoded.state.eyeDistanceMm - state.eyeDistanceMm) < 0.05 + 1e-9);
    if (state.layout === 'triple' && state.yaw !== 'recommended') {
      assert.ok(Math.abs(decoded.state.yaw - state.yaw) < 1e-4, 'yaw within 0.01°');
    }
  });
}

test('decode: leading # accepted; unknown keys ignored (forward compatibility)', () => {
  const encoded = encodeStateV1(FIXTURES[0].state);
  const withExtra = `#${encoded}&future=42&x=abc`;
  const decoded = decodeStateV1(withExtra);
  assert.equal(decoded.ok, true);
  assert.equal(encodeStateV1(decoded.state), encoded);
});

test('game slug round-trips; unknown and absent games are tolerated', () => {
  const encoded = encodeStateV1({ ...FIXTURES[1].state, game: 'assetto-corsa-competizione' });
  assert.match(encoded, /(?:^|&)g=assetto-corsa-competizione(?:&|$)/);
  const decoded = decodeStateV1(encoded);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.state.game, 'assetto-corsa-competizione');
  assert.equal(encodeStateV1(decoded.state), encoded);

  const unknown = decodeStateV1('v=1&l=s&u=mm&g=future-sim&w=600&h=340&e=700');
  assert.equal(unknown.ok, true);
  assert.equal(unknown.state.game, 'future-sim');

  const absent = decodeStateV1('v=1&l=s&u=mm&w=600&h=340&e=700');
  assert.equal(absent.ok, true);
  assert.equal(absent.state.game, null);
});

test('decode: malformed fragments are rejected, never throw', () => {
  for (const bad of [
    '', '#', 'v=2&l=s&w=1&h=1&e=1', 'l=s&w=1&h=1&e=1', // wrong/missing version
    'v=1&l=q&w=1&h=1&e=1',            // bad layout
    'v=1&l=s&w=abc&h=1&e=1',          // NaN width
    'v=1&l=s&w=1&h=1&e=1&rx=2560',    // half a resolution
    'v=1&l=s&w=1&h=1&e=1&rx=2560.5&ry=1440', // non-integer resolution
    'v=1&l=t&w=1&h=1&e=1&y=zz',       // bad yaw
    'v=1&l=s&w=1&h=1&e=1&r=heavy',    // bad radius
    'v=1&l=s&w=1&h=1&e=1&u=feet',     // invalid value for the KNOWN units key
  ]) {
    const out = decodeStateV1(bad);
    assert.equal(out.ok, false, `should reject ${JSON.stringify(bad)}`);
    assert.ok(out.reason);
  }
});
