import * as THREE from 'three';
import { StudioPart } from './gamesStorage.ts';
import { LuauRuntime } from '../scripting/index.ts';

export interface ScriptConsoleLog {
  id: string;
  time: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  source: string;
}

export interface PlayerHumanoidState {
  health: number;
  maxHealth: number;
  walkSpeed: number;
  jumpPower: number;
  position: THREE.Vector3;
  respawnPosition: THREE.Vector3;
  isDead: boolean;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  teleport: (x: number, y: number, z: number) => void;
  setSpeed: (speed: number) => void;
  setJump: (power: number) => void;
}

export class RobloxScriptEngine {
  private runtime: LuauRuntime | null = null;
  private onLogCallback?: (log: ScriptConsoleLog) => void;

  constructor(
    onLog?: (log: ScriptConsoleLog) => void,
    onPartUpdated?: (partId: string, updates: Partial<StudioPart>) => void
  ) {
    this.onLogCallback = onLog;
  }

  public setHumanoid(state: PlayerHumanoidState) {}

  public log(type: 'log' | 'warn' | 'error' | 'info', message: string, source = 'Script') {
    if (this.onLogCallback) {
      this.onLogCallback({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        type,
        message,
        source,
      });
    }
  }

  public start(parts: StudioPart[]) {
    this.stop();
    this.runtime = new LuauRuntime({
      parts,
      onLog: (l) => {
        this.log(l.type, l.message);
      },
    });

    const activeScripts: { partId: string; source: string; scriptName: string }[] = [];
    parts.forEach((p) => {
      if (p.script && p.script.enabled && p.script.code.trim()) {
        activeScripts.push({
          partId: p.id,
          source: p.script.code,
          scriptName: `${p.name}.Script`,
        });
      }
    });

    this.runtime.startScripts(activeScripts);
  }

  public stop() {
    if (this.runtime) {
      this.runtime.stop();
      this.runtime = null;
    }
  }

  public triggerTouch(partId: string) {
    if (this.runtime) {
      this.runtime.triggerTouch(partId);
    }
  }
}
