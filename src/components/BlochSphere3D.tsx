"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface BlochSphereProps {
  x: number;
  y: number;
  z: number;
}

const BlochVector = ({ x, y, z }: BlochSphereProps) => {
  const arrowRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (arrowRef.current) {
      // Map Physics Coordinates to Three.js Rendering Space
      // Physics X -> Three.js X
      // Physics Z (up/down poles) -> Three.js Y
      // Physics Y (imaginary phase) -> Three.js Z
      const target = new THREE.Vector3(x, z, y);
      
      const up = new THREE.Vector3(0, 1, 0);
      let targetNormal;
      if (target.lengthSq() < 0.0001) {
        targetNormal = new THREE.Vector3(0, 1, 0);
      } else {
        targetNormal = target.clone().normalize();
      }
      
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, targetNormal);
      arrowRef.current.quaternion.slerp(quaternion, 0.1);
    }
  });

  return (
    <group ref={arrowRef}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1, 16]} />
        <meshBasicMaterial color="#00F0FF" />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <coneGeometry args={[0.1, 0.25, 16]} />
        <meshBasicMaterial color="#dfb7ff" />
      </mesh>
      <pointLight position={[0, 1, 0]} color="#dfb7ff" distance={3} intensity={5} />
    </group>
  );
};

export default function BlochSphere3D({ x, y, z }: BlochSphereProps) {
  return (
    <Canvas camera={{ position: [2.0, 1.0, 2.0], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#00F0FF" />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#dfb7ff" />
      
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      
      <Sphere args={[1, 32, 32]}>
        <meshBasicMaterial 
          color="#00F0FF" 
          wireframe 
          transparent 
          opacity={0.3} 
        />
      </Sphere>

      <Sphere args={[0.03, 16, 16]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </Sphere>

      {/* Axis lines via stable cylinders instead of Line to prevent WebGL crash */}
      {/* X Axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
      {/* Y Axis */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
      {/* Z Axis */}
      <mesh>
        <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      <Html position={[0, 1.3, 0]} center>
        <div style={{ color: '#00F0FF', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold' }}>|0⟩</div>
      </Html>
      <Html position={[0, -1.3, 0]} center>
        <div style={{ color: '#00F0FF', fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold' }}>|1⟩</div>
      </Html>
      
      <Html position={[1.3, 0, 0]} center>
        <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'monospace', opacity: 0.6 }}>Y</div>
      </Html>
      <Html position={[-1.3, 0, 0]} center>
        <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'monospace', opacity: 0.6 }}>-Y</div>
      </Html>
      
      <Html position={[0, 0, 1.3]} center>
        <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'monospace', opacity: 0.6 }}>Y</div>
      </Html>
      <Html position={[0, 0, -1.3]} center>
        <div style={{ color: '#ffffff', fontSize: '12px', fontFamily: 'monospace', opacity: 0.6 }}>-X</div>
      </Html>

      {/* Equator Plane */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.99, 1.01, 64]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <BlochVector x={x} y={y} z={z} />
    </Canvas>
  );
}
