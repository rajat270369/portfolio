// Non-uniform cubic Hermite interpolation for the six INTRO camera keys.
// Unlike separately-eased lerps, the camera maintains its velocity through
// interior waypoints: no forced stop/start when crossing a key.
// Uses a flat C1 spline and comes to rest only at the start/end of the intro.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function slope(keys, index, key, axis) {
  if (index === 0 || index === keys.length - 1) return 0;
  const before = keys[index - 1];
  const after = keys[index + 1];
  return (after[key][axis] - before[key][axis]) / (after.at - before.at);
}

function lerpHermite(a, b, dA, dB, duration, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * a
    + (u3 - 2 * u2 + u) * duration * dA
    + (-2 * u3 + 3 * u2) * b
    + (u3 - u2) * duration * dB;
}

export function sampleIntroCamera(keys, progress) {
  if (keys.length < 2) throw new Error('Need at least two camera keys');
  const p = clamp(progress, keys[0].at, keys[keys.length - 1].at);
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].at) i += 1;
  const a = keys[i], b = keys[i + 1];
  const duration = b.at - a.at;
  const t = clamp((p - a.at) / duration, 0, 1);
  function sample(prop) {
    return [0, 1, 2].map(axis => lerpHermite(
      a[prop][axis], b[prop][axis],
      slope(keys, i, prop, axis), slope(keys, i + 1, prop, axis),
      duration, t));
  }
  return { eye: sample('eye'), look: sample('look') };
}

// Single shared story coordinates, useful for geometric tests.
export const INTRO_CAMERA_KEYS = [
  { at: 0, eye: [0, 1.87, 4.35], look: [0, 1.48, -1.20] },
  { at: 0.16, eye: [0, 1.90, 3.50], look: [0, 1.60, -2.70] },
  { at: 0.29, eye: [0, 2.03, 2.20], look: [0, 1.75, -3.50] },
  { at: 0.37, eye: [0, 2.05, -0.20], look: [0, 1.75, -5.90] },
  { at: 0.46, eye: [0, 2.58, -5.30], look: [0, 2.15, -11.63] },
  { at: 0.55, eye: [0, 3.32, -8.30], look: [0, 2.26, -11.63] },
];
