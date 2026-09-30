import { RBXInstance } from '../instances/Instance.ts';
import { RBXTweenInfo } from '../datatypes/TweenInfo.ts';
import { RBXVector3 } from '../datatypes/Vector3.ts';
import { RBXVector2 } from '../datatypes/Vector2.ts';
import { RBXColor3 } from '../datatypes/Color3.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';
import { RBXUDim2 } from '../datatypes/UDim2.ts';
import { RBXUDim } from '../datatypes/UDim.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';
import { LuaTable } from '../runtime/LuaTable.ts';

// Easing math formulas
function ease(style: string, dir: string, t: number): number {
  t = Math.max(0, Math.min(1, t));

  const applyDirection = (fn: (k: number) => number, k: number): number => {
    if (dir === 'In') return fn(k);
    if (dir === 'Out') return 1 - fn(1 - k);
    // InOut
    return k < 0.5 ? 0.5 * fn(k * 2) : 0.5 * (1 - fn((1 - k) * 2)) + 0.5;
  };

  const inFn = (k: number): number => {
    switch (style) {
      case 'Linear':
        return k;
      case 'Sine':
        return 1 - Math.cos((k * Math.PI) / 2);
      case 'Quad':
        return k * k;
      case 'Cubic':
        return k * k * k;
      case 'Quart':
        return k * k * k * k;
      case 'Quint':
        return k * k * k * k * k;
      case 'Exponential':
        return k === 0 ? 0 : Math.pow(1024, k - 1);
      case 'Circular':
        return 1 - Math.sqrt(1 - k * k);
      case 'Back': {
        const s = 1.70158;
        return k * k * ((s + 1) * k - s);
      }
      case 'Bounce': {
        const outBounce = (x: number) => {
          const n1 = 7.5625;
          const d1 = 2.75;
          if (x < 1 / d1) return n1 * x * x;
          if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
          if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
          return n1 * (x -= 2.625 / d1) * x + 0.984375;
        };
        return 1 - outBounce(1 - k);
      }
      case 'Elastic': {
        if (k === 0) return 0;
        if (k === 1) return 1;
        return -Math.pow(2, 10 * (k - 1)) * Math.sin(((k - 1) - 0.1) * (2 * Math.PI) / 0.4);
      }
      default:
        return k;
    }
  };

  return applyDirection(inFn, t);
}

export class RBXTween {
  readonly Instance: any;
  readonly TweenInfo: RBXTweenInfo;
  readonly Goals: Record<string, any>;
  PlaybackState: 'Begin' | 'Delayed' | 'Playing' | 'Paused' | 'Completed' | 'Cancelled' = 'Begin';

  readonly Completed = new RBXScriptSignal<any>();

  private startProps: Record<string, any> = {};
  private startTime = 0;
  private duration = 1;
  private elapsed = 0;
  private currentCycle = 0;
  private isReversing = false;

  constructor(
    instance: any,
    tweenInfo: RBXTweenInfo,
    goals: Record<string, any> | LuaTable,
    private onUpdate?: () => void
  ) {
    this.Instance = instance;
    this.TweenInfo = tweenInfo;
    if (goals instanceof LuaTable) {
      this.Goals = goals.toObject();
    } else if (goals && typeof goals === 'object') {
      this.Goals = { ...goals };
    } else {
      this.Goals = {};
    }
    this.duration = Math.max(0.001, tweenInfo.Time);
  }

  Play(): void {
    if (this.PlaybackState === 'Playing') return;

    // Snapshot current property values
    this.startProps = {};
    for (const key of Object.keys(this.Goals)) {
      this.startProps[key] = this.Instance[key];
    }

    this.startTime = performance.now() + this.TweenInfo.DelayTime * 1000;
    this.elapsed = 0;
    this.currentCycle = 0;
    this.isReversing = false;
    this.PlaybackState = this.TweenInfo.DelayTime > 0 ? 'Delayed' : 'Playing';

    RBXTweenService.activeTweens.add(this);
  }

  play(): void {
    this.Play();
  }

  Pause(): void {
    if (this.PlaybackState === 'Playing' || this.PlaybackState === 'Delayed') {
      this.PlaybackState = 'Paused';
      RBXTweenService.activeTweens.delete(this);
    }
  }

  pause(): void {
    this.Pause();
  }

  Cancel(): void {
    if (this.PlaybackState === 'Playing' || this.PlaybackState === 'Delayed' || this.PlaybackState === 'Paused') {
      this.PlaybackState = 'Cancelled';
      RBXTweenService.activeTweens.delete(this);
      this.Completed.Fire(this.PlaybackState);
    }
  }

  cancel(): void {
    this.Cancel();
  }

