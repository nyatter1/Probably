import * as THREE from 'three';

export class RBXColor3 {
  readonly R: number; // 0 to 1
  readonly G: number; // 0 to 1
  readonly B: number; // 0 to 1

  constructor(r = 1, g = 1, b = 1) {
    this.R = Math.max(0, Math.min(1, Number(r) || 0));
    this.G = Math.max(0, Math.min(1, Number(g) || 0));
    this.B = Math.max(0, Math.min(1, Number(b) || 0));
  }

  get r() { return this.R; }
  get g() { return this.G; }
  get b() { return this.B; }

  Lerp(target: RBXColor3, alpha: number): RBXColor3 {
    const a = Math.max(0, Math.min(1, alpha));
    return new RBXColor3(
      this.R + (target.R - this.R) * a,
      this.G + (target.G - this.G) * a,
      this.B + (target.B - this.B) * a
    );
  }

  lerp(target: RBXColor3, alpha: number): RBXColor3 {
    return this.Lerp(target, alpha);
  }

  equals(other: any): boolean {
    if (!other || typeof other !== 'object') return false;
    const or = other.R ?? other.r;
    const og = other.G ?? other.g;
    const ob = other.B ?? other.b;
    return Math.abs(this.R - or) < 0.01 && Math.abs(this.G - og) < 0.01 && Math.abs(this.B - ob) < 0.01;
  }

  toHex(): string {
    const r255 = Math.round(this.R * 255).toString(16).padStart(2, '0');
    const g255 = Math.round(this.G * 255).toString(16).padStart(2, '0');
    const b255 = Math.round(this.B * 255).toString(16).padStart(2, '0');
    return `#${r255}${g255}${b255}`;
  }

  ToHex(): string {
    return this.toHex();
  }

  toRgb(): [number, number, number] {
    return [Math.round(this.R * 255), Math.round(this.G * 255), Math.round(this.B * 255)];
  }

  ToRGB(): [number, number, number] {
    return this.toRgb();
  }

  toThree(): THREE.Color {
    return new THREE.Color(this.R, this.G, this.B);
  }

  toString(): string {
    return `${this.R.toFixed(2)}, ${this.G.toFixed(2)}, ${this.B.toFixed(2)}`;
  }

  static new(r = 1, g = 1, b = 1): RBXColor3 {
    return new RBXColor3(r, g, b);
  }

  static fromRGB(r: number, g: number, b: number): RBXColor3 {
    return new RBXColor3(r / 255, g / 255, b / 255);
  }

  static fromHex(hex: string): RBXColor3 {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    if (isNaN(num)) return new RBXColor3(1, 1, 1);
    return new RBXColor3(
      ((num >> 16) & 255) / 255,
      ((num >> 8) & 255) / 255,
      (num & 255) / 255
    );
  }

  static fromHSV(h: number, s: number, v: number): RBXColor3 {
    let r = 0, g = 0, b = 0;
    const normH = ((h % 1) + 1) % 1; // 0 to 1
    const normS = Math.max(0, Math.min(1, s));
    const normV = Math.max(0, Math.min(1, v));

    const i = Math.floor(normH * 6);
    const f = normH * 6 - i;
    const p = normV * (1 - normS);
    const q = normV * (1 - f * normS);
    const t = normV * (1 - (1 - f) * normS);

    switch (i % 6) {
      case 0: r = normV; g = t; b = p; break;
      case 1: r = q; g = normV; b = p; break;
      case 2: r = p; g = normV; b = t; break;
      case 3: r = p; g = q; b = normV; break;
      case 4: r = t; g = p; b = normV; break;
      case 5: r = normV; g = p; b = q; break;
    }

    return new RBXColor3(r, g, b);
  }
}
