import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { STATIONS, CHAMBER_CENTER_Z } from './stations.js';
import { INTRO_END, TOUR_ORDER, stageAt, cameraPoseAt, crystalActivationAt } from './firstPersonTour.js';
import MorphJourney from './MorphJourney.jsx';
import { NEXUS_END, EIA_START, nexusProgressAt, portalProgressAt, fallDepthAt, ease as phaseEase, lerp } from './experienceTimeline.js';

const CORRIDOR_URL = '/models/Rajat_Corridor_Door_V2.glb';
const ROOM_URL = '/models/FRAUDX_NEXUS9_ALL_9_CRYSTALS.glb';
const ROOTS = [
  'AQUAMARINE_CRYSTAL_ROOT', 'SAPPHIRE_CRYSTAL_ROOT',
  'AMBER_CRYSTAL_ROOT', 'FROST_CRYSTAL_ROOT', 'RUBY_CRYSTAL_ROOT',
  'AMETHYST_NEXUS_ROOT', 'CITRINE_ORACLE_ROOT', 'EMERALD_ARCHIVE_ROOT',
  'OPAL_SINGULARITY_ROOT',
];
const ORBITS = ['Precision_Orbit_Inner', 'Precision_Orbit_Middle', 'Precision_Orbit_Outer'];
const SPIN = [0.82, -0.62, 0.44];
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const SCALE = [1, 1.04, 1.10, 1.23, 1.17, 1.07, 1.20, 1.17, 1.21];
const ease = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Optional visual diagnostic: add ?debugTabs=1 to the website URL.
const DEBUG_TABS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debugTabs');

// Verified against FRAUDX_NEXUS9_ALL_9_CRYSTALS.glb:
// The existing two portrait sketch screens are baked into OPTIMIZED_02__Recess.
// They are NOT individual Tab meshes. The UI anchors mark the wall station,
// but these text planes are parented to the ROOM (not the empty anchor) so
// they cannot silently inherit unexpected visibility/scale from GLTF nodes.
// IMPORTANT: no HTML labels and no replacement panels are created.
const TAB_COPY = {
  1: [['01 / AQUAMARINE', 'TRANSACTION', 'ANALYSIS'], ['ACTIVE SYSTEM', 'RULE ENGINE', 'AMOUNT + LOCATION']],
  2: [['02 / SAPPHIRE', 'THREAT', 'OVERVIEW'], ['ROADMAP', 'RISK ALERTS', 'DASHBOARD']],
  3: [['03 / AMBER', 'LIVE', 'MONITOR'], ['ROADMAP', 'REAL-TIME', 'EVENT STREAM']],
  4: [['04 / FROST', 'TRANSACTION', 'EXPLORER'], ['ROADMAP', 'SEARCH +', 'FILTER RECORDS']],
  5: [['05 / RUBY', 'INVESTIGATION', 'CENTRE'], ['ROADMAP', 'CASE REVIEW', 'EVIDENCE']],
  6: [['06 / AMETHYST', 'NETWORK', 'INTELLIGENCE'], ['ROADMAP', 'ACCOUNT', 'LINK ANALYSIS']],
  7: [['07 / CITRINE', 'MODEL', 'INTELLIGENCE'], ['ROADMAP', 'ML METRICS', 'EXPLAINABILITY']],
  8: [['08 / EMERALD', 'REPORTS +', 'INTELLIGENCE'], ['ROADMAP', 'RISK REPORTS', 'CSV / PDF EXPORT']],
  9: [['09 / OPAL', 'PREFERENCES', 'SYSTEM'], ['ROADMAP', 'NOTIFICATIONS', 'ACCESSIBILITY']],
};

// Measurements in the GLB's UI-anchor LOCAL coordinates, calibrated by
// 3D picking on the actual two panel faces at Station 01.
// Anchor Y=3.30; tab center Y approximately 2.19.
// +X is the viewer's LEFT panel for station 01; -X is RIGHT.
const TAB_GEOMETRY = Object.freeze({
  leftX: +1.01,
  rightX: -1.01,
  down: -1.11,
  facingCamera: -0.085,
  width: 0.62,
  height: 0.80,
});

