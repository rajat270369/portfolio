import { useEffect } from 'react';
import { experienceAudio as audio } from './ExperienceAudio.js';
import { activeStationAt } from './firstPersonTour.js';
import {
  NEXUS_END, EIA_START, RESUME_START,
  nexusProgressAt, portalProgressAt, blackoutAt, morphShapeAt,
} from './experienceTimeline.js';

// Headless audio controller. It never renders a button, panel or overlay.
// Web Audio requires a user gesture on most browsers, so we unlock on the
// visitor's first pointer/touch/key interaction anywhere in the experience.
export default function ExperienceSound({ progressRef }) {
  useEffect(() => {
    let disposed = false;
    let lastProgress = progressRef.current || 0;
    let lastTime = performance.now();
    let stationId = null;
    let lastStationCue = -Infinity;
    let lastShapeIndex = Math.floor(morphShapeAt(lastProgress) + 0.02);
    let lastMorphCue = -Infinity;
    let wasInPortal = false;
    let wasBlack = false;
    let startupPlayed = false;
    let lastWheelAttempt = -Infinity;
    let previouslyReady = audio.ready;

    function askForAudio() {
      if (disposed || audio.ready) return;
      // No await before calling unlock(): AudioContext.resume() begins during
      // the actual gesture and can use that gesture's activation permission.
      void audio.unlock().then(ready => {
        if (disposed || !ready) return;
        // Intro sound only if the visitor is still near the entrance; never
        // play delayed entrance sounds in the EIA/resume portion.
        if (!startupPlayed && nexusProgressAt(progressRef.current) < 0.19) {
          audio.startup();
          startupPlayed = true;
        }
      }).catch(error => {
        console.warn('[NEXUS-9 AUDIO] Unable to unlock audio:', error);
      });
    }

    function onWheel() {
      // Some browsers accept wheel as user activation, others do not. Try
      // sparingly without interfering with native or GSAP scroll behavior.
      const now = performance.now();
      if (now - lastWheelAttempt > 2800) {
        lastWheelAttempt = now;
        askForAudio();
      }
    }

    function onVisibility() {
      if (document.hidden) audio.silence();
      // If the browser suspended the context, the next gesture retries it.
    }

    window.addEventListener('pointerdown', askForAudio, { capture: true, passive: true });
    window.addEventListener('touchstart', askForAudio, { capture: true, passive: true });
    window.addEventListener('keydown', askForAudio, true);
    window.addEventListener('click', askForAudio, true);
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    const update = () => {
      const p = Math.max(0, Math.min(1, progressRef.current || 0));
      const now = performance.now();
      const dt = Math.max(0.025, Math.min(0.15, (now - lastTime) / 1000));
      const velocity = Math.min(1, Math.abs((p - lastProgress) / dt) * 12);
      const isPortal = p >= NEXUS_END && p < EIA_START;
      const isBlack = blackoutAt(p) > 0.87;
      const currentStation = p < NEXUS_END
        ? activeStationAt(nexusProgressAt(p))
        : null;
      const currentShape = Math.floor(morphShapeAt(p) + 0.02);

      // Updating the timeline state while blocked prevents a large backlog
      // of chimes/morph sounds when audio first becomes available.
      if (!audio.ready || document.hidden) {
        lastProgress = p;
        lastTime = now;
        if (!audio.ready) {
          stationId = null;
          wasInPortal = false;
          previouslyReady = false;
        }
        lastShapeIndex = currentShape;
        wasBlack = isBlack;
        return;
      }

      if (!previouslyReady) {
        // One chime is allowed for a crystal that was already in focus at
        // unlock time; don't replay all previously visited stations.
        stationId = null;
        wasInPortal = false;
        lastShapeIndex = currentShape;
        previouslyReady = true;
      }

      if (isBlack) {
        if (!wasBlack) audio.silence();
        audio.setWind(0);
      } else if (isPortal) {
        const q = portalProgressAt(p);
        if (!wasInPortal) audio.whoosh();
        const windEnvelope = Math.sin(Math.PI * Math.min(1, q / 0.94));
        audio.setWind(Math.max(0, 0.25 * windEnvelope), 135 + q * 1300);
      } else if (p >= EIA_START && p < RESUME_START) {
        audio.setWind(0.065 + 0.19 * velocity, 360 + velocity * 1050);
      } else {
        audio.setWind(0);
      }

      // Start-up pulse, even if audio is unlocked just before entering.
      if (!startupPlayed && p < NEXUS_END * 0.19 && p > NEXUS_END * 0.045) {
        audio.startup();
        startupPlayed = true;
      }

      if (currentStation !== stationId) {
        if (currentStation !== null && !isBlack && now - lastStationCue > 430) {
          audio.crystal(currentStation);
          lastStationCue = now;
        }
        stationId = currentStation;
      }

      if (
        p >= EIA_START && p < RESUME_START && !isBlack &&
        currentShape !== lastShapeIndex && now - lastMorphCue > 480
      ) {
        audio.sweep(p < lastProgress);
        lastMorphCue = now;
      }

      wasInPortal = isPortal;
      wasBlack = isBlack;
      lastShapeIndex = currentShape;
      lastProgress = p;
      lastTime = now;
    };

    const timer = window.setInterval(update, 50);
    update();

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('pointerdown', askForAudio, true);
      window.removeEventListener('touchstart', askForAudio, true);
      window.removeEventListener('keydown', askForAudio, true);
      window.removeEventListener('click', askForAudio, true);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('visibilitychange', onVisibility);
      audio.silence();
    };
  }, [progressRef]);

  return null;
}
