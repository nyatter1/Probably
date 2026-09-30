import * as luaparse from 'luaparse';
import { RBXVector3 } from '../datatypes/Vector3.ts';
import { RBXVector2 } from '../datatypes/Vector2.ts';
import { RBXColor3 } from '../datatypes/Color3.ts';
import { RBXCFrame } from '../datatypes/CFrame.ts';
import { RBXTweenInfo } from '../datatypes/TweenInfo.ts';
import { RBXEnum } from '../datatypes/Enum.ts';
import { RBXUDim } from '../datatypes/UDim.ts';
import { RBXUDim2 } from '../datatypes/UDim2.ts';
import { RBXInstance } from '../instances/Instance.ts';
import { RBXInstanceFactory } from '../instances/InstanceFactory.ts';
import { RBXDataModel } from '../services/ServiceProvider.ts';
import { RBXWorkspace } from '../services/WorkspaceService.ts';
import { LuaTable } from './LuaTable.ts';
import { Scheduler, ScriptThread } from './Scheduler.ts';
import { normalizeLuauSource } from './LuauNormalizer.ts';

// Special signals for control flow
class ReturnValue {
  constructor(public values: any[]) {}
}

class BreakSignal {}
class ContinueSignal {}

export function isLuaTruthy(val: any): boolean {
  return val !== false && val !== null && val !== undefined;
}

export class Scope {
  private values = new Map<string, any>();

  constructor(public parent: Scope | null = null) {}

  get(name: string): any {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }

