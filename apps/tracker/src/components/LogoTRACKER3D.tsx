import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface LogoTRACKER3DProps {
  size?: number;
  theme?: 'light' | 'dark';
}

export function LogoTRACKER3D({ size = 48, theme }: LogoTRACKER3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);

  useEffect(() => {
    if (!mountRef.current) return;

    mountRef.current.innerHTML = '';

    const element = mountRef.current;
    const width = size;
    const height = size;

    const isLight = theme === 'light';
    const primary = isLight ? '#00694e' : '#83d7b5';
    const secondary = isLight ? '#008563' : '#00694e';

    // 1. Escena, cámara y renderizador
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);

    // 2. Geometría - Aro Exterior de la Lupa
    const outerRingShape = new THREE.Shape();
    outerRingShape.absarc(0, 0, 1.0, 0, Math.PI * 2, false);
    const outerRingHole = new THREE.Path();
    outerRingHole.absarc(0, 0, 0.84, 0, Math.PI * 2, true);
    outerRingShape.holes.push(outerRingHole);

    const outerExtrudeSettings = {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    };
    const outerRingGeometry = new THREE.ExtrudeGeometry(outerRingShape, outerExtrudeSettings);
    outerRingGeometry.center();

    // Material de la Lupa (Cuerpo principal)
    const mainMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: isLight ? 0.25 : 0.12,
      metalness: isLight ? 0.1 : 0.88,
    });

    const outerRingMesh = new THREE.Mesh(outerRingGeometry, mainMaterial);

    // 3. Geometría - Mango de la Lupa (Cápsula colocada en diagonal)
    const handleShape = new THREE.Shape();
    const w = 0.09; // Mitad del ancho del mango
    const len = 0.5; // Largo del mango
    handleShape.moveTo(-w, 0);
    handleShape.lineTo(-w, -len);
    handleShape.absarc(0, -len, w, Math.PI, 0, true);
    handleShape.lineTo(w, 0);
    handleShape.absarc(0, 0, w, 0, Math.PI, true);

    const handleExtrudeSettings = {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };
    const handleGeometry = new THREE.ExtrudeGeometry(handleShape, handleExtrudeSettings);
    handleGeometry.center();

    const handleMesh = new THREE.Mesh(handleGeometry, mainMaterial);
    
    // Rotar -45 grados (abajo a la derecha) y posicionar en el borde exterior
    handleMesh.rotation.z = -Math.PI / 4;
    // El origen de la cápsula es su centro geométrico tras centrarla.
    // Necesitamos desplazarla para que encaje como el mango de la lupa.
    // La dirección del mango en -45° es (0.707, -0.707).
    // Con la geometría centrada, el mango mide 0.5 + 2*w (aprox 0.68) en Y.
    // Lo movemos para conectarlo con el aro (radio ~0.92)
    handleMesh.position.set(0.65, -0.65, 0);

    // 4. Geometría - Aro Interior del Reloj
    const innerRingShape = new THREE.Shape();
    innerRingShape.absarc(0, 0, 0.72, 0, Math.PI * 2, false);
    const innerRingHole = new THREE.Path();
    innerRingHole.absarc(0, 0, 0.64, 0, Math.PI * 2, true);
    innerRingShape.holes.push(innerRingHole);

    const innerExtrudeSettings = {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };
    const innerRingGeometry = new THREE.ExtrudeGeometry(innerRingShape, innerExtrudeSettings);
    innerRingGeometry.center();

    const innerRingMesh = new THREE.Mesh(innerRingGeometry, mainMaterial);
    innerRingMesh.position.z = 0.02; // Ligeramente desplazado hacia el frente

    // 5. Geometría - Manecillas del Reloj (Blancas para contraste premium)
    const handsMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isLight ? '#ffffff' : '#f8fafc'),
      roughness: isLight ? 0.25 : 0.08,
      metalness: isLight ? 0.1 : 0.92,
    });

    const hw = 0.028; // Ancho manecilla
    
    // Manecilla de Minutos (Larga, apunta verticalmente a las 12)
    const handLongShape = new THREE.Shape();
    const hlen = 0.36;
    handLongShape.moveTo(-hw, 0);
    handLongShape.lineTo(-hw, hlen);
    handLongShape.absarc(0, hlen, hw, Math.PI, 0, true);
    handLongShape.lineTo(hw, 0);
    handLongShape.absarc(0, 0, hw, 0, Math.PI, true);

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
    // Dado que centramos la geometría, su base original (0,0) está ahora desplazada.
    // La posicionamos de modo que su base (extremo inferior) esté en el centro (0,0).
    // Su altura total es hlen + hw. El centro geométrico está en Y = (hlen + hw)/2 - hw.
    handLongMesh.position.set(0, hlen / 2, 0.10);

    // Manecilla de Horas (Corta, en diagonal abajo-izquierda -aprox. a las 7:30)
    const handShortShape = new THREE.Shape();
    const hlenShort = 0.22;
    handShortShape.moveTo(-hw, 0);
    handShortShape.lineTo(-hw, hlenShort);
    handShortShape.absarc(0, hlenShort, hw, Math.PI, 0, true);
    handShortShape.lineTo(hw, 0);
    handShortShape.absarc(0, 0, hw, 0, Math.PI, true);

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
    
    // Para rotar la manecilla corta sobre su base en el origen (0,0):
    // 1. La rotamos sobre Z en diagonal (por ejemplo, -135 grados, es decir, -Math.PI * 0.75)
    const angleShort = -Math.PI * 0.70; // 7 y pico
    handShortMesh.rotation.z = angleShort;
    // 2. Dado que está centrada, su base (0,0) se movió al centro geométrico.
    // La movemos a lo largo de su eje local rotado para que pivote perfectamente en el centro del reloj.
    const distToCenter = hlenShort / 2;
    handShortMesh.position.set(
      Math.sin(-angleShort) * distToCenter,
      Math.cos(-angleShort) * distToCenter,
      0.09
    );

    // Pivote central redondo
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

    // 6. Agrupación del Logo Completo
    const group = new THREE.Group();
    group.add(outerRingMesh);
    group.add(handleMesh);
    group.add(innerRingMesh);
    group.add(handLongMesh);
    group.add(handShortMesh);
    group.add(pivotMesh);
    scene.add(group);

    // Rotación inicial en 3D
    group.rotation.x = 0.25;
    group.rotation.y = -0.3;

    // 7. Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 2.8 : 1.8);
    dirLight.position.set(3, 4, 6);
    scene.add(dirLight);

    // Luz puntual interactiva con el color secundario
    const pointLight = new THREE.PointLight(new THREE.Color(secondary), isLight ? 5.5 : 3.5, 8);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Loop de renderizado optimizado por demanda
    let animationFrameId: number | null = null;
    let targetRotationX = 0.25;
    let targetRotationY = -0.3;
    let isAnimating = false;

    const animate = () => {
      let needsRender = false;

      // Suavizar el parallax interactivo
      if (Math.abs(targetRotationX - group.rotation.x) > 0.001) {
        group.rotation.x += (targetRotationX - group.rotation.x) * 0.1;
        needsRender = true;
      }

      if (!isHovered.current && Math.abs(targetRotationY - group.rotation.y) > 0.001) {
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.1;
        needsRender = true;
      }

      // Animación continua sutil en Hover
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

    // Eventos de interacción del ratón
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
      // Giro 360 en eje Y mediante GSAP
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

    // Limpieza de recursos al desmontar
    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement);
      scene.clear();
      outerRingGeometry.dispose();
      handleGeometry.dispose();
      innerRingGeometry.dispose();
      handLongGeometry.dispose();
      handShortGeometry.dispose();
      pivotGeometry.dispose();
      mainMaterial.dispose();
      handsMaterial.dispose();
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
