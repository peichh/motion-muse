# Motion Muse

(Previously named thai-motion-video. Old links redirect here.)

Agent skill that turns one request into a finished, motion-rich MP4 with Thai text. It is built on Video Shotcraft, Remotion and the guanmo-ai/awesome-ai-motion gallery, cuts on the beat, and uses free music. Its editing rules are there so clips do not look AI-made.

## What it does

| | |
|---|---|
| Sets itself up | Checks git, Node.js, ffmpeg and curl, then installs only what is missing: Shotcraft, Remotion, both motion libraries, the Prompt Thai font and headless Chrome |
| Plans the edit | Writes a seam plan before coding: where each cut is (on a beat), which transition it uses, and why |
| Transitions | 12 ready-made kinds (whip, push, zoom, iris, wipe, slices, flash, glitch, light leak, focus, smash, cut) with matching SFX. For the 2–4 key moments it designs custom transitions from the video's own content (match cuts, morphs, hidden cuts) |
| Avoids the "AI look" | Varies shot lengths, keeps every shot moving, uses springs and easing instead of linear motion, adds film grain, keeps text readable, and runs a 9-point checklist before delivery |
| Universal director | Describe the video (subject, style, mood, typography, story) and it plans a storyboard, routes each scene to the smallest code toolset (SVG, CSS, Canvas, d3, Three.js via `@remotion/three`, Lottie, GSAP, FFmpeg) and installs only what that needs. Built-in stickman and vector characters with walk/run/shamble gaits, scientific diagrams, 2.5D parallax, procedural 3D cities, products and a third-person observer camera, cinematic light, fog and particles. Renders scene by scene with a cache and QA. No AI video generators, no Blender |
| Edits your footage | Scans clips (shot changes, motion, camera direction, shake, subject position), scores every shot, makes a beat-synced first cut, reframes 16:9 to 9:16 on the subject, matches colour between clips, adds speed ramps, punch-ins and titles. Talking-head mode removes pauses, hides jump cuts and adds b-roll. Thai captions come from local speech-to-text (faster-whisper), and music ducks under the voice. No footage? It finds free b-roll |
| Thai typography | 15 OFL Thai fonts picked by mood (Prompt, Kanit, IBM Plex Sans Thai, Mali, Noto Serif Thai, …), animated per word or grapheme, so vowels and tone marks stay attached to their letters |
| Music | Finds a new free track that fits the content for every video (Mixkit via `find-music.py`, or Pixabay, YouTube Audio Library and others). Never reuses a track, and writes the credits for you |
| Sound effects | Shotcraft's 149 SFX, free SFX sites, or SFX it synthesizes itself with ffmpeg |
| Cartoon stories | Cel-shaded 3D cartoon characters with ink outlines (zombie, clerk, aunty, guard, kid, or your own variants) that stay the same in every shot and turn 360°, with blinking, eyes, brows and talking mouths. Office, shop, street and graveyard sets with Thai signs. Write the script as lines and SFX in a JSON file: `story.py` times the subtitles, SFX and music and makes the storyboard. No voice-over unless you ask |
| OpenFilm | `story.py openfilm` turns the rendered episode into an [OpenFilm](https://github.com/openfilm/openfilm) project: one track of shots, editable captions, SFX and music tracks, ready to edit in OpenFilm Studio. The repo is also an OpenFilm skill (`openfilm.json`) |
| ElevenLabs | Optional, and only used after asking you |
| Delivery | Renders the MP4, checks frames and loudness, then sends the video with a list of the techniques used and the credits |

## ภาษาไทย

สกิลตัดต่อวิดีโอที่สั่งครั้งเดียวได้คลิป MP4 พร้อมลูกเล่นและข้อความภาษาไทย
- ติดตั้งของที่ต้องใช้ให้เองครั้งแรก
- วางแผนก่อนว่าจะตัดตรงไหนให้ลงบีท และแต่ละจุดใช้ทรานซิชันแบบไหน
- มีทรานซิชันสำเร็จรูป 12 แบบ จุดสำคัญจะออกแบบทรานซิชันใหม่ให้เข้ากับเนื้อหา
- มีกฎกันไม่ให้คลิปดูเป็นเอไอ และ checklist ให้ตรวจก่อนส่ง
- ตัดต่อฟุตเทจได้: หาช็อตเด่น ตัดลงบีทให้อัตโนมัติ ครอปแนวตั้งตามตัวแบบ ปรับสีให้ทุกช็อตโทนเดียวกัน ทำ speed ramp ทำซับไทยจากเสียงพูด และตัดช่วงเงียบในคลิปคนพูด
- หาเพลงฟรีใหม่ที่เข้ากับคลิปทุกครั้ง ไม่ใช้เพลงซ้ำ และลงเครดิตให้
- โหมดผู้กำกับ: บอกแค่ว่าอยากได้วิดีโอแบบไหน สไตล์ อารมณ์ ฟอนต์ และเรื่องที่จะเล่า สกิลจะวาง storyboard เลือกเครื่องมือที่เล็กที่สุดที่พอ และทำทั้งคลิปด้วยโค้ด: ตัวละคร stickman/เวกเตอร์ ไดอะแกรมวิทยาศาสตร์ ฉาก 2.5D ฉาก 3D พร้อมกล้อง แสงและหมอก โฆษณาสินค้า ไม่ใช้ AI สร้างวิดีโอ และไม่ต้องใช้ Blender
- คลิปการ์ตูน 3D เล่าเรื่อง แนวตั้ง: ตัวละครการ์ตูนมีเส้นขอบ หน้าตาเหมือนเดิมทุกช็อต หมุนได้ 360° กะพริบตา ขยับปาก มีฉากออฟฟิศ ร้านค้า ถนน สุสาน ป้ายภาษาไทย เขียนบทเป็นไฟล์ JSON แล้วสกิลจัดเวลาซับ SFX และเพลงให้ ไม่มีเสียงพากย์ถ้าไม่ได้ขอ
- ส่งต่อไปแก้ใน OpenFilm Studio ได้ แยกแทร็กช็อต ซับ SFX และเพลง
- ElevenLabs ใช้เฉพาะตอนที่ถามคุณก่อน

## Install

- Devin: ask Devin to "install the plugin https://github.com/peichh/motion-muse".
- Claude Code: `git clone https://github.com/peichh/motion-muse && cp -r motion-muse/skills/motion-muse ~/.claude/skills/`
- Any agent that supports `npx skills`: `npx skills add peichh/motion-muse`
- Other agents: copy `skills/motion-muse` into the agent's skills folder.

Then ask the agent: "use motion-muse to make a 15 s 9:16 reel about ...".

The first time it runs, the skill calls `scripts/setup.sh`, which checks git, Node.js ≥ 20, ffmpeg and curl, then installs whatever is missing into `~/skills`:
Video Shotcraft, Remotion skills, guanmo-ai/awesome-ai-motion, gongnyang/awesome-ai-motion, the Prompt Thai font, Remotion and headless Chrome.

## Inside

- `SKILL.md`: the workflow (brief → techniques → Remotion build → beat sync → render/QA → deliver)
- `references/editing-craft.md`: which transition fits which scene change, how to design custom transitions, pacing, and the pre-delivery checklist
- `references/director.md`: brief → capability router → storyboard → scene-cached render; library and font tables
- `references/footage-editing.md`: editing real footage: shot choice, rhythm, speed ramps, reframing, colour, talking heads, Thai captions, audio mix
- `references/toon-story.md`: cartoon story episodes: script format, characters, sets, camera for 9:16
- `references/openfilm.md`: exporting to OpenFilm and using Motion Muse from OpenFilm
- `references/sound-sources.md`: free music/SFX sources and their licenses, a table matching music to content, and how to make your own sound
- `references/motion-sources.md`: where to get effects and techniques, and their licenses
- `scripts/`: `setup.sh` (install check), `find-music.py` (finds an unused matching track), `beat-grid.py` (BPM and beat grid), `synth-sfx.sh` (generates SFX), `find-footage.py` (free b-roll), `footage-scan.py` (shot detection and analysis), `transcribe.py` (Thai captions from speech), `auto-edit.py` (beat-synced first cut), `director.py` (route / init / check / render / qa), `thai-fonts.sh` (Thai Google Fonts), `story.py` (script → timeline/storyboard/subtitles, and OpenFilm export)
- `starter/`: a working 15 s 9:16 Thai reel, plus `transitions.tsx` (12 ready transitions with SFX) a `TransitionsDemo` that shows each one, `footage.tsx` with the `FootageReel` composition for footage edits, `src/lib/` procedural building blocks and `kits/three/` for 3D
- `examples/`: four code-only test films (stickman zombie-biology explainer, 3D apocalyptic horror with an observer camera, minimalist luxury product ad, toon story zombie-id)
- `skills/toon-story/` + `openfilm.json`: the OpenFilm skill entry

ElevenLabs is optional and is only used after the agent asks you.

## License

MIT for this skill. Dependencies keep their own licenses (Shotcraft Apache-2.0, Remotion License, Three.js MIT, Thai fonts OFL). Remotion needs a company license for companies with more than 3 employees.
