import { RBXGuiObject } from './GuiObject.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';

export class RBXFrame extends RBXGuiObject {
  Style = 'Custom';

  constructor(name = 'Frame') {
    super('Frame', name);
    this.BackgroundColor3 = RBXColor3.fromRGB(45, 48, 55);
  }

  override IsA(className: string): boolean {
    if (className === 'Frame') return true;
    return super.IsA(className);
  }
}
