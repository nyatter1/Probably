import * as THREE from 'three';
import { RBXDataModel } from '../services/ServiceProvider.ts';
import { RBXWorkspace } from '../services/WorkspaceService.ts';
import { RBXBasePart } from '../instances/BasePart.ts';
import { RBXPart } from '../instances/Part.ts';
import { RBXModel } from '../instances/Model.ts';
import { RBXHumanoid } from '../instances/Humanoid.ts';
import { RBXPlayer } from '../services/Player.ts';
import { RBXClickDetector } from '../instances/ClickDetector.ts';
import { StudioPart } from '../../utils/gamesStorage.ts';
import { deserializeInstance } from '../../utils/instanceSerializer.ts';

export interface EngineBridgeOptions {
  scene?: THREE.Scene | null;
  camera?: THREE.Camera | null;
  parts: StudioPart[];
  threeMeshes?: Map<string, THREE.Mesh>;
  uiTree?: any[];
  onPlayerKilled?: () => void;
  onSpeedChanged?: (newSpeed: number) => void;
  onJumpPowerChanged?: (newPower: number) => void;
}

export class EngineBridge {
  public game: RBXDataModel;
  public workspace: RBXWorkspace;
  public player: RBXPlayer;
  public character: RBXModel;
  public humanoid: RBXHumanoid;
  public humanoidRootPart: RBXBasePart;

  public partsMap = new Map<string, RBXBasePart>();
  private scene?: THREE.Scene | null;
  private camera?: THREE.Camera | null;
  private threeMeshes: Map<string, THREE.Mesh>;

  // Touch tracking for TouchEnded
  private touchingPartIds = new Set<string>();

  // ClickDetector hover tracking
  private lastHoveredDetector: RBXClickDetector | null = null;

  constructor(opts: EngineBridgeOptions) {
    this.game = new RBXDataModel();
    this.workspace = this.game.Workspace;
    this.player = this.game.Players.LocalPlayer;
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.threeMeshes = opts.threeMeshes || new Map();

    // 1. Build Character & Humanoid Hierarchy
    this.character = new RBXModel('PlayerCharacter');
    this.character.Parent = this.workspace;

    this.humanoid = new RBXHumanoid('Humanoid');
    this.humanoid.Parent = this.character;

    if (opts.onPlayerKilled) {
      this.humanoid.onDieHook = opts.onPlayerKilled;
    }
    if (opts.onSpeedChanged) {
      this.humanoid.onWalkSpeedChangeHook = opts.onSpeedChanged;
    }
    if (opts.onJumpPowerChanged) {
      this.humanoid.onJumpPowerChangeHook = opts.onJumpPowerChanged;
    }

    const makeCharPart = (name: string, size: [number, number, number]) => {
      const p = new RBXPart(name);
      p.Size = size;
      p.Anchored = false;
      p.CanCollide = true;
      p.Parent = this.character;
      return p;
    };

    this.humanoidRootPart = makeCharPart('HumanoidRootPart', [2, 2, 1]);
    this.character.PrimaryPart = this.humanoidRootPart;
    makeCharPart('Head', [1.2, 1.2, 1.2]);
    makeCharPart('Torso', [2, 2, 1]);
    makeCharPart('LeftArm', [1, 2, 1]);
    makeCharPart('RightArm', [1, 2, 1]);
    makeCharPart('LeftLeg', [1, 2, 1]);
    makeCharPart('RightLeg', [1, 2, 1]);

    this.player.Character = this.character;

    // 2. Wire Workspace addition/removal to Three.js scene
    this.workspace.onPartAddedToWorkspace = (part: RBXBasePart) => {
      this.registerPartToScene(part);
    };

    this.workspace.onPartRemovedFromWorkspace = (part: RBXBasePart) => {
      this.unregisterPartFromScene(part);
    };

    // 3. Initialize saved parts into Workspace
    this.initializeParts(opts.parts);

    // 4. Initialize saved UI into StarterGui and PlayerGui
    if (opts.uiTree && Array.isArray(opts.uiTree)) {
      for (const item of opts.uiTree) {
        try {
          const uiInst = deserializeInstance(item, this.game.StarterGui);
          // Clone into PlayerGui (matching Roblox behavior)
          const playerClone = uiInst.Clone();
          playerClone.Parent = this.player.PlayerGui;
        } catch (e) {
          console.error('[EngineBridge] Failed to load UI element:', e);
        }
      }
    }
  }

