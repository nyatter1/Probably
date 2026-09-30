import * as THREE from 'three';

export class RBXVector3 {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.X = Number.isFinite(Number(x)) ? Number(x) : 0;
    this.Y = Number.isFinite(Number(y)) ? Number(y) : 0;
    this.Z = Number.isFinite(Number(z)) ? Number(z) : 0;
  }

  // Lowercase alias compatibility
  get x() { return this.X; }
  get y() { return this.Y; }
  get z() { return this.Z; }

  get Magnitude(): number {
    return Math.sqrt(this.X * this.X + this.Y * this.Y + this.Z * this.Z);
  }

  get Unit(): RBXVector3 {
    const mag = this.Magnitude;
    if (mag === 0) return new RBXVector3(0, 0, 0);
    return new RBXVector3(this.X / mag, this.Y / mag, this.Z / mag);
  }

  add(other: any): RBXVector3 {
    if (other instanceof RBXVector3) {
      return new RBXVector3(this.X + other.X, this.Y + other.Y, this.Z + other.Z);
    }
    if (Array.isArray(other)) {
      return new RBXVector3(this.X + (other[0] || 0), this.Y + (other[1] || 0), this.Z + (other[2] || 0));
    }
    if (other && typeof other === 'object') {
      const ox = other.X ?? other.x ?? 0;
      const oy = other.Y ?? other.y ?? 0;
      const oz = other.Z ?? other.z ?? 0;
      return new RBXVector3(this.X + ox, this.Y + oy, this.Z + oz);
    }
    return this;
  }

  sub(other: any): RBXVector3 {
    if (other instanceof RBXVector3) {
      return new RBXVector3(this.X - other.X, this.Y - other.Y, this.Z - other.Z);
    }
    if (Array.isArray(other)) {
      return new RBXVector3(this.X - (other[0] || 0), this.Y - (other[1] || 0), this.Z - (other[2] || 0));
    }
    if (other && typeof other === 'object') {
      const ox = other.X ?? other.x ?? 0;
      const oy = other.Y ?? other.y ?? 0;
      const oz = other.Z ?? other.z ?? 0;
      return new RBXVector3(this.X - ox, this.Y - oy, this.Z - oz);
    }
    return this;
  }

  mul(other: any): RBXVector3 {
    if (typeof other === 'number') {
      return new RBXVector3(this.X * other, this.Y * other, this.Z * other);
    }
    if (other instanceof RBXVector3) {
      return new RBXVector3(this.X * other.X, this.Y * other.Y, this.Z * other.Z);
    }
    if (other && typeof other === 'object') {
      const ox = other.X ?? other.x ?? 1;
      const oy = other.Y ?? other.y ?? 1;
      const oz = other.Z ?? other.z ?? 1;
      return new RBXVector3(this.X * ox, this.Y * oy, this.Z * oz);
    }
    return this;
  }

  div(other: any): RBXVector3 {
    if (typeof other === 'number') {
      const inv = other === 0 ? 0 : 1 / other;
      return new RBXVector3(this.X * inv, this.Y * inv, this.Z * inv);
    }
    if (other instanceof RBXVector3) {
      return new RBXVector3(
        other.X === 0 ? 0 : this.X / other.X,
        other.Y === 0 ? 0 : this.Y / other.Y,
        other.Z === 0 ? 0 : this.Z / other.Z
      );
    }
    return this;
  }

  neg(): RBXVector3 {
    return new RBXVector3(-this.X, -this.Y, -this.Z);
  }

  Lerp(goal: RBXVector3, alpha: number): RBXVector3 {
    const a = Math.max(0, Math.min(1, alpha));
    return new RBXVector3(
      this.X + (goal.X - this.X) * a,
      this.Y + (goal.Y - this.Y) * a,
      this.Z + (goal.Z - this.Z) * a
    );
  }

  lerp(goal: RBXVector3, alpha: number): RBXVector3 {
    return this.Lerp(goal, alpha);
  }

  Dot(other: RBXVector3): number {
    return this.X * other.X + this.Y * other.Y + this.Z * other.Z;
  }

  dot(other: RBXVector3): number {
    return this.Dot(other);
  }

  Cross(other: RBXVector3): RBXVector3 {
    return new RBXVector3(
      this.Y * other.Z - this.Z * other.Y,
      this.Z * other.X - this.X * other.Z,
      this.X * other.Y - this.Y * other.X
    );
  }

  cross(other: RBXVector3): RBXVector3 {
    return this.Cross(other);
  }

  equals(other: any): boolean {
    if (!other || typeof other !== 'object') return false;
    const ox = other.X ?? other.x;
    const oy = other.Y ?? other.y;
    const oz = other.Z ?? other.z;
    return Math.abs(this.X - ox) < 1e-5 && Math.abs(this.Y - oy) < 1e-5 && Math.abs(this.Z - oz) < 1e-5;
  }

  toArray(): [number, number, number] {
    return [this.X, this.Y, this.Z];
  }

  toThree(): THREE.Vector3 {
    return new THREE.Vector3(this.X, this.Y, this.Z);
  }

  toString(): string {
    return `${this.X.toFixed(2)}, ${this.Y.toFixed(2)}, ${this.Z.toFixed(2)}`;
  }

  static fromThree(v: THREE.Vector3): RBXVector3 {
    return new RBXVector3(v.x, v.y, v.z);
  }

  static new(x = 0, y = 0, z = 0): RBXVector3 {
    return new RBXVector3(x, y, z);
  }

  static get zero(): RBXVector3 {
    return new RBXVector3(0, 0, 0);
  }

  static get one(): RBXVector3 {
    return new RBXVector3(1, 1, 1);
  }

  static get xAxis(): RBXVector3 {
    return new RBXVector3(1, 0, 0);
  }

  static get yAxis(): RBXVector3 {
    return new RBXVector3(0, 1, 0);
  }

  static get zAxis(): RBXVector3 {
    return new RBXVector3(0, 0, 1);
  }
}
