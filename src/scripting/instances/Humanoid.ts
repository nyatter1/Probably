import { RBXInstance } from './Instance.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';
import { RBXVector3 } from '../datatypes/Vector3.ts';

export class RBXHumanoid extends RBXInstance {
  private _health = 100;
  MaxHealth = 100;
  WalkSpeed = 16;
  JumpPower = 50;
  Jump = false;
  AutoRotate = true;
  HipHeight = 2.0;
  Sit = false;

  readonly Died = new RBXScriptSignal<void>();
  readonly HealthChanged = new RBXScriptSignal<number>();
  readonly StateChanged = new RBXScriptSignal<[string, string]>();

  // Engine hooks
  onDieHook?: () => void;
  onHealthChangeHook?: (newHealth: number, oldHealth: number) => void;
  onWalkSpeedChangeHook?: (newSpeed: number) => void;
  onJumpPowerChangeHook?: (newPower: number) => void;

  constructor(name = 'Humanoid') {
    super('Humanoid', name);
  }

  override IsA(className: string): boolean {
    if (className === 'Humanoid') return true;
    return super.IsA(className);
  }

  get Health(): number {
    return this._health;
  }

  set Health(val: any) {
    const num = Math.max(0, Math.min(this.MaxHealth, Number(val) || 0));
    const old = this._health;
    if (old === num) return;

    this._health = num;
    this.HealthChanged.Fire(num);

    if (this.onHealthChangeHook) {
      this.onHealthChangeHook(num, old);
    }

    if (old > 0 && num <= 0) {
      this.Died.Fire();
      if (this.onDieHook) {
        this.onDieHook();
      }
    }

    this.notifyPropertyChanged('Health', num);
  }

  TakeDamage(amount: number): void {
    if (this._health <= 0) return;
    const dmg = Math.max(0, Number(amount) || 0);
    this.Health = this._health - dmg;
  }

  takeDamage(amount: number): void {
    this.TakeDamage(amount);
  }

  Move(dir: RBXVector3): void {
    this.notifyPropertyChanged('MoveDirection', dir);
  }

  MoveTo(pos: RBXVector3): void {
    this.notifyPropertyChanged('MoveTo', pos);
  }

  ChangeState(state: any): void {
    const sName = typeof state === 'string' ? state : state?.Name || 'Running';
    this.StateChanged.Fire(['None', sName]);
  }

  override Destroy(): void {
    this.Died.DisconnectAll();
    this.HealthChanged.DisconnectAll();
    this.StateChanged.DisconnectAll();
    super.Destroy();
  }
}
