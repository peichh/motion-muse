---
name: motion-muse
description: One-call video editing skill that combines Video Shotcraft, the Remotion skills, the guanmo-ai awesome-ai-motion gallery and the gongnyang motion effect library to make motion-rich videos with Thai text, beat-synced cuts, royalty-free music and SFX, rendered locally with Remotion, acts as a code-first universal video director (natural-language brief → capability router → storyboard → stickman/vector characters, 2.5D parallax, procedural 3D with @remotion/three, scientific diagrams, cinematic light/atmosphere, product ads, scene-level cached renders; no AI video generators, no Blender), edits real footage (shot detection, beat-synced auto cut, speed ramps, vertical reframe, colour match, Thai captions from speech), with a transition library and pro editing rules so clips do not look AI-made. Checks and installs its own dependencies. ElevenLabs voice/music only after asking the user first.
---

# Motion Muse (Shotcraft + Remotion + awesome-ai-motion)

Use for any request to make, edit or remix a video, reel, promo, lyric video, explainer, cartoon, 3D scene, product ad or motion clip. Everything is made with code (React/SVG/CSS/Canvas/Three.js in Remotion + FFmpeg). Never use AI video generators or text/image-to-video APIs, and never require Blender; user or licensed images, fonts, models and audio are fine.
Works on any machine with bash (Linux, macOS, WSL/Git Bash). `SKILL_DIR` below means the folder that contains this file. If you do not know it:
`SKILL_DIR=$(dirname "$(find /opt/.devin ~/.claude ~/.agents ~ -path '*motion-muse/scripts/setup.sh' 2>/dev/null | head -1)")/..`

## 0. Setup check (run every time, before anything else)

```bash
bash "$SKILL_DIR/scripts/setup.sh"          # installs into ~/skills; set SKILLS_DIR=... to change
export SKILLS_DIR="${SKILLS_DIR:-$HOME/skills}"
```
The script checks each item, installs only what is missing, and prints `OK` / `NEW` / `FAIL` / `MISSING` per line. It ends with `READY` when everything is there.
- `MISSING: ffmpeg` or `node`: install it with the command the script prints (needs admin rights; ask the user if you cannot).
- `FAIL` on a clone or download: check the network and re-run. The script is safe to re-run.
- Do not start the video until it prints `READY`. Tell the user what was installed.

| Dependency | Installed to | Source | Used for |
|---|---|---|---|
| Video Shotcraft | `$SKILLS_DIR/video-shotcraft` | https://github.com/dell0721/skill- | Workflow, 152 shot cards, React components, 5 BGM + 149 SFX, beat-sync and final-review rules |
| Remotion skills | `$SKILLS_DIR/remotion-skills` | https://github.com/remotion-dev/skills | Remotion how-to (`skills/remotion-best-practices/SKILL.md` is the router) |
| awesome-ai-motion gallery | `$SKILLS_DIR/awesome-ai-motion` | https://github.com/guanmo-ai/awesome-ai-motion | 2,129 AI motion works with summaries, covers and prompts (ideas) |
| AI Motion effect library | `$SKILLS_DIR/motion-cards` | https://github.com/gongnyang/awesome-ai-motion | 637 effect cards with timing/easing, 128 rendered HTML clips, 11 scene recipes |
| Prompt Thai font | `$SKILLS_DIR/fonts/prompt/` | Google Fonts (OFL) | Thai text; most machines have no good Thai font |
| Remotion + headless Chrome | `$SKILLS_DIR/video-shotcraft/template/node_modules` | npm | Rendering. Symlink into projects instead of reinstalling |
| git, Node.js ≥ 20, ffmpeg, curl | system | — | Required tools. `jq` and `librosa` are optional |

