# Toon stories: voiced or voiceless cartoon episodes (9:16, 30 s – 3 min)

For briefs like "คลิปการ์ตูน 3D เล่าเรื่อง ตลกร้าย ซอมบี้ไปทำบัตร": cel-shaded characters with ink outlines, a few sets,
dialogue as Thai subtitles with name tags, music and SFX. Characters are code (`lib/toon.tsx`), so they look the same
in every shot and from every angle. No AI image or video generators, no Blender.

## Setup

```bash
python3 "$SKILL_DIR/scripts/director.py" init ~/videos/<slug> --caps toon,thai-type,atmosphere
```

`toon` installs the 3D packages and copies `lib/three.tsx` + `lib/toon.tsx`; `lib/story.tsx` is always there.

## 1. Write the script: `src/<slug>/script.json`

```json
{ "title": "...", "comp": "ZombieId", "fps": 30, "width": 1080, "height": 1920, "cps": 10,
  "cast": { "zombie": { "name": "ซอมบี้", "color": "#B8E64C" }, "clerk": { "name": "เจ้าหน้าที่", "color": "#C9B3F0" } },
  "music": [ { "file": "audio/bgm.mp3", "from": 0, "volume": 0.2 } ],
  "scenes": [
    { "id": "rise", "shot": "Moonlit graveyard, low angle: the zombie climbs out", "lead": 1.6, "pad": 0.4,
      "sfx": [ { "file": "audio/sfx/gravel-fall-hit.mp3", "at": 0.3 } ],
      "lines": [ { "who": "zombie", "text": "ตื่นมาวันแรกหลังตาย..." } ] } ] }
```

- One scene = one shot (one camera set-up). 6–12 scenes per minute. Hook in the first 2 s, a title card by 8 s, a
  punchline at the end and a beat after it.
- `lead` / `pad`: seconds of action before the first line / after the last. `min`: shortest scene. `hold`: extra
  seconds on a line, `gap`: pause after it. `cps`: Thai characters per second the viewer reads (10 is comfortable).
- `sfx`: `at` is seconds from the scene start (scene) or from the line start (line). Files are under `public/`.
  SFX: Shotcraft's `assets/audio/sfx/*` or `scripts/synth-sfx.sh`. Music: a fresh track via `find-music.py` (SKILL.md §4).
- No voice-over by default. Voice (ElevenLabs or a recording) only if the user asks; then give each line a `file`
  and an `env` (mouth envelope per frame) in timeline.json and the mouths follow it.

```bash
python3 "$SKILL_DIR/scripts/story.py" build ~/videos/<slug> src/<slug>/script.json
```

It times every line from its length, places every SFX and music cue in frames, and writes beside the script:
`timeline.json` (what the composition reads), `storyboard.json` (what `director.py render` reads) and `<comp>.vtt`.
Change the script, run `build` again: everything moves together.

## 2. The composition

```tsx
import timeline from './timeline.json';
const T = timeline as StoryTimeline;
// one <Sequence> per scene, from T.scenes; inside, a shot component gets f (scene frame) and abs (film frame)
<ToonCharacter look={LOOKS.zombie} pose={breathe(pose('zombie'), abs)} position={[1.2, 0, -0.85]} yaw={Math.PI - 0.75}
  face={{ mouth: mouthOf(T, 'zombie', abs), blink: blinkAt(abs, 2), brow: 'sad', gaze: [0.3, 0] }} />
<Subtitles tl={T} family={font} show={subs} names={script.cast} />
<StoryAudio tl={T} />
```

Register it with `defaultProps={{ subs: true }}` and `durationInFrames={T.total}`. Full example:
`examples/zombie-id/` (8 shots, 52 s).

### Characters (`lib/toon.tsx`)

- Presets in `LOOKS`: `zombie`, `clerk`, `aunty`, `guard`, `kid`. A new character is a preset with changes:
  `look('zombie', { shirt: '#B04A3A', hair: 'bald', iris: '#F2C14E' })`. Keep each character's look in one const
  and reuse it in every shot: that is what keeps them consistent.
- Parts: head size `head`, `build`, `height`, `hair` (`strands`, `cap`, `bun`, `spiky`, `bald`, `police`), `eyes`
  (`bulge` or `dot`), `glasses`, `tie`, `badge`, `bandage`, `teeth`, `torn` clothes, `nose`, `sleeves`.
- `pose` is `lib/pose` (`pose('think')`, `posesAt`, `gait(f / 26, 'shamble')`, `breathe`). `yaw` turns the whole
  body a full 360°; `headYaw` (degrees) turns the head. `handR` / `handL` hold a prop (e.g. a `<Sign>` card).
- `face`: `mouth` 0–1 (`mouthOf` gives it from the timeline: the voice envelope, or a talking wobble while the line
  is on screen), `blink` (`blinkAt`), `brow` (`neutral`, `angry`, `sad`, `up`), `gaze` [x, y], `smile`.

### Sets, signs, light

- `Graveyard`, `OpenGrave`, `Office` (with `sign` and `queue` boards), `Shop`, `Street`, `Floor` for a plain "dream"
  space. Build new sets from `Part` + `rbox`/`sphere`/`cyl`/`capsule`/`cone`/`tube` with `toon(color)` materials.
- `Sign` draws Thai text on a board (waits for the font; call `useThaiFont` in the composition).
- `<Stage3D tone="none">` keeps cartoon colours flat and bright; light with `ToonLights` (key + sky/ground fill).

### Camera

- `orbit(center, radius, height, angleDeg)` for any angle; animate `angleDeg` 0→360 for a turnaround.
- 9:16 frames are narrow (horizontal field ≈ 24° at `fov` 40): a two-shot needs ~5–6 m, a wide shot ~8–9 m.
- Two people talking across a counter: cheat both bodies ~35–45° towards the camera (`yaw`) so both faces read.
- Keep the speaker's face in the upper two thirds; the subtitles sit at the bottom 25 %.

## 3. Render and check

```bash
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json   # scene cache, --gl=swangle
python3 "$SKILL_DIR/scripts/director.py" qa out/<Comp>.mp4
```

Look at a still of every scene before the full render (`npx remotion still ... --frame=<n> --gl=swangle`).
Without a GPU, expect about 30 s of render per second of film.

## 4. Edit it in OpenFilm (optional)

To hand the episode to OpenFilm Studio, where each shot, line, SFX and the music are clips the person can trim and move:
`references/openfilm.md`.
