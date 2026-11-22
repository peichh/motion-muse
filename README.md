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
| Thai typography | Prompt font, animated per grapheme, so vowels and tone marks stay attached to their letters |
| Music | Finds a new free track that fits the content for every video (Mixkit via `find-music.py`, or Pixabay, YouTube Audio Library and others). Never reuses a track, and writes the credits for you |
| Sound effects | Shotcraft's 149 SFX, free SFX sites, or SFX it synthesizes itself with ffmpeg |
| ElevenLabs | Optional, and only used after asking you |
| Delivery | Renders the MP4, checks frames and loudness, then sends the video with a list of the techniques used and the credits |

## ภาษาไทย

สกิลตัดต่อวิดีโอที่สั่งครั้งเดียวได้คลิป MP4 พร้อมลูกเล่นและข้อความภาษาไทย
- ติดตั้งของที่ต้องใช้ให้เองครั้งแรก
- วางแผนก่อนว่าจะตัดตรงไหนให้ลงบีท และแต่ละจุดใช้ทรานซิชันแบบไหน
- มีทรานซิชันสำเร็จรูป 12 แบบ จุดสำคัญจะออกแบบทรานซิชันใหม่ให้เข้ากับเนื้อหา
- มีกฎกันไม่ให้คลิปดูเป็นเอไอ และ checklist ให้ตรวจก่อนส่ง
- หาเพลงฟรีใหม่ที่เข้ากับคลิปทุกครั้ง ไม่ใช้เพลงซ้ำ และลงเครดิตให้
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
- `references/sound-sources.md`: free music/SFX sources and their licenses, a table matching music to content, and how to make your own sound
- `references/motion-sources.md`: where to get effects and techniques, and their licenses
- `scripts/`: `setup.sh` (install check), `find-music.py` (finds an unused matching track), `beat-grid.py` (BPM and beat grid), `synth-sfx.sh` (generates SFX)
- `starter/`: a working 15 s 9:16 Thai reel, plus `transitions.tsx` (12 ready transitions with SFX) and a `TransitionsDemo` that shows each one

ElevenLabs is optional and is only used after the agent asks you.

## License

MIT for this skill. Dependencies keep their own licenses (Shotcraft Apache-2.0, Remotion License, Prompt OFL). Remotion needs a company license for companies with more than 3 employees.
