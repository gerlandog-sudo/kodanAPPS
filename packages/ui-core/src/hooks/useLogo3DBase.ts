import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Lifecycle returned by `buildContent`.
 * - `cleanup`: disposes app-specific geometries/materials
 * - `onFrame`: optional per-frame callback, return `true` if a re-render is needed
 */
export interface ContentLifecycle {
  cleanup: () => void;
  onFrame?: (elapsed: number) => boolean;
}

interface UseLogo3DBaseOptions {
  size: number;
  theme?: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  /**
   * Builds the app-specific 3D logo content.
   * Receives a pre-added `THREE.Group` and colour helpers.
   * Must add all meshes to the group and return a `ContentLifecycle`.
   */
  buildContent: (
    group: THREE.Group,
    helpers: { isLight: boolean; primary: THREE.Color; secondary: THREE.Color }
  ) => ContentLifecycle;
}

/**
 * Shared base for all 3D logos (~80% boilerplate elimination).
 *
 * Handles:
 * - Scene / camera / renderer setup
 * - Ambient, directional and point lights
 * - GSAP-driven mouse-enter 360° spin + hover point-light orbit
 * - Smooth parallax rotation on mouse-move
 * - Full cleanup on unmount
 *
 * Each app supplies `buildContent` to draw its unique geometry.
 */
export function useLogo3DBase(options: UseLogo3DBaseOptions) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isHovered = useRef(false);
  // Keep a ref to buildContent so the effect always uses the latest callback
  const buildContentRef = useRef(options.buildContent);
  buildContentRef.current = options.buildContent;

  const { size, theme, primaryColor, secondaryColor } = options;

  useEffect(() => {
    const element = mountRef.current;
    if (!element) return;

    // ── Reset ──────────────────────────────────────────────────────────
    element.innerHTML = '';

    const width = size;
    const height = size;
    const isLight = theme === 'light';
    const primary = new THREE.Color(primaryColor);
    const secondary = new THREE.Color(secondaryColor);

    // ── Scene ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);

    // ── Lights ─────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 2.8 : 1.8);
    dirLight.position.set(3, 4, 6);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(secondary, isLight ? 5.5 : 3.5, 8);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // ── Group ──────────────────────────────────────────────────────────
    const group = new THREE.Group();
    group.rotation.x = 0.25;
    group.rotation.y = -0.3;
    scene.add(group);

    // ── App-specific content ───────────────────────────────────────────
    const lifecycle = buildContentRef.current(group, { isLight, primary, secondary });

    // ── Animation loop ─────────────────────────────────────────────────
    let animationFrameId: number | null = null;
    let targetRotationX = 0.25;
    let targetRotationY = -0.3;
    let isAnimating = false;

    const animate = () => {
      let needsRender = false;

      // Smoothed parallax rotation
      if (Math.abs(targetRotationX - group.rotation.x) > 0.001) {
        group.rotation.x += (targetRotationX - group.rotation.x) * 0.1;
        needsRender = true;
      }

      if (!isHovered.current && Math.abs(targetRotationY - group.rotation.y) > 0.001) {
        group.rotation.y += (targetRotationY - group.rotation.y) * 0.1;
        needsRender = true;
      }

      // Hover: orbiting point light
      if (isHovered.current) {
        const elapsed = performance.now() * 0.001;
        pointLight.position.x = Math.sin(elapsed) * 1.5;
        pointLight.position.y = Math.cos(elapsed) * 1.5;
        needsRender = true;
      }

      // Per-app frame callback (e.g. cursor blinking)
      if (lifecycle.onFrame) {
        const frameNeedsRender = lifecycle.onFrame(performance.now() * 0.001);
        if (frameNeedsRender) needsRender = true;
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

    // ── Mouse handlers ─────────────────────────────────────────────────
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

    // ── Cleanup ────────────────────────────────────────────────────────
    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (element.contains(renderer.domElement)) element.removeChild(renderer.domElement);
      scene.clear();
      lifecycle.cleanup();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, theme, primaryColor, secondaryColor]);

  return mountRef;
}
