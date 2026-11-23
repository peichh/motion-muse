// Programmatic 3D kit for Remotion (copied into src/lib/three.tsx by `director.py init --caps 3d`).
// Needs: @remotion/three three @react-three/fiber (director.py installs them only when a scene needs 3D).
// Rules: animate only from useCurrentFrame() (never useFrame / clocks); render with --gl=swangle on machines without a GPU.
import React, { useLayoutEffect, useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fbm, rand } from './noise';
import { Pose } from './pose';

type V3 = [number, number, number];

/** Full-frame 3D stage: background, fog, tone mapping, shadows. */
export const Stage3D: React.FC<{ children: React.ReactNode; background?: string; fog?: [string, number, number]; exposure?: number; shadows?: boolean; env?: boolean; fov?: number; tone?: 'aces' | 'none' }> = ({ children, background = '#0B0D12', fog, exposure = 1, shadows = true, env = false, fov = 40, tone = 'aces' }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} shadows={shadows} camera={{ fov, near: 0.1, far: 200, position: [0, 2, 8] }}
      gl={{ antialias: true, toneMapping: tone === 'none' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, preserveDrawingBuffer: true }}>
      <color attach="background" args={[background]} />
      {fog && <fog attach="fog" args={fog} />}
      {env && <RoomEnv />}
      {children}
    </ThreeCanvas>
  );
};

/** Procedural studio reflections (no HDR file needed). */
export const RoomEnv: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const rt = pm.fromScene(room, 0.04);
    scene.environment = rt.texture;
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); room.dispose(); };
  }, [gl, scene]);
  useLayoutEffect(() => { scene.environmentIntensity = intensity; }, [scene, intensity]);
  return null;
};

/** Camera rig driven by the frame: set position + look-at target, optional handheld noise and roll. */
export const CameraRig: React.FC<{ position: V3; target: V3; fov?: number; shake?: number; roll?: number }> = ({ position, target, fov, shake = 0, roll = 0 }) => {
  const { camera } = useThree();
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const n = (s: number) => fbm(f / 35, s) * shake;
    camera.position.set(position[0] + n(1), position[1] + n(2), position[2] + n(3));
    camera.lookAt(target[0] + n(4) * 0.5, target[1] + n(5) * 0.5, target[2]);
    camera.rotateZ(roll + fbm(f / 50, 9) * shake * 0.05);
    if (fov && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) { (camera as THREE.PerspectiveCamera).fov = fov; (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); }
  });
  return null;
};

/** Third-person observer camera: follows a subject path from behind/over the shoulder with smooth lag.
 *  path(frame) → subject position; heading(frame) → yaw (radians). Deterministic: the lag averages past samples, no state. */
export const observer = (f: number, path: (f: number) => V3, heading: (f: number) => number, o: { back?: number; height?: number; side?: number; lag?: number; lookAhead?: number; lookHeight?: number } = {}) => {
  const { back = 3.2, height = 1.9, side = 0.6, lag = 12, lookAhead = 2.5, lookHeight = 1.3 } = o;
  let px = 0, py = 0, pz = 0, yaw = 0, w = 0;
  for (let k = 0; k <= lag; k += 2) { const wt = 1 - k / (lag + 1); const p = path(f - k); px += p[0] * wt; py += p[1] * wt; pz += p[2] * wt; yaw += heading(f - k) * wt; w += wt; }
  px /= w; py /= w; pz /= w; yaw /= w;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  const position: V3 = [px - s * back + c * side, py + height, pz - c * back - s * side];
  const p = path(f);
  const target: V3 = [p[0] + s * lookAhead, p[1] + lookHeight, p[2] + c * lookAhead];
  return { position, target };
};

