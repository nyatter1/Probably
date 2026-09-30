import { RBXTextLabel } from './TextLabel.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';
import { RBXScriptSignal } from '../../events/RBXScriptSignal.ts';

export class RBXTextBox extends RBXTextLabel {
  private _placeholderText = 'Type here...';
  private _placeholderColor3: RBXColor3 = RBXColor3.fromRGB(178, 178, 178);
  ClearTextOnFocus = true;
  MultiLine = false;

  readonly FocusLost = new RBXScriptSignal<[boolean]>(); // enterPressed
  readonly Focused = new RBXScriptSignal<void>();

  constructor(name = 'TextBox') {
    super('TextBox', name);
    this.Text = '';
    this.BackgroundColor3 = RBXColor3.fromRGB(30, 32, 38);
    this.Active = true;
  }

  get PlaceholderText(): string {
    return this._placeholderText;
  }

  set PlaceholderText(val: string) {
    this._placeholderText = String(val ?? '');
    this.notifyPropertyChanged('PlaceholderText', this._placeholderText);
  }

  get PlaceholderColor3(): RBXColor3 {
    return this._placeholderColor3;
  }

  set PlaceholderColor3(val: any) {
    if (val instanceof RBXColor3) {
      this._placeholderColor3 = val;
    } else if (typeof val === 'string') {
      this._placeholderColor3 = RBXColor3.fromHex(val);
    }
    this.notifyPropertyChanged('PlaceholderColor3', this._placeholderColor3);
  }

  override IsA(className: string): boolean {
    if (className === 'TextBox' || className === 'TextLabel' || className === 'GuiObject') {
      return true;
    }
    return super.IsA(className);
  }

  override Destroy(): void {
    this.FocusLost.DisconnectAll();
    this.Focused.DisconnectAll();
    super.Destroy();
  }
}
