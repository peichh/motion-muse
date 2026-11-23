import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CameraRig, Stage3D } from '../lib/three';
import { Graveyard, LOOKS, Office, OpenGrave, Sign, ToonCharacter, ToonLights, Floor, blinkAt, look, orbit } from '../lib/toon';
import { StoryTimeline, Subtitles, StoryAudio, mouthOf } from '../lib/story';
import { breathe, gait, pose, posesAt, mixPose } from '../lib/pose';
import { useThaiFont } from '../lib/typography';
import { Fog, Vignette } from '../lib/atmosphere';
import timeline from './timeline.json';
import script from './script.json';

const T = timeline as StoryTimeline;
export const ZOMBIE_TOTAL = T.total;
const ZOM = LOOKS.zombie, CLERK = LOOKS.clerk;
const EXTRAS = [look('zombie', { shirt: '#B04A3A', hair: 'bald', skin: '#A9C79A', iris: '#F2C14E' }), look('zombie', { shirt: '#D9A441', hair: 'bun', hairColor: '#4A3A2A', skin: '#8FB98A', iris: '#F25C54', build: 1 }), look('zombie', { shirt: '#3E7CB1', skin: '#B5CFA0', hair: 'spiky', height: 0.75, head: 0.4 })];
const ease = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
const ZPOS: [number, number, number] = [1.2, 0, -0.85], CPOS: [number, number, number] = [1.2, 0, -2.55];

type S = { f: number; abs: number; dur: number; font: string };
const face = (who: string, abs: number, seed: number, extra: object = {}) => ({ mouth: mouthOf(T, who, abs), blink: blinkAt(abs, seed), ...extra });

const OfficeSet: React.FC<{ queue: string }> = ({ queue }) => (<>
  <ToonLights from={[3, 7, 6]} key_={1.45} sky="#FFE9D6" ground="#7A5A50" fill={0.95} />
  <Office queue={queue} />
</>);

const Rise: React.FC<S> = ({ f, abs, dur }) => {
  const y = ease(f, 8, 48, -1.75, 0);
  const p = posesAt(f, [[0, pose('armsUp')], [40, pose('armsUp')], [62, pose('zombie')]]);
  const cam = orbit([0, 0.9 + y * 0.3, 0], 5.4, -0.35, ease(f, 0, dur, -25, 12));
  return (<>
    <Stage3D tone="none" background="#1E2A44" fog={['#1E2A44', 9, 32]}>
      <CameraRig position={cam.position} target={cam.target} shake={f < 50 ? 0.06 : 0.01} />
      <ToonLights from={[-4, 9, 5]} key_={1.25} color="#C7D3FF" sky="#7489C9" ground="#2B2A35" fill={0.85} />
      <Graveyard />
      <OpenGrave position={[0, 0, -0.2]} />
      <ToonCharacter look={ZOM} pose={breathe(p, abs)} position={[0, y, 0]} face={face('zombie', abs, 2, { gaze: [0, 0.2] })} />
    </Stage3D>
    <Fog frame={abs} color="160,180,230" density={0.35} low />
    <Vignette strength={0.5} />
  </>);
};

