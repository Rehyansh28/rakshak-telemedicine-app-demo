import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

const MODEL_PATH = '/models/human.glb';

/** Hotspot positions for the standing human rig (feet on floor via Center top). */
const ORGANS = [
  { id: 'brain', label: 'Brain', position: [0, 1.58, 0.1], color: '#00eefc' },
  { id: 'heart', label: 'Heart', position: [0.1, 1.18, 0.14], color: '#ba1a1a' },
  { id: 'lungs', label: 'Lungs', position: [0, 1.24, 0.12], color: '#5398eb' },
  { id: 'chest', label: 'Chest', position: [0, 1.05, 0.16], color: '#00dbe9' },
  { id: 'arms', label: 'Arms', position: [0.5, 0.95, 0.05], color: '#006970' },
  { id: 'legs', label: 'Legs', position: [0, 0.42, 0.08], color: '#002d62' },
  { id: 'nose', label: 'Respiration', position: [0, 1.38, 0.18], color: '#7df4ff' },
];

function applyHologramMaterial(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const next = materials.map((mat) => {
      const hologram = mat.clone();
      hologram.transparent = true;
      hologram.opacity = 0.94;
      hologram.emissive = new THREE.Color('#00eefc');
      hologram.emissiveIntensity = 0.06;
      hologram.metalness = Math.min(hologram.metalness ?? 0, 0.25);
      hologram.roughness = Math.max(hologram.roughness ?? 0.5, 0.55);
      hologram.depthWrite = true;
      return hologram;
    });
    child.material = next.length === 1 ? next[0] : next;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function RealisticHuman({ scale = 1 }) {
  const { scene } = useGLTF(MODEL_PATH);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    applyHologramMaterial(clone);
    return clone;
  }, [scene]);

  return <primitive object={model} scale={scale} />;
}

function BodyScene({ onOrganClick, activeOrgan }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={groupRef}>
      <Center top>
        <RealisticHuman scale={1.05} />
      </Center>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.55, 0.72, 48]} />
        <meshBasicMaterial color="#00eefc" transparent opacity={0.22} side={THREE.DoubleSide} />
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
        <sphereGeometry args={[active ? 0.1 : 0.07, 16, 16]} />
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

function LoadingFallback() {
  return (
    <Html center>
      <span className="label-caps text-[10px] text-on-surface-variant bg-white/90 px-3 py-1.5 rounded-full">
        Loading AR body scan…
      </span>
    </Html>
  );
}

useGLTF.preload(MODEL_PATH);

export default function HumanBody3D({ onOrganClick, activeOrgan }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-surface-container-low to-white border border-secondary/10"
    >
      <Canvas camera={{ position: [0, 0.35, 2.6], fov: 42 }} shadows>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow />
        <pointLight position={[2, 2, 2]} intensity={0.85} color="#00eefc" />
        <pointLight position={[-2, 1, -1]} intensity={0.45} color="#002d62" />
        <Suspense fallback={<LoadingFallback />}>
          <BodyScene onOrganClick={onOrganClick} activeOrgan={activeOrgan} />
        </Suspense>
        <OrbitControls
          enableZoom
          enablePan={false}
          target={[0, 0.85, 0]}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.6}
        />
      </Canvas>
    </motion.div>
  );
}
