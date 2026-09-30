import { RBXInstance } from './Instance.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXBindableEvent extends RBXInstance {
  readonly Event = new RBXScriptSignal<any>();

  constructor(name = 'BindableEvent') {
    super('BindableEvent', name);
  }

  Fire(...args: any[]): void {
    this.Event.Fire(...args);
  }

  fire(...args: any[]): void {
    this.Fire(...args);
  }

  override IsA(className: string): boolean {
    if (className === 'BindableEvent') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.Event.DisconnectAll();
    super.Destroy();
  }
}

export class RBXBindableFunction extends RBXInstance {
  OnInvoke?: (...args: any[]) => any;

  constructor(name = 'BindableFunction') {
    super('BindableFunction', name);
  }

  Invoke(...args: any[]): any {
    if (this.OnInvoke) {
      return this.OnInvoke(...args);
    }
    return undefined;
  }

  invoke(...args: any[]): any {
    return this.Invoke(...args);
  }

  override IsA(className: string): boolean {
    if (className === 'BindableFunction') return true;
    return super.IsA(className);
  }
}

export class RBXRemoteEvent extends RBXInstance {
  readonly OnClientEvent = new RBXScriptSignal<any>();
  readonly OnServerEvent = new RBXScriptSignal<any>();

  constructor(name = 'RemoteEvent') {
    super('RemoteEvent', name);
  }

  FireServer(...args: any[]): void {
    this.OnServerEvent.Fire(null, ...args);
  }

  FireClient(player: any, ...args: any[]): void {
    this.OnClientEvent.Fire(...args);
  }

  FireAllClients(...args: any[]): void {
    this.OnClientEvent.Fire(...args);
  }

  override IsA(className: string): boolean {
    if (className === 'RemoteEvent') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.OnClientEvent.DisconnectAll();
    this.OnServerEvent.DisconnectAll();
    super.Destroy();
  }
}