const Title: React.FC<S> = ({ f, abs, font }) => {
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 6, fps, config: { damping: 9, stiffness: 160 } });
  const cam = orbit([0, 1.45, 0], 2.6, 0.05, ease(f, 0, 72, 8, -4));
  return (<>
    <Stage3D tone="none" background="#1E2A44" fog={['#1E2A44', 6, 24]}>
      <CameraRig position={cam.position} target={cam.target} />
      <ToonLights from={[-4, 9, 5]} key_={1.25} color="#C7D3FF" sky="#7489C9" ground="#2B2A35" fill={0.85} />
      <Graveyard />
      <ToonCharacter look={ZOM} pose={breathe(pose('pointUp', { head: -4 }), abs)} face={{ blink: blinkAt(abs, 2), brow: 'up', smile: 0.6, mouth: 0.15 }} />
    </Stage3D>
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 260 }}>
      <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -8 - 3}deg)`, fontFamily: font, fontWeight: 900, fontSize: 150, lineHeight: 1.15, color: '#B8E64C', textAlign: 'center', WebkitTextStroke: '10px #1B1520', paintOrder: 'stroke fill', textShadow: '0 12px 0 #1B1520' }}>
        ซอมบี้<br /><span style={{ color: '#FFF4D6' }}>ไปทำบัตร</span>
      </div>
    </AbsoluteFill>
    <Vignette strength={0.45} />
  </>);
};

const Queue: React.FC<S> = ({ f, abs, dur }) => {
  const x = ease(f, 0, 70, -3.2, ZPOS[0]);
  const z = ease(f, 0, 70, 0.4, ZPOS[2]);
  const walking = f < 70;
  const yaw = walking ? Math.atan2(ZPOS[0] + 3.2, ZPOS[2] - 0.4) : ease(f, 70, 82, Math.atan2(ZPOS[0] + 3.2, ZPOS[2] - 0.4), Math.PI);
  const zp = walking ? gait(f / 26, 'shamble', { shL: 85, shR: 80, elL: 8, elR: 12, head: 12 }) : breathe(pose('zombie'), abs);
  const cam = orbit([ease(f, 0, 80, -1.0, 0.9), 1.25, -1.2], 8.6, 1.1, 34);
  return (<Stage3D tone="none" background="#B98580">
    <CameraRig position={cam.position} target={cam.target} />
    <OfficeSet queue={f < 60 ? 'ลำดับ 12' : 'ลำดับ 13'} />
    <ToonCharacter look={ZOM} pose={zp} position={[x, 0, z]} yaw={yaw} face={face('zombie', abs, 2)} />
    <ToonCharacter look={CLERK} pose={breathe(f > 66 && f < dur - 10 ? pose('present') : pose('rest'), abs)} position={CPOS} face={face('clerk', abs, 5, { gaze: [-0.4, 0] })} headYaw={-12} />
  </Stage3D>);
};

const Counter: React.FC<S> = ({ f, abs, dur }) => {
  const cam = orbit([1.2, 1.3, -1.7], ease(f, 0, dur, 6.2, 5.4), 0.3, 62);
  const zTalk = mouthOf(T, 'zombie', abs) > 0;
  const zp = zTalk ? pose('shrug', { lean: 6 }) : pose('zombie');
  return (<Stage3D tone="none" background="#B98580">
    <CameraRig position={cam.position} target={cam.target} />
    <OfficeSet queue="ลำดับ 13" />
    <ToonCharacter look={ZOM} pose={breathe(zp, abs)} position={ZPOS} yaw={Math.PI - 0.75} face={face('zombie', abs, 2)} />
    <ToonCharacter look={CLERK} yaw={0.55} pose={breathe(pose(f > dur * 0.62 ? 'point' : 'rest', { shR: f > dur * 0.62 ? 60 : 0 }), abs)} position={CPOS} face={face('clerk', abs, 5, { brow: f > dur * 0.62 ? 'angry' : 'neutral' })} />
  </Stage3D>);
};

const Think: React.FC<S> = ({ f, abs, dur }) => {
  const cam = orbit([0, 1.15, 0], 4.4, 0.35, ease(f, 0, dur - 6, -30, 330));
  const beat = Math.max(0, 1 - Math.abs(f - 0.6 * 30 - 4.2 * 30 + 18) / 6);
  return (<>
    <Stage3D tone="none" background="#F6C26B" fog={['#F6C26B', 6, 16]}>
      <CameraRig position={cam.position} target={cam.target} />
      <ToonLights from={[2, 8, 4]} key_={1.45} sky="#FFF1D0" ground="#C9874A" fill={0.95} />
      <Floor color="#F3D9A4" />
      <ToonCharacter look={ZOM} pose={breathe(pose('think'), abs)} scale={1 + beat * 0.04} face={face('zombie', abs, 2, { brow: 'sad', gaze: [0.4, 0.5] })} />
    </Stage3D>
    <Vignette strength={0.35} color="120,60,20" />
  </>);
};

const Form: React.FC<S> = ({ f, abs }) => {
  const slide = ease(f, 70, 95, 0, 1);
  const cp = posesAt(f, [[0, pose('slump')], [40, pose('slump')], [58, pose('rest')], [72, pose('present')], [100, pose('rest')]]);
  return (<Stage3D tone="none" background="#B98580" fov={38}>
    <CameraRig position={[2.55, 2.15, 0.7]} target={[1.2, 1.2, -1.9]} />
    <OfficeSet queue="ลำดับ 13" />
    <ToonCharacter look={ZOM} pose={breathe(pose('zombie', { head: 6 }), abs)} position={ZPOS} yaw={Math.PI} face={face('zombie', abs, 2)} />
    <ToonCharacter look={CLERK} pose={breathe(cp, abs)} position={CPOS} face={face('clerk', abs, 5, { brow: f < 50 ? 'sad' : 'neutral', blink: f > 10 && f < 40 ? 0.55 : blinkAt(abs, 5) })} />
    <Sign text="แบบฟอร์ม ผม.3" size={[0.42, 0.3]} position={[1.3, 1.13, ease(slide, 0, 1, -2.15, -1.6)]} rotation={[-Math.PI / 2, 0, 0.1]} bg="#FFFFFF" fg="#4A3A6A" frame="#D8D2C4" />
  </Stage3D>);
};

const Stamp: React.FC<S> = ({ f, abs, dur }) => {
  const down = f >= 28 && f < 34;
  const cp = posesAt(f, [[0, pose('rest')], [14, pose('rest', { shR: 150, elR: 40 })], [28, pose('rest', { shR: 150, elR: 40 })], [31, pose('rest', { shR: 70, elR: 60, lean: 6 })], [50, pose('present')]]);
  const happy = f > 44;
  const zp = happy ? mixPose(pose('zombie'), pose('armsUp'), ease(f, 44, 54, 0, 1)) : pose('zombie');
  const hop = happy ? Math.abs(Math.sin((f - 44) * 0.35)) * 0.12 : 0;
  const cam = orbit([1.2, 1.3, -1.7], 5.4, 0.3, 62);
  return (<Stage3D tone="none" background="#B98580">
    <CameraRig position={cam.position} target={cam.target} shake={down ? 0.08 : 0} />
    <OfficeSet queue="ลำดับ 13" />
    <ToonCharacter look={ZOM} pose={breathe(zp, abs)} position={[ZPOS[0], hop, ZPOS[2]]} yaw={Math.PI - 0.75} face={face('zombie', abs, 2, { smile: happy ? 1 : 0, brow: happy ? 'up' : 'neutral' })}
      handR={happy ? <Sign text={'บัตรประจำตัว\nผู้ไม่มีชีวิต'} size={[0.46, 0.3]} position={[0, 0.12, 0.05]} rotation={[0, Math.PI, 0]} bg="#E9F7D8" fg="#2C4A2A" frame="#5C8A4A" /> : undefined} />
    <ToonCharacter look={CLERK} yaw={0.55} pose={breathe(cp, abs)} position={CPOS} face={face('clerk', abs, 5, { brow: 'angry' })} />
  </Stage3D>);
};

const End: React.FC<S> = ({ f, abs, dur, font }) => {
  const cam = orbit([0.6, 1.3, -1.0], ease(f, 0, dur, 9.4, 8.6), 3.0, 30);
  const cp = posesAt(f, [[0, pose('rest')], [60, pose('rest')], [80, pose('slump', { shR: 140, elR: 150 })]]);
  return (<>
    <Stage3D tone="none" background="#B98580">
      <CameraRig position={cam.position} target={cam.target} />
      <OfficeSet queue="ลำดับ 14" />
      <ToonCharacter look={ZOM} pose={breathe(pose('wave'), abs)} position={[2.35, 0, -0.3]} yaw={0.7} face={face('zombie', abs, 2, { smile: 1, brow: 'up' })}
        handL={<Sign text={'บัตรประจำตัว\nผู้ไม่มีชีวิต'} size={[0.46, 0.3]} position={[0, 0.12, 0.05]} bg="#E9F7D8" fg="#2C4A2A" frame="#5C8A4A" />} />
      {EXTRAS.map((L, i) => {
        const x = ease(f, i * 10, 70 + i * 10, -5.2 - i * 1.1, -0.35 - i * 0.85), walking = f < 70 + i * 10;
        return <ToonCharacter key={i} look={L} position={[x, 0, -0.95 + i * 0.4]} yaw={walking ? Math.PI / 2 : ease(f, 70 + i * 10, 82 + i * 10, Math.PI / 2, Math.PI * 0.7)}
          pose={walking ? gait((f + i * 9) / 26, 'shamble', { shL: 85, shR: 80, elL: 8, elR: 12, head: 12 }) : breathe(pose('zombie'), abs + i * 20)} face={{ blink: blinkAt(abs, 7 + i), mouth: 0.25 + 0.15 * Math.sin(abs * 0.3 + i) }} />;
      })}
      <ToonCharacter look={CLERK} pose={breathe(cp, abs)} position={CPOS} face={face('clerk', abs, 5, { brow: 'sad' })} />
    </Stage3D>
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 560, opacity: ease(f, dur - 55, dur - 40, 0, 1) }}>
      <div style={{ fontFamily: font, fontWeight: 900, fontSize: 92, color: '#FFF4D6', WebkitTextStroke: '8px #1B1520', paintOrder: 'stroke fill', textShadow: '0 8px 0 #1B1520' }}>ติดตามตอนต่อไป</div>
    </AbsoluteFill>
  </>);
};

const SHOTS: Record<string, React.FC<S>> = { rise: Rise, title: Title, queue: Queue, counter: Counter, think: Think, form: Form, stamp: Stamp, end: End };
const Shot: React.FC<{ id: string; start: number; dur: number; font: string }> = ({ id, start, dur, font }) => {
  const f = useCurrentFrame(); const C = SHOTS[id];
  return <C f={f} abs={start + f} dur={dur} font={font} />;
};

export const ZombieId: React.FC<{ subs?: boolean }> = ({ subs = true }) => {
  const font = useThaiFont('Prompt');
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {T.scenes.map((s) => <Sequence key={s.id} from={s.from} durationInFrames={s.dur}><Shot id={s.id} start={s.from} dur={s.dur} font={font} /></Sequence>)}
      <Subtitles tl={T} family={font} show={subs} names={script.cast} bottom={230} size={56} />
      <StoryAudio tl={T} />
    </AbsoluteFill>
  );
};
