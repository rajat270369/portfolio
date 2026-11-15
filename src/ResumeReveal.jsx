import { useEffect, useMemo, useState } from 'react';
import { RESUME_START, ease } from './experienceTimeline.js';
import './ResumeReveal.css';

// Small, factual on-site resume based on the supplied PDF and two deployed projects.
// Only FRAUD-X and Eco Impact Analyzer appear in the PROJECTS section.
// The example.com email in the PDF is intentionally omitted until a real address
// is supplied. Neither a LinkedIn URL nor missing internship year is invented.
const CONTENT = {
  head: [
    { type: 'name', text: 'RAJAT JANGU' },
    { type: 'subtitle', text: 'CSE (AI/ML) STUDENT  /  WEB & 3D DEVELOPMENT' },
    { type: 'contact', text: 'HISAR, HARYANA  ·  +91 8950162025' },
    { type: 'contactLink', text: 'GITHUB.COM/RAJAT270369', href: 'https://github.com/rajat270369' },
  ],
  left: [
    { type: 'heading', text: '01  /  EDUCATION' },
    { type: 'item', text: 'Galgotias University, Greater Noida' },
    { type: 'body', text: 'B.Tech Computer Science · AI/ML' },
    { type: 'meta', text: 'SEPT 2025 — MAY 2029' },
    { type: 'heading', text: '02  /  EXPERIENCE' },
    { type: 'item', text: 'Hartron — Web Development Intern' },
    { type: 'body', text: 'HTML & CSS training; developed and styled web pages.' },
    { type: 'meta', text: '9 JULY — 4 AUGUST' },
    { type: 'heading', text: '03  /  STACK' },
    { type: 'body', text: 'React · JavaScript · Three.js · WebGL' },
    { type: 'body', text: 'Java · Spring Boot · Python · Flask' },
    { type: 'body', text: 'C · C++ · HTML · CSS · Git · Linux' },
  ],
  right: [
    { type: 'heading', text: '04  /  SELECTED PROJECTS' },
    { type: 'project', text: 'FRAUD-X' },
    { type: 'body', text: 'Fraud assessment with a Java Spring Boot rule engine and a nine-crystal React/Three.js command centre.' },
    { type: 'meta', text: 'REACT  ·  THREE.JS  ·  JAVA  ·  SPRING BOOT' },
    { type: 'projectLink', text: 'fraud-x-t8wj.onrender.com ↗', href: 'https://fraud-x-t8wj.onrender.com' },
    { type: 'project', text: 'ECO IMPACT ANALYZER' },
    { type: 'body', text: 'Deployed environmental-impact analyzer with a backend, ML-based estimates and scroll-driven WebGL visualizations.' },
    { type: 'meta', text: 'PYTHON  ·  FLASK  ·  ML  ·  THREE.JS' },
    { type: 'projectLink', text: 'eco-impact-analyzer.onrender.com ↗', href: 'https://eco-impact-analyzer.onrender.com' },
  ],
  foot: [
    { type: 'foot', text: 'TWO PROJECTS  /  TWO LIVE DEPLOYMENTS  /  END OF FILE' },
  ],
};

const ALL_LINES = [...CONTENT.head, ...CONTENT.left, ...CONTENT.right, ...CONTENT.foot];
const LINE_STARTS = [];
let cursor = 0.68; // first line is slow; subsequent lines arrive increasingly faster
for (let i = 0; i < ALL_LINES.length; i++) {
  LINE_STARTS.push(cursor);
  cursor += 0.54 * Math.exp(-i / 7.6) + 0.045;
}
const LAST_TIME = LINE_STARTS.at(-1) + 0.55;
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+?';

