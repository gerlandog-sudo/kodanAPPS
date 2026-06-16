import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface Logo3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function Logo3D({ size = 48, theme }: Logo3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    mountRef.current.innerHTML = '';

    const element = mountRef.current;
    const width = size;
    const height = size;

    const isLight = theme ? theme === 'light' : document.documentElement.classList.contains('theme-dark') === false;
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--sys-primary').trim() || '#8b5cf6';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--sys-secondary').trim() || '#06b6d4';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);

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

    const extrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    };

    const geometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: isLight ? 0.25 : 0.12,
      metalness: isLight ? 0.1 : 0.88,
    });

    const hexMesh = new THREE.Mesh(geometry, material);

    const checkShape = new THREE.Shape();
    checkShape.moveTo(-0.35, 0.0);
    checkShape.lineTo(-0.1, -0.25);
    checkShape.lineTo(0.4, 0.25);
    checkShape.lineTo(0.25, 0.35);
    checkShape.lineTo(-0.1, 0.0);
    checkShape.lineTo(-0.25, 0.15);
    checkShape.closePath();

    const checkExtrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    };

    const checkGeometry = new THREE.ExtrudeGeometry(checkShape, checkExtrudeSettings);
    checkGeometry.center();

    const checkMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: isLight ? 0.25 : 0.08,
      metalness: isLight ? 0.1 : 0.92,
    });

    const checkMesh = new THREE.Mesh(checkGeometry, checkMaterial);
    checkMesh.position.z = 0.18;

    const group = new THREE.Group();
    group.add(hexMesh);
    group.add(checkMesh);
    scene.add(group);

    group.rotation.x = 0.25;
    group.rotation.y = -0.3;

    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 2.8 : 1.8);
    dirLight.position.set(3, 4, 6);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(new THREE.Color(secondary), isLight ? 5.5 : 3.5, 8);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    let animationFrameId: number | null = null;
    let targetRotationX = 0.25;
    let targetRotationY = -0.3;
    let isAnimating = false;

    const animate = () => {
      let needsRender = false;

      if (Math.abs(targetRotationX - group.rotation.x) > 0.001) {
        group.rotation.x += (targetRotationX - group.rotation.x) * 0.1;
        needsRender = true;
      }

      if (!isHovered.current && Math.abs(targetRotationY - group.rotation.y) > 0.001) {
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.1;
        needsRender = true;
      }

      if (isHovered.current) {
        const elapsed = Date.now() * 0.001;
        pointLight.position.x = Math.sin(elapsed) * 1.5;
        pointLight.position.y = Math.cos(elapsed) * 1.5;
        needsRender = true;
      }

      if (needsRender || gsap.isTweening(group.rotation) || gsap.isTweening(pointLight)) {
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      } else {
        isAnimating = false;
        animationFrameId = null;
      }
    };

    const wakeUp = () => {
      if (!isAnimating) {
        isAnimating = true;
        animate();
      }
    };

    renderer.render(scene, camera);
    wakeUp();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      pointLight.position.x = x * 2.5;
      pointLight.position.y = y * 2.5;

      if (!isHovered.current) {
        targetRotationY = x * 0.35 - 0.3;
        targetRotationX = -y * 0.35 + 0.25;
      }
      wakeUp();
    };

    const handleMouseEnter = () => {
      isHovered.current = true;
      gsap.to(group.rotation, {
        y: group.rotation.y + Math.PI * 2,
        x: 0.25,
        duration: 2.8,
        ease: 'power2.out',
        onComplete: () => {
          isHovered.current = false;
          targetRotationY = -0.3;
          targetRotationX = 0.25;
        },
      });
      gsap.to(pointLight, { intensity: 4.5, duration: 0.6 });
      wakeUp();
    };

    const handleMouseLeave = () => {
      gsap.to(pointLight, { intensity: 3.5, duration: 0.6 });
      if (!isHovered.current) {
        targetRotationY = -0.3;
        targetRotationX = 0.25;
      }
      wakeUp();
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement);
      scene.clear();
      geometry.dispose();
      material.dispose();
      checkGeometry.dispose();
      checkMaterial.dispose();
      renderer.dispose();
    };
  }, [size, theme]);

  return (
    <div
      ref={mountRef}
      className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
