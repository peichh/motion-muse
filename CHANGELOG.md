# Changelog

## 1.3.0

- Toon stories: `starter/kits/three/toon.tsx` (cel-shaded characters with ink outlines, presets and variants, blink,
  gaze, brows and talking mouths, 360° turns, office / shop / street / graveyard sets, Thai signs), `lib/story.tsx`
  (subtitles with name tags, SFX and music from one timeline) and `scripts/story.py build` (script.json → timeline,
  storyboard, VTT). No voice-over unless asked. `director.py` capability `toon`.
- OpenFilm: `story.py openfilm` exports a rendered storyboard as an OpenFilm project (shots, captions, SFX and music
  tracks). `skills/toon-story/` with `openfilm.json` makes the repo an OpenFilm skill.
- `director.py render` passes storyboard `props` to Remotion. `Stage3D` takes `tone="none"` for flat colours.
- Example `examples/zombie-id` (52 s, 8 shots).
