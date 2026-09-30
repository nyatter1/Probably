import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  Square,
  Save,
  ArrowLeft,
  Move,
  Maximize2,
  RotateCw,
  MousePointer,
  Box,
  Circle,
  Cylinder as CylinderIcon,
  Palette,
  Layers,
  Shield,
  Anchor,
  Trash2,
  Copy,
  ChevronDown,
  Check,
  Eye,
  Folder,
  EyeOff,
  Code,
  Terminal,
  X,
  FileCode,
  Sparkles,
  ChevronRight,
  Plus,
  Monitor,
  Type,
  TextCursorInput,
  Image as ImageIcon,
} from 'lucide-react';
import { SavedGame, StudioPart, saveGame } from '../utils/gamesStorage.ts';
import { AvatarColors } from './AvatarCanvas3D.tsx';
import { applyRobloxClothingUV } from '../utils/robloxClothingUV.ts';
import { getSavedAvatar } from '../utils/inventoryStorage.ts';
import {
  LuaRuntime,
  OutputLogMessage,
  LUA_SCRIPT_TEMPLATES,
} from '../utils/luaEngine.ts';
import StudioScriptEditor from './StudioScriptEditor.tsx';
import RobloxGuiRenderer from './ui-engine/RobloxGuiRenderer.tsx';
import StudioExplorer from './studio/StudioExplorer.tsx';
import StudioInstanceProperties from './studio/StudioInstanceProperties.tsx';
import { serializeInstance, deserializeInstance } from '../utils/instanceSerializer.ts';
import { RBXInstance } from '../scripting/instances/Instance.ts';
import { RBXScript } from '../scripting/instances/Script.ts';
import { RBXInstanceFactory } from '../scripting/instances/InstanceFactory.ts';
import { RBXGuiObject } from '../scripting/instances/ui/GuiObject.ts';
import { RBXUDim2 } from '../scripting/datatypes/UDim2.ts';

interface RovixStudioEditorProps {
  initialGame?: SavedGame;
  avatarColors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  onBackToDashboard: () => void;
}

// 20 Authentic Roblox Studio BrickColors
const ROBLOX_STUDIO_COLORS = [
  { name: 'Medium stone grey', hex: '#a0a5a9' },
  { name: 'Dark stone grey', hex: '#635f62' },
  { name: 'Black', hex: '#1b2a35' },
  { name: 'White', hex: '#f2f3f3' },
  { name: 'Bright red', hex: '#c4281b' },
  { name: 'Bright blue', hex: '#0d69ac' },
  { name: 'Bright yellow', hex: '#f5cd2f' },
  { name: 'Lime green', hex: '#4b974b' },
  { name: 'Bright violet', hex: '#6b327c' },
  { name: 'Bright orange', hex: '#da8541' },
  { name: 'Neon blue', hex: '#00ffff' },
  { name: 'Hot pink', hex: '#ff66cc' },
  { name: 'Dark green', hex: '#27462c' },
  { name: 'Sand red', hex: '#957977' },
  { name: 'Reddish brown', hex: '#694027' },
  { name: 'Institutional white', hex: '#f8f8f8' },
];

function createGeometryForShape(shape: StudioPart['shape'], size: [number, number, number]): THREE.BufferGeometry {
  if (shape === 'sphere') {
    return new THREE.SphereGeometry(size[0] / 2, 24, 24);
  } else if (shape === 'cylinder') {
    return new THREE.CylinderGeometry(size[0] / 2, size[0] / 2, size[1], 24);
  }
  return new THREE.BoxGeometry(size[0], size[1], size[2]);
}

function createMaterialForPart(part: StudioPart): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(part.color),
    roughness: part.material === 'SmoothPlastic' ? 0.2 : 0.5,
  });

  if (part.material === 'Neon') {
    mat.emissive.set(part.color);
    mat.emissiveIntensity = 0.6;
    mat.roughness = 0.1;
  }

  if (part.transparency > 0) {
    mat.transparent = true;
    mat.opacity = 1 - part.transparency;
  }

  return mat;
}

