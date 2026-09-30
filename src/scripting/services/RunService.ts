import { RBXInstance } from '../instances/Instance.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXRunService extends RBXInstance {
  readonly Heartbeat = new RBXScriptSignal<number>();
  readonly RenderStepped = new RBXScriptSignal<number>();
  readonly Stepped = new RBXScriptSignal<[number, number]>();

  private isRunningState = true;
  private totalTime = 0;

  constructor() {
    super('RunService', 'RunService');
  }

  IsStudio(): boolean { return true; }
  isStudio(): boolean { return true; }

  IsClient(): boolean { return true; }
  isClient(): boolean { return true; }

  IsServer(): boolean { return false; }
  isServer(): boolean { return false; }

  IsRunning(): boolean { return this.isRunningState; }
  isRunning(): boolean { return this.isRunningState; }

  IsEdit(): boolean { return !this.isRunningState; }
  isEdit(): boolean { return !this.isRunningState; }

  IsRunMode(): boolean { return this.isRunningState; }
  isRunMode(): boolean { return this.isRunningState; }

  private renderStepBindings = new Map<string, { priority: number; callback: (dt: number) => void }>();

  BindToRenderStep(name: string, priority: number, callback: (dt: number) => void): void {
    this.renderStepBindings.set(name, { priority, callback });
  }

  bindToRenderStep(name: string, priority: number, callback: (dt: number) => void): void {
    this.BindToRenderStep(name, priority, callback);
  }

  UnbindFromRenderStep(name: string): void {
    this.renderStepBindings.delete(name);
  }

  unbindFromRenderStep(name: string): void {
    this.UnbindFromRenderStep(name);
  }

  setRunning(running: boolean): void {
    this.isRunningState = running;
  }

  step(dt: number): void {
    if (!this.isRunningState) return;
    this.totalTime += dt;
    this.Stepped.Fire(this.totalTime, dt);
    this.RenderStepped.Fire(dt);

    // Call bindings sorted by priority
    if (this.renderStepBindings.size > 0) {
      const sorted = Array.from(this.renderStepBindings.values()).sort((a, b) => a.priority - b.priority);
      for (const b of sorted) {
        try {
          b.callback(dt);
        } catch (e) {
          console.error('[RunService] BindToRenderStep error:', e);
        }
      }
    }

    this.Heartbeat.Fire(dt);
  }

  override IsA(className: string): boolean {
    if (className === 'RunService') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.Heartbeat.DisconnectAll();
    this.RenderStepped.DisconnectAll();
    this.Stepped.DisconnectAll();
    super.Destroy();
  }
}
