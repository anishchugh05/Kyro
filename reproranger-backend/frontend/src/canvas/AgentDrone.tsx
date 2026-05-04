import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AgentPhase, RepoNode } from "@/state/ranger-types";

interface AgentDroneProps {
  phase: AgentPhase;
  nodes: RepoNode[];
  focusedNodeId: string | null;
}

/**
 * The Kyro_Core drone. Glowing sphere that orbits the city
 * and homes onto the focused building during targeting / repairing.
 */
export function AgentDrone({ phase, nodes, focusedNodeId }: AgentDroneProps) {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => {
    const focused = nodes.find((n) => n.id === focusedNodeId);
    return focused ?? null;
  }, [nodes, focusedNodeId]);

  // Internal current position (smoothly lerped)
  const current = useRef(new THREE.Vector3(0, 4, 0));

  useFrame((state, dt) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;

    let desired: THREE.Vector3;
    if ((phase === "targeting" || phase === "repairing") && target) {
      const tx = target.x * 1.6;
      const tz = target.z * 1.6;
      const ty = (target.height ?? 3) * 0.55 + 1.2;
      desired = new THREE.Vector3(tx, ty + Math.sin(t * 2) * 0.1, tz);
    } else if (phase === "exploring" || phase === "complete") {
      // Lazy orbit
      const r = 6;
      desired = new THREE.Vector3(
        Math.cos(t * 0.4) * r,
        2.2 + Math.sin(t * 0.8) * 0.3,
        Math.sin(t * 0.4) * r,
      );
    } else {
      // idle / assembly — float above origin
      desired = new THREE.Vector3(0, 4 + Math.sin(t) * 0.3, 0);
    }

    current.current.lerp(desired, Math.min(1, dt * 2.2));
    group.current.position.copy(current.current);
    group.current.rotation.y += dt * 0.6;
  });

  const repairing = phase === "repairing";

  return (
    <group ref={group}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial
          color="#9ce8ff"
          emissive="#3aa9ff"
          emissiveIntensity={2.4}
          roughness={0.2}
          metalness={0.4}
        />
      </mesh>
      {/* Outer glow shell */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#3aa9ff" transparent opacity={0.18} />
      </mesh>
      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <torusGeometry args={[0.7, 0.012, 8, 64]} />
        <meshBasicMaterial color="#3aa9ff" transparent opacity={0.55} />
      </mesh>
      <pointLight color="#3aa9ff" intensity={2.5} distance={6} />

      {repairing && target && (
        <RepairBeam
          length={Math.max(
            0.5,
            current.current.distanceTo(
              new THREE.Vector3(target.x * 1.6, ((target.height ?? 3) * 0.55) / 2, target.z * 1.6),
            ),
          )}
          targetWorld={
            new THREE.Vector3(target.x * 1.6, ((target.height ?? 3) * 0.55) / 2, target.z * 1.6)
          }
        />
      )}
    </group>
  );
}

/** A pulsing beam + particle stream from drone toward target. */
function RepairBeam({ length, targetWorld }: { length: number; targetWorld: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const PARTICLE_COUNT = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      arr[i * 3 + 2] = Math.random();
    }
    return arr;
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.45 + Math.sin(t * 8) * 0.25;
      const localTarget = ref.current.parent!.worldToLocal(targetWorld.clone());
      ref.current.lookAt(localTarget);
      ref.current.position.copy(localTarget.clone().multiplyScalar(0.5));
      ref.current.scale.set(1, 1, length);
    }
    if (particlesRef.current) {
      const localTarget = particlesRef.current.parent!.worldToLocal(targetWorld.clone());
      particlesRef.current.lookAt(localTarget);
      const geom = particlesRef.current.geometry as THREE.BufferGeometry;
      const pos = geom.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let z = pos.getZ(i) + dt * 1.5;
        if (z > 1) z = 0;
        pos.setZ(i, z);
        // re-jitter xy slightly
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.01);
        pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.01);
      }
      pos.needsUpdate = true;
      particlesRef.current.scale.set(1, 1, length);
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <cylinderGeometry args={[0.04, 0.12, 1, 12, 1, true]} />
        <meshBasicMaterial
          color="#3aa9ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={PARTICLE_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#9ce8ff"
          size={0.08}
          transparent
          opacity={0.9}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