Files that ship with this skill:
- `scripts/setup.sh`: dependency check and install
- `scripts/synth-sfx.sh <dir>`: makes whoosh, pop, hit, riser, tick and sparkle SFX with ffmpeg only (no license needed)
- `scripts/beat-grid.py <song>`: BPM, first-beat offset and loudness per 2 s, without librosa
- `references/sound-sources.md`: where to get royalty-free music and SFX, the license of each, and how to make your own sound
- `references/motion-sources.md`: where to get effects and techniques, their licenses, and gallery search commands
- `references/editing-craft.md`: which transition to use for which scene change, pacing, and the anti-"AI look" checklist
- `starter/src/transitions.tsx`: `Timeline` with 12 ready transitions (whip, push, zoom, iris, wipe, slices, flash, glitch, leak, focus, smash, cut) + auto SFX, `Grain`, `Drift`
- `references/footage-editing.md`: editing real footage: shot choice, rhythm, speed ramps, reframing, colour, talking heads, Thai captions, audio mix, footage checklist
- `scripts/find-footage.py`: free Mixkit b-roll search/download (credits + no reuse)
- `scripts/footage-scan.py`: proxies, shot detection, motion/pan/shake/focus per shot, shot scores, colour match, contact sheets → `footage.json`
- `scripts/transcribe.py`: local faster-whisper speech → word-timed Thai captions + speech ranges + SRT
- `scripts/auto-edit.py`: beat-synced first cut (montage, talking head, or voice-over) → `public/edit.json` + `edit.md` seam plan
- `starter/src/footage.tsx`: `FootageReel` composition (renders `edit.json`), `Clip` (reframe, speed ramp, colour look, punch-in), `Captions`, `FootageTitle`, `duck()`
- `starter/src/`: working 9:16 Thai examples: `MotionReel` (5 techniques, beat-synced) and `TransitionsDemo` (every transition)

## 1. Brief (one question at most)

Need: topic and Thai copy, footage or screenshots, music, aspect ratio and length.
Ask once for whatever is missing, with clickable defaults (e.g. "9:16 15 s", "16:9 30 s", "you decide").
If the user says to just make it ("ทำเลย"), choose defaults and keep going.

- Product or website promo: follow Shotcraft's mode selection (template / autonomous / co-creation) in its SKILL.md.
- General reel, lyric video or motion demo: work on your own without the mode question.

## 1b. Director mode (any brief that is not just footage)

Read `references/director.md`. In short:
```bash
python3 "$SKILL_DIR/scripts/director.py" route "<brief>"                       # capabilities → smallest toolset
python3 "$SKILL_DIR/scripts/director.py" init ~/videos/<slug> --caps <caps>    # starter + only the packages those caps need
python3 "$SKILL_DIR/scripts/director.py" check src/<slug>/storyboard.json      # scene table to show the user
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json   # per-scene cached render + mix + QA
```
- Building blocks in `starter/src/lib/`: `characters` + `pose` (stickman / vector characters, gaits, key poses), `diagram`, `parallax`, `atmosphere`, `typography` (Thai font registry + kinetic text), `noise`; `starter/kits/three/three.tsx` for 3D (copied by `init --caps 3d`), `starter/kits/three/toon.tsx` for cel-shaded 3D cartoon characters and sets (`--caps toon`), `story.tsx` for dialogue subtitles, SFX and music on one timeline.
- Cartoon story episodes (skits, ตลกร้าย, ซอมบี้ไปทำบัตร, 30 s – 3 min, 9:16): read `references/toon-story.md`. Write `script.json`, run `scripts/story.py build`, then render. No voice-over unless the user asks: dialogue is Thai subtitles with name tags and the mouths move while each line is on screen.
- To edit the result in OpenFilm Studio (tracks for every shot, SFX and the music, editable captions): `references/openfilm.md`, `scripts/story.py openfilm`.
- Worked examples to copy from: `examples/zombie-biology` (SVG cartoon explainer), `examples/apocalypse-observer` (3D horror, third-person camera), `examples/luxury-product` (3D product ad, Thai sans), `examples/zombie-id` (toon story: zombie goes to get an ID card, 8 shots, 52 s, subtitles + SFX + music, no voice).
- Pick the Thai font by mood (`director.md` section 4) and fetch it with `scripts/thai-fonts.sh`.
- Steps 2–7 below still apply: gallery references, seam plan and transitions, fresh music, SFX, QA, delivery.

## 2. Pick techniques