  step(now: number, dt: number): void {
    if (this.PlaybackState === 'Delayed') {
      if (now >= this.startTime) {
        this.PlaybackState = 'Playing';
        this.elapsed = 0;
      } else {
        return;
      }
    }

    if (this.PlaybackState !== 'Playing') return;

    this.elapsed += dt;
    let progress = Math.min(1, this.elapsed / this.duration);
    let alpha = ease(this.TweenInfo.EasingStyle, this.TweenInfo.EasingDirection, progress);

    if (this.isReversing) {
      alpha = 1 - alpha;
    }

    // Apply interpolated values to target instance
    for (const key of Object.keys(this.Goals)) {
      const start = this.startProps[key];
      const goal = this.Goals[key];

      if (goal instanceof RBXVector3) {
        const s = start instanceof RBXVector3 ? start : new RBXVector3(start?.x || 0, start?.y || 0, start?.z || 0);
        this.Instance[key] = s.Lerp(goal, alpha);
      } else if (goal instanceof RBXVector2) {
        const s = start instanceof RBXVector2 ? start : new RBXVector2(start?.X ?? start?.x ?? 0, start?.Y ?? start?.y ?? 0);
        this.Instance[key] = s.Lerp(goal, alpha);
      } else if (goal instanceof RBXCFrame) {
        const s = start instanceof RBXCFrame ? start : RBXCFrame.identity;
        this.Instance[key] = s.Lerp(goal, alpha);
      } else if (goal instanceof RBXColor3) {
        const s = start instanceof RBXColor3 ? start : RBXColor3.fromHex(typeof start === 'string' ? start : '#ffffff');
        this.Instance[key] = s.Lerp(goal, alpha);
      } else if (goal instanceof RBXUDim2) {
        const s = start instanceof RBXUDim2 ? start : RBXUDim2.new(0, 0, 0, 0);
        this.Instance[key] = s.Lerp(goal, alpha);
      } else if (goal instanceof RBXUDim) {
        const s = start instanceof RBXUDim ? start : RBXUDim.new(0, 0);
        this.Instance[key] = new RBXUDim(
          s.Scale + (goal.Scale - s.Scale) * alpha,
          s.Offset + (goal.Offset - s.Offset) * alpha
        );
      } else if (typeof goal === 'number') {
        const s = Number(start) || 0;
        this.Instance[key] = s + (goal - s) * alpha;
      } else if (typeof goal === 'boolean') {
        this.Instance[key] = alpha >= 0.5 ? goal : start;
      }

      if (this.Instance && typeof this.Instance.notifyPropertyChanged === 'function') {
        this.Instance.notifyPropertyChanged(key, this.Instance[key]);
      }
    }

    if (this.onUpdate) {
      this.onUpdate();
    }

    if (progress >= 1) {
      // Check repeat / reverse
      if (this.TweenInfo.Reverses && !this.isReversing) {
        this.isReversing = true;
        this.elapsed = 0;
        return;
      }

      this.currentCycle++;
      const maxCycles = this.TweenInfo.RepeatCount; // -1 means infinite

      if (maxCycles === -1 || this.currentCycle <= maxCycles) {
        this.isReversing = false;
        this.elapsed = 0;
        if (this.TweenInfo.DelayTime > 0) {
          this.PlaybackState = 'Delayed';
          this.startTime = now + this.TweenInfo.DelayTime * 1000;
        }
      } else {
        this.PlaybackState = 'Completed';
        RBXTweenService.activeTweens.delete(this);
        this.Completed.Fire(this.PlaybackState);
      }
    }
  }

  Destroy(): void {
    this.Cancel();
    this.Completed.DisconnectAll();
  }
}

export class RBXTweenService extends RBXInstance {
  static activeTweens = new Set<RBXTween>();

  constructor() {
    super('TweenService', 'TweenService');
  }

  Create(instance: any, tweenInfo: RBXTweenInfo, goals: Record<string, any>): RBXTween {
    return new RBXTween(instance, tweenInfo, goals);
  }

  create(instance: any, tweenInfo: RBXTweenInfo, goals: Record<string, any>): RBXTween {
    return this.Create(instance, tweenInfo, goals);
  }

  static stepAll(now: number, dt: number): void {
    if (RBXTweenService.activeTweens.size === 0) return;
    const tweens = Array.from(RBXTweenService.activeTweens);
    for (const tween of tweens) {
      tween.step(now, dt);
    }
  }

  static cancelAll(): void {
    for (const tween of RBXTweenService.activeTweens) {
      tween.Cancel();
    }
    RBXTweenService.activeTweens.clear();
  }

  override IsA(className: string): boolean {
    if (className === 'TweenService') return true;
    return super.IsA(className);
  }
}
