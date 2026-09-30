import * as THREE from 'three';
import { RBXVector3 } from './Vector3.ts';

export class RBXCFrame {
  readonly position: RBXVector3;
  readonly rotationMatrix: [
    number, number, number,
    number, number, number,
    number, number, number
  ]; // Row-major 3x3 rotation

  constructor(
    pos: RBXVector3 = RBXVector3.zero,
    rot: [number, number, number, number, number, number, number, number, number] = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]
  ) {
    this.position = pos;
    this.rotationMatrix = rot;
  }

  get Position(): RBXVector3 {
    return this.position;
  }

  get p(): RBXVector3 {
    return this.position;
  }

  get X(): number { return this.position.X; }
  get Y(): number { return this.position.Y; }
  get Z(): number { return this.position.Z; }

  // Direction vectors
  get RightVector(): RBXVector3 {
    return new RBXVector3(this.rotationMatrix[0], this.rotationMatrix[3], this.rotationMatrix[6]);
  }

  get UpVector(): RBXVector3 {
    return new RBXVector3(this.rotationMatrix[1], this.rotationMatrix[4], this.rotationMatrix[7]);
  }

  get LookVector(): RBXVector3 {
    // In Roblox, LookVector is -Z of rotation matrix
    return new RBXVector3(-this.rotationMatrix[2], -this.rotationMatrix[5], -this.rotationMatrix[8]);
  }

  toEulerAnglesXYZ(): [number, number, number] {
    // Pitch (X), Yaw (Y), Roll (Z) in radians
    const m = this.rotationMatrix;
    let rx = 0, ry = 0, rz = 0;
    if (m[6] < 1) {
      if (m[6] > -1) {
        ry = Math.asin(m[6]);
        rx = Math.atan2(-m[7], m[8]);
        rz = Math.atan2(-m[3], m[0]);
      } else {
        ry = -Math.PI / 2;
        rx = -Math.atan2(m[1], m[4]);
        rz = 0;
      }
    } else {
      ry = Math.PI / 2;
      rx = Math.atan2(m[1], m[4]);
      rz = 0;
    }
    return [rx, ry, rz];
  }

  toOrientationDegrees(): RBXVector3 {
    const [rx, ry, rz] = this.toEulerAnglesXYZ();
    return new RBXVector3(
      THREE.MathUtils.radToDeg(rx),
      THREE.MathUtils.radToDeg(ry),
      THREE.MathUtils.radToDeg(rz)
    );
  }

  mul(other: any): any {
    if (other instanceof RBXVector3) {
      // CFrame * Vector3: transforms vector into world space
      const m = this.rotationMatrix;
      const x = m[0] * other.X + m[1] * other.Y + m[2] * other.Z + this.position.X;
      const y = m[3] * other.X + m[4] * other.Y + m[5] * other.Z + this.position.Y;
      const z = m[6] * other.X + m[7] * other.Y + m[8] * other.Z + this.position.Z;
      return new RBXVector3(x, y, z);
    }
    if (other instanceof RBXCFrame) {
      const a = this.rotationMatrix;
      const b = other.rotationMatrix;
      // Multiply rotation matrices
      const rot: [number, number, number, number, number, number, number, number, number] = [
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
        a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
        a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

        a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
        a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
        a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

        a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
        a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
        a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
      ];
      // Multiply position
      const px = a[0] * other.position.X + a[1] * other.position.Y + a[2] * other.position.Z + this.position.X;
      const py = a[3] * other.position.X + a[4] * other.position.Y + a[5] * other.position.Z + this.position.Y;
      const pz = a[6] * other.position.X + a[7] * other.position.Y + a[8] * other.position.Z + this.position.Z;
      return new RBXCFrame(new RBXVector3(px, py, pz), rot);
    }
    return this;
  }

  add(other: RBXVector3): RBXCFrame {
    return new RBXCFrame(this.position.add(other), this.rotationMatrix);
  }

  sub(other: RBXVector3): RBXCFrame {
    return new RBXCFrame(this.position.sub(other), this.rotationMatrix);
  }

  Lerp(goal: RBXCFrame, alpha: number): RBXCFrame {
    const a = Math.max(0, Math.min(1, alpha));
    const pos = this.position.Lerp(goal.position, a);
    const m1 = this.rotationMatrix;
    const m2 = goal.rotationMatrix;
    const rot: [number, number, number, number, number, number, number, number, number] = [
      m1[0] + (m2[0] - m1[0]) * a,
      m1[1] + (m2[1] - m1[1]) * a,
      m1[2] + (m2[2] - m1[2]) * a,
      m1[3] + (m2[3] - m1[3]) * a,
      m1[4] + (m2[4] - m1[4]) * a,
      m1[5] + (m2[5] - m1[5]) * a,
      m1[6] + (m2[6] - m1[6]) * a,
      m1[7] + (m2[7] - m1[7]) * a,
      m1[8] + (m2[8] - m1[8]) * a,
    ];
    return new RBXCFrame(pos, rot);
  }

  toThreeMatrix4(): THREE.Matrix4 {
    const m = this.rotationMatrix;
    const mat = new THREE.Matrix4();
    mat.set(
      m[0], m[1], m[2], this.position.X,
      m[3], m[4], m[5], this.position.Y,
      m[6], m[7], m[8], this.position.Z,
      0, 0, 0, 1
    );
    return mat;
  }

  static fromThreeMatrix4(mat: THREE.Matrix4): RBXCFrame {
    const e = mat.elements;
    // THREE elements are column-major:
    // e[0] e[4] e[8]  e[12]
    // e[1] e[5] e[9]  e[13]
    // e[2] e[6] e[10] e[14]
    return new RBXCFrame(
      new RBXVector3(e[12], e[13], e[14]),
      [
        e[0], e[4], e[8],
        e[1], e[5], e[9],
        e[2], e[6], e[10],
      ]
    );
  }

  static new(...args: any[]): RBXCFrame {
    if (args.length === 0) {
      return new RBXCFrame();
    }
    if (args.length === 1 && args[0] instanceof RBXVector3) {
      return new RBXCFrame(args[0]);
    }
    if (args.length === 2 && args[0] instanceof RBXVector3 && args[1] instanceof RBXVector3) {
      // LookAt constructor: CFrame.new(pos, lookAt)
      const eye = args[0];
      const target = args[1];
      const zAxis = eye.sub(target).Unit;
      let yAxis = new RBXVector3(0, 1, 0);
      let xAxis = yAxis.Cross(zAxis).Unit;
      if (xAxis.Magnitude < 0.001) {
        xAxis = new RBXVector3(1, 0, 0);
        yAxis = zAxis.Cross(xAxis).Unit;
      } else {
        yAxis = zAxis.Cross(xAxis).Unit;
      }
      return new RBXCFrame(eye, [
        xAxis.X, yAxis.X, zAxis.X,
        xAxis.Y, yAxis.Y, zAxis.Y,
        xAxis.Z, yAxis.Z, zAxis.Z,
      ]);
    }
    if (args.length === 3) {
      return new RBXCFrame(new RBXVector3(args[0], args[1], args[2]));
    }
    if (args.length === 12) {
      // x, y, z, R00, R01, R02, R10, R11, R12, R20, R21, R22
      return new RBXCFrame(
        new RBXVector3(args[0], args[1], args[2]),
        [
          args[3], args[4], args[5],
          args[6], args[7], args[8],
          args[9], args[10], args[11],
        ]
      );
    }
    return new RBXCFrame(new RBXVector3(Number(args[0]) || 0, Number(args[1]) || 0, Number(args[2]) || 0));
  }

  static Angles(rx = 0, ry = 0, rz = 0): RBXCFrame {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);

    // Z * Y * X Euler angle rotation
    const rot: [number, number, number, number, number, number, number, number, number] = [
      cy * cz,
      -cy * sz,
      sy,

      sx * sy * cz + cx * sz,
      -sx * sy * sz + cx * cz,
      -sx * cy,

      -cx * sy * cz + sx * sz,
      cx * sy * sz + sx * cz,
      cx * cy,
    ];
    return new RBXCFrame(RBXVector3.zero, rot);
  }

  static fromEulerAnglesXYZ(rx = 0, ry = 0, rz = 0): RBXCFrame {
    return RBXCFrame.Angles(rx, ry, rz);
  }

  static fromEulerAnglesYXZ(rx = 0, ry = 0, rz = 0): RBXCFrame {
    return RBXCFrame.Angles(rx, ry, rz);
  }

  static fromOrientation(pitchDeg = 0, yawDeg = 0, rollDeg = 0): RBXCFrame {
    return RBXCFrame.Angles(
      THREE.MathUtils.degToRad(pitchDeg),
      THREE.MathUtils.degToRad(yawDeg),
      THREE.MathUtils.degToRad(rollDeg)
    );
  }

  static get identity(): RBXCFrame {
    return new RBXCFrame();
  }
}
