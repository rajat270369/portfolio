import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { experienceAudio as audio } from './ExperienceAudio.js';
import { RESUME_START, ease } from './experienceTimeline.js';

// The résumé is painted onto a TRANSPARENT texture living inside the existing
// morphed Three.js blueprint. No HTML card, CSS border or inner scrollbar.
// The two deployed projects are the only entries in Selected Projects.
const CONTACT = 'HISAR, HARYANA  ·  +91 8950162025';
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+?';
const LINKS = {
  github: 'https://github.com/rajat270369',
  fraud: 'https://fraud-x-t8wj.onrender.com',
  eia: 'https://eco-impact-analyzer.onrender.com',
};
const COLORS = {
  title: '#f1ffff',
  heading: '#78efdb',
  item: '#e1f9ff',
  body: '#c4dfe5',
  meta: '#96bfca',
  link: '#84ffe0',
  faint: '#689eaf',
};
const FONT = "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

function makeLayout(ctx, mobile) {
  const width = mobile ? 920 : 1536;
  const height = mobile ? 1730 : 1204;
  const lines = [];
  const hotspots = [];
  const sizes = mobile
    ? { title: 74, subtitle: 28, body: 28, meta: 24, heading: 32, item: 35, project: 42, link: 28 }
    : { title: 83, subtitle: 24, body: 25, meta: 22, heading: 28, item: 31, project: 45, link: 26 };

  const fontFor = (kind) => `${kind === 'title' || kind === 'item' || kind === 'project' || kind === 'heading' ? '700' : '500'} ${sizes[kind] || sizes.body}px ${FONT}`;
  const add = (kind, text, x, y, maxWidth, step, link = null) => {
    ctx.font = fontFor(kind);
    const words = text.split(' ');
    let segment = '';
    const segments = [];
    for (const word of words) {
      const attempt = segment ? `${segment} ${word}` : word;
      if (segment && ctx.measureText(attempt).width > maxWidth) {
        segments.push(segment);
        segment = word;
      } else segment = attempt;
    }
    if (segment) segments.push(segment);
    for (let i = 0; i < segments.length; i++) {
      const item = { kind, text: segments[i], x, y: y + i * step, font: fontFor(kind), size: sizes[kind] || sizes.body, link };
      lines.push(item);
      if (link) hotspots.push({ x: x - 8, y: item.y - item.size - 12, w: Math.min(maxWidth, ctx.measureText(item.text).width + 35), h: item.size + 30, href: link, item });
    }
    return y + segments.length * step;
  };

  if (mobile) {
    const x = 72, max = width - 144;
    add('title', 'RAJAT JANGU', x, 125, max, 85);
    add('subtitle', 'CSE (AI/ML)  /  WEB & 3D DEVELOPMENT', x, 183, max, 35);
    add('meta', CONTACT, x, 273, max, 32);
    add('link', 'GITHUB.COM/RAJAT270369', x, 313, max, 33, LINKS.github);

    add('heading', '01 / EDUCATION', x, 412, max, 40);
    add('item', 'Galgotias University, Greater Noida', x, 459, max, 43);
    add('body', 'B.Tech CSE, AI/ML', x, 532, max, 37);
    add('meta', 'SEPT 2025 — MAY 2029', x, 571, max, 32);

    add('heading', '02 / EXPERIENCE', x, 659, max, 38);
    add('item', 'Hartron — Web Development Intern', x, 710, max, 43);
    add('body', 'HTML & CSS training; built and styled web pages.', x, 784, max, 39);
    add('meta', '9 JULY — 4 AUGUST', x, 865, max, 31);

    add('heading', '03 / SKILLS', x, 932, max, 40);
    add('body', 'React · JavaScript · Three.js · WebGL', x, 985, max, 38);
    add('body', 'Java · Spring Boot · Python · Flask', x, 1024, max, 38);

    add('heading', '04 / SELECTED PROJECTS', x, 1121, max, 40);
    add('project', 'FRAUD-X', x, 1172, max, 49);
    add('body', 'Fraud assessment and nine-crystal 3D command centre.', x, 1226, max, 36);
    add('link', 'fraud-x-t8wj.onrender.com', x, 1333, max, 35, LINKS.fraud);

    add('project', 'ECO IMPACT ANALYZER', x, 1400, max, 49);
    add('body', 'Environmental predictions, Flask backend and WebGL morphs.', x, 1453, max, 36);
    add('link', 'eco-impact-analyzer.onrender.com', x, 1565, max, 35, LINKS.eia);
  } else {
    const lx = 93, lw = 600, rx = 795, rw = 640;
    add('title', 'RAJAT JANGU', lx, 155, 1330, 100);
    add('subtitle', 'CSE (AI/ML) STUDENT  /  WEB & 3D DEVELOPMENT', lx, 215, 1330, 30);
    add('meta', CONTACT, lx, 259, 1330, 30);
    add('link', 'GITHUB.COM/RAJAT270369', lx, 296, 1330, 32, LINKS.github);

    add('heading', '01 / EDUCATION', lx, 391, lw, 38);
    add('item', 'Galgotias University, Greater Noida', lx, 442, lw, 43);
    add('body', 'B.Tech CSE · AI/ML', lx, 544, lw, 34);
    add('meta', 'SEPT 2025 — MAY 2029', lx, 584, lw, 30);

    add('heading', '02 / EXPERIENCE', lx, 655, lw, 38);
    add('item', 'Hartron — Web Development Intern', lx, 709, lw, 42);
    add('body', 'HTML & CSS training; developed and styled web pages.', lx, 808, lw, 36);
    add('meta', '9 JULY — 4 AUGUST', lx, 902, lw, 30);

    add('heading', '03 / TECH STACK', lx, 964, lw, 38);
    add('body', 'React · JavaScript · Three.js · WebGL', lx, 1008, lw, 32);
    add('body', 'Java · Spring Boot · Python · Flask', lx, 1044, lw, 32);
    add('body', 'C · C++ · HTML · CSS · Git · Linux', lx, 1080, lw, 32);

    add('heading', '04 / SELECTED PROJECTS', rx, 391, rw, 38);
    add('project', 'FRAUD-X', rx, 452, rw, 52);
    add('body', 'Rule-based fraud assessment with Java Spring Boot and a nine-crystal React/Three.js command centre.', rx, 505, rw, 37);
    add('meta', 'REACT · THREE.JS · JAVA · SPRING BOOT', rx, 629, rw, 28);
    add('link', 'fraud-x-t8wj.onrender.com', rx, 672, rw, 33, LINKS.fraud);

    add('project', 'ECO IMPACT ANALYZER', rx, 777, rw, 53);
    add('body', 'Deployed environmental impact analysis with an ML prediction model and scroll-driven WebGL morphing.', rx, 836, rw, 37);
    add('meta', 'PYTHON · FLASK · ML · THREE.JS', rx, 954, rw, 30);
    add('link', 'eco-impact-analyzer.onrender.com', rx, 999, rw, 33, LINKS.eia);
  }

  // Every line is a timed glyph-decode unit. The early lines arrive slowly,
  // subsequent ones accelerate a little, but significantly slower than V5.
  let cursor = 1.15;
  for (let i = 0; i < lines.length; i++) {
    lines[i].start = cursor;
    lines[i].duration = Math.max(1.15, 3.2 * Math.exp(-i / 30));
    cursor += 0.66 * Math.exp(-i / 24) + 0.23;
  }
  const decodeEnd = Math.max(...lines.map(line => line.start + line.duration));
  return { width, height, lines, hotspots, finish: cursor + 1.5, decodeEnd };
}

