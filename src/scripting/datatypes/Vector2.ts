export class RBXVector2 {
  readonly X: number;
  readonly Y: number;

  constructor(x = 0, y = 0) {
    this.X = Number.isFinite(Number(x)) ? Number(x) : 0;
    this.Y = Number.isFinite(Number(y)) ? Number(y) : 0;
  }

  get Magnitude(): number {
    return Math.sqrt(this.X * this.X + this.Y * this.Y);
  }

  get magnitude(): number {
    return this.Magnitude;
  }

  get Unit(): RBXVector2 {
    const mag = this.Magnitude;
    if (mag === 0) return new RBXVector2(0, 0);
    return new RBXVector2(this.X / mag, this.Y / mag);
  }

  get unit(): RBXVector2 {
    return this.Unit;
  }

  add(other: any): RBXVector2 {
    if (other instanceof RBXVector2) {
      return new RBXVector2(this.X + other.X, this.Y + other.Y);
    }
    if (other && typeof other === 'object') {
      const ox = Number(other.X ?? other.x ?? 0);
      const oy = Number(other.Y ?? other.y ?? 0);
      return new RBXVector2(this.X + ox, this.Y + oy);
    }
    return this;
  }

  sub(other: any): RBXVector2 {
    if (other instanceof RBXVector2) {
      return new RBXVector2(this.X - other.X, this.Y - other.Y);
    }
    if (other && typeof other === 'object') {
      const ox = Number(other.X ?? other.x ?? 0);
      const oy = Number(other.Y ?? other.y ?? 0);
      return new RBXVector2(this.X - ox, this.Y - oy);
    }
    return this;
  }

  mul(other: any): RBXVector2 {
    if (other instanceof RBXVector2) {
      return new RBXVector2(this.X * other.X, this.Y * other.Y);
    }
    const scalar = Number(other) || 0;
    return new RBXVector2(this.X * scalar, this.Y * scalar);
  }

  div(other: any): RBXVector2 {
    if (other instanceof RBXVector2) {
      const ox = other.X === 0 ? 0 : this.X / other.X;
      const oy = other.Y === 0 ? 0 : this.Y / other.Y;
      return new RBXVector2(ox, oy);
    }
    const scalar = Number(other) || 0;
    if (scalar === 0) return new RBXVector2(0, 0);
    return new RBXVector2(this.X / scalar, this.Y / scalar);
  }

  neg(): RBXVector2 {
    return new RBXVector2(-this.X, -this.Y);
  }

  equals(other: any): boolean {
    if (!other || typeof other !== 'object') return false;
    const ox = Number(other.X ?? other.x ?? 0);
    const oy = Number(other.Y ?? other.y ?? 0);
    return Math.abs(this.X - ox) < 1e-4 && Math.abs(this.Y - oy) < 1e-4;
  }

  Lerp(goal: RBXVector2, alpha: number): RBXVector2 {
    const a = Math.max(0, Math.min(1, alpha));
    return new RBXVector2(
      this.X + (goal.X - this.X) * a,
      this.Y + (goal.Y - this.Y) * a
    );
  }

  lerp(goal: RBXVector2, alpha: number): RBXVector2 {
    return this.Lerp(goal, alpha);
  }

  clone(): RBXVector2 {
    return new RBXVector2(this.X, this.Y);
  }

  toString(): string {
    return `${this.X}, ${this.Y}`;
  }

  static new(x = 0, y = 0): RBXVector2 {
    return new RBXVector2(x, y);
  }

  static get zero(): RBXVector2 {
    return new RBXVector2(0, 0);
  }

  static get one(): RBXVector2 {
    return new RBXVector2(1, 1);
  }
}
