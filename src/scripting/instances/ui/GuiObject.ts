import { RBXInstance } from '../Instance.ts';
import { RBXUDim2 } from '../../datatypes/UDim2.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';
import { RBXVector2 } from '../../datatypes/Vector2.ts';
import { RBXScriptSignal } from '../../events/RBXScriptSignal.ts';

export class RBXGuiObject extends RBXInstance {
  private _position: RBXUDim2 = RBXUDim2.new(0, 0, 0, 0);
  private _size: RBXUDim2 = RBXUDim2.new(0, 100, 0, 100);
  private _anchorPoint: RBXVector2 = new RBXVector2(0, 0);
  private _backgroundColor3: RBXColor3 = RBXColor3.fromRGB(255, 255, 255);
  private _backgroundTransparency = 0;
  private _borderSizePixel = 1;
  private _borderColor3: RBXColor3 = RBXColor3.fromRGB(0, 0, 0);
  private _visible = true;
  private _rotation = 0;
  private _zIndex = 1;
  private _layoutOrder = 0;
  private _clipsDescendants = false;
  private _active = false;

  // Input & Hover Signals
  readonly MouseButton1Click = new RBXScriptSignal<void>();
  readonly MouseButton1Down = new RBXScriptSignal<[number, number]>();
  readonly MouseButton1Up = new RBXScriptSignal<[number, number]>();
  readonly MouseEnter = new RBXScriptSignal<[number, number]>();
  readonly MouseLeave = new RBXScriptSignal<[number, number]>();
  readonly InputBegan = new RBXScriptSignal<any>();
  readonly InputEnded = new RBXScriptSignal<any>();

  constructor(className = 'GuiObject', name?: string) {
    super(className, name || className);
  }

  get Position(): RBXUDim2 {
    return this._position;
  }

  set Position(val: any) {
    if (val instanceof RBXUDim2) {
      this._position = val;
    } else if (val && typeof val === 'object') {
      const xs = val.X?.Scale ?? val.x?.scale ?? 0;
      const xo = val.X?.Offset ?? val.x?.offset ?? 0;
      const ys = val.Y?.Scale ?? val.y?.scale ?? 0;
      const yo = val.Y?.Offset ?? val.y?.offset ?? 0;
      this._position = RBXUDim2.new(xs, xo, ys, yo);
    }
    this.notifyPropertyChanged('Position', this._position);
  }

  get Size(): RBXUDim2 {
    return this._size;
  }

  set Size(val: any) {
    if (val instanceof RBXUDim2) {
      this._size = val;
    } else if (val && typeof val === 'object') {
      const xs = val.X?.Scale ?? val.x?.scale ?? 0;
      const xo = val.X?.Offset ?? val.x?.offset ?? 0;
      const ys = val.Y?.Scale ?? val.y?.scale ?? 0;
      const yo = val.Y?.Offset ?? val.y?.offset ?? 0;
      this._size = RBXUDim2.new(xs, xo, ys, yo);
    }
    this.notifyPropertyChanged('Size', this._size);
  }

  get AnchorPoint(): RBXVector2 {
    return this._anchorPoint;
  }

  set AnchorPoint(val: any) {
    if (val instanceof RBXVector2) {
      this._anchorPoint = val;
    } else if (val && typeof val === 'object') {
      const x = Number(val.X ?? val.x ?? 0);
      const y = Number(val.Y ?? val.y ?? 0);
      this._anchorPoint = new RBXVector2(x, y);
    }
    this.notifyPropertyChanged('AnchorPoint', this._anchorPoint);
  }

  get BackgroundColor3(): RBXColor3 {
    return this._backgroundColor3;
  }

  set BackgroundColor3(val: any) {
    if (val instanceof RBXColor3) {
      this._backgroundColor3 = val;
    } else if (typeof val === 'string') {
      this._backgroundColor3 = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('BackgroundColor3', this._backgroundColor3);
  }

  get BackgroundTransparency(): number {
    return this._backgroundTransparency;
  }

  set BackgroundTransparency(val: number) {
    this._backgroundTransparency = Math.max(0, Math.min(1, Number(val) || 0));
    this.notifyPropertyChanged('BackgroundTransparency', this._backgroundTransparency);
  }

  get BorderSizePixel(): number {
    return this._borderSizePixel;
  }

  set BorderSizePixel(val: number) {
    this._borderSizePixel = Math.max(0, Number(val) || 0);
    this.notifyPropertyChanged('BorderSizePixel', this._borderSizePixel);
  }

  get BorderColor3(): RBXColor3 {
    return this._borderColor3;
  }

  set BorderColor3(val: any) {
    if (val instanceof RBXColor3) {
      this._borderColor3 = val;
    } else if (typeof val === 'string') {
      this._borderColor3 = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('BorderColor3', this._borderColor3);
  }

  get Visible(): boolean {
    return this._visible;
  }

  set Visible(val: boolean) {
    this._visible = Boolean(val);
    this.notifyPropertyChanged('Visible', this._visible);
  }

  get Rotation(): number {
    return this._rotation;
  }

  set Rotation(val: number) {
    this._rotation = Number(val) || 0;
    this.notifyPropertyChanged('Rotation', this._rotation);
  }

  get ZIndex(): number {
    return this._zIndex;
  }

  set ZIndex(val: number) {
    this._zIndex = Number(val) || 1;
    this.notifyPropertyChanged('ZIndex', this._zIndex);
  }

  get LayoutOrder(): number {
    return this._layoutOrder;
  }

  set LayoutOrder(val: number) {
    this._layoutOrder = Number(val) || 0;
    this.notifyPropertyChanged('LayoutOrder', this._layoutOrder);
  }

  get ClipsDescendants(): boolean {
    return this._clipsDescendants;
  }

  set ClipsDescendants(val: boolean) {
    this._clipsDescendants = Boolean(val);
    this.notifyPropertyChanged('ClipsDescendants', this._clipsDescendants);
  }

  get Active(): boolean {
    return this._active;
  }

  set Active(val: boolean) {
    this._active = Boolean(val);
    this.notifyPropertyChanged('Active', this._active);
  }

  override IsA(className: string): boolean {
    if (className === 'GuiObject' || className === 'GuiBase2d' || className === 'Instance') return true;
    return super.IsA(className);
  }

  protected override cloneInternal(): RBXInstance {
    const clone = new (this.constructor as any)() as RBXGuiObject;
    clone.Name = this.Name;
    clone.Position = this.Position;
    clone.Size = this.Size;
    clone.AnchorPoint = this.AnchorPoint;
    clone.BackgroundColor3 = this.BackgroundColor3;
    clone.BackgroundTransparency = this.BackgroundTransparency;
    clone.BorderSizePixel = this.BorderSizePixel;
    clone.BorderColor3 = this.BorderColor3;
    clone.Visible = this.Visible;
    clone.Rotation = this.Rotation;
    clone.ZIndex = this.ZIndex;
    clone.LayoutOrder = this.LayoutOrder;
    clone.ClipsDescendants = this.ClipsDescendants;
    clone.Active = this.Active;
    return clone;
  }

  override Destroy(): void {
    this.MouseButton1Click.DisconnectAll();
    this.MouseButton1Down.DisconnectAll();
    this.MouseButton1Up.DisconnectAll();
    this.MouseEnter.DisconnectAll();
    this.MouseLeave.DisconnectAll();
    this.InputBegan.DisconnectAll();
    this.InputEnded.DisconnectAll();
    super.Destroy();
  }
}
