export const NEXUS_END = 0.59;
export const EIA_START = 0.67;
export const EIA_BEAT_START = 0.73; // black handoff + 'Eco Impact Analyzer' intro
export const RESUME_START = 0.95;   // empty blueprint; resume copy comes later
export const EIA_STAGE_COUNT = 6;

export const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
export const ease = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const nexusProgressAt = progress => clamp01(progress / NEXUS_END);
export const portalProgressAt = progress => clamp01((progress - NEXUS_END) / (EIA_START - NEXUS_END));
export const eiaDescentAt = progress => clamp01((progress - EIA_START) / (1 - EIA_START));

export const beatLength = () => (RESUME_START - EIA_BEAT_START) / EIA_STAGE_COUNT;

// The title and the object have the same beat boundaries.
export function eiaBeatAt(progress) {
  if (progress < EIA_BEAT_START) return { index: -1, local: 0 };
  if (progress >= RESUME_START) return { index: EIA_STAGE_COUNT, local: 1 };
  const position = (progress - EIA_BEAT_START) / beatLength();
  const index = Math.min(EIA_STAGE_COUNT - 1, Math.floor(position));
  return { index, local: clamp01(position - index) };
}

// One shared mesh retains an identifiable shape at each stop and morphs
// smoothly into the next shape near the END of each beat; reverse scrolling
// works because every vertex is derived from the absolute progress value.
export function morphShapeAt(progress) {
  const { index, local } = eiaBeatAt(progress);
  if (index < 0) return 0; // rounded circle/sphere from original reference
  if (index >= EIA_STAGE_COUNT - 1) return EIA_STAGE_COUNT - 1;
  return index + ease((local - 0.53) / 0.47);
}

// Used by the downward-looking EIA camera; the Nexus route never calls this.
export function fallDepthAt(progress) {
  if (progress <= EIA_START) return 0;
  if (progress < EIA_BEAT_START) {
    return lerp(0, 10, ease((progress - EIA_START) / (EIA_BEAT_START - EIA_START)));
  }
  if (progress < RESUME_START) {
    return lerp(10, 132, (progress - EIA_BEAT_START) / (RESUME_START - EIA_BEAT_START));
  }
  return lerp(132, 145, ease((progress - RESUME_START) / (1 - RESUME_START)));
}

// Backwards compatibility with previous project's helper calls.
export function eiaStageAt(progress) { return eiaBeatAt(progress).index; }

// Preserve the previously approved Nexus fade / black handoff unchanged.
export function blackoutAt(progress) {
  if (progress < NEXUS_END) return 0;
  if (progress < EIA_START) return ease((portalProgressAt(progress) - 0.76) / 0.22);
  if (progress < EIA_START + 0.013) return 1;
  if (progress < EIA_START + 0.043) {
    return 1 - ease((progress - EIA_START - 0.013) / 0.030);
  }
  return 0;
}
