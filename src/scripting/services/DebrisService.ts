import { RBXInstance } from '../instances/Instance.ts';

export class RBXDebrisService extends RBXInstance {
  private activeTimers = new Set<any>();

  constructor() {
    super('Debris', 'Debris');
  }

  AddItem(item: any, lifetime = 10): void {
    if (!item) return;
    const time = Math.max(0, Number(lifetime) || 0);
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      try {
        if (typeof item.Destroy === 'function') {
          item.Destroy();
        } else if (typeof item.destroy === 'function') {
          item.destroy();
        }
      } catch (err) {
        console.error('[Debris] Error destroying item:', err);
      }
    }, time * 1000);

    this.activeTimers.add(timerId);
  }

  addItem(item: any, lifetime = 10): void {
    this.AddItem(item, lifetime);
  }

  clearAll(): void {
    for (const t of this.activeTimers) {
      clearTimeout(t);
    }
    this.activeTimers.clear();
  }

  override IsA(className: string): boolean {
    if (className === 'Debris') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.clearAll();
    super.Destroy();
  }
}