function encodeLine(text, index, elapsed, start, duration) {
  const local = elapsed - start;
  if (local < 0) return null;
  if (local >= duration) return text;
  const readable = Math.floor(text.length * ease(local / duration));
  const tick = Math.floor(elapsed * 11); // calmer, less frantic glyph cycling
  let out = '';
  for (let j = 0; j < text.length; j++) {
    const c = text[j];
    if (/\s|[·.,:;—/()+\-↗]/u.test(c) || j < readable) out += c;
    else out += GLYPHS[(index * 29 + j * 13 + tick * 17 + (tick * j) % 31) % GLYPHS.length];
  }
  return out;
}

function drawResume(ctx, layout, elapsed, reducedMotion) {
  const { width: W, height: H, lines } = layout;
  ctx.clearRect(0, 0, W, H); // transparent: existing morph frame IS the border
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  // Small terminal annotation is drawn ON the 3D plane, not in HTML/CSS.
  ctx.fillStyle = COLORS.faint;
  ctx.font = `600 ${layout.width < 1000 ? 22 : 20}px ${FONT}`;
  ctx.fillText('PROFILE.DAT  //  RECOVERING RECORD', layout.width < 1000 ? 72 : 94, layout.width < 1000 ? 57 : 64);
  const ready = reducedMotion ? Number.POSITIVE_INFINITY : elapsed;
  const resolvedCount = lines.reduce((count, l) => count + (ready >= l.start + l.duration ? 1 : 0), 0);
  const left = layout.width < 1000 ? 72 : 94;
  const right = W - left;
  ctx.fillStyle = 'rgba(107,225,218,0.25)';
  ctx.fillRect(left, layout.width < 1000 ? 347 : 322, right - left, 2);
  if (layout.width > 1000) {
    ctx.fillStyle = 'rgba(107,225,218,0.15)';
    ctx.fillRect(749, 351, 2, 741);
  }
  ctx.fillStyle = 'rgba(107,225,218,0.14)';
  ctx.fillRect(left, H - 91, right - left, 2);
  ctx.font = `600 ${layout.width < 1000 ? 19 : 18}px ${FONT}`;
  ctx.fillStyle = COLORS.faint;
  ctx.fillText(`DECODED  ${String(resolvedCount).padStart(2, '0')} / ${String(lines.length).padStart(2, '0')}`, left, H - 50);
  ctx.textAlign = 'right';
  ctx.fillText(resolvedCount === lines.length ? 'RECORD VERIFIED  •  END OF FILE' : 'DATA INTEGRITY CHECK IN PROGRESS', right, H - 50);
  ctx.textAlign = 'left';

  lines.forEach((line, index) => {
    const text = reducedMotion ? line.text : encodeLine(line.text, index, elapsed, line.start, line.duration);
    if (text === null) return;
    const resolved = reducedMotion || elapsed >= line.start + line.duration;
    ctx.font = line.font;
    ctx.strokeStyle = 'rgba(0, 4, 10, 0.9)';
    ctx.lineWidth = line.kind === 'title' ? 8 : 6; // cuts through existing wireframe lines
    ctx.strokeText(text, line.x, line.y);
    ctx.fillStyle = resolved ? (COLORS[line.kind] || COLORS.body) : '#78f3d2';
    ctx.shadowColor = resolved ? 'rgba(84,202,210,0.22)' : 'rgba(79,255,198,0.35)';
    ctx.shadowBlur = resolved ? 2 : 8;
    ctx.fillText(text, line.x, line.y);
    ctx.shadowBlur = 0;
    if (line.link && resolved) {
      const w = ctx.measureText(line.text).width;
      ctx.fillStyle = 'rgba(99,247,219,0.65)';
      ctx.fillRect(line.x, line.y + 6, w, 2);
    }
  });
}

