import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import ResumeInFrame from './ResumeInFrame.jsx';
import {
  EIA_START, EIA_BEAT_START, RESUME_START, clamp01, ease, fallDepthAt,
  morphShapeAt, eiaDescentAt,
} from './experienceTimeline.js';

// EIA / SKYDIVE V4 — SIX MORPH TARGETS, CIRCLE FIRST
// This is ONE continuous morphing mesh, not four static models or cross-fades.
// The CAMERA falls in Scene.jsx. Tunnel hoops + wind streaks stay fixed in
// world space and pass the viewer; the same mesh blends vertex-by-vertex
// through circle -> diamond -> knot -> prism -> forecast -> blueprint frame.
// FRAUD-X / Nexus are intentionally untouched.
const INKS = ['#47e1ed', '#5df6bd', '#bfa2ff', '#ffcc83', '#8bc8ff', '#b7e8fa'];
const FALL_COLUMN_Z = 8.9;
const SHAPE_Z = 7.35;
const MOBILE_SCALE = 1.15;
const DESKTOP_SCALE = 1.52;
const reduceMotion = () => typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildMorph() {
  // All six forms share ONE geometry and one vertex index layout, as in your
  // original Three.js morph. The first form is unmistakably a ROUND CIRCLE.
  const geometry = new THREE.IcosahedronGeometry(1.6, 4);
  const original = Float32Array.from(geometry.attributes.position.array);
  const count = geometry.attributes.position.count;
  // Source-inspired TorusKnotGeometry: referenced by your original morph code.
  const knot = new THREE.TorusKnotGeometry(1.25, 0.34, 144, 14);
  const knotPos = knot.attributes.position.array;
  const knotCount = knot.attributes.position.count;
  const targets = Array.from({ length: 6 }, () => new Float32Array(original.length));

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const x = original[j], y = original[j + 1], z = original[j + 2];
    const radial = Math.hypot(x, y);

    // 01 CIRCLE / circular ring. It is baked from the original icosahedron
    // vertices, preserving one topology as they transform into the diamond.
    const azimuth = Math.atan2(y, x);
    const tube = Math.atan2(z, radial - 1.13);
    const radius = 1.85 + 0.34 * Math.cos(tube);
    targets[0][j] = radius * Math.cos(azimuth);
    targets[0][j + 1] = radius * Math.sin(azimuth);
    targets[0][j + 2] = 0.34 * Math.sin(tube);

    // 02 DIAMOND / modified octahedron: taken from your EIA core reference.
    const factor = 2.6 / (Math.abs(x) + Math.abs(y) + Math.abs(z) + 1e-5);
    const dx = x * factor, dy = y * factor, dz = z * factor;
    targets[1][j] = dx;
    targets[1][j + 1] = dy;
    targets[1][j + 2] = dz;

    // 03 TORUS KNOT / source's cyclic vertex sampling logic, scaled to scene.
    const k = (i % knotCount) * 3;
    targets[2][j] = knotPos[k] * 1.15;
    targets[2][j + 1] = knotPos[k + 1] * 1.15;
    targets[2][j + 2] = knotPos[k + 2] * 1.15;

    // 04 DATA PRISM / vertical expansion from your original reference.
    const magnitude = Math.hypot(x, y, z) + 1e-5;
    targets[3][j] = x / magnitude * 1.28;
    targets[3][j + 1] = y / magnitude * 3.25;
    targets[3][j + 2] = z / magnitude * 1.28;

    // 05 FORECAST / stretched diamond, clearly distinct from the prism.
    targets[4][j] = dx * 0.70;
    targets[4][j + 1] = dy * 1.73;
    targets[4][j + 2] = dz * 0.70;

    // 06 ADVISORY / blueprint rectangle (source's feedback-plane concept).
    // The same frame also remains after EIA as the blank resume scaffold.
    const u = ((Math.atan2(y, x) / (2 * Math.PI)) + 1) % 1;
    const edge = u * 4;
    let fx, fy;
    if (edge < 1) { fx = -3.7 + edge * 7.4; fy = 2.9; }
    else if (edge < 2) { fx = 3.7; fy = 2.9 - (edge - 1) * 5.8; }
    else if (edge < 3) { fx = 3.7 - (edge - 2) * 7.4; fy = -2.9; }
    else { fx = -3.7; fy = -2.9 + (edge - 3) * 5.8; }
    targets[5][j] = fx;
    targets[5][j + 1] = fy;
    targets[5][j + 2] = z * 0.025;
  }

  knot.dispose();
  geometry.attributes.position.array.set(targets[0]);
  geometry.attributes.position.needsUpdate = true;
  return {
    geometry, targets, original,
    line: new THREE.MeshBasicMaterial({
      color: INKS[0], wireframe: true, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }),
    halo: new THREE.MeshBasicMaterial({
      color: INKS[0], wireframe: true, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }),
    dots: new THREE.PointsMaterial({
      color: INKS[0], size: 0.045, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }),
  };
}

