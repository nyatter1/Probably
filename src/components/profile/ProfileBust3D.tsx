import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import { applyRobloxClothingUV } from '../../utils/robloxClothingUV.ts';

interface ProfileBust3DProps {
  colors: AvatarColors;
  shirtUrl: string | null;
  className?: string;
}

function loadRobloxTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export default function ProfileBust3D({ colors, shirtUrl, className = '' }: ProfileBust3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Rotation control
  const isDraggingRef = useRef(false);
  const previousPointerPos = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0.08, y: 0.35 });
  const targetRotation = useRef({ x: 0.08, y: 0.35 });

  // Body mesh refs for dynamic color updates
  const bodyMeshes = useRef<{
    head?: THREE.Mesh;
    torso?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
  }>({});

  // Clothing mesh refs
  const clothingMeshes = useRef<{
    shirtTorso?: THREE.Mesh;
    shirtLeftArm?: THREE.Mesh;
    shirtRightArm?: THREE.Mesh;
  }>({});

  // 1. Setup Three.js Bust Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 140;
    const height = container.clientHeight || 140;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera framed tightly on head, shoulders, and upper torso
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    // Head is at y = 1.62, Torso is at y = 0. Focus around y = 1.15
    camera.position.set(0, 1.15, 6.2);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.05);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.3);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd4e4f7, 0.65);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Character Group
    const charGroup = new THREE.Group();
    groupRef.current = charGroup;
    scene.add(charGroup);

    const createMat = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.38,
        metalness: 0.05,
      });
    };

    // 1. Torso (2.0 x 2.0 x 1.0)
    const torsoGeo = new THREE.BoxGeometry(2.0, 2.0, 1.0);
    const torsoMat = createMat(colors.torso);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 0, 0);
    charGroup.add(torsoMesh);
    bodyMeshes.current.torso = torsoMesh;

    // 2. Head (Lathe cylinder with bevel)
    const headPoints: THREE.Vector2[] = [];
    headPoints.push(new THREE.Vector2(0, -0.62));
    headPoints.push(new THREE.Vector2(0.3, -0.62));
    headPoints.push(new THREE.Vector2(0.55, -0.56));
    headPoints.push(new THREE.Vector2(0.63, -0.45));
    headPoints.push(new THREE.Vector2(0.65, -0.25));
    headPoints.push(new THREE.Vector2(0.65, 0.25));
    headPoints.push(new THREE.Vector2(0.63, 0.45));
    headPoints.push(new THREE.Vector2(0.55, 0.56));
    headPoints.push(new THREE.Vector2(0.3, 0.62));
    headPoints.push(new THREE.Vector2(0, 0.62));

    const headGeo = new THREE.LatheGeometry(headPoints, 32);
    const headMat = createMat(colors.head);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 1.62, 0);
    charGroup.add(headMesh);
    bodyMeshes.current.head = headMesh;

    // Classic Smile Face Decal
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, 512, 512);
    fctx.fillStyle = '#141619';
    // Left eye
    fctx.beginPath();
    fctx.ellipse(190, 215, 22, 34, 0, 0, Math.PI * 2);
    fctx.fill();
    // Right eye
    fctx.beginPath();
    fctx.ellipse(322, 215, 22, 34, 0, 0, Math.PI * 2);
    fctx.fill();
    // Smile mouth
    fctx.strokeStyle = '#141619';
    fctx.lineWidth = 22;
    fctx.lineCap = 'round';
    fctx.beginPath();
    fctx.arc(256, 260, 80, 0.22 * Math.PI, 0.78 * Math.PI, false);
    fctx.stroke();

    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const faceQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.85),
      new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        depthWrite: false,
      })
    );
    faceQuad.position.set(0, 1.62, 0.655);
    charGroup.add(faceQuad);

    // 3. Left Arm (Shoulder) at +1.5
    const leftArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftArmMat = createMat(colors.leftArm);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, leftArmMat);
    leftArmMesh.position.set(1.5, 0, 0);
    charGroup.add(leftArmMesh);
    bodyMeshes.current.leftArm = leftArmMesh;

    // 4. Right Arm (Shoulder) at -1.5
    const rightArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightArmMat = createMat(colors.rightArm);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, rightArmMat);
    rightArmMesh.position.set(-1.5, 0, 0);
    charGroup.add(rightArmMesh);
    bodyMeshes.current.rightArm = rightArmMesh;

    // Render loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth interpolation of rotation
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * Math.min(dt * 12, 1);
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * Math.min(dt * 12, 1);

      if (charGroup) {
        charGroup.rotation.x = currentRotation.current.x;
        charGroup.rotation.y = currentRotation.current.y;
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth || 140;
      const h = container.clientHeight || 140;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      faceTexture.dispose();
      torsoGeo.dispose();
      headGeo.dispose();
      leftArmGeo.dispose();
      rightArmGeo.dispose();
    };
  }, []);

  // 2. Update skin colors dynamically
  useEffect(() => {
    if (bodyMeshes.current.head) {
      ((bodyMeshes.current.head.material as THREE.MeshStandardMaterial)).color.set(colors.head);
    }
    if (bodyMeshes.current.torso) {
      ((bodyMeshes.current.torso.material as THREE.MeshStandardMaterial)).color.set(colors.torso);
    }
    if (bodyMeshes.current.leftArm) {
      ((bodyMeshes.current.leftArm.material as THREE.MeshStandardMaterial)).color.set(colors.leftArm);
    }
    if (bodyMeshes.current.rightArm) {
      ((bodyMeshes.current.rightArm.material as THREE.MeshStandardMaterial)).color.set(colors.rightArm);
    }
  }, [colors]);

  // 3. Load & apply shirt texture onto Torso and Shoulders
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Cleanup previous shirt meshes
    const prev = clothingMeshes.current;
    if (prev.shirtTorso) { group.remove(prev.shirtTorso); prev.shirtTorso.geometry.dispose(); }
    if (prev.shirtLeftArm) { group.remove(prev.shirtLeftArm); prev.shirtLeftArm.geometry.dispose(); }
    if (prev.shirtRightArm) { group.remove(prev.shirtRightArm); prev.shirtRightArm.geometry.dispose(); }
    clothingMeshes.current = {};

    if (!shirtUrl) return;

    let isCancelled = false;

    loadRobloxTexture(shirtUrl)
      .then((texture) => {
        if (isCancelled || !groupRef.current) {
          texture.dispose();
          return;
        }

        const shirtMat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.05,
          depthWrite: true,
          roughness: 0.45,
          metalness: 0.02,
          side: THREE.FrontSide,
        });

        // Torso shirt overlay
        const sTorsoGeo = new THREE.BoxGeometry(2.015, 2.015, 1.015);
        applyRobloxClothingUV(sTorsoGeo, 'torso');
        const sTorsoMesh = new THREE.Mesh(sTorsoGeo, shirtMat);
        sTorsoMesh.position.set(0, 0, 0);
        groupRef.current.add(sTorsoMesh);

        // Left Arm shirt overlay
        const sLArmGeo = new THREE.BoxGeometry(1.015, 2.015, 1.015);
        applyRobloxClothingUV(sLArmGeo, 'leftArm');
        const sLArmMesh = new THREE.Mesh(sLArmGeo, shirtMat);
        sLArmMesh.position.set(1.5, 0, 0);
        groupRef.current.add(sLArmMesh);

        // Right Arm shirt overlay
        const sRArmGeo = new THREE.BoxGeometry(1.015, 2.015, 1.015);
        applyRobloxClothingUV(sRArmGeo, 'rightArm');
        const sRArmMesh = new THREE.Mesh(sRArmGeo, shirtMat);
        sRArmMesh.position.set(-1.5, 0, 0);
        groupRef.current.add(sRArmMesh);

        clothingMeshes.current = {
          shirtTorso: sTorsoMesh,
          shirtLeftArm: sLArmMesh,
          shirtRightArm: sRArmMesh,
        };
      })
      .catch((err) => {
        console.warn('Failed to load shirt texture in ProfileBust3D:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [shirtUrl]);

  // Pointer drag events for interactive 3D rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    previousPointerPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - previousPointerPos.current.x;
    const dy = e.clientY - previousPointerPos.current.y;
    previousPointerPos.current = { x: e.clientX, y: e.clientY };

    targetRotation.current.y += dx * 0.02;
    targetRotation.current.x = Math.max(-0.25, Math.min(0.35, targetRotation.current.x + dy * 0.02));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`w-full h-full cursor-grab active:cursor-grabbing select-none ${className}`}
      title="Click & drag to rotate your 3D avatar bust"
    />
  );
}
