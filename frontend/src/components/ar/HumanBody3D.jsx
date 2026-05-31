import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const ORGANS = [
  { id: 'brain', label: 'Brain', position: [0, 1.55, 0.15], color: '#00eefc' },
  { id: 'heart', label: 'Heart', position: [0.12, 0.85, 0.2], color: '#ba1a1a' },
  { id: 'lungs', label: 'Lungs', position: [0, 0.9, 0.18], color: '#5398eb' },
  { id: 'chest', label: 'Chest', position: [0, 0.75, 0.22], color: '#00dbe9' },
  { id: 'arms', label: 'Arms', position: [0.55, 0.6, 0], color: '#006970' },
  { id: 'legs', label: 'Legs', position: [0, -0.35, 0.1], color: '#002d62' },
  { id: 'nose', label: 'Respiration', position: [0, 1.35, 0.25], color: '#7df4ff' },
];

function BodyMesh({ onOrganClick, activeOrgan }) {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.35, 0.7, 8, 16]} />
        <meshStandardMaterial color="#002d62" transparent opacity={0.35} wireframe />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#00eefc" transparent opacity={0.4} wireframe />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.5, 0.55, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#006970" transparent opacity={0.35} wireframe />
      </mesh>
      <mesh position={[0.5, 0.55, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#006970" transparent opacity={0.35} wireframe />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.18, -0.35, 0]}>
        <capsuleGeometry args={[0.1, 0.65, 4, 8]} />
        <meshStandardMaterial color="#002d62" transparent opacity={0.35} wireframe />
      </mesh>
      <mesh position={[0.18, -0.35, 0]}>
        <capsuleGeometry args={[0.1, 0.65, 4, 8]} />
        <meshStandardMaterial color="#002d62" transparent opacity={0.35} wireframe />
      </mesh>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[0.6, 0.75, 32]} />
        <meshBasicMaterial color="#00eefc" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {ORGANS.map((organ) => (
        <OrganHotspot
          key={organ.id}
          organ={organ}
          active={activeOrgan === organ.id}
          onClick={() => onOrganClick(organ.id)}
        />
      ))}
    </group>
  );
}

function OrganHotspot({ organ, active, onClick }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current && active) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={organ.position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[active ? 0.12 : 0.08, 16, 16]} />
        <meshStandardMaterial
          color={organ.color}
          emissive={organ.color}
          emissiveIntensity={active ? 1.2 : 0.6}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <span
          className={`label-caps text-[9px] whitespace-nowrap px-2 py-0.5 rounded-full ${
            active ? 'bg-secondary-container text-primary' : 'bg-white/80 text-primary'
          }`}
        >
          {organ.label}
        </span>
      </Html>
    </group>
  );
}

export default function HumanBody3D({ onOrganClick, activeOrgan }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-surface-container-low to-white border border-secondary/10"
    >
      <Canvas camera={{ position: [0, 0.8, 2.8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={1} color="#00eefc" />
        <pointLight position={[-2, 1, -1]} intensity={0.5} color="#002d62" />
        <BodyMesh onOrganClick={onOrganClick} activeOrgan={activeOrgan} />
        <OrbitControls enableZoom enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
      </Canvas>
    </motion.div>
  );
}
