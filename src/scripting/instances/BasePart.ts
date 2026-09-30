import * as THREE from 'three';
import { RBXInstance } from './Instance.ts';
import { RBXVector3 } from '../datatypes/Vector3.ts';
import { RBXColor3 } from '../datatypes/Color3.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXBasePart extends RBXInstance {
  protected _position = new RBXVector3(0, 2, 0);
  protected _size = new RBXVector3(4, 2, 4);
  protected _orientation = new RBXVector3(0, 0, 0);
  protected _color = RBXColor3.fromRGB(160, 165, 169);
  protected _material = 'Plastic';
  protected _transparency = 0;
  protected _reflectance = 0;
  protected _anchored = true;
  protected _canCollide = true;
  protected _canTouch = true;
  protected _canQuery = true;
  protected _massless = false;
  protected _velocity = new RBXVector3(0, 0, 0);

  // Three.js object reference
  threeMesh?: THREE.Mesh;

  // Signals
  readonly Touched = new RBXScriptSignal<RBXBasePart>();
  readonly TouchEnded = new RBXScriptSignal<RBXBasePart>();

  constructor(className = 'BasePart', name = 'Part') {
    super(className, name);
  }

  override IsA(className: string): boolean {
    if (className === 'BasePart' || className === 'PVInstance') return true;
    return super.IsA(className);
  }

  // --- POSITION ---
  get Position(): RBXVector3 {
    return this._position;
  }
  set Position(val: any) {
    if (val instanceof RBXVector3) {
      this._position = val;
    } else if (Array.isArray(val)) {
      this._position = new RBXVector3(val[0], val[1], val[2]);
    } else if (val && typeof val === 'object') {
      this._position = new RBXVector3(val.X ?? val.x ?? 0, val.Y ?? val.y ?? 0, val.Z ?? val.z ?? 0);
    }
    this.syncThreeTransform();
    this.notifyPropertyChanged('Position', this._position);
  }

  // --- SIZE ---
  get Size(): RBXVector3 {
    return this._size;
  }
  set Size(val: any) {
    if (val instanceof RBXVector3) {
      this._size = val;
    } else if (Array.isArray(val)) {
      this._size = new RBXVector3(val[0], val[1], val[2]);
    } else if (val && typeof val === 'object') {
      this._size = new RBXVector3(val.X ?? val.x ?? 1, val.Y ?? val.y ?? 1, val.Z ?? val.z ?? 1);
    }
    this.syncThreeGeometry();
    this.notifyPropertyChanged('Size', this._size);
  }

  // --- ORIENTATION (DEGREES) ---
  get Orientation(): RBXVector3 {
    return this._orientation;
  }
  set Orientation(val: any) {
    if (val instanceof RBXVector3) {
      this._orientation = val;
    } else if (Array.isArray(val)) {
      this._orientation = new RBXVector3(val[0], val[1], val[2]);
    } else if (val && typeof val === 'object') {
      this._orientation = new RBXVector3(val.X ?? val.x ?? 0, val.Y ?? val.y ?? 0, val.Z ?? val.z ?? 0);
    }
    this.syncThreeTransform();
    this.notifyPropertyChanged('Orientation', this._orientation);
  }

  // --- CFRAME ---
  get CFrame(): RBXCFrame {
    return RBXCFrame.new(this._position.X, this._position.Y, this._position.Z).mul(
      RBXCFrame.Angles(
        THREE.MathUtils.degToRad(this._orientation.X),
        THREE.MathUtils.degToRad(this._orientation.Y),
        THREE.MathUtils.degToRad(this._orientation.Z)
      )
    );
  }
  set CFrame(cf: any) {
    if (cf instanceof RBXCFrame) {
      this._position = cf.Position;
      this._orientation = cf.toOrientationDegrees();
      this.syncThreeTransform();
      this.notifyPropertyChanged('CFrame', cf);
    } else if (cf instanceof RBXVector3) {
      this.Position = cf;
    }
  }

  // --- COLOR ---
  get Color(): RBXColor3 {
    return this._color;
  }
  set Color(c: any) {
    if (c instanceof RBXColor3) {
      this._color = c;
    } else if (typeof c === 'string') {
      this._color = RBXColor3.fromHex(c);
    }
    this.syncThreeVisuals();
    this.notifyPropertyChanged('Color', this._color);
  }

  // --- BRICKCOLOR ---
  get BrickColor(): { Name: string; Color: RBXColor3 } {
    return { Name: this._color.toHex(), Color: this._color };
  }
  set BrickColor(bc: any) {
    if (bc?.Color instanceof RBXColor3) {
      this.Color = bc.Color;
    } else if (bc?.color instanceof RBXColor3) {
      this.Color = bc.color;
    } else if (typeof bc === 'string') {
      this.Color = bc;
    }
  }

  // --- MATERIAL ---
  get Material(): string {
    return this._material;
  }
  set Material(mat: any) {
    if (typeof mat === 'string') {
      this._material = mat;
    } else if (mat?.Name) {
      this._material = mat.Name;
    }
    this.syncThreeVisuals();
    this.notifyPropertyChanged('Material', this._material);
  }

  // --- TRANSPARENCY ---
  get Transparency(): number {
    return this._transparency;
  }
  set Transparency(val: number) {
    this._transparency = Math.max(0, Math.min(1, Number(val) || 0));
    this.syncThreeVisuals();
    this.notifyPropertyChanged('Transparency', this._transparency);
  }

  // --- REFLECTANCE ---
  get Reflectance(): number {
    return this._reflectance;
  }
  set Reflectance(val: number) {
    this._reflectance = Math.max(0, Math.min(1, Number(val) || 0));
    this.notifyPropertyChanged('Reflectance', this._reflectance);
  }

  // --- ANCHORED ---
  get Anchored(): boolean {
    return this._anchored;
  }
  set Anchored(val: boolean) {
    this._anchored = Boolean(val);
    this.notifyPropertyChanged('Anchored', this._anchored);
  }

  // --- CAN COLLIDE ---
  get CanCollide(): boolean {
    return this._canCollide;
  }
  set CanCollide(val: boolean) {
    this._canCollide = Boolean(val);
    this.notifyPropertyChanged('CanCollide', this._canCollide);
  }

  // --- CAN TOUCH ---
  get CanTouch(): boolean {
    return this._canTouch;
  }
  set CanTouch(val: boolean) {
    this._canTouch = Boolean(val);
    this.notifyPropertyChanged('CanTouch', this._canTouch);
  }

  // --- CAN QUERY ---
  get CanQuery(): boolean {
    return this._canQuery;
  }
  set CanQuery(val: boolean) {
    this._canQuery = Boolean(val);
    this.notifyPropertyChanged('CanQuery', this._canQuery);
  }

  // --- MASSLESS ---
  get Massless(): boolean {
    return this._massless;
  }
  set Massless(val: boolean) {
    this._massless = Boolean(val);
    this.notifyPropertyChanged('Massless', this._massless);
  }

  // --- VELOCITY ---
  get Velocity(): RBXVector3 {
    return this._velocity;
  }
  set Velocity(val: any) {
    if (val instanceof RBXVector3) {
      this._velocity = val;
    } else if (Array.isArray(val)) {
      this._velocity = new RBXVector3(val[0], val[1], val[2]);
    }
    this.notifyPropertyChanged('Velocity', this._velocity);
  }

  get AssemblyLinearVelocity(): RBXVector3 {
    return this._velocity;
  }
  set AssemblyLinearVelocity(val: any) {
    this.Velocity = val;
  }

  // Synchronize to Three.js mesh
  syncThreeTransform(): void {
    if (!this.threeMesh) return;
    this.threeMesh.position.set(this._position.X, this._position.Y, this._position.Z);
    this.threeMesh.rotation.set(
      THREE.MathUtils.degToRad(this._orientation.X),
      THREE.MathUtils.degToRad(this._orientation.Y),
      THREE.MathUtils.degToRad(this._orientation.Z)
    );
  }

  syncThreeVisuals(): void {
    if (!this.threeMesh) return;
    const mat = this.threeMesh.material as THREE.MeshStandardMaterial;
    if (!mat) return;

    mat.color.set(this._color.toHex());
    if (this._material === 'Neon') {
      mat.emissive.set(this._color.toHex());
      mat.emissiveIntensity = 0.6;
      mat.roughness = 0.1;
    } else {
      mat.emissive.setHex(0x000000);
      mat.roughness = this._material === 'SmoothPlastic' ? 0.2 : 0.5;
    }

    mat.transparent = this._transparency > 0;
    mat.opacity = 1 - this._transparency;
    mat.needsUpdate = true;
  }

  syncThreeGeometry(): void {
    if (!this.threeMesh) return;
    // Handled in Part / Shape subclasses or engine bridge
  }

  override Destroy(): void {
    this.Touched.DisconnectAll();
    this.TouchEnded.DisconnectAll();
    if (this.threeMesh && this.threeMesh.parent) {
      this.threeMesh.parent.remove(this.threeMesh);
      this.threeMesh.geometry.dispose();
      if (Array.isArray(this.threeMesh.material)) {
        this.threeMesh.material.forEach((m) => m.dispose());
      } else {
        this.threeMesh.material.dispose();
      }
      this.threeMesh = undefined;
    }
    super.Destroy();
  }

  protected override cloneInternal(): RBXBasePart {
    const clone = new (this.constructor as any)();
    clone.Name = this.Name;
    clone.Position = this._position;
    clone.Size = this._size;
    clone.Orientation = this._orientation;
    clone.Color = this._color;
    clone.Material = this._material;
    clone.Transparency = this._transparency;
    clone.Anchored = this._anchored;
    clone.CanCollide = this._canCollide;
    clone.CanTouch = this._canTouch;
    return clone;
  }
}
