import { RBXInstance } from './Instance.ts';
import { RBXBasePart } from './BasePart.ts';

export class RBXAccessory extends RBXInstance {
  AccessoryType = 'Hat';

  constructor(name = 'Accessory') {
    super('Accessory', name);
  }

  get Handle(): RBXBasePart | null {
    const handle = this.FindFirstChild('Handle');
    return (handle && handle.IsA('BasePart')) ? (handle as RBXBasePart) : null;
  }

  override IsA(className: string): boolean {
    if (className === 'Accessory') return true;
    return super.IsA(className);
  }
}
