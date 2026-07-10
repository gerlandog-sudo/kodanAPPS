import { useLogo3DBase } from '@kodan-apps/ui-core';
import * as THREE from 'three';

interface LogoTRACKER3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoTRACKER3D({ size = 48, theme }: LogoTRACKER3DProps) {
  const mountRef = useLogo3DBase({
    size,
    theme,
    primaryColor: theme === 'light' ? '#00694e' : '#83d7b5',
    secondaryColor: theme === 'light' ? '#008563' : '#00694e',
    buildContent: (group, { isLight, primary }) => {
      // ── Shared main material ─────────────────────────────────────────
      const mainMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        roughness: isLight ? 0.25 : 0.12,
        metalness: isLight ? 0.1 : 0.88,
      });

      // ── Outer ring (magnifying glass body) ───────────────────────────
      const outerRingShape = new THREE.Shape();
      outerRingShape.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
      const outerRingHole = new THREE.Path();
      outerRingHole.absarc(0, 0, 0.84, 0, Math.PI * 2, true);
      outerRingShape.holes.push(outerRingHole);

      const outerRingGeometry = new THREE.ExtrudeGeometry(outerRingShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.03,
      });
      outerRingGeometry.center();
      const outerRingMesh = new THREE.Mesh(outerRingGeometry, mainMaterial);
      group.add(outerRingMesh);

      // ── Handle (capsule in diagonal) ─────────────────────────────────
      const handleShape = new THREE.Shape();
      const hw = 0.09;
      const len = 0.5;
      handleShape.moveTo(-hw, 0);
      handleShape.lineTo(-hw, -len);
      handleShape.absarc(0, -len, hw, Math.PI, 0, true);
      handleShape.lineTo(hw, 0);
      handleShape.absarc(0, 0, hw, 0, Math.PI, true);

      const handleGeometry = new THREE.ExtrudeGeometry(handleShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      handleGeometry.center();
      const handleMesh = new THREE.Mesh(handleGeometry, mainMaterial);
      handleMesh.rotation.z = -Math.PI / 4;
      handleMesh.position.set(0.65, -0.65, 0);
      group.add(handleMesh);

      // ── Inner ring (watch face) ──────────────────────────────────────
      const innerRingShape = new THREE.Shape();
      innerRingShape.absarc(0, 0, 0.72, 0, Math.PI * 2, false);
      const innerRingHole = new THREE.Path();
      innerRingHole.absarc(0, 0, 0.64, 0, Math.PI * 2, true);
      innerRingShape.holes.push(innerRingHole);

      const innerRingGeometry = new THREE.ExtrudeGeometry(innerRingShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      innerRingGeometry.center();
      const innerRingMesh = new THREE.Mesh(innerRingGeometry, mainMaterial);
      innerRingMesh.position.z = 0.02;
      group.add(innerRingMesh);

      // ── Watch hands ──────────────────────────────────────────────────
      const handsMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isLight ? '#ffffff' : '#f8fafc'),
        roughness: isLight ? 0.25 : 0.08,
        metalness: isLight ? 0.1 : 0.92,
      });

      const handW = 0.028;

      // Minute hand (long, vertical)
      const handLongShape = new THREE.Shape();
      const hlen = 0.36;
      handLongShape.moveTo(-handW, 0);
      handLongShape.lineTo(-handW, hlen);
      handLongShape.absarc(0, hlen, handW, Math.PI, 0, true);
      handLongShape.lineTo(handW, 0);
      handLongShape.absarc(0, 0, handW, 0, Math.PI, true);

      const handLongGeometry = new THREE.ExtrudeGeometry(handLongShape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
      handLongGeometry.center();
      const handLongMesh = new THREE.Mesh(handLongGeometry, handsMaterial);
      handLongMesh.position.set(0, hlen / 2, 0.10);
      group.add(handLongMesh);

      // Hour hand (short, diagonal ~7:30)
      const handShortShape = new THREE.Shape();
      const hlenShort = 0.22;
      handShortShape.moveTo(-handW, 0);
      handShortShape.lineTo(-handW, hlenShort);
      handShortShape.absarc(0, hlenShort, handW, Math.PI, 0, true);
      handShortShape.lineTo(handW, 0);
      handShortShape.absarc(0, 0, handW, 0, Math.PI, true);

      const handShortGeometry = new THREE.ExtrudeGeometry(handShortShape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
      handShortGeometry.center();
      const handShortMesh = new THREE.Mesh(handShortGeometry, handsMaterial);
      const angleShort = -Math.PI * 0.70;
      handShortMesh.rotation.z = angleShort;
      const distToCenter = hlenShort / 2;
      handShortMesh.position.set(
        Math.sin(-angleShort) * distToCenter,
        Math.cos(-angleShort) * distToCenter,
        0.09,
      );
      group.add(handShortMesh);

      // Center pivot
      const pivotShape = new THREE.Shape();
      pivotShape.absarc(0, 0, 0.06, 0, Math.PI * 2);
      const pivotGeometry = new THREE.ExtrudeGeometry(pivotShape, {
        depth: 0.09,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
      pivotGeometry.center();
      const pivotMesh = new THREE.Mesh(pivotGeometry, handsMaterial);
      pivotMesh.position.z = 0.12;
      group.add(pivotMesh);

      return {
        cleanup: () => {
          outerRingGeometry.dispose();
          handleGeometry.dispose();
          innerRingGeometry.dispose();
          handLongGeometry.dispose();
          handShortGeometry.dispose();
          pivotGeometry.dispose();
          mainMaterial.dispose();
          handsMaterial.dispose();
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
