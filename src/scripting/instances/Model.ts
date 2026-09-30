import { RBXInstance } from './Instance.ts';
import { RBXBasePart } from './BasePart.ts';
import { RBXHumanoid } from './Humanoid.ts';
import { RBXVector3 } from '../datatypes/Vector3.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';

export class RBXModel extends RBXInstance {
  PrimaryPart: RBXBasePart | null = null;

  constructor(name = 'Model') {
    super('Model', name);
  }

  get Humanoid(): RBXHumanoid | null {
    return (this.FindFirstChildOfClass('Humanoid') as RBXHumanoid) || null;
  }

  get Head(): RBXBasePart | null {
    return (this.FindFirstChild('Head') as RBXBasePart) || null;
  }

  get Torso(): RBXBasePart | null {
    return (this.FindFirstChild('Torso') as RBXBasePart) || null;
  }

  get HumanoidRootPart(): RBXBasePart | null {
    return (this.FindFirstChild('HumanoidRootPart') as RBXBasePart) || null;
  }

  override IsA(className: string): boolean {
    if (className === 'Model' || className === 'PVInstance') return true;
    return super.IsA(className);
  }

  MoveTo(targetPosition: any): void {
    const pos = targetPosition instanceof RBXVector3
      ? targetPosition
      : new RBXVector3(targetPosition[0] ?? 0, targetPosition[1] ?? 0, targetPosition[2] ?? 0);

    const parts = this.GetDescendants().filter((d): d is RBXBasePart => d.IsA('BasePart'));
    if (parts.length === 0) return;

    const referencePos = this.PrimaryPart ? this.PrimaryPart.Position : parts[0].Position;
    const delta = pos.sub(referencePos);

    for (const p of parts) {
      p.Position = p.Position.add(delta);
    }
  }

  moveTo(targetPosition: any): void {
    this.MoveTo(targetPosition);
  }

  SetPrimaryPartCFrame(cframe: RBXCFrame): void {
    if (!this.PrimaryPart) return;
    const oldCF = this.PrimaryPart.CFrame;
    const parts = this.GetDescendants().filter((d): d is RBXBasePart => d.IsA('BasePart'));

    this.PrimaryPart.CFrame = cframe;
    for (const p of parts) {
      if (p !== this.PrimaryPart) {
        // relative transform: cf_new = cframe * (oldCF:Inverse() * p.CFrame)
        const relPos = p.Position.sub(oldCF.Position);
        p.Position = cframe.Position.add(relPos);
      }
    }
  }

  GetBoundingBox(): [RBXCFrame, RBXVector3] {
    const parts = this.GetDescendants().filter((d): d is RBXBasePart => d.IsA('BasePart'));
    if (parts.length === 0) {
      return [RBXCFrame.identity, RBXVector3.zero];
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const p of parts) {
      const pos = p.Position;
      const half = p.Size.mul(0.5);
      minX = Math.min(minX, pos.X - half.X);
      minY = Math.min(minY, pos.Y - half.Y);
      minZ = Math.min(minZ, pos.Z - half.Z);
      maxX = Math.max(maxX, pos.X + half.X);
      maxY = Math.max(maxY, pos.Y + half.Y);
      maxZ = Math.max(maxZ, pos.Z + half.Z);
    }

    const center = new RBXVector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    const size = new RBXVector3(maxX - minX, maxY - minY, maxZ - minZ);
    return [RBXCFrame.new(center.X, center.Y, center.Z), size];
  }

  BreakJoints(): void {}
  MakeJoints(): void {}
}
