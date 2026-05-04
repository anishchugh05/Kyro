import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RepoNode } from "@/state/ranger-types";

interface DataPulsesProps {
  nodes: RepoNode[];
  phase: string;
}

/** Glowing data packets that travel from the city centre to each tower during scan phases. */
export function DataPulses({ nodes, phase }: DataPulsesProps) {
  const active = phase === "assembly" || phase === "exploring" || phase === "targeting";
  if (!active || nodes.length === 0) return null;
  return (
    <>
      {nodes.slice(0, 12).map((node, i) => (
        <Pulse key={node.id} node={node} phaseOffset={i / Math.max(nodes.length, 1)} />
      ))}
    </>
  );
}

function Pulse({ node, phaseOffset }: { node: RepoNode; phaseOffset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const origin = useMemo(() => new THREE.Vector3(0, 0.14, 0), []);
  const dest = useMemo(
    () => new THREE.Vector3(node.x * 1.6, 0.14, node.z * 1.6),
    [node.x, node.z],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = (state.clock.elapsedTime * 0.55 + phaseOffset) % 1;
    tmp.lerpVectors(origin, dest, t);
    meshRef.current.position.copy(tmp);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = t < 0.12 ? t / 0.12 : t > 0.78 ? (1 - t) / 0.22 : 1;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 7, 7]} />
      <meshBasicMaterial color="#3aa9ff" transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}
