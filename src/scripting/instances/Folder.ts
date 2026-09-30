import { RBXInstance } from './Instance.ts';

export class RBXFolder extends RBXInstance {
  constructor(name = 'Folder') {
    super('Folder', name);
  }

  override IsA(className: string): boolean {
    if (className === 'Folder') return true;
    return super.IsA(className);
  }
}
