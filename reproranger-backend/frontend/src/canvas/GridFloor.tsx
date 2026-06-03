/**
 * Kyro — Autonomous AI Code Repair Engine
 * Copyright © 2026 Anish Chugh. All rights reserved.
 * Version 1.0.0 | June 2026
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */
import { useMemo } from "react";
import * as THREE from "three";

/** Glowing isometric grid floor with subtle radial fade. */
export function GridFloor() {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#0a1428",
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={material}>
        <planeGeometry args={[200, 200]} />
      </mesh>
      <gridHelper args={[200, 80, "#3aa9ff", "#1a3a66"]} position={[0, 0, 0]} />
    </group>
  );
}
