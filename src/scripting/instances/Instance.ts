import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

let nextInstanceId = 1;

export class RBXInstance {
  readonly id: string;
  Name: string;
  readonly ClassName: string;
  private _parent: RBXInstance | null = null;
  private _children: RBXInstance[] = [];
  Archivable = true;

  // Signals
  readonly ChildAdded = new RBXScriptSignal<RBXInstance>();
  readonly ChildRemoved = new RBXScriptSignal<RBXInstance>();
  readonly DescendantAdded = new RBXScriptSignal<RBXInstance>();
  readonly DescendantRemoving = new RBXScriptSignal<RBXInstance>();
  readonly AncestryChanged = new RBXScriptSignal<[RBXInstance, RBXInstance | null]>();
  readonly Destroying = new RBXScriptSignal<void>();
  private propertyChangedSignals = new Map<string, RBXScriptSignal<any>>();

  // Internal hooks
  onPropertyChangeHook?: (propName: string, val: any) => void;
  onDestroyHook?: () => void;
  onParentChangeHook?: (newParent: RBXInstance | null, oldParent: RBXInstance | null) => void;

  constructor(className = 'Instance', name?: string) {
    this.id = `inst_${nextInstanceId++}_${Math.random().toString(36).substring(2, 7)}`;
    this.ClassName = className;
    this.Name = name || className;
  }

  GetFullName(): string {
    const parts: string[] = [this.Name];
    let cur = this._parent;
    while (cur) {
      parts.unshift(cur.Name);
      cur = cur.Parent;
    }
    return parts.join('.');
  }

  getFullName(): string {
    return this.GetFullName();
  }

  get Parent(): RBXInstance | null {
    return this._parent;
  }

  set Parent(newParent: RBXInstance | null) {
    if (this._parent === newParent) return;

    if (newParent === this) {
      throw new Error(`Attempt to set ${this.Name} as its own parent`);
    }

    if (newParent) {
      let cur: RBXInstance | null = newParent;
      while (cur) {
        if (cur === this) {
          throw new Error(`Attempt to set ${this.Name} as parent of an ancestor (cyclic hierarchy)`);
        }
        cur = cur.Parent;
      }
    }

    const oldParent = this._parent;
    if (oldParent) {
      const idx = oldParent._children.indexOf(this);
      if (idx !== -1) {
        oldParent._children.splice(idx, 1);
        oldParent.ChildRemoved.Fire(this);

        // Fire DescendantRemoving up old parent chain
        const allDescendants = [this, ...this.GetDescendants()];
        let p: RBXInstance | null = oldParent;
        while (p) {
          for (const d of allDescendants) {
            p.DescendantRemoving.Fire(d);
          }
          p = p.Parent;
        }
      }
    }

    this._parent = newParent;

    if (newParent) {
      if (!newParent._children.includes(this)) {
        newParent._children.push(this);
        newParent.ChildAdded.Fire(this);

        // Fire DescendantAdded up new parent chain
        const allDescendants = [this, ...this.GetDescendants()];
        let p: RBXInstance | null = newParent;
        while (p) {
          for (const d of allDescendants) {
            p.DescendantAdded.Fire(d);
          }
          p = p.Parent;
        }
      }
    }

    this.AncestryChanged.Fire([this, newParent]);

    if (this.onParentChangeHook) {
      this.onParentChangeHook(newParent, oldParent);
    }
  }

  GetChildren(): RBXInstance[] {
    return [...this._children];
  }

  getChildren(): RBXInstance[] {
    return this.GetChildren();
  }

