import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RepoEdge, RepoNode } from "@/state/ranger-types";

interface StreetsProps {
  edges: RepoEdge[];
  nodes: RepoNode[];
}

/**
 * Glowing connection lines between buildings (dependencies).
 * Active edges get a subtle moving dash effect via opacity flicker.
 */
export function Streets({ edges, nodes }: StreetsProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, RepoNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const segments = useMemo(() => {
    return edges
      .map((e) => {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) return null;
        return {
          id: e.id,
          active: e.active ?? false,
          points: [
            new THREE.Vector3(a.x * 1.6, 0.02, a.z * 1.6),
            new THREE.Vector3(b.x * 1.6, 0.02, b.z * 1.6),
          ],
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      active: boolean;
      points: THREE.Vector3[];
    }>;
  }, [edges, nodeMap]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const line = child as THREE.LineSegments;
      const mat = line.material as THREE.LineBasicMaterial;
      const seg = segments[i];
      if (!seg) return;
      mat.opacity = seg.active ? 0.6 + Math.sin(t * 4 + i) * 0.3 : 0.25;
    });
  });

  return (
    <group ref={groupRef}>
      {segments.map((seg) => {
        const geo = new THREE.BufferGeometry().setFromPoints(seg.points);
        return (
          <lineSegments key={seg.id} geometry={geo}>
            <lineBasicMaterial
              color={seg.active ? "#3dffa0" : "#3aa9ff"}
              transparent
              opacity={0.3}
            />
          </lineSegments>
        );
      })}
    </group>
  );
}
