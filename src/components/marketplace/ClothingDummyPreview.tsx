import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import { applyRobloxClothingUV } from '../../utils/robloxClothingUV.ts';

interface ClothingDummyPreviewProps {
  clothingType: 'shirt' | 'pants';
  textureUrl: string | null;
  className?: string;
  isInteractive?: boolean;
  showUserAvatar?: boolean;
  avatarColors?: AvatarColors;
  userShirtUrl?: string | null;
  userPantsUrl?: string | null;
}

function loadTexture(url: string): Promise<THREE.Texture> {
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
    img.onerror = reject;
    img.src = url;
  });
}

export default function ClothingDummyPreview({
  clothingType,
  textureUrl,
  className = '',
  isInteractive = false,
  showUserAvatar = false,
  avatarColors,
  userShirtUrl = null,
  userPantsUrl = null,
}: ClothingDummyPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 220;

    const scene = new THREE.Scene();

    // Camera perfectly framed with ample headroom so head & body never get cut off
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(1.4, 0.05, 12.0);
    camera.lookAt(0, -0.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio lighting fitting the Rovix dark theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.25);
    keyLight.position.set(4, 7, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x90b0d0, 0.65);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.7);
    rimLight.position.set(0, 6, -5);
    scene.add(rimLight);

    // Character / Dummy group
    const dummyGroup = new THREE.Group();
    // Default gentle 3/4 angle
    dummyGroup.rotation.y = -0.18;
    scene.add(dummyGroup);

    const createMat = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.38,
        metalness: 0.04,
      });
    };

    // Body colors: either user's avatar colors or clean white mannequin
    const headCol = showUserAvatar && avatarColors ? avatarColors.head : '#eeeeee';
    const torsoCol = showUserAvatar && avatarColors ? avatarColors.torso : '#eeeeee';
    const lArmCol = showUserAvatar && avatarColors ? avatarColors.leftArm : '#eeeeee';
    const rArmCol = showUserAvatar && avatarColors ? avatarColors.rightArm : '#eeeeee';
    const lLegCol = showUserAvatar && avatarColors ? avatarColors.leftLeg : '#eeeeee';
    const rLegCol = showUserAvatar && avatarColors ? avatarColors.rightLeg : '#eeeeee';

    // 1. Torso (2.0 x 2.0 x 1.0)
    const torsoGeo = new THREE.BoxGeometry(2.0, 2.0, 1.0);
    const torsoMesh = new THREE.Mesh(torsoGeo, createMat(torsoCol));
    dummyGroup.add(torsoMesh);

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
    const headMesh = new THREE.Mesh(headGeo, createMat(headCol));
    headMesh.position.set(0, 1.62, 0);
    dummyGroup.add(headMesh);

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
    dummyGroup.add(faceQuad);

    // 3. Arms
    const leftArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, createMat(lArmCol));
    leftArmMesh.position.set(1.5, 0, 0);
    dummyGroup.add(leftArmMesh);

    const rightArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, createMat(rArmCol));
    rightArmMesh.position.set(-1.5, 0, 0);
    dummyGroup.add(rightArmMesh);

    // 4. Legs
    const leftLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftLegMesh = new THREE.Mesh(leftLegGeo, createMat(lLegCol));
    leftLegMesh.position.set(0.5, -2.0, 0);
    dummyGroup.add(leftLegMesh);

    const rightLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightLegMesh = new THREE.Mesh(rightLegGeo, createMat(rLegCol));
    rightLegMesh.position.set(-0.5, -2.0, 0);
    dummyGroup.add(rightLegMesh);

    let isDisposed = false;

    // Apply Shirt (either this marketplace shirt or user's active shirt if previewing pants)
    const effectiveShirtUrl = clothingType === 'shirt' ? textureUrl : (showUserAvatar ? userShirtUrl : null);
    if (effectiveShirtUrl) {
      loadTexture(effectiveShirtUrl).then((texture) => {
        if (isDisposed) {
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

        const sTorsoGeo = new THREE.BoxGeometry(2.026, 2.026, 1.026);
        applyRobloxClothingUV(sTorsoGeo, 'torso');
        const sTorso = new THREE.Mesh(sTorsoGeo, shirtMat);
        sTorso.renderOrder = 2;
        dummyGroup.add(sTorso);

        const sLArmGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(sLArmGeo, 'leftArm');
        const sLArm = new THREE.Mesh(sLArmGeo, shirtMat);
        sLArm.position.set(1.5, 0, 0);
        sLArm.renderOrder = 2;
        dummyGroup.add(sLArm);

        const sRArmGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(sRArmGeo, 'rightArm');
        const sRArm = new THREE.Mesh(sRArmGeo, shirtMat);
        sRArm.position.set(-1.5, 0, 0);
        sRArm.renderOrder = 2;
        dummyGroup.add(sRArm);

        renderer.render(scene, camera);
      });
    }

    // Apply Pants (either this marketplace pants or user's active pants if previewing shirt)
    const effectivePantsUrl = clothingType === 'pants' ? textureUrl : (showUserAvatar ? userPantsUrl : null);
    if (effectivePantsUrl) {
      loadTexture(effectivePantsUrl).then((texture) => {
        if (isDisposed) {
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

        const pTorsoGeo = new THREE.BoxGeometry(2.012, 2.012, 1.012);
        applyRobloxClothingUV(pTorsoGeo, 'torso');
        const pTorso = new THREE.Mesh(pTorsoGeo, pantsMat);
        pTorso.renderOrder = 1;
        dummyGroup.add(pTorso);

        const pLLegGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(pLLegGeo, 'leftLeg');
        const pLLeg = new THREE.Mesh(pLLegGeo, pantsMat);
        pLLeg.position.set(0.5, -2.0, 0);
        pLLeg.renderOrder = 1;
        dummyGroup.add(pLLeg);

        const pRLegGeo = new THREE.BoxGeometry(1.02, 2.02, 1.02);
        applyRobloxClothingUV(pRLegGeo, 'rightLeg');
        const pRLeg = new THREE.Mesh(pRLegGeo, pantsMat);
        pRLeg.position.set(-0.5, -2.0, 0);
        pRLeg.renderOrder = 1;
        dummyGroup.add(pRLeg);

        renderer.render(scene, camera);
      });
    }

    renderer.render(scene, camera);

    // Drag-to-rotate when interactive
    let isDragging = false;
    let prevX = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!isInteractive) return;
      isDragging = true;
      prevX = e.clientX;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      dummyGroup.rotation.y += dx * 0.015;
      renderer.render(scene, camera);
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    };

    if (isInteractive) {
      container.addEventListener('pointerdown', onPointerDown);
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerup', onPointerUp);
    }

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 220;
      const h = container.clientHeight || 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      if (isInteractive) {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', onPointerUp);
      }
      renderer.dispose();
      faceTexture.dispose();
      torsoGeo.dispose();
      headGeo.dispose();
      leftArmGeo.dispose();
      rightArmGeo.dispose();
      leftLegGeo.dispose();
      rightLegGeo.dispose();
    };
  }, [
    clothingType,
    textureUrl,
    isInteractive,
    showUserAvatar,
    avatarColors,
    userShirtUrl,
    userPantsUrl,
  ]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full ${isInteractive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${className}`}
    />
  );
}
