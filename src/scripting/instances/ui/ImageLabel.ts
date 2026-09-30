import { RBXGuiObject } from './GuiObject.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';

export class RBXImageLabel extends RBXGuiObject {
  private _image = '';
  private _imageColor3: RBXColor3 = RBXColor3.fromRGB(255, 255, 255);
  private _imageTransparency = 0;
  private _scaleType = 'Stretch'; // Stretch | Fit | Crop | Tile

  constructor(className = 'ImageLabel', name?: string) {
    super(className, name || className);
    this.BackgroundColor3 = RBXColor3.fromRGB(40, 42, 48);
  }

  get Image(): string {
    return this._image;
  }

  set Image(val: string) {
    this._image = String(val || '');
    this.notifyPropertyChanged('Image', this._image);
  }

  get ImageColor3(): RBXColor3 {
    return this._imageColor3;
  }

  set ImageColor3(val: any) {
    if (val instanceof RBXColor3) {
      this._imageColor3 = val;
    } else if (typeof val === 'string') {
      this._imageColor3 = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('ImageColor3', this._imageColor3);
  }

  get ImageTransparency(): number {
    return this._imageTransparency;
  }

  set ImageTransparency(val: number) {
    this._imageTransparency = Math.max(0, Math.min(1, Number(val) || 0));
    this.notifyPropertyChanged('ImageTransparency', this._imageTransparency);
  }

  get ScaleType(): string {
    return this._scaleType;
  }

  set ScaleType(val: any) {
    const s = typeof val === 'object' && val?.Name ? val.Name : String(val);
    this._scaleType = s;
    this.notifyPropertyChanged('ScaleType', this._scaleType);
  }

  override IsA(className: string): boolean {
    if (className === 'ImageLabel' || className === 'GuiObject') return true;
    return super.IsA(className);
  }
}

export class RBXImageButton extends RBXImageLabel {
  AutoButtonColor = true;

  constructor(name = 'ImageButton') {
    super('ImageButton', name);
    this.Active = true;
  }

  override IsA(className: string): boolean {
    if (className === 'ImageButton' || className === 'GuiButton' || className === 'ImageLabel' || className === 'GuiObject') {
      return true;
    }
    return super.IsA(className);
  }
}
