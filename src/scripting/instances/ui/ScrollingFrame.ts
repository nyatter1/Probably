import { RBXGuiObject } from './GuiObject.ts';
import { RBXUDim2 } from '../../datatypes/UDim2.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';

export class RBXScrollingFrame extends RBXGuiObject {
  private _canvasSize: RBXUDim2 = RBXUDim2.new(0, 0, 2, 0);
  private _canvasPosition = { X: 0, Y: 0 };
  ScrollBarThickness = 12;
  ScrollBarImageColor3: RBXColor3 = RBXColor3.fromRGB(200, 200, 200);

  constructor(name = 'ScrollingFrame') {
    super('ScrollingFrame', name);
    this.ClipsDescendants = true;
  }

  get CanvasSize(): RBXUDim2 {
    return this._canvasSize;
  }

  set CanvasSize(val: any) {
    if (val instanceof RBXUDim2) {
      this._canvasSize = val;
    } else if (val && typeof val === 'object') {
      const xs = val.X?.Scale ?? val.x?.scale ?? 0;
      const xo = val.X?.Offset ?? val.x?.offset ?? 0;
      const ys = val.Y?.Scale ?? val.y?.scale ?? 0;
      const yo = val.Y?.Offset ?? val.y?.offset ?? 0;
      this._canvasSize = RBXUDim2.new(xs, xo, ys, yo);
    }
    this.notifyPropertyChanged('CanvasSize', this._canvasSize);
  }

  get CanvasPosition(): { X: number; Y: number } {
    return this._canvasPosition;
  }

  set CanvasPosition(val: any) {
    if (val && typeof val === 'object') {
      this._canvasPosition = { X: Number(val.X ?? val.x ?? 0), Y: Number(val.Y ?? val.y ?? 0) };
      this.notifyPropertyChanged('CanvasPosition', this._canvasPosition);
    }
  }

  override IsA(className: string): boolean {
    if (className === 'ScrollingFrame' || className === 'GuiObject') return true;
    return super.IsA(className);
  }
}
