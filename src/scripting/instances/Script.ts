import { RBXInstance } from './Instance.ts';

export class RBXScript extends RBXInstance {
  Source = 'print("Hello world!")\n';
  Disabled = false;
  RunContext = 'Legacy';

  constructor(className = 'Script', name = 'Script', source = 'print("Hello world!")\n') {
    super(className, name);
    this.Source = typeof source === 'string' && source.length > 0 ? source : 'print("Hello world!")\n';
  }

  get Enabled(): boolean {
    return !this.Disabled;
  }
  set Enabled(val: boolean) {
    this.Disabled = !val;
  }

  override IsA(className: string): boolean {
    if (className === 'Script' || className === 'BaseScript' || className === 'LuaSourceContainer') return true;
    return super.IsA(className);
  }

  protected override cloneInternal(): RBXInstance {
    const sc = new RBXScript(this.ClassName, this.Name, this.Source);
    sc.Disabled = this.Disabled;
    sc.RunContext = this.RunContext;
    return sc;
  }
}

export class RBXLocalScript extends RBXScript {
  constructor(name = 'LocalScript', source = 'local Players = game:GetService("Players")\nlocal player = Players.LocalPlayer\n\nprint("Hello from LocalScript!")\n') {
    super('LocalScript', name, source);
  }

  protected override cloneInternal(): RBXInstance {
    const sc = new RBXLocalScript(this.Name, this.Source);
    sc.Disabled = this.Disabled;
    sc.RunContext = this.RunContext;
    return sc;
  }

  override IsA(className: string): boolean {
    if (className === 'LocalScript') return true;
    return super.IsA(className);
  }
}

