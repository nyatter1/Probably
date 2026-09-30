import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { applyRobloxClothingUV } from '../utils/robloxClothingUV.ts';
import { AvatarColors } from './AvatarCanvas3D.tsx';
import { SavedGame, StudioPart } from '../utils/gamesStorage.ts';
import { LuaRuntime } from '../utils/luaEngine.ts';
import RobloxGuiRenderer from './ui-engine/RobloxGuiRenderer.tsx';

interface GameWorldProps {
  game?: SavedGame;
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  onExitGame: () => void;
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

interface WorldBox {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  canCollide: boolean;
}

export default function GameWorld({
  game,
  colors,
  shirtUrl,
  pantsUrl,
  onExitGame,
}: GameWorldProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [deathFlash, setDeathFlash] = useState(false);
  const [activeRuntime, setActiveRuntime] = useState<LuaRuntime | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Player character refs
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const leftArmGroupRef = useRef<THREE.Group | null>(null);
  const rightArmGroupRef = useRef<THREE.Group | null>(null);
  const leftLegGroupRef = useRef<THREE.Group | null>(null);
  const rightLegGroupRef = useRef<THREE.Group | null>(null);

  // Scattered ragdoll limbs on death
  const scatteredRagdollPartsRef = useRef<
    Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; rotVel: THREE.Vector3; sizeY: number }>
  >([]);