function seededRandom() {
  let seed = 941287;
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function makeFallingField() {
  // Positions are FIXED in world space, so camera descent produces natural
  // perspective expansion + upward travel like a skydive, not a CSS animation.
  const random = seededRandom();
  const streakCount = 380;
  const positions = new Float32Array(streakCount * 6);
  for (let i = 0; i < streakCount; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 2.6 + Math.sqrt(random()) * 12.0;
    const x = Math.cos(angle) * radius;
    const z = FALL_COLUMN_Z + Math.sin(angle) * radius;
    const y = -82 - random() * 205;
    const length = 0.55 + random() * 3.7;
    const j = 6 * i;
    positions[j] = x;
    positions[j + 1] = y;
    positions[j + 2] = z;
    positions[j + 3] = x;
    positions[j + 4] = y + length;
    positions[j + 5] = z;
  }
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const sparkPositions = new Float32Array(330 * 3);
  for (let i = 0; i < 330; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 1.7 + Math.sqrt(random()) * 11;
    const j = i * 3;
    sparkPositions[j] = Math.cos(angle) * radius;
    sparkPositions[j + 1] = -82 - random() * 205;
    sparkPositions[j + 2] = FALL_COLUMN_Z + Math.sin(angle) * radius;
  }
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));

  return {
    streakGeometry,
    streakMaterial: new THREE.LineBasicMaterial({
      color: '#5fe6eb', transparent: true, opacity: 0.18,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }),
    sparkGeometry,
    sparkMaterial: new THREE.PointsMaterial({
      color: '#99dfee', size: 0.065, sizeAttenuation: true,
      transparent: true, opacity: 0.33, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }),
  };
}

// Physical depth hoops: horizontal XZ rings (normal = world Y).
// They get larger as the downward-facing camera rushes toward them, then pass
// behind the viewer. Different diameters prevent an artificial static tunnel.
const HOOPS = Array.from({ length: 36 }, (_, i) => ({
  y: -85 - i * 5.45,
  radius: 6.0 + (i % 4) * 0.75,
  opacity: 0.13 + (i % 3) * 0.035,
  color: i % 4 === 0 ? '#9883ec' : i % 3 === 0 ? '#529fc8' : '#207e8b',
}));
const COLORS = INKS.map(color => new THREE.Color(color));