  private initializeParts(parts: StudioPart[]): void {
    for (const p of parts) {
      const rbxPart = new RBXPart(p.name);
      (rbxPart as any).id = p.id;
      rbxPart.Shape = p.shape === 'sphere' ? 'Ball' : p.shape === 'cylinder' ? 'Cylinder' : 'Block';
      rbxPart.Position = p.position;
      rbxPart.Size = p.size;
      rbxPart.Orientation = p.rotation;
      rbxPart.Color = p.color;
      rbxPart.Material = p.material || 'Plastic';
      rbxPart.Transparency = p.transparency ?? 0;
      rbxPart.Anchored = p.anchored ?? true;
      rbxPart.CanCollide = p.canCollide ?? true;

      // Link existing Three.js mesh if available
      const existingMesh = this.threeMeshes.get(p.id);
      if (existingMesh) {
        rbxPart.threeMesh = existingMesh;
      }

      rbxPart.Parent = this.workspace;
      if (p.hasClickDetector) {
        const cd = new RBXClickDetector('ClickDetector');
        cd.Parent = rbxPart;
      }
      this.partsMap.set(p.id, rbxPart);
      if (p.name && typeof p.name === 'string') {
        this.partsMap.set(p.name.toLowerCase(), rbxPart);
      }
    }
  }

  public registerPartToScene(part: RBXBasePart): void {
    this.partsMap.set(part.id, part);
    if (part.Name && typeof part.Name === 'string') {
      this.partsMap.set(part.Name.toLowerCase(), part);
    }

    if (!part.threeMesh && this.scene) {
      if (part instanceof RBXPart) {
        const mesh = part.createThreeMesh();
        this.scene.add(mesh);
        this.threeMeshes.set(part.id, mesh);
      }
    }
  }

  public unregisterPartFromScene(part: RBXBasePart): void {
    this.partsMap.delete(part.id);
    if (part.Name && typeof part.Name === 'string') {
      this.partsMap.delete(part.Name.toLowerCase());
    }

    if (part.threeMesh && this.scene) {
      this.scene.remove(part.threeMesh);
      this.threeMeshes.delete(part.id);
    }
  }

  public updatePlayerPosition(pos: THREE.Vector3): void {
    this.humanoidRootPart.Position = [pos.x, pos.y, pos.z];
  }

