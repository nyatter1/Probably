import { RBXInstance } from './Instance.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXClickDetector extends RBXInstance {
  MaxActivationDistance = 32;

  readonly MouseClick = new RBXScriptSignal<any>();
  readonly MouseHoverEnter = new RBXScriptSignal<any>();
  readonly MouseHoverLeave = new RBXScriptSignal<any>();
  readonly RightMouseClick = new RBXScriptSignal<any>();

  constructor(name = 'ClickDetector') {
    super('ClickDetector', name);
  }

  override IsA(className: string): boolean {
    if (className === 'ClickDetector') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.MouseClick.DisconnectAll();
    this.MouseHoverEnter.DisconnectAll();
    this.MouseHoverLeave.DisconnectAll();
    this.RightMouseClick.DisconnectAll();
    super.Destroy();
  }
}