export default function ResumeInFrame({ progressRef, reducedMotion = false }) {
  const mobile = useThree(s => s.size.width < 740);
  const gl = useThree(s => s.gl);
  const bundle = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    const layout = makeLayout(ctx, mobile);
    canvas.width = layout.width;
    canvas.height = layout.height;
    // Canvas resize resets rendering state: drawResume reinstates settings.
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity: 0, depthTest: false,
      depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    });
    return { canvas, ctx, layout, texture, material };
  }, [mobile]);
  const started = useRef(null);
  const lastDraw = useRef(-1);
  const elapsedRef = useRef(0);
  const wasActive = useRef(false);
// Higher = fewer typing sounds; e.g. 1.8 means noticeably slower ticks.
  const TICK_SPACING_MULTIPLIER = 1.35;
  const audioBeat = useRef({ next: 0, done: false });

  useEffect(() => () => {
    bundle.texture.dispose();
    bundle.material.dispose();
    gl.domElement.style.cursor = '';
  }, [bundle, gl]);

  useFrame((state) => {
    const p = progressRef.current;
    const active = p >= RESUME_START + 0.002;
    if (!active) {
      bundle.material.opacity = 0;
      if (wasActive.current) {
        wasActive.current = false;
        started.current = null;
        lastDraw.current = -1;
        elapsedRef.current = 0;
      }
      return;
    }
    const now = state.clock.elapsedTime;
    if (!wasActive.current) {
      wasActive.current = true;
      started.current = now;
      audioBeat.current = { next: 1.15, done: false };
    }
    const elapsed = reducedMotion ? bundle.layout.finish + 1 : now - started.current;
    elapsedRef.current = elapsed;
    if (!reducedMotion && !document.hidden) {
      const beat = audioBeat.current;
      if (elapsed >= bundle.layout.decodeEnd) {
        if (!beat.done) { audio.complete(); beat.done = true; }
      } else if (elapsed >= beat.next) {
        audio.tick();
        beat.next = elapsed + Math.max(.095, .36 - elapsed * .014) * TICK_SPACING_MULTIPLIER;
      }
    }
    bundle.material.opacity = ease((p - RESUME_START - 0.002) / 0.013);
    if (lastDraw.current < 0 || elapsed - lastDraw.current >= 1 / 12 || (elapsed >= bundle.layout.finish && lastDraw.current < bundle.layout.finish)) {
      drawResume(bundle.ctx, bundle.layout, elapsed, reducedMotion);
      bundle.texture.needsUpdate = true;
      lastDraw.current = elapsed;
    }
  });

  const visitLink = (event) => {
    if (bundle.material.opacity < 0.95 || !event.uv) return;
    const x = event.uv.x * bundle.layout.width;
    const y = (1 - event.uv.y) * bundle.layout.height;
    const match = bundle.layout.hotspots.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h
      && (reducedMotion || elapsedRef.current >= h.item.start + h.item.duration));
    if (!match) return;
    event.stopPropagation();
    window.open(match.href, '_blank', 'noopener,noreferrer');
  };
  const movePointer = (event) => {
    if (!event.uv) return;
    const x = event.uv.x * bundle.layout.width;
    const y = (1 - event.uv.y) * bundle.layout.height;
    gl.domElement.style.cursor = bundle.layout.hotspots.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h
      && (reducedMotion || elapsedRef.current >= h.item.start + h.item.duration)) ? 'pointer' : '';
  };

  return <mesh position={[0, 0, 0.13]} renderOrder={50}
    frustumCulled={false} onClick={visitLink} onPointerMove={movePointer}
    onPointerOut={() => { gl.domElement.style.cursor = ''; }}>
    <planeGeometry args={[6.74, 5.21]}/>
    <primitive object={bundle.material} attach="material"/>
  </mesh>;
}