  /**
   * Raycast ClickDetector from mouse position
   */
  public handlePointerClick(mouseNdc: { x: number; y: number }, camera: THREE.Camera): void {
    if (!this.scene) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseNdc.x, mouseNdc.y), camera);

    const meshes: THREE.Mesh[] = [];
    this.threeMeshes.forEach((mesh) => {
      if (mesh) {
        meshes.push(mesh);
      }
    });

    if (meshes.length === 0) return;

    const hits = raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      const topHit = hits[0];
      const meshObj = topHit.object as THREE.Mesh;
      const part = (meshObj as any).rbxInstance || this.partsMap.get(meshObj.name);

      if (part && typeof part.FindFirstChildOfClass === 'function') {
        let detector = (part.FindFirstChildOfClass('ClickDetector') ||
          part.FindFirstChildWhichIsA('ClickDetector')) as RBXClickDetector | null;

        if (!detector && part.Parent && typeof part.Parent.FindFirstChildOfClass === 'function') {
          detector = (part.Parent.FindFirstChildOfClass('ClickDetector') ||
            part.Parent.FindFirstChildWhichIsA('ClickDetector')) as RBXClickDetector | null;
        }

        if (detector) {
          // Check distance to player
          const playerPos = this.humanoidRootPart
            ? this.humanoidRootPart.Position.toThree()
            : new THREE.Vector3(0, 0, 0);

          const distToPlayer = topHit.point.distanceTo(playerPos);
          const maxDist = Number(detector.MaxActivationDistance) || 32;

          if (distToPlayer <= maxDist || topHit.distance <= maxDist) {
            detector.MouseClick.Fire(this.player);
          }
        }
      }
    }
  }

  public handlePointerMove(mouseNdc: { x: number; y: number }, camera: THREE.Camera): void {
    if (!this.scene) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseNdc.x, mouseNdc.y), camera);

    const meshes: THREE.Mesh[] = [];
    this.threeMeshes.forEach((mesh) => {
      if (mesh) {
        meshes.push(mesh);
      }
    });

    if (meshes.length === 0) return;

    const hits = raycaster.intersectObjects(meshes, true);
    let currentDetector: RBXClickDetector | null = null;

    if (hits.length > 0) {
      const topHit = hits[0];
      const meshObj = topHit.object as THREE.Mesh;
      const part = (meshObj as any).rbxInstance || this.partsMap.get(meshObj.name);

      if (part && typeof part.FindFirstChildOfClass === 'function') {
        let detector = (part.FindFirstChildOfClass('ClickDetector') ||
          part.FindFirstChildWhichIsA('ClickDetector')) as RBXClickDetector | null;

        if (!detector && part.Parent && typeof part.Parent.FindFirstChildOfClass === 'function') {
          detector = (part.Parent.FindFirstChildOfClass('ClickDetector') ||
            part.Parent.FindFirstChildWhichIsA('ClickDetector')) as RBXClickDetector | null;
        }

        if (detector) {
          const playerPos = this.humanoidRootPart
            ? this.humanoidRootPart.Position.toThree()
            : new THREE.Vector3(0, 0, 0);

          const distToPlayer = topHit.point.distanceTo(playerPos);
          const maxDist = Number(detector.MaxActivationDistance) || 32;

          if (distToPlayer <= maxDist || topHit.distance <= maxDist) {
            currentDetector = detector;
          }
        }
      }
    }

    if (currentDetector !== this.lastHoveredDetector) {
      if (this.lastHoveredDetector) {
        this.lastHoveredDetector.MouseHoverLeave.Fire(this.player);
      }
      if (currentDetector) {
        currentDetector.MouseHoverEnter.Fire(this.player);
      }
      this.lastHoveredDetector = currentDetector;
    }
  }

  /**
   * Check physics touch overlap between player bounding box and all parts
   */
  public checkTouchCollisions(playerPos: THREE.Vector3, playerRadius = 1.0, playerHeight = 4.8): void {
    const currentlyTouching = new Set<string>();

    const pMinX = playerPos.x - playerRadius;
    const pMaxX = playerPos.x + playerRadius;
    const pMinY = playerPos.y - 3.0;
    const pMaxY = playerPos.y + 1.8;
    const pMinZ = playerPos.z - playerRadius;
    const pMaxZ = playerPos.z + playerRadius;

    for (const [id, part] of this.partsMap.entries()) {
      if (part.id !== id) continue; // skip lower case name alias
      if (!part.CanTouch) continue;

      const pos = part.Position;
      const size = part.Size;
      const halfW = size.X / 2;
      const halfH = size.Y / 2;
      const halfD = size.Z / 2;

      const minX = pos.X - halfW;
      const maxX = pos.X + halfW;
      const minY = pos.Y - halfH;
      const maxY = pos.Y + halfH;
      const minZ = pos.Z - halfD;
      const maxZ = pos.Z + halfD;

      if (
        pMaxX >= minX &&
        pMinX <= maxX &&
        pMaxY >= minY &&
        pMinY <= maxY &&
        pMaxZ >= minZ &&
        pMinZ <= maxZ
      ) {
        currentlyTouching.add(part.id);
        if (!this.touchingPartIds.has(part.id)) {
          part.Touched.Fire(this.humanoidRootPart);
        }
      }
    }

    // Fire TouchEnded for parts no longer touching
    for (const id of this.touchingPartIds) {
      if (!currentlyTouching.has(id)) {
        const part = this.partsMap.get(id);
        if (part) {
          part.TouchEnded.Fire(this.humanoidRootPart);
        }
      }
    }

    this.touchingPartIds = currentlyTouching;
  }

  public triggerTouch(partId: string): void {
    const part = this.partsMap.get(partId);
    if (part) {
      part.Touched.Fire(this.humanoidRootPart);
    }
  }

  public destroy(): void {
    this.game.Destroy();
    this.partsMap.clear();
    this.touchingPartIds.clear();
  }
}
