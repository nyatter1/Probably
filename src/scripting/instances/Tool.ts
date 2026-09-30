import { RBXInstance } from './Instance.ts';
import { RBXBasePart } from './BasePart.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXTool extends RBXInstance {
  RequiresHandle = true;
  CanBeDropped = true;

  readonly Equipped = new RBXScriptSignal<any>();
  readonly Unequipped = new RBXScriptSignal<void>();
  readonly Activated = new RBXScriptSignal<void>();
  readonly Deactivated = new RBXScriptSignal<void>();

  constructor(name = 'Tool') {
    super('Tool', name);
  }

  get Handle(): RBXBasePart | null {
    const handle = this.FindFirstChild('Handle');
    return (handle && handle.IsA('BasePart')) ? (handle as RBXBasePart) : null;
  }

  override IsA(className: string): boolean {
    if (className === 'Tool' || className === 'BackpackItem') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.Equipped.DisconnectAll();
    this.Unequipped.DisconnectAll();
    this.Activated.DisconnectAll();
    this.Deactivated.DisconnectAll();
    super.Destroy();
  }
}
