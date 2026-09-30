import { RBXInstance } from '../instances/Instance.ts';

export class RBXReplicatedStorageService extends RBXInstance {
  constructor() {
    super('ReplicatedStorage', 'ReplicatedStorage');
  }

  override IsA(className: string): boolean {
    if (className === 'ReplicatedStorage') return true;
    return super.IsA(className);
  }
}

export class RBXServerStorageService extends RBXInstance {
  constructor() {
    super('ServerStorage', 'ServerStorage');
  }

  override IsA(className: string): boolean {
    if (className === 'ServerStorage') return true;
    return super.IsA(className);
  }
}
