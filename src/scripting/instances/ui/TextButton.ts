import { RBXTextLabel } from './TextLabel.ts';
import { RBXColor3 } from '../../datatypes/Color3.ts';
import { RBXInstance } from '../Instance.ts';

export class RBXTextButton extends RBXTextLabel {
  AutoButtonColor = true;

  constructor(name = 'TextButton') {
    super('TextButton', name);
    this.Text = 'Button';
    this.BackgroundColor3 = RBXColor3.fromRGB(0, 162, 255);
    this.Active = true;
  }

  override IsA(className: string): boolean {
    if (className === 'TextButton' || className === 'GuiButton' || className === 'TextLabel' || className === 'GuiObject') {
      return true;
    }
    return super.IsA(className);
  }

  protected override cloneInternal(): RBXInstance {
    const clone = super.cloneInternal() as RBXTextButton;
    clone.AutoButtonColor = this.AutoButtonColor;
    return clone;
  }
}
