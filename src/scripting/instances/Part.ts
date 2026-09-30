import * as THREE from 'three';
import { RBXBasePart } from './BasePart.ts';

export class RBXPart extends RBXBasePart {
  Shape: 'Block' | 'Ball' | 'Cylinder' | 'Wedge' = 'Block';

  constructor(name = 'Part') {
    super('Part', name);
  }

  override IsA(className: string): boolean {
    if (className === 'Part') return true;
    return super.IsA(className);
  }

  override syncThreeGeometry(): void {
    if (!this.threeMesh) return;
    this.threeMesh.geometry.dispose();
    this.threeMesh.geometry = this.createGeometry();
  }

  createGeometry(): THREE.BufferGeometry {
    const s = this._size;
    if (this.Shape === 'Ball') {
      return new THREE.SphereGeometry(s.X / 2, 24, 24);
    }
    if (this.Shape === 'Cylinder') {
      return new THREE.CylinderGeometry(s.X / 2, s.X / 2, s.Y, 24);
    }
    return new THREE.BoxGeometry(s.X, s.Y, s.Z);
  }

  createThreeMesh(): THREE.Mesh {
    const geo = this.createGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this._color.toHex()),
      roughness: this._material === 'SmoothPlastic' ? 0.2 : 0.5,
    });
    if (this._material === 'Neon') {
      mat.emissive.set(this._color.toHex());
      mat.emissiveIntensity = 0.6;
      mat.roughness = 0.1;
    }
    if (this._transparency > 0) {
      mat.transparent = true;
      mat.opacity = 1 - this._transparency;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = this.id;
    mesh.position.set(this._position.X, this._position.Y, this._position.Z);
    mesh.rotation.set(
      THREE.MathUtils.degToRad(this._orientation.X),
      THREE.MathUtils.degToRad(this._orientation.Y),
      THREE.MathUtils.degToRad(this._orientation.Z)
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.threeMesh = mesh;
    return mesh;
  }
}
