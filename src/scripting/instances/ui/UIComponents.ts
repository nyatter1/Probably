import { RBXInstance } from '../Instance.ts';
import { RBXUDim } from '../../datatypes/UDim.ts';
import { RBXUDim2 } from '../../datatypes/UDim2.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';

export class RBXUICorner extends RBXInstance {
  private _cornerRadius: RBXUDim = new RBXUDim(0, 8);

  constructor(name = 'UICorner') {
    super('UICorner', name);
  }

  get CornerRadius(): RBXUDim {
    return this._cornerRadius;
  }

  set CornerRadius(val: any) {
    if (val instanceof RBXUDim) {
      this._cornerRadius = val;
    } else if (typeof val === 'number') {
      this._cornerRadius = new RBXUDim(0, val);
    } else if (val && typeof val === 'object') {
      this._cornerRadius = new RBXUDim(Number(val.Scale ?? val.scale ?? 0), Number(val.Offset ?? val.offset ?? 0));
    }
    this.notifyPropertyChanged('CornerRadius', this._cornerRadius);
  }

  override IsA(className: string): boolean {
    if (className === 'UICorner' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIStroke extends RBXInstance {
  private _color: RBXColor3 = RBXColor3.fromRGB(255, 255, 255);
  private _thickness = 1;
  private _transparency = 0;
  private _applyStrokeMode = 'Contextual'; // Contextual | Border
  private _lineJoinMode = 'Round'; // Round | Bevel | Miter

  constructor(name = 'UIStroke') {
    super('UIStroke', name);
  }

  get Color(): RBXColor3 {
    return this._color;
  }

  set Color(val: any) {
    if (val instanceof RBXColor3) {
      this._color = val;
    } else if (typeof val === 'string') {
      this._color = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('Color', this._color);
  }

  get Thickness(): number {
    return this._thickness;
  }

  set Thickness(val: number) {
    this._thickness = Math.max(0, Number(val) || 0);
    this.notifyPropertyChanged('Thickness', this._thickness);
  }

  get Transparency(): number {
    return this._transparency;
  }

  set Transparency(val: number) {
    this._transparency = Math.max(0, Math.min(1, Number(val) || 0));
    this.notifyPropertyChanged('Transparency', this._transparency);
  }

  get ApplyStrokeMode(): string {
    return this._applyStrokeMode;
  }

  set ApplyStrokeMode(val: any) {
    this._applyStrokeMode = typeof val === 'object' && val?.Name ? val.Name : String(val);
    this.notifyPropertyChanged('ApplyStrokeMode', this._applyStrokeMode);
  }

  get LineJoinMode(): string {
    return this._lineJoinMode;
  }

  set LineJoinMode(val: any) {
    this._lineJoinMode = typeof val === 'object' && val?.Name ? val.Name : String(val);
    this.notifyPropertyChanged('LineJoinMode', this._lineJoinMode);
  }

  override IsA(className: string): boolean {
    if (className === 'UIStroke' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIPadding extends RBXInstance {
  PaddingTop: RBXUDim = new RBXUDim(0, 0);
  PaddingBottom: RBXUDim = new RBXUDim(0, 0);
  PaddingLeft: RBXUDim = new RBXUDim(0, 0);
  PaddingRight: RBXUDim = new RBXUDim(0, 0);

  constructor(name = 'UIPadding') {
    super('UIPadding', name);
  }

  override IsA(className: string): boolean {
    if (className === 'UIPadding' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIListLayout extends RBXInstance {
  FillDirection = 'Vertical'; // Horizontal | Vertical
  HorizontalAlignment = 'Left'; // Left | Center | Right
  VerticalAlignment = 'Top'; // Top | Center | Bottom
  Padding: RBXUDim = new RBXUDim(0, 0);
  SortOrder = 'LayoutOrder'; // Name | LayoutOrder

  constructor(name = 'UIListLayout') {
    super('UIListLayout', name);
  }

  override IsA(className: string): boolean {
    if (className === 'UIListLayout' || className === 'UILayout' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIGridLayout extends RBXInstance {
  CellSize: RBXUDim2 = RBXUDim2.new(0, 100, 0, 100);
  CellPadding: RBXUDim2 = RBXUDim2.new(0, 5, 0, 5);
  FillDirectionMaxCells = 0;
  StartCorner = 'TopLeft';

  constructor(name = 'UIGridLayout') {
    super('UIGridLayout', name);
  }

  override IsA(className: string): boolean {
    if (className === 'UIGridLayout' || className === 'UILayout' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIScale extends RBXInstance {
  private _scale = 1.0;

  constructor(name = 'UIScale') {
    super('UIScale', name);
  }

  get Scale(): number {
    return this._scale;
  }

  set Scale(val: number) {
    this._scale = Math.max(0.001, Number(val) || 1.0);
    this.notifyPropertyChanged('Scale', this._scale);
  }

  override IsA(className: string): boolean {
    if (className === 'UIScale' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}

export class RBXUIAspectRatioConstraint extends RBXInstance {
  AspectRatio = 1.0;
  AspectType = 'FitWithinMaxSize';
  DominantAxis = 'Width';

  constructor(name = 'UIAspectRatioConstraint') {
    super('UIAspectRatioConstraint', name);
  }

  override IsA(className: string): boolean {
    if (className === 'UIAspectRatioConstraint' || className === 'UIConstraint' || className === 'UIComponent') return true;
    return super.IsA(className);
  }
}
