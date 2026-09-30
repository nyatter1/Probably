import { RBXInstance } from './Instance.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';

export class RBXWeld extends RBXInstance {
  Part0: RBXInstance | null = null;
  Part1: RBXInstance | null = null;
  C0: RBXCFrame = RBXCFrame.identity;
  C1: RBXCFrame = RBXCFrame.identity;
  Enabled = true;

  constructor(name = 'Weld') {
    super('Weld', name);
  }

  override IsA(className: string): boolean {
    if (className === 'Weld' || className === 'JointInstance') return true;
    return super.IsA(className);
  }
}

export class RBXWeldConstraint extends RBXInstance {
  Part0: RBXInstance | null = null;
  Part1: RBXInstance | null = null;
  Enabled = true;

  constructor(name = 'WeldConstraint') {
    super('WeldConstraint', name);
  }

  override IsA(className: string): boolean {
    if (className === 'WeldConstraint') return true;
    return super.IsA(className);
  }
}