  set(name: string, value: any): void {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent && this.parent.has(name)) {
      this.parent.set(name, value);
      return;
    }
    this.values.set(name, value);
  }

  has(name: string): boolean {
    if (this.values.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  declare(name: string, value: any): void {
    this.values.set(name, value);
  }
}

export interface InterpreterOptions {
  scriptName: string;
  source: string;
  scriptInstance: RBXInstance;
  game: RBXDataModel;
  workspace: RBXWorkspace;
  scheduler: Scheduler;
  onLog?: (type: 'log' | 'warn' | 'error' | 'info', message: string, source: string) => void;
  thread?: ScriptThread;
}

export class ASTInterpreter {
  private scriptName: string;
  private source: string;
  private scriptInstance: RBXInstance;
  private game: RBXDataModel;
  private workspace: RBXWorkspace;
  private scheduler: Scheduler;
  private onLog?: (type: 'log' | 'warn' | 'error' | 'info', message: string, source: string) => void;
  public thread?: ScriptThread;

  constructor(opts: InterpreterOptions) {
    this.scriptName = opts.scriptName || 'Script';
    this.source = opts.source || '';
    this.game = opts.game || new RBXDataModel();
    this.workspace = opts.workspace || this.game.Workspace;
    this.scriptInstance = opts.scriptInstance || this.workspace;
    this.scheduler = opts.scheduler || new Scheduler(this.game.RunService);
    this.onLog = opts.onLog;
    this.thread = opts.thread || this.scheduler.createThread(this.scriptName);
  }

  private log(type: 'log' | 'warn' | 'error' | 'info', message: string): void {
    if (this.onLog) {
      this.onLog(type, message, this.scriptName);
    } else {
      console.log(`[${type.toUpperCase()}] (${this.scriptName}) ${message}`);
    }
  }

  public createGlobalScope(): Scope {
    const globalScope = new Scope();

    // Standard Globals
    globalScope.declare('game', this.game);
    globalScope.declare('Game', this.game);
    globalScope.declare('workspace', this.workspace);
    globalScope.declare('Workspace', this.workspace);
    globalScope.declare('script', this.scriptInstance);
    globalScope.declare('Script', this.scriptInstance);
    globalScope.declare('__continue__', () => new ContinueSignal());

    // Datatypes
    globalScope.declare('Vector3', RBXVector3);
    globalScope.declare('Vector2', RBXVector2);
    globalScope.declare('Color3', RBXColor3);
    globalScope.declare('CFrame', RBXCFrame);
    globalScope.declare('UDim', RBXUDim);
    globalScope.declare('UDim2', RBXUDim2);
    globalScope.declare('TweenInfo', RBXTweenInfo);
    globalScope.declare('Enum', RBXEnum);
    globalScope.declare('Instance', RBXInstanceFactory);

    // Logging & Console
    globalScope.declare('print', (...args: any[]) => {
      const msg = args.map((a) => this.stringify(a)).join(' ');
      this.log('log', msg);
    });

    globalScope.declare('warn', (...args: any[]) => {
      const msg = args.map((a) => this.stringify(a)).join(' ');
      this.log('warn', msg);
    });

    globalScope.declare('error', (msg: any) => {
      throw new Error(String(msg));
    });

    // Task Library
    const taskLib = {
      wait: (sec = 0.03) => this.scheduler.wait(sec, this.thread),
      spawn: (fn: any, ...args: any[]) => {
        if (typeof fn === 'function') {
          return this.scheduler.spawn(fn, ...args);
        }
      },
      defer: (fn: any, ...args: any[]) => {
        if (typeof fn === 'function') {
          return this.scheduler.defer(fn, ...args);
        }
      },
      delay: (sec: number, fn: any, ...args: any[]) => {
        if (typeof fn === 'function') {
          return this.scheduler.delay(sec, fn, ...args);
        }
      },
      cancel: (th: any) => this.scheduler.cancelThread(th),
    };
    globalScope.declare('task', taskLib);
    globalScope.declare('wait', (sec = 0.03) => this.scheduler.wait(sec, this.thread));
    globalScope.declare('spawn', (fn: any, ...args: any[]) => taskLib.spawn(fn, ...args));
    globalScope.declare('delay', (sec: number, fn: any, ...args: any[]) => taskLib.delay(sec, fn, ...args));
    globalScope.declare('tick', () => Date.now() / 1000);

    // Math Library
    const mathLib = {
      abs: Math.abs,
      acos: Math.acos,
      asin: Math.asin,
      atan: Math.atan,
      atan2: Math.atan2,
      ceil: Math.ceil,
      cos: Math.cos,
      cosh: Math.cosh,
      deg: (rad: number) => (rad * 180) / Math.PI,
      exp: Math.exp,
      floor: Math.floor,
      fmod: (x: number, y: number) => x % y,
      frexp: (x: number) => [x, 0],
      ldexp: (m: number, e: number) => m * Math.pow(2, e),
      log: Math.log,
      log10: Math.log10,
      max: Math.max,
      min: Math.min,
      modf: (x: number) => [Math.trunc(x), x - Math.trunc(x)],
      pi: Math.PI,
      rad: (deg: number) => (deg * Math.PI) / 180,
      random: (min?: number, max?: number) => {
        if (min === undefined) return Math.random();
        if (max === undefined) return Math.floor(Math.random() * min) + 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      },
      randomseed: () => {},
      round: Math.round,
      sin: Math.sin,
      sinh: Math.sinh,
      sqrt: Math.sqrt,
      tan: Math.tan,
      tanh: Math.tanh,
      huge: Infinity,
      clamp: (n: number, min: number, max: number) => Math.max(min, Math.min(max, n)),
      sign: Math.sign,
    };
    globalScope.declare('math', mathLib);

    // String Library
    const stringLib = {
      byte: (s: string, i = 1) => s.charCodeAt(i - 1),
      char: (...codes: number[]) => String.fromCharCode(...codes),
      find: (s: string, pattern: string, init = 1) => {
        const idx = s.indexOf(pattern, init - 1);
        return idx !== -1 ? [idx + 1, idx + pattern.length] : null;
      },
      format: (fmt: string, ...args: any[]) => {
        let i = 0;
        return fmt.replace(/%[sfdq]/g, () => String(args[i++] ?? ''));
      },
      gmatch: (s: string, pattern: string) => {
        const regex = new RegExp(pattern, 'g');
        const matches = s.match(regex) || [];
        let idx = 0;
        return () => (idx < matches.length ? matches[idx++] : null);
      },
      gsub: (s: string, pattern: string, repl: any) => {
        return s.replaceAll(pattern, typeof repl === 'function' ? repl : String(repl));
      },
      len: (s: string) => s.length,
      lower: (s: string) => s.toLowerCase(),
      match: (s: string, pattern: string) => {
        const m = s.match(new RegExp(pattern));
        return m ? m[0] : null;
      },
      rep: (s: string, n: number) => s.repeat(Math.max(0, n)),
      reverse: (s: string) => s.split('').reverse().join(''),
      sub: (s: string, i: number, j?: number) => {
        const start = i < 0 ? s.length + i : i - 1;
        const end = j === undefined ? s.length : j < 0 ? s.length + j + 1 : j;
        return s.substring(start, end);
      },
      upper: (s: string) => s.toUpperCase(),
      split: (s: string, sep: string) => new LuaTable(s.split(sep)),
    };
    globalScope.declare('string', stringLib);

    // Table Library
    const tableLib = {
      insert: (t: any, posOrVal: any, val?: any) => {
        if (t instanceof LuaTable) {
          t.insert(posOrVal, val);
        } else if (Array.isArray(t)) {
          if (val === undefined) t.push(posOrVal);
          else t.splice(posOrVal - 1, 0, val);
        }
      },
      remove: (t: any, pos?: number) => {
        if (t instanceof LuaTable) return t.remove(pos);
        if (Array.isArray(t)) {
          const idx = pos === undefined ? t.length - 1 : pos - 1;
          return t.splice(idx, 1)[0];
        }
      },
      find: (t: any, val: any) => {
        if (t instanceof LuaTable) return t.find(val);
        if (Array.isArray(t)) {
          const idx = t.indexOf(val);
          return idx !== -1 ? idx + 1 : null;
        }
        return null;
      },
      sort: (t: any, comp?: (a: any, b: any) => boolean) => {
        if (t instanceof LuaTable) {
          const arr = t.toArray();
          arr.sort(comp ? (a, b) => (comp(a, b) ? -1 : 1) : undefined);
          for (let i = 0; i < arr.length; i++) t.set(i + 1, arr[i]);
        } else if (Array.isArray(t)) {
          t.sort(comp ? (a, b) => (comp(a, b) ? -1 : 1) : undefined);
        }
      },
      concat: (t: any, sep = '', i = 1, j?: number) => {
        const arr = t instanceof LuaTable ? t.toArray() : Array.isArray(t) ? t : [];
        const start = i - 1;
        const end = j === undefined ? arr.length : j;
        return arr.slice(start, end).join(sep);
      },
      unpack: (t: any) => {
        if (t instanceof LuaTable) return t.toArray();
        if (Array.isArray(t)) return t;
        return [];
      },
    };
    globalScope.declare('table', tableLib);

    // Iterators
    globalScope.declare('pairs', (t: any) => {
      if (t instanceof LuaTable) {
        const entries = t.entries();
        let idx = 0;
        return () => {
          if (idx < entries.length) {
            const entry = entries[idx++];
            return [entry[0], entry[1]];
          }
          return null;
        };
      }
      if (Array.isArray(t)) {
        let idx = 0;
        return () => {
          if (idx < t.length) {
            const cur = idx++;
            return [cur + 1, t[cur]];
          }
          return null;
        };
      }
      if (t && typeof t === 'object') {
        const keys = Object.keys(t);
        let idx = 0;
        return () => {
          if (idx < keys.length) {
            const k = keys[idx++];
            return [k, t[k]];
          }
          return null;
        };
      }
      return () => null;
    });

    globalScope.declare('ipairs', (t: any) => {
      if (t instanceof LuaTable) {
        let idx = 1;
        return () => {
          const val = t.get(idx);
          if (val !== undefined && val !== null) {
            const cur = idx++;
            return [cur, val];
          }
          return null;
        };
      }
      if (Array.isArray(t)) {
        let idx = 0;
        return () => {
          if (idx < t.length) {
            const cur = idx++;
            return [cur + 1, t[cur]];
          }
          return null;
        };
      }
      return () => null;
    });

    // Metatable & types
    globalScope.declare('type', (val: any) => {
      if (val === null || val === undefined) return 'nil';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'string';
      if (typeof val === 'boolean') return 'boolean';
      if (typeof val === 'function') return 'function';
      if (val instanceof LuaTable) return 'table';
      if (val instanceof RBXVector3) return 'userdata';
      if (val instanceof RBXColor3) return 'userdata';
      if (val instanceof RBXCFrame) return 'userdata';
      if (val instanceof RBXInstance) return 'userdata';
      return 'table';
    });

    globalScope.declare('typeof', (val: any) => {
      if (val === null || val === undefined) return 'nil';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'string') return 'string';
      if (typeof val === 'boolean') return 'boolean';
      if (typeof val === 'function') return 'function';
      if (val instanceof LuaTable) return 'table';
      if (val instanceof RBXVector3) return 'Vector3';
      if (val instanceof RBXColor3) return 'Color3';
      if (val instanceof RBXCFrame) return 'CFrame';
      if (val instanceof RBXTweenInfo) return 'TweenInfo';
      if (val instanceof RBXInstance) return 'Instance';
      return 'table';
    });

    globalScope.declare('tonumber', (val: any) => {
      const n = Number(val);
      return isNaN(n) ? null : n;
    });

    globalScope.declare('tostring', (val: any) => this.stringify(val));

    globalScope.declare('assert', (cond: any, msg = 'Assertion failed!') => {
      if (!isLuaTruthy(cond)) {
        throw new Error(String(msg));
      }
      return cond;
    });

    globalScope.declare('select', (index: any, ...args: any[]) => {
      if (index === '#') return args.length;
      const idx = (Number(index) || 1) - 1;
      return args.slice(idx);
    });

    globalScope.declare('pcall', async (fn: any, ...args: any[]) => {
      try {
        const res = await fn(...args);
        if (Array.isArray(res)) return [true, ...res];
        return [true, res];
      } catch (err: any) {
        return [false, err?.message || String(err)];
      }
    });

    globalScope.declare('xpcall', async (fn: any, errHandler: any, ...args: any[]) => {
      try {
        const res = await fn(...args);
        if (Array.isArray(res)) return [true, ...res];
        return [true, res];
      } catch (err: any) {
        const handled = errHandler ? errHandler(err) : err?.message;
        return [false, handled];
      }
    });

    globalScope.declare('setmetatable', (tbl: any, mt: any) => {
      if (tbl instanceof LuaTable) {
        tbl.metatable = mt instanceof LuaTable ? mt : null;
      }
      return tbl;
    });

    globalScope.declare('getmetatable', (tbl: any) => {
      if (tbl instanceof LuaTable) {
        return tbl.metatable;
      }
      return null;
    });

    return globalScope;
  }

  private stringify(val: any): string {
    if (val === null || val === undefined) return 'nil';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val instanceof RBXVector3) return val.toString();
    if (val instanceof RBXVector2) return val.toString();
    if (val instanceof RBXColor3) return val.toString();
    if (val instanceof RBXCFrame) return `CFrame(${val.Position.toString()})`;
    if (val instanceof RBXInstance) return val.Name;
    if (val instanceof LuaTable) {
      const entries = val.entries().map(([k, v]) => `${k} = ${this.stringify(v)}`).slice(0, 10);
      return `{ ${entries.join(', ')} }`;
    }
    if (val?.toString && typeof val.toString === 'function' && val.toString !== Object.prototype.toString) {
      return val.toString();
    }
    return String(val);
  }

  public async run(): Promise<void> {
    try {
      if (typeof this.source !== 'string') {
        this.source = String(this.source || '');
      }

      if (!this.source.trim()) {
        return;
      }

      const normalized = normalizeLuauSource(this.source);
      const ast = luaparse.parse(normalized, {
        wait: false,
        comments: false,
        scope: false,
        locations: true,
        luaVersion: '5.3',
        encodingMode: 'none',
      });

      const scope = this.createGlobalScope();
      await this.executeBlock(ast.body, scope);
    } catch (err: any) {
      if (this.thread?.cancelled || err?.message === 'Thread cancelled') {
        return;
      }

      // Format accurate error message with line number
      let lineNum = '?';
      if (err.line !== undefined) {
        lineNum = String(err.line);
      } else if (err.node?.loc?.start?.line) {
        lineNum = String(err.node.loc.start.line);
      }

      const cleanMsg = err.message ? err.message.replace(/^\[.*?\]\s*/, '') : String(err);
      const instPath = (this.scriptInstance && typeof this.scriptInstance.GetFullName === 'function')
        ? this.scriptInstance.GetFullName()
        : this.scriptName;
      this.log('error', `[Script Error] Script: ${this.scriptName} | Instance: ${instPath} | Line ${lineNum}: ${cleanMsg}`);
    }
  }

  private async executeBlock(statements: any[], scope: Scope): Promise<any> {
    for (const stmt of statements) {
      if (this.thread?.cancelled) return;
      const res = await this.executeStatement(stmt, scope);
      if (res instanceof ReturnValue || res instanceof BreakSignal || res instanceof ContinueSignal) {
        return res;
      }
    }
  }

  private async executeStatement(stmt: any, scope: Scope): Promise<any> {
    if (this.thread?.cancelled) return;

    try {
      switch (stmt.type) {
        case 'LocalStatement': {
          const inits: any[] = [];
          if (stmt.init) {
            for (const expr of stmt.init) {
              const val = await this.evaluateExpression(expr, scope);
              if (Array.isArray(val) && stmt.init.length === 1 && stmt.variables.length > 1) {
                inits.push(...val);
              } else {
                inits.push(val);
              }
            }
          }
          for (let i = 0; i < stmt.variables.length; i++) {
            const varName = stmt.variables[i].name;
            const val = i < inits.length ? inits[i] : null;
            scope.declare(varName, val);
          }
          break;
        }

        case 'AssignmentStatement': {
          const inits: any[] = [];
          if (stmt.init) {
            for (const expr of stmt.init) {
              const val = await this.evaluateExpression(expr, scope);
              if (Array.isArray(val) && stmt.init.length === 1 && stmt.variables.length > 1) {
                inits.push(...val);
              } else {
                inits.push(val);
              }
            }
          }
          for (let i = 0; i < stmt.variables.length; i++) {
            const target = stmt.variables[i];
            const val = i < inits.length ? inits[i] : null;
            await this.assignTo(target, val, scope);
          }
          break;
        }

        case 'CallStatement': {
          const res = await this.evaluateExpression(stmt.expression, scope);
          if (res instanceof ReturnValue || res instanceof BreakSignal || res instanceof ContinueSignal) {
            return res;
          }
          break;
        }

        case 'FunctionDeclaration': {
          const fn = this.createFunction(stmt.parameters, stmt.body, scope);
          if (stmt.isLocal && stmt.identifier) {
            scope.declare(stmt.identifier.name, fn);
          } else if (stmt.identifier) {
            if (stmt.identifier.type === 'Identifier') {
              scope.set(stmt.identifier.name, fn);
            } else if (stmt.identifier.type === 'MemberExpression') {
              const base = await this.evaluateExpression(stmt.identifier.base, scope);
              const prop = stmt.identifier.identifier.name;
              if (stmt.identifier.indexer === ':') {
                // Method definition: function obj:foo(...) -> first param is self
                const methodFn = this.createFunction(
                  [{ type: 'Identifier', name: 'self' }, ...stmt.parameters],
                  stmt.body,
                  scope
                );
                if (base instanceof LuaTable) base.set(prop, methodFn);
                else if (base) base[prop] = methodFn;
              } else {
                if (base instanceof LuaTable) base.set(prop, fn);
                else if (base) base[prop] = fn;
              }
            }
          }
          break;
        }

        case 'IfStatement': {
          for (const clause of stmt.clauses) {
            if (clause.type === 'ElseClause') {
              const res = await this.executeBlock(clause.body, new Scope(scope));
              if (res) return res;
              break;
            }
            const cond = await this.evaluateExpression(clause.condition, scope);
            if (isLuaTruthy(cond)) {
              const res = await this.executeBlock(clause.body, new Scope(scope));
              if (res) return res;
              break;
            }
          }
          break;
        }

        case 'WhileStatement': {
          let loopCount = 0;
          while (!this.thread?.cancelled) {
            const cond = await this.evaluateExpression(stmt.condition, scope);
            if (!isLuaTruthy(cond)) break;

            const res = await this.executeBlock(stmt.body, new Scope(scope));
            if (res instanceof ReturnValue) return res;
            if (res instanceof BreakSignal) break;
            if (res instanceof ContinueSignal) continue;

            loopCount++;
            if (loopCount % 60 === 0) {
              await this.scheduler.yield(this.thread);
            }
          }
          break;
        }

        case 'RepeatStatement': {
          let loopCount = 0;
          do {
            if (this.thread?.cancelled) break;
            const res = await this.executeBlock(stmt.body, new Scope(scope));
            if (res instanceof ReturnValue) return res;
            if (res instanceof BreakSignal) break;
            if (res instanceof ContinueSignal) continue;

            const cond = await this.evaluateExpression(stmt.condition, scope);
            if (isLuaTruthy(cond)) break;

            loopCount++;
            if (loopCount % 60 === 0) {
              await this.scheduler.yield(this.thread);
            }
          } while (!this.thread?.cancelled);
          break;
        }

        case 'ForNumericStatement': {
          const varName = stmt.variable.name;
          const startVal = Number(await this.evaluateExpression(stmt.start, scope)) || 0;
          const endVal = Number(await this.evaluateExpression(stmt.end, scope)) || 0;
          const stepVal = stmt.step ? Number(await this.evaluateExpression(stmt.step, scope)) || 1 : 1;

          let loopCount = 0;
          if (stepVal > 0) {
            for (let i = startVal; i <= endVal; i += stepVal) {
              if (this.thread?.cancelled) break;
              const loopScope = new Scope(scope);
              loopScope.declare(varName, i);
              const res = await this.executeBlock(stmt.body, loopScope);
              if (res instanceof ReturnValue) return res;
              if (res instanceof BreakSignal) break;
              if (res instanceof ContinueSignal) continue;

              loopCount++;
              if (loopCount % 60 === 0) {
                await this.scheduler.yield(this.thread);
              }
            }
          } else {
            for (let i = startVal; i >= endVal; i += stepVal) {
              if (this.thread?.cancelled) break;
              const loopScope = new Scope(scope);
              loopScope.declare(varName, i);
              const res = await this.executeBlock(stmt.body, loopScope);
              if (res instanceof ReturnValue) return res;
              if (res instanceof BreakSignal) break;
              if (res instanceof ContinueSignal) continue;

              loopCount++;
              if (loopCount % 60 === 0) {
                await this.scheduler.yield(this.thread);
              }
            }
          }
          break;
        }

        case 'ForGenericStatement': {
          const iterExpr = stmt.iterators[0];
          const iterResult = await this.evaluateExpression(iterExpr, scope);

          let iteratorFn: any;
          if (typeof iterResult === 'function') {
            iteratorFn = iterResult;
          } else if (Array.isArray(iterResult) && typeof iterResult[0] === 'function') {
            iteratorFn = iterResult[0];
          }

          if (iteratorFn) {
            let loopCount = 0;
            while (!this.thread?.cancelled) {
              const stepResult = iteratorFn();
              if (stepResult === null || stepResult === undefined) break;

              const loopScope = new Scope(scope);
              if (Array.isArray(stepResult)) {
                for (let i = 0; i < stmt.variables.length; i++) {
                  loopScope.declare(stmt.variables[i].name, stepResult[i]);
                }
              } else {
                if (stmt.variables.length > 0) {
                  loopScope.declare(stmt.variables[0].name, stepResult);
                }
              }

              const res = await this.executeBlock(stmt.body, loopScope);
              if (res instanceof ReturnValue) return res;
              if (res instanceof BreakSignal) break;
              if (res instanceof ContinueSignal) continue;

              loopCount++;
              if (loopCount % 60 === 0) {
                await this.scheduler.yield(this.thread);
              }
            }
          }
          break;
        }

        case 'ReturnStatement': {
          const retVals: any[] = [];
          for (const arg of stmt.arguments) {
            retVals.push(await this.evaluateExpression(arg, scope));
          }
          return new ReturnValue(retVals);
        }

        case 'BreakStatement': {
          return new BreakSignal();
        }

        default:
          break;
      }
    } catch (err: any) {
      err.node = stmt;
      throw err;
    }
  }

  private async assignTo(target: any, value: any, scope: Scope): Promise<void> {
    if (target.type === 'Identifier') {
      scope.set(target.name, value);
    } else if (target.type === 'MemberExpression') {
      const base = await this.evaluateExpression(target.base, scope);
      const prop = target.identifier.name;
      if (base === null || base === undefined) {
        throw new Error(`attempt to index nil with '${prop}'`);
      }
      if (base instanceof LuaTable) {
        base.set(prop, value);
      } else {
        base[prop] = value;
        if (base instanceof RBXInstance) {
          base.notifyPropertyChanged(prop, value);
        }
      }
    } else if (target.type === 'IndexExpression') {
      const base = await this.evaluateExpression(target.base, scope);
      const key = await this.evaluateExpression(target.index, scope);
      if (base === null || base === undefined) {
        throw new Error(`attempt to index nil with '${key}'`);
      }
      if (base instanceof LuaTable) {
        base.set(key, value);
      } else {
        base[key] = value;
        if (base instanceof RBXInstance) {
          base.notifyPropertyChanged(String(key), value);
        }
      }
    }
  }

  private createFunction(parameters: any[], body: any[], parentScope: Scope): (...args: any[]) => Promise<any> {
    return async (...args: any[]) => {
      const fnScope = new Scope(parentScope);
      for (let i = 0; i < parameters.length; i++) {
        const param = parameters[i];
        if (param.type === 'Identifier') {
          fnScope.declare(param.name, i < args.length ? args[i] : null);
        } else if (param.type === 'VarargLiteral') {
          fnScope.declare('...', args.slice(i));
        }
      }

      const res = await this.executeBlock(body, fnScope);
      if (res instanceof ReturnValue) {
        return res.values.length <= 1 ? res.values[0] : res.values;
      }
      return undefined;
    };
  }

  private async evaluateExpression(expr: any, scope: Scope): Promise<any> {
    if (!expr) return null;

    try {
      switch (expr.type) {
        case 'StringLiteral': {
          if (expr.value !== null && expr.value !== undefined) {
            return expr.value;
          }
          if (expr.raw) {
            const raw = expr.raw;
            if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
              return raw.slice(1, -1);
            }
            const match = raw.match(/^\[=*\[([\s\S]*?)\]=*\]$/);
            if (match) {
              return match[1];
            }
            return raw;
          }
          return '';
        }

        case 'NumericLiteral':
          return expr.value;

        case 'BooleanLiteral':
          return expr.value;

        case 'NilLiteral':
          return null;

        case 'Identifier': {
          return scope.get(expr.name);
        }

        case 'VarargLiteral': {
          return scope.get('...');
        }

        case 'TableConstructorExpression': {
          const tbl = new LuaTable();
          let nextIndex = 1;
          for (const field of expr.fields) {
            if (field.type === 'TableValue') {
              const val = await this.evaluateExpression(field.value, scope);
              tbl.set(nextIndex++, val);
            } else if (field.type === 'TableKeyString') {
              const val = await this.evaluateExpression(field.value, scope);
              tbl.set(field.key.name, val);
            } else if (field.type === 'TableKey') {
              const key = await this.evaluateExpression(field.key, scope);
              const val = await this.evaluateExpression(field.value, scope);
              tbl.set(key, val);
            }
          }
          return tbl;
        }

        case 'BinaryExpression': {
          const left = await this.evaluateExpression(expr.left, scope);
          const right = await this.evaluateExpression(expr.right, scope);
          return this.applyBinaryOperator(expr.operator, left, right);
        }

        case 'LogicalExpression': {
          const left = await this.evaluateExpression(expr.left, scope);
          if (expr.operator === 'and') {
            if (!isLuaTruthy(left)) return left;
            return await this.evaluateExpression(expr.right, scope);
          } else if (expr.operator === 'or') {
            if (isLuaTruthy(left)) return left;
            return await this.evaluateExpression(expr.right, scope);
          }
          return null;
        }

        case 'UnaryExpression': {
          const arg = await this.evaluateExpression(expr.argument, scope);
          if (expr.operator === 'not') {
            return !isLuaTruthy(arg);
          }
          if (expr.operator === '-') {
            if (arg instanceof RBXVector3) return arg.neg();
            if (arg instanceof RBXVector2) return arg.neg();
            return -(Number(arg) || 0);
          }
          if (expr.operator === '#') {
            if (typeof arg === 'string') return arg.length;
            if (arg instanceof LuaTable) return arg.length();
            if (Array.isArray(arg)) return arg.length;
            return 0;
          }
          return arg;
        }

        case 'MemberExpression': {
          const base = await this.evaluateExpression(expr.base, scope);
          const prop = expr.identifier.name;

          if (base === null || base === undefined) {
            throw new Error(`attempt to index nil with '${prop}'`);
          }

          if (expr.indexer === ':') {
            // Method call lookup: return a wrapper function binding `base` as first parameter
            return async (...args: any[]) => {
              const method = this.lookupProperty(base, prop);
              if (typeof method !== 'function') {
                throw new Error(`attempt to call a nil value (method '${prop}')`);
              }
              return await method.call(base, ...args);
            };
          }

          return this.lookupProperty(base, prop);
        }

        case 'IndexExpression': {
          const base = await this.evaluateExpression(expr.base, scope);
          const index = await this.evaluateExpression(expr.index, scope);

          if (base === null || base === undefined) {
            throw new Error(`attempt to index nil with '${index}'`);
          }

          if (base instanceof LuaTable) {
            return base.get(index);
          }
          if (base instanceof RBXInstance) {
            return base.getChildOrProperty(String(index));
          }
          return base[index];
        }

        case 'CallExpression': {
          const fn = await this.evaluateExpression(expr.base, scope);
          if (typeof fn !== 'function') {
            const name = expr.base?.identifier?.name || expr.base?.name || 'function';
            throw new Error(`attempt to call a nil value (field '${name}')`);
          }

          const args: any[] = [];
          for (const arg of expr.arguments) {
            const val = await this.evaluateExpression(arg, scope);
            args.push(val);
          }

          return await fn(...args);
        }

        case 'TableCallExpression': {
          const fn = await this.evaluateExpression(expr.base, scope);
          const arg = await this.evaluateExpression(expr.arguments, scope);
          return await fn(arg);
        }

        case 'StringCallExpression': {
          const fn = await this.evaluateExpression(expr.base, scope);
          const strVal = await this.evaluateExpression(expr.argument, scope);
          return await fn(strVal);
        }

        case 'FunctionDeclaration': {
          return this.createFunction(expr.parameters, expr.body, scope);
        }

        default:
          return null;
      }
    } catch (err: any) {
      if (!err.node) err.node = expr;
      throw err;
    }
  }

  private lookupProperty(base: any, prop: string): any {
    if (base instanceof RBXInstance) {
      return base.getChildOrProperty(prop);
    }
    if (base instanceof LuaTable) {
      return base.get(prop);
    }
    return base[prop];
  }

  private applyBinaryOperator(op: string, a: any, b: any): any {
    // 1. Vector3 math
    if (a instanceof RBXVector3) {
      if (op === '+') return a.add(b);
      if (op === '-') return a.sub(b);
      if (op === '*') return a.mul(b);
      if (op === '/') return a.div(b);
      if (op === '==') return a.equals(b);
      if (op === '~=') return !a.equals(b);
    }
    if (b instanceof RBXVector3) {
      if (op === '+') return b.add(a);
      if (op === '*') return b.mul(a);
    }

    // 1b. Vector2 math
    if (a instanceof RBXVector2) {
      if (op === '+') return a.add(b);
      if (op === '-') return a.sub(b);
      if (op === '*') return a.mul(b);
      if (op === '/') return a.div(b);
      if (op === '==') return a.equals(b);
      if (op === '~=') return !a.equals(b);
    }
    if (b instanceof RBXVector2) {
      if (op === '+') return b.add(a);
      if (op === '*') return b.mul(a);
    }

    // 2. Color3 math
    if (a instanceof RBXColor3) {
      if (op === '==') return a.equals(b);
      if (op === '~=') return !a.equals(b);
    }

    // 3. CFrame math
    if (a instanceof RBXCFrame) {
      if (op === '*') return a.mul(b);
      if (op === '+') return a.add(b);
      if (op === '-') return a.sub(b);
    }

    // 4. UDim2 math
    if (a instanceof RBXUDim2) {
      if (op === '+') return a.add(b);
      if (op === '-') return a.sub(b);
      if (op === '==') return a.equals(b);
      if (op === '~=') return !a.equals(b);
    }

    // 5. UDim math
    if (a instanceof RBXUDim) {
      if (op === '+') return a.add(b);
      if (op === '-') return a.sub(b);
      if (op === '==') return a.equals(b);
      if (op === '~=') return !a.equals(b);
    }

    // 6. String concatenation ..
    if (op === '..') {
      return this.stringify(a) + this.stringify(b);
    }

    // 5. Comparison operators
    if (op === '==') {
      if (a?.equals && typeof a.equals === 'function') return a.equals(b);
      return a === b;
    }
    if (op === '~=') {
      if (a?.equals && typeof a.equals === 'function') return !a.equals(b);
      return a !== b;
    }
    if (op === '<') return a < b;
    if (op === '<=') return a <= b;
    if (op === '>') return a > b;
    if (op === '>=') return a >= b;

    // 6. Number arithmetic
    const numA = Number(a) || 0;
    const numB = Number(b) || 0;
    if (op === '+') return numA + numB;
    if (op === '-') return numA - numB;
    if (op === '*') return numA * numB;
    if (op === '/') return numB === 0 ? 0 : numA / numB;
    if (op === '^') return Math.pow(numA, numB);
    if (op === '%') return ((numA % numB) + numB) % numB;

    return null;
  }
}
