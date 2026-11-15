import { eiaStageAt } from './experienceTimeline.js';

// EDIT THESE THREE ENTRIES when the final project story is decided.
// Claims below match the described EIA project; no invented results or metrics.
const EIA_BEATS = [
  {
    kicker: 'PROJECT 02  /  01 — THE CORE',
    title: 'Eco Impact Analyzer',
    subtitle: 'Intelligence for a greener planet.',
    body: 'A web-based environmental impact estimator that uses machine learning to turn resource inputs into understandable predictions.',
    points: ['Environmental inputs', 'Predictive impact engine', 'Actionable results'],
    label: 'MORPH 01 / IMPACT CORE',
  },
  {
    kicker: 'PROJECT 02  /  02 — THE ENGINE',
    title: 'Built to predict.',
    subtitle: 'From data to an environmental estimate.',
    body: 'Python and Flask power the backend, with a Gradient Boosting Regressor, Pandas and NumPy. The browser interface uses HTML, CSS and JavaScript.',
    points: ['Python · Flask', 'Gradient Boosting', 'Pandas · NumPy'],
    label: 'MORPH 02 / TECHNOLOGY KNOT',
  },
  {
    kicker: 'PROJECT 02  /  03 — THE SIGNAL',
    title: 'See the footprint.',
    subtitle: 'Resources become environmental insights.',
    body: 'The EIA concept combines inputs such as diesel, electricity, concrete and plastic with impact calculations and visual summaries.',
    points: ['CO₂ estimates', 'Waste + air pollution', 'Impact scoring'],
    label: 'MORPH 03 / DATA PRISM',
  },
];

function ResumeScaffold() {
  return <div className="eia-resume" aria-label="Résumé layout placeholder">
    <div className="eia-resume__eyebrow">FINAL CHAPTER / RESUME BLUEPRINT</div>
    <div className="eia-resume__top">
      <div><div className="eia-resume__tiny">PROFILE</div><h2>Résumé</h2><p>We will fill this with your final professional information next.</p></div>
      <div className="eia-resume__mark" aria-hidden="true">R / DEV</div>
    </div>
    <div className="eia-resume__grid">
      <div><span>01</span><strong>Profile summary</strong><small>To be written</small></div>
      <div><span>02</span><strong>Technical skills</strong><small>To be arranged</small></div>
      <div><span>03</span><strong>Selected projects</strong><small>FRAUD-X · EIA</small></div>
      <div><span>04</span><strong>Experience & education</strong><small>To be added</small></div>
    </div>
    <div className="eia-resume__footer">NO SUBMISSION FORM  /  CONTENT PLACEHOLDER</div>
  </div>;
}

export default function EIAStory({ progress }) {
  const step = eiaStageAt(progress);
  if (step < 0) return null;
  return <div className={`eia-story eia-story--step-${step}`}>
    {step === 3 ? <ResumeScaffold/> : <div className="eia-story__copy" key={step}>
      <span className="eia-story__kicker">{EIA_BEATS[step].kicker}</span>
      <div className="eia-story__hairline"/>
      <h2>{EIA_BEATS[step].title}</h2>
      <h3>{EIA_BEATS[step].subtitle}</h3>
      <p>{EIA_BEATS[step].body}</p>
      <div className="eia-story__tags">{EIA_BEATS[step].points.map(point => <span key={point}>{point}</span>)}</div>
      <div className="eia-story__shape-label">{EIA_BEATS[step].label}</div>
    </div>}
    <div className="eia-story__chapter" aria-hidden="true">{String(step + 1).padStart(2, '0')} <span>/ 04</span></div>
  </div>;
}
