import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import { applyRobloxClothingUV } from '../../utils/robloxClothingUV.ts';

interface ProfileBanner3DProps {
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  backgroundUrl?: string | null;
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

export default function ProfileBanner3D({
  colors,
  shirtUrl,
  pantsUrl,
  backgroundUrl,
  className = '',
}: ProfileBanner3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const charGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);

  // Drag rotation
  const isDraggingRef = useRef(false);
  const previousPointerPos = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0.05, y: 0.15 });
  const targetRotation = useRef({ x: 0.05, y: 0.15 });
  const lastUserInteractionTime = useRef(Date.now());

  // Mesh refs for skin tone updates
  const bodyMeshes = useRef<{
    head?: THREE.Mesh;
    torso?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
  }>({});

  // Clothing mesh refs
  const clothingMeshes = useRef<{
    shirtTorso?: THREE.Mesh;
    shirtLeftArm?: THREE.Mesh;
    shirtRightArm?: THREE.Mesh;
    pantsTorso?: THREE.Mesh;
    pantsLeftLeg?: THREE.Mesh;
    pantsRightLeg?: THREE.Mesh;
  }>({});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera framed so full R6 character (height ~5.2 units, from y=-3.0 to +2.24) is fully visible & centered without any cutoff
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, -0.2, 12.2);
    camera.lookAt(0, -0.35, 0);

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

    // Studio lighting fitting the Roblox dark theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.35);
    keyLight.position.set(4, 7, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aacc, 0.65);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.75);
    rimLight.position.set(0, 6, -5);
    scene.add(rimLight);

    // Soft Contact Shadow on ground plane beneath avatar feet
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 2.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -3.01, 0);
    scene.add(shadowMesh);

    // Character Group
    const charGroup = new THREE.Group();
    charGroupRef.current = charGroup;
    scene.add(charGroup);

    const createMat = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.38,
        metalness: 0.04,
      });
    };

    // 1. Torso: 2.0 x 2.0 x 1.0 at y = 0
    const torsoGeo = new THREE.BoxGeometry(2.0, 2.0, 1.0);
    const torsoMat = createMat(colors.torso);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 0, 0);
    torsoMesh.castShadow = true;
    charGroup.add(torsoMesh);
    bodyMeshes.current.torso = torsoMesh;

    // 2. Head: Cylinder with smooth rounded bevel at y = 1.62
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
    headMesh.castShadow = true;
    charGroup.add(headMesh);
    bodyMeshes.current.head = headMesh;

    // Classic Smile Face Decal
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, 512, 512);
    fctx.fillStyle = '#141619';
    // Eyes
    fctx.beginPath();
    fctx.ellipse(190, 215, 22, 34, 0, 0, Math.PI * 2);
    fctx.fill();
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

    // 3. Left Arm at x = +1.5
    const leftArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftArmMat = createMat(colors.leftArm);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, leftArmMat);
    leftArmMesh.position.set(1.5, 0, 0);
    leftArmMesh.castShadow = true;
    charGroup.add(leftArmMesh);
    bodyMeshes.current.leftArm = leftArmMesh;

    // 4. Right Arm at x = -1.5
    const rightArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightArmMat = createMat(colors.rightArm);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, rightArmMat);
    rightArmMesh.position.set(-1.5, 0, 0);
    rightArmMesh.castShadow = true;
    charGroup.add(rightArmMesh);
    bodyMeshes.current.rightArm = rightArmMesh;

    // 5. Left Leg at x = +0.5, y = -2.0
    const leftLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftLegMat = createMat(colors.leftLeg);
    const leftLegMesh = new THREE.Mesh(leftLegGeo, leftLegMat);
    leftLegMesh.position.set(0.5, -2.0, 0);
    leftLegMesh.castShadow = true;
    charGroup.add(leftLegMesh);
    bodyMeshes.current.leftLeg = leftLegMesh;

    // 6. Right Leg at x = -0.5, y = -2.0
    const rightLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightLegMat = createMat(colors.rightLeg);
    const rightLegMesh = new THREE.Mesh(rightLegGeo, rightLegMat);
    rightLegMesh.position.set(-0.5, -2.0, 0);
    rightLegMesh.castShadow = true;
    charGroup.add(rightLegMesh);
    bodyMeshes.current.rightLeg = rightLegMesh;

    // Animation & Render Loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // If user hasn't dragged recently, do gentle subtle idle breathing / swaying
      const idleTime = now - lastUserInteractionTime.current;
      if (idleTime > 2000 && !isDraggingRef.current) {
        const idleSway = Math.sin(now * 0.001) * 0.12;
        targetRotation.current.y = 0.15 + idleSway;
      }

      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * Math.min(dt * 10, 1);
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * Math.min(dt * 10, 1);

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
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 300;
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
      shadowTexture.dispose();
      shadowGeo.dispose();
      torsoGeo.dispose();
      headGeo.dispose();
      leftArmGeo.dispose();
      rightArmGeo.dispose();
      leftLegGeo.dispose();
      rightLegGeo.dispose();
    };
  }, []);

  // Update skin colors dynamically
  useEffect(() => {
    if (bodyMeshes.current.head) {
      (bodyMeshes.current.head.material as THREE.MeshStandardMaterial).color.set(colors.head);
    }
    if (bodyMeshes.current.torso) {
      (bodyMeshes.current.torso.material as THREE.MeshStandardMaterial).color.set(colors.torso);
    }
    if (bodyMeshes.current.leftArm) {
      (bodyMeshes.current.leftArm.material as THREE.MeshStandardMaterial).color.set(colors.leftArm);
    }
    if (bodyMeshes.current.rightArm) {
      (bodyMeshes.current.rightArm.material as THREE.MeshStandardMaterial).color.set(colors.rightArm);
    }
    if (bodyMeshes.current.leftLeg) {
      (bodyMeshes.current.leftLeg.material as THREE.MeshStandardMaterial).color.set(colors.leftLeg);
    }
    if (bodyMeshes.current.rightLeg) {
      (bodyMeshes.current.rightLeg.material as THREE.MeshStandardMaterial).color.set(colors.rightLeg);
    }
  }, [colors]);

  // Load and apply Shirt texture
  useEffect(() => {
    const group = charGroupRef.current;
    if (!group) return;

    const prev = clothingMeshes.current;
    if (prev.shirtTorso) { group.remove(prev.shirtTorso); prev.shirtTorso.geometry.dispose(); }
    if (prev.shirtLeftArm) { group.remove(prev.shirtLeftArm); prev.shirtLeftArm.geometry.dispose(); }
    if (prev.shirtRightArm) { group.remove(prev.shirtRightArm); prev.shirtRightArm.geometry.dispose(); }
    clothingMeshes.current.shirtTorso = undefined;
    clothingMeshes.current.shirtLeftArm = undefined;
    clothingMeshes.current.shirtRightArm = undefined;

    if (!shirtUrl) return;

    let isCancelled = false;

    loadRobloxTexture(shirtUrl)
      .then((texture) => {
        if (isCancelled || !charGroupRef.current) {
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

        // Torso shirt overlay (outermost layer on torso, size 2.026)
        const sTorsoGeo = new THREE.BoxGeometry(2.026, 2.026, 1.026);
        applyRobloxClothingUV(sTorsoGeo, 'torso');
        const sTorsoMesh = new THREE.Mesh(sTorsoGeo, shirtMat);
        sTorsoMesh.position.set(0, 0, 0);
        sTorsoMesh.renderOrder = 2;
        charGroupRef.current.add(sTorsoMesh);

        // Left Arm shirt overlay
        const sLArmGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(sLArmGeo, 'leftArm');
        const sLArmMesh = new THREE.Mesh(sLArmGeo, shirtMat);
        sLArmMesh.position.set(1.5, 0, 0);
        sLArmMesh.renderOrder = 2;
        charGroupRef.current.add(sLArmMesh);

        // Right Arm shirt overlay
        const sRArmGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(sRArmGeo, 'rightArm');
        const sRArmMesh = new THREE.Mesh(sRArmGeo, shirtMat);
        sRArmMesh.position.set(-1.5, 0, 0);
        sRArmMesh.renderOrder = 2;
        charGroupRef.current.add(sRArmMesh);

        clothingMeshes.current.shirtTorso = sTorsoMesh;
        clothingMeshes.current.shirtLeftArm = sLArmMesh;
        clothingMeshes.current.shirtRightArm = sRArmMesh;
      })
      .catch((err) => {
        console.warn('Failed to load shirt in ProfileBanner3D:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [shirtUrl]);

  // Load and apply Pants texture
  useEffect(() => {
    const group = charGroupRef.current;
    if (!group) return;

    const prev = clothingMeshes.current;
    if (prev.pantsTorso) { group.remove(prev.pantsTorso); prev.pantsTorso.geometry.dispose(); }
    if (prev.pantsLeftLeg) { group.remove(prev.pantsLeftLeg); prev.pantsLeftLeg.geometry.dispose(); }
    if (prev.pantsRightLeg) { group.remove(prev.pantsRightLeg); prev.pantsRightLeg.geometry.dispose(); }
    clothingMeshes.current.pantsTorso = undefined;
    clothingMeshes.current.pantsLeftLeg = undefined;
    clothingMeshes.current.pantsRightLeg = undefined;

    if (!pantsUrl) return;

    let isCancelled = false;

    loadRobloxTexture(pantsUrl)
      .then((texture) => {
        if (isCancelled || !charGroupRef.current) {
          texture.dispose();
          return;
        }

        const pantsMat = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.05,
          depthWrite: true,
          roughness: 0.45,
          metalness: 0.02,
          side: THREE.FrontSide,
        });

        // Torso waist pants overlay (inner waist layer, size 2.012 so shirt 2.026 is cleanly on top)
        const pTorsoGeo = new THREE.BoxGeometry(2.012, 2.012, 1.012);
        applyRobloxClothingUV(pTorsoGeo, 'torso');
        const pTorsoMesh = new THREE.Mesh(pTorsoGeo, pantsMat);
        pTorsoMesh.position.set(0, 0, 0);
        pTorsoMesh.renderOrder = 1;
        charGroupRef.current.add(pTorsoMesh);

        // Left Leg pants overlay
        const pLLegGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(pLLegGeo, 'leftLeg');
        const pLLegMesh = new THREE.Mesh(pLLegGeo, pantsMat);
        pLLegMesh.position.set(0.5, -2.0, 0);
        pLLegMesh.renderOrder = 1;
        charGroupRef.current.add(pLLegMesh);

        // Right Leg pants overlay
        const pRLegGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(pRLegGeo, 'rightLeg');
        const pRLegMesh = new THREE.Mesh(pRLegGeo, pantsMat);
        pRLegMesh.position.set(-0.5, -2.0, 0);
        pRLegMesh.renderOrder = 1;
        charGroupRef.current.add(pRLegMesh);

        clothingMeshes.current.pantsTorso = pTorsoMesh;
        clothingMeshes.current.pantsLeftLeg = pLLegMesh;
        clothingMeshes.current.pantsRightLeg = pRLegMesh;
      })
      .catch((err) => {
        console.warn('Failed to load pants in ProfileBanner3D:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [pantsUrl]);

  // Load Custom Profile Background Image if equipped
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (bgMeshRef.current) {
      scene.remove(bgMeshRef.current);
      if (bgMeshRef.current.geometry) bgMeshRef.current.geometry.dispose();
      bgMeshRef.current = null;
    }

    if (!backgroundUrl) return;

    let isCancelled = false;
    loadRobloxTexture(backgroundUrl)
      .then((bgTexture) => {
        if (isCancelled || !sceneRef.current) {
          bgTexture.dispose();
          return;
        }
        // High quality linear filtering for 4K wallpapers
        bgTexture.minFilter = THREE.LinearMipmapLinearFilter;
        bgTexture.magFilter = THREE.LinearFilter;
        bgTexture.generateMipmaps = true;
        bgTexture.needsUpdate = true;

        const img = bgTexture.image as HTMLImageElement;
        const aspect = img && img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : 16 / 9;

        // Slight zoom-in (widescreen plane fill) so background fits banner without borders
        const planeWidth = 42;
        const planeHeight = planeWidth / aspect;
        const bgGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const bgMat = new THREE.MeshBasicMaterial({
          map: bgTexture,
          depthWrite: false,
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(0, 0.35, -6.4);
        sceneRef.current.add(bgMesh);
        bgMeshRef.current = bgMesh;
      })
      .catch((e) => console.warn('Failed to load profile background in ProfileBanner3D:', e));

    return () => {
      isCancelled = true;
    };
  }, [backgroundUrl]);

  // Pointer drag events for interactive 3D rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    lastUserInteractionTime.current = Date.now();
    previousPointerPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    lastUserInteractionTime.current = Date.now();
    const dx = e.clientX - previousPointerPos.current.x;
    const dy = e.clientY - previousPointerPos.current.y;
    previousPointerPos.current = { x: e.clientX, y: e.clientY };

    targetRotation.current.y += dx * 0.015;
    targetRotation.current.x = Math.max(-0.25, Math.min(0.25, targetRotation.current.x + dy * 0.015));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    lastUserInteractionTime.current = Date.now();
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
      title="Click & drag to rotate your 3D avatar"
    />
  );
}
