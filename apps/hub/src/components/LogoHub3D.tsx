import { useLogo3DBase } from '@kodan-apps/ui-core';
import * as THREE from 'three';

interface LogoHub3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoHub3D({ size = 48, theme = 'dark' }: LogoHub3DProps) {
  const mountRef = useLogo3DBase({
    size,
    theme,
    primaryColor: theme === 'light' ? '#006a60' : '#81ffed',
    secondaryColor: '#62e2d1',
    buildContent: (group, { isLight, primary }) => {
      // ── 1. Esfera Central (Portal Neural) ─────────────────────────────
      const sphereGeometry = new THREE.SphereGeometry(0.46, 32, 32);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        roughness: isLight ? 0.25 : 0.12,
        metalness: isLight ? 0.1 : 0.88,
      });
      const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      group.add(sphereMesh);

      // ── 2. Grupo Orbital Inclinado ───────────────────────────────────
      const ringGroup = new THREE.Group();
      // Inclinación inicial para efecto de perspectiva orbital tridimensional
      ringGroup.rotation.x = Math.PI / 3;
      ringGroup.rotation.y = Math.PI / 8;
      group.add(ringGroup);

      // Anillo orbital (Toroide fino)
      const torusGeometry = new THREE.TorusGeometry(0.85, 0.035, 16, 100);
      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isLight ? '#475569' : '#f8fafc'),
        roughness: isLight ? 0.25 : 0.08,
        metalness: isLight ? 0.1 : 0.92,
      });
      const torusMesh = new THREE.Mesh(torusGeometry, whiteMaterial);
      ringGroup.add(torusMesh);

      // ── 3. Satélites Orbitales (Nodos de Servicios) ───────────────────
      const satelliteGeometry = new THREE.SphereGeometry(0.09, 16, 16);
      const numSatellites = 3;
      const radius = 0.85;

      for (let i = 0; i < numSatellites; i++) {
        const angle = (i / numSatellites) * Math.PI * 2;
        const satMesh = new THREE.Mesh(satelliteGeometry, whiteMaterial);
        satMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        ringGroup.add(satMesh);
      }

      return {
        onFrame: (elapsed) => {
          // Rotación continua de la órbita sobre su propio plano
          ringGroup.rotation.z = elapsed * 0.45;
          // Efecto de flotación libre senoidal de la esfera central
          sphereMesh.position.y = Math.sin(elapsed * 2.2) * 0.05;
          return true;
        },
        cleanup: () => {
          sphereGeometry.dispose();
          torusGeometry.dispose();
          satelliteGeometry.dispose();
          sphereMaterial.dispose();
          whiteMaterial.dispose();
        },
      };
    },
  });

  return (
    <div
      ref={mountRef}
      className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 shrink-0"
      style={{ width: size, height: size }}
    />
  );
}