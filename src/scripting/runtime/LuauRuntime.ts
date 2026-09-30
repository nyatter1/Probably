import * as THREE from 'three';
import { StudioPart } from '../../utils/gamesStorage.ts';
import { EngineBridge } from './EngineBridge.ts';
import { Scheduler, ScriptThread } from './Scheduler.ts';
import { ASTInterpreter } from './ASTInterpreter.ts';
import { RBXBasePart } from '../instances/BasePart.ts';
import { RBXScript } from '../instances/Script.ts';
import { RBXClickDetector } from '../instances/ClickDetector.ts';

export interface LuauRuntimeOptions {
  parts: StudioPart[];
  threeMeshes?: Map<string, THREE.Mesh>;
  scene?: THREE.Scene | null;
  camera?: THREE.Camera | null;
  uiTree?: any[];
  onLog?: (log: { id: string; type: 'log' | 'warn' | 'error' | 'info'; message: string; timestamp: number }) => void;
  onPlayerKilled?: () => void;
  onSpeedChanged?: (newSpeed: number) => void;
  onJumpPowerChanged?: (newPower: number) => void;
}

export class LuauRuntime {
  public bridge: EngineBridge;
  public scheduler: Scheduler;
  private runningScripts = new Map<
    RBXScript,
    { interpreter: ASTInterpreter; thread: ScriptThread; cleanups: Array<() => void> }
  >();
  private onLogCallback?: (log: { id: string; type: 'log' | 'warn' | 'error' | 'info'; message: string; timestamp: number }) => void;
  private runtimeCleanups: Array<() => void> = [];

  constructor(opts: LuauRuntimeOptions) {
    this.onLogCallback = opts.onLog;
    this.bridge = new EngineBridge({
      parts: opts.parts,
      threeMeshes: opts.threeMeshes,
      scene: opts.scene,
      camera: opts.camera,
      uiTree: opts.uiTree,
      onPlayerKilled: opts.onPlayerKilled,
      onSpeedChanged: opts.onSpeedChanged,
      onJumpPowerChanged: opts.onJumpPowerChanged,
    });

    this.scheduler = new Scheduler(this.bridge.game.RunService);

    // Dynamic Script Lifecycle: automatically run scripts that become runnable at runtime
    const onDescendantAdded = (desc: any) => {
      if (desc instanceof RBXScript) {
        // Small delay or microtask to allow script properties (Source, etc.) to be initialized
        queueMicrotask(() => {
          if (this.isRunnableContext(desc)) {
            this.runScriptInstance(desc);
          }
        });
      }
    };

    const onDescendantRemoving = (desc: any) => {
      if (desc instanceof RBXScript) {
        this.stopScriptInstance(desc);
      }
    };

    const c1 = this.bridge.workspace.DescendantAdded.Connect(onDescendantAdded);
    const c2 = this.bridge.workspace.DescendantRemoving.Connect(onDescendantRemoving);
    const c3 = this.bridge.player.PlayerGui.DescendantAdded.Connect(onDescendantAdded);
    const c4 = this.bridge.player.PlayerGui.DescendantRemoving.Connect(onDescendantRemoving);

    this.runtimeCleanups.push(() => {
      c1.Disconnect();
      c2.Disconnect();
      c3.Disconnect();
      c4.Disconnect();
    });
  }

  // Backwards compatibility getters
  get partsMap(): Map<string, RBXBasePart> {
    return this.bridge.partsMap;
  }

  get playerCharacter() {
    return this.bridge.character;
  }

  get workspace() {
    return this.bridge.workspace;
  }

  get game() {
    return this.bridge.game;
  }

  public log(type: 'log' | 'warn' | 'error' | 'info', message: string, source = 'Script'): void {
    if (this.onLogCallback) {
      this.onLogCallback({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        type,
        message: `[${source}] ${message}`,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Determine whether a script is parented under an active runtime tree
   */
  public isRunnableContext(scriptInstance: RBXScript): boolean {
    if (!scriptInstance || !scriptInstance.Parent) return false;

    let cur: any = scriptInstance.Parent;
    while (cur) {
      if (cur === this.bridge.workspace) return true;
      if (cur === this.bridge.player.PlayerGui) return true;
      if (cur === this.bridge.character) return true;
      cur = cur.Parent;
    }
    return false;
  }

  /**
   * Run a standalone script instance in its own thread with complete lifecycle tracking
   */
  public runScriptInstance(scriptInstance: RBXScript): void {
    if (!scriptInstance) return;
    if (this.runningScripts.has(scriptInstance)) return;
    if (!scriptInstance.Enabled) return;
    if (typeof scriptInstance.Source !== 'string' || !scriptInstance.Source.trim()) return;

    const thread = this.scheduler.createThread(scriptInstance.Name);
    const interpreter = new ASTInterpreter({
      scriptName: scriptInstance.Name,
      source: scriptInstance.Source,
      scriptInstance,
      game: this.bridge.game,
      workspace: this.bridge.workspace,
      scheduler: this.scheduler,
      thread,
      onLog: (type, msg) => {
        this.log(type, msg, scriptInstance.Name);
      },
    });

    const cleanups: Array<() => void> = [];

    // Stop if disabled
    const cDisabled = scriptInstance.GetPropertyChangedSignal('Disabled').Connect((disabled) => {
      if (disabled) {
        this.stopScriptInstance(scriptInstance);
      }
    });
    cleanups.push(() => cDisabled.Disconnect());

    // Stop if destroyed
    const cDestroy = scriptInstance.Destroying.Connect(() => {
      this.stopScriptInstance(scriptInstance);
    });
    cleanups.push(() => cDestroy.Disconnect());

    // Ancestry changed
    const cAncestry = scriptInstance.AncestryChanged.Connect((_, newParent) => {
      if (!newParent || !this.isRunnableContext(scriptInstance)) {
        this.stopScriptInstance(scriptInstance);
      }
    });
    cleanups.push(() => cAncestry.Disconnect());

    this.runningScripts.set(scriptInstance, { interpreter, thread, cleanups });

    interpreter.run().catch((err) => {
      console.error(`[LuauRuntime] Uncaught script error in ${scriptInstance.Name}:`, err);
    });
  }

  /**
   * Stop an active script instance and clean up its listeners and thread
   */
  public stopScriptInstance(scriptInstance: RBXScript): void {
    const entry = this.runningScripts.get(scriptInstance);
    if (!entry) return;

    entry.thread.cancelled = true;
    this.scheduler.cancelThread(entry.thread);
    entry.cleanups.forEach((c) => c());
    this.runningScripts.delete(scriptInstance);
  }

  /**
   * Start executing scripts attached to parts or standalone in Workspace / GUI
   */
  public startScripts(scripts: { partId: string; source: string; scriptName: string }[]): void {
    this.log('info', `Initializing Luau Engine (${scripts.length} script${scripts.length === 1 ? '' : 's'})...`, 'System');

    for (const s of scripts) {
      // Find parent part in Workspace
      const parentPart = this.bridge.partsMap.get(s.partId);

      // Create a real Script Instance parented to that part
      const scriptInstance = new RBXScript('Script', s.scriptName, s.source);
      if (parentPart) {
        scriptInstance.Parent = parentPart;
      } else {
        scriptInstance.Parent = this.bridge.workspace;
      }

      // Check if the script source references ClickDetector, and ensure parent part has ClickDetector child
      if (s.source.includes('ClickDetector') && parentPart && !parentPart.FindFirstChildOfClass('ClickDetector')) {
        const detector = new RBXClickDetector('ClickDetector');
        detector.Parent = parentPart;
      }

      this.runScriptInstance(scriptInstance);
    }

    // Also run any scripts that are already descendants in PlayerGui or Workspace
    const scanAndRun = (node: any) => {
      if (!node) return;
      for (const desc of node.GetDescendants()) {
        if (desc instanceof RBXScript) {
          if (!this.runningScripts.has(desc)) {
            this.runScriptInstance(desc);
          }
        }
      }
    };

    scanAndRun(this.bridge.player.PlayerGui);
    scanAndRun(this.bridge.workspace);
  }

  /**
   * Animation frame step (synchronizes Tweens and RunService)
   */
  public step(dt: number): void {
    this.scheduler.step(performance.now(), dt);
  }

  /**
   * Touch physics trigger
   */
  public triggerTouch(partId: string): void {
    this.bridge.triggerTouch(partId);
  }

  public checkTouchCollisions(playerPos: THREE.Vector3, playerRadius = 1.0, playerHeight = 4.8): void {
    this.bridge.checkTouchCollisions(playerPos, playerRadius, playerHeight);
  }

  public updatePlayerPosition(pos: THREE.Vector3): void {
    this.bridge.updatePlayerPosition(pos);
  }

  public handlePointerClick(mouseNdc: { x: number; y: number }, camera: THREE.Camera): void {
    this.bridge.handlePointerClick(mouseNdc, camera);
  }

  public handlePointerMove(mouseNdc: { x: number; y: number }, camera: THREE.Camera): void {
    this.bridge.handlePointerMove(mouseNdc, camera);
  }

  public syncInstanceToThree(instance: any): void {
    if (instance instanceof RBXBasePart) {
      instance.syncThreeTransform();
      instance.syncThreeVisuals();
    }
  }

  public destroyPart(partId: string): void {
    const part = this.bridge.partsMap.get(partId);
    if (part) {
      part.Destroy();
    }
  }

  /**
   * Stop Play Test: cleanly cancel all scripts, timers, tweens, and connections
   */
  public stop(): void {
    this.runtimeCleanups.forEach((c) => c());
    this.runtimeCleanups = [];

    for (const [scriptInstance] of this.runningScripts) {
      this.stopScriptInstance(scriptInstance);
    }
    this.runningScripts.clear();

    this.scheduler.cancelAll();
    this.bridge.destroy();
  }
}