Read `references/motion-sources.md`, then:
1. Search the gallery for references in the right category and look at the cover images to judge the style. Take the motion idea, timing and structure only. Never copy the source footage, covers, characters or brand assets; they belong to their authors.
2. Look up the matching effect in `motion-cards` for timing and easing values.
3. Build it from the matching Shotcraft shot card (`references/shots/<category>/*.md`). Read the whole card and the demo TSX it points to, and keep any "known pitfall" parameters.
4. Plan one main motion per shot, cut only on beats, and hold the end card for at least 1 s.
5. Read `references/editing-craft.md` and write the seam plan table: for every cut, the relation between the two shots, the transition kind and why. Use hard cuts for most seams and 4–6 different designed transitions; prefer match cuts when two shots share a shape or color. The 12 kinds in `transitions.tsx` are only a base set: design 2–4 custom seams from this video's content for the most important cuts (guide section 2b).

## 3. Build the Remotion project

```bash
P=~/videos/<slug>; T="$SKILLS_DIR/video-shotcraft/template"
mkdir -p $P/public/fonts $P/public/audio $P/out && cd $P
cp $T/package.json $T/tsconfig.json $T/remotion.config.ts . && ln -sfn $T/node_modules node_modules
cp -r "$SKILL_DIR/starter/src" . && cp "$SKILLS_DIR"/fonts/prompt/*.ttf public/fonts/
while read -r a; do cp "$SKILLS_DIR/video-shotcraft/assets/audio/$a" public/audio/; done < "$SKILL_DIR/starter/audio.txt"
npx remotion render src/index.ts MotionReel out/starter.mp4   # optional: proves the setup works
```
`starter/src/theme.ts` already loads Prompt with `delayRender` + `FontFace`, has the bright palette and the beat helpers `BEAT` / `b(k)`. Change `BPM` for your track. `starter/src/Reel.tsx` shows each technique; replace its scenes with yours.
Join scenes with `Timeline` from `starter/src/transitions.tsx` (it places the transition SFX too), and put `<Grain />` on top:
```tsx
<Timeline scenes={[{ dur: b(4), el: <Hook />, out: { kind: 'smash' } }, { dur: b(3), el: <Feature />, out: { kind: 'whip', dir: -1 } }, { dur: b(5), el: <End /> }]} />
<Grain opacity={0.07} />
```
Wrap still layouts in `<Drift dur={...}>` so no shot is frozen.

- Per-character Thai animation: split with `Intl.Segmenter('th', { granularity: 'grapheme' })` so vowels and tone marks stay on their letter.
- Thai text needs `lineHeight` ≥ 1.3 or upper vowels get clipped. Check big words fit the frame width.
- Rendering must be deterministic: no `Math.random` / `Date.now`; use seeded random.
- Default to a light, bright palette unless the brief or brand says otherwise.
- Audio: `<Audio src={staticFile('audio/x.mp3')} trimBefore={frames} volume={...} />`; SFX go in `<Sequence from={b(k)}>`.

## 3b. Footage (when the user sends video, or the video needs b-roll)

Read `references/footage-editing.md` and follow its pipeline. In short:
```bash
python3 "$SKILL_DIR/scripts/find-footage.py" <keywords> --orientation vertical   # only if footage is missing; then --get <ids> --dir footage-raw
python3 "$SKILL_DIR/scripts/footage-scan.py" <user files or footage-raw/> [--stabilize]   # proxies + footage.json + out/sheets/*.jpg
python3 "$SKILL_DIR/scripts/transcribe.py" --footage footage.json                     # if any clip has speech (pip install faster-whisper)
python3 "$SKILL_DIR/scripts/auto-edit.py" footage.json --music audio/bgm.mp3 --length 20 --look warm   # or --mode talk / --vo audio/vo.mp3
npx remotion render src/index.ts FootageReel out/video.mp4 --timeout=120000
```
- Look at every contact sheet before cutting, and read `edit.md`. The draft is a starting point: swap weak shots, add Thai `titles`, design 2–4 custom seams, and fix the captions by hand.
- Edit the proxies in `public/footage/`, never the originals (VFR/HEVC phone video drifts out of sync).
- Slow motion only on 50 fps+ sources; at most one or two speed ramps per video; one colour look per video.
- Only use footage the user owns or has the rights to; stock clips go into CREDITS.md.

## 4. Music, SFX and beat sync

Read `references/sound-sources.md`.

