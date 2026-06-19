import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface LogoAdmin3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoAdmin3D({ size = 48, theme }: LogoAdmin3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    mountRef.current.innerHTML = '';

    const element = mountRef.current;
    const width = size;
    const height = size;

    // Detect dark/light theme
    const isLight = theme ? theme === 'light' : !document.documentElement.classList.contains('theme-dark');

    // Brand colors
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--sys-primary').trim() || '#006a60';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--sys-primary-container').trim() || '#62e2d1';

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);

    // 1. Screen Plate Geometry (Rounded Rectangle)
    const screenShape = new THREE.Shape();
    const px = -0.8;
    const py = -0.6;
    const pw = 1.6;
    const ph = 1.2;
    const pr = 0.12;
    
    screenShape.moveTo(px, py + pr);
    screenShape.lineTo(px, py + ph - pr);
    screenShape.quadraticCurveTo(px, py + ph, px + pr, py + ph);
    screenShape.lineTo(px + pw - pr, py + ph);
    screenShape.quadraticCurveTo(px + pw, py + ph, px + pw, py + ph - pr);
    screenShape.lineTo(px + pw, py + pr);
    screenShape.quadraticCurveTo(px + pw, py, px + pw - pr, py);
    screenShape.lineTo(px + pr, py);
    screenShape.quadraticCurveTo(px, py, px, py + pr);
    screenShape.closePath();

    const screenExtrudeSettings = {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    };
    const screenGeometry = new THREE.ExtrudeGeometry(screenShape, screenExtrudeSettings);
    screenGeometry.center();

    const mainMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: isLight ? 0.25 : 0.12,
      metalness: isLight ? 0.1 : 0.88,
    });
    const screenMesh = new THREE.Mesh(screenGeometry, mainMaterial);

    // 2. Window Control Dots (Red, Yellow, Green)
    const dotGeometry = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 16);
    dotGeometry.rotateX(Math.PI / 2); // face forward

    const redMaterial = new THREE.MeshStandardMaterial({ color: '#ff5f56', roughness: 0.2, metalness: 0.1 });
    const yellowMaterial = new THREE.MeshStandardMaterial({ color: '#ffbd2e', roughness: 0.2, metalness: 0.1 });
    const greenMaterial = new THREE.MeshStandardMaterial({ color: '#27c93f', roughness: 0.2, metalness: 0.1 });

    const redDot = new THREE.Mesh(dotGeometry, redMaterial);
    redDot.position.set(-0.56, 0.42, 0.09);

    const yellowDot = new THREE.Mesh(dotGeometry, yellowMaterial);
    yellowDot.position.set(-0.44, 0.42, 0.09);

    const greenDot = new THREE.Mesh(dotGeometry, greenMaterial);
    greenDot.position.set(-0.32, 0.42, 0.09);

    // 3. Chevron Shape (>)
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(-0.35, 0.22);
    chevronShape.lineTo(-0.1, 0.0);
    chevronShape.lineTo(-0.35, -0.22);
    chevronShape.lineTo(-0.23, -0.22);
    chevronShape.lineTo(0.02, 0.0);
    chevronShape.lineTo(-0.23, 0.22);
    chevronShape.closePath();

    const detailExtrudeSettings = {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.01,
      bevelThickness: 0.01,
    };
    
    const chevronGeometry = new THREE.ExtrudeGeometry(chevronShape, detailExtrudeSettings);
    chevronGeometry.center();

    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isLight ? '#ffffff' : '#f8fafc'),
      roughness: isLight ? 0.25 : 0.08,
      metalness: isLight ? 0.1 : 0.92,
    });

    const chevronMesh = new THREE.Mesh(chevronGeometry, whiteMaterial);
    chevronMesh.position.set(-0.25, -0.05, 0.09);

    // 4. Cursor Shape (_)
    const cursorShape = new THREE.Shape();
    cursorShape.moveTo(-0.14, -0.03);
    cursorShape.lineTo(0.14, -0.03);
    cursorShape.lineTo(0.14, 0.03);
    cursorShape.lineTo(-0.14, 0.03);
    cursorShape.closePath();

    const cursorGeometry = new THREE.ExtrudeGeometry(cursorShape, detailExtrudeSettings);
    cursorGeometry.center();

    const cursorMesh = new THREE.Mesh(cursorGeometry, whiteMaterial);
    cursorMesh.position.set(0.2, -0.2, 0.09);

    // Grouping
    const group = new THREE.Group();
    group.add(screenMesh);
    group.add(redDot);
    group.add(yellowDot);
    group.add(greenDot);
    group.add(chevronMesh);
    group.add(cursorMesh);
    scene.add(group);

    // Initial position/tilt
    group.rotation.x = 0.25;
    group.rotation.y = -0.3;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 2.8 : 1.8);
    dirLight.position.set(3, 4, 6);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(new THREE.Color(secondary), isLight ? 5.5 : 3.5, 8);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Rendering loop
    let animationFrameId: number | null = null;
    let targetRotationX = 0.25;
    let targetRotationY = -0.3;
    let isAnimating = false;

    const animate = () => {
      let needsRender = false;

      // Parallax smooth transition
      if (Math.abs(targetRotationX - group.rotation.x) > 0.001) {
        group.rotation.x += (targetRotationX - group.rotation.x) * 0.1;
        needsRender = true;
      }

      if (!isHovered.current && Math.abs(targetRotationY - group.rotation.y) > 0.001) {
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.1;
        needsRender = true;
      }

      // Continuous blinking cursor (renders on state change)
      const elapsed = Date.now() * 0.001;
      const isCursorVisible = Math.floor(elapsed * 2.5) % 2 === 0;
      if (cursorMesh.visible !== isCursorVisible) {
        cursorMesh.visible = isCursorVisible;
        needsRender = true;
      }

      // Pointlight motion on Hover
      if (isHovered.current) {
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

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const xVal = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yVal = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      pointLight.position.x = xVal * 2.5;
      pointLight.position.y = yVal * 2.5;

      if (!isHovered.current) {
        targetRotationY = xVal * 0.35 - 0.3;
        targetRotationX = -yVal * 0.35 + 0.25;
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
      screenGeometry.dispose();
      dotGeometry.dispose();
      chevronGeometry.dispose();
      cursorGeometry.dispose();
      mainMaterial.dispose();
      whiteMaterial.dispose();
      redMaterial.dispose();
      yellowMaterial.dispose();
      greenMaterial.dispose();
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
