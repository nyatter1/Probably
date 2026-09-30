import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { UserAvatarConfig, WearableItem } from '../../types/account.ts';
import { applyRobloxClothingUV } from '../../utils/robloxClothingUV.ts';
import { Shirt, Sparkles, Layers, RotateCw } from 'lucide-react';

interface CurrentlyWearingViewerProps {
  avatar: UserAvatarConfig;
  onItemClick?: (item: WearableItem) => void;
  isOwner?: boolean;
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

export default function CurrentlyWearingViewer({
  avatar,
  onItemClick,
  isOwner = false,
}: CurrentlyWearingViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Drag rotation
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0.1, y: 0.4 });
  const targetRotationRef = useRef({ x: 0.1, y: 0.4 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();

    // Camera framed for full character loadout
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, -0.2, 8.8);
    camera.lookAt(0, -0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.4);
    keyLight.position.set(3.5, 6.0, 5.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfd8fc, 0.8);
    fillLight.position.set(-4.0, 2.0, 3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    rimLight.position.set(0, 4.0, -5.0);
    scene.add(rimLight);

    const characterGroup = new THREE.Group();
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    const createMat = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.35,
        metalness: 0.04,
      });
    };

    const colors = avatar.colors || {
      head: '#f6db6a',
      torso: '#3b82f6',
      leftArm: '#f6db6a',
      rightArm: '#f6db6a',
      leftLeg: '#1e293b',
      rightLeg: '#1e293b',
    };

    // 1. Torso
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 1.0), createMat(colors.torso));
    torsoMesh.position.set(0, 0, 0);
    characterGroup.add(torsoMesh);

    // 2. Head
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
    const headMesh = new THREE.Mesh(headGeo, createMat(colors.head));
    headMesh.position.set(0, 1.62, 0);
    characterGroup.add(headMesh);

    // 3. Face Decal
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, 512, 512);

    if (avatar.face === 'cool' || avatar.currentlyWearing?.some((w) => w.modelType === 'cool_face')) {
      fctx.fillStyle = '#09090b';
      fctx.beginPath();
      fctx.roundRect(140, 180, 100, 65, [4, 4, 18, 18]);
      fctx.roundRect(272, 180, 100, 65, [4, 4, 18, 18]);
      fctx.fill();
      fctx.fillRect(235, 195, 42, 14);
      fctx.fillRect(115, 190, 30, 12);
      fctx.fillRect(368, 190, 30, 12);
      fctx.fillStyle = '#38bdf8';
      fctx.beginPath();
      fctx.moveTo(155, 190);
      fctx.lineTo(185, 190);
      fctx.lineTo(165, 230);
      fctx.lineTo(145, 230);
      fctx.fill();
      fctx.strokeStyle = '#09090b';
      fctx.lineWidth = 14;
      fctx.lineCap = 'round';
      fctx.beginPath();
      fctx.arc(260, 275, 45, 0.1 * Math.PI, 0.65 * Math.PI, false);
      fctx.stroke();
    } else {
      fctx.fillStyle = '#141619';
      fctx.beginPath();
      fctx.ellipse(190, 215, 22, 34, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.beginPath();
      fctx.ellipse(322, 215, 22, 34, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.strokeStyle = '#141619';
      fctx.lineWidth = 20;
      fctx.lineCap = 'round';
      fctx.beginPath();
      fctx.arc(256, 260, 75, 0.22 * Math.PI, 0.78 * Math.PI, false);
      fctx.stroke();
    }

    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const faceQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.85),
      new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false })
    );
    faceQuad.position.set(0, 1.62, 0.655);
    characterGroup.add(faceQuad);

    // 4. Arms
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.leftArm));
    leftArmMesh.position.set(1.5, 0, 0);
    characterGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.rightArm));
    rightArmMesh.position.set(-1.5, 0, 0);
    characterGroup.add(rightArmMesh);

    // 5. Legs
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.leftLeg));
    leftLegMesh.position.set(0.5, -2.0, 0);
    characterGroup.add(leftLegMesh);

    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.rightLeg));
    rightLegMesh.position.set(-0.5, -2.0, 0);
    characterGroup.add(rightLegMesh);

    // 6. 3D Hats & Accessories
    const hatItem = avatar.currentlyWearing?.find((w) => w.category === 'hat') || (avatar.hat ? { modelType: avatar.hat } : null);
    if (hatItem) {
      if (hatItem.modelType === 'tophat' || avatar.hat === 'tophat') {
        const hatGroup = new THREE.Group();
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.4 }));
        brim.position.set(0, 2.22, 0);
        hatGroup.add(brim);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.15, 32), new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.4 }));
        crown.position.set(0, 2.8, 0);
        hatGroup.add(crown);
        const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.16, 32), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 }));
        ribbon.position.set(0, 2.34, 0);
        hatGroup.add(ribbon);
        characterGroup.add(hatGroup);
      } else if (hatItem.modelType === 'cap' || avatar.hat === 'cap') {
        const capGroup = new THREE.Group();
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 }));
        dome.position.set(0, 2.18, 0);
        capGroup.add(dome);
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.65), new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 }));
        visor.position.set(0, 2.18, 0.65);
        visor.rotation.x = 0.1;
        capGroup.add(visor);
        characterGroup.add(capGroup);
      } else if (hatItem.modelType === 'crown' || avatar.hat === 'crown') {
        const crownGroup = new THREE.Group();
        const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.35, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.2 }));
        crownMesh.position.set(0, 2.36, 0);
        crownGroup.add(crownMesh);
        characterGroup.add(crownGroup);
      }
    }

    // 7. Clothing UV Layers
    if (avatar.shirtUrl) {
      loadTexture(avatar.shirtUrl)
        .then((tex) => {
          const shirtMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, transparent: true });
          const sTorsoGeo = new THREE.BoxGeometry(2.04, 2.04, 1.04);
          applyRobloxClothingUV(sTorsoGeo, 'torso');
          characterGroup.add(new THREE.Mesh(sTorsoGeo, shirtMat));

          const sLeftArmGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(sLeftArmGeo, 'leftArm');
          const sLeftArmMesh = new THREE.Mesh(sLeftArmGeo, shirtMat);
          sLeftArmMesh.position.set(1.5, 0, 0);
          characterGroup.add(sLeftArmMesh);

          const sRightArmGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(sRightArmGeo, 'rightArm');
          const sRightArmMesh = new THREE.Mesh(sRightArmGeo, shirtMat);
          sRightArmMesh.position.set(-1.5, 0, 0);
          characterGroup.add(sRightArmMesh);
        })
        .catch((e) => console.warn('[CurrentlyWearingViewer] Failed to load shirt:', e));
    }

    if (avatar.pantsUrl) {
      loadTexture(avatar.pantsUrl)
        .then((tex) => {
          const pantsMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, transparent: true });
          const pLeftLegGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(pLeftLegGeo, 'leftLeg');
          const pLeftLegMesh = new THREE.Mesh(pLeftLegGeo, pantsMat);
          pLeftLegMesh.position.set(0.5, -2.0, 0);
          characterGroup.add(pLeftLegMesh);

          const pRightLegGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(pRightLegGeo, 'rightLeg');
          const pRightLegMesh = new THREE.Mesh(pRightLegGeo, pantsMat);
          pRightLegMesh.position.set(-0.5, -2.0, 0);
          characterGroup.add(pRightLegMesh);
        })
        .catch((e) => console.warn('[CurrentlyWearingViewer] Failed to load pants:', e));
    }

    // Animation loop
    let clock = 0;
    const animate = () => {
      clock += 0.015;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.12;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.12;

      const breath = Math.sin(clock * 1.5) * 0.015;
      if (characterGroupRef.current) {
        characterGroupRef.current.rotation.x = currentRotationRef.current.x;
        characterGroupRef.current.rotation.y = currentRotationRef.current.y;
        characterGroupRef.current.position.y = breath * 0.5;
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevPointerRef.current = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevPointerRef.current.x;
      const deltaY = clientY - prevPointerRef.current.y;

      targetRotationRef.current.y += deltaX * 0.018;
      targetRotationRef.current.x = Math.max(-0.35, Math.min(0.4, targetRotationRef.current.x + deltaY * 0.018));
      prevPointerRef.current = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [avatar]);

  const items = avatar.currentlyWearing && avatar.currentlyWearing.length > 0
    ? avatar.currentlyWearing
    : [
        { id: 'item_hat', name: '🎩 Black Hat', category: 'hat' as const, icon: '🎩' },
        { id: 'item_shirt', name: '👕 Blue Shirt', category: 'shirt' as const, icon: '👕' },
        { id: 'item_pants', name: '👖 Black Pants', category: 'pants' as const, icon: '👖' },
        { id: 'item_face', name: '😎 Cool Face', category: 'face' as const, icon: '😎' },
      ];

  return (
    <div className="bg-[#181a20]/90 backdrop-blur-md rounded-2xl border border-neutral-800/80 p-4 shadow-xl flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">Currently Wearing</h3>
        </div>
        <span className="text-[11px] font-semibold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
          {items.length} items
        </span>
      </div>

      {/* 3D Loadout Model Viewport */}
      <div className="relative group bg-[#111317] rounded-xl border border-neutral-800/60 overflow-hidden h-56 flex items-center justify-center">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-neutral-700/60 text-[10px] text-neutral-300">
          <RotateCw className="w-2.5 h-2.5" />
          <span>360° Drag</span>
        </div>
      </div>

      {/* Equipped Items List */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => onItemClick && onItemClick(item)}
            className="flex items-center justify-between p-2 rounded-xl bg-[#20232a]/70 hover:bg-[#282c35] border border-neutral-800/50 hover:border-purple-500/40 transition-all cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg flex-shrink-0">{item.icon || '✨'}</span>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                  {item.name}
                </p>
                <p className="text-[10px] text-neutral-400 capitalize">{item.category}</p>
              </div>
            </div>
            <span className="text-[10px] font-medium text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/40 group-hover:text-purple-300">
              Equipped
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
