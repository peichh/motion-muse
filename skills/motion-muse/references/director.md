# Universal Video Director (code-first)

Motion Muse turns a plain-language brief ("what the video is, style, mood, typography, story") into a finished MP4 using only code: React/SVG/CSS/Canvas/Three.js inside Remotion, assembled with FFmpeg.

**Never** use AI video generators, text-to-video or image-to-video APIs, and never require Blender. User-supplied or licensed images, fonts, 3D models (.glb), Lottie files and audio are fine.

## 1. Read the brief → creative plan

Pull these out of the brief (ask one question at most, only if the subject is unclear):

| Field | Example |
|---|---|
| Subject / message | "how zombie biology works" |
| Format | 9:16 social (default 1080x1920), 16:9 cinematic, 1:1 |
| Length | default 15–25 s |
| Visual style | stickman cartoon, flat vector, 2.5D paper cut-out, stylized low-poly 3D, premium product, diagram |
| Atmosphere | playful, eerie, calm, luxurious, energetic |
| Typography | Thai font by mood (section 4) |
| Story shape | explainer: hook → 3 facts → takeaway; horror: calm → unease → reveal; ad: reveal → detail → benefit → packshot/CTA |

## 2. Route capabilities → smallest toolset

```bash
python3 "$SKILL_DIR/scripts/director.py" route "<the brief>"          # prints capabilities, tech, npm to install
python3 "$SKILL_DIR/scripts/director.py" init ~/videos/<slug> --caps 3d,atmosphere,thai-type
```

`init` copies the starter (all 2D libs are plain React/SVG, no installs) and installs extra packages **only** for the capabilities that need them. Each scene can use different tech.

| Capability | Use | Packages | Pick when |
|---|---|---|---|
| `thai-type` | `lib/typography` | none | always |
| `character-2d` | `lib/characters` + `lib/pose` (Stickman, VectorCharacter, gaits, key poses, blink, talk) | none | cartoons, mascots, explainers |
| `diagram` | `lib/diagram` (Draw, Arrow, Callout, Flow, Ecg, Blob, Virus, GridPaper) | none | science, education, how-it-works |
| `parallax` | `lib/parallax` (Parallax/Layer depth, Sky, Ridge, Skyline, FogBand, Stars) | none | 2.5D worlds, side-scrollers, storybook |
| `atmosphere` | `lib/atmosphere` (GodRays, Fog, Particles, LightSweep, Glow, Vignette, Letterbox, Scanlines, Grade) | none | any mood/lighting, works over 2D, 3D and footage |
| `3d` | `lib/three` (Stage3D, CameraRig, observer, Figure, RuinedCity, Lathe, StudioLights, RoomEnv) | `@remotion/three three @react-three/fiber` | real camera moves through space, products, environments |
| `product` | `Lathe` + `StudioLights` (3D) or CSS layers with a user photo (2D) | (3d) | ads, packshots |
| `data-viz` | d3 scales/shapes, rendered as React SVG | `d3` | charts, maps |
| `canvas` | Canvas 2D redrawn from the frame number | none | thousands of particles, generative textures |
| `gsap` | paused GSAP timeline, `tl.seek(frame / fps)` | `gsap` | only if porting existing GSAP work |
| `lottie` | `@remotion/lottie` | `@remotion/lottie lottie-web` | only user-supplied/licensed Lottie files |
| `footage` | `FootageReel` + footage pipeline | none | real video (see footage-editing.md) |

Prefer SVG/CSS first; reach for 3D only when the camera must move through depth or light must wrap around an object. Canvas only for very high element counts.

## 3. Storyboard → `storyboard.json`

Write a storyboard next to the composition (`src/<slug>/storyboard.json`) and check it:

```bash
python3 "$SKILL_DIR/scripts/director.py" check src/<slug>/storyboard.json   # validates + prints the scene table
```

```json
{ "title": "...", "comp": "MyComp", "fps": 30, "width": 1080, "height": 1920,
  "style": { "look": "...", "palette": ["#..."], "thaiFont": "Mali", "music": "..." },
  "scenes": [ { "id": "hook", "dur": 96, "caps": ["character-2d", "thai-type"], "shot": "...", "motion": "...", "text": "...", "out": "zoom" } ] }
```

