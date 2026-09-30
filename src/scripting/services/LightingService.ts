import { RBXInstance } from '../instances/Instance.ts';
import { RBXColor3 } from '../datatypes/Color3.ts';

export class RBXLightingService extends RBXInstance {
  Ambient = RBXColor3.fromRGB(128, 128, 128);
  Brightness = 2;
  ClockTime = 14;
  FogColor = RBXColor3.fromRGB(192, 192, 192);
  FogEnd = 10000;
  FogStart = 0;

  constructor() {
    super('Lighting', 'Lighting');
  }

  override IsA(className: string): boolean {
    if (className === 'Lighting') return true;
    return super.IsA(className);
  }
}
