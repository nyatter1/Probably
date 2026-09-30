import { RBXGuiObject } from './GuiObject.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';
import { RBXInstance } from '../Instance.ts';

export class RBXTextLabel extends RBXGuiObject {
  private _text = 'Label';
  private _textColor3: RBXColor3 = RBXColor3.fromRGB(255, 255, 255);
  private _textSize = 18;
  private _font: any = 'SourceSans';
  private _textScaled = false;
  private _textWrapped = true;
  private _textXAlignment = 'Center'; // Left | Center | Right
  private _textYAlignment = 'Center'; // Top | Center | Bottom
  private _textTransparency = 0;

  constructor(className = 'TextLabel', name?: string) {
    super(className, name || className);
    this.BackgroundColor3 = RBXColor3.fromRGB(35, 38, 44);
  }

  get Text(): string {
    return this._text;
  }

  set Text(val: any) {
    this._text = String(val ?? '');
    this.notifyPropertyChanged('Text', this._text);
  }

  get TextColor3(): RBXColor3 {
    return this._textColor3;
  }

  set TextColor3(val: any) {
    if (val instanceof RBXColor3) {
      this._textColor3 = val;
    } else if (typeof val === 'string') {
      this._textColor3 = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('TextColor3', this._textColor3);
  }

  get TextSize(): number {
    return this._textSize;
  }

  set TextSize(val: number) {
    this._textSize = Math.max(1, Number(val) || 14);
    this.notifyPropertyChanged('TextSize', this._textSize);
  }

  get Font(): any {
    return this._font;
  }

  set Font(val: any) {
    if (val && typeof val === 'object' && val.Name) {
      this._font = val.Name;
    } else {
      this._font = String(val || 'SourceSans');
    }
    this.notifyPropertyChanged('Font', this._font);
  }

  get TextScaled(): boolean {
    return this._textScaled;
  }

  set TextScaled(val: boolean) {
    this._textScaled = Boolean(val);
    this.notifyPropertyChanged('TextScaled', this._textScaled);
  }

  get TextWrapped(): boolean {
    return this._textWrapped;
  }

  set TextWrapped(val: boolean) {
    this._textWrapped = Boolean(val);
    this.notifyPropertyChanged('TextWrapped', this._textWrapped);
  }

  get TextXAlignment(): string {
    return this._textXAlignment;
  }

  set TextXAlignment(val: any) {
    const s = typeof val === 'object' && val?.Name ? val.Name : String(val);
    this._textXAlignment = s;
    this.notifyPropertyChanged('TextXAlignment', this._textXAlignment);
  }

  get TextYAlignment(): string {
    return this._textYAlignment;
  }

  set TextYAlignment(val: any) {
    const s = typeof val === 'object' && val?.Name ? val.Name : String(val);
    this._textYAlignment = s;
    this.notifyPropertyChanged('TextYAlignment', this._textYAlignment);
  }

  get TextTransparency(): number {
    return this._textTransparency;
  }

  set TextTransparency(val: number) {
    this._textTransparency = Math.max(0, Math.min(1, Number(val) || 0));
    this.notifyPropertyChanged('TextTransparency', this._textTransparency);
  }

  override IsA(className: string): boolean {
    if (className === 'TextLabel' || className === 'GuiObject') return true;
    return super.IsA(className);
  }

  protected override cloneInternal(): RBXInstance {
    const clone = super.cloneInternal() as RBXTextLabel;
    clone.Text = this.Text;
    clone.TextColor3 = this.TextColor3;
    clone.TextSize = this.TextSize;
    clone.Font = this.Font;
    clone.TextScaled = this.TextScaled;
    clone.TextWrapped = this.TextWrapped;
    clone.TextXAlignment = this.TextXAlignment;
    clone.TextYAlignment = this.TextYAlignment;
    clone.TextTransparency = this.TextTransparency;
    return clone;
  }
}