Rules: every scene has a `motion` (real movement: characters walk, camera travels, things draw on; never a static slide with a fade), scene lengths vary, the composition reads `dur` from the storyboard so plan and render cannot drift. Show the scene table to the user with the plan.

## 4. Thai typography

`useThaiFont(name)` loads a family from `public/fonts` and returns the CSS family; fetch files with `bash "$SKILL_DIR/scripts/thai-fonts.sh" public/fonts "<Family>"...` (all SIL OFL). Pick by mood:

| Mood | Font |
|---|---|
| default / bright promo | Prompt |
| loud headline, sale, sport | Kanit (Black/ExtraBold) |
| minimalist luxury, tech, corporate | IBM Plex Sans Thai (Thin/ExtraLight titles), Anuphan |
| cartoon / kids explainer | Mali, Itim, Mitr |
| horror, documentary, editorial | Noto Serif Thai, Trirong |
| sci-fi / HUD | Chakra Petch, Bai Jamjuree |
| handwriting / food | Sriracha · invitation accents: Charm |

Text components: `Kinetic` (word or grapheme reveal, never splits vowels/tone marks), `MaskReveal`, `Tracking` (luxury letter-spacing settle), `Typewriter`. Line height ≥ 1.3, Thai titles ≤ ~12 graphemes per line at 90 px on 1080 wide.

## 5. Animation rules (all tech)

- Everything is a pure function of `useCurrentFrame()`. No `Math.random()` (use `lib/noise` `rand/noise1/fbm`), no CSS animations, no `useFrame()` in Three, no GSAP playback.
- Characters: use `gait(frame / cycle, kind)` and move the body at `strideLength(kind, legLen) / cycle` per frame so feet do not slide; blend key poses with `posesAt`.
- Camera: always moving a little (dolly, orbit, handheld `shake`); third person = `observer()` (lagged follow, deterministic).
- Light: one motivated key light, rim to separate the subject, fog lighter than silhouettes; `flicker()` for practicals.
- Keep the existing editing rules: seam plan, transitions from `transitions.tsx` + 2–4 custom ones at key moments, beat-synced cuts, fresh music per video (find-music.py), SFX on transitions.

## 6. Render scene by scene (cached) and QA

```bash
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json
```

- Renders each scene's frame range separately to `out/scenes/<Comp>/NN-id-<hash>.mp4`. The hash covers the scene's code (by default the whole composition folder; list a scene's own files in `"files": ["src/<slug>/Hook.tsx"]` to scope it), `src/lib`, `transitions.tsx`, and the storyboard entries of the scene and its neighbours (transitions overlap them). Put each scene in its own file and list it, and editing one scene re-renders only that scene. `--force` re-renders all.
- 3D scenes render with `--gl=swangle` automatically (software WebGL; `angle` fails on CPU-only machines). Override with `--gl` or `MOTION_MUSE_GL`.
- Audio is rendered once for the full timeline, then normalised (-14 LUFS, -1.5 dBTP) and muxed.
- QA prints per-scene motion score (flags static scenes), duration vs storyboard, loudness/true peak, black stretches, and writes a contact sheet. Look at the sheet and fix anything clipped, unreadable or static, then re-run (cached scenes are reused).

## Examples (copy into `src/` and register in `Root.tsx`)

| Example | Tech | Shows |
|---|---|---|
| `examples/zombie-biology` | SVG only | stickman + vector characters, gaits, diagrams, parallax race, Mali |
| `examples/apocalypse-observer` | `@remotion/three` | ruined procedural city, third-person observer camera, fog/ash, flicker, silhouettes, Noto Serif Thai |
| `examples/luxury-product` | `@remotion/three` | lathe-turned bottle, studio lighting, macro orbit, packshot, IBM Plex Sans Thai |
| `examples/zombie-id` | `@remotion/three` + `lib/toon` + `lib/story` | toon story: cel-shaded zombie and clerk, graveyard and office sets, Thai signs, 360° orbit, subtitles + SFX + music from `script.json`, no voice, Prompt (run `story.py build` on its `script.json` first) |

Copy with `cp -r "$SKILL_DIR/examples/<name>" src/` (they import `../lib/*` and `../transitions`), set `"resolveJsonModule": true` (done by `init`), and put the example's music at the path it expects or swap it for a new track.