function scrambled(text, lineIndex, elapsed) {
  const since = elapsed - LINE_STARTS[lineIndex];
  if (since < 0) return '';
  // Slow initial scans; later lines decode rapidly, as if the machine adapts.
  const duration = Math.max(0.34, 1.52 * Math.exp(-lineIndex / 10) + 0.20);
  const resolved = ease(since / duration);
  if (resolved >= 1) return text;
  const frame = Math.floor(elapsed * 27);
  const readableCount = Math.floor(text.length * resolved);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s|[·.,:;—/()+\-↗]/u.test(c)) result += c;
    else if (i < readableCount) result += c;
    else result += GLYPHS[(lineIndex * 37 + i * 17 + frame * 23 + (i * frame) % 19) % GLYPHS.length];
  }
  return result;
}

function Line({ entry, index, elapsed }) {
  const shown = scrambled(entry.text, index, elapsed);
  if (!shown) return <div className={`resume-decode__line resume-decode__line--${entry.type}`} aria-hidden="true">{'\u00a0'}</div>;
  const since = elapsed - LINE_STARTS[index];
  const duration = Math.max(0.34, 1.52 * Math.exp(-index / 10) + 0.20);
  const done = since >= duration;
  return <div className={`resume-decode__line resume-decode__line--${entry.type} ${done ? 'is-resolved' : 'is-decoding'}`}>
    {entry.href && done
      ? <a href={entry.href} target="_blank" rel="noopener noreferrer">{entry.text}</a>
      : <span aria-hidden="true" className="resume-decode__cipher">{shown}</span>}
    {!done && <span className="resume-decode__sr-only">{entry.text}</span>}
  </div>;
}

export default function ResumeReveal({ active, progress }) {
  const [elapsed, setElapsed] = useState(0);
  const motionOff = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    if (!active) { setElapsed(0); return undefined; }
    if (motionOff) { setElapsed(LAST_TIME + 3); return undefined; }
    let timer = null;
    const startedAt = performance.now();
    const tick = () => {
      const seconds = (performance.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= LAST_TIME + 1.3 && timer !== null) window.clearInterval(timer);
    };
    tick();
    timer = window.setInterval(tick, 46);
    return () => window.clearInterval(timer);
  }, [active, motionOff]);

  // At the first scroll into the final chapter, the terminal appears but has
  // no decoded text yet. It remains visible at the end of the scroll and the
  // typing effect finishes using wall-clock time (no extra scroll listener).
  if (!active) return null;
  const reveal = ease((progress - RESUME_START) / 0.014);
  const decodedCount = LINE_STARTS.filter(start => start <= elapsed).length;
  const completed = elapsed >= LAST_TIME;
  const total = ALL_LINES.length;
  let counter = 0;
  const renderLines = entries => entries.map(entry => {
    const index = counter++;
    return <Line key={`${entry.type}-${index}`} entry={entry} index={index} elapsed={elapsed}/>;
  });
  return <section className="resume-decode" id="resume" aria-label="Résumé" style={{opacity: reveal}}>
    <div className="resume-decode__terminal" style={{transform:`translate3d(0,${(1-reveal)*22}px,0) scale(${0.97+0.03*reveal})`}}>
      <header className="resume-decode__terminal-bar">
        <span className="resume-decode__light" aria-hidden="true"/>
        <span>PROFILE.EXE / PUBLIC PORTFOLIO</span>
        <span className="resume-decode__terminal-state">{completed ? 'DECRYPTION COMPLETE' : 'DECODING DATA STREAM...'}</span>
      </header>
      <div className="resume-decode__progress" aria-hidden="true"><span style={{width:`${Math.min(100, Math.round(decodedCount / total * 100))}%`}}/></div>
      <div className="resume-decode__sheet">
        <div className="resume-decode__masthead">{renderLines(CONTENT.head)}</div>
        <div className="resume-decode__columns">
          <div className="resume-decode__column">{renderLines(CONTENT.left)}</div>
          <div className="resume-decode__column resume-decode__column--projects">{renderLines(CONTENT.right)}</div>
        </div>
        <footer className="resume-decode__foot">{renderLines(CONTENT.foot)}</footer>
      </div>
    </div>
  </section>;
}
