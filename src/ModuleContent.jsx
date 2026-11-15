import { useState } from 'react';
function getRuleResult(amount, location) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 'INVALID';
  if (value >= 100000) return 'HIGH RISK';
  if (!String(location).trim()) return 'REVIEW';
  return 'LOW RISK';
}

function ModuleContent({ module, tab, setTab }) {
  const [amount, setAmount] = useState('120000');
  const [location, setLocation] = useState('Delhi');
  const classification = getRuleResult(amount, location);
  return <>
    <nav className="panel-tabs" aria-label="Module information">
      {['Overview', 'Technology', 'Roadmap'].map((item) => <button
        key={item} type="button" aria-pressed={tab === item.toLowerCase()}
        className={tab === item.toLowerCase() ? 'selected' : ''}
        onClick={() => setTab(item.toLowerCase())}>{item}</button>)}
    </nav>
    {tab === 'overview' && <div className="module-section">
      <p>{module.summary}</p>
      <div className="module-status"><div>CRYSTAL ASSET: <strong>COMPLETED · GLB INSTALLED</strong></div><div>SOFTWARE: <strong>{module.operationStatus.toUpperCase()}</strong></div></div>
      {module.id === 1 && <div className="rule-demo">
        <p className="micro-label">LOCAL RULE DEMONSTRATION</p>
        <div className="field-grid">
          <label>Amount (₹)
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter location" />
          </label>
        </div>
        <div className={`risk-result ${classification.replace(' ', '-').toLowerCase()}`}>
          <span>Rule-based result</span><strong>{classification}</strong>
        </div>
        <p className="tiny-note">Demonstrates the currently described Spring Boot classification rules in your browser; this form does not call a live backend or use an ML model.</p>
      </div>}
      {module.id !== 1 && <p className="tiny-note">Concept demonstration only. Analytical features shown in the roadmap are not implemented yet.</p>}
    </div>}
    {tab === 'technology' && <div className="module-section">
      <p className="micro-label">TECHNOLOGIES</p>
      <p>{module.technologies}</p>
      <p className="micro-label">WHAT EXISTS</p>
      <p>{module.current}</p>
    </div>}
    {tab === 'roadmap' && <div className="module-section">
      <p className="micro-label">PLANNED CAPABILITIES</p>
      <p>{module.future}</p>
      <p className="tiny-note">These capabilities are part of the project roadmap, not a claim of production readiness.</p>
    </div>}
  </>;
}

export default ModuleContent;