export default function RovixStudioEditor({
  initialGame,
  avatarColors,
  shirtUrl,
  pantsUrl,
  onBackToDashboard,
}: RovixStudioEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Experience metadata state
  const [gameTitle, setGameTitle] = useState(initialGame?.title || 'My New Experience');
  const [isPublic, setIsPublic] = useState(initialGame ? initialGame.isPublic : true);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Active Tool Mode: 'select' | 'move' | 'scale' | 'rotate'
  const [activeTool, setActiveTool] = useState<'select' | 'move' | 'scale' | 'rotate'>('select');
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Tab mode: 'viewport' or active part ID being scripted
  const [activeTab, setActiveTab] = useState<string>('viewport');
  const [openScriptPartIds, setOpenScriptPartIds] = useState<string[]>([]);

  // UI StarterGui Root & selection state
  const starterGuiRef = useRef<RBXInstance>(null!);
  if (!starterGuiRef.current) {
    const sg = new RBXInstance('StarterGui', 'StarterGui');
    if (initialGame?.uiTree && Array.isArray(initialGame.uiTree)) {
      for (const item of initialGame.uiTree) {
        try {
          deserializeInstance(item, sg);
        } catch (e) {
          console.error('[RovixStudioEditor] Failed to deserialize UI item:', e);
        }
      }
    }
    starterGuiRef.current = sg;
  }

  const [selectedUiInstance, setSelectedUiInstance] = useState<RBXInstance | null>(null);
  const [hierarchyRevision, setHierarchyRevision] = useState(0);
  const [openInstanceScripts, setOpenInstanceScripts] = useState<RBXScript[]>([]);
  const [activeInstanceScript, setActiveInstanceScript] = useState<RBXScript | null>(null);

  // Output window state
  const [showOutputWindow, setShowOutputWindow] = useState<boolean>(false);
  const [outputLogs, setOutputLogs] = useState<OutputLogMessage[]>([]);
  const [deathFlash, setDeathFlash] = useState<boolean>(false);

  // Play testing state
  const [isPlaying, setIsPlaying] = useState(false);
  const [livePlayerGui, setLivePlayerGui] = useState<RBXInstance | null>(null);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Lua Runtime instance during Play Test
  const luaRuntimeRef = useRef<LuaRuntime | null>(null);
  const prePlayPartsSnapshotRef = useRef<StudioPart[]>([]);
  const [selectedLiveInstance, setSelectedLiveInstance] = useState<any>(null);
  const [liveTreeTick, setLiveTreeTick] = useState(0);

  // Poll live instance tree updates during Play Mode
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setLiveTreeTick((t) => t + 1);
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Parts state & ref
  const [parts, setParts] = useState<StudioPart[]>(
    initialGame?.parts && initialGame.parts.length > 0
      ? initialGame.parts
      : [
          {
            id: 'part_' + Date.now(),
            name: 'Part',
            shape: 'block',
            position: [0, 2, 0],
            size: [4, 4, 4],
            rotation: [0, 0, 0],
            color: '#a0a5a9',
            material: 'Plastic',
            transparency: 0,
            anchored: true,
            canCollide: true,
          },
        ]
  );
  const partsRef = useRef<StudioPart[]>(parts);
  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    parts.length > 0 ? parts[0].id : null
  );
  const selectedPartIdRef = useRef<string | null>(selectedPartId);
  useEffect(() => {
    selectedPartIdRef.current = selectedPartId;
  }, [selectedPartId]);

  const [runtimeTreeRevision, setRuntimeTreeRevision] = useState(0);
  const [selectedRuntimeSubNode, setSelectedRuntimeSubNode] = useState<{ partId: string; subName: string; className: string } | null>(null);

  // Dropdown states
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [showUiDropdown, setShowUiDropdown] = useState(false);
  const [showStudioGui, setShowStudioGui] = useState(true);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showTemplateMenuPartId, setShowTemplateMenuPartId] = useState<string | null>(null);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectionOutlineRef = useRef<THREE.BoxHelper | null>(null);

  // Gizmo instances
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const gizmoMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const hoveredGizmoRef = useRef<string | null>(null);
  const activeGizmoDragRef = useRef<{
    gizmoType: 'move' | 'scale' | 'rotate';
    axis: string;
    initialPartPos: [number, number, number];
    initialPartSize: [number, number, number];
    initialPartRot: [number, number, number];
    startPointer: { x: number; y: number };
  } | null>(null);

  // Clothing meshes ref
  const clothingMeshesRef = useRef<{
    shirt: THREE.Mesh[];
    pants: THREE.Mesh[];
  }>({ shirt: [], pants: [] });

  // Studio Free-Flight Camera State (when editing)
  const studioCam = useRef({
    position: new THREE.Vector3(20, 18, 26),
    yaw: -0.7,
    pitch: -0.4,
  });

  // Play-test Character Physics & Camera State
  const playerState = useRef({
    position: new THREE.Vector3(0, 3.0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotationY: Math.PI,
    isGrounded: true,
    walkTime: 0,
    isMoving: false,
    isDead: false,
  });

  const scatteredRagdollPartsRef = useRef<
    Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; rotVel: THREE.Vector3; sizeY: number }>
  >([]);
  const triggerStudioDeathRef = useRef<() => void>(() => {});

  const playCam = useRef({
    theta: 0,
    phi: 0.38,
    distance: 12.0,
    targetLookAt: new THREE.Vector3(0, 3.5, 0),
  });

  // Dynamic physics positions for unanchored parts during Play Test
  const dynamicPartsPhysics = useRef<
    Map<string, { pos: THREE.Vector3; vel: THREE.Vector3; grounded: boolean }>
  >(new Map());

  const playerGroupRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);

  // Drag interaction
  const isDraggingMouse = useRef(false);
  const mouseButtonUsed = useRef<number>(0);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const hasMovedSelectedPart = useRef(false);

  const selectedPart = parts.find((p) => p.id === selectedPartId) || null;

  // Sync part mesh visual properties
  const updateMeshFromPart = useCallback((part: StudioPart, mesh: THREE.Mesh) => {
    mesh.position.set(...part.position);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(part.rotation[0]),
      THREE.MathUtils.degToRad(part.rotation[1]),
      THREE.MathUtils.degToRad(part.rotation[2])
    );

    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(part.color);

    if (part.material === 'Neon') {
      mat.emissive.set(part.color);
      mat.emissiveIntensity = 0.6;
      mat.roughness = 0.1;
    } else {
      mat.emissive.setHex(0x000000);
      mat.roughness = part.material === 'SmoothPlastic' ? 0.2 : 0.5;
    }

    mat.transparent = part.transparency > 0;
    mat.opacity = 1 - part.transparency;
    mat.needsUpdate = true;
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      keysPressed.current[e.key.toLowerCase()] = true;

      // Delete part shortcut
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isPlayingRef.current && selectedPartIdRef.current && activeTab === 'viewport') {
        e.preventDefault();
        handleDeletePart(selectedPartIdRef.current);
      }

      // Duplicate shortcut (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !isPlayingRef.current && selectedPartIdRef.current && activeTab === 'viewport') {
        e.preventDefault();
        handleDuplicatePart(selectedPartIdRef.current);
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
  }, [activeTab]);

  // GIZMOS BUILDER & UPDATER
  const updateGizmos = useCallback((targetPart: StudioPart | null, tool: 'select' | 'move' | 'scale' | 'rotate') => {
    const gizmoGroup = gizmoGroupRef.current;
    if (!gizmoGroup) return;

    if (!targetPart || isPlayingRef.current || tool === 'select' || activeTab !== 'viewport') {
      gizmoGroup.visible = false;
      return;
    }

    gizmoGroup.visible = true;
    gizmoGroup.position.set(...targetPart.position);

    while (gizmoGroup.children.length > 0) {
      const obj = gizmoGroup.children[0];
      gizmoGroup.remove(obj);
    }
    gizmoMeshesRef.current.clear();

    const halfW = targetPart.size[0] / 2;
    const halfH = targetPart.size[1] / 2;
    const halfD = targetPart.size[2] / 2;

    const maxDim = Math.max(targetPart.size[0], targetPart.size[1], targetPart.size[2]);
    const arrowLength = Math.max(3.5, maxDim * 0.7);

    // --- 1. MOVE GIZMO ---
    if (tool === 'move') {
      const createArrow = (dir: [number, number, number], colorHex: number, axisName: string) => {
        const arrowGroup = new THREE.Group();
        arrowGroup.name = 'gizmo_move_' + axisName;

        const lineGeo = new THREE.CylinderGeometry(0.08, 0.08, arrowLength, 8);
        const lineMat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.y = arrowLength / 2;
        line.renderOrder = 999;
        arrowGroup.add(line);

        const coneGeo = new THREE.ConeGeometry(0.35, 0.9, 12);
        const coneMat = new THREE.MeshBasicMaterial({ color: colorHex, depthTest: false });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = arrowLength + 0.45;
        cone.renderOrder = 999;
        arrowGroup.add(cone);

        if (dir[0] !== 0) {
          arrowGroup.rotation.z = dir[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else if (dir[2] !== 0) {
          arrowGroup.rotation.x = dir[2] > 0 ? Math.PI / 2 : -Math.PI / 2;
        }

        gizmoGroup.add(arrowGroup);
        gizmoMeshesRef.current.set(arrowGroup.name, arrowGroup);
      };

      createArrow([1, 0, 0], 0xff3b30, 'posX');
      createArrow([-1, 0, 0], 0xff5b50, 'negX');
      createArrow([0, 1, 0], 0x34c759, 'posY');
      createArrow([0, -1, 0], 0x54e779, 'negY');
      createArrow([0, 0, 1], 0x007aff, 'posZ');
      createArrow([0, 0, -1], 0x309aff, 'negZ');
    }

    // --- 2. SCALE GIZMO (6 FACE BOUNDING HANDLES) ---
    if (tool === 'scale') {
      const createFaceHandle = (
        pos: [number, number, number],
        colorHex: number,
        faceName: string,
        faceNormal: [number, number, number]
      ) => {
        const handleGroup = new THREE.Group();
        handleGroup.name = 'gizmo_scale_' + faceName;
        handleGroup.position.set(...pos);

        const sphereGeo = new THREE.SphereGeometry(0.42, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          depthTest: false,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.renderOrder = 999;
        handleGroup.add(sphere);

        const diskGeo = new THREE.RingGeometry(0.48, 0.62, 16);
        const diskMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          depthTest: false,
        });
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.renderOrder = 999;
        if (faceNormal[0] !== 0) disk.rotation.y = Math.PI / 2;
        else if (faceNormal[1] !== 0) disk.rotation.x = Math.PI / 2;
        handleGroup.add(disk);

        gizmoGroup.add(handleGroup);
        gizmoMeshesRef.current.set(handleGroup.name, handleGroup);
      };

      createFaceHandle([halfW, 0, 0], 0xff3b30, 'posX', [1, 0, 0]);
      createFaceHandle([-halfW, 0, 0], 0xff3b30, 'negX', [-1, 0, 0]);
      createFaceHandle([0, halfH, 0], 0x34c759, 'posY', [0, 1, 0]);
      createFaceHandle([0, -halfH, 0], 0x34c759, 'negY', [0, -1, 0]);
      createFaceHandle([0, 0, halfD], 0x007aff, 'posZ', [0, 0, 1]);
      createFaceHandle([0, 0, -halfD], 0x007aff, 'negZ', [0, 0, -1]);
    }

    // --- 3. ROTATE GIZMO ---
    if (tool === 'rotate') {
      const ringRadius = maxDim * 0.75 + 1.2;

      const createRotateRing = (colorHex: number, axisName: string, rotEuler: [number, number, number]) => {
        const ringGeo = new THREE.TorusGeometry(ringRadius, 0.09, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          depthTest: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'gizmo_rotate_' + axisName;
        ring.rotation.set(...rotEuler);
        ring.renderOrder = 999;
        gizmoGroup.add(ring);
        gizmoMeshesRef.current.set(ring.name, ring);
      };

      createRotateRing(0xff3b30, 'x', [0, Math.PI / 2, 0]);
      createRotateRing(0x34c759, 'y', [Math.PI / 2, 0, 0]);
      createRotateRing(0x007aff, 'z', [0, 0, 0]);
    }
  }, [activeTab]);

  useEffect(() => {
    updateGizmos(selectedPart, activeTool);
  }, [selectedPart, activeTool, updateGizmos]);

  // MAIN THREE.JS SCENE SETUP & PERSISTENT ANIMATION LOOP (RUNS ONCE)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x8cb8e6);
    scene.fog = new THREE.FogExp2(0x8cb8e6, 0.005);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
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

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(40, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 180;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // Studio Baseplate with stud pattern
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

    // SpawnLocation Pad
    const spawnGeo = new THREE.BoxGeometry(8, 0.4, 8);
    const spawnMat = new THREE.MeshStandardMaterial({ color: 0x8a9299, roughness: 0.6 });
    const spawnPad = new THREE.Mesh(spawnGeo, spawnMat);
    spawnPad.position.set(0, 0.2, 0);
    spawnPad.receiveShadow = true;
    scene.add(spawnPad);

    // Selection outline helper
    const outlineHelper = new THREE.BoxHelper(spawnPad, 0x00a2ff);
    outlineHelper.visible = false;
    scene.add(outlineHelper);
    selectionOutlineRef.current = outlineHelper;

    // Gizmo Master Group
    const gizmoGroup = new THREE.Group();
    gizmoGroupRef.current = gizmoGroup;
    gizmoGroup.visible = false;
    scene.add(gizmoGroup);

    // BUILD INITIAL PART MESHES
    const map = new Map<string, THREE.Mesh>();
    meshesMapRef.current = map;

    partsRef.current.forEach((part) => {
      const geo = createGeometryForShape(part.shape, part.size);
      const mat = createMaterialForPart(part);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = part.id;
      mesh.position.set(...part.position);
      mesh.rotation.set(
        THREE.MathUtils.degToRad(part.rotation[0]),
        THREE.MathUtils.degToRad(part.rotation[1]),
        THREE.MathUtils.degToRad(part.rotation[2])
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      map.set(part.id, mesh);
    });

    // BUILD AUTHENTIC PLAYER CHARACTER
    const playerGroup = new THREE.Group();
    playerGroupRef.current = playerGroup;
    playerGroup.visible = false;
    scene.add(playerGroup);

    const createBodyMat = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.35,
        metalness: 0.04,
      });

    // 1. Torso
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 1.0), createBodyMat(avatarColors.torso));
    torsoMesh.castShadow = true;
    playerGroup.add(torsoMesh);

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

    const headGeo = new THREE.LatheGeometry(headPoints, 36);
    const headMat = createBodyMat(avatarColors.head);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 1.62, 0);
    headMesh.castShadow = true;
    playerGroup.add(headMesh);

    // Smile Face Decal
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
      new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false })
    );
    faceQuad.position.set(0, 1.62, 0.655);
    playerGroup.add(faceQuad);

    // 3. Limbs with Pivots
    const createLimbGroup = (isArm: boolean, isLeft: boolean, hex: string) => {
      const group = new THREE.Group();
      const w = 1.0;
      const h = 2.0;
      const d = 1.0;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = createBodyMat(hex);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, -h / 2, 0);
      mesh.castShadow = true;
      group.add(mesh);

      if (isArm) {
        group.position.set(isLeft ? 1.5 : -1.5, 1.0, 0);
      } else {
        group.position.set(isLeft ? 0.5 : -0.5, -1.0, 0);
      }
      return { group, mesh };
    };

    const lArm = createLimbGroup(true, true, avatarColors.leftArm);
    const rArm = createLimbGroup(true, false, avatarColors.rightArm);
    const lLeg = createLimbGroup(false, true, avatarColors.leftLeg);
    const rLeg = createLimbGroup(false, false, avatarColors.rightLeg);

    playerGroup.add(lArm.group);
    playerGroup.add(rArm.group);
    playerGroup.add(lLeg.group);
    playerGroup.add(rLeg.group);

    leftArmRef.current = lArm.group;
    rightArmRef.current = rArm.group;
    leftLegRef.current = lLeg.group;
    rightLegRef.current = rLeg.group;

    // 4. FULL CLOTHING OVERLAYS
    const createClothingPartMesh = (
      width: number,
      height: number,
      depth: number,
      scaleFactor: number,
      partType: 'torso' | 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg',
      yOffset: number = 0
    ) => {
      const geo = new THREE.BoxGeometry(width * scaleFactor, height * scaleFactor, depth * scaleFactor);
      applyRobloxClothingUV(geo, partType);

      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.05,
        roughness: 0.45,
        side: THREE.FrontSide,
        visible: true,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, yOffset, 0);
      mesh.castShadow = true;
      mesh.visible = false;
      return mesh;
    };

    // Pants Overlays
    const pantsTorso = createClothingPartMesh(2.0, 2.0, 1.0, 1.010, 'torso', 0);
    const pantsLeftLeg = createClothingPartMesh(1.0, 2.0, 1.0, 1.012, 'leftLeg', -1.0);
    const pantsRightLeg = createClothingPartMesh(1.0, 2.0, 1.0, 1.012, 'rightLeg', -1.0);
    playerGroup.add(pantsTorso);
    lLeg.group.add(pantsLeftLeg);
    rLeg.group.add(pantsRightLeg);

    // Shirt Overlays
    const shirtTorso = createClothingPartMesh(2.0, 2.0, 1.0, 1.016, 'torso', 0);
    const shirtLeftArm = createClothingPartMesh(1.0, 2.0, 1.0, 1.016, 'leftArm', -1.0);
    const shirtRightArm = createClothingPartMesh(1.0, 2.0, 1.0, 1.016, 'rightArm', -1.0);
    playerGroup.add(shirtTorso);
    lArm.group.add(shirtLeftArm);
    rArm.group.add(shirtRightArm);

    // Load Clothing Textures
    const applyTextureToMeshes = (url: string, meshes: THREE.Mesh[]) => {
      if (!url) return;
      const img = new Image();
      if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = true;
        tex.needsUpdate = true;

        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.map = tex;
          mat.needsUpdate = true;
          m.visible = true;
        });
      };
      img.onerror = (e) => {
        console.error('Failed to load clothing texture:', e);
      };
      img.src = url;
    };

    clothingMeshesRef.current = {
      shirt: [shirtTorso, shirtLeftArm, shirtRightArm],
      pants: [pantsTorso, pantsLeftLeg, pantsRightLeg],
    };

    const savedAvatar = getSavedAvatar();
    const effectiveShirtUrl = shirtUrl || savedAvatar.shirtUrl;
    const effectivePantsUrl = pantsUrl || savedAvatar.pantsUrl;

    if (effectiveShirtUrl) applyTextureToMeshes(effectiveShirtUrl, [shirtTorso, shirtLeftArm, shirtRightArm]);
    if (effectivePantsUrl) applyTextureToMeshes(effectivePantsUrl, [pantsTorso, pantsLeftLeg, pantsRightLeg]);

    // ANIMATION LOOP
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      const keys = keysPressed.current;

      if (!isPlayingRef.current) {
        // --- STUDIO FREE-FLIGHT EDIT MODE ---
        playerGroup.visible = false;

        const yaw = studioCam.current.yaw;
        const pitch = studioCam.current.pitch;

        const forward = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          Math.cos(yaw) * Math.cos(pitch)
        ).normalize();

        const right = new THREE.Vector3(
          Math.cos(yaw),
          0,
          -Math.sin(yaw)
        ).normalize();

        const up = new THREE.Vector3(0, 1, 0);

        let flySpeed = 28.0;
        if (keys['shift']) flySpeed = 65.0;

        const moveDelta = new THREE.Vector3(0, 0, 0);
        if (keys['w'] || keys['arrowup']) moveDelta.addScaledVector(forward, flySpeed * dt);
        if (keys['s'] || keys['arrowdown']) moveDelta.addScaledVector(forward, -flySpeed * dt);
        if (keys['d'] || keys['arrowright']) moveDelta.addScaledVector(right, -flySpeed * dt);
        if (keys['a'] || keys['arrowleft']) moveDelta.addScaledVector(right, flySpeed * dt);
        if (keys['e'] || keys[' ']) moveDelta.addScaledVector(up, flySpeed * dt);
        if (keys['q'] || keys['c']) moveDelta.addScaledVector(up, -flySpeed * dt);

        studioCam.current.position.add(moveDelta);
        camera.position.copy(studioCam.current.position);

        const lookTarget = studioCam.current.position.clone().add(forward);
        camera.lookAt(lookTarget);

        const curSelId = selectedPartIdRef.current;
        if (curSelId && meshesMapRef.current.has(curSelId)) {
          const targetMesh = meshesMapRef.current.get(curSelId)!;
          if (outlineHelper) {
            outlineHelper.setFromObject(targetMesh);
            outlineHelper.visible = true;
          }
        } else {
          if (outlineHelper) outlineHelper.visible = false;
        }
      } else {
        // --- PLAY TEST CHARACTER PHYSICS & LUA SCRIPT ENGINE MODE ---
        playerGroup.visible = true;
        if (outlineHelper) outlineHelper.visible = false;
        if (gizmoGroupRef.current) gizmoGroupRef.current.visible = false;

        const pState = playerState.current;
        const pCam = playCam.current;

        // Read Lua Humanoid properties (or defaults)
        const runtime = luaRuntimeRef.current;
        if (runtime) {
          runtime.step(dt);
          runtime.updatePlayerPosition(pState.position);
          runtime.checkTouchCollisions(pState.position);
        }

        const humanoid = runtime?.playerCharacter.Humanoid;
        if (humanoid && humanoid.Health <= 0 && !pState.isDead) {
          triggerStudioDeathRef.current();
        }
        if (!pState.isDead && pState.position.y < -30) {
          triggerStudioDeathRef.current();
        }

        const currentWalkSpeed = humanoid ? humanoid.WalkSpeed : 15.0;
        const currentJumpPower = humanoid ? humanoid.JumpPower : 50.0;

        // Movement input
        let inputForward = 0;
        let inputRight = 0;
        if (!pState.isDead) {
          if (keys['w'] || keys['arrowup']) inputForward += 1;
          if (keys['s'] || keys['arrowdown']) inputForward -= 1;
          if (keys['d'] || keys['arrowright']) inputRight += 1;
          if (keys['a'] || keys['arrowleft']) inputRight -= 1;
        }

        const isInputMoving = inputForward !== 0 || inputRight !== 0;
        pState.isMoving = isInputMoving;

        if (!pState.isDead && isInputMoving) {
          const len = Math.hypot(inputForward, inputRight);
          const normForward = inputForward / len;
          const normRight = inputRight / len;

          const forwardX = -Math.sin(pCam.theta);
          const forwardZ = -Math.cos(pCam.theta);
          const rightX = Math.cos(pCam.theta);
          const rightZ = -Math.sin(pCam.theta);

          const targetVelX = (normForward * forwardX + normRight * rightX) * currentWalkSpeed;
          const targetVelZ = (normForward * forwardZ + normRight * rightZ) * currentWalkSpeed;

          pState.velocity.x = targetVelX;
          pState.velocity.z = targetVelZ;

          const targetRotY = Math.atan2(targetVelX, targetVelZ);
          let diff = targetRotY - pState.rotationY;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          pState.rotationY += diff * Math.min(1.0, dt * 16);
        } else {
          pState.velocity.x *= 0.72;
          pState.velocity.z *= 0.72;
        }

        // Jump & Gravity
        const gravity = -38.0;
        const jumpVel = (currentJumpPower / 50.0) * 16.0;

        if (!pState.isDead && humanoid && humanoid.Jump) {
          humanoid.Jump = false;
          pState.velocity.y = jumpVel;
          pState.isGrounded = false;
        } else if (!pState.isDead && keys[' '] && pState.isGrounded) {
          pState.velocity.y = jumpVel;
          pState.isGrounded = false;
        }

        pState.velocity.y += gravity * dt;

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
        const curParts = partsRef.current;
        curParts.forEach((p) => {
          if (!p.anchored) {
            let dyn = dynamicPartsPhysics.current.get(p.id);
            if (!dyn) {
              dyn = {
                pos: new THREE.Vector3(...p.position),
                vel: new THREE.Vector3(0, 0, 0),
                grounded: false,
              };
              dynamicPartsPhysics.current.set(p.id, dyn);
            }

            dyn.vel.y += gravity * dt;
            dyn.pos.y += dyn.vel.y * dt;
            const floorH = p.size[1] / 2;
            if (dyn.pos.y <= floorH) {
              dyn.pos.y = floorH;
              if (Math.abs(dyn.vel.y) > 4) {
                dyn.vel.y = -dyn.vel.y * 0.25;
              } else {
                dyn.vel.y = 0;
                dyn.grounded = true;
              }
            }

            const m = meshesMapRef.current.get(p.id);
            if (m) m.position.copy(dyn.pos);
          }
        });

        // ACCURATE PLAYER COLLISION & LUA TOUCH EVENT TRIGGERING
        const playerRadius = 1.0;
        const playerFeetOffset = 3.0;

        const nextX = pState.position.x + pState.velocity.x * dt;
        const nextZ = pState.position.z + pState.velocity.z * dt;
        let nextY = pState.position.y + pState.velocity.y * dt;

        let highestFloor = 3.0; // baseplate level
        let groundedOnPart = false;

        curParts.forEach((part) => {
          let pPos = new THREE.Vector3(...part.position);
          const dyn = dynamicPartsPhysics.current.get(part.id);
          if (dyn && !part.anchored) {
            pPos = dyn.pos;
          }

          const halfW = part.size[0] / 2;
          const halfH = part.size[1] / 2;
          const halfD = part.size[2] / 2;

          const minX = pPos.x - halfW;
          const maxX = pPos.x + halfW;
          const minY = pPos.y - halfH;
          const maxY = pPos.y + halfH;
          const minZ = pPos.z - halfD;
          const maxZ = pPos.z + halfD;

          const rbxPart = runtime?.partsMap.get(part.id);
          const liveCanCollide = rbxPart !== undefined ? rbxPart.CanCollide : part.canCollide;

          // Check if player overlaps part bounding box -> Trigger Lua .Touched event!
          if (
            nextX + playerRadius > minX &&
            nextX - playerRadius < maxX &&
            nextZ + playerRadius > minZ &&
            nextZ - playerRadius < maxZ &&
            nextY + 1.8 > minY &&
            nextY - 3.0 < maxY
          ) {
            if (runtime) {
              runtime.triggerTouch(part.id);
            }
          }

          if (!liveCanCollide) return;

          // Check horizontal footprint overlap for standing on top
          if (
            nextX + playerRadius > minX &&
            nextX - playerRadius < maxX &&
            nextZ + playerRadius > minZ &&
            nextZ - playerRadius < maxZ
          ) {
            const topSurface = maxY + playerFeetOffset;
            if (pState.position.y >= maxY + 2.6 && nextY <= topSurface + 0.3) {
              if (topSurface > highestFloor) {
                highestFloor = topSurface;
                groundedOnPart = true;
              }
            }
          }
        });

        if (nextY <= highestFloor) {
          nextY = highestFloor;
          pState.velocity.y = 0;
          pState.isGrounded = true;
        } else {
          if (!groundedOnPart && highestFloor === 3.0) {
            if (nextY > 3.0) pState.isGrounded = false;
          }
        }

        // Horizontal push-out collision resolution
        let resolvedX = nextX;
        let resolvedZ = nextZ;

        curParts.forEach((part) => {
          const rbxPart = runtime?.partsMap.get(part.id);
          const liveCanCollide = rbxPart !== undefined ? rbxPart.CanCollide : part.canCollide;
          if (!liveCanCollide) return;

          let pPos = new THREE.Vector3(...part.position);
          const dyn = dynamicPartsPhysics.current.get(part.id);
          if (dyn && !part.anchored) pPos = dyn.pos;

          const halfW = part.size[0] / 2;
          const halfH = part.size[1] / 2;
          const halfD = part.size[2] / 2;

          const minX = pPos.x - halfW;
          const maxX = pPos.x + halfW;
          const minY = pPos.y - halfH;
          const maxY = pPos.y + halfH;
          const minZ = pPos.z - halfD;
          const maxZ = pPos.z + halfD;

          const playerBottom = nextY - 2.8;
          const playerTop = nextY + 1.8;

          if (playerBottom < maxY && playerTop > minY) {
            if (
              resolvedX + playerRadius > minX &&
              resolvedX - playerRadius < maxX &&
              resolvedZ + playerRadius > minZ &&
              resolvedZ - playerRadius < maxZ
            ) {
              const pushLeft = resolvedX + playerRadius - minX;
              const pushRight = maxX - (resolvedX - playerRadius);
              const pushBack = resolvedZ + playerRadius - minZ;
              const pushFront = maxZ - (resolvedZ - playerRadius);

              const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront);
              if (minPush === pushLeft) resolvedX = minX - playerRadius;
              else if (minPush === pushRight) resolvedX = maxX + playerRadius;
              else if (minPush === pushBack) resolvedZ = minZ - playerRadius;
              else resolvedZ = maxZ + playerRadius;
            }
          }
        });

        pState.position.x = resolvedX;
        pState.position.z = resolvedZ;
        pState.position.y = nextY;

        playerGroup.position.copy(pState.position);
        playerGroup.rotation.y = pState.rotationY;

        // Animations
        const lArmGroup = leftArmRef.current;
        const rArmGroup = rightArmRef.current;
        const lLegGroup = leftLegRef.current;
        const rLegGroup = rightLegRef.current;

        if (!pState.isGrounded) {
          const jumpAngle = -Math.PI;
          if (lArmGroup) lArmGroup.rotation.x = THREE.MathUtils.lerp(lArmGroup.rotation.x, jumpAngle, 0.32);
          if (rArmGroup) rArmGroup.rotation.x = THREE.MathUtils.lerp(rArmGroup.rotation.x, jumpAngle, 0.32);
        } else if (pState.isMoving) {
          pState.walkTime += dt * 11.5;
          const armSwing = Math.sin(pState.walkTime) * 0.75;
          const legSwing = Math.sin(pState.walkTime) * 0.85;
          if (lArmGroup) lArmGroup.rotation.x = -armSwing;
          if (rArmGroup) rArmGroup.rotation.x = armSwing;
          if (lLegGroup) lLegGroup.rotation.x = legSwing;
          if (rLegGroup) rLegGroup.rotation.x = -legSwing;
        } else {
          if (lArmGroup) lArmGroup.rotation.x = THREE.MathUtils.lerp(lArmGroup.rotation.x, 0, 0.2);
          if (rArmGroup) rArmGroup.rotation.x = THREE.MathUtils.lerp(rArmGroup.rotation.x, 0, 0.2);
          if (lLegGroup) lLegGroup.rotation.x = THREE.MathUtils.lerp(lLegGroup.rotation.x, 0, 0.2);
          if (rLegGroup) rLegGroup.rotation.x = THREE.MathUtils.lerp(rLegGroup.rotation.x, 0, 0.2);
        }

        // Camera follow
        pCam.targetLookAt.lerp(
          new THREE.Vector3(pState.position.x, pState.position.y + 0.6, pState.position.z),
          0.2
        );

        const cx = pCam.distance * Math.sin(pCam.theta) * Math.cos(pCam.phi);
        const cy = pCam.distance * Math.sin(pCam.phi);
        const cz = pCam.distance * Math.cos(pCam.theta) * Math.cos(pCam.phi);

        camera.position.set(
          pCam.targetLookAt.x + cx,
          pCam.targetLookAt.y + cy,
          pCam.targetLookAt.z + cz
        );
        camera.lookAt(pCam.targetLookAt);
      }

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
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatarColors, shirtUrl, pantsUrl]);

  // FAST DIRECT PART SYNCHRONIZATION WITHOUT RECREATING SCENE
  const syncMeshDirectly = useCallback((part: StudioPart) => {
    const scene = sceneRef.current;
    if (!scene) return;

    let mesh = meshesMapRef.current.get(part.id);
    if (!mesh) {
      const geo = createGeometryForShape(part.shape, part.size);
      const mat = createMaterialForPart(part);
      mesh = new THREE.Mesh(geo, mat);
      mesh.name = part.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshesMapRef.current.set(part.id, mesh);
    }
    updateMeshFromPart(part, mesh);
    updateGizmos(part, activeToolRef.current);
  }, [updateMeshFromPart, updateGizmos]);

  // Click on 3D Viewport Raycaster to select parts or grab Gizmo handles
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingMouse.current = true;
    mouseButtonUsed.current = e.button;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    hasMovedSelectedPart.current = false;
    activeGizmoDragRef.current = null;

    if (isPlayingRef.current && cameraRef.current && e.button === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseNdc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      luaRuntimeRef.current?.handlePointerClick(mouseNdc, cameraRef.current);
    }

    if (e.button === 0 && !isPlayingRef.current && cameraRef.current && sceneRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const gizmoGroup = gizmoGroupRef.current;
      if (gizmoGroup && gizmoGroup.visible && selectedPartIdRef.current) {
        const curPart = partsRef.current.find((p) => p.id === selectedPartIdRef.current);
        if (curPart) {
          const gizmoIntersects = raycaster.intersectObjects(gizmoGroup.children, true);
          if (gizmoIntersects.length > 0) {
            let topObj: THREE.Object3D | null = gizmoIntersects[0].object;
            while (topObj && topObj.parent && topObj.parent !== gizmoGroup) {
              topObj = topObj.parent;
            }
            if (topObj && topObj.name) {
              const name = topObj.name;
              if (name.startsWith('gizmo_move_')) {
                activeGizmoDragRef.current = {
                  gizmoType: 'move',
                  axis: name.replace('gizmo_move_', ''),
                  initialPartPos: [...curPart.position],
                  initialPartSize: [...curPart.size],
                  initialPartRot: [...curPart.rotation],
                  startPointer: { x: e.clientX, y: e.clientY },
                };
                return;
              } else if (name.startsWith('gizmo_scale_')) {
                activeGizmoDragRef.current = {
                  gizmoType: 'scale',
                  axis: name.replace('gizmo_scale_', ''),
                  initialPartPos: [...curPart.position],
                  initialPartSize: [...curPart.size],
                  initialPartRot: [...curPart.rotation],
                  startPointer: { x: e.clientX, y: e.clientY },
                };
                return;
              } else if (name.startsWith('gizmo_rotate_')) {
                activeGizmoDragRef.current = {
                  gizmoType: 'rotate',
                  axis: name.replace('gizmo_rotate_', ''),
                  initialPartPos: [...curPart.position],
                  initialPartSize: [...curPart.size],
                  initialPartRot: [...curPart.rotation],
                  startPointer: { x: e.clientX, y: e.clientY },
                };
                return;
              }
            }
          }
        }
      }

      const meshes = Array.from(meshesMapRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        setSelectedPartId(hit.name);
        const p = partsRef.current.find((part) => part.id === hit.name) || null;
        updateGizmos(p, activeToolRef.current);
      }
    }

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (isPlayingRef.current && cameraRef.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseNdc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      luaRuntimeRef.current?.handlePointerMove(mouseNdc, cameraRef.current);
    }

    if (!isDraggingMouse.current) {
      if (!isPlayingRef.current && cameraRef.current && gizmoGroupRef.current && gizmoGroupRef.current.visible) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);

        const hits = raycaster.intersectObjects(gizmoGroupRef.current.children, true);
        if (hits.length > 0) {
          hoveredGizmoRef.current = hits[0].object.name;
        } else {
          hoveredGizmoRef.current = null;
        }
      }
      return;
    }

    if (!isPlayingRef.current) {
      // Right-click drag -> Studio camera look around (Standard orientation)
      if (mouseButtonUsed.current === 2) {
        studioCam.current.yaw -= deltaX * 0.005;
        studioCam.current.pitch = Math.max(
          -1.48,
          Math.min(1.48, studioCam.current.pitch - deltaY * 0.005)
        );
      }
      // Left click drag with Active Gizmo Handle
      else if (mouseButtonUsed.current === 0 && activeGizmoDragRef.current && selectedPartIdRef.current) {
        const drag = activeGizmoDragRef.current;
        const curId = selectedPartIdRef.current;
        const curPart = partsRef.current.find((p) => p.id === curId);
        const mesh = meshesMapRef.current.get(curId);

        if (curPart && mesh) {
          hasMovedSelectedPart.current = true;

          const cam = cameraRef.current;
          let dragAmount = (e.clientX - drag.startPointer.x) * 0.08;

          if (cam) {
            let dir = new THREE.Vector3(0, 0, 0);
            if (drag.axis === 'posX') dir.set(1, 0, 0);
            else if (drag.axis === 'negX') dir.set(-1, 0, 0);
            else if (drag.axis === 'posY') dir.set(0, 1, 0);
            else if (drag.axis === 'negY') dir.set(0, -1, 0);
            else if (drag.axis === 'posZ') dir.set(0, 0, 1);
            else if (drag.axis === 'negZ') dir.set(0, 0, -1);

            const posV = new THREE.Vector3(...drag.initialPartPos);
            const p0 = posV.clone().project(cam);
            const p1 = posV.clone().add(dir).project(cam);

            const screenDx = p1.x - p0.x;
            const screenDy = -(p1.y - p0.y);
            const len = Math.hypot(screenDx, screenDy) || 1;
            const normX = screenDx / len;
            const normY = screenDy / len;

            const mouseDx = e.clientX - drag.startPointer.x;
            const mouseDy = e.clientY - drag.startPointer.y;

            dragAmount = (mouseDx * normX + mouseDy * normY) * 0.08;
          }

          // --- GIZMO MOVE ARROWS ---
          if (drag.gizmoType === 'move') {
            const newPos: [number, number, number] = [...drag.initialPartPos];
            if (drag.axis === 'posX') newPos[0] += dragAmount;
            else if (drag.axis === 'negX') newPos[0] -= dragAmount;
            else if (drag.axis === 'posY') newPos[1] += dragAmount;
            else if (drag.axis === 'negY') newPos[1] -= dragAmount;
            else if (drag.axis === 'posZ') newPos[2] += dragAmount;
            else if (drag.axis === 'negZ') newPos[2] -= dragAmount;

            curPart.position = [
              Number(newPos[0].toFixed(1)),
              Math.max(0.5, Number(newPos[1].toFixed(1))),
              Number(newPos[2].toFixed(1)),
            ];
            mesh.position.set(...curPart.position);
          }

          // --- GIZMO 6-FACE SCALING ---
          else if (drag.gizmoType === 'scale') {
            const initPos = drag.initialPartPos;
            const initSize = drag.initialPartSize;

            if (drag.axis === 'posX') {
              const newW = Math.max(0.5, initSize[0] + dragAmount);
              curPart.size[0] = Number(newW.toFixed(1));
              curPart.position[0] = Number((initPos[0] + (newW - initSize[0]) / 2).toFixed(1));
            } else if (drag.axis === 'negX') {
              const newW = Math.max(0.5, initSize[0] + dragAmount);
              curPart.size[0] = Number(newW.toFixed(1));
              curPart.position[0] = Number((initPos[0] - (newW - initSize[0]) / 2).toFixed(1));
            } else if (drag.axis === 'posY') {
              const newH = Math.max(0.5, initSize[1] + dragAmount);
              curPart.size[1] = Number(newH.toFixed(1));
              curPart.position[1] = Math.max(0.5, Number((initPos[1] + (newH - initSize[1]) / 2).toFixed(1)));
            } else if (drag.axis === 'negY') {
              const newH = Math.max(0.5, initSize[1] + dragAmount);
              curPart.size[1] = Number(newH.toFixed(1));
              curPart.position[1] = Math.max(0.5, Number((initPos[1] - (newH - initSize[1]) / 2).toFixed(1)));
            } else if (drag.axis === 'posZ') {
              const newD = Math.max(0.5, initSize[2] + dragAmount);
              curPart.size[2] = Number(newD.toFixed(1));
              curPart.position[2] = Number((initPos[2] + (newD - initSize[2]) / 2).toFixed(1));
            } else if (drag.axis === 'negZ') {
              const newD = Math.max(0.5, initSize[2] + dragAmount);
              curPart.size[2] = Number(newD.toFixed(1));
              curPart.position[2] = Number((initPos[2] - (newD - initSize[2]) / 2).toFixed(1));
            }

            mesh.position.set(...curPart.position);
            mesh.geometry.dispose();
            mesh.geometry = createGeometryForShape(curPart.shape, curPart.size);
          }

          // --- GIZMO ROTATION RINGS ---
          else if (drag.gizmoType === 'rotate') {
            const rotSens = 2.0;
            const initRot = drag.initialPartRot;
            if (drag.axis === 'y') {
              const newYaw = (initRot[1] + Math.round((e.clientX - drag.startPointer.x) * rotSens)) % 360;
              curPart.rotation[1] = newYaw < 0 ? newYaw + 360 : newYaw;
            } else if (drag.axis === 'x') {
              const newPitch = (initRot[0] + Math.round((e.clientY - drag.startPointer.y) * rotSens)) % 360;
              curPart.rotation[0] = newPitch < 0 ? newPitch + 360 : newPitch;
            } else if (drag.axis === 'z') {
              const newRoll = (initRot[2] + Math.round((e.clientX - drag.startPointer.x) * rotSens)) % 360;
              curPart.rotation[2] = newRoll < 0 ? newRoll + 360 : newRoll;
            }

            mesh.rotation.set(
              THREE.MathUtils.degToRad(curPart.rotation[0]),
              THREE.MathUtils.degToRad(curPart.rotation[1]),
              THREE.MathUtils.degToRad(curPart.rotation[2])
            );
          }

          if (selectionOutlineRef.current) {
            selectionOutlineRef.current.setFromObject(mesh);
          }
          if (gizmoGroupRef.current) {
            gizmoGroupRef.current.position.set(...curPart.position);
          }
        }
      }
      else if (mouseButtonUsed.current === 0 && selectedPartIdRef.current) {
        const curId = selectedPartIdRef.current;
        const curPart = partsRef.current.find((p) => p.id === curId);
        const mesh = meshesMapRef.current.get(curId);

        if (curPart && mesh) {
          hasMovedSelectedPart.current = true;
          const tool = activeToolRef.current;

          if (tool === 'move') {
            const sens = 0.08;
            if (keysPressed.current['shift']) {
              curPart.position[1] = Math.max(0.5, Number((curPart.position[1] - deltaY * sens).toFixed(1)));
            } else {
              curPart.position[0] = Number((curPart.position[0] + deltaX * sens).toFixed(1));
              curPart.position[2] = Number((curPart.position[2] + deltaY * sens).toFixed(1));
            }
            mesh.position.set(...curPart.position);
          }

          if (selectionOutlineRef.current) {
            selectionOutlineRef.current.setFromObject(mesh);
          }
          if (gizmoGroupRef.current) {
            gizmoGroupRef.current.position.set(...curPart.position);
          }
        }
      }
    } else {
      // Play test camera orbit
      playCam.current.theta -= deltaX * 0.0055;
      playCam.current.phi = Math.max(
        0.08,
        Math.min(1.42, playCam.current.phi + deltaY * 0.0055)
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingMouse.current = false;
    activeGizmoDragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedSelectedPart.current) {
      hasMovedSelectedPart.current = false;
      const updated = [...partsRef.current];
      setParts(updated);
      const cur = updated.find((p) => p.id === selectedPartIdRef.current) || null;
      updateGizmos(cur, activeToolRef.current);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isPlayingRef.current) {
      const yaw = studioCam.current.yaw;
      const pitch = studioCam.current.pitch;
      const forward = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      ).normalize();
      studioCam.current.position.addScaledVector(forward, -e.deltaY * 0.04);
    } else {
      playCam.current.distance = Math.max(
        4.0,
        Math.min(25.0, playCam.current.distance + e.deltaY * 0.005)
      );
    }
  };

  // PART OPERATIONS
  const handleInsertPart = (shape: 'block' | 'sphere' | 'cylinder') => {
    const newPart: StudioPart = {
      id: 'part_' + Date.now(),
      name: shape.charAt(0).toUpperCase() + shape.slice(1) + '_' + (partsRef.current.length + 1),
      shape,
      position: [
        Number(studioCam.current.position.x.toFixed(1)),
        2,
        Number(studioCam.current.position.z.toFixed(1)),
      ],
      size: shape === 'sphere' ? [4, 4, 4] : shape === 'cylinder' ? [4, 6, 4] : [4, 2, 4],
      rotation: [0, 0, 0],
      color: '#a0a5a9',
      material: 'Plastic',
      transparency: 0,
      anchored: true,
      canCollide: true,
    };

    const updated = [...partsRef.current, newPart];
    partsRef.current = updated;
    setParts(updated);
    setSelectedPartId(newPart.id);
    syncMeshDirectly(newPart);
    setShowPartDropdown(false);
  };

  const handleInsertUi = (className: string) => {
    setShowUiDropdown(false);
    const sgRoot = starterGuiRef.current;
    if (!sgRoot) return;

    if (className === 'ScreenGui') {
      const newSg = RBXInstanceFactory.new('ScreenGui');
      newSg.Parent = sgRoot;
      setSelectedUiInstance(newSg);
      setSelectedPartId(null);
      setHierarchyRevision((r) => r + 1);
      return;
    }

    let targetParent: RBXInstance | null = null;
    if (selectedUiInstance && ['ScreenGui', 'Frame', 'ScrollingFrame'].includes(selectedUiInstance.ClassName)) {
      targetParent = selectedUiInstance;
    } else {
      const existingSg = sgRoot.FindFirstChildOfClass('ScreenGui');
      if (existingSg) {
        targetParent = existingSg;
      } else {
        const autoSg = RBXInstanceFactory.new('ScreenGui');
        autoSg.Name = 'ScreenGui';
        autoSg.Parent = sgRoot;
        targetParent = autoSg;
      }
    }

    const newInst = RBXInstanceFactory.new(className);
    if (newInst instanceof RBXGuiObject) {
      if (targetParent.ClassName === 'ScreenGui') {
        if (className === 'Frame') {
          newInst.Size = RBXUDim2.new(0, 240, 0, 160);
          newInst.Position = RBXUDim2.new(0.5, -120, 0.5, -80);
        } else if (className === 'TextLabel') {
          newInst.Size = RBXUDim2.new(0, 200, 0, 50);
          newInst.Position = RBXUDim2.new(0.5, -100, 0.35, -25);
          (newInst as any).Text = 'New Label';
        } else if (className === 'TextButton') {
          newInst.Size = RBXUDim2.new(0, 180, 0, 46);
          newInst.Position = RBXUDim2.new(0.5, -90, 0.6, -23);
          (newInst as any).Text = 'Click Me';
        } else if (className === 'TextBox') {
          newInst.Size = RBXUDim2.new(0, 200, 0, 40);
          newInst.Position = RBXUDim2.new(0.5, -100, 0.5, -20);
        } else if (className === 'ImageLabel') {
          newInst.Size = RBXUDim2.new(0, 120, 0, 120);
          newInst.Position = RBXUDim2.new(0.5, -60, 0.5, -60);
        }
      }
    }

    newInst.Parent = targetParent;
    setSelectedUiInstance(newInst);
    setSelectedPartId(null);
    setHierarchyRevision((r) => r + 1);
  };

  const handleDeletePart = (id: string) => {
    const updated = partsRef.current.filter((p) => p.id !== id);
    partsRef.current = updated;
    setParts(updated);

    if (openScriptPartIds.includes(id)) {
      setOpenScriptPartIds(openScriptPartIds.filter((pid) => pid !== id));
      if (activeTab === id) setActiveTab('viewport');
    }

    if (selectedPartIdRef.current === id) {
      setSelectedPartId(updated.length > 0 ? updated[0].id : null);
      updateGizmos(updated.length > 0 ? updated[0] : null, activeToolRef.current);
    }

    const mesh = meshesMapRef.current.get(id);
    if (mesh && sceneRef.current) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      sceneRef.current.remove(mesh);
      meshesMapRef.current.delete(id);
    }
  };

  const handleDuplicatePart = (id: string) => {
    const orig = partsRef.current.find((p) => p.id === id);
    if (!orig) return;

    const dup: StudioPart = {
      ...orig,
      id: 'part_' + Date.now(),
      name: orig.name + '_Copy',
      position: [orig.position[0] + 2, orig.position[1], orig.position[2] + 2],
    };

    const updated = [...partsRef.current, dup];
    partsRef.current = updated;
    setParts(updated);
    setSelectedPartId(dup.id);
    syncMeshDirectly(dup);
  };

  const handlePartChange = (id: string, updates: Partial<StudioPart>) => {
    let changedPart: StudioPart | null = null;
    const updated = partsRef.current.map((p) => {
      if (p.id !== id) return p;
      const res = { ...p, ...updates };
      changedPart = res;
      const mesh = meshesMapRef.current.get(id);
      if (mesh) {
        if (updates.size || updates.shape) {
          mesh.geometry.dispose();
          mesh.geometry = createGeometryForShape(res.shape, res.size);
        }
        updateMeshFromPart(res, mesh);
      }
      return res;
    });

    partsRef.current = updated;
    setParts(updated);
    if (changedPart) {
      updateGizmos(changedPart, activeToolRef.current);
    }
  };

  // SCRIPT & CLICKDETECTOR MANAGEMENT
  const handleToggleClickDetector = (partId: string) => {
    const part = partsRef.current.find((p) => p.id === partId);
    if (!part) return;
    handlePartChange(partId, { hasClickDetector: !part.hasClickDetector });
  };

  const handleOpenScript = (partId: string) => {
    const part = partsRef.current.find((p) => p.id === partId);
    if (!part) return;

    if (!part.script) {
      // Initialize default Lua script template
      handlePartChange(partId, {
        script: {
          id: 'script_' + Date.now(),
          name: 'Script',
          code: `-- Script inside ${part.name}
local part = script.Parent

part.Touched:Connect(function(hit)
    local humanoid = hit.Parent:FindFirstChild("Humanoid")
    if humanoid then
        print("${part.name} touched by " .. hit.Parent.Name)
    end
end)
`,
          enabled: true,
          parentPartId: partId,
        },
      });
    }

    if (!openScriptPartIds.includes(partId)) {
      setOpenScriptPartIds([...openScriptPartIds, partId]);
    }
    setActiveTab(partId);
  };

  const handleApplyPresetToPart = (partId: string, template: (typeof LUA_SCRIPT_TEMPLATES)[0]) => {
    handlePartChange(partId, {
      script: {
        id: 'script_' + Date.now(),
        name: 'Script',
        code: template.source,
        enabled: true,
        parentPartId: partId,
      },
    });
    if (!openScriptPartIds.includes(partId)) {
      setOpenScriptPartIds([...openScriptPartIds, partId]);
    }
    setActiveTab(partId);
    setShowTemplateMenuPartId(null);
  };

  // SAVE EXPERIENCE TO ROVIX DASHBOARD
  const handleSaveExperience = () => {
    const gameToSave: SavedGame = {
      id: initialGame?.id || 'game_' + Date.now(),
      title: gameTitle.trim() || 'Untitled Experience',
      creator: 'Test123',
      initials: gameTitle.substring(0, 2).toUpperCase() || 'EX',
      gradient: initialGame?.gradient || 'from-[#1e3a5f] via-[#12233a] to-[#0a1420]',
      isPublic: isPublic,
      parts: partsRef.current,
      uiTree: starterGuiRef.current.GetChildren().map(serializeInstance),
      updatedAt: Date.now(),
      iconUrl: initialGame?.iconUrl,
    };

    saveGame(gameToSave);
    setSaveSuccessToast(`Saved "${gameToSave.title}" with Lua scripts to Rovix!`);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  };

  // Toggle Play Test (With Lua Engine Execution)
  const handleTogglePlay = () => {
    if (!isPlayingRef.current) {
      setActiveTab('viewport');
      dynamicPartsPhysics.current.clear();
      playerState.current.position.set(0, 3.0, 0);
      playerState.current.velocity.set(0, 0, 0);
      playerState.current.isGrounded = true;
      setIsPlaying(true);
      setShowOutputWindow(true);
      if (gizmoGroupRef.current) gizmoGroupRef.current.visible = false;

      // Ensure clothing textures from saved inventory are applied
      const saved = getSavedAvatar();
      const sUrl = shirtUrl || saved.shirtUrl;
      const pUrl = pantsUrl || saved.pantsUrl;

      const loadTextureOntoMeshes = (url: string, meshes: THREE.Mesh[]) => {
        if (!url || meshes.length === 0) return;
        const img = new Image();
        if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.NearestFilter;
          tex.generateMipmaps = true;
          tex.needsUpdate = true;

          meshes.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.map = tex;
            mat.needsUpdate = true;
            m.visible = true;
          });
        };
        img.src = url;
      };

      if (sUrl && clothingMeshesRef.current.shirt) {
        loadTextureOntoMeshes(sUrl, clothingMeshesRef.current.shirt);
      }
      if (pUrl && clothingMeshesRef.current.pants) {
        loadTextureOntoMeshes(pUrl, clothingMeshesRef.current.pants);
      }

      const triggerStudioDeath = () => {
        if (playerState.current.isDead) return;
        playerState.current.isDead = true;
        playerState.current.velocity.set(0, 0, 0);

        setDeathFlash(true);
        setTimeout(() => setDeathFlash(false), 1200);

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

        const scene = sceneRef.current;
        const pGroup = playerGroupRef.current;
        if (pGroup) pGroup.visible = false;

        if (scene) {
          const deathPos = pGroup ? pGroup.position.clone() : playerState.current.position.clone();

          const partsData = [
            { name: 'Head', size: [1.2, 1.2, 1.2], color: avatarColors.head, shape: 'sphere', offset: [0, 1.2, 0] },
            { name: 'Torso', size: [2, 2, 1], color: avatarColors.torso, shape: 'box', offset: [0, 0, 0] },
            { name: 'LArm', size: [1, 2, 1], color: avatarColors.leftArm, shape: 'box', offset: [-1.4, 0, 0] },
            { name: 'RArm', size: [1, 2, 1], color: avatarColors.rightArm, shape: 'box', offset: [1.4, 0, 0] },
            { name: 'LLeg', size: [1, 2, 1], color: avatarColors.leftLeg, shape: 'box', offset: [-0.5, -1.8, 0] },
            { name: 'RLeg', size: [1, 2, 1], color: avatarColors.rightLeg, shape: 'box', offset: [0.5, -1.8, 0] },
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
            if (sceneRef.current) {
              scatteredRagdollPartsRef.current.forEach((item) => {
                sceneRef.current?.remove(item.mesh);
                item.mesh.geometry.dispose();
                if (Array.isArray(item.mesh.material)) item.mesh.material.forEach((m) => m.dispose());
                else item.mesh.material.dispose();
              });
            }
            scatteredRagdollPartsRef.current = [];

            playerState.current.position.set(0, 3.0, 0);
            playerState.current.velocity.set(0, 0, 0);
            if (playerGroupRef.current) {
              playerGroupRef.current.position.set(0, 3.0, 0);
              playerGroupRef.current.visible = true;
            }
            if (luaRuntimeRef.current?.playerCharacter.Humanoid) {
              luaRuntimeRef.current.playerCharacter.Humanoid.Health = 100;
            }
            playerState.current.isDead = false;
          }, 3000);
        }
      };

      triggerStudioDeathRef.current = triggerStudioDeath;

      // Snapshot editor parts before play test begins
      prePlayPartsSnapshotRef.current = JSON.parse(JSON.stringify(partsRef.current));

      // INITIALIZE & START LUA ENGINE
      const runtime = new LuaRuntime({
        parts: partsRef.current,
        threeMeshes: meshesMapRef.current,
        scene: sceneRef.current,
        camera: cameraRef.current,
        uiTree: starterGuiRef.current.GetChildren().map(serializeInstance),
        onLog: (log) => {
          setOutputLogs((prev) => [...prev.slice(-200), log]);
        },
        onPlayerKilled: () => {
          triggerStudioDeath();
        },
      });

      luaRuntimeRef.current = runtime;
      setLivePlayerGui(runtime.bridge.player.PlayerGui);

      // Collect all active scripts from parts
      const activeScripts: { partId: string; source: string; scriptName: string }[] = [];
      partsRef.current.forEach((p) => {
        if (p.script && p.script.enabled && p.script.code.trim()) {
          activeScripts.push({
            partId: p.id,
            source: p.script.code,
            scriptName: `${p.name}.Script`,
          });
        }
      });

      runtime.startScripts(activeScripts);

      // Subscribe to runtime hierarchy changes for live Explorer synchronization
      runtime.workspace.ChildAdded.Connect(() => setRuntimeTreeRevision((r) => r + 1));
      runtime.workspace.ChildRemoved.Connect(() => setRuntimeTreeRevision((r) => r + 1));
      runtime.partsMap.forEach((part) => {
        part.ChildAdded.Connect(() => setRuntimeTreeRevision((r) => r + 1));
        part.ChildRemoved.Connect(() => setRuntimeTreeRevision((r) => r + 1));
      });
    } else {
      // STOP PLAY TEST
      setIsPlaying(false);
      setLivePlayerGui(null);
      if (luaRuntimeRef.current) {
        luaRuntimeRef.current.stop();
        luaRuntimeRef.current = null;
      }

      // Remove any runtime dynamic meshes that were spawned during play test
      if (prePlayPartsSnapshotRef.current.length > 0) {
        const originalIds = new Set(prePlayPartsSnapshotRef.current.map((p) => p.id));
        for (const [id, mesh] of meshesMapRef.current.entries()) {
          if (!originalIds.has(id)) {
            if (sceneRef.current) sceneRef.current.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
            meshesMapRef.current.delete(id);
          }
        }
        partsRef.current = prePlayPartsSnapshotRef.current;
        setParts(prePlayPartsSnapshotRef.current);
      }

      partsRef.current.forEach((p) => {
        const m = meshesMapRef.current.get(p.id);
        if (m) {
          updateMeshFromPart(p, m);
        }
      });
      dynamicPartsPhysics.current.clear();
      updateGizmos(selectedPart, activeToolRef.current);
    }
  };

  const activeScriptPart = parts.find((p) => p.id === activeTab);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e2024] text-[#e3e5e8] font-sans overflow-hidden select-none">
      {/* Red Death Screen Flash */}
      {deathFlash && (
        <div className="fixed inset-0 bg-red-600/40 pointer-events-none z-50 flex items-center justify-center animate-fade-out">
          <div className="text-white text-3xl font-black tracking-widest uppercase drop-shadow-lg font-sans">
            YOU DIED (OOF!)
          </div>
        </div>
      )}

      {/* 1. STUDIO RIBBON TOP BAR */}
      <header className="h-11 bg-[#191b1f] border-b border-[#2d3036] flex items-center justify-between px-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#25282f] hover:bg-[#32363f] text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          {/* Place Title Input */}
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
            <span className="text-xs font-bold text-neutral-400">Place:</span>
            <input
              type="text"
              value={gameTitle}
              onChange={(e) => setGameTitle(e.target.value)}
              className="bg-[#24272e] border border-neutral-700/80 hover:border-neutral-500 focus:border-blue-500 rounded px-2 py-0.5 text-xs text-white font-semibold focus:outline-none w-48 truncate"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors flex items-center gap-1 cursor-pointer ${
              isPublic
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{isPublic ? 'Public' : 'Private'}</span>
          </button>
        </div>

        {/* Center: Play Test Controls */}
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#2a6839] hover:bg-[#347d46] text-white text-xs font-bold rounded shadow border border-[#3e9354] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Test</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded shadow border border-red-500 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Test</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveExperience}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#25282f] hover:bg-[#32363f] text-neutral-200 hover:text-white text-xs font-semibold rounded border border-neutral-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span>Save to Rovix</span>
          </button>
        </div>
      </header>

      {/* 2. SUB-RIBBON TOOLS BAR */}
      <div className="h-10 bg-[#16181c] border-b border-[#2d3036] flex items-center justify-between px-3 shrink-0 z-20">
        <div className="flex items-center gap-1 text-xs">
          {/* Tool Modes */}
          <button
            type="button"
            disabled={isPlaying}
            onClick={() => {
              setActiveTool('select');
              updateGizmos(selectedPart, 'select');
            }}
            className={`p-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-[#2a2d34] text-white border border-neutral-600'
                : 'text-neutral-400 hover:text-white hover:bg-[#202227]'
            }`}
            title="Select Tool"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select</span>
          </button>

          <button
            type="button"
            disabled={isPlaying}
            onClick={() => {
              setActiveTool('move');
              updateGizmos(selectedPart, 'move');
            }}
            className={`p-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'move'
                ? 'bg-[#2a2d34] text-white border border-neutral-600'
                : 'text-neutral-400 hover:text-white hover:bg-[#202227]'
            }`}
            title="Move Tool"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Move</span>
          </button>

          <button
            type="button"
            disabled={isPlaying}
            onClick={() => {
              setActiveTool('scale');
              updateGizmos(selectedPart, 'scale');
            }}
            className={`p-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'scale'
                ? 'bg-[#2a2d34] text-white border border-neutral-600'
                : 'text-neutral-400 hover:text-white hover:bg-[#202227]'
            }`}
            title="Scale Tool"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scale</span>
          </button>

          <button
            type="button"
            disabled={isPlaying}
            onClick={() => {
              setActiveTool('rotate');
              updateGizmos(selectedPart, 'rotate');
            }}
            className={`p-1.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              activeTool === 'rotate'
                ? 'bg-[#2a2d34] text-white border border-neutral-600'
                : 'text-neutral-400 hover:text-white hover:bg-[#202227]'
            }`}
            title="Rotate Tool"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          <div className="h-5 w-[1px] bg-neutral-800 mx-2" />

          {/* Insert Part Button & Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isPlaying}
              onClick={() => setShowPartDropdown(!showPartDropdown)}
              className="px-2.5 py-1 rounded bg-[#202329] hover:bg-[#282c33] text-white font-semibold flex items-center gap-1.5 border border-neutral-700/80 cursor-pointer disabled:opacity-50"
            >
              <Box className="w-3.5 h-3.5 text-blue-400" />
              <span>Part</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showPartDropdown && (
              <div className="absolute left-0 mt-1 w-32 bg-[#1b1d22] border border-neutral-700 shadow-xl rounded py-1 z-50">
                <button
                  type="button"
                  onClick={() => handleInsertPart('block')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-[#262930] flex items-center gap-2 cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-blue-400" />
                  <span>Block</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertPart('sphere')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-[#262930] flex items-center gap-2 cursor-pointer"
                >
                  <Circle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sphere</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertPart('cylinder')}
                  className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-[#262930] flex items-center gap-2 cursor-pointer"
                >
                  <CylinderIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cylinder</span>
                </button>
              </div>
            )}
          </div>

          {/* Insert UI Button & Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isPlaying}
              onClick={() => setShowUiDropdown(!showUiDropdown)}
              className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1.5 border cursor-pointer disabled:opacity-50 transition-colors ${
                showUiDropdown
                  ? 'bg-purple-900/60 text-purple-200 border-purple-500'
                  : 'bg-[#202329] hover:bg-[#282c33] text-white border-neutral-700/80'
              }`}
              title="Insert UI Elements (ScreenGui, Frame, TextLabel, TextButton, TextBox, ImageLabel)"
            >
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>UI</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showUiDropdown && (
              <div className="absolute left-0 mt-1 w-44 bg-[#1b1d22] border border-neutral-700 shadow-2xl rounded p-1 z-50">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-2 py-1 border-b border-neutral-800 font-sans">
                  Insert UI Element
                </div>
                <button
                  type="button"
                  onClick={() => handleInsertUi('ScreenGui')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-purple-400" />
                  <span>ScreenGui</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertUi('Frame')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-blue-400" />
                  <span>Frame</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertUi('TextLabel')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TextLabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertUi('TextButton')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TextButton</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertUi('TextBox')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <TextCursorInput className="w-3.5 h-3.5 text-amber-400" />
                  <span>TextBox</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertUi('ImageLabel')}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-neutral-200 hover:bg-[#252830] flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>ImageLabel</span>
                </button>
              </div>
            )}
          </div>

          {/* Color Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isPlaying || !selectedPart}
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              className="px-2.5 py-1 rounded bg-[#202329] hover:bg-[#282c33] text-white font-semibold flex items-center gap-1.5 border border-neutral-700/80 cursor-pointer disabled:opacity-50"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Color</span>
              <div
                className="w-3 h-3 rounded-full border border-neutral-500"
                style={{ backgroundColor: selectedPart?.color || '#a0a5a9' }}
              />
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showColorDropdown && selectedPart && (
              <div className="absolute left-0 mt-1 p-2 bg-[#1b1d22] border border-neutral-700 shadow-2xl rounded grid grid-cols-4 gap-1.5 w-44 z-50">
                {ROBLOX_STUDIO_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    style={{ backgroundColor: c.hex }}
                    onClick={() => {
                      handlePartChange(selectedPart.id, { color: c.hex });
                      setShowColorDropdown(false);
                    }}
                    title={c.name}
                    className="w-8 h-8 rounded border border-neutral-600 hover:scale-110 transition-transform cursor-pointer"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Material Dropdown */}
          <div className="relative">
            <button
              type="button"
              disabled={isPlaying || !selectedPart}
              onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
              className="px-2.5 py-1 rounded bg-[#202329] hover:bg-[#282c33] text-white font-semibold flex items-center gap-1.5 border border-neutral-700/80 cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Material</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showMaterialDropdown && selectedPart && (
              <div className="absolute left-0 mt-1 w-36 bg-[#1b1d22] border border-neutral-700 shadow-xl rounded py-1 z-50">
                {(['Plastic', 'SmoothPlastic', 'Neon', 'Wood'] as const).map((mat) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => {
                      handlePartChange(selectedPart.id, { material: mat });
                      setShowMaterialDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-[#262930] cursor-pointer"
                  >
                    {mat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Script Button for selected part */}
          {selectedPart && !isPlaying && (
            <button
              type="button"
              onClick={() => handleOpenScript(selectedPart.id)}
              className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#25334a] text-blue-300 hover:text-white font-semibold flex items-center gap-1.5 border border-blue-600/40 cursor-pointer text-xs"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>{selectedPart.script ? 'Edit Script' : '+ Add Script'}</span>
            </button>
          )}
        </div>

        {/* Right side toolbar toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowStudioGui(!showStudioGui)}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-semibold border transition-colors cursor-pointer ${
              showStudioGui
                ? 'bg-purple-950/80 text-purple-300 border-purple-600/60'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
            title="Toggle Roblox GUI Visibility in Viewport"
          >
            <Monitor className="w-3.5 h-3.5 text-purple-400" />
            <span>UI: {showStudioGui ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOutputWindow(!showOutputWindow)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 font-semibold border transition-colors cursor-pointer ${
              showOutputWindow
                ? 'bg-blue-950/80 text-blue-300 border-blue-600/60'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
            title="Toggle Output Window (Logs, Print statements, Errors)"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Output ({outputLogs.length})</span>
          </button>
        </div>
      </div>

      {/* 3. DOCUMENT TAB BAR (3D Viewport vs Open Script Editors) */}
      <div className="h-8 bg-[#181a1e] border-b border-[#2d3036] flex items-center px-2 gap-1 overflow-x-auto select-none shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('viewport')}
          className={`h-7 px-3 rounded-t flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'viewport'
              ? 'bg-[#1e2024] text-white border-t-2 border-t-blue-500 border-x border-[#2d3036]'
              : 'text-neutral-400 hover:text-white hover:bg-[#22242a]'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span>3D Viewport</span>
        </button>

        {openScriptPartIds.map((pid) => {
          const p = parts.find((part) => part.id === pid);
          if (!p) return null;
          const isActive = activeTab === pid;

          return (
            <div
              key={pid}
              onClick={() => setActiveTab(pid)}
              className={`h-7 px-2.5 rounded-t flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors group ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-amber-500 border-x border-[#333333]'
                  : 'text-neutral-400 hover:text-white hover:bg-[#22242a]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>{p.name}.lua</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenScriptPartIds(openScriptPartIds.filter((id) => id !== pid));
                  if (activeTab === pid) setActiveTab('viewport');
                }}
                className="ml-1 p-0.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {openInstanceScripts.map((sc) => {
          const isActive = activeTab === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => {
                setActiveInstanceScript(sc);
                setActiveTab(sc.id);
              }}
              className={`h-7 px-2.5 rounded-t flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors group ${
                isActive
                  ? 'bg-[#1e1e1e] text-white border-t-2 border-t-amber-500 border-x border-[#333333]'
                  : 'text-neutral-400 hover:text-white hover:bg-[#22242a]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>{sc.Name}.lua</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenInstanceScripts((prev) => prev.filter((s) => s.id !== sc.id));
                  if (activeTab === sc.id) setActiveTab('viewport');
                }}
                className="ml-1 p-0.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. MAIN WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Toast Notification */}
        {saveSuccessToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#161a20] border border-emerald-500/70 text-emerald-300 px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessToast}</span>
          </div>
        )}

        {/* 3D WebGL Viewport Container (Always active in background, visible when activeTab === 'viewport') */}
        <div
          className={`flex-1 h-full cursor-default bg-black relative touch-none overflow-hidden ${
            activeTab !== 'viewport' ? 'hidden' : 'block'
          }`}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* 3D WebGL Canvas Layer (Three.js canvas mounts here without destroying sibling overlays) */}
          <div
            ref={mountRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="absolute inset-0 w-full h-full"
          />

          {/* Roblox GUI Layer: Live PlayerGui in play mode, StarterGui in edit mode */}
          {showStudioGui && (
            <RobloxGuiRenderer
              root={isPlaying && livePlayerGui ? livePlayerGui : starterGuiRef.current}
              selectedInstanceId={selectedUiInstance?.id}
              onSelectInstance={(inst) => {
                setSelectedUiInstance(inst);
                setSelectedPartId(null);
                if (selectionOutlineRef.current) selectionOutlineRef.current.visible = false;
              }}
              isEditor={!isPlaying}
              revision={hierarchyRevision}
            />
          )}

          {/* Hint Overlay */}
          {!isPlaying ? (
            <div className="absolute bottom-3 left-3 px-3 py-2 bg-[#14161a]/90 border border-neutral-800 rounded-lg text-xs text-neutral-300 pointer-events-none backdrop-blur-sm space-y-1 shadow-lg z-30">
              <div className="text-white font-bold text-[11px] uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <span>Studio Controls, UI & Lua Scripting</span>
              </div>
              <div>• <strong className="text-white">WASD</strong>: Fly camera • <strong className="text-white">Right-Click Drag</strong>: Look around</div>
              <div>• <strong className="text-purple-400">Make UI</strong>: Click <strong className="text-purple-300">+ UI</strong> in the toolbar or Explorer to add ScreenGui, Frames, Buttons & Labels!</div>
              <div>• Click on any UI element to select and customize its size, position, text, and colors!</div>
            </div>
          ) : (
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-[#14161a]/85 border border-neutral-800 rounded text-xs text-emerald-400 font-semibold pointer-events-none backdrop-blur-sm flex items-center gap-2 z-30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>PLAY TESTING & LUA ACTIVE (WASD move • Space jump)</span>
            </div>
          )}
        </div>

        {/* ACTIVE SCRIPT EDITOR TAB */}
        {activeTab !== 'viewport' && activeScriptPart && (
          <StudioScriptEditor
            key={activeScriptPart.id}
            partName={activeScriptPart.name}
            initialCode={activeScriptPart.script?.code || ''}
            onCodeChange={(newCode) => {
              handlePartChange(activeScriptPart.id, {
                script: {
                  id: activeScriptPart.script?.id || 'script_' + Date.now(),
                  name: activeScriptPart.script?.name || 'Script',
                  code: newCode,
                  enabled: true,
                  parentPartId: activeScriptPart.id,
                },
              });
            }}
            onClose={() => {
              setOpenScriptPartIds(openScriptPartIds.filter((id) => id !== activeScriptPart.id));
              setActiveTab('viewport');
            }}
            onStartPlayTest={handleTogglePlay}
          />
        )}

        {/* ACTIVE INSTANCE SCRIPT EDITOR TAB */}
        {activeTab !== 'viewport' && activeInstanceScript && (
          <StudioScriptEditor
            key={activeInstanceScript.id}
            partName={activeInstanceScript.Name}
            initialCode={activeInstanceScript.Source}
            onCodeChange={(newCode) => {
              activeInstanceScript.Source = newCode;
            }}
            onClose={() => {
              setOpenInstanceScripts((prev) => prev.filter((s) => s.id !== activeInstanceScript.id));
              setActiveInstanceScript(null);
              setActiveTab('viewport');
            }}
            onStartPlayTest={handleTogglePlay}
          />
        )}

        {/* RIGHT SIDEBAR: EXPLORER & PROPERTIES */}
        <aside className="w-72 bg-[#191b1f] border-l border-[#2d3036] flex flex-col shrink-0 z-20 overflow-hidden">
          {/* EXPLORER PANEL */}
          <div className="flex-1 flex flex-col border-b border-[#2d3036] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#141619] border-b border-[#2d3036] text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Explorer</span>
              <div className="flex items-center gap-1.5">
                {isPlaying && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
                <span className="text-[10px] text-neutral-500 font-mono">{parts.length} parts</span>
              </div>
            </div>

            <StudioExplorer
              parts={parts}
              starterGui={starterGuiRef.current}
              livePlayerGui={isPlaying && luaRuntimeRef.current ? luaRuntimeRef.current.bridge.player.PlayerGui : null}
              isPlaying={isPlaying}
              selectedPartId={selectedPartId}
              selectedUiInstance={selectedUiInstance}
              onSelectPart={(pId) => {
                setSelectedPartId(pId);
                setSelectedUiInstance(null);
                const p = parts.find((pt) => pt.id === pId);
                if (p && !isPlaying) updateGizmos(p, activeToolRef.current);
              }}
              onSelectUiInstance={(inst) => {
                setSelectedUiInstance(inst);
                setSelectedPartId(null);
                if (gizmoGroupRef.current) gizmoGroupRef.current.visible = false;
                if (selectionOutlineRef.current) selectionOutlineRef.current.visible = false;
              }}
              onDeletePart={(pId) => handleDeletePart(pId)}
              onOpenPartScript={(pId) => handleOpenScript(pId)}
              onOpenScriptInstance={(sc) => {
                setOpenInstanceScripts((prev) => (prev.some((s) => s.id === sc.id) ? prev : [...prev, sc]));
                setActiveInstanceScript(sc);
                setActiveTab(sc.id);
              }}
              onHierarchyUpdated={() => setHierarchyRevision((r) => r + 1)}
            />
          </div>

          {/* PROPERTIES PANEL */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#16181c]">
            <div className="px-3 py-1.5 bg-[#141619] border-b border-[#2d3036] text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Properties</span>
              {selectedUiInstance ? (
                <span className="text-[10px] text-blue-400 font-mono">{selectedUiInstance.Name}</span>
              ) : selectedPart ? (
                <span className="text-[10px] text-neutral-300 font-mono">{selectedPart.name}</span>
              ) : null}
            </div>

            {selectedUiInstance ? (
              <div className="flex-1 overflow-y-auto">
                <StudioInstanceProperties
                  instance={selectedUiInstance}
                  onUpdate={() => setHierarchyRevision((r) => r + 1)}
                  onOpenScript={(sc) => {
                    setOpenInstanceScripts((prev) => (prev.some((s) => s.id === sc.id) ? prev : [...prev, sc]));
                    setActiveInstanceScript(sc);
                    setActiveTab(sc.id);
                  }}
                />
              </div>
            ) : selectedPart ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Name</label>
                  <input
                    type="text"
                    disabled={isPlaying}
                    value={selectedPart.name}
                    onChange={(e) => handlePartChange(selectedPart.id, { name: e.target.value })}
                    className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono disabled:opacity-60"
                  />
                </div>

                {/* Lua Script Card */}
                {!isPlaying && (
                  <div className="p-2.5 rounded-lg bg-[#1a1d24] border border-blue-900/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px] uppercase tracking-wider">
                        <Code className="w-3.5 h-3.5" />
                        <span>Lua Scripting</span>
                      </div>
                      {selectedPart.script && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">
                          Attached
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenScript(selectedPart.id)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>{selectedPart.script ? 'Open Script Editor' : 'Create Lua Script'}</span>
                    </button>

                    {/* Presets Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowTemplateMenuPartId(
                            showTemplateMenuPartId === selectedPart.id ? null : selectedPart.id
                          )
                        }
                        className="w-full py-1 bg-[#242832] hover:bg-[#2d3240] text-neutral-300 hover:text-white font-semibold rounded flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer text-[11px]"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Apply Obby / Game Preset</span>
                      </button>

                      {showTemplateMenuPartId === selectedPart.id && (
                        <div className="absolute left-0 bottom-full mb-1 w-full bg-[#181a1e] border border-neutral-700 shadow-2xl rounded p-1 z-50 max-h-48 overflow-y-auto space-y-1">
                          {LUA_SCRIPT_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => handleApplyPresetToPart(selectedPart.id, tpl)}
                              className="w-full text-left p-1.5 hover:bg-[#252830] rounded text-[11px] text-neutral-200 hover:text-blue-300 transition-colors cursor-pointer truncate"
                            >
                              {tpl.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Position (X, Y, Z) */}
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Position (X, Y, Z)</label>
                  <div className="grid grid-cols-3 gap-1 font-mono">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        type="number"
                        step="0.5"
                        disabled={isPlaying}
                        value={selectedPart.position[idx]}
                        onChange={(e) => {
                          const newPos = [...selectedPart.position] as [number, number, number];
                          newPos[idx] = parseFloat(e.target.value) || 0;
                          handlePartChange(selectedPart.id, { position: newPos });
                        }}
                        className="w-full bg-[#202329] border border-neutral-700 rounded px-1.5 py-1 text-center text-white disabled:opacity-60"
                      />
                    ))}
                  </div>
                </div>

                {/* Size (X, Y, Z) */}
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Size (Width, Height, Depth)</label>
                  <div className="grid grid-cols-3 gap-1 font-mono">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        type="number"
                        step="0.5"
                        min="0.5"
                        disabled={isPlaying}
                        value={selectedPart.size[idx]}
                        onChange={(e) => {
                          const newSize = [...selectedPart.size] as [number, number, number];
                          newSize[idx] = Math.max(0.5, parseFloat(e.target.value) || 1);
                          handlePartChange(selectedPart.id, { size: newSize });
                        }}
                        className="w-full bg-[#202329] border border-neutral-700 rounded px-1.5 py-1 text-center text-white disabled:opacity-60"
                      />
                    ))}
                  </div>
                </div>

                {/* Orientation (X, Y, Z) */}
                <div className="space-y-1">
                  <label className="text-[11px] text-neutral-400">Orientation (Degrees)</label>
                  <div className="grid grid-cols-3 gap-1 font-mono">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        type="number"
                        step="15"
                        disabled={isPlaying}
                        value={selectedPart.rotation[idx]}
                        onChange={(e) => {
                          const newRot = [...selectedPart.rotation] as [number, number, number];
                          newRot[idx] = parseFloat(e.target.value) || 0;
                          handlePartChange(selectedPart.id, { rotation: newRot });
                        }}
                        className="w-full bg-[#202329] border border-neutral-700 rounded px-1.5 py-1 text-center text-white disabled:opacity-60"
                      />
                    ))}
                  </div>
                </div>

                {/* Color & Material */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Color</label>
                    <div className="flex items-center gap-2 bg-[#202329] border border-neutral-700 rounded px-2 py-1">
                      <input
                        type="color"
                        disabled={isPlaying}
                        value={selectedPart.color}
                        onChange={(e) => handlePartChange(selectedPart.id, { color: e.target.value })}
                        className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded disabled:opacity-60"
                      />
                      <span className="font-mono text-[11px] text-neutral-300 truncate">
                        {selectedPart.color}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Material</label>
                    <select
                      disabled={isPlaying}
                      value={selectedPart.material}
                      onChange={(e) =>
                        handlePartChange(selectedPart.id, {
                          material: e.target.value as StudioPart['material'],
                        })
                      }
                      className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-sans text-xs focus:outline-none cursor-pointer disabled:opacity-60"
                    >
                      <option value="Plastic">Plastic</option>
                      <option value="SmoothPlastic">SmoothPlastic</option>
                      <option value="Neon">Neon</option>
                      <option value="Wood">Wood</option>
                    </select>
                  </div>
                </div>

                {/* Physics Behavior & ClickDetector */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Behavior
                  </div>

                  <label className="flex items-center justify-between p-2 bg-[#202329] rounded border border-neutral-700 cursor-pointer">
                    <span className="text-neutral-200">Anchored</span>
                    <input
                      type="checkbox"
                      disabled={isPlaying}
                      checked={selectedPart.anchored}
                      onChange={(e) => handlePartChange(selectedPart.id, { anchored: e.target.checked })}
                      className="rounded bg-neutral-800 border-neutral-600 text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-60"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 bg-[#202329] rounded border border-neutral-700 cursor-pointer">
                    <span className="text-neutral-200">CanCollide</span>
                    <input
                      type="checkbox"
                      disabled={isPlaying}
                      checked={selectedPart.canCollide}
                      onChange={(e) => handlePartChange(selectedPart.id, { canCollide: e.target.checked })}
                      className="rounded bg-neutral-800 border-neutral-600 text-emerald-600 focus:ring-0 cursor-pointer disabled:opacity-60"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 bg-[#202329] rounded border border-neutral-700 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-neutral-200">ClickDetector</span>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isPlaying}
                      checked={Boolean(selectedPart.hasClickDetector)}
                      onChange={(e) =>
                        handlePartChange(selectedPart.id, { hasClickDetector: e.target.checked })
                      }
                      className="rounded bg-neutral-800 border-neutral-600 text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-60"
                    />
                  </label>

                  {/* Transparency */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Transparency</span>
                      <span className="font-mono">{selectedPart.transparency.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      disabled={isPlaying}
                      value={selectedPart.transparency}
                      onChange={(e) =>
                        handlePartChange(selectedPart.id, { transparency: parseFloat(e.target.value) })
                      }
                      className="w-full accent-blue-500 cursor-pointer disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-neutral-500">
                <MousePointer className="w-6 h-6 mb-2 opacity-50" />
                <p className="text-xs">Select a part in the viewport or Explorer to inspect and edit its properties.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 5. COLLAPSIBLE STUDIO OUTPUT WINDOW / LUA LOG CONSOLE */}
      {showOutputWindow && (
        <div className="h-44 bg-[#14161a] border-t border-[#2d3036] flex flex-col shrink-0 z-30 font-mono text-xs select-text">
          <div className="h-7 bg-[#1c1f24] px-3 border-b border-[#2d3036] flex items-center justify-between select-none">
            <div className="flex items-center gap-2 text-neutral-300 font-bold text-[11px] uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Studio Output</span>
              <span className="text-[10px] text-neutral-500 font-mono">({outputLogs.length} messages)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOutputLogs([])}
                className="px-2 py-0.5 rounded bg-[#272b32] hover:bg-[#323742] text-neutral-300 text-[11px] border border-neutral-700 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowOutputWindow(false)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1 font-mono text-[11px]">
            {outputLogs.length === 0 ? (
              <div className="text-neutral-600 italic">No output yet. Lua script print() and warnings will appear here when Play Testing.</div>
            ) : (
              outputLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'info'
                      ? 'text-blue-400 font-bold'
                      : 'text-neutral-300'
                  }`}
                >
                  <span className="text-neutral-600 select-none">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="break-all whitespace-pre-wrap">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
