import { RBXInstance } from './Instance.ts';
import { RBXVector3 } from '../datatypes/Vector3.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';

export class RBXAttachment extends RBXInstance {
  private _position: RBXVector3 = RBXVector3.zero;
  private _orientation: RBXVector3 = RBXVector3.zero;
  private _cframe: RBXCFrame = RBXCFrame.identity;
  private _axis: RBXVector3 = new RBXVector3(1, 0, 0);
  private _secondaryAxis: RBXVector3 = new RBXVector3(0, 1, 0);
  Visible = false;

  constructor(name = 'Attachment') {
    super('Attachment', name);
  }

  get Position(): RBXVector3 {
    return this._position;
  }

  set Position(val: any) {
    this._position = val instanceof RBXVector3 ? val : new RBXVector3(val?.X ?? val?.x ?? 0, val?.Y ?? val?.y ?? 0, val?.Z ?? val?.z ?? 0);
    this._cframe = new RBXCFrame(this._position);
    this.notifyPropertyChanged('Position', this._position);
    this.notifyPropertyChanged('CFrame', this._cframe);
  }

  get Orientation(): RBXVector3 {
    return this._orientation;
  }

  set Orientation(val: any) {
    this._orientation = val instanceof RBXVector3 ? val : new RBXVector3(val?.X ?? val?.x ?? 0, val?.Y ?? val?.y ?? 0, val?.Z ?? val?.z ?? 0);
    this.notifyPropertyChanged('Orientation', this._orientation);
  }

  get CFrame(): RBXCFrame {
    return this._cframe;
  }

  set CFrame(val: any) {
    this._cframe = val instanceof RBXCFrame ? val : RBXCFrame.identity;
    this._position = this._cframe.Position;
    this.notifyPropertyChanged('CFrame', this._cframe);
    this.notifyPropertyChanged('Position', this._position);
  }

  get Axis(): RBXVector3 {
    return this._axis;
  }

  set Axis(val: any) {
    this._axis = val instanceof RBXVector3 ? val : new RBXVector3(val?.X ?? val?.x ?? 0, val?.Y ?? val?.y ?? 0, val?.Z ?? val?.z ?? 0);
    this.notifyPropertyChanged('Axis', this._axis);
  }

  get SecondaryAxis(): RBXVector3 {
    return this._secondaryAxis;
  }

  set SecondaryAxis(val: any) {
    this._secondaryAxis = val instanceof RBXVector3 ? val : new RBXVector3(val?.X ?? val?.x ?? 0, val?.Y ?? val?.y ?? 0, val?.Z ?? val?.z ?? 0);
    this.notifyPropertyChanged('SecondaryAxis', this._secondaryAxis);
  }

  override IsA(className: string): boolean {
    if (className === 'Attachment') return true;
    return super.IsA(className);
  }
}