/** Low-poly humanoid built from primitives, animated with the same Pose as the 2D characters (lib/pose.ts). */
export const Figure: React.FC<{ pose: Pose; position?: V3; yaw?: number; color?: string; skin?: string; scale?: number; emissive?: string }> = ({ pose, position = [0, 0, 0], yaw = 0, color = '#3C4048', skin = '#B8A898', scale = 1, emissive }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const mat = <meshStandardMaterial color={color} roughness={0.85} emissive={emissive ?? '#000'} />;
  const skinMat = <meshStandardMaterial color={skin} roughness={0.7} />;
  const limb = (len: number, rad: number, m: React.ReactNode) => <mesh position={[0, -len / 2, 0]} castShadow><capsuleGeometry args={[rad, len - rad * 2, 4, 8]} />{m}</mesh>;
  const leg = (hip: number, knee: number, x: number) => (
    <group position={[x, 0.95, 0]} rotation={[-r(hip), 0, 0]}>
      {limb(0.48, 0.075, mat)}
      <group position={[0, -0.48, 0]} rotation={[r(knee), 0, 0]}>{limb(0.47, 0.065, mat)}<mesh position={[0, -0.47, 0.06]} castShadow><boxGeometry args={[0.11, 0.07, 0.24]} />{mat}</mesh></group>
    </group>
  );
  const arm = (sh: number, el: number, x: number) => (
    <group position={[x, 1.52, 0]} rotation={[-r(sh), 0, x > 0 ? -0.08 : 0.08]}>
      {limb(0.32, 0.055, mat)}
      <group position={[0, -0.32, 0]} rotation={[-r(el), 0, 0]}>{limb(0.3, 0.048, mat)}<mesh position={[0, -0.32, 0]} castShadow><sphereGeometry args={[0.055, 8, 8]} />{skinMat}</mesh></group>
    </group>
  );
  return (
    <group position={[position[0], position[1] + pose.bob * 1.8, position[2]]} rotation={[0, yaw, 0]} scale={scale}>
      {leg(pose.hipL, pose.knL, -0.1)}{leg(pose.hipR, pose.knR, 0.1)}
      <group position={[0, 0.95, 0]} rotation={[r(pose.lean), 0, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow><capsuleGeometry args={[0.17, 0.32, 4, 10]} />{mat}</mesh>
        <group position={[0, -0.95, 0]}>{arm(pose.shL, pose.elL, -0.24)}{arm(pose.shR, pose.elR, 0.24)}</group>
        <group position={[0, 0.72, 0]} rotation={[r(pose.head), 0, 0]}><mesh position={[0, 0.08, 0]} castShadow><sphereGeometry args={[0.12, 14, 12]} />{skinMat}</mesh></group>
      </group>
    </group>
  );
};

/** Seeded ruined city block: broken towers, empty windows, debris. Static geometry (memoised). */
export const RuinedCity: React.FC<{ seed?: number; length?: number; street?: number; color?: string; windowGlow?: string; lit?: number }> = ({ seed = 7, length = 60, street = 4, color = '#2A2D33', windowGlow = '#FFB566', lit = 0.04 }) => {
  const blocks = useMemo(() => {
    const out: { p: V3; s: V3; rot: number; lit: boolean }[] = [];
    for (const side of [-1, 1]) for (let z = -6, i = 0; z < length; i++) {
      const w = 2.5 + rand(seed + side, i) * 3, d = 3 + rand(seed + side, i + 40) * 3, h = 3 + rand(seed + side, i + 80) ** 1.5 * 14;
      out.push({ p: [side * (street + d / 2 + rand(seed, i + 3) * 1.5), h / 2, z + w / 2], s: [d, h, w], rot: (rand(seed, i + 9) - 0.5) * 0.06, lit: rand(seed + side, i + 120) < lit * 6 });
      if (rand(seed + side, i + 160) < 0.5) out.push({ p: [side * (street + 0.6), 0.3, z + rand(seed, i + 5) * w], s: [0.9 + rand(seed, i) * 1.2, 0.6, 0.8 + rand(seed, i + 1)], rot: rand(seed, i + 2) * 3, lit: false });
      z += w + 0.4 + rand(seed + side, i + 200) * 2;
    }
    return out;
  }, [seed, length, street, lit]);
  return (
    <group>
      {blocks.map((b, i) => (
        <group key={i} position={b.p} rotation={[0, b.rot, b.s[1] < 1 ? b.rot : 0]}>
          <mesh castShadow receiveShadow><boxGeometry args={b.s} /><meshStandardMaterial color={color} roughness={0.95} /></mesh>
          {b.lit && <mesh position={[b.p[0] > 0 ? -b.s[0] / 2 - 0.01 : b.s[0] / 2 + 0.01, -b.s[1] / 2 + 2.2, 0]} rotation={[0, b.p[0] > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}><planeGeometry args={[0.7, 0.9]} /><meshBasicMaterial color={windowGlow} /></mesh>}
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]} receiveShadow><planeGeometry args={[80, length + 40]} /><meshStandardMaterial color="#1A1C20" roughness={0.9} /></mesh>
    </group>
  );
};

/** Lathe-turned product (bottle, jar, glass) from a 2D profile [[radius, y], ...]. */
export const Lathe: React.FC<{ profile: [number, number][]; segments?: number; children?: React.ReactNode } & Omit<React.ComponentProps<'mesh'>, 'children'>> = ({ profile, segments = 96, children, ...mesh }) => {
  const geo = useMemo(() => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments), [profile, segments]);
  return <mesh geometry={geo} castShadow receiveShadow {...mesh}>{children}</mesh>;
};

/** Three-point studio lighting for products: key, rim, fill + soft floor. */
export const StudioLights: React.FC<{ key_?: number; rim?: number; fill?: number; warm?: string; cool?: string; sweep?: number }> = ({ key_ = 40, rim = 60, fill = 6, warm = '#FFE8CC', cool = '#CFE0FF', sweep = 0 }) => (
  <group>
    <spotLight position={[3.5 + sweep * 3, 5, 4]} angle={0.45} penumbra={0.9} intensity={key_} color={warm} castShadow shadow-mapSize={[1024, 1024]} />
    <spotLight position={[-4, 3.5, -3]} angle={0.5} penumbra={1} intensity={rim} color={cool} />
    <pointLight position={[0, 1.5, 5]} intensity={fill} color="#fff" />
    <ambientLight intensity={0.08} />
  </group>
);
