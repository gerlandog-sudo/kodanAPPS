import { useLogo3DBase } from '@kodan-apps/ui-core';
import * as THREE from 'three';

interface LogoAdmin3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoAdmin3D({ size = 48, theme }: LogoAdmin3DProps) {
  const mountRef = useLogo3DBase({
    size,
    theme,
    primaryColor: theme === 'light' ? '#006a60' : '#81ffed',
    secondaryColor: '#62e2d1',
    buildContent: (group, { isLight, primary }) => {
      // ── 1. Screen plate (rounded rectangle) ──────────────────────────
      const screenShape = new THREE.Shape();
      const sx = -0.8;
      const sy = -0.6;
      const sw = 1.6;
      const sh = 1.2;
      const sr = 0.12;

      screenShape.moveTo(sx, sy + sr);
      screenShape.lineTo(sx, sy + sh - sr);
      screenShape.quadraticCurveTo(sx, sy + sh, sx + sr, sy + sh);
      screenShape.lineTo(sx + sw - sr, sy + sh);
      screenShape.quadraticCurveTo(sx + sw, sy + sh, sx + sw, sy + sh - sr);
      screenShape.lineTo(sx + sw, sy + sr);
      screenShape.quadraticCurveTo(sx + sw, sy, sx + sw - sr, sy);
      screenShape.lineTo(sx + sr, sy);
      screenShape.quadraticCurveTo(sx, sy, sx, sy + sr);
      screenShape.closePath();

      const screenGeometry = new THREE.ExtrudeGeometry(screenShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.03,
      });
      screenGeometry.center();

      const mainMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        roughness: isLight ? 0.25 : 0.12,
        metalness: isLight ? 0.1 : 0.88,
      });
      const screenMesh = new THREE.Mesh(screenGeometry, mainMaterial);
      group.add(screenMesh);

      // ── 2. Window control dots (red, yellow, green) ──────────────────
      const dotGeometry = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16);
      dotGeometry.rotateX(Math.PI / 2);

      const redMaterial = new THREE.MeshStandardMaterial({ color: '#ff5f56', roughness: 0.2, metalness: 0.1 });
      const yellowMaterial = new THREE.MeshStandardMaterial({ color: '#ffbd2e', roughness: 0.2, metalness: 0.1 });
      const greenMaterial = new THREE.MeshStandardMaterial({ color: '#27c93f', roughness: 0.2, metalness: 0.1 });

      const redDot = new THREE.Mesh(dotGeometry, redMaterial);
      redDot.position.set(-0.56, 0.42, 0.09);
      group.add(redDot);

      const yellowDot = new THREE.Mesh(dotGeometry, yellowMaterial);
      yellowDot.position.set(-0.44, 0.42, 0.09);
      group.add(yellowDot);

      const greenDot = new THREE.Mesh(dotGeometry, greenMaterial);
      greenDot.position.set(-0.32, 0.42, 0.09);
      group.add(greenDot);

      // ── 3. Chevron shape (>) ─────────────────────────────────────────
      const chevronShape = new THREE.Shape();
      chevronShape.moveTo(-0.35, 0.22);
      chevronShape.lineTo(-0.1, 0.0);
      chevronShape.lineTo(-0.35, -0.22);
      chevronShape.lineTo(-0.23, -0.22);
      chevronShape.lineTo(0.02, 0.0);
      chevronShape.lineTo(-0.23, 0.22);
      chevronShape.closePath();

      const chevronGeometry = new THREE.ExtrudeGeometry(chevronShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
      chevronGeometry.center();

      const whiteMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isLight ? '#ffffff' : '#f8fafc'),
        roughness: isLight ? 0.25 : 0.08,
        metalness: isLight ? 0.1 : 0.92,
      });

      const chevronMesh = new THREE.Mesh(chevronGeometry, whiteMaterial);
      chevronMesh.position.set(-0.25, -0.05, 0.09);
      group.add(chevronMesh);

      // ── 4. Cursor shape (_) with blinking ────────────────────────────
      const cursorShape = new THREE.Shape();
      cursorShape.moveTo(-0.14, -0.03);
      cursorShape.lineTo(0.14, -0.03);
      cursorShape.lineTo(0.14, 0.03);
      cursorShape.lineTo(-0.14, 0.03);
      cursorShape.closePath();

      const cursorGeometry = new THREE.ExtrudeGeometry(cursorShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
      cursorGeometry.center();

      const cursorMesh = new THREE.Mesh(cursorGeometry, whiteMaterial);
      cursorMesh.position.set(0.2, -0.2, 0.09);
      group.add(cursorMesh);

      return {
        onFrame: (elapsed: number) => {
          const isCursorVisible = Math.floor(elapsed * 2.5) % 2 === 0;
          if (cursorMesh.visible !== isCursorVisible) {
            cursorMesh.visible = isCursorVisible;
            return true; // needsRender
          }
          return false;
        },
        cleanup: () => {
          screenGeometry.dispose();
          dotGeometry.dispose();
          chevronGeometry.dispose();
          cursorGeometry.dispose();
          mainMaterial.dispose();
          whiteMaterial.dispose();
          redMaterial.dispose();
          yellowMaterial.dispose();
          greenMaterial.dispose();
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
