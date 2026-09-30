import { RBXInstance } from '../Instance.ts';

export class RBXScreenGui extends RBXInstance {
  Enabled = true;
  ResetOnSpawn = true;
  ZIndexBehavior = 'Sibling';
  DisplayOrder = 0;
  IgnoreGuiInset = false;

  constructor(name = 'ScreenGui') {
    super('ScreenGui', name);
  }

  override IsA(className: string): boolean {
    if (className === 'ScreenGui' || className === 'LayerCollector' || className === 'GuiBase2d') return true;
    return super.IsA(className);
  }
}
