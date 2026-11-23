// Story timeline helpers for voiced cartoon stories (pairs with scripts/story.py and lib/toon.tsx).
// timeline.json (written by `story.py build`) holds every line, sound effect and music cue in frames,
// so pictures, subtitles, lip-sync, the audio mix and the OpenFilm export all read the same timing.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';

export type Word = { text: string; from: number; to: number };
export type Line = { id: string; scene: string; who: string; text: string; from: number; dur: number; file?: string; env?: number[]; words?: Word[] };
export type Cue = { file: string; from: number; dur?: number; volume?: number; trim?: number; scene?: string };
export type StoryTimeline = { fps: number; width: number; height: number; total: number; scenes: { id: string; from: number; dur: number }[]; lines: Line[]; sfx: Cue[]; music: Cue[] };

export const sceneOf = (tl: StoryTimeline, id: string) => {
  const s = tl.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`scene ${id} not in timeline`);
  return s;
};
/** Line playing at absolute frame f (optionally only for one speaker). */
export const lineAt = (tl: StoryTimeline, f: number, who?: string) => tl.lines.find((l) => f >= l.from && f < l.from + l.dur && (!who || l.who === who));
/** Mouth openness 0..1 for a speaker at absolute frame f, from the voice envelope (or a talk wobble when there is none). */
export const mouthOf = (tl: StoryTimeline, who: string, f: number) => {
  const l = lineAt(tl, f, who);
  if (!l) return 0;
  const k = f - l.from;
  if (l.env && l.env.length) return Math.min(1, (l.env[Math.min(l.env.length - 1, k)] ?? 0) * 1.15);
  return Math.max(0, Math.sin(k * 0.9) * 0.6 + Math.sin(k * 2.3) * 0.4);
};
/** Who is speaking at frame f (for cutting to / turning towards the speaker). */
export const speakerAt = (tl: StoryTimeline, f: number) => lineAt(tl, f)?.who;

/** Burned-in Thai subtitles from the timeline (turn off with show={false} when exporting to OpenFilm, which makes its own). */
export const Subtitles: React.FC<{ tl: StoryTimeline; family: string; show?: boolean; bottom?: number; size?: number; names?: Record<string, { name: string; color: string }> }> = ({ tl, family, show = true, bottom = 210, size = 54, names }) => {
  const f = useCurrentFrame();
  if (!show) return null;
  const l = lineAt(tl, f);
  if (!l) return null;
  const k = f - l.from;
  const op = interpolate(k, [0, 4, l.dur - 4, l.dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const who = names?.[l.who];
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom, opacity: op, pointerEvents: 'none' }}>
      {who && <div style={{ fontFamily: family, fontWeight: 700, fontSize: size * 0.62, color: '#1B1520', background: who.color, padding: '4px 20px', borderRadius: 999, marginBottom: 10 }}>{who.name}</div>}
      <div style={{ fontFamily: family, fontWeight: 700, fontSize: size, lineHeight: 1.4, color: '#FFFFFF', textAlign: 'center', maxWidth: tl.width * 0.86, padding: '6px 22px', background: 'rgba(20,16,24,0.55)', borderRadius: 18, WebkitTextStroke: '1px rgba(0,0,0,0.4)', textShadow: '0 3px 0 rgba(0,0,0,0.45)' }}>{l.text}</div>
    </AbsoluteFill>
  );
};

/** Plays every voice line, sound effect and music cue of the timeline; music ducks under the voice. */
export const StoryAudio: React.FC<{ tl: StoryTimeline; voice?: number; duck?: number }> = ({ tl, voice = 1, duck = 0.6 }) => {
  const talking = (abs: number) => tl.lines.some((l) => l.file && abs >= l.from - 4 && abs < l.from + l.dur + 4);
  return (
    <>
      {tl.lines.filter((l) => l.file).map((l) => <Sequence key={l.id} from={l.from} durationInFrames={l.dur + 15} layout="none"><Audio src={staticFile(l.file!)} volume={voice} /></Sequence>)}
      {tl.sfx.map((s, i) => <Sequence key={`s${i}`} from={s.from} durationInFrames={s.dur ?? tl.fps * 4} layout="none"><Audio src={staticFile(s.file)} volume={s.volume ?? 0.6} /></Sequence>)}
      {tl.music.map((m, i) => {
        const len = m.dur ?? tl.total - m.from;
        const fin = Math.min(15, len / 3), fout = Math.min(30, len / 3);
        return (
          <Sequence key={`m${i}`} from={m.from} durationInFrames={len} layout="none">
            <Audio src={staticFile(m.file)} trimBefore={Math.round((m.trim ?? 0) * tl.fps)}
              volume={(f) => (m.volume ?? 0.25) * (talking(m.from + f) ? duck : 1) * interpolate(f, [0, fin, len - fout, len], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
          </Sequence>
        );
      })}
    </>
  );
};
