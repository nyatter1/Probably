import { RBXInstance } from '../instances/Instance.ts';
import { RBXModel } from '../instances/Model.ts';
import { RBXFolder } from '../instances/Folder.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXPlayer extends RBXInstance {
  UserId = 12345678;
  private _character: RBXModel | null = null;
  Backpack: RBXFolder;
  PlayerGui: RBXFolder;

  readonly CharacterAdded = new RBXScriptSignal<RBXModel>();
  readonly CharacterRemoving = new RBXScriptSignal<RBXModel>();

  // Hook to respawn character in engine
  onLoadCharacterHook?: () => void;

  constructor(name = 'TestPlayer') {
    super('Player', name);
    this.Backpack = new RBXFolder('Backpack');
    this.Backpack.Parent = this;
    this.PlayerGui = new RBXFolder('PlayerGui');
    this.PlayerGui.Parent = this;
  }

  get Character(): RBXModel | null {
    return this._character;
  }

  set Character(char: RBXModel | null) {
    if (this._character === char) return;
    const old = this._character;
    if (old) {
      this.CharacterRemoving.Fire(old);
    }
    this._character = char;
    if (char) {
      this.CharacterAdded.Fire(char);
    }
    this.notifyPropertyChanged('Character', char);
  }

  LoadCharacter(): void {
    if (this.onLoadCharacterHook) {
      this.onLoadCharacterHook();
    }
  }

  loadCharacter(): void {
    this.LoadCharacter();
  }

  override IsA(className: string): boolean {
    if (className === 'Player') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.CharacterAdded.DisconnectAll();
    this.CharacterRemoving.DisconnectAll();
    super.Destroy();
  }
}
