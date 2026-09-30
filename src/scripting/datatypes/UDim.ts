export class RBXUDim {
  readonly Scale: number;
  readonly Offset: number;

  constructor(scale = 0, offset = 0) {
    this.Scale = Number.isFinite(Number(scale)) ? Number(scale) : 0;
    this.Offset = Number.isFinite(Number(offset)) ? Math.round(Number(offset)) : 0;
  }

  add(other: any): RBXUDim {
    if (other instanceof RBXUDim) {
      return new RBXUDim(this.Scale + other.Scale, this.Offset + other.Offset);
    }
    if (typeof other === 'number') {
      return new RBXUDim(this.Scale, this.Offset + other);
    }
    return this;
  }

  sub(other: any): RBXUDim {
    if (other instanceof RBXUDim) {
      return new RBXUDim(this.Scale - other.Scale, this.Offset - other.Offset);
    }
    if (typeof other === 'number') {
      return new RBXUDim(this.Scale, this.Offset - other);
    }
    return this;
  }

  equals(other: any): boolean {
    if (!other || typeof other !== 'object') return false;
    const s = other.Scale ?? other.scale;
    const o = other.Offset ?? other.offset;
    return Math.abs(this.Scale - s) < 1e-4 && Math.abs(this.Offset - o) < 1e-4;
  }

  toString(): string {
    return `${this.Scale}, ${this.Offset}`;
  }

  static new(scale = 0, offset = 0): RBXUDim {
    return new RBXUDim(scale, offset);
  }
}
