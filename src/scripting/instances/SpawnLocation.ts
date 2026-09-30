import { RBXBasePart } from './BasePart.ts';

export class RBXSpawnLocation extends RBXBasePart {
  Enabled = true;
  Neutral = true;
  Duration = 10;

  constructor(name = 'SpawnLocation') {
    super('SpawnLocation', name);
    this._size.sub(this._size); // reset
    this.Size = [8, 0.4, 8];
  }

  override IsA(className: string): boolean {
    if (className === 'SpawnLocation') return true;
    return super.IsA(className);
  }
}
