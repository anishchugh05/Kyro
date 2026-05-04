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
    group.current.scale.setScalar(0.4 + eased * 0.6);
    const hover = Math.sin(t * 1.2 + node.x + node.z) * 0.04;
    group.current.position.y = hover + (focused ? 0.2 : 0) + introY;
  });

  const emissiveIntensity =
    status === "buggy" ? 1.6 : status === "fixed" ? 1.2 : focused ? 1.0 : 0.45;
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
          {/* Brick body */}
          <mesh position={[0, b.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.5, 1.1]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity}
              transparent
              opacity={0.58}
              roughness={0.22}
              metalness={0.12}
            />
            <Edges color={baseColor} threshold={15} />
          </mesh>
          {/* Lego stud on top of each brick */}
          <mesh position={[0, b.y + 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 8]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={emissiveIntensity * 0.85}
              transparent
              opacity={0.72}
              roughness={0.18}
              metalness={0.15}
            />
          </mesh>
        </group>
      ))}

      {/* Neon point light — only on highlighted buildings to keep scene performant */}
      {isActive && (
        <pointLight
          color={baseColor}
          intensity={status === "buggy" ? 6 : status === "fixed" ? 4 : 3}
          distance={10}
          position={[0, height * 0.55 + 0.6, 0]}
        />
      )}

      {status === "buggy" && <PulseHalo color={baseColor} />}
      {focused && <FocusRing color={baseColor} />}
      <group visible={false} userData={{ phase }} />
    </group>
  );
}

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
