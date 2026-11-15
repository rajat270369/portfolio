# RAJAT // ENTER THE CODE — v0.1

A scroll-controlled React + Three.js prototype. It creates the first interaction: your 3D chibi character turns, walks toward a door, reaches for it, the door swings open, and the character steps through. Scroll backward to reverse the sequence.

## Before running

1. Export your **existing** chibi avatar as `Rajat_Chibi.glb` in Blender. Your Blender script usually created it at `~/RajatChibiSlim/Rajat_Chibi.glb` or `~/RajatChibi/Rajat_Chibi.glb`.
2. Copy that **GLB file** into **`public/models/Rajat_Chibi.glb`**. Case and spelling matter.
   - Do NOT copy the `.blend` file.
   - A stand-in character appears if the GLB isn't there yet.
3. From this folder, open a terminal:

```bash
npm install
npm run dev
```

Open the local URL displayed by Vite (usually http://localhost:5173). Scroll down with the wheel/trackpad; the scene remains pinned while the animation progresses.

## Folder structure

```
public/models/Rajat_Chibi.glb    <-- copy this from your Blender export
src/App.jsx                     <-- page, text, GSAP ScrollTrigger
src/Scene.jsx                   <-- Three.js avatar, door, lighting
src/styles.css                  <-- visual styling
```

## Expected scenes

- 0–20%: avatar stands and turns
- 20–51%: walks toward door
- 51–61%: reaches for handle
- 61–84%: door opens, project title appears
- 84–100%: avatar moves through the doorway

These are approximate phases and are easy to adjust in `src/Scene.jsx` and `src/App.jsx`.

## Known limitations

- The environment and door are **temporary meshes**. We can replace them with elaborate Blender GLBs after the interaction works.
- The user-supplied avatar GLB isn't included: it has to come from your machine.
- Animation track names must match `Idle`, `Walk`, `ReachDoor`, and `StepThrough`. The browser devtools console prints all discovered clip names.
- This prototype demonstrates scroll motion; it isn't yet a finished multi-project portfolio.
- The door reaching pose may not match the doorknob exactly yet. We'll tune that after viewing your character in the scene.
- A desktop view is the priority for the prototype; mobile layout is prepared but may need camera composition work.

## Troubleshooting

**Placeholder character instead of avatar:** Check the exact path/name `public/models/Rajat_Chibi.glb`, refresh the browser, then inspect DevTools Network for requests to `/models/Rajat_Chibi.glb`.

**Avatar appears static / limbs don't move:** The GLB might have no included actions. Open the browser console to inspect `Avatar animation clips:`. If they're missing, export the armature/actions in Blender again.

**Avatar faces wrong way:** In `src/Scene.jsx`, adjust `rotationY` in `characterPosition(p)`; the script assumes the Blender character faced `-Y` before glTF axis conversion, i.e. toward the viewer in Three.js.

**Model too small/large:** Add a `scale` prop to the `group` in `Avatar` near the return statement (e.g. `<group ref={group} scale={0.9}>`).

**If the GLB reports a load error:** Check model export/size and path. Only export the rig and character mesh (not the Blender studio camera/platform).

## For the competition

Replace project text with factual details and add working GitHub/demo links. Later optimize GLBs and include a reduced-motion skip path, mobile tests and accessibility validation. This prototype is NOT a final submission.