function cleanName(name) {
  return (name || '').replace(/\.\d{3}$/, '');
}
function findNamedNode(parent, wanted) {
  let found = null;
  parent?.traverse(object => {
    const name = cleanName(object.name);
    if (!found && (name === wanted || name.endsWith('_' + wanted))) found = object;
  });
  return found;
}

function createTabTexture([label, title, detail], color) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[NEXUS-9] Could not create the panel text canvas');
  ctx.clearRect(0, 0, 768, 1024);
  if (DEBUG_TABS) {
    ctx.fillStyle = 'rgba(255, 0, 140, 0.55)';
    ctx.fillRect(0, 0, 768, 1024);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Only glowing lines and words: the imported dark sketch panel stays visible.
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(90, 148); ctx.lineTo(678, 148); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(158, 828); ctx.lineTo(610, 828); ctx.stroke();
  ctx.globalAlpha = 1;

  function line(text, y, targetSize, ink, fontWeight = '700') {
    let size = targetSize;
    do {
      ctx.font = `${fontWeight} ${size}px ui-monospace, monospace`;
      if (ctx.measureText(text).width <= 650 || size <= 30) break;
      size -= 2;
    } while (true);
    ctx.fillStyle = ink;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    // Thin dark outline keeps letters legible over the source sketch lines.
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(0, 3, 9, 0.96)';
    ctx.strokeText(text, 384, y);
    ctx.fillText(text, 384, y);
    ctx.shadowBlur = 0;
  }
  line(label, 250, 58, color, '700');
  line(title, 428, 86, '#eafcff', '800');
  line(detail, 563, 69, color, '700');
  line('FRAUD-X  /  NEXUS-9', 760, 40, '#8aa4b8', '500');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function attachTabLabels(room, station) {
  const anchorName = `FX_STATION_${String(station.id).padStart(2, '0')}_UI`;
  const anchor = findNamedNode(room, anchorName);
  if (!anchor) {
    console.warn(`[NEXUS-9] Cannot find UI anchor ${anchorName}`);
    return [];
  }
  // Each UI anchor is a direct child of the imported glTF scene. Build an
  // independent root-level transform for the two labels, preserving its pose.
  // Keeping this separate from the crystal wrapper avoids its .255 GLB scale.
  const labelRoot = new THREE.Group();
  labelRoot.name = `NEXUS9_STATION_${station.id}_TEXT_ROOT`;
  labelRoot.position.copy(anchor.position);
  labelRoot.quaternion.copy(anchor.quaternion);
  room.add(labelRoot);
  console.info(`[NEXUS-9 TABS] Mounted station ${station.id} at`,
    labelRoot.position.toArray().map(x => x.toFixed(2)).join(', '));
  return TAB_COPY[station.id].map((copy, index) => {
    const texture = createTabTexture(copy, station.tone);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    // Use a REAL plane aligned with the actual tab face, NOT a billboard.
    const geometry = new THREE.PlaneGeometry(TAB_GEOMETRY.width, TAB_GEOMETRY.height);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `NEXUS9_STATION_${station.id}_TEXT_ON_EXISTING_TAB_${index + 1}`;
    mesh.position.set(
      index === 0 ? TAB_GEOMETRY.leftX : TAB_GEOMETRY.rightX,
      TAB_GEOMETRY.down,
      TAB_GEOMETRY.facingCamera,
    );
    // The UI anchor's +Z points toward the wall; -Z faces the visitor.
    mesh.rotation.y = Math.PI;
    mesh.renderOrder = 999;
    mesh.frustumCulled = false;
    mesh.visible = true; // fallback: visible even before first animation frame
    labelRoot.add(mesh);
    return { mesh, material, geometry, texture, labelRoot };
  });
}

function CameraTour({ progressRef }) {
  const camera = useThree(s => s.camera);
  const previous = useRef(-1);
  const look = useMemo(() => new THREE.Vector3(), []);
  const lastCrystalPose = useMemo(() => cameraPoseAt(1), []);
  // The actual GLB's FX_CORE_REACTOR_FLOAT is centered at Y=2.89.
  // Y=1.76 (previous value) looks at the pedestal, causing the foot-zoom.
  const core = useMemo(() => [0, 2.89, CHAMBER_CENTER_Z], []);
  const entryAngle = useMemo(() => Math.atan2(
    lastCrystalPose.eye[2] - CHAMBER_CENTER_Z, lastCrystalPose.eye[0],
  ), [lastCrystalPose]);
  const entryRadius = useMemo(() => Math.hypot(
    lastCrystalPose.eye[0], lastCrystalPose.eye[2] - CHAMBER_CENTER_Z,
  ), [lastCrystalPose]);
  useFrame(() => {
    const progress = progressRef.current;
    if (progress === previous.current) return;
    let view;
    if (progress < NEXUS_END) {
      // The whole existing entrance and nine-crystal path is preserved.
      view = cameraPoseAt(nexusProgressAt(progress));
    } else if (progress < EIA_START) {
      // 1) Curve around the ring to face the Nexus.
      // 2) Tighten the field of view as the floating core fills the screen.
      // 3) Physically pass through its center, under a late black fade.
      const p = portalProgressAt(progress);
      const arc = phaseEase(p / 0.49);
      const approach = phaseEase((p - 0.15) / 0.56);
      const plunge = phaseEase((p - 0.57) / 0.43);
      const angle = lerp(entryAngle, Math.PI / 2, arc);
      const radius = lerp(lerp(entryRadius, 2.50, approach), 0.035, plunge);
      const eye = [
        Math.cos(angle) * radius,
        lerp(lastCrystalPose.eye[1], core[1], phaseEase(p / 0.64)),
        CHAMBER_CENTER_Z + Math.sin(angle) * radius,
      ];
      const target = lastCrystalPose.look.map((v, i) =>
        lerp(v, core[i], phaseEase(p / 0.48)));
      const zoomFov = lerp(lastCrystalPose.fov, 42, approach);
      view = { eye, look: target, fov: lerp(zoomFov, 78, plunge) };
    } else {
      // EIA ONLY — SKYDIVER CAMERA. Pitch almost straight down so the field
      // expands from the center, like a real fall. FRAUD-X and the locked Nexus
      // camera route above are NOT modified. This point-of-view is hidden by
      // the pre-existing black handoff as the camera switches worlds.
      const y = -76 - fallDepthAt(progress);
      const descent = Math.max(0, Math.min(1, (progress - EIA_START) / (1 - EIA_START)));
      const settle = 1 - phaseEase((progress - 0.92) / 0.08);
      const sway = reducedMotion() ? 0 : Math.sin(descent * 16.0) * 0.40 * settle;
      view = {
        eye: [sway, y, 8.9],
        look: [-sway * 0.24, y - 26, 7.0],
        fov: lerp(67, 57, phaseEase((progress - 0.92) / 0.08)),
      };
    }
    // For the downward-facing EIA shot use Z for the screen's vertical axis;
    // restore the original Y-up camera when reversing into the locked Nexus.
    camera.up.set(0, progress < EIA_START ? 1 : 0, progress < EIA_START ? 0 : -1);
    camera.position.fromArray(view.eye);
    look.fromArray(view.look);
    camera.lookAt(look);
    if (Math.abs(camera.fov - view.fov) > 0.001) {
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    previous.current = progress;
  });
  return null;
}

function Corridor({ progressRef }) {
  const { scene } = useGLTF(CORRIDOR_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const previous = useRef(-1);
  const doors = useMemo(() => {
    const left = clone.getObjectByName('Door_Left');
    const right = clone.getObjectByName('Door_Right');
    return { left, right, leftX: left?.position.x ?? 0, rightX: right?.position.x ?? 0 };
  }, [clone]);
  useEffect(() => {
    for (const name of ['Wall_Rear', 'ProjectReveal_Panel']) {
      const obj = clone.getObjectByName(name); if (obj) obj.visible = false;
    }
    clone.traverse(obj => { if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = false; } });
  }, [clone]);
  useFrame(() => {
    const overall = progressRef.current;
    const p = nexusProgressAt(overall);
    if (overall === previous.current) return;
    clone.visible = overall < EIA_START && p < INTRO_END + 0.012;
    const opening = ease((p - 0.13) / 0.088);
    if (doors.left) doors.left.position.x = doors.leftX - opening * 1.10;
    if (doors.right) doors.right.position.x = doors.rightX + opening * 1.10;
    previous.current = overall;
  });
  return <group rotation={[0, Math.PI, 0]}><primitive object={clone}/></group>;
}

function buildStationFX(room) {
  return STATIONS.map((station, index) => {
    const wrapper = findNamedNode(room, station.wrapper);
    if (!wrapper) console.warn(`[NEXUS-9] Missing wrapper for ${station.name}: ${station.wrapper}`);
    const root = findNamedNode(wrapper, ROOTS[index]);
    const crystalY = root?.position.y ?? 0;
    if (root) root.scale.multiplyScalar(SCALE[index]);
    else console.warn(`[NEXUS-9] Missing crystal root ${ROOTS[index]}`);

    const orbitObjects = ORBITS.map((name, ringIndex) => {
      const obj = findNamedNode(wrapper, name);
      return obj ? {
        obj, speed: SPIN[ringIndex], base: obj.quaternion.clone(),
        spin: new THREE.Quaternion(), angle: 0,
      } : null;
    });
    const detected = orbitObjects.filter(Boolean).length;
    if (detected !== 3) {
      console.warn(`[NEXUS-9] ${station.name}: found ${detected}/3 orbit controllers`,
        'Expected:', ORBITS, 'Available names:', wrapper?.children.map(x => x.name));
    }

    const surfaces = [];
    if (root) {
      root.traverse(mesh => {
        if (!mesh.isMesh || surfaces.length >= 5) return;
        const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        if (!originals.some(m => /core|hot|bright|electric|luminous|vivid|aurora|ice|pearl|mint|royal|clear|spring/i.test(m?.name || ''))) return;
        const copies = originals.map(m => m?.clone());
        mesh.material = Array.isArray(mesh.material) ? copies : copies[0];
        for (const mat of copies) {
          if (!mat?.emissive || surfaces.length >= 5) continue;
          surfaces.push({ mat, baseColor: mat.emissive.clone(), baseIntensity: mat.emissiveIntensity });
        }
      });
    }
    const tabs = attachTabLabels(room, station);
    return { root, crystalY, orbitObjects, surfaces, tabs, color: new THREE.Color(station.tone), weight: 0 };
  });
}

function Nexus9({ progressRef, onLoaded }) {
  const { scene } = useGLTF(ROOM_URL);
  const room = useMemo(() => scene.clone(true), [scene]);
  const stations = useMemo(() => buildStationFX(room), [room]);
  const previous = useRef(-1);
  const invalidate = useThree(s => s.invalidate);
  const active = useRef(false);
  const motionOff = useMemo(reducedMotion, []);
  useEffect(() => {
    room.visible = false;
    room.traverse(obj => { if (obj.isMesh) { obj.castShadow = false; obj.receiveShadow = false; } });
    onLoaded?.();
  }, [room, onLoaded]);
  useEffect(() => () => {
    for (const station of stations) {
      for (const item of station.surfaces) item.mat.dispose();
      for (const tab of station.tabs) {
        tab.mesh.parent?.remove(tab.mesh);
        tab.geometry.dispose();
        tab.material.dispose();
        tab.texture.dispose();
      }
      station.tabs[0]?.labelRoot.parent?.remove(station.tabs[0]?.labelRoot);
    }
  }, [stations]);

  // Keep WebGL in demand-render mode; request ~30fps only while a station moves.
  useEffect(() => {
    if (motionOff) return;
    const timer = window.setInterval(() => { if (active.current) invalidate(); }, 33);
    return () => window.clearInterval(timer);
  }, [invalidate, motionOff]);

  useFrame((state, rawDelta) => {
    const overall = progressRef.current;
    // Do not keep animating the nine GLB stations in the EIA world.
    const p = nexusProgressAt(overall);
    const changed = overall !== previous.current;
    if (changed) {
      room.visible = overall < EIA_START && p >= 0.13;
      previous.current = overall;
    }
    if (!room.visible) { active.current = false; return; }
    const dt = Math.min(0.05, Math.max(0, rawDelta));
    const weights = crystalActivationAt(p);
    // The old panel code depended on `station.weight` reaching 0.2, even
    // though that weight only ramps up late in a tour segment. This is why
    // a centered crystal could appear with two blank screens. Visibility is
    // now determined directly from the camera-tour stage, independent of FX.
    const tourStage = stageAt(p);
    const visibleStationId = tourStage.intro ? null : TOUR_ORDER[tourStage.index];
    const tabReveal = tourStage.intro ? 0 : ease((tourStage.local - 0.10) / 0.24);
    let updating = false;
    let spinning = false;
    stations.forEach((station, index) => {
      const want = weights[index];
      const next = station.weight + (want - station.weight) * (1 - Math.exp(-10 * dt));
      station.weight = Math.abs(next - want) < 0.006 ? want : next;
      if (Math.abs(station.weight - want) > 0.006) updating = true;
      const w = station.weight;
      if (station.root) station.root.position.y = station.crystalY + 0.045 * w;

      // IMPORTANT: preserve Blender's tilted ring quaternion, then precess around Y.
      // Rotation occurs ONLY at an active / approached crystal, never all nine.
      for (const ring of station.orbitObjects) {
        if (!ring) continue;
        if (w > 0.12 && !motionOff) {
          ring.angle += ring.speed * dt * w;
          spinning = true;
        }
        ring.spin.setFromAxisAngle(Y_AXIS, ring.angle);
        ring.obj.quaternion.copy(ring.spin).multiply(ring.base);
      }

      for (const x of station.surfaces) {
        x.mat.emissive.copy(x.baseColor).lerp(station.color, 0.60 * w);
        x.mat.emissiveIntensity = x.baseIntensity + 0.70 * w;
      }
      for (const tab of station.tabs) {
        // No reliance on the crystal's delayed ring activation. A visited
        // station reveals its text regardless of orbit animation or FPS.
        const opacity = DEBUG_TABS ? 1 : (visibleStationId === STATIONS[index].id ? tabReveal : 0);
        tab.mesh.visible = opacity > 0.01;
        tab.material.opacity = opacity;
      }
    });
    active.current = spinning || updating;
    if (updating && !spinning) state.invalidate();
  });

  return <group position={[0, 0, CHAMBER_CENTER_Z]} rotation={[0, Math.PI, 0]}>
    <primitive object={room}/>
  </group>;
}

function SceneLighting() { return <>
  <color attach="background" args={['#050913']}/>
  <ambientLight intensity={1.32}/>
  <hemisphereLight args={['#b0d5ff', '#182037', 0.82]}/>
  <directionalLight position={[0, 7, 5]} intensity={1.25} color="#d8eaff"/>
  <pointLight position={[0, 3, -10]} color="#4ac5ee" intensity={4.8} distance={11}/>
</>; }
function RenderBridge({ requestRenderRef }) {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => {
    requestRenderRef.current = () => invalidate(); invalidate();
    return () => { requestRenderRef.current = null; };
  }, [invalidate, requestRenderRef]);
  return null;
}
export default function Scene({ progressRef, requestRenderRef, onRoomLoaded }) {
  return <Canvas frameloop="demand" dpr={1.5}
    camera={{ position: [0, 1.78, 4.35], fov: 64, near: .07, far: 75 }}
    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    style={{ width: '100%', height: '100%' }}>
    <RenderBridge requestRenderRef={requestRenderRef}/>
    <CameraTour progressRef={progressRef}/>
    <SceneLighting/>
    <Suspense fallback={null}><Corridor progressRef={progressRef}/></Suspense>
    <Suspense fallback={null}><Nexus9 progressRef={progressRef} onLoaded={onRoomLoaded}/></Suspense>
    <MorphJourney progressRef={progressRef}/>
  </Canvas>;
}
useGLTF.preload(CORRIDOR_URL);
useGLTF.preload(ROOM_URL);
