export class LuaTable {
  private arrayPart: any[] = [];
  private mapPart = new Map<any, any>();
  metatable: LuaTable | null = null;

  constructor(initialData?: Record<any, any> | any[]) {
    if (Array.isArray(initialData)) {
      this.arrayPart = [...initialData];
    } else if (initialData && typeof initialData === 'object') {
      for (const [k, v] of Object.entries(initialData)) {
        this.set(k, v);
      }
    }
  }

  get(key: any): any {
    if (typeof key === 'number' && Number.isInteger(key) && key >= 1) {
      const idx = key - 1;
      if (idx < this.arrayPart.length) {
        return this.arrayPart[idx];
      }
    }
    const val = this.mapPart.get(key);
    if (val !== undefined) return val;

    // Check metatable __index
    if (this.metatable) {
      const indexHandler = this.metatable.get('__index');
      if (indexHandler instanceof LuaTable) {
        return indexHandler.get(key);
      }
      if (typeof indexHandler === 'function') {
        return indexHandler(this, key);
      }
    }

    return undefined;
  }

  set(key: any, value: any): void {
    if (value === undefined || value === null) {
      if (typeof key === 'number' && Number.isInteger(key) && key >= 1) {
        const idx = key - 1;
        if (idx < this.arrayPart.length) {
          this.arrayPart[idx] = undefined;
          return;
        }
      }
      this.mapPart.delete(key);
      return;
    }

    // Check metatable __newindex
    if (this.metatable && this.get(key) === undefined) {
      const newindexHandler = this.metatable.get('__newindex');
      if (newindexHandler instanceof LuaTable) {
        newindexHandler.set(key, value);
        return;
      }
      if (typeof newindexHandler === 'function') {
        newindexHandler(this, key, value);
        return;
      }
    }

    if (typeof key === 'number' && Number.isInteger(key) && key >= 1) {
      const idx = key - 1;
      if (idx === this.arrayPart.length) {
        this.arrayPart.push(value);
        return;
      }
      if (idx < this.arrayPart.length) {
        this.arrayPart[idx] = value;
        return;
      }
    }

    this.mapPart.set(key, value);
  }

  length(): number {
    let len = this.arrayPart.length;
    while (len > 0 && (this.arrayPart[len - 1] === undefined || this.arrayPart[len - 1] === null)) {
      len--;
    }
    return len;
  }

  insert(posOrVal: any, val?: any): void {
    if (val === undefined) {
      // table.insert(t, val)
      this.arrayPart.push(posOrVal);
    } else {
      // table.insert(t, pos, val)
      const idx = Math.max(0, (Number(posOrVal) || 1) - 1);
      this.arrayPart.splice(idx, 0, val);
    }
  }

  remove(pos?: number): any {
    const idx = pos === undefined ? this.arrayPart.length - 1 : (Number(pos) || 1) - 1;
    if (idx >= 0 && idx < this.arrayPart.length) {
      return this.arrayPart.splice(idx, 1)[0];
    }
    return undefined;
  }

  find(val: any): number | null {
    for (let i = 0; i < this.arrayPart.length; i++) {
      if (this.arrayPart[i] === val) return i + 1;
    }
    return null;
  }

  entries(): [any, any][] {
    const res: [any, any][] = [];
    for (let i = 0; i < this.arrayPart.length; i++) {
      if (this.arrayPart[i] !== undefined && this.arrayPart[i] !== null) {
        res.push([i + 1, this.arrayPart[i]]);
      }
    }
    for (const [k, v] of this.mapPart.entries()) {
      res.push([k, v]);
    }
    return res;
  }

  toObject(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const [k, v] of this.entries()) {
      obj[String(k)] = v;
    }
    return obj;
  }

  toArray(): any[] {
    return [...this.arrayPart];
  }
}
