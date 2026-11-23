---
name: toon-story
description: Make a vertical 3D cartoon story episode (skit, dark comedy, "zombie goes to get an ID card", คลิปการ์ตูน 3D เล่าเรื่อง ตลกร้าย) 30 seconds to 3 minutes long, with the same characters in every shot, Thai subtitles, sound effects and music, as clips on the timeline. Use when someone asks for a cartoon episode, a character skit, or a short animated story for TikTok, Reels or Shorts.
---

toon-story, by peichh (https://github.com/peichh/motion-muse).

**The result.** A 9:16 cartoon episode someone watches to the end and shares: a hook in the first two seconds, a
story told in shots, a punchline, and a beat after it. Good enough to post on the person's page as an episode of a series.

**What defines it.** The story is told by characters who act: the same characters, recognisably the same from every
angle in every shot, moving, looking at each other and reacting. A slideshow of characters with captions is not this
film.

**What has to be true.**
- Every character keeps one look through the whole episode; a new character is a variant of an existing one or a new
  design, never a different one in the same role.
- Every line of dialogue is on screen as a subtitle long enough to read (about 10 Thai characters a second) with the
  speaker's name, and the speaker's mouth moves only while their line is shown.
- No voice-over unless the person asks for one. Every cut, hit and gag has a sound; the music is new for this episode
  and its credit is reported.
- Each shot is its own clip on the timeline, the captions are a caption track, and the sound effects and music are
  their own tracks, so the person can retime the episode in Studio.

**What you have.** Motion Muse (https://github.com/peichh/motion-muse, MIT) renders the shots with code on the
person's computer: cel-shaded characters, sets, Thai signs, cameras, and a script format that times subtitles, sound
and music together; it needs Node.js 20+ and FFmpeg, and installs the rest the first time (ask before it does,
about 1 GB). Its `references/toon-story.md` is the way to make the episode and `references/openfilm.md` the way to
put it in this project. `npx openfilm look` shows the result. Or any other renderer whose output becomes a clip.

**With the person.** Their premise, characters and jokes come first; ask for them in one question if there are none,
and start on the set and characters while you wait. When done, tell them the story in one line per shot, the length,
the music and its license, and what would make the next episode better (their own catchphrase, a recurring character,
a voice if they want one).
