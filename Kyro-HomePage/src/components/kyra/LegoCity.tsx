/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  MeshTransmissionMaterial,
  shaderMaterial,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { extend } from "@react-three/fiber";

type Block = {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  speed: number;
  delay: number;
  startY: number;
};

/* ---------- City layout ---------- */
function useCity(seed = 7, count = 90): Block[] {
  return useMemo(() => {
    const rng = (() => {
      let s = seed * 9301 + 49297;
      return () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    })();
    const palette = ["#00F2FF", "#CCFF00", "#00F2FF", "#7DF9FF", "#CCFF00"];
    const blocks: Block[] = [];
    const grid = 9;
    const used = new Set<string>();
    let i = 0;
    let guard = 0;
    while (i < count && guard < 600) {
      guard++;
      const gx = Math.floor(rng() * grid) - Math.floor(grid / 2);
      const gz = Math.floor(rng() * grid) - Math.floor(grid / 2);
      // keep a clear plaza around the center for Kyra Core
      if (Math.abs(gx) < 1 && Math.abs(gz) < 1) continue;
      const key = `${gx},${gz}`;
      if (used.has(key)) continue;
      used.add(key);
      const x = gx * 1.5;
      const z = gz * 1.5;
      const h = 0.6 + rng() * 5.2;
      blocks.push({
        pos: [x, h / 2 - 1.5, z],
        size: [1.15, h, 1.15],
        color: palette[Math.floor(rng() * palette.length)],
        speed: 0.4 + rng() * 1.6,
        delay: rng() * 0.9,
        startY: 18 + rng() * 8,
      });
      i++;
    }
    return blocks;
  }, [seed, count]);
}

/* ---------- Spring assembly building ---------- */
function Building({ block, pulse }: { block: Block; pulse: number }) {
  const ref = useRef<THREE.Mesh>(null);
  // simple critically-damped spring toward target Y
  const targetY = block.pos[1];
  const yRef = useRef(block.pos[1] + block.startY);
  const vRef = useRef(0);
  const startedRef = useRef(false);
  const startTimeRef = useRef(0);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (!startedRef.current) {
      startedRef.current = true;
      startTimeRef.current = t + block.delay;
    }
    if (t >= startTimeRef.current) {
      // spring physics: stiffness ~120, damping ~14
      const k = 120;
      const c = 14;
      const a = -k * (yRef.current - targetY) - c * vRef.current;
      vRef.current += a * delta;
      yRef.current += vRef.current * delta;
      ref.current.position.y = yRef.current;
    } else {
      ref.current.position.y = yRef.current;
    }

    const m = ref.current.material as THREE.MeshStandardMaterial;
    const base = 0.85 + Math.sin(t * block.speed) * 0.25;
    m.emissiveIntensity = base + pulse * 1.4;
  });

  return (
    <mesh
      ref={ref}
      position={[block.pos[0], block.pos[1] + block.startY, block.pos[2]]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={block.size} />
      <meshStandardMaterial
        color={block.color}
        emissive={block.color}
        emissiveIntensity={1.2}
        transparent
        opacity={0.92}
        metalness={0.4}
        roughness={0.18}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ---------- Kyra Core (chrome sphere, hovering center) ---------- */
function KyraCore() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.4;
    ref.current.position.y = 2.4 + Math.sin(t * 0.8) * 0.2;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.6}>
      <mesh ref={ref} position={[0, 2.4, 0]}>
        <icosahedronGeometry args={[0.95, 5]} />
        <MeshTransmissionMaterial
          thickness={0.8}
          transmission={1}
          roughness={0.04}
          ior={1.7}
          chromaticAberration={0.6}
          backside
          color="#ffffff"
        />
      </mesh>
      <pointLight position={[0, 2.4, 0]} intensity={4} color="#00F2FF" distance={14} />
    </Float>
  );
}