  GetDescendants(): RBXInstance[] {
    const list: RBXInstance[] = [];
    const traverse = (inst: RBXInstance) => {
      for (const child of inst._children) {
        list.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return list;
  }

  getDescendants(): RBXInstance[] {
    return this.GetDescendants();
  }

  FindFirstChild(name: string, recursive = false): RBXInstance | null {
    if (!name || typeof name !== 'string') return null;
    // 1. Exact match among direct children
    for (const child of this._children) {
      if (child.Name === name) return child;
    }
    // 2. Case-insensitive match among direct children
    const lower = name.toLowerCase();
    for (const child of this._children) {
      if (child.Name && typeof child.Name === 'string' && child.Name.toLowerCase() === lower) return child;
    }
    // 3. Recursive if requested
    if (recursive) {
      for (const child of this._children) {
        const found = child.FindFirstChild(name, true);
        if (found) return found;
      }
    }
    return null;
  }

  findFirstChild(name: string, recursive = false): RBXInstance | null {
    return this.FindFirstChild(name, recursive);
  }

  FindFirstChildOfClass(className: string): RBXInstance | null {
    if (!className || typeof className !== 'string') return null;
    for (const child of this._children) {
      if (child.ClassName === className) return child;
    }
    return null;
  }

  findFirstChildOfClass(className: string): RBXInstance | null {
    return this.FindFirstChildOfClass(className);
  }

  FindFirstChildWhichIsA(className: string): RBXInstance | null {
    if (!className || typeof className !== 'string') return null;
    for (const child of this._children) {
      if (child.IsA(className)) return child;
    }
    return null;
  }

  findFirstChildWhichIsA(className: string): RBXInstance | null {
    return this.FindFirstChildWhichIsA(className);
  }

  WaitForChild(name: string, timeout = 5): Promise<RBXInstance | null> {
    if (!name || typeof name !== 'string') return Promise.resolve(null);
    const existing = this.FindFirstChild(name);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve) => {
      let resolved = false;
      let timer: any = null;

      const conn = this.ChildAdded.Connect((child) => {
        if (!child) return;
        if (
          child.Name === name ||
          (child.Name &&
            typeof child.Name === 'string' &&
            child.Name.toLowerCase() === name.toLowerCase())
        ) {
          resolved = true;
          conn.Disconnect();
          if (timer) clearTimeout(timer);
          resolve(child);
        }
      });

      if (timeout > 0) {
        timer = setTimeout(() => {
          if (!resolved) {
            conn.Disconnect();
            resolve(null);
          }
        }, timeout * 1000);
      }
    });
  }

  waitForChild(name: string, timeout = 5): Promise<RBXInstance | null> {
    return this.WaitForChild(name, timeout);
  }

  IsA(className: string): boolean {
    if (this.ClassName === className) return true;
    if (className === 'Instance') return true;
    return false;
  }

  isA(className: string): boolean {
    return this.IsA(className);
  }

  GetPropertyChangedSignal(property: string): RBXScriptSignal<any> {
    let sig = this.propertyChangedSignals.get(property);
    if (!sig) {
      sig = new RBXScriptSignal();
      this.propertyChangedSignals.set(property, sig);
    }
    return sig;
  }

  getPropertyChangedSignal(property: string): RBXScriptSignal<any> {
    return this.GetPropertyChangedSignal(property);
  }

  notifyPropertyChanged(propName: string, value: any): void {
    const sig = this.propertyChangedSignals.get(propName);
    if (sig) {
      sig.Fire(value);
    }
    if (this.onPropertyChangeHook) {
      this.onPropertyChangeHook(propName, value);
    }
  }

  ClearAllChildren(): void {
    const kids = [...this._children];
    for (const kid of kids) {
      kid.Destroy();
    }
  }

  clearAllChildren(): void {
    this.ClearAllChildren();
  }

  Clone(): RBXInstance {
    const clone = this.cloneInternal();
    // Recursively clone children
    for (const child of this._children) {
      if (child.Archivable) {
        const childClone = child.Clone();
        childClone.Parent = clone;
      }
    }
    return clone;
  }

  clone(): RBXInstance {
    return this.Clone();
  }

  protected cloneInternal(): RBXInstance {
    const inst = new (this.constructor as any)();
    inst.Name = this.Name;
    for (const [k, v] of Object.entries(this)) {
      if (k !== '_parent' && k !== '_children' && k !== 'id' && !k.endsWith('Signals') && !(v instanceof RBXScriptSignal)) {
        if (v && typeof v === 'object' && typeof (v as any).clone === 'function') {
          (inst as any)[k] = (v as any).clone();
        } else if (v && typeof v === 'object' && typeof (v as any).Clone === 'function') {
          (inst as any)[k] = (v as any).Clone();
        } else {
          (inst as any)[k] = v;
        }
      }
    }
    inst.Name = this.Name;
    return inst;
  }

  Destroy(): void {
    this.Destroying.Fire();

    // Destroy children first
    const kids = [...this._children];
    for (const kid of kids) {
      kid.Destroy();
    }

    if (this.onDestroyHook) {
      this.onDestroyHook();
    }

    this.Parent = null;

    // Disconnect all internal signals
    this.ChildAdded.DisconnectAll();
    this.ChildRemoved.DisconnectAll();
    this.AncestryChanged.DisconnectAll();
    this.Destroying.DisconnectAll();
    for (const sig of this.propertyChangedSignals.values()) {
      sig.DisconnectAll();
    }
    this.propertyChangedSignals.clear();
  }

  destroy(): void {
    this.Destroy();
  }

  // Helper for dynamic indexing in scripts (e.g. script.Parent.ClickDetector)
  getChildOrProperty(key: string): any {
    if (key in this) {
      return (this as any)[key];
    }
    return this.FindFirstChild(key);
  }
}
