/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import type { RepoNode, NodeStatus } from "@/state/ranger-types";

const STATUS_COLOR: Record<NodeStatus, string> = {
  neutral: "#3aa9ff",
  healthy: "#3aa9ff",
  warning: "#ffb454",
  buggy: "#ff3b5c",
  fixed: "#3dffa0",
};

interface BuildingProps {
  node: RepoNode;
  focused: boolean;
  phase: string;
  onClick?: (id: string) => void;
}

export function Building({ node, focused, phase, onClick }: BuildingProps) {
  const group = useRef<THREE.Group>(null);
  const status: NodeStatus = node.status ?? "neutral";
  const height = node.height ?? 3;
  const baseColor = STATUS_COLOR[status];

  const bricks = useMemo(
    () => Array.from({ length: height }, (_, i) => ({ y: i * 0.55 + 0.275 })),
    [height],
  );

  const mountTime = useRef<number | null>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    if (mountTime.current === null) mountTime.current = t;
    const age = t - mountTime.current;
    const intro = Math.min(1, age / 0.6);
    const eased = 1 - Math.pow(1 - intro, 3);
    const introY = (1 - eased) * 6;

    // Fixed buildings float a little higher and bob more calmly
    const hoverAmp = status === "fixed" ? 0.06 : 0.04;
    const hoverFreq = status === "fixed" ? 0.7 : 1.2;
    const hover = Math.sin(t * hoverFreq + node.x + node.z) * hoverAmp;
    const lift = status === "fixed" ? 0.35 : 0;

    group.current.scale.setScalar(0.4 + eased * 0.6);
    group.current.position.y = hover + lift + (focused ? 0.2 : 0) + introY;
  });

  // Fixed buildings are solid and fully lit; others stay translucent
  const opacity = status === "fixed" ? 0.88 : 0.58;
  const emissiveIntensity =
    status === "fixed" ? 1.8 : status === "buggy" ? 1.6 : focused ? 1.0 : 0.45;
  const isActive = status === "buggy" || status === "fixed" || focused;

  return (
    <group
      ref={group}
      position={[node.x * 1.6, 0, node.z * 1.6]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(node.id);
      }}
    >
      {bricks.map((b, i) => (
        <group key={i}>
          <mesh position={[0, b.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.5, 1.1]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity}
              transparent
              opacity={opacity}
              roughness={status === "fixed" ? 0.08 : 0.22}
              metalness={status === "fixed" ? 0.35 : 0.12}
            />
            <Edges color={baseColor} threshold={15} />
          </mesh>
          {/* Lego stud */}
          <mesh position={[0, b.y + 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 8]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity * 0.85}
              transparent
              opacity={opacity + 0.05}
              roughness={0.18}
              metalness={0.15}
            />
          </mesh>
        </group>
      ))}

      {isActive && (
        <pointLight
          color={baseColor}
          intensity={status === "fixed" ? 6 : status === "buggy" ? 6 : 3}
          distance={status === "fixed" ? 14 : 10}
          position={[0, height * 0.55 + 0.6, 0]}
        />
      )}

      {status === "buggy" && <PulseHalo color={baseColor} />}
      {status === "fixed" && <FixedCelebration height={height} color={baseColor} />}
      {focused && status !== "fixed" && <FocusRing color={baseColor} />}
    </group>
  );
}

/** Buggy state: pulsing red ring at base */
function PulseHalo({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = 1 + (Math.sin(t * 3) + 1) * 0.35;
    ref.current.scale.set(s, 1, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity =
      0.35 - (Math.sin(t * 3) + 1) * 0.12;
  });
  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 1.1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </mesh>
  );
}

/** Fixed state: rising rings + vertical victory beacon */
function FixedCelebration({ height, color }: { height: number; color: string }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);

  const topY = height * 0.55;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Two rings rising from base to top, offset by half cycle
    const cycle = 1.4; // seconds per loop
    const p1 = (t / cycle) % 1;
    const p2 = ((t / cycle) + 0.5) % 1;

    if (ring1.current) {
      const scale = 1 + p1 * 1.8;
      ring1.current.scale.set(scale, 1, scale);
      ring1.current.position.y = p1 * topY;
      (ring1.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p1);
    }
    if (ring2.current) {
      const scale = 1 + p2 * 1.8;
      ring2.current.scale.set(scale, 1, scale);
      ring2.current.position.y = p2 * topY;
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - p2);
    }

    // Beacon beam slowly pulses in brightness
    if (beam.current) {
      (beam.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(t * 2.5) * 0.06;
    }
  });

  const beamHeight = 12;

  return (
    <group>
      {/* Rising ring 1 */}
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.85, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Rising ring 2 — offset phase */}
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.85, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Vertical beacon beam from top of building upward */}
      <mesh
        ref={beam}
        position={[0, topY + beamHeight / 2, 0]}
      >
        <cylinderGeometry args={[0.06, 0.45, beamHeight, 10, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Bright cap at top of building */}
      <mesh position={[0, topY + 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0.55, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FocusRing({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.z += dt * 0.6;
  });
  return (
    <mesh ref={ref} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.28, 6, 1]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}