export default function MorphJourney({ progressRef }) {
  const shape = useMemo(buildMorph, []);
  const field = useMemo(makeFallingField, []);
  const rootRef = useRef();
  const voidRef = useRef();
  const resumeCirclesRef = useRef();
  const hoopRefs = useRef([]);
  const active = useRef(false);
  const lastY = useRef(null);
  const speed = useRef(0);
  const invalidate = useThree(s => s.invalidate);
  const motionOff = useMemo(reduceMotion, []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => () => {
    shape.geometry.dispose();
    shape.line.dispose();
    shape.halo.dispose();
    shape.dots.dispose();
    field.streakGeometry.dispose();
    field.streakMaterial.dispose();
    field.sparkGeometry.dispose();
    field.sparkMaterial.dispose();
  }, [shape, field]);

  // Respect the existing single Canvas and demand-rendering strategy.
  // Only the EIA stretch runs a small 30 FPS animation timer.
  useEffect(() => {
    if (motionOff) return undefined;
    const timer = window.setInterval(() => {
      if (active.current) invalidate();
    }, 33);
    return () => window.clearInterval(timer);
  }, [invalidate, motionOff]);

  useFrame((state, delta) => {
    const p = progressRef.current;
    const visible = p >= EIA_START;
    if (voidRef.current) voidRef.current.visible = visible;
    active.current = visible;
    state.scene.background?.set(visible ? '#000000' : '#050913');
    if (!visible) {
      lastY.current = null;
      speed.current = 0;
      return;
    }

    const time = state.clock.elapsedTime;
    const descent = eiaDescentAt(p);
    const cameraY = -76 - fallDepthAt(p);
    const dt = Math.max(0.016, Math.min(delta, 0.1));
    const rawSpeed = lastY.current === null ? 0 : Math.abs(cameraY - lastY.current) / dt;
    lastY.current = cameraY;
    const velocity = clamp01(rawSpeed / 95);
    speed.current = THREE.MathUtils.damp(speed.current, velocity, 5.2, dt);

    // Skydiving cues gain strength while scrolling and ease off when stopped.
    field.streakMaterial.opacity = motionOff ? 0.10 : 0.15 + speed.current * 0.40;
    field.sparkMaterial.opacity = motionOff ? 0.16 : 0.26 + speed.current * 0.37;
    field.sparkMaterial.size = motionOff ? 0.055 : 0.055 + speed.current * 0.032;

    // ONE evolving mesh. The scroll position picks two adjacent targets; EVERY
    // vertex is interpolated continuously between those targets, in either
    // scroll direction. There is no mesh swap and no shape crossfade.
    const shapeProgress = morphShapeAt(p); // [0,5], circle first.
    const index = Math.min(4, Math.floor(shapeProgress));
    const mix = clamp01(shapeProgress - index);
    const from = shape.targets[index];
    const to = shape.targets[index + 1];
    const buffer = shape.geometry.attributes.position.array;
    const isResume = clamp01((p - RESUME_START) / (1 - RESUME_START));
    const settle = ease(isResume);
    // Calm the final morph earlier so the resume can be read without spinning.
    const resumeQuiet = ease((p - (RESUME_START - 0.020)) / 0.035);
    const flutter = motionOff ? 0 : (1 - settle) * (0.009 + 0.016 * speed.current);
    for (let j = 0; j < buffer.length; j += 3) {
      const wobble = flutter * Math.sin(
        time * 2.1 + shape.original[j] * 2.8
        + shape.original[j + 1] * 1.4 + j * 0.003,
      );
      const w = 1 + wobble;
      buffer[j] = (from[j] + (to[j] - from[j]) * mix) * w;
      buffer[j + 1] = (from[j + 1] + (to[j + 1] - from[j + 1]) * mix) * w;
      buffer[j + 2] = (from[j + 2] + (to[j + 2] - from[j + 2]) * mix) * w;
    }
    shape.geometry.attributes.position.needsUpdate = true;

    tempColor.copy(COLORS[index]).lerp(COLORS[index + 1], mix);
    shape.line.color.copy(tempColor);
    shape.halo.color.copy(tempColor);
    shape.dots.color.copy(tempColor);

    // Exit from darkness: the form first appears far BELOW the visitor,
    // then grows closer. It keeps drifting naturally while it morphs.
    const arrival = ease((p - EIA_BEAT_START) / 0.026);
    const distance = THREE.MathUtils.lerp(35, 17.0, arrival)
      - 5.2 * ease((p - RESUME_START) / 0.065)
      - 1.3 * settle // move INTO the morphed frame for legible embedded text
      + (motionOff ? 0 : Math.sin(descent * 4 * Math.PI) * 1.15 * (1 - settle));
    const root = rootRef.current;
    if (root) {
      root.position.set(
        (motionOff ? 0 : 0.48 * Math.sin(descent * 7.2) * (1 - settle)),
        cameraY - distance,
        SHAPE_Z + (motionOff ? 0 : 0.40 * Math.cos(descent * 9.1) * (1 - settle)),
      );
      const size = state.size.width < 740 ? MOBILE_SCALE : DESKTOP_SCALE;
      // The actual morphing frame grows to contain the résumé. On portrait
      // screens, its very final pose becomes taller/narrower, without new CSS.
      const portrait = state.size.width < 740;
      const finalX = portrait ? 0.64 : 1.65;
      const finalY = portrait ? 1.65 : 1.65;
      root.scale.set(
        THREE.MathUtils.lerp(size, finalX, settle),
        THREE.MathUtils.lerp(size, finalY, settle),
        THREE.MathUtils.lerp(size, portrait ? 0.9 : 1.65, settle),
      );
      // The initial circle is FACE-ON, not seen edge-on by the skydiving POV.
      // Subsequent diamond, knot, prism, forecast and resume frame remain
      // visibly distinct, then the frame levels out for resume content later.
      const tilts = [-Math.PI / 2, -1.02, -0.81, -0.45, -0.98, -Math.PI / 2];
      const tilt = THREE.MathUtils.lerp(tilts[index], tilts[index + 1], mix);
      const motion = motionOff ? 0 : 1 - resumeQuiet;
      root.rotation.set(
        tilt + motion * Math.sin(time * 0.45) * 0.075,
        motion * (time * 0.024 + descent * 0.28),
        motion * Math.sin(time * 0.55 + descent * 8) * 0.06,
      );
    }

    // Ambient rings remain alive even when scrolling stops at the resume.
    // Only the EIA world changes: no effect on FRAUD-X or the locked Nexus.
    if (resumeCirclesRef.current) {
      resumeCirclesRef.current.visible = p >= RESUME_START - 0.018;
      resumeCirclesRef.current.rotation.z = motionOff ? 0 : time * 0.040;
      resumeCirclesRef.current.rotation.y = motionOff ? 0 : Math.sin(time * 0.16) * 0.075;
      resumeCirclesRef.current.children.forEach((ring, i) => {
        const isArc = i >= 3;
        const ringIndex = i % 3;
        // A complete circle is rotationally symmetric, so the shorter
        // luminous arcs make the otherwise subtle orbital spin visible.
        ring.material.opacity = (isArc ? 0.59 : 0.16 + 0.035 * ringIndex) * resumeQuiet;
        const angularSpeed = isArc ? [0.42, -0.31, 0.25][ringIndex] : [0.045, -0.038, 0.027][ringIndex];
        ring.rotation.z = motionOff ? 0 : time * angularSpeed;
        ring.scale.setScalar(motionOff ? 1 : 1 + 0.015 * Math.sin(time * 0.70 + ringIndex));
      });
    }
    hoopRefs.current.forEach((ring, i) => {
      if (!ring) return;
      ring.position.y = HOOPS[i].y + (motionOff ? 0 : resumeQuiet * 0.32 * Math.sin(time * 0.40 + i * 0.38));
      ring.scale.setScalar(motionOff ? 1 : 1 + resumeQuiet * 0.047 * Math.sin(time * 0.5 + i * 0.42));
    });

    const revealed = ease((p - EIA_BEAT_START) / 0.016);
    // Keep the morphed geometry as the REAL surrounding frame; soften its
    // interior wire crossings so the embedded text remains legible.
    shape.line.opacity = (0.83 - 0.49 * settle) * revealed;
    shape.halo.opacity = 0.075 * revealed;
    shape.dots.opacity = 0.30 * revealed;
  });

  return <group ref={voidRef} visible={false}>
    <lineSegments
      geometry={field.streakGeometry}
      material={field.streakMaterial}
      frustumCulled={false}
    />
    <points
      geometry={field.sparkGeometry}
      material={field.sparkMaterial}
      frustumCulled={false}
    />
    {HOOPS.map((hoop, i) => (
      <mesh key={`fall-ring-${i}`} ref={node => { hoopRefs.current[i] = node; }}
        position={[0, hoop.y, FALL_COLUMN_Z]}
        rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[hoop.radius, 0.019, 4, 80]} />
        <meshBasicMaterial
          color={hoop.color} transparent opacity={hoop.opacity}
          depthWrite={false} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
    ))}
    <group ref={rootRef} position={[0, -110, SHAPE_Z]}>
      <mesh geometry={shape.geometry} material={shape.halo}
        scale={1.065} frustumCulled={false} />
      <mesh geometry={shape.geometry} material={shape.line}
        frustumCulled={false} />
      <points geometry={shape.geometry} material={shape.dots}
        frustumCulled={false} />
      <ResumeInFrame progressRef={progressRef} reducedMotion={motionOff} />
      {/* These are live 3D halo rings behind the resume, not DOM decoration. */}
      <group ref={resumeCirclesRef} visible={false} position={[0, 0, -0.16]}>
        {[4.55, 5.04, 5.55].map((radius, i) => (
          <mesh key={`resume-circle-${i}`} frustumCulled={false}>
            <torusGeometry args={[radius, 0.011 + i * 0.005, 5, 112]} />
            <meshBasicMaterial
              color={i === 1 ? '#6debc9' : '#77c4ed'} transparent opacity={0}
              depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
        {[4.55, 5.04, 5.55].map((radius, i) => (
          <mesh key={`resume-moving-arc-${i}`} frustumCulled={false}>
            <torusGeometry args={[radius, 0.029, 5, 48, Math.PI * 0.29]} />
            <meshBasicMaterial
              color={i === 1 ? '#8bffdd' : '#a7dbff'} transparent opacity={0}
              depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  </group>;
}
