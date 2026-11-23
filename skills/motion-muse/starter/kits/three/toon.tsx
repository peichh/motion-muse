// Toon 3D kit: cel-shaded, ink-outlined cartoon characters that turn a full 360°, mouth driven by a voice envelope,
// blink/gaze/brows, simple sets (graveyard, office, shop, street) and signs with Thai text.
// Copied into src/lib/toon.tsx by `director.py init --caps toon` (needs the lib/three.tsx packages).
// Rules: everything from the frame number; <Stage3D tone="none"> keeps the flat cartoon colours; --gl=swangle without a GPU.
import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { continueRender, delayRender } from 'remotion';
import { useThree } from '@react-three/fiber';
import { Pose, REST } from './pose';
import { rand } from './noise';

type V3 = [number, number, number];
const R = (d: number) => (d * Math.PI) / 180;

// ---------- materials + geometry caches (created once, shared by every frame) ----------
let grad: THREE.DataTexture | null = null;
/** 3-step light ramp for MeshToonMaterial (hard cel bands). */
export const toonGradient = () => {
  if (grad) return grad;
  grad = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
  return grad;
};
const M = new Map<string, THREE.Material>();
/** Cel-shaded material for a colour (cached). emissive > 0 makes it glow (screens, moon, lamps). */
export const toon = (color: string, emissive = 0) => {
  const k = `t${color}${emissive}`;
  if (!M.has(k)) M.set(k, new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), emissive: emissive ? color : '#000', emissiveIntensity: emissive }));
  return M.get(k)!;
};
/** Inverted-hull ink outline: back faces pushed out along the normals by `w` (local units). */
export const ink = (w = 0.018, color = '#1B1520') => {
  const k = `i${w}${color}`;
  if (!M.has(k)) M.set(k, new THREE.ShaderMaterial({
    uniforms: { w: { value: w }, c: { value: new THREE.Color(color) } }, side: THREE.BackSide,
    vertexShader: 'uniform float w; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * w, 1.0); }',
    fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
  }));
  return M.get(k)!;
};
const G = new Map<string, THREE.BufferGeometry>();
const g = (k: string, make: () => THREE.BufferGeometry) => { if (!G.has(k)) G.set(k, make()); return G.get(k)!; };
export const sphere = (r: number, top = 1) => g(`s${r},${top}`, () => new THREE.SphereGeometry(r, 28, 20, 0, Math.PI * 2, 0, Math.PI * top));
export const capsule = (r: number, len: number) => g(`c${r},${len}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 16));
export const rbox = (w: number, h: number, d: number, r = 0.02) => g(`b${w},${h},${d},${r}`, () => r <= 0 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
export const cyl = (rt: number, rb: number, h: number, n = 24) => g(`y${rt},${rb},${h},${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
export const cone = (r: number, h: number) => g(`k${r},${h}`, () => new THREE.ConeGeometry(r, h, 16));
export const tube = (pts: V3[], r: number) => g(`u${JSON.stringify(pts)}${r}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 16, r, 6));

type PartProps = { geo: THREE.BufferGeometry; color: string; ol?: number; glow?: number; position?: V3; rotation?: V3; scale?: number | V3; shadow?: boolean; children?: React.ReactNode };
/** One cel-shaded mesh with its ink outline. */
export const Part: React.FC<PartProps> = ({ geo, color, ol = 0.016, glow = 0, position, rotation, scale, shadow = true, children }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh geometry={geo} material={toon(color, glow)} castShadow={shadow} receiveShadow />
    {ol > 0 && <mesh geometry={geo} material={ink(ol)} />}
    {children}
  </group>
);

// ---------- characters ----------
export type ToonLook = {
  skin: string; shirt: string; shirt2?: string; pants: string; shoes: string; sole?: string;
  hair: 'strands' | 'cap' | 'bun' | 'spiky' | 'bald' | 'police'; hairColor: string;
  eyes: 'bulge' | 'dot'; iris?: string; glasses?: string; tie?: string; badge?: string;
  bandage?: boolean; teeth?: boolean; torn?: boolean; nose?: boolean;
  head?: number; build?: number; height?: number; sleeves?: 'short' | 'long';
};
export const LOOKS: Record<string, ToonLook> = {
  zombie: { skin: '#9DC58B', shirt: '#5D8FA6', shirt2: '#ECE6D2', pants: '#4B5262', shoes: '#C95A6B', sole: '#F1EEE6', hair: 'strands', hairColor: '#2E3A2A', eyes: 'bulge', iris: '#B8E64C', bandage: true, teeth: true, torn: true, head: 0.44, build: 0.82, sleeves: 'short' },
  clerk: { skin: '#E8B790', shirt: '#6C4A9E', pants: '#2F3348', shoes: '#26262E', hair: 'cap', hairColor: '#2A2130', eyes: 'dot', glasses: '#3B2A2A', tie: '#EBB83C', nose: true, head: 0.35, build: 1.05, sleeves: 'long' },
  aunty: { skin: '#DCA580', shirt: '#E8745B', pants: '#3F5E7B', shoes: '#6B4B3A', hair: 'bun', hairColor: '#1F1A1A', eyes: 'dot', nose: true, head: 0.36, build: 1.22, height: 0.92, sleeves: 'short' },
  guard: { skin: '#C98F6B', shirt: '#7B6B49', pants: '#4E4733', shoes: '#1E1E1E', hair: 'police', hairColor: '#3B3424', eyes: 'dot', badge: '#E9C24B', nose: true, head: 0.35, build: 1.12, sleeves: 'short' },
  kid: { skin: '#F0C29C', shirt: '#F4C430', pants: '#3A6FB0', shoes: '#E9514B', sole: '#FFF', hair: 'spiky', hairColor: '#231C18', eyes: 'dot', head: 0.4, build: 0.8, height: 0.72, sleeves: 'short' },
};
/** A preset with changes, e.g. look('zombie', { shirt: '#B04A3A', hair: 'bald' }) for a new character. */
export const look = (base: keyof typeof LOOKS | ToonLook, over: Partial<ToonLook> = {}): ToonLook => ({ ...(typeof base === 'string' ? LOOKS[base] : base), ...over });

export type Face = { mouth?: number; blink?: number; brow?: 'neutral' | 'angry' | 'sad' | 'up'; gaze?: [number, number]; smile?: number };
/** Blink 0..1 at frame f: a 5-frame blink every 2.5–4.5 s, different per seed. */
export const blinkAt = (f: number, seed = 1) => {
  let t = 20 + rand(seed, 0) * 60, i = 1;
  while (t + 5 < f) { t += 75 + rand(seed, i++) * 60; }
  const d = f - t; return d >= 0 && d < 5 ? Math.sin((d / 5) * Math.PI) : 0;
};

type CharProps = { look: ToonLook; pose?: Pose; position?: V3; yaw?: number; scale?: number; face?: Face; headYaw?: number; handR?: React.ReactNode; handL?: React.ReactNode };
/** Cartoon character. Front faces +z; yaw (radians) turns it a full 360°. pose = lib/pose (gait, posesAt, breathe). */
export const ToonCharacter: React.FC<CharProps> = ({ look: L, pose: P = REST, position = [0, 0, 0], yaw = 0, scale = 1, face = {}, headYaw = 0, handR, handL }) => {
  const hm = L.height ?? 1, bw = L.build ?? 1, hr = L.head ?? 0.36;
  const legU = 0.32 * hm, legL = 0.3 * hm, foot = 0.08, hipY = legU + legL + foot, torso = 0.46 * hm;
  const skin = L.skin, sleeve = L.sleeves === 'long';
  const leg = (hip: number, knee: number, x: number) => (
    <group position={[x, hipY, 0]} rotation={[-R(hip), 0, 0]}>
      <Part geo={capsule(0.08 * bw, legU - 0.1)} color={L.pants} position={[0, -legU / 2, 0]} />
      <group position={[0, -legU, 0]} rotation={[R(knee), 0, 0]}>
        <Part geo={capsule(0.07 * bw, legL - 0.08)} color={L.torn ? skin : L.pants} position={[0, -legL / 2, 0]} />
        {L.torn && <Part geo={cyl(0.085 * bw, 0.09 * bw, 0.12)} color={L.pants} position={[0, -0.04, 0]} />}
        <Part geo={rbox(0.15 * bw, 0.1, 0.27, 0.045)} color={L.shoes} position={[0, -legL - 0.01, 0.05]} />
        {L.sole && <Part geo={rbox(0.155 * bw, 0.035, 0.28, 0.015)} color={L.sole} ol={0.01} position={[0, -legL - 0.06, 0.05]} />}
      </group>
    </group>
  );
  const arm = (sh: number, el: number, x: number, hand?: React.ReactNode) => (
    <group position={[x, torso * 0.86, 0]} rotation={[-R(sh), 0, x > 0 ? -0.1 : 0.1]}>
      <Part geo={capsule(0.062 * bw, 0.18 * hm)} color={L.shirt} position={[0, -0.13 * hm, 0]} />
      <group position={[0, -0.27 * hm, 0]} rotation={[-R(el), 0, 0]}>
        <Part geo={capsule(0.054 * bw, 0.17 * hm)} color={sleeve ? L.shirt : skin} position={[0, -0.12 * hm, 0]} />
        <group position={[0, -0.27 * hm, 0]}>
          <Part geo={sphere(0.075 * bw)} color={skin} scale={[1, 1.15, 0.85]} />
          {hand && <group position={[0, -0.04, 0.05]}>{hand}</group>}
        </group>
      </group>
    </group>
  );
  const blink = Math.max(face.blink ?? 0, 0), gz = face.gaze ?? [0, 0], mouth = Math.max(0, Math.min(1, face.mouth ?? 0)), smile = face.smile ?? 0;
  const eyeR = L.eyes === 'bulge' ? hr * 0.34 : hr * 0.17;
  const eyeX = L.eyes === 'bulge' ? hr * 0.4 : hr * 0.34, eyeY = L.eyes === 'bulge' ? hr * 0.12 : hr * 0.08;
  const eyeZ = Math.sqrt(Math.max(0, hr * hr - eyeX * eyeX - eyeY * eyeY)) * 0.94 - (L.eyes === 'bulge' ? 0 : eyeR * 0.25);
  const browRot = { neutral: 0, angry: -0.38, sad: 0.32, up: 0.08 }[face.brow ?? 'neutral'];
  const browLift = face.brow === 'up' ? eyeR * 0.6 : 0;
  const eye = (s: number) => (
    <group position={[s * eyeX, eyeY, eyeZ]} scale={[1, Math.max(0.08, 1 - blink), 1]}>
      <Part geo={sphere(eyeR)} color={L.eyes === 'bulge' ? '#F3F0C6' : '#FFFFFF'} ol={0.012} scale={L.eyes === 'bulge' ? 1 : [1, 1.15, 0.6]} />
      {L.eyes === 'bulge' ? (
        <group position={[gz[0] * eyeR * 0.3, gz[1] * eyeR * 0.3, eyeR * 0.8]}>
          <Part geo={sphere(eyeR * 0.52)} color={L.iris ?? '#8BC34A'} ol={0} scale={[1, 1, 0.45]} />
          <Part geo={sphere(eyeR * 0.24)} color="#141014" ol={0} position={[0, 0, eyeR * 0.14]} scale={[1, 1, 0.5]} />
          <Part geo={sphere(eyeR * 0.08)} color="#FFFFFF" glow={0.6} ol={0} position={[eyeR * 0.14, eyeR * 0.14, eyeR * 0.3]} />
        </group>
      ) : (
        <Part geo={sphere(eyeR * 0.55)} color="#16121A" ol={0} position={[gz[0] * eyeR * 0.3, gz[1] * eyeR * 0.3, eyeR * 0.42]} scale={[1, 1.1, 0.5]} />
      )}
      <Part geo={rbox(eyeR * 1.7, eyeR * 0.22, eyeR * 0.3, 0.01)} color={L.hairColor} ol={0} position={[0, eyeR * 1.25 + browLift, eyeR * 0.3]} rotation={[0, 0, s * -browRot]} />
    </group>
  );
  const mouthY = -hr * 0.4, mouthZ = Math.sqrt(hr * hr - mouthY * mouthY) * 0.93;
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={scale}>
      <group position={[0, P.bob * 1.6, 0]}>
        {leg(P.hipL, P.knL, -0.11 * bw)}{leg(P.hipR, P.knR, 0.11 * bw)}
        <group position={[0, hipY, 0]} rotation={[R(P.lean), 0, 0]}>
          <Part geo={capsule(0.2 * bw, 0.06)} color={L.pants} position={[0, 0.02, 0]} scale={[1, 1, 0.85]} />
          <Part geo={capsule(0.2 * bw, torso * 0.5)} color={L.shirt} position={[0, torso * 0.48, 0]} scale={[1, 1, 0.82]} />
          {L.torn && <>
            <Part geo={rbox(0.15 * bw, torso * 0.62, 0.05, 0.02)} color={L.shirt2 ?? '#EEE'} ol={0.01} position={[0, torso * 0.5, 0.16 * bw]} rotation={[-0.05, 0, 0.04]} />
            {[-0.13, -0.04, 0.06, 0.14].map((x, i) => <Part key={i} geo={cone(0.045, 0.12)} color={L.shirt} ol={0.01} position={[x * bw, torso * 0.08, 0.1]} rotation={[Math.PI, 0, 0]} />)}
          </>}
          {L.tie && <>
            <Part geo={rbox(0.12 * bw, 0.06, 0.05, 0.02)} color="#F4F1EA" ol={0.01} position={[0, torso * 0.9, 0.15 * bw]} />
            <Part geo={rbox(0.07, torso * 0.55, 0.03, 0.015)} color={L.tie} ol={0.01} position={[0, torso * 0.6, 0.17 * bw]} />
          </>}
          {L.badge && <Part geo={rbox(0.07, 0.08, 0.02, 0.01)} color={L.badge} ol={0.008} glow={0.2} position={[-0.09 * bw, torso * 0.72, 0.16 * bw]} />}
          {arm(P.shL, P.elL, -(0.2 * bw + 0.06), handL)}{arm(P.shR, P.elR, 0.2 * bw + 0.06, handR)}
          <group position={[0, torso + 0.02, 0]} rotation={[R(P.head), R(headYaw), 0]}>
            <Part geo={capsule(0.06, 0.06)} color={skin} position={[0, 0.03, 0]} />
            <group position={[0, hr * 0.95, 0]}>
              <Part geo={sphere(hr)} color={skin} ol={0.02} scale={L.eyes === 'bulge' ? [1, 1.06, 0.95] : [1, 1, 0.94]} />
              {[-1, 1].map((s) => <Part key={s} geo={sphere(hr * 0.22)} color={skin} position={[s * hr * 0.97, -hr * 0.05, 0]} scale={[0.5, 1, 0.8]} />)}
              {eye(-1)}{eye(1)}
              {L.nose && <Part geo={sphere(hr * 0.1)} color={skin} ol={0.01} position={[0, -hr * 0.12, hr * 0.92]} scale={[1, 0.9, 0.8]} />}
              {L.glasses && [-1, 1].map((s) => (
                <group key={s} position={[s * eyeX, eyeY, eyeZ + eyeR * 0.5]}>
                  <mesh geometry={g(`torus${eyeR}`, () => new THREE.TorusGeometry(eyeR * 1.35, eyeR * 0.22, 8, 24))} material={toon(L.glasses!)} />
                </group>
              ))}
              {L.glasses && <Part geo={rbox(eyeX * 0.6, eyeR * 0.25, eyeR * 0.2, 0.01)} color={L.glasses} ol={0} position={[0, eyeY, eyeZ + eyeR * 0.5]} />}
              <group position={[0, mouthY + (L.eyes === 'bulge' ? -hr * 0.04 : 0), mouthZ]}>
                <Part geo={sphere(hr * 0.2)} color="#3A1620" ol={0.012} scale={[1.15 + smile * 0.3, 0.12 + 0.85 * mouth, 0.35]} />
                {L.teeth && [-0.09, 0, 0.09].map((x, i) => <Part key={i} geo={rbox(hr * 0.07, hr * 0.08, 0.02, 0.006)} color="#F4EFD8" ol={0.005} position={[x * hr * 1.4, hr * 0.2 * (0.12 + 0.85 * mouth) - hr * 0.03, hr * 0.06]} rotation={[0, 0, (i - 1) * 0.15]} />)}
                {mouth > 0.35 && <Part geo={sphere(hr * 0.09)} color="#E07A8A" ol={0} position={[0, -hr * 0.1 * mouth, hr * 0.03]} scale={[1.2, 0.6, 0.6]} />}
              </group>
              {L.bandage && <group position={[hr * 0.35, hr * 0.62, hr * 0.68]} rotation={[-0.7, 0.4, -0.35]}>
                <Part geo={rbox(hr * 0.42, hr * 0.14, 0.02, 0.01)} color="#E9A79A" ol={0.008} />
                <Part geo={rbox(hr * 0.12, hr * 0.12, 0.022, 0.005)} color="#D88C80" ol={0} />
              </group>}
              <Hair L={L} hr={hr} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const Hair: React.FC<{ L: ToonLook; hr: number }> = ({ L, hr }) => {
  const c = L.hairColor;
  const cap = <Part geo={sphere(hr * 1.04, 0.42)} color={c} ol={0.016} rotation={[-0.3, 0, 0]} />;
  if (L.hair === 'strands') return <>{[[-0.25, 0.4], [-0.08, 0.6], [0.08, 0.5], [0.22, 0.75], [0.02, 0.85]].map(([x, h], i) => (
    <mesh key={i} geometry={tube([[x * hr, hr * 0.92, 0], [x * hr * 1.3, hr * (1 + h * 0.5), -hr * 0.05], [x * hr * 2 + 0.06 * (i % 2 ? 1 : -1), hr * (1 + h * 0.75), hr * 0.1]], 0.012)} material={toon(c)} />
  ))}</>;
  if (L.hair === 'cap') return <>{cap}<Part geo={rbox(hr * 1.3, hr * 0.22, hr * 0.3, 0.05)} color={c} ol={0.012} position={[hr * 0.1, hr * 0.7, hr * 0.62]} rotation={[0.5, 0, -0.12]} /></>;
  if (L.hair === 'bun') return <>{cap}<Part geo={sphere(hr * 0.38)} color={c} position={[0, hr * 0.95, -hr * 0.45]} /></>;
  if (L.hair === 'spiky') return <>{cap}{[-0.5, -0.2, 0.1, 0.4].map((x, i) => <Part key={i} geo={cone(hr * 0.18, hr * 0.45)} color={c} ol={0.01} position={[x * hr, hr * 0.95, -hr * 0.05]} rotation={[-0.3, 0, -x * 0.8]} />)}</>;
  if (L.hair === 'police') return <>{cap}
    <Part geo={cyl(hr * 0.9, hr * 1.02, hr * 0.38)} color="#2E3A4E" position={[0, hr * 0.92, -hr * 0.04]} rotation={[-0.12, 0, 0]} />
    <Part geo={cyl(hr * 0.75, hr * 0.75, hr * 0.06)} color="#1A1A1A" position={[0, hr * 0.72, hr * 0.38]} rotation={[0.25, 0, 0]} scale={[1, 1, 0.6]} />
    <Part geo={sphere(hr * 0.12)} color="#E9C24B" glow={0.3} ol={0.008} position={[0, hr * 0.98, hr * 0.92]} scale={[1, 1, 0.4]} />
  </>;
  return null;
};

// ---------- staging ----------
/** Cel-friendly lights: sky/ground fill + one shadow-casting key. */
export const ToonLights: React.FC<{ key_?: number; color?: string; sky?: string; ground?: string; fill?: number; from?: V3; area?: number }> = ({ key_ = 1.6, color = '#FFF2DD', sky = '#DDE8FF', ground = '#6B5A55', fill = 0.9, from = [4, 8, 6], area = 10 }) => (
  <>
    <hemisphereLight args={[sky, ground, fill]} />
    <directionalLight position={from} intensity={key_} color={color} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-normalBias={0.04}
      shadow-camera-left={-area} shadow-camera-right={area} shadow-camera-top={area} shadow-camera-bottom={-area} shadow-camera-far={50} />
  </>
);
/** Camera orbit around a point: angle in degrees (0 = in front, +z), for 360° turnarounds. */
export const orbit = (center: V3, radius: number, height: number, angleDeg: number): { position: V3; target: V3 } => ({
  position: [center[0] + Math.sin(R(angleDeg)) * radius, center[1] + height, center[2] + Math.cos(R(angleDeg)) * radius], target: center,
});
export const Floor: React.FC<{ color: string; size?: number; y?: number }> = ({ color, size = 80, y = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow geometry={g(`floor${size}`, () => new THREE.PlaneGeometry(size, size))} material={toon(color)} />
);

/** Canvas texture with Thai text; waits for the font (load it with useThaiFont first). Lines split on \n. */
export const useTextTexture = (text: string, o: { w?: number; h?: number; bg?: string; fg?: string; family?: string; weight?: number; px?: number; border?: string } = {}) => {
  const { w = 1024, h = 256, bg = '#FFFFFF', fg = '#222', family = 'Prompt', weight = 700, px = 110, border } = o;
  const advance = useThree((s) => s.advance);
  const [state] = useState(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { c, t, handle: delayRender(`sign ${text}`) };
  });
  useEffect(() => {
    let tries = 0, done = false;
    const font = `${weight} ${px}px "${family}"`;
    const draw = () => {
      if (done) return;
      const ready = document.fonts.check(font, text) && document.fonts.status === 'loaded';
      if (!ready && tries++ < 80) { document.fonts.load(font, text).catch(() => {}); setTimeout(draw, 100); return; }
      const x = state.c.getContext('2d')!;
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      if (border) { x.strokeStyle = border; x.lineWidth = h * 0.06; x.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
      x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * px * 1.25, w * 0.92));
      state.t.needsUpdate = true; advance(performance.now());
      done = true; continueRender(state.handle);
    };
    draw();
    return () => { if (!done) { done = true; continueRender(state.handle); } };
  }, [text, w, h, bg, fg, family, weight, px, border, state, advance]);
  return state.t;
};
/** A board with Thai text on its front. size in world units; the texture keeps the board's aspect. */
export const Sign: React.FC<{ text: string; size?: [number, number]; position?: V3; rotation?: V3; bg?: string; fg?: string; frame?: string; family?: string; glow?: number }> = ({ text, size = [1.6, 0.4], position, rotation, bg = '#F6F1E7', fg = '#3A2A2A', frame = '#5A4A48', family = 'Prompt', glow = 0 }) => {
  const tex = useTextTexture(text, { w: 1024, h: Math.round((1024 * size[1]) / size[0]), bg, fg, family, px: Math.round(((1024 * size[1]) / size[0]) * 0.42 / Math.max(1, text.split('\n').length)) });
  return (
    <group position={position} rotation={rotation}>
      <Part geo={rbox(size[0] + 0.08, size[1] + 0.08, 0.05, 0.02)} color={frame} ol={0.012} />
      <mesh position={[0, 0, 0.027]} geometry={g(`pl${size}`, () => new THREE.PlaneGeometry(size[0], size[1]))}>
        <meshBasicMaterial map={tex} toneMapped={false} color={glow ? '#FFFFFF' : '#E8E8E8'} />
      </mesh>
    </group>
  );
};

// ---------- sets (all static, seeded) ----------
export const Graveyard: React.FC<{ seed?: number; moon?: boolean; ground?: string }> = ({ seed = 3, moon = true, ground = '#4E6150' }) => (
  <group>
    <Floor color={ground} />
    {[...Array(14)].map((_, i) => {
      const x = (rand(seed, i) - 0.5) * 12, z = -2 - rand(seed, i + 30) * 9, h = 0.6 + rand(seed, i + 60) * 0.5, cross = rand(seed, i + 90) < 0.25;
      return cross ? <group key={i} position={[x, h / 2, z]} rotation={[0, 0, (rand(seed, i + 7) - 0.5) * 0.3]}>
        <Part geo={rbox(0.12, h, 0.12, 0.03)} color="#8A8F94" /><Part geo={rbox(0.5, 0.12, 0.12, 0.03)} color="#8A8F94" position={[0, h * 0.2, 0]} />
      </group> : <Part key={i} geo={rbox(0.55, h, 0.18, 0.08)} color={rand(seed, i + 5) < 0.5 ? '#8E949A' : '#7A8086'} position={[x, h / 2 - 0.05, z]} rotation={[(rand(seed, i + 3) - 0.5) * 0.25, (rand(seed, i + 4) - 0.5) * 0.4, (rand(seed, i + 8) - 0.5) * 0.3]} />;
    })}
    {[-6, 6].map((x, i) => <group key={i} position={[x, 0, -6]}>
      <Part geo={cyl(0.12, 0.2, 3)} color="#3D332E" position={[0, 1.5, 0]} />
      {[0, 1, 2].map((k) => <Part key={k} geo={cyl(0.03, 0.07, 1.4)} color="#3D332E" position={[(k - 1) * 0.5, 2.4 + k * 0.2, 0]} rotation={[0, 0, (k - 1) * 0.9 + 0.2]} />)}
    </group>)}
    {[...Array(18)].map((_, i) => <Part key={i} geo={rbox(0.07, 0.9, 0.07, 0.02)} color="#2F3337" ol={0.01} position={[-8 + i * 0.95, 0.45, -11]} />)}
    {moon && <Part geo={sphere(1.4)} color="#F1EBC8" glow={0.9} ol={0} position={[3.5, 7.5, -25]} />}
  </group>
);
export const OpenGrave: React.FC<{ position?: V3 }> = ({ position = [0, 0, 0] }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} geometry={g('grave', () => new THREE.PlaneGeometry(0.9, 1.9))} material={toon('#241A16')} />
    <Part geo={sphere(0.7, 0.5)} color="#5B4434" position={[1, 0, 0.2]} scale={[0.9, 0.5, 1.4]} />
    <Part geo={rbox(0.6, 1, 0.18, 0.09)} color="#8E949A" position={[0, 0.5, -1.1]} />
  </group>
);
export const Office: React.FC<{ wall?: string; floor?: string; sign?: string; family?: string; queue?: string }> = ({ wall = '#B98580', floor = '#C79A86', sign = 'ฝ่ายทะเบียนบุคคล', family = 'Prompt', queue }) => (
  <group>
    <Floor color={floor} />
    <Part geo={rbox(16, 6, 0.2, 0)} color={wall} ol={0} position={[0, 3, -3.2]} />
    <Part geo={rbox(16, 0.08, 0.05, 0)} color="#EFE6DC" ol={0} position={[0, 4.6, -3.08]} />
    <Part geo={rbox(16, 0.9, 0.08, 0)} color="#A06F6A" ol={0} position={[0, 0.45, -3.06]} />
    <Part geo={rbox(4.2, 1.05, 0.7, 0.05)} color="#C98F6A" position={[1.2, 0.52, -1.9]} />
    <Part geo={rbox(4.3, 0.08, 0.8, 0.03)} color="#E2B48E" position={[1.2, 1.08, -1.9]} />
    <Sign text={sign} size={[2.2, 0.5]} position={[-1.6, 3.2, -3.05]} family={family} />
    {queue && <Sign text={queue} size={[1.1, 0.5]} position={[2.6, 3.2, -3.05]} bg="#1E2330" fg="#FF5A4A" frame="#2B2B2B" family={family} glow={1} />}
    <group position={[4.4, 3.4, -3.05]}><Part geo={cyl(0.45, 0.45, 0.08)} color="#F5F1EA" rotation={[Math.PI / 2, 0, 0]} /><Part geo={rbox(0.04, 0.35, 0.02)} color="#222" ol={0} position={[0, 0.12, 0.06]} /></group>
    {[-4.5, -3.8, -3.1].map((x, i) => <group key={i} position={[x, 0, -1.6]}><Part geo={rbox(0.55, 0.08, 0.5, 0.03)} color="#5B7FA6" position={[0, 0.48, 0]} /><Part geo={rbox(0.55, 0.6, 0.08, 0.03)} color="#5B7FA6" position={[0, 0.8, -0.22]} /><Part geo={cyl(0.03, 0.03, 0.45)} color="#333" ol={0} position={[0, 0.22, 0]} /></group>)}
  </group>
);
export const Shop: React.FC<{ seed?: number; sign?: string; family?: string }> = ({ seed = 5, sign = 'มินิมาร์ท 24 ชม.', family = 'Prompt' }) => {
  const cols = ['#E8574B', '#F2C14E', '#4FA3D9', '#7BC67E', '#F08CB3', '#FFFFFF', '#9B6BD3'];
  return (
    <group>
      <Floor color="#E9E4DA" />
      <Part geo={rbox(16, 6, 0.2, 0)} color="#DCE9EE" ol={0} position={[0, 3, -4]} />
      {[-3.6, -1.2, 1.2].map((x, s) => <group key={s} position={[x, 0, -2.6]}>
        <Part geo={rbox(2, 2.2, 0.6, 0.03)} color="#B9C3CC" position={[0, 1.1, 0]} />
        {[0.5, 1.1, 1.7].map((y, r) => [...Array(6)].map((_, k) => <Part key={`${r}${k}`} geo={rbox(0.24, 0.32 + rand(seed + s, r * 9 + k) * 0.12, 0.2, 0.03)} color={cols[Math.floor(rand(seed + s, r * 7 + k) * cols.length)]} ol={0.008} position={[-0.75 + k * 0.3, y + 0.17, 0.32]} />))}
      </group>)}
      <group position={[3.6, 0, -2.8]}><Part geo={rbox(1.6, 2.6, 0.7, 0.04)} color="#DDE3E8" position={[0, 1.3, 0]} /><Part geo={rbox(1.4, 2.2, 0.04, 0.02)} color="#BFE7FF" glow={0.35} ol={0} position={[0, 1.4, 0.37]} /></group>
      <Part geo={rbox(2.4, 1.0, 0.8, 0.05)} color="#F2F2F2" position={[0.4, 0.5, 0.6]} />
      <Part geo={rbox(0.5, 0.35, 0.4, 0.04)} color="#3A3F48" position={[0.9, 1.18, 0.6]} />
      <Sign text={sign} size={[2.6, 0.55]} position={[0, 4.3, -3.88]} bg="#E8574B" fg="#FFFFFF" frame="#B23A30" family={family} glow={1} />
    </group>
  );
};
export const Street: React.FC<{ seed?: number; night?: boolean }> = ({ seed = 9, night = true }) => (
  <group>
    <Floor color="#4A4D55" />
    <Part geo={rbox(40, 0.2, 2.4, 0)} color="#9A9590" ol={0} position={[0, 0.1, -2.2]} />
    {[...Array(9)].map((_, i) => {
      const w = 2.4 + rand(seed, i) * 1.6, h = 3 + rand(seed, i + 10) * 5, x = -12 + i * 3.1;
      const col = ['#C27A63', '#8D9BB5', '#D8B26E', '#7F9E8C', '#B58AA5'][i % 5];
      return <group key={i} position={[x, 0, -5]}>
        <Part geo={rbox(w, h, 3, 0.05)} color={col} position={[0, h / 2, 0]} />
        {[...Array(Math.floor(h / 1.2))].map((_, k) => [-0.6, 0.6].map((dx, j) => <Part key={`${k}${j}`} geo={rbox(0.5, 0.6, 0.05, 0.02)} color={night && rand(seed, i * 20 + k * 2 + j) < 0.45 ? '#FFD98A' : '#3B4655'} glow={night ? 0.6 : 0} ol={0} position={[dx, 1.2 + k * 1.2, 1.52]} />))}
      </group>;
    })}
    {[-6, 0, 6].map((x, i) => <group key={i} position={[x, 0, -1.4]}>
      <Part geo={cyl(0.06, 0.08, 3.2)} color="#2E3138" position={[0, 1.6, 0]} />
      <Part geo={sphere(0.22)} color="#FFE7A8" glow={night ? 1.2 : 0.2} position={[0, 3.25, 0]} />
      {night && <pointLight position={[0, 3, 0.4]} intensity={6} distance={6} color="#FFD58A" />}
    </group>)}
  </group>
);