**Music (BGM): find a new track for every video.** Do not reuse a track from an earlier video, and do not use Shotcraft's 5 bundled BGM tracks or the starter's `house-vibez.mp3` unless the user asks. Everyone who installs this skill has those tracks, so videos made with them sound the same.
1. If the user sent a track, use it and skip the rest.
2. Write 3 English keywords for the music from the brief: mood, genre and topic (use the mood table in `sound-sources.md` section 2b), plus the BPM range.
3. Search: `python3 "$SKILL_DIR/scripts/find-music.py" <keyword1> <keyword2> <keyword3>`. It lists unused Mixkit tracks with their tags, and skips tracks used before on this machine and Shotcraft's bundled tracks.
4. Pick 2–3 candidates whose tags match the brief. Check each one with `beat-grid.py`: is the BPM in range, is it at least as long as the video, and is there a phrase start where the hook can sit?
5. Download the best one: `python3 "$SKILL_DIR/scripts/find-music.py" --get <id> --title "<title>" --out public/audio/bgm.mp3`. This writes `CREDITS.md` and marks the track as used.
6. If Mixkit has nothing that fits, use another source from `sound-sources.md` (Pixabay Music, YouTube Audio Library, Incompetech, FMA, Uppbeat). Open the page in the browser, check the license, download the track, and add it to `CREDITS.md` and the used-music log yourself.
7. Tell the user which track you picked and why it fits, so they can ask for another one.

**SFX:** Shotcraft's bundled SFX (`assets/audio/sfx/`, license in `assets/audio/ATTRIBUTION.md`; read `references/sound-design.md`) are fine to reuse. You can also use free SFX sources from `sound-sources.md`, or make your own with `bash "$SKILL_DIR/scripts/synth-sfx.sh" public/audio/synth`.

ElevenLabs only after asking (section 5).

Write every outside file into `public/audio/CREDITS.md` (title, URL, license, date) when you download it, and put the needed credit lines in the delivery message.

Beat sync: follow Shotcraft's `references/music-beat-sync.md`. Run `python3 "$SKILL_DIR/scripts/beat-grid.py" song.mp3 --fps 30` (or librosa if installed) to get the BPM and first-beat offset, start the music on a phrase boundary, and keep each cut within 3 frames of a beat.

## 5. ElevenLabs (always ask first)

Never call ElevenLabs without asking. Ask first, e.g. "ใส่เสียงพากย์/เพลงจาก ElevenLabs ไหม (มีค่าใช้จ่าย API)" with options "ใส่เสียงพากย์ไทย", "ใส่เพลง/เสียงเอฟเฟกต์", "ไม่ใส่".
Only after a yes for this video: use the user's `ELEVENLABS_API_KEY` from their secret store or environment (never print it or write it to a file), read the official API docs (https://elevenlabs.io/docs), generate the audio and save it into `public/audio/`.
Tell the user that commercial use depends on their ElevenLabs plan. If the answer is no or there is no answer, use sources 1–4 above.

## 6. Render and QA

```bash
npx tsc --noEmit -p .
npx remotion render src/index.ts <CompositionId> out/video.mp4
ffmpeg -loglevel error -y -i out/video.mp4 -vf "select='not(mod(n\,40))',scale=270:-1,tile=6x2" -frames:v 1 out/sheet.jpg
ffmpeg -i out/video.mp4 -af volumedetect -f null - 2>&1 | grep -E "mean|max"
```
Run the checklist in `references/editing-craft.md` section 6 (and section 9 of `footage-editing.md` for footage). Look at `out/sheet.jpg` and single frames around each cut. Fix clipping, overflow, leftover text and unreadable Thai, then render again.
Check that an audio stream exists and max volume is not above 0 dB.
For full promos, run Shotcraft's independent final review (`references/final-review.md`).
If the video has BGM, also offer a version with SFX only.

## 7. Deliver

Send `out/video.mp4` to the user (as an attachment if you work on a remote machine).
Include a short Thai table of time range → technique, the credit lines from `CREDITS.md`, and ask what to change.
After a full promo, offer once a CapCut/JianYing project export (`references/jianying-export.md` in Shotcraft).

## Licenses to mention when sharing

- This skill's own files: MIT. Shotcraft: Apache-2.0. awesome-ai-motion and motion-cards repo code: MIT; gallery works belong to their authors.
- Remotion is free for individuals and companies with up to 3 employees; larger companies need a license (https://www.remotion.dev/license).
- Prompt font: SIL OFL 1.1.
