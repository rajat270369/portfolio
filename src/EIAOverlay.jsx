import { EIA_START, EIA_BEAT_START, RESUME_START, beatLength, clamp01, ease } from './experienceTimeline.js';
import './EIAOverlay.css';

// Information is deliberately limited to what the project actually demonstrates
// or what remains on its roadmap; the visual concepts are not claims of a live
// global industrial monitoring network.
const CHAPTERS = [
  {
    eyebrow: 'PROJECT REGISTRY', title: 'EIA Core', shape: '01 / CIRCLE',
    description: 'Explore infrastructure, manufacturing, and energy inputs to understand their environmental impact.',
    color: '#47e1ed', side: 'left',
  },
  {
    eyebrow: 'CARBON LEDGER', title: 'Real-Time CO₂ Flux', shape: '02 / DIAMOND',
    description: 'Estimate the carbon footprint associated with resources and industrial activity.',
    color: '#5df6bd', side: 'right',
  },
  {
    eyebrow: 'ANALYSIS ENGINE', title: 'Pattern Recognition', shape: '03 / TORUS KNOT',
    description: 'Use machine-learning predictions to explore environmental impact patterns.',
    color: '#bfa2ff', side: 'left',
  },
  {
    eyebrow: 'MITIGATION STRATEGY', title: 'Alternative Protocols', shape: '04 / DATA PRISM',
    description: 'Compare resource-use scenarios and consider opportunities to reduce emissions.',
    color: '#ffcc83', side: 'right',
  },
  {
    eyebrow: 'IMPACT FORECAST', title: '10-Year Projections', shape: '05 / FORECAST SPIRE',
    description: 'A planned capability for exploring how environmental choices affect longer-term outcomes.',
    color: '#8bc8ff', side: 'left',
  },
  {
    eyebrow: 'ADVISORY NODE', title: 'System Interaction', shape: '06 / BLUEPRINT FRAME',
    description: 'A future workspace for turning impact assessments into practical, site-specific guidance.',
    color: '#b7e8fa', side: 'right',
  },
];

export default function EIAOverlay({ progress }) {
  if (progress < EIA_START) return null;
  const introIn = ease((progress - EIA_START - 0.027) / 0.016);
  const introOut = 1 - ease((progress - EIA_BEAT_START + 0.018) / 0.028);
  const introOpacity = clamp01(introIn * introOut);
  const beat = beatLength();

  return <div className="eia-narrative" aria-label="Eco Impact Analyzer project experience">
    <div className="eia-narrative__intro" style={{opacity:introOpacity, transform:`translate3d(-50%, ${Math.round((1-introOpacity)*22)}px, 0)`}}>
      <span>PROJECT 02 / ENVIRONMENTAL INTELLIGENCE</span>
      <h2>ECO IMPACT<br/>ANALYZER</h2>
      <p>INTELLIGENCE FOR A GREENER PLANET</p>
    </div>
    {CHAPTERS.map((chapter, index) => {
      const start = EIA_BEAT_START + index * beat;
      const local = clamp01((progress - start) / beat);
      const inside = progress >= start && progress < start + beat;
      const appear = ease((local - 0.05) / 0.18);
      const disappear = 1 - ease((local - 0.78) / 0.21);
      const opacity = inside && progress < RESUME_START ? appear * disappear : 0;
      return <section
        key={chapter.eyebrow}
        className={`eia-narrative__chapter eia-narrative__chapter--${chapter.side}`}
        style={{opacity, '--eia-accent':chapter.color, transform:`translate3d(0, ${Math.round((1-opacity)*18)}px,0)`}}
        aria-hidden={opacity < 0.02}
      >
        <span className="eia-narrative__eyebrow">{chapter.eyebrow}</span>
        <div className="eia-narrative__rule"/>
        <h2>{chapter.title}</h2>
        <p>{chapter.description}</p>
        <small>{chapter.shape}</small>
      </section>;
    })}
  </div>;
}
