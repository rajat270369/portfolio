import { STATIONS, CHAMBER_CENTER_Z } from './stations.js';
import { sampleIntroCamera } from './introMotion.js';

// Entry + guided camera route, no avatar and no simulated footsteps.
// Crystal order follows the circular room, avoiding diagonal jumps through
// the central reactor. Station identity/physical positions are NOT changed.
export const INTRO_END = 0.29;
export const APPROACH_FRACTION = 0.67;
export const TOUR_ORDER = Object.freeze([1, 2, 3, 5, 7, 9, 8, 6, 4]);
const ORBIT_RADIUS = 3.75;
const CAMERA_HEIGHT = 2.12;
const INITIAL_EYE = [0, 3.25, CHAMBER_CENTER_Z + ORBIT_RADIUS];
const INITIAL_LOOK = [0, 1.65, CHAMBER_CENTER_Z];
const ease = t => { const x = Math.max(0, Math.min(1, t)); return x*x*(3-2*x); };
export const clamp01 = x => Math.max(0, Math.min(1, Number(x) || 0));
const mix = (a,b,t) => a + (b-a)*t;
const mixVec = (a,b,t) => a.map((v,i) => mix(v,b[i],t));

// The camera is at eye-level through the corridor, then lifts slightly to
// orient the visitor inside the room. It NEVER goes above the sealed roof.
const ENTRANCE_KEYS = [
  { at:0,    eye:[0,1.78,4.35],  look:[0,1.65,-1.20] },
  { at:.19,  eye:[0,1.78,3.45],  look:[0,1.69,-2.70] },
  { at:.39,  eye:[0,1.81,1.58],  look:[0,1.73,-4.65] },
  { at:.59,  eye:[0,1.88,-1.25], look:[0,1.76,-6.70] },
  { at:.77,  eye:[0,1.96,-4.02], look:[0,1.78,-9.15] },
  { at:.90,  eye:[0,2.48,-6.47], look:[0,1.72,-11.14] },
  { at:1,    eye:INITIAL_EYE,   look:INITIAL_LOOK },
];

const byId = new Map(STATIONS.map(s => [s.id, s]));
function stationAngle(id) {
  const station = byId.get(id);
  return Math.atan2(station.world[1]-CHAMBER_CENTER_Z, station.world[0]);
}
function shortestArc(from, to) {
  return Math.atan2(Math.sin(to-from), Math.cos(to-from));
}
function eyeAtAngle(angle, height=CAMERA_HEIGHT) {
  return [ORBIT_RADIUS*Math.cos(angle), height,
    CHAMBER_CENTER_Z + ORBIT_RADIUS*Math.sin(angle)];
}
function lookAtStation(id) {
  const s = byId.get(id);
  return [s.world[0], 1.70, s.world[1]];
}

export function stageAt(progress) {
  const p=clamp01(progress);
  if (p < INTRO_END) return {intro:true,index:-1,local:0};
  const fraction=clamp01((p-INTRO_END)/(1-INTRO_END));
  if (fraction >= 1) return {intro:false,index:8,local:1};
  const position = fraction * TOUR_ORDER.length;
  const index = Math.min(8,Math.floor(position));
  return {intro:false,index,local:position-index};
}

export function cameraPoseAt(progress) {
  const stage=stageAt(progress);
  if (stage.intro) {
    const pose=sampleIntroCamera(ENTRANCE_KEYS,clamp01(progress/INTRO_END));
    return {...pose,fov:64};
  }
  const {index,local}=stage;
  const destinationId=TOUR_ORDER[index];
  const originId=index===0?null:TOUR_ORDER[index-1];
  const a0=originId===null?Math.PI/2:stationAngle(originId);
  const a1=stationAngle(destinationId);
  const travel=ease(local/APPROACH_FRACTION);
  const angle=a0+shortestArc(a0,a1)*travel;
  const height=mix(index===0?INITIAL_EYE[1]:CAMERA_HEIGHT,CAMERA_HEIGHT,travel);
  const eye=eyeAtAngle(angle,height);
  // A steady gaze, then a deliberate turn toward the next crystal.
  const fromLook=originId===null?INITIAL_LOOK:lookAtStation(originId);
  const toLook=lookAtStation(destinationId);
  const look=mixVec(fromLook,toLook,ease(local/Math.min(APPROACH_FRACTION,0.7)));
  return {eye,look,fov:mix(64,57,ease((clamp01(progress)-INTRO_END)*8))};
}

// Only the focused crystal activates. The previous one eases down as the
// camera departs; the next one eases up as the camera arrives.
export function crystalActivationAt(progress) {
  const weights=Array(9).fill(0);
  const stage=stageAt(progress);
  if (stage.intro) return weights;
  const {index,local}=stage;
  const current=TOUR_ORDER[index];
  weights[current-1]=ease((local-0.53)/0.28);
  if (index>0) {
    const previous=TOUR_ORDER[index-1];
    weights[previous-1]=1-ease(local/0.19);
  }
  return weights;
}

// Reflect the actual focused model, not the one closest to the camera during
// intermediate travel. Safe to call from scroll updates and normal rendering.
export function activeStationAt(progress) {
  const weights=crystalActivationAt(progress);
  let max=0, id=null;
  for (let i=0;i<weights.length;i++) if (weights[i]>.74 && weights[i]>max) {
    max=weights[i];id=i+1;
  }
  return id;
}

export function overviewLabel(progress) {
  const stage=stageAt(progress);
  if (stage.intro) return 'ACCESSING NEXUS-9';
  const toId=TOUR_ORDER[stage.index];
  const station=byId.get(toId);
  return stage.local < .62 ? `APPROACHING // ${station.crystal.toUpperCase()}`
    : `${String(station.id).padStart(2,'0')} // ${station.name.toUpperCase()}`;
}
