import { RBXUDim } from './UDim.ts';

export class RBXUDim2 {
  readonly X: RBXUDim;
  readonly Y: RBXUDim;
  readonly Width: RBXUDim;
  readonly Height: RBXUDim;

  constructor(
    xScaleOrX: number | RBXUDim = 0,
    xOffsetOrY: number | RBXUDim = 0,
    yScale = 0,
    yOffset = 0
  ) {
    if (xScaleOrX instanceof RBXUDim && xOffsetOrY instanceof RBXUDim) {
      this.X = xScaleOrX;
      this.Y = xOffsetOrY;
    } else {
      this.X = new RBXUDim(Number(xScaleOrX) || 0, Number(xOffsetOrY) || 0);
      this.Y = new RBXUDim(Number(yScale) || 0, Number(yOffset) || 0);
    }
    this.Width = this.X;
    this.Height = this.Y;
  }

  Lerp(goal: RBXUDim2, alpha: number): RBXUDim2 {
    const a = Math.max(0, Math.min(1, alpha));
    return new RBXUDim2(
      this.X.Scale + (goal.X.Scale - this.X.Scale) * a,
      this.X.Offset + (goal.X.Offset - this.X.Offset) * a,
      this.Y.Scale + (goal.Y.Scale - this.Y.Scale) * a,
      this.Y.Offset + (goal.Y.Offset - this.Y.Offset) * a
    );
  }

  lerp(goal: RBXUDim2, alpha: number): RBXUDim2 {
    return this.Lerp(goal, alpha);
  }

  add(other: any): RBXUDim2 {
    if (other instanceof RBXUDim2) {
      return new RBXUDim2(
        this.X.Scale + other.X.Scale,
        this.X.Offset + other.X.Offset,
        this.Y.Scale + other.Y.Scale,
        this.Y.Offset + other.Y.Offset
      );
    }
    return this;
  }

  sub(other: any): RBXUDim2 {
    if (other instanceof RBXUDim2) {
      return new RBXUDim2(
        this.X.Scale - other.X.Scale,
        this.X.Offset - other.X.Offset,
        this.Y.Scale - other.Y.Scale,
        this.Y.Offset - other.Y.Offset
      );
    }
    return this;
  }

  equals(other: any): boolean {
    if (!other || typeof other !== 'object') return false;
    const ox = other.X ?? other.x;
    const oy = other.Y ?? other.y;
    return this.X.equals(ox) && this.Y.equals(oy);
  }

  toCSSPosition(): { left: string; top: string } {
    return {
      left: `calc(${this.X.Scale * 100}% + ${this.X.Offset}px)`,
      top: `calc(${this.Y.Scale * 100}% + ${this.Y.Offset}px)`,
    };
  }

  toCSSSize(): { width: string; height: string } {
    return {
      width: `calc(${this.X.Scale * 100}% + ${this.X.Offset}px)`,
      height: `calc(${this.Y.Scale * 100}% + ${this.Y.Offset}px)`,
    };
  }

  toString(): string {
    return `{${this.X.Scale}, ${this.X.Offset}}, {${this.Y.Scale}, ${this.Y.Offset}}`;
  }

  static new(xScale = 0, xOffset = 0, yScale = 0, yOffset = 0): RBXUDim2 {
    return new RBXUDim2(xScale, xOffset, yScale, yOffset);
  }

  static fromScale(xScale = 0, yScale = 0): RBXUDim2 {
    return new RBXUDim2(xScale, 0, yScale, 0);
  }

  static fromOffset(xOffset = 0, yOffset = 0): RBXUDim2 {
    return new RBXUDim2(0, xOffset, 0, yOffset);
  }
}
