import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { applyRobloxClothingUV } from '../utils/robloxClothingUV.ts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export type BodyPart = 'all' | 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export interface AvatarColors {
  head: string;
  torso: string;
  leftArm: string;
  rightArm: string;
  leftLeg: string;
  rightLeg: string;
}

interface AvatarCanvas3DProps {
  colors: AvatarColors;
  selectedPart?: BodyPart;
  onSelectPart?: (part: BodyPart) => void;
  shirtUrl: string | null;
  pantsUrl: string | null;
  is3D?: boolean;
  isRedrawing?: boolean;
}

// Robust helper to load texture from either URL or data URL
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
      texture.magFilter = THREE.NearestFilter; // Classic crisp pixel texture
      texture.needsUpdate = true;
      resolve(texture);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = url;
  });
}

export default function AvatarCanvas3D({
  colors,
  selectedPart = 'all',
  onSelectPart,
  shirtUrl,
  pantsUrl,
  is3D = true,
  isRedrawing = false,
}: AvatarCanvas3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Zoom level state (1.0 default, 0.65 min, 2.2 max)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const targetZoomRef = useRef(1.0);
  const currentZoomRef = useRef(1.0);

  // Base meshes for skin tone
  const bodyMeshesRef = useRef<{
    head?: THREE.Mesh;
    torso?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
    leftLeg?: THREE.Mesh;
    rightLeg?: THREE.Mesh;
    faceQuad?: THREE.Mesh;
  }>({});

  // Clothing layer meshes
  const clothingMeshesRef = useRef<{
    shirtTorso?: THREE.Mesh;
    shirtLeftArm?: THREE.Mesh;
    shirtRightArm?: THREE.Mesh;
    pantsTorso?: THREE.Mesh;
    pantsLeftLeg?: THREE.Mesh;
    pantsRightLeg?: THREE.Mesh;
  }>({});

  // Pointer drag state for 3D rotation
  const isDraggingRef = useRef(false);
  const previousPointerPosition = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.12, y: 0.45 });
  const currentRotation = useRef({ x: 0.12, y: 0.45 });

  // 1. Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // A. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // B. Camera
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, -0.4, 9.6);
    camera.lookAt(0, -0.75, 0);
    cameraRef.current = camera;

    // C. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // D. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.35);
    keyLight.position.set(4, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd9e8fc, 0.7);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.55);
    rimLight.position.set(0, 4, -6);
    scene.add(rimLight);

    // E. Character Group
    const characterGroup = new THREE.Group();
    characterGroupRef.current = characterGroup;
    scene.add(characterGroup);

    const createBodyMaterial = (colorHex: string) => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.35,
        metalness: 0.04,
      });
    };

    // --- BASE BODY MESHES ---
    // 1. Torso: 2.0 x 2.0 x 1.0
    const torsoGeo = new THREE.BoxGeometry(2.0, 2.0, 1.0);
    const torsoMat = createBodyMaterial(colors.torso);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, 0, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.name = 'torso';
    characterGroup.add(torsoMesh);
    bodyMeshesRef.current.torso = torsoMesh;

    // 2. Head: Cylinder with smooth rounded bevel (NO LEGO STUD!)
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

    const headGeo = new THREE.LatheGeometry(headPoints, 36);
    const headMat = createBodyMaterial(colors.head);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 1.62, 0);
    headMesh.castShadow = true;
    headMesh.name = 'head';
    characterGroup.add(headMesh);
    bodyMeshesRef.current.head = headMesh;

    // Classic Smile Face Decal on head
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, 512, 512);
    fctx.fillStyle = '#141619';
    fctx.beginPath();
    fctx.ellipse(190, 215, 22, 34, 0, 0, Math.PI * 2);
    fctx.fill();
    fctx.beginPath();
    fctx.ellipse(322, 215, 22, 34, 0, 0, Math.PI * 2);
    fctx.fill();
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
    characterGroup.add(faceQuad);
    bodyMeshesRef.current.faceQuad = faceQuad;

    // 3. Left Arm: 1.0 x 2.0 x 1.0 at x = +1.5 (character's left)
    const leftArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftArmMat = createBodyMaterial(colors.leftArm);
    const leftArmMesh = new THREE.Mesh(leftArmGeo, leftArmMat);
    leftArmMesh.position.set(1.5, 0, 0);
    leftArmMesh.castShadow = true;
    leftArmMesh.name = 'leftArm';
    characterGroup.add(leftArmMesh);
    bodyMeshesRef.current.leftArm = leftArmMesh;

    // 4. Right Arm: 1.0 x 2.0 x 1.0 at x = -1.5 (character's right)
    const rightArmGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightArmMat = createBodyMaterial(colors.rightArm);
    const rightArmMesh = new THREE.Mesh(rightArmGeo, rightArmMat);
    rightArmMesh.position.set(-1.5, 0, 0);
    rightArmMesh.castShadow = true;
    rightArmMesh.name = 'rightArm';
    characterGroup.add(rightArmMesh);
    bodyMeshesRef.current.rightArm = rightArmMesh;

    // 5. Left Leg: 1.0 x 2.0 x 1.0 at x = +0.5, y = -2.0 (character's left)
    const leftLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const leftLegMat = createBodyMaterial(colors.leftLeg);
    const leftLegMesh = new THREE.Mesh(leftLegGeo, leftLegMat);
    leftLegMesh.position.set(0.5, -2.0, 0);
    leftLegMesh.castShadow = true;
    leftLegMesh.name = 'leftLeg';
    characterGroup.add(leftLegMesh);
    bodyMeshesRef.current.leftLeg = leftLegMesh;

    // 6. Right Leg: 1.0 x 2.0 x 1.0 at x = -0.5, y = -2.0 (character's right)
    const rightLegGeo = new THREE.BoxGeometry(1.0, 2.0, 1.0);
    const rightLegMat = createBodyMaterial(colors.rightLeg);
    const rightLegMesh = new THREE.Mesh(rightLegGeo, rightLegMat);
    rightLegMesh.position.set(-0.5, -2.0, 0);
    rightLegMesh.castShadow = true;
    rightLegMesh.name = 'rightLeg';
    characterGroup.add(rightLegMesh);
    bodyMeshesRef.current.rightLeg = rightLegMesh;

    // --- CLOTHING LAYERS WITH PRECISE ROBLOX UV MAPPING ---
    // Helper to create clothing mesh with UV coordinates
    const createClothingMesh = (
      width: number,
      height: number,
      depth: number,
      scaleFactor: number,
      partType: 'torso' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg',
      position: [number, number, number]
    ) => {
      const geo = new THREE.BoxGeometry(width * scaleFactor, height * scaleFactor, depth * scaleFactor);
      applyRobloxClothingUV(geo, partType);

      // Material: visible is true, transparent is true, alphaTest discards 0-alpha pixels so skin shows through!
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.05,
        roughness: 0.45,
        metalness: 0.04,
        side: THREE.FrontSide,
        visible: true,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...position);
      mesh.castShadow = true;
      // Start hidden until a valid texture is loaded
      mesh.visible = false;
      characterGroup.add(mesh);
      return mesh;
    };

    // Pants meshes: 1.010 scale factor
    clothingMeshesRef.current.pantsTorso = createClothingMesh(2.0, 2.0, 1.0, 1.010, 'torso', [0, 0, 0]);
    clothingMeshesRef.current.pantsLeftLeg = createClothingMesh(1.0, 2.0, 1.0, 1.012, 'leftLeg', [0.5, -2.0, 0]);
    clothingMeshesRef.current.pantsRightLeg = createClothingMesh(1.0, 2.0, 1.0, 1.012, 'rightLeg', [-0.5, -2.0, 0]);

    // Shirt meshes: matching 1.016 scale factor across torso and arms for a flat, seamless shoulder line
    clothingMeshesRef.current.shirtTorso = createClothingMesh(2.0, 2.0, 1.0, 1.016, 'torso', [0, 0, 0]);
    clothingMeshesRef.current.shirtLeftArm = createClothingMesh(1.0, 2.0, 1.0, 1.016, 'leftArm', [1.5, 0, 0]);
    clothingMeshesRef.current.shirtRightArm = createClothingMesh(1.0, 2.0, 1.0, 1.016, 'rightArm', [-1.5, 0, 0]);

    // Floor Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(2.4, 36);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f1012,
      transparent: true,
      opacity: 0.45,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -3.01, 0);
    characterGroup.add(shadowMesh);

    // F. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth zoom interpolation
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.15;
      const zoom = currentZoomRef.current;
      const baseDistance = 9.6;
      const currentDistance = baseDistance / zoom;

      if (cameraRef.current) {
        cameraRef.current.position.z = currentDistance;
        cameraRef.current.position.y = -0.4;
      }

      if (characterGroupRef.current) {
        if (isDraggingRef.current) {
          currentRotation.current.y += rotationVelocity.current.y;
          currentRotation.current.x += rotationVelocity.current.x;
          rotationVelocity.current.x *= 0.88;
          rotationVelocity.current.y *= 0.88;
        } else {
          currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.1;
          currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.1;
        }

        // Clamp vertical tilt
        currentRotation.current.x = Math.max(-0.4, Math.min(0.45, currentRotation.current.x));

        characterGroupRef.current.rotation.y = currentRotation.current.y;
        characterGroupRef.current.rotation.x = currentRotation.current.x;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update base mesh skin colors dynamically
  useEffect(() => {
    const meshes = bodyMeshesRef.current;
    if (meshes.head) (meshes.head.material as THREE.MeshStandardMaterial).color.set(colors.head);
    if (meshes.torso) (meshes.torso.material as THREE.MeshStandardMaterial).color.set(colors.torso);
    if (meshes.leftArm) (meshes.leftArm.material as THREE.MeshStandardMaterial).color.set(colors.leftArm);
    if (meshes.rightArm) (meshes.rightArm.material as THREE.MeshStandardMaterial).color.set(colors.rightArm);
    if (meshes.leftLeg) (meshes.leftLeg.material as THREE.MeshStandardMaterial).color.set(colors.leftLeg);
    if (meshes.rightLeg) (meshes.rightLeg.material as THREE.MeshStandardMaterial).color.set(colors.rightLeg);
  }, [colors]);

  // Update Shirt Texture when shirtUrl changes
  useEffect(() => {
    const clothing = clothingMeshesRef.current;
    if (!shirtUrl) {
      if (clothing.shirtTorso) clothing.shirtTorso.visible = false;
      if (clothing.shirtLeftArm) clothing.shirtLeftArm.visible = false;
      if (clothing.shirtRightArm) clothing.shirtRightArm.visible = false;
      return;
    }

    let isMounted = true;
    loadRobloxTexture(shirtUrl)
      .then((texture) => {
        if (!isMounted) return;

        const applyToMesh = (mesh?: THREE.Mesh) => {
          if (!mesh) return;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.map = texture;
          mat.visible = true;
          mat.needsUpdate = true;
          mesh.visible = true;
        };

        applyToMesh(clothing.shirtTorso);
        applyToMesh(clothing.shirtLeftArm);
        applyToMesh(clothing.shirtRightArm);
      })
      .catch((err) => {
        console.error('Failed to load shirt texture:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shirtUrl]);

  // Update Pants Texture when pantsUrl changes
  useEffect(() => {
    const clothing = clothingMeshesRef.current;
    if (!pantsUrl) {
      if (clothing.pantsTorso) clothing.pantsTorso.visible = false;
      if (clothing.pantsLeftLeg) clothing.pantsLeftLeg.visible = false;
      if (clothing.pantsRightLeg) clothing.pantsRightLeg.visible = false;
      return;
    }

    let isMounted = true;
    loadRobloxTexture(pantsUrl)
      .then((texture) => {
        if (!isMounted) return;

        const applyToMesh = (mesh?: THREE.Mesh) => {
          if (!mesh) return;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.map = texture;
          mat.visible = true;
          mat.needsUpdate = true;
          mesh.visible = true;
        };

        applyToMesh(clothing.pantsTorso);
        applyToMesh(clothing.pantsLeftLeg);
        applyToMesh(clothing.pantsRightLeg);
      })
      .catch((err) => {
        console.error('Failed to load pants texture:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [pantsUrl]);

  // Handle 2D vs 3D switch
  useEffect(() => {
    if (!is3D) {
      targetRotation.current = { x: 0, y: 0 };
    } else {
      targetRotation.current = { x: 0.12, y: 0.45 };
    }
  }, [is3D]);

  // Handle Redraw spin reset
  useEffect(() => {
    if (isRedrawing) {
      targetRotation.current = { x: 0.12, y: targetRotation.current.y + Math.PI * 2 };
    }
  }, [isRedrawing]);

  // Mouse / Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!is3D) return;
    isDraggingRef.current = true;
    previousPointerPosition.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !is3D) return;

    const deltaX = e.clientX - previousPointerPosition.current.x;
    const deltaY = e.clientY - previousPointerPosition.current.y;

    previousPointerPosition.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.009;
    rotationVelocity.current = {
      x: deltaY * sensitivity,
      y: deltaX * sensitivity,
    };

    targetRotation.current.y += deltaX * sensitivity;
    targetRotation.current.x += deltaY * sensitivity;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Mouse wheel zoom handler (smooth clamped zoom, never stuck inside)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.0015;
    const newZoom = Math.max(0.65, Math.min(2.2, targetZoomRef.current + zoomDelta));
    targetZoomRef.current = newZoom;
    setZoomLevel(newZoom);
  };

  // Zoom button handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(2.2, targetZoomRef.current + 0.25);
    targetZoomRef.current = newZoom;
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(0.65, targetZoomRef.current - 0.25);
    targetZoomRef.current = newZoom;
    setZoomLevel(newZoom);
  };

  const handleResetCamera = useCallback(() => {
    targetZoomRef.current = 1.0;
    setZoomLevel(1.0);
    targetRotation.current = is3D ? { x: 0.12, y: 0.45 } : { x: 0, y: 0 };
    rotationVelocity.current = { x: 0, y: 0 };
  }, [is3D]);

  // Click on 3D mesh body part to select
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const interactiveMeshes = Object.values(bodyMeshesRef.current).filter(
      (m): m is THREE.Mesh => m instanceof THREE.Mesh && m.name !== ''
    );

    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

    if (intersects.length > 0) {
      const hitName = intersects[0].object.name as BodyPart;
      if (hitName && ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].includes(hitName)) {
        onSelectPart?.(hitName);
      }
    }
  };

  return (
    <div
      className={`w-full h-full relative select-none ${
        isRedrawing ? 'opacity-70 scale-95 transition-all duration-300' : 'opacity-100 scale-100'
      }`}
      onWheel={handleWheel}
    >
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Camera Controls Overlay: Zoom In, Zoom Out, Reset Camera */}
      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-20">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-7 h-7 flex items-center justify-center bg-[#232528]/85 hover:bg-[#32353a] text-neutral-300 hover:text-white border border-neutral-700/60 backdrop-blur-sm transition-colors text-xs"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-7 h-7 flex items-center justify-center bg-[#232528]/85 hover:bg-[#32353a] text-neutral-300 hover:text-white border border-neutral-700/60 backdrop-blur-sm transition-colors text-xs"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset Camera"
          className="w-7 h-7 flex items-center justify-center bg-[#232528]/85 hover:bg-[#32353a] text-neutral-300 hover:text-white border border-neutral-700/60 backdrop-blur-sm transition-colors text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zoom % indicator pill */}
      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[10px] text-neutral-400 bg-[#161719]/85 border border-neutral-800 pointer-events-none backdrop-blur-sm">
        Zoom: {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
}
