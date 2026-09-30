import { RBXInstance } from '../instances/Instance.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXCollectionService extends RBXInstance {
  private tags = new Map<string, Set<RBXInstance>>();
  private addedSignals = new Map<string, RBXScriptSignal<RBXInstance>>();
  private removedSignals = new Map<string, RBXScriptSignal<RBXInstance>>();

  constructor() {
    super('CollectionService', 'CollectionService');
  }

  AddTag(instance: RBXInstance, tag: string): void {
    if (!instance || !tag) return;
    let set = this.tags.get(tag);
    if (!set) {
      set = new Set();
      this.tags.set(tag, set);
    }
    if (!set.has(instance)) {
      set.add(instance);
      const sig = this.addedSignals.get(tag);
      if (sig) sig.Fire(instance);
    }
  }

  addTag(instance: RBXInstance, tag: string): void {
    this.AddTag(instance, tag);
  }

  RemoveTag(instance: RBXInstance, tag: string): void {
    if (!instance || !tag) return;
    const set = this.tags.get(tag);
    if (set && set.has(instance)) {
      set.delete(instance);
      const sig = this.removedSignals.get(tag);
      if (sig) sig.Fire(instance);
    }
  }

  removeTag(instance: RBXInstance, tag: string): void {
    this.RemoveTag(instance, tag);
  }

  HasTag(instance: RBXInstance, tag: string): boolean {
    const set = this.tags.get(tag);
    return set ? set.has(instance) : false;
  }

  hasTag(instance: RBXInstance, tag: string): boolean {
    return this.HasTag(instance, tag);
  }

  GetTagged(tag: string): RBXInstance[] {
    const set = this.tags.get(tag);
    return set ? Array.from(set) : [];
  }

  getTagged(tag: string): RBXInstance[] {
    return this.GetTagged(tag);
  }

  GetInstanceAddedSignal(tag: string): RBXScriptSignal<RBXInstance> {
    let sig = this.addedSignals.get(tag);
    if (!sig) {
      sig = new RBXScriptSignal();
      this.addedSignals.set(tag, sig);
    }
    return sig;
  }

  GetInstanceRemovedSignal(tag: string): RBXScriptSignal<RBXInstance> {
    let sig = this.removedSignals.get(tag);
    if (!sig) {
      sig = new RBXScriptSignal();
      this.removedSignals.set(tag, sig);
    }
    return sig;
  }

  override IsA(className: string): boolean {
    if (className === 'CollectionService') return true;
    return super.IsA(className);
  }
}
