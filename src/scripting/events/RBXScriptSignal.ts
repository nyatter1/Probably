export class RBXScriptConnection {
  private signal: RBXScriptSignal<any> | null;
  private callback: ((...args: any[]) => any) | null;
  public Connected = true;

  constructor(signal: RBXScriptSignal<any>, callback: (...args: any[]) => any) {
    this.signal = signal;
    this.callback = callback;
  }

  Disconnect(): void {
    if (!this.Connected || !this.signal) return;
    this.Connected = false;
    this.signal.removeConnection(this);
    this.signal = null;
    this.callback = null;
  }

  disconnect(): void {
    this.Disconnect();
  }

  execute(...args: any[]): void {
    if (!this.Connected || !this.callback) return;
    try {
      const res = this.callback(...args);
      if (res && typeof res.then === 'function') {
        res.catch((err: any) => {
          console.error('[RBXScriptSignal] Async callback error:', err?.message || err);
        });
      }
    } catch (err: any) {
      console.error('[RBXScriptSignal] Listener callback error:', err?.message || err);
    }
  }
}

export class RBXScriptSignal<T = any> {
  private connections: RBXScriptConnection[] = [];
  private waitResolvers: Array<(...args: any[]) => void> = [];

  Connect(fn: (...args: any[]) => any): RBXScriptConnection {
    const conn = new RBXScriptConnection(this, fn);
    this.connections.push(conn);
    return conn;
  }

  connect(fn: (...args: any[]) => any): RBXScriptConnection {
    return this.Connect(fn);
  }

  Once(fn: (...args: any[]) => any): RBXScriptConnection {
    const conn = this.Connect((...args: any[]) => {
      conn.Disconnect();
      fn(...args);
    });
    return conn;
  }

  Wait(): Promise<T> {
    return new Promise<T>((resolve) => {
      this.waitResolvers.push(resolve);
    });
  }

  wait(): Promise<T> {
    return this.Wait();
  }

  Fire(...args: any[]): void {
    // Notify waiters first
    if (this.waitResolvers.length > 0) {
      const resolvers = [...this.waitResolvers];
      this.waitResolvers = [];
      resolvers.forEach((resolve) => {
        try {
          resolve(args.length <= 1 ? args[0] : args);
        } catch (e) {
          console.error('[RBXScriptSignal] Error resolving Wait():', e);
        }
      });
    }

    // Clone connections list before iterating so handlers can disconnect during fire
    const conns = [...this.connections];
    for (const conn of conns) {
      conn.execute(...args);
    }
  }

  removeConnection(conn: RBXScriptConnection): void {
    const idx = this.connections.indexOf(conn);
    if (idx !== -1) {
      this.connections.splice(idx, 1);
    }
  }

  DisconnectAll(): void {
    for (const conn of this.connections) {
      conn.Connected = false;
    }
    this.connections = [];
    this.waitResolvers = [];
  }
}