  // Player physics state
  const playerState = useRef({
    position: new THREE.Vector3(0, 3.0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotationY: Math.PI,
    isGrounded: true,
    walkTime: 0,
    isMoving: false,
    isDead: false,
  });

  // 3rd Person Camera Orbit state
  const cameraState = useRef({
    distance: 12.0,
    targetDistance: 12.0,
    theta: 0,
    phi: 0.38,
    targetLookAt: new THREE.Vector3(0, 3.5, 0),
  });

  const isDraggingMouse = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const worldCollidersRef = useRef<WorldBox[]>([]);
  const luaRuntimeRef = useRef<LuaRuntime | null>(null);

  const playOofSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.32);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Dynamic physics positions for unanchored parts
  const dynamicPartsPhysics = useRef<
    Map<string, { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; size: THREE.Vector3; canCollide: boolean }>
  >(new Map());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') {
        setShowExitModal((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x8cb8e6);
    scene.fog = new THREE.FogExp2(0x8cb8e6, 0.005);

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 0.85);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.45);
    dirLight.position.set(35, 55, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 160;
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 45;
    dirLight.shadow.camera.bottom = -45;
    scene.add(dirLight);

    // Classic Baseplate
    const plateSize = 250;
    const baseplateGeo = new THREE.PlaneGeometry(plateSize, plateSize, 20, 20);

    const studCanvas = document.createElement('canvas');
    studCanvas.width = 64;
    studCanvas.height = 64;
    const sctx = studCanvas.getContext('2d')!;
    sctx.fillStyle = '#4b8c38';
    sctx.fillRect(0, 0, 64, 64);
    sctx.strokeStyle = '#3e762d';
    sctx.lineWidth = 1.5;
    sctx.strokeRect(1, 1, 62, 62);
    sctx.fillStyle = '#559c40';
    sctx.beginPath();
    sctx.arc(32, 32, 14, 0, Math.PI * 2);
    sctx.fill();
    sctx.strokeStyle = '#3e762d';
    sctx.stroke();

    const baseplateTexture = new THREE.CanvasTexture(studCanvas);
    baseplateTexture.wrapS = THREE.RepeatWrapping;
    baseplateTexture.wrapT = THREE.RepeatWrapping;
    baseplateTexture.repeat.set(plateSize / 4, plateSize / 4);

    const baseplateMat = new THREE.MeshStandardMaterial({
      map: baseplateTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.rotation.x = -Math.PI / 2;
    baseplate.receiveShadow = true;
    scene.add(baseplate);

    // Spawn Pad
    const spawnGeo = new THREE.BoxGeometry(8, 0.4, 8);
    const spawnMat = new THREE.MeshStandardMaterial({ color: 0x8a9299, roughness: 0.6 });
    const spawnPad = new THREE.Mesh(spawnGeo, spawnMat);
    spawnPad.position.set(0, 0.2, 0);
    spawnPad.receiveShadow = true;
    scene.add(spawnPad);

    // BUILD WORLD PARTS (from custom saved game or default set)
    const colliders: WorldBox[] = [];
    dynamicPartsPhysics.current.clear();

    const partsToRender: StudioPart[] =
      game?.parts && game.parts.length > 0
        ? game.parts
        : [
            {
              id: 'red_brick',
              name: 'Red Brick',
              shape: 'block',
              position: [16, 1.5, 12],
              size: [6, 3, 6],
              rotation: [0, 0, 0],
              color: '#c4281b',
              material: 'Plastic',
              transparency: 0,
              anchored: true,
              canCollide: true,
            },
            {
              id: 'blue_tower',
              name: 'Blue Tower',
              shape: 'block',
              position: [24, 3.0, 16],
              size: [6, 6, 6],
              rotation: [0, 0, 0],
              color: '#0d69ac',
              material: 'Plastic',
              transparency: 0,
              anchored: true,
              canCollide: true,
            },
            {
              id: 'yellow_platform',
              name: 'Yellow Platform',
              shape: 'block',
              position: [33, 4.5, 22],
              size: [8, 9, 8],
              rotation: [0, 0, 0],
              color: '#f5cd2f',
              material: 'Plastic',
              transparency: 0,
              anchored: true,
              canCollide: true,
            },
          ];

    partsToRender.forEach((part) => {
      let geo: THREE.BufferGeometry;
      if (part.shape === 'sphere') {
        geo = new THREE.SphereGeometry(part.size[0] / 2, 24, 24);
      } else if (part.shape === 'cylinder') {
        geo = new THREE.CylinderGeometry(part.size[0] / 2, part.size[0] / 2, part.size[1], 24);
      } else {
        geo = new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2]);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(part.color),
        roughness: part.material === 'SmoothPlastic' ? 0.2 : 0.5,
      });

      if (part.material === 'Neon') {
        mat.emissive.set(part.color);
        mat.emissiveIntensity = 0.6;
      }

      if (part.transparency > 0) {
        mat.transparent = true;
        mat.opacity = 1 - part.transparency;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...part.position);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2])
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const halfW = part.size[0] / 2;
      const halfH = part.size[1] / 2;
      const halfD = part.size[2] / 2;

      if (part.anchored) {
        colliders.push({
          id: part.id,
          min: new THREE.Vector3(part.position[0] - halfW, part.position[1] - halfH, part.position[2] - halfD),
          max: new THREE.Vector3(part.position[0] + halfW, part.position[1] + halfH, part.position[2] + halfD),
          canCollide: part.canCollide,
        });
      } else {
        // Dynamic falling part
        dynamicPartsPhysics.current.set(part.id, {
          mesh,
          pos: new THREE.Vector3(...part.position),
          vel: new THREE.Vector3(0, 0, 0),
          size: new THREE.Vector3(...part.size),
          canCollide: part.canCollide,
        });
      }
    });

    worldCollidersRef.current = colliders;

    // BUILD PLAYER CHARACTER
    const playerGroup = new THREE.Group();
    playerGroupRef.current = playerGroup;
    scene.add(playerGroup);

    const createBodyMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.35,
        metalness: 0.04,
      });

    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), createBodyMat(colors.torso));
    torsoMesh.castShadow = true;
    playerGroup.add(torsoMesh);

    // Head
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
    const headMesh = new THREE.Mesh(headGeo, createBodyMat(colors.head));
    headMesh.position.set(0, 1.62, 0);
    headMesh.castShadow = true;
    playerGroup.add(headMesh);

    // Smile Face Quad
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const fctx = faceCanvas.getContext('2d')!;
    fctx.fillStyle = '#141619';
    fctx.beginPath();
    fctx.ellipse(95, 107, 11, 17, 0, 0, Math.PI * 2);
    fctx.fill();
    fctx.beginPath();
    fctx.ellipse(161, 107, 11, 17, 0, 0, Math.PI * 2);
    fctx.fill();
    fctx.strokeStyle = '#141619';
    fctx.lineWidth = 11;
    fctx.lineCap = 'round';
    fctx.beginPath();
    fctx.arc(128, 130, 40, 0.22 * Math.PI, 0.78 * Math.PI, false);
    fctx.stroke();

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.85),
      new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false })
    );
    faceQuad.position.set(0, 1.62, 0.655);
    playerGroup.add(faceQuad);

    // Pivots
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(1.5, 1.0, 0);
    playerGroup.add(leftArmPivot);
    leftArmGroupRef.current = leftArmPivot;

    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), createBodyMat(colors.leftArm));
    leftArmMesh.position.set(0, -1.0, 0);
    leftArmMesh.castShadow = true;
    leftArmPivot.add(leftArmMesh);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(-1.5, 1.0, 0);
    playerGroup.add(rightArmPivot);
    rightArmGroupRef.current = rightArmPivot;

    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), createBodyMat(colors.rightArm));
    rightArmMesh.position.set(0, -1.0, 0);
    rightArmMesh.castShadow = true;
    rightArmPivot.add(rightArmMesh);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0.5, -1.0, 0);
    playerGroup.add(leftLegPivot);
    leftLegGroupRef.current = leftLegPivot;

    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), createBodyMat(colors.leftLeg));
    leftLegMesh.position.set(0, -1.0, 0);
    leftLegMesh.castShadow = true;
    leftLegPivot.add(leftLegMesh);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(-0.5, -1.0, 0);
    playerGroup.add(rightLegPivot);
    rightLegGroupRef.current = rightLegPivot;

    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), createBodyMat(colors.rightLeg));
    rightLegMesh.position.set(0, -1.0, 0);
    rightLegMesh.castShadow = true;
    rightLegPivot.add(rightLegMesh);

    // CLOTHING LAYERS
    const createClothingMesh = (
      width: number,
      height: number,
      depth: number,
      partType: 'torso' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg'
    ) => {
      const geo = new THREE.BoxGeometry(width, height, depth);
      applyRobloxClothingUV(geo, partType);
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
      mesh.castShadow = true;
      mesh.visible = false;
      return mesh;
    };

    const pantsTorsoMesh = createClothingMesh(2 * 1.010, 2 * 1.010, 1 * 1.010, 'torso');
    pantsTorsoMesh.position.set(0, 0, 0);
    playerGroup.add(pantsTorsoMesh);

    const pantsLeftLegMesh = createClothingMesh(1 * 1.012, 2 * 1.012, 1 * 1.012, 'leftLeg');
    pantsLeftLegMesh.position.set(0, -1.0, 0);
    leftLegPivot.add(pantsLeftLegMesh);

    const pantsRightLegMesh = createClothingMesh(1 * 1.012, 2 * 1.012, 1 * 1.012, 'rightLeg');
    pantsRightLegMesh.position.set(0, -1.0, 0);
    rightLegPivot.add(pantsRightLegMesh);

    const shirtTorsoMesh = createClothingMesh(2 * 1.016, 2 * 1.016, 1 * 1.016, 'torso');
    shirtTorsoMesh.position.set(0, 0, 0);
    playerGroup.add(shirtTorsoMesh);

    const shirtLeftArmMesh = createClothingMesh(1 * 1.016, 2 * 1.016, 1 * 1.016, 'leftArm');
    shirtLeftArmMesh.position.set(0, -1.0, 0);
    leftArmPivot.add(shirtLeftArmMesh);

    const shirtRightArmMesh = createClothingMesh(1 * 1.016, 2 * 1.016, 1 * 1.016, 'rightArm');
    shirtRightArmMesh.position.set(0, -1.0, 0);
    rightArmPivot.add(shirtRightArmMesh);

    if (shirtUrl) {
      loadRobloxTexture(shirtUrl)
        .then((tex) => {
          [shirtTorsoMesh, shirtLeftArmMesh, shirtRightArmMesh].forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.map = tex;
            mat.visible = true;
            mat.needsUpdate = true;
            m.visible = true;
          });
        })
        .catch((e) => console.error('Error loading shirt in game:', e));
    }

    if (pantsUrl) {
      loadRobloxTexture(pantsUrl)
        .then((tex) => {
          [pantsTorsoMesh, pantsLeftLegMesh, pantsRightLegMesh].forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.map = tex;
            mat.visible = true;
            mat.needsUpdate = true;
            m.visible = true;
          });
        })
        .catch((e) => console.error('Error loading pants in game:', e));
    }

    playerGroup.position.copy(playerState.current.position);
    playerGroup.rotation.y = playerState.current.rotationY;

    // Start Lua Script Runtime for any scripts attached to parts in this experience
    const meshesMap = new Map<string, THREE.Mesh>();
    partsToRender.forEach((p) => {
      const obj = scene.getObjectByName(p.id);
      if (obj instanceof THREE.Mesh) {
        meshesMap.set(p.id, obj);
      }
    });

    const triggerPlayerDeath = () => {
      if (playerState.current.isDead) return;
      playerState.current.isDead = true;
      playerState.current.velocity.set(0, 0, 0);

      setDeathFlash(true);
      setTimeout(() => setDeathFlash(false), 1200);

      playOofSound();

      const pGroup = playerGroupRef.current;
      if (pGroup) pGroup.visible = false;

      const deathPos = pGroup ? pGroup.position.clone() : playerState.current.position.clone();

      const partsData = [
        { name: 'Head', size: [1.2, 1.2, 1.2], color: colors.head, shape: 'sphere', offset: [0, 1.2, 0] },
        { name: 'Torso', size: [2, 2, 1], color: colors.torso, shape: 'box', offset: [0, 0, 0] },
        { name: 'LArm', size: [1, 2, 1], color: colors.leftArm, shape: 'box', offset: [-1.4, 0, 0] },
        { name: 'RArm', size: [1, 2, 1], color: colors.rightArm, shape: 'box', offset: [1.4, 0, 0] },
        { name: 'LLeg', size: [1, 2, 1], color: colors.leftLeg, shape: 'box', offset: [-0.5, -1.8, 0] },
        { name: 'RLeg', size: [1, 2, 1], color: colors.rightLeg, shape: 'box', offset: [0.5, -1.8, 0] },
      ];

      partsData.forEach((pd) => {
        const geo = pd.shape === 'sphere' ? new THREE.SphereGeometry(pd.size[0] / 2, 16, 16) : new THREE.BoxGeometry(pd.size[0], pd.size[1], pd.size[2]);
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pd.color), roughness: 0.35 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.position.set(deathPos.x + pd.offset[0], deathPos.y + pd.offset[1], deathPos.z + pd.offset[2]);

        scene.add(mesh);

        scatteredRagdollPartsRef.current.push({
          mesh,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            7.0 + Math.random() * 8.0,
            (Math.random() - 0.5) * 14
          ),
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12
          ),
          sizeY: pd.size[1],
        });
      });

      // 3 Seconds Delay to look around, then clean respawn!
      setTimeout(() => {
        scatteredRagdollPartsRef.current.forEach((item) => {
          scene.remove(item.mesh);
          item.mesh.geometry.dispose();
          if (Array.isArray(item.mesh.material)) item.mesh.material.forEach((m) => m.dispose());
          else item.mesh.material.dispose();
        });
        scatteredRagdollPartsRef.current = [];

        playerState.current.position.set(0, 3.0, 0);
        playerState.current.velocity.set(0, 0, 0);
        if (playerGroupRef.current) {
          playerGroupRef.current.position.set(0, 3.0, 0);
          playerGroupRef.current.visible = true;
        }
        playerState.current.isDead = false;
      }, 3000);
    };

    const runtime = new LuaRuntime({
      parts: partsToRender,
      threeMeshes: meshesMap,
      scene,
      camera: cameraRef.current,
      uiTree: game?.uiTree,
      onPlayerKilled: () => {
        triggerPlayerDeath();
      },
    });

    luaRuntimeRef.current = runtime;
    setActiveRuntime(runtime);

    const scriptsToRun: { partId: string; source: string; scriptName: string }[] = [];
    partsToRender.forEach((part) => {
      if (part.script && part.script.enabled && part.script.code.trim()) {
        scriptsToRun.push({
          partId: part.id,
          source: part.script.code,
          scriptName: `${part.name}.Script`,
        });
      }
    });

    // Start scripts on parts and in PlayerGui / StarterGui
    runtime.startScripts(scriptsToRun);

    // --- GAME PHYSICS & ANIMATION LOOP ---
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const keys = keysPressed.current;
      const state = playerState.current;
      const cam = cameraState.current;

      // Step Lua runtime (Tweens, RunService, etc.) and check collisions
      if (luaRuntimeRef.current) {
        luaRuntimeRef.current.step(dt);
        luaRuntimeRef.current.updatePlayerPosition(state.position);
        luaRuntimeRef.current.checkTouchCollisions(state.position);
        const hum = luaRuntimeRef.current.playerCharacter.Humanoid;
        if (hum && hum.Health <= 0 && !state.isDead) {
          triggerPlayerDeath();
        }
      }
      if (!state.isDead && state.position.y < -30) {
        triggerPlayerDeath();
      }

      // Movement Input
      let inputForward = 0;
      let inputRight = 0;

      if (!state.isDead) {
        if (keys['w'] || keys['arrowup']) inputForward += 1;
        if (keys['s'] || keys['arrowdown']) inputForward -= 1;
        if (keys['d'] || keys['arrowright']) inputRight += 1;
        if (keys['a'] || keys['arrowleft']) inputRight -= 1;
      }

      const isInputMoving = inputForward !== 0 || inputRight !== 0;
      state.isMoving = isInputMoving;

      const moveSpeed = 14.0;

      if (!state.isDead && isInputMoving) {
        const len = Math.hypot(inputForward, inputRight);
        const normForward = inputForward / len;
        const normRight = inputRight / len;

        const forwardX = -Math.sin(cam.theta);
        const forwardZ = -Math.cos(cam.theta);
        const rightX = Math.cos(cam.theta);
        const rightZ = -Math.sin(cam.theta);

        const targetVelX = (normForward * forwardX + normRight * rightX) * moveSpeed;
        const targetVelZ = (normForward * forwardZ + normRight * rightZ) * moveSpeed;

        state.velocity.x = targetVelX;
        state.velocity.z = targetVelZ;

        const targetRotY = Math.atan2(targetVelX, targetVelZ);
        let diff = targetRotY - state.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        state.rotationY += diff * Math.min(1.0, dt * 16);
      } else {
        state.velocity.x *= 0.72;
        state.velocity.z *= 0.72;
      }

      // Jump & Gravity
      const gravity = -38.0;
      const jumpStrength = 15.5;

      if (!state.isDead && keys[' '] && state.isGrounded) {
        state.velocity.y = jumpStrength;
        state.isGrounded = false;
      }

      state.velocity.y += gravity * dt;

      // Animate scattered ragdoll limbs on death
      scatteredRagdollPartsRef.current.forEach((item) => {
        item.vel.y += gravity * dt;
        item.mesh.position.addScaledVector(item.vel, dt);
        item.mesh.rotation.x += item.rotVel.x * dt;
        item.mesh.rotation.y += item.rotVel.y * dt;
        item.mesh.rotation.z += item.rotVel.z * dt;

        const floorH = item.sizeY / 2;
        if (item.mesh.position.y <= floorH) {
          item.mesh.position.y = floorH;
          if (Math.abs(item.vel.y) > 2) {
            item.vel.y = -item.vel.y * 0.32;
          } else {
            item.vel.y = 0;
            item.vel.x *= 0.82;
            item.vel.z *= 0.82;
            item.rotVel.multiplyScalar(0.85);
          }
        }
      });

      // Update unanchored dynamic parts physics
      dynamicPartsPhysics.current.forEach((dyn) => {
        dyn.vel.y += gravity * dt;
        dyn.pos.y += dyn.vel.y * dt;

        const floorH = dyn.size.y / 2;
        if (dyn.pos.y <= floorH) {
          dyn.pos.y = floorH;
          if (Math.abs(dyn.vel.y) > 4) {
            dyn.vel.y = -dyn.vel.y * 0.25;
          } else {
            dyn.vel.y = 0;
          }
        }
        dyn.mesh.position.copy(dyn.pos);
      });

      // Build active colliders dynamically reflecting live Lua script changes
      const activeColliders: WorldBox[] = [];
      partsToRender.forEach((part) => {
        const rbxPart = luaRuntimeRef.current?.partsMap.get(part.id);
        const liveCanCollide = rbxPart !== undefined ? rbxPart.CanCollide : part.canCollide;
        if (!liveCanCollide) return;

        let pos = new THREE.Vector3(...part.position);
        if (rbxPart) {
          pos.set(rbxPart.Position.x, rbxPart.Position.y, rbxPart.Position.z);
        } else {
          const dyn = dynamicPartsPhysics.current.get(part.id);
          if (dyn && !part.anchored) pos = dyn.pos;
        }

        const half = new THREE.Vector3(...part.size).multiplyScalar(0.5);
        if (rbxPart) {
          half.set(rbxPart.Size.x * 0.5, rbxPart.Size.y * 0.5, rbxPart.Size.z * 0.5);
        }

        activeColliders.push({
          id: part.id,
          min: new THREE.Vector3().subVectors(pos, half),
          max: new THREE.Vector3().addVectors(pos, half),
          canCollide: true,
        });
      });

      const playerRadius = 1.0;
      const playerFeetOffset = 3.0;

      const nextX = state.position.x + state.velocity.x * dt;
      const nextZ = state.position.z + state.velocity.z * dt;
      let nextY = state.position.y + state.velocity.y * dt;

      // Trigger Lua part touches
      if (luaRuntimeRef.current) {
        partsToRender.forEach((part) => {
          const halfW = part.size[0] / 2;
          const halfH = part.size[1] / 2;
          const halfD = part.size[2] / 2;
          if (
            nextX + playerRadius >= part.position[0] - halfW &&
            nextX - playerRadius <= part.position[0] + halfW &&
            nextY + 2.0 >= part.position[1] - halfH &&
            nextY - 3.0 <= part.position[1] + halfH &&
            nextZ + playerRadius >= part.position[2] - halfD &&
            nextZ - playerRadius <= part.position[2] + halfD
          ) {
            luaRuntimeRef.current?.triggerTouch(part.id);
          }
        });
      }

      let highestFloor = 3.0; // baseplate level
      let groundedOnObstacle = false;

      activeColliders.forEach((col) => {
        if (!col.canCollide) return;
        const isOverlapX =
          nextX + playerRadius > col.min.x && nextX - playerRadius < col.max.x;
        const isOverlapZ =
          nextZ + playerRadius > col.min.z && nextZ - playerRadius < col.max.z;

        if (isOverlapX && isOverlapZ) {
          const topSurface = col.max.y + playerFeetOffset;
          // If feet were above or stepping onto top of part
          if (state.position.y >= col.max.y + 2.6 && nextY <= topSurface + 0.3) {
            if (topSurface > highestFloor) {
              highestFloor = topSurface;
              groundedOnObstacle = true;
            }
          }
        }
      });

      if (nextY <= highestFloor) {
        nextY = highestFloor;
        state.velocity.y = 0;
        state.isGrounded = true;
      } else {
        if (!groundedOnObstacle && highestFloor === 3.0) {
          if (nextY > 3.0) state.isGrounded = false;
        }
      }

      let resolvedX = nextX;
      let resolvedZ = nextZ;

      activeColliders.forEach((col) => {
        if (!col.canCollide) return;
        const playerBottom = nextY - 2.8;
        const playerTop = nextY + 1.8;

        if (playerBottom < col.max.y && playerTop > col.min.y) {
          if (
            resolvedX + playerRadius > col.min.x &&
            resolvedX - playerRadius < col.max.x &&
            resolvedZ + playerRadius > col.min.z &&
            resolvedZ - playerRadius < col.max.z
          ) {
            const pushLeft = resolvedX + playerRadius - col.min.x;
            const pushRight = col.max.x - (resolvedX - playerRadius);
            const pushBack = resolvedZ + playerRadius - col.min.z;
            const pushFront = col.max.z - (resolvedZ - playerRadius);

            const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
            if (minPush === pushLeft) resolvedX = col.min.x - playerRadius;
            else if (minPush === pushRight) resolvedX = col.max.x + playerRadius;
            else if (minPush === pushBack) resolvedZ = col.min.z - playerRadius;
            else resolvedZ = col.max.z + playerRadius;
          }
        }
      });

      const bound = plateSize / 2 - 2;
      state.position.x = Math.max(-bound, Math.min(bound, resolvedX));
      state.position.z = Math.max(-bound, Math.min(bound, resolvedZ));
      state.position.y = nextY;

      playerGroup.position.copy(state.position);
      playerGroup.rotation.y = state.rotationY;

      // Animations
      const lArm = leftArmGroupRef.current;
      const rArm = rightArmGroupRef.current;
      const lLeg = leftLegGroupRef.current;
      const rLeg = rightLegGroupRef.current;

      if (!state.isGrounded) {
        // JUMP: ARMS STRAIGHT UP INTO THE AIR
        const jumpAngle = -Math.PI;
        if (lArm) lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, jumpAngle, 0.32);
        if (rArm) rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, jumpAngle, 0.32);
        if (lLeg) lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0.28, 0.2);
        if (rLeg) rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, -0.28, 0.2);
      } else if (state.isMoving) {
        state.walkTime += dt * 11.5;
        const armSwing = Math.sin(state.walkTime) * 0.75;
        const legSwing = Math.sin(state.walkTime) * 0.85;

        if (lArm) lArm.rotation.x = -armSwing;
        if (rArm) rArm.rotation.x = armSwing;
        if (lLeg) lLeg.rotation.x = legSwing;
        if (rLeg) rLeg.rotation.x = -legSwing;
      } else {
        if (lArm) lArm.rotation.x = THREE.MathUtils.lerp(lArm.rotation.x, 0, 0.2);
        if (rArm) rArm.rotation.x = THREE.MathUtils.lerp(rArm.rotation.x, 0, 0.2);
        if (lLeg) lLeg.rotation.x = THREE.MathUtils.lerp(lLeg.rotation.x, 0, 0.2);
        if (rLeg) rLeg.rotation.x = THREE.MathUtils.lerp(rLeg.rotation.x, 0, 0.2);
      }

      // Camera Orbit
      cam.distance += (cam.targetDistance - cam.distance) * 0.18;
      cam.targetLookAt.lerp(
        new THREE.Vector3(state.position.x, state.position.y + 0.6, state.position.z),
        0.22
      );

      const cx = cam.distance * Math.sin(cam.theta) * Math.cos(cam.phi);
      const cy = cam.distance * Math.sin(cam.phi);
      const cz = cam.distance * Math.cos(cam.theta) * Math.cos(cam.phi);

      camera.position.set(
        cam.targetLookAt.x + cx,
        cam.targetLookAt.y + cy,
        cam.targetLookAt.z + cz
      );
      camera.lookAt(cam.targetLookAt);

      renderer.render(scene, camera);
    };

    animate(performance.now());

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
      if (luaRuntimeRef.current) {
        luaRuntimeRef.current.stop();
        luaRuntimeRef.current = null;
      }
      setActiveRuntime(null);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [game, colors, shirtUrl, pantsUrl]);

  // Pointer Drag & Click Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingMouse.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (cameraRef.current && e.button === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseNdc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      luaRuntimeRef.current?.handlePointerClick(mouseNdc, cameraRef.current);
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseNdc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      luaRuntimeRef.current?.handlePointerMove(mouseNdc, cameraRef.current);
    }

    if (!isDraggingMouse.current) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.0055;
    cameraState.current.theta -= deltaX * sensitivity;
    cameraState.current.phi = Math.max(
      0.08,
      Math.min(1.42, cameraState.current.phi + deltaY * sensitivity)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingMouse.current) {
      isDraggingMouse.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.005;
    cameraState.current.targetDistance = Math.max(
      4.0,
      Math.min(24.0, cameraState.current.targetDistance + e.deltaY * zoomSpeed)
    );
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none bg-black font-sans"
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Red Death Screen Flash */}
      {deathFlash && (
        <div className="fixed inset-0 bg-red-600/40 pointer-events-none z-50 flex items-center justify-center animate-fade-out">
          <div className="text-white text-3xl sm:text-4xl font-black tracking-widest uppercase drop-shadow-xl font-sans">
            OOF! YOU DIED
          </div>
        </div>
      )}

      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Roblox UI Layer (ScreenGuis in PlayerGui) */}
      {activeRuntime && (
        <RobloxGuiRenderer root={activeRuntime.bridge.player.PlayerGui} />
      )}

      {/* Top Left Menu Icon */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-20">
        <button
          type="button"
          onClick={() => setShowExitModal(true)}
          title="Rovix Menu (Esc)"
          className="w-10 h-10 rounded bg-[#18191b]/80 hover:bg-[#25272a] border border-neutral-700/60 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-md group cursor-pointer"
        >
          <svg className="w-5 h-5 text-white group-hover:scale-105 transition-transform" viewBox="0 0 100 100" fill="currentColor">
            <path d="M 24 10 L 90 26 L 76 92 L 10 76 Z" />
            <rect x="42" y="42" width="16" height="16" fill="#18191b" transform="rotate(14 50 50)" />
          </svg>
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-[#18191b]/70 border border-neutral-800 text-xs text-neutral-300 backdrop-blur-md">
          <span className="font-semibold text-white">{game?.title || 'Test Place'}</span>
          <span className="text-neutral-600">•</span>
          <span>WASD Move</span>
          <span className="text-neutral-600">•</span>
          <span>Space Jump (Arms up!)</span>
          <span className="text-neutral-600">•</span>
          <span>Drag to Orbit</span>
        </div>
      </div>

      <div className="absolute top-3 right-4 z-20">
        <div className="px-3 py-1.5 rounded bg-[#18191b]/75 border border-neutral-800 text-xs font-semibold text-white backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Test123</span>
        </div>
      </div>

      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="flex flex-col items-center text-center max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-normal mb-8">
              Are you sure you want to leave the experience?
            </h2>

            <div className="flex items-center gap-4 w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  onExitGame();
                }}
                className="w-36 sm:w-44 py-2.5 px-4 bg-[#232527]/85 hover:bg-[#34373b] active:bg-[#1a1c1e] text-neutral-200 hover:text-white font-medium text-sm rounded-lg border border-neutral-600/80 transition-all shadow-md cursor-pointer"
              >
                Leave
              </button>

              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-36 sm:w-44 py-2.5 px-4 bg-[#232527]/85 hover:bg-[#34373b] active:bg-[#1a1c1e] text-neutral-200 hover:text-white font-medium text-sm rounded-lg border border-neutral-600/80 transition-all shadow-md cursor-pointer"
              >
                Don't Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
