import { RBXTweenService } from '../services/TweenService.ts';
import { RBXRunService } from '../services/RunService.ts';

export interface ScriptThread {
  id: string;
  cancelled: boolean;
  name: string;
}

export class Scheduler {
  private isRunning = true;
  private activeTimeouts = new Set<any>();
  private activeThreads = new Set<ScriptThread>();
  private runService?: RBXRunService;

  constructor(runService?: RBXRunService) {
    this.runService = runService;
  }

  createThread(name = 'Thread'): ScriptThread {
    const thread: ScriptThread = {
      id: `th_${Math.random().toString(36).substring(2, 9)}`,
      cancelled: false,
      name,
    };
    this.activeThreads.add(thread);
    return thread;
  }

  cancelThread(thread?: ScriptThread): void {
    if (!thread) return;
    thread.cancelled = true;
    this.activeThreads.delete(thread);
  }

  wait(seconds = 0.03, thread?: ScriptThread): Promise<number> {
    if (!this.isRunning || thread?.cancelled) {
      return Promise.reject(new Error('Thread cancelled'));
    }

    const duration = Math.max(1, Math.round((Number(seconds) || 0.03) * 1000));
    const startTime = performance.now();

    return new Promise<number>((resolve, reject) => {
      let timer: any = null;

      timer = setTimeout(() => {
        this.activeTimeouts.delete(timer);
        if (!this.isRunning || thread?.cancelled) {
          reject(new Error('Thread cancelled'));
        } else {
          resolve((performance.now() - startTime) / 1000);
        }
      }, duration);

      this.activeTimeouts.add(timer);
    });
  }

  yield(thread?: ScriptThread): Promise<void> {
    if (!this.isRunning || thread?.cancelled) {
      return Promise.reject(new Error('Thread cancelled'));
    }
    return new Promise<void>((resolve, reject) => {
      let timer: any = null;
      timer = setTimeout(() => {
        this.activeTimeouts.delete(timer);
        if (!this.isRunning || thread?.cancelled) {
          reject(new Error('Thread cancelled'));
        } else {
          resolve();
        }
      }, 0);
      this.activeTimeouts.add(timer);
    });
  }

  spawn(fn: (...args: any[]) => any, ...args: any[]): ScriptThread {
    const thread = this.createThread('SpawnedThread');
    (async () => {
      try {
        await fn(...args);
      } catch (err: any) {
        if (!thread.cancelled && err?.message !== 'Thread cancelled') {
          console.error('[Scheduler] spawn error:', err);
        }
      } finally {
        this.activeThreads.delete(thread);
      }
    })();
    return thread;
  }

  defer(fn: (...args: any[]) => any, ...args: any[]): ScriptThread {
    const thread = this.createThread('DeferredThread');
    let timer: any = null;
    timer = setTimeout(async () => {
      this.activeTimeouts.delete(timer);
      if (!this.isRunning || thread.cancelled) return;
      try {
        await fn(...args);
      } catch (err: any) {
        if (!thread.cancelled && err?.message !== 'Thread cancelled') {
          console.error('[Scheduler] defer error:', err);
        }
      } finally {
        this.activeThreads.delete(thread);
      }
    }, 0);
    this.activeTimeouts.add(timer);
    return thread;
  }

  delay(seconds: number, fn: (...args: any[]) => any, ...args: any[]): ScriptThread {
    const thread = this.createThread('DelayedThread');
    const ms = Math.max(1, Math.round((Number(seconds) || 0) * 1000));
    let timer: any = null;
    timer = setTimeout(async () => {
      this.activeTimeouts.delete(timer);
      if (!this.isRunning || thread.cancelled) return;
      try {
        await fn(...args);
      } catch (err: any) {
        if (!thread.cancelled && err?.message !== 'Thread cancelled') {
          console.error('[Scheduler] delay error:', err);
        }
      } finally {
        this.activeThreads.delete(thread);
      }
    }, ms);
    this.activeTimeouts.add(timer);
    return thread;
  }

  step(now: number, dt: number): void {
    if (!this.isRunning) return;

    // 1. Step Tweens
    RBXTweenService.stepAll(now, dt);

    // 2. Step RunService
    if (this.runService) {
      this.runService.step(dt);
    }
  }

  cancelAll(): void {
    this.isRunning = false;
    for (const t of this.activeTimeouts) {
      clearTimeout(t);
    }
    this.activeTimeouts.clear();

    for (const th of this.activeThreads) {
      th.cancelled = true;
    }
    this.activeThreads.clear();
  }
}
