import { useLogo3DBase } from '@kodan-apps/ui-core';
import * as THREE from 'three';

interface LogoCRM3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoCRM3D({ size = 48, theme }: LogoCRM3DProps) {
  const mountRef = useLogo3DBase({
    size,
    theme,
    primaryColor: theme === 'light' ? '#0059ba' : '#acc7ff',
    secondaryColor: theme === 'light' ? '#2372df' : '#0059ba',
    buildContent: (group, { isLight, primary }) => {
      // ── Hexagon ──────────────────────────────────────────────────────
      const hexShape = new THREE.Shape();
      const sides = 6;
      const radius = 1.0;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }
      hexShape.closePath();

      const hexGeometry = new THREE.ExtrudeGeometry(hexShape, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: 0.05,
        bevelThickness: 0.05,
      });
      hexGeometry.center();

      const mainMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        roughness: isLight ? 0.25 : 0.12,
        metalness: isLight ? 0.1 : 0.88,
      });

      const hexMesh = new THREE.Mesh(hexGeometry, mainMaterial);
      group.add(hexMesh);

      // ── Checkmark ────────────────────────────────────────────────────
      const checkShape = new THREE.Shape();
      checkShape.moveTo(-0.35, 0.0);
      checkShape.lineTo(-0.1, -0.25);
      checkShape.lineTo(0.4, 0.25);
      checkShape.lineTo(0.25, 0.35);
      checkShape.lineTo(-0.1, 0.0);
      checkShape.lineTo(-0.25, 0.15);
      checkShape.closePath();

      const checkGeometry = new THREE.ExtrudeGeometry(checkShape, {
        depth: 0.1,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      });
      checkGeometry.center();

      const checkMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        roughness: isLight ? 0.25 : 0.08,
        metalness: isLight ? 0.1 : 0.92,
      });

      const checkMesh = new THREE.Mesh(checkGeometry, checkMaterial);
      checkMesh.position.z = 0.18;
      group.add(checkMesh);

      return {
        cleanup: () => {
          hexGeometry.dispose();
          checkGeometry.dispose();
          mainMaterial.dispose();
          checkMaterial.dispose();
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
