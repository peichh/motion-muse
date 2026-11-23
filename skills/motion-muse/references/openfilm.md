# OpenFilm bridge

[OpenFilm](https://github.com/openfilm/openfilm) (MIT) is an open-source video editor where the film is a folder:
`film.html` (tracks of clips) + `assets/`. Studio edits it on a timeline, its agent makes and changes it, and
`openfilm render` exports it. Motion Muse makes the shots; OpenFilm is where the person edits them.

## Motion Muse → OpenFilm

```bash
python3 "$SKILL_DIR/scripts/story.py" build ~/videos/<slug> src/<slug>/script.json --no-subs   # OpenFilm draws the captions
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json
python3 "$SKILL_DIR/scripts/story.py" openfilm ~/videos/<slug> src/<slug>/storyboard.json --out ~/films/<slug>
cd ~/films/<slug> && npx -y openfilm@latest     # opens Studio
```

What `story.py openfilm` writes:

| OpenFilm | From |
| --- | --- |
| `assets/shots/NN-<scene>.mp4` on the first track, end to end | each scene `director.py render` cached (muted) |
| `assets/shots/NN-<scene>.vtt` beside each shot | the scene's lines, with a timestamp tag per word; Studio and `look` merge them into one caption track (`captions/captions.vtt`) that follows the shots when they are cut |
| `assets/sfx/*` on as few sound tracks as fit, at their film second, trimmed to their decoded length | `timeline.json` `sfx` |
| `assets/music/*` on the last track, trimmed | `timeline.json` `music` |
| `<meta name="viewport">` | the storyboard's width × height |

It stops without touching anything when `--out` already holds a `film.html` (it may hold Studio edits, and new shots
under its old cuts would not match): export to a new folder, or pass `--force` to overwrite the film and its assets.

Burned-in subtitles: shots rendered without `--no-subs` already have the subtitles in the picture; OpenFilm would
show them twice. Build with `--no-subs` (sets the storyboard's `props.subs` to false; `director.py render` passes
props to Remotion) and render again.

## Using Motion Muse from inside OpenFilm

OpenFilm's agent loads skills from GitHub repositories with `skills/<name>/SKILL.md` + `openfilm.json`. This repo
has one: `skills/toon-story/` (kind `workflow`). In OpenFilm add `https://github.com/peichh/motion-muse` as a skill;
its brief tells the agent to install Motion Muse and build the episode with it, then put it in the open project.

## OpenFilm rules that apply when you touch film.html

- Read film.html right before you change it, change only what you mean to; leave `locked` tracks and `overrides` alone.
- Every clip is an element: `<video>`, `<img>`, `<audio>`, `<iframe>` (a page with `window.film.frame(t)`).
  `src="...#t=in,out"` trims, `at` places, CSS positions and animates (`translate`/`scale`/`rotate`, never `transform`).
- Never re-encode to cut: trim with `#t=`. Never draw subtitles in a page: use a `.vtt` beside the media.
- Check: `npx openfilm look` (contact sheet + determinism), render: `npx openfilm render --loudness=-14` (the exported
  mix is about -22 LUFS before that).
