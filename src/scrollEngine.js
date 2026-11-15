import { INTRO_END } from './firstPersonTour.js';
import {
  NEXUS_END, EIA_START, EIA_BEAT_START, RESUME_START,
  EIA_STAGE_COUNT, clamp01,
} from './experienceTimeline.js';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createExperienceScrollMap(viewportHeight) {
  const vh = Math.max(400, Number(viewportHeight) || 900);
  // These EXACT mappings preserve the existing nine-crystal journey.
  const entrancePixels = Math.round(clamp(vh * 3.45, 2200, 3900));
  const perStationPixels = Math.round(clamp(vh * 1.50, 1000, 1700));
  const tourPixels = perStationPixels * 9;
  const nexusPixels = entrancePixels + tourPixels;
  // Locked Nexus entry distance: unchanged from V3.
  const portalPixels = Math.round(clamp(vh * 3.05, 2300, 4100));
  // The EIA gets enough physical scrolling distance for SIX readable forms.
  const introPixels = Math.round(clamp(vh * 1.25, 750, 1400));
  const eiaBeatPixels = Math.round(clamp(vh * 1.25, 850, 1550));
  const resumePixels = Math.round(clamp(vh * 1.65, 1100, 1900));
  const eiaPixels = introPixels + eiaBeatPixels * EIA_STAGE_COUNT + resumePixels;
  const totalPixels = nexusPixels + portalPixels + eiaPixels;

  function progressAtPixels(pixelDistance) {
    const px = clamp(Number(pixelDistance) || 0, 0, totalPixels);
    if (px <= nexusPixels) {
      const original = px <= entrancePixels
        ? INTRO_END * px / entrancePixels
        : INTRO_END + (1 - INTRO_END) * (px - entrancePixels) / tourPixels;
      return NEXUS_END * original;
    }
    const afterNexus = px - nexusPixels;
    if (afterNexus <= portalPixels) {
      return NEXUS_END + (EIA_START - NEXUS_END) * afterNexus / portalPixels;
    }
    const afterPortal = afterNexus - portalPixels;
    if (afterPortal <= introPixels) {
      return EIA_START + (EIA_BEAT_START - EIA_START) * afterPortal / introPixels;
    }
    const afterIntro = afterPortal - introPixels;
    const beatArea = eiaBeatPixels * EIA_STAGE_COUNT;
    if (afterIntro <= beatArea) {
      return EIA_BEAT_START + (RESUME_START - EIA_BEAT_START) * afterIntro / beatArea;
    }
    return RESUME_START + (1 - RESUME_START) * clamp01((afterIntro - beatArea) / resumePixels);
  }
  return {
    entrancePixels, perStationPixels, tourPixels, portalPixels,
    introPixels, eiaBeatPixels, resumePixels, totalPixels, progressAtPixels,
  };
}

export function dampProgress(current, target, deltaSeconds, responseSeconds = 0.22) {
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.10);
  return current + (target - current) * (1 - Math.exp(-dt / Math.max(0.01, responseSeconds)));
}
