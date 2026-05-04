import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useRanger } from "@/state/RangerContext";
import { Building } from "./Building";
import { Streets } from "./Streets";
import { AgentDrone } from "./AgentDrone";
import { GridFloor } from "./GridFloor";
import { DataPulses } from "./DataPulses";

export function RepoCityCanvas() {
  const { nodes, edges, phase, focusedNodeId, setFocusedNodeId } = useRanger();

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.45,
      }}
      camera={{ position: [14, 12, 14], fov: 45, near: 0.1, far: 200 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#070b18"]} />
      <fog attach="fog" args={["#070b18", 20, 60]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 14, 8]} intensity={0.65} castShadow />
      <pointLight position={[-12, 6, -10]} intensity={0.7} color="#a259ff" />
      <pointLight position={[12, 6, 12]} intensity={0.7} color="#3aa9ff" />

      <Suspense fallback={null}>
        <Stars radius={90} depth={50} count={2000} factor={3} saturation={0.5} fade speed={0.3} />

        <GridFloor />
        <DataPulses nodes={nodes} phase={phase} />
        <Streets edges={edges} nodes={nodes} />

        {nodes.map((node) => (
          <Building
            key={node.id}
            node={node}
            focused={focusedNodeId === node.id}
            phase={phase}
            onClick={(id) => setFocusedNodeId(id)}
          />
        ))}

        <AgentDrone phase={phase} nodes={nodes} focusedNodeId={focusedNodeId} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