/* ---------- Orbiting chrome agent + particle trail ---------- */
function OrbitingAgent() {
  const sphere = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Points>(null);
  const TRAIL = 60;
  const positions = useMemo(() => new Float32Array(TRAIL * 3), []);
  const colors = useMemo(() => {
    const arr = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      arr[i * 3] = 0;
      arr[i * 3 + 1] = 0.95;
      arr[i * 3 + 2] = 1;
    }
    return arr;
  }, []);
  const head = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const r = 7.5;
    const x = Math.cos(t * 0.6) * r;
    const z = Math.sin(t * 0.6) * r;
    const y = 3.2 + Math.sin(t * 1.2) * 1.1;
    if (sphere.current) sphere.current.position.set(x, y, z);

    // push into ring buffer
    positions[head.current * 3] = x;
    positions[head.current * 3 + 1] = y;
    positions[head.current * 3 + 2] = z;
    head.current = (head.current + 1) % TRAIL;
    if (trail.current) {
      (trail.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={sphere}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={1}
          roughness={0.05}
          emissive="#00F2FF"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      <points ref={trail}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={TRAIL} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} count={TRAIL} />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/* ---------- Infinite glowing floor grid (shader) ---------- */
const InfiniteGridMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color("#00F2FF"), uFog: new THREE.Color("#020203") },
  /* glsl */ `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  /* glsl */ `
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uFog;
    float gridLine(vec2 p, float scale, float thickness) {
      vec2 g = abs(fract(p * scale - 0.5) - 0.5) / fwidth(p * scale);
      float l = min(g.x, g.y);
      return 1.0 - min(l / thickness, 1.0);
    }
    void main() {
      vec2 p = vWorldPos.xz + vec2(0.0, uTime * 0.6);
      float a = gridLine(p, 0.5, 1.0);
      float b = gridLine(p, 2.0, 1.0) * 0.4;
      float g = max(a, b);
      float dist = length(vWorldPos.xz);
      float fog = smoothstep(6.0, 28.0, dist);
      vec3 col = mix(uColor, uFog, fog) * g;
      float alpha = g * (1.0 - fog) * 0.85;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(col, alpha);
    }
  `
);
extend({ InfiniteGridMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    infiniteGridMaterial: object;
  }
}

function InfiniteFloor() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) (ref.current.uniforms as { uTime: { value: number } }).uTime.value = clock.getElapsedTime();
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[120, 120]} />
      <infiniteGridMaterial ref={ref} transparent depthWrite={false} />
    </mesh>
  );
}

/* ---------- Data pulses traveling between blocks ---------- */
type Pulse = {
  a: [number, number, number];
  b: [number, number, number];
  start: number;
  duration: number;
  color: string;
};

function DataPulses({ blocks }: { blocks: Block[] }) {
  const group = useRef<THREE.Group>(null);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    if (blocks.length < 2) return;
    let alive = true;
    const spawn = () => {
      if (!alive) return;
      setPulses((prev) => {
        const a = blocks[Math.floor(Math.random() * blocks.length)];
        const b = blocks[Math.floor(Math.random() * blocks.length)];
        if (a === b) return prev;
        const next: Pulse = {
          a: [a.pos[0], a.pos[1] + a.size[1] / 2 + 0.2, a.pos[2]],
          b: [b.pos[0], b.pos[1] + b.size[1] / 2 + 0.2, b.pos[2]],
          start: performance.now() / 1000,
          duration: 1.1 + Math.random() * 0.9,
          color: Math.random() > 0.5 ? "#00F2FF" : "#CCFF00",
        };
        const arr = [...prev, next].slice(-14);
        return arr;
      });
      window.setTimeout(spawn, 220 + Math.random() * 320);
    };
    const id = window.setTimeout(spawn, 1200);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [blocks]);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    pulses.forEach((p, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      const t = (now - p.start) / p.duration;
      if (t < 0 || t > 1) {
        m.visible = false;
        return;
      }
      m.visible = true;
      const x = p.a[0] + (p.b[0] - p.a[0]) * t;
      const y = p.a[1] + (p.b[1] - p.a[1]) * t + Math.sin(t * Math.PI) * 1.4;
      const z = p.a[2] + (p.b[2] - p.a[2]) * t;
      m.position.set(x, y, z);
      const s = 0.3 + Math.sin(t * Math.PI) * 0.4;
      m.scale.setScalar(s);
    });
  });

  return (
    <group ref={group}>
      {pulses.map((p, i) => (
        <mesh key={i} ref={(el) => { meshRefs.current[i] = el; }}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={p.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Static dependency edges (subtle lattice) ---------- */
function DependencyEdges({ blocks }: { blocks: Block[] }) {
  const segs = useMemo(() => {
    const out: number[] = [];
    const colors: number[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const a = blocks[i];
      // connect to nearest 1-2 neighbors
      const near = blocks
        .map((b, j) => ({ b, j, d: (a.pos[0] - b.pos[0]) ** 2 + (a.pos[2] - b.pos[2]) ** 2 }))
        .filter((x) => x.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      for (const n of near) {
        out.push(a.pos[0], a.pos[1] + a.size[1] / 2, a.pos[2]);
        out.push(n.b.pos[0], n.b.pos[1] + n.b.size[1] / 2, n.b.pos[2]);
        colors.push(0, 0.95, 1, 0.8, 1, 0);
      }
    }
    return {
      positions: new Float32Array(out),
      colors: new Float32Array(colors),
    };
  }, [blocks]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[segs.positions, 3]} count={segs.positions.length / 3} />
        <bufferAttribute attach="attributes-color" args={[segs.colors, 3]} count={segs.colors.length / 3} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.18} toneMapped={false} />
    </lineSegments>
  );
}

/* ---------- Scroll-linked dolly zoom rig ---------- */
function CameraRig({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const s = THREE.MathUtils.clamp(scrollRef.current, 0, 1);
    // dolly in + tilt + narrow FOV
    const startPos = new THREE.Vector3(11, 9, 11);
    const endPos = new THREE.Vector3(2.5, 4.2, 5.2);
    const tgt = startPos.clone().lerp(endPos, s);
    camera.position.lerp(tgt, 0.06);
    const lookY = 1.8 - s * 1.2;
    camera.lookAt(0, lookY, 0);
    if ("fov" in camera) {
      const persp = camera as THREE.PerspectiveCamera;
      const targetFov = 38 - s * 16;
      persp.fov += (targetFov - persp.fov) * 0.08;
      persp.updateProjectionMatrix();
    }
  });
  // ensure camera respects size on resize
  useEffect(() => {
    if ("aspect" in camera) {
      const persp = camera as THREE.PerspectiveCamera;
      persp.aspect = size.width / size.height;
      persp.updateProjectionMatrix();
    }
  }, [size, camera]);
  return null;
}

/* ---------- Floating particles ---------- */
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 36;
      arr[i * 3 + 1] = Math.random() * 14 - 1.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#CCFF00" transparent opacity={0.5} toneMapped={false} />
    </points>
  );
}

/* ---------- Public API ---------- */
export function LegoCity({
  pulse = 0,
  count = 90,
  scrollRef,
}: {
  pulse?: number;
  count?: number;
  scrollRef: React.MutableRefObject<number>;
}) {
  const blocks = useCity(7, count);

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [11, 9, 11], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={["#020409"]} />
        <fog attach="fog" args={["#020409", 16, 44]} />
        <ambientLight intensity={0.28} color="#4060a0" />
        <directionalLight position={[8, 14, 6]} intensity={1.1} color="#00F2FF" castShadow />
        <directionalLight position={[-10, 8, -6]} intensity={0.55} color="#CCFF00" />

        <InfiniteFloor />
        <Particles />

        <group>
          {blocks.map((b, i) => (
            <Building key={i} block={b} pulse={pulse} />
          ))}
        </group>
        <DependencyEdges blocks={blocks} />
        <DataPulses blocks={blocks} />
        <KyraCore />
        <OrbitingAgent />

        <CameraRig scrollRef={scrollRef} />

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={1.0}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          <ChromaticAberration
            offset={new THREE.Vector2(0.0012, 0.0018)}
            radialModulation
            modulationOffset={0.3}
            blendFunction={BlendFunction.NORMAL}
          />
          <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
