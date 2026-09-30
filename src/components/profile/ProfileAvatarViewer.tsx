import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { UserAvatarConfig } from '../../types/account.ts';
import { applyRobloxClothingUV } from '../../utils/robloxClothingUV.ts';
import { RotateCw } from 'lucide-react';

interface ProfileAvatarViewerProps {
  avatar: UserAvatarConfig;
  className?: string;
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

export default function ProfileAvatarViewer({ avatar, className = '' }: ProfileAvatarViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Pointer drag rotation
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0.08, y: 0.35 });
  const targetRotationRef = useRef({ x: 0.08, y: 0.35 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 320;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera (Framed for Upper Body Portrait: Head, Face, Torso, Arms)
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.95, 5.6);
    camera.lookAt(0, 0.95, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.5);
    keyLight.position.set(3.5, 6.0, 5.0);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfd8fc, 0.85);
    fillLight.position.set(-4.0, 2.0, 3.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.9);
    rimLight.position.set(0, 4.0, -5.0);
    scene.add(rimLight);

    // 5. Character Group
    const characterGroup = new THREE.Group();
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    const createMat = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.32,
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

    // A. Torso
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 1.0), createMat(colors.torso));
    torsoMesh.position.set(0, 0, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    characterGroup.add(torsoMesh);

    // B. Head (Rounded lathe)
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
    headMesh.castShadow = true;
    characterGroup.add(headMesh);

    // C. Face Decal
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, 512, 512);

    if (avatar.face === 'cool' || avatar.currentlyWearing?.some((w) => w.modelType === 'cool_face')) {
      // Cool sunglasses face
      fctx.fillStyle = '#09090b';
      // Sunglasses frames
      fctx.beginPath();
      fctx.roundRect(140, 180, 100, 65, [4, 4, 18, 18]);
      fctx.roundRect(272, 180, 100, 65, [4, 4, 18, 18]);
      fctx.fill();
      // Bridge & arms
      fctx.fillRect(235, 195, 42, 14);
      fctx.fillRect(115, 190, 30, 12);
      fctx.fillRect(368, 190, 30, 12);
      // Glare highlight on lens
      fctx.fillStyle = '#38bdf8';
      fctx.beginPath();
      fctx.moveTo(155, 190);
      fctx.lineTo(185, 190);
      fctx.lineTo(165, 230);
      fctx.lineTo(145, 230);
      fctx.fill();
      // Smirk smile
      fctx.strokeStyle = '#09090b';
      fctx.lineWidth = 14;
      fctx.lineCap = 'round';
      fctx.beginPath();
      fctx.arc(260, 275, 45, 0.1 * Math.PI, 0.65 * Math.PI, false);
      fctx.stroke();
    } else {
      // Classic friendly smile
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

    // D. Left Arm & Right Arm
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.leftArm));
    leftArmMesh.position.set(1.5, 0, 0);
    leftArmMesh.castShadow = true;
    characterGroup.add(leftArmMesh);

    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.0), createMat(colors.rightArm));
    rightArmMesh.position.set(-1.5, 0, 0);
    rightArmMesh.castShadow = true;
    characterGroup.add(rightArmMesh);

    // E. 3D Hats / Headwear Geometry
    const hatItem = avatar.currentlyWearing?.find((w) => w.category === 'hat') || (avatar.hat ? { modelType: avatar.hat } : null);
    if (hatItem) {
      if (hatItem.modelType === 'tophat' || avatar.hat === 'tophat') {
        const hatGroup = new THREE.Group();
        // Brim
        const brimGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.08, 32);
        const brimMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.4 });
        const brim = new THREE.Mesh(brimGeo, brimMat);
        brim.position.set(0, 2.22, 0);
        hatGroup.add(brim);
        // Crown/Cylinder
        const crownGeo = new THREE.CylinderGeometry(0.68, 0.72, 1.15, 32);
        const crown = new THREE.Mesh(crownGeo, brimMat);
        crown.position.set(0, 2.8, 0);
        hatGroup.add(crown);
        // Ribbon band
        const ribbonGeo = new THREE.CylinderGeometry(0.73, 0.73, 0.16, 32);
        const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.set(0, 2.34, 0);
        hatGroup.add(ribbon);
        characterGroup.add(hatGroup);
      } else if (hatItem.modelType === 'cap' || avatar.hat === 'cap') {
        const capGroup = new THREE.Group();
        const domeGeo = new THREE.SphereGeometry(0.68, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
        const dome = new THREE.Mesh(domeGeo, capMat);
        dome.position.set(0, 2.18, 0);
        capGroup.add(dome);
        // Visor
        const visorGeo = new THREE.BoxGeometry(0.85, 0.06, 0.65);
        const visor = new THREE.Mesh(visorGeo, capMat);
        visor.position.set(0, 2.18, 0.65);
        visor.rotation.x = 0.1;
        capGroup.add(visor);
        characterGroup.add(capGroup);
      } else if (hatItem.modelType === 'crown' || avatar.hat === 'crown') {
        const crownGroup = new THREE.Group();
        const bandGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.35, 6, 1, true);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.2 });
        const crownMesh = new THREE.Mesh(bandGeo, crownMat);
        crownMesh.position.set(0, 2.36, 0);
        crownGroup.add(crownMesh);
        characterGroup.add(crownGroup);
      }
    }

    // F. 3D Hair Geometry
    const hairItem = avatar.currentlyWearing?.find((w) => w.category === 'hair') || (avatar.hair ? { modelType: avatar.hair } : null);
    if (hairItem) {
      if (hairItem.modelType === 'spiky_hair' || avatar.hair === 'spiky_blonde') {
        const hairGroup = new THREE.Group();
        const hairMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
        for (let i = 0; i < 5; i++) {
          const spikeGeo = new THREE.ConeGeometry(0.25, 0.7, 4);
          const spike = new THREE.Mesh(spikeGeo, hairMat);
          spike.position.set((i - 2) * 0.28, 2.3 + (2 - Math.abs(i - 2)) * 0.08, (i % 2 === 0 ? 0.1 : -0.1));
          spike.rotation.z = (2 - i) * 0.18;
          spike.rotation.x = 0.1;
          hairGroup.add(spike);
        }
        characterGroup.add(hairGroup);
      } else if (hairItem.modelType === 'classic_hair' || avatar.hair === 'classic_brown') {
        const hairGeo = new THREE.SphereGeometry(0.72, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
        const hairMesh = new THREE.Mesh(hairGeo, hairMat);
        hairMesh.position.set(0, 2.2, 0);
        characterGroup.add(hairMesh);
      }
    }

    // G. Apply Clothing UV mapping
    if (avatar.shirtUrl) {
      loadTexture(avatar.shirtUrl)
        .then((tex) => {
          const shirtMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.35,
            metalness: 0.04,
            transparent: true,
          });

          // Torso layer
          const sTorsoGeo = new THREE.BoxGeometry(2.04, 2.04, 1.04);
          applyRobloxClothingUV(sTorsoGeo, 'torso');
          const sTorsoMesh = new THREE.Mesh(sTorsoGeo, shirtMat);
          characterGroup.add(sTorsoMesh);

          // Left arm layer
          const sLeftArmGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(sLeftArmGeo, 'leftArm');
          const sLeftArmMesh = new THREE.Mesh(sLeftArmGeo, shirtMat);
          sLeftArmMesh.position.set(1.5, 0, 0);
          characterGroup.add(sLeftArmMesh);

          // Right arm layer
          const sRightArmGeo = new THREE.BoxGeometry(1.04, 2.04, 1.04);
          applyRobloxClothingUV(sRightArmGeo, 'rightArm');
          const sRightArmMesh = new THREE.Mesh(sRightArmGeo, shirtMat);
          sRightArmMesh.position.set(-1.5, 0, 0);
          characterGroup.add(sRightArmMesh);
        })
        .catch((e) => console.warn('[ProfileAvatarViewer] Failed to load shirt texture:', e));
    }

    // 6. Animation Loop (Breathing/Idle Sway & Smooth Drag Rotation)
    let clock = 0;
    const animate = () => {
      clock += 0.018;

      // Inertial damping towards target rotation
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.12;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.12;

      // Subtle breathing motion
      const breath = Math.sin(clock * 1.8) * 0.02;
      const sway = Math.sin(clock * 0.9) * 0.015;

      if (characterGroupRef.current) {
        characterGroupRef.current.rotation.x = currentRotationRef.current.x + breath * 0.5;
        characterGroupRef.current.rotation.y = currentRotationRef.current.y + sway;
        characterGroupRef.current.position.y = breath * 0.4;
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 7. Mouse / Touch Drag Events for 3D Orbit
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

      targetRotationRef.current.y += deltaX * 0.015;
      targetRotationRef.current.x = Math.max(-0.25, Math.min(0.35, targetRotationRef.current.x + deltaY * 0.015));

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

    // Resize observer
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

  const handleResetAngle = () => {
    targetRotationRef.current = { x: 0.08, y: 0.35 };
  };

  return (
    <div className={`relative group select-none ${className}`}>
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden flex items-center justify-center"
      />
      {/* Interactive Controls Overlay */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 backdrop-blur-md px-2 py-1 rounded-full border border-neutral-700/60 shadow-lg text-[10px] text-neutral-300 font-medium">
        <button
          type="button"
          onClick={handleResetAngle}
          title="Reset 3D Angle"
          className="p-1 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
        >
          <RotateCw className="w-3 h-3" />
          <span>Rotate</span>
        </button>
      </div>
    </div>
  );
}
