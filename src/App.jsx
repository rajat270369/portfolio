import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Scene from './Scene.jsx';
import EIAOverlay from './EIAOverlay.jsx';
import ExperienceSound from './ExperienceSound.jsx';
import './HideScrollbar.css';
import { INTRO_END, TOUR_ORDER } from './firstPersonTour.js';
import { NEXUS_END, EIA_START, nexusProgressAt, blackoutAt } from './experienceTimeline.js';
import { createExperienceScrollMap, dampProgress } from './scrollEngine.js';
import './styles.css';
import './EIAExperience.css';

gsap.registerPlugin(ScrollTrigger);
const FOLLOW_SECONDS = 0.22;
const EPSILON = 0.00004;

function introductionAt(progress) {
  if (progress < .085) return { tag: 'SYSTEM / 00', title: 'ENTER THE CODE', subtitle: 'A journey through the systems I build.' };
  if (progress < .18) return { tag: 'ACCESS / 01', title: 'THE GATEWAY', subtitle: 'Approaching a world of financial threat intelligence.' };
  return { tag: 'SECURITY / 02', title: 'ACCESS GRANTED', subtitle: 'Step inside the FRAUD-X command centre.' };
}

export default function App() {
  const experienceRef = useRef(null);
  const progressRef = useRef(0);
  const requestRenderRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const onRoomLoaded = useCallback(() => setRoomLoaded(true), []);

  useEffect(() => {
    const section = experienceRef.current;
    if (!section) return;
    let mapping = createExperienceScrollMap(window.innerHeight);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let target = 0, displayed = 0;
    let lastUI = -1;
    const publish = () => {
      const p = Math.max(0, Math.min(1, displayed));
      progressRef.current = p;
      section.style.setProperty('--scroll-progress', p.toFixed(5));
      requestRenderRef.current?.();
      if (Math.abs(p - lastUI) > .001 || p === 0 || p === 1) { lastUI = p; setProgress(p); }
    };
    const trigger = ScrollTrigger.create({
      trigger: section, start: 'top top', pin: true, anticipatePin: 1,
      end: () => { mapping = createExperienceScrollMap(window.innerHeight); return `+=${mapping.totalPixels}`; },
      invalidateOnRefresh: true,
      onUpdate(self) { target = mapping.progressAtPixels(self.scroll() - self.start); },
      onRefresh(self) { target = mapping.progressAtPixels(self.scroll() - self.start); },
    });
    target = mapping.progressAtPixels(trigger.scroll() - trigger.start);
    displayed = target;
    publish();
    const ticker = (_time, elapsedMs) => {
      const next = reduce.matches ? target : dampProgress(displayed, target, elapsedMs / 1000, FOLLOW_SECONDS);
      if (Math.abs(next - displayed) < EPSILON && Math.abs(target - next) < EPSILON) {
        if (displayed !== target) { displayed = target; publish(); }
        return;
      }
      displayed = next;
      publish();
    };
    gsap.ticker.add(ticker);
    return () => { gsap.ticker.remove(ticker); trigger.kill(); };
  }, []);

  const nexusProgress = nexusProgressAt(progress);
  const inRoom = nexusProgress > .17 && progress < EIA_START;
  const inTour = nexusProgress >= INTRO_END && progress < NEXUS_END;
  const inPortal = progress >= NEXUS_END && progress < EIA_START;
  const inEIA = progress >= EIA_START;
  const intro = introductionAt(nexusProgress);
  const stationCount = TOUR_ORDER.length;
  const visitPosition = inTour
    ? Math.min(stationCount, Math.floor(((nexusProgress - INTRO_END) / (1 - INTRO_END)) * stationCount) + 1)
    : 0;
  const blackout = blackoutAt(progress);

  return <main id="top">
    <section ref={experienceRef}
      className={`experience first-person-experience ${inRoom ? 'in-chamber' : ''} ${inTour ? 'tour-active' : ''} ${inEIA ? 'eia-mode' : ''}`} 
      aria-label="First-person FRAUD-X tour, Nexus portal and morphing Eco Impact Analyzer journey">
      <div className="viewport"><Scene progressRef={progressRef} requestRenderRef={requestRenderRef} onRoomLoaded={onRoomLoaded}/></div>
      <div className="vignette" aria-hidden="true"/>
      <ExperienceSound progressRef={progressRef}/>
      {inEIA && <EIAOverlay progress={progress}/>}
      {!inPortal && !inEIA && <header className="site-header">
        <a href="#top" className="brand">RAJAT<span> / </span>DEV</a>
        <div className="header-links">
          <span className="live-dot"/><span>3D PORTFOLIO</span>
          <span className="scroll-only-label">{inEIA ? 'ECO IMPACT ANALYZER' : 'FIRST-PERSON EXPERIENCE'}</span>
        </div>
      </header>}

      {inRoom && !inPortal && <div className="fraud-brand" aria-label="FRAUD-X Command Centre">
        <span>FINANCIAL SECURITY INTELLIGENCE</span>
        <strong>FRAUD<span>—X</span></strong>
        <small>NEXUS-9 / {stationCount} CRYSTAL SYSTEMS</small>
      </div>}

      {!inTour && !inPortal && !inEIA && <div className="story-content" aria-live="polite">
        <div className="story-inner" key={intro.tag}>
          <div className="eyebrow"><span className="tiny-line"/>{intro.tag}</div>
          <h1>{intro.title}</h1><p>{intro.subtitle}</p>
        </div>
      </div>}

      {/* Crystal information now appears on the TWO existing in-world sketch tabs.
          No HTML HUD summary, inspect button, or HTML details dialog. */}
      {inTour && <div className="tour-index" aria-label={`Tour segment ${visitPosition} of ${stationCount}`}>
        <span>CRYSTAL TOUR</span><strong>{String(visitPosition).padStart(2, '0')} <em>/</em> 09</strong>
      </div>}

      {/* EIA intro and six stage titles are lightweight, synchronized overlays.
          The Nexus remains locked; no forms or résumé text are added yet. */}
      {inRoom && !roomLoaded && <div className="room-hint">LOADING NEXUS-9… <span className="active-pulse"/></div>}
      {!inPortal && !inEIA && <footer className="experience-footer">
        <span className="scroll-hint">{inTour ? 'SCROLL TO NEXT CRYSTAL' : 'SCROLL TO ENTER'} <span aria-hidden="true"> ↓</span></span>
        <div className="progress-rail" aria-hidden="true"><div className="progress-fill"/></div>
        <span className="footer-index">{inTour ? `${visitPosition} / 9` : 'ENTRY'}</span>
      </footer>}
      {/* Cover the end of the 3D dive and reveal the second project from darkness. */}
      <div className="nexus-portal-curtain" aria-hidden="true" style={{opacity:blackout}}/>
    </section>

  </main>;
}
