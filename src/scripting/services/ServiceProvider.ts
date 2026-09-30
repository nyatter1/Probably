import { RBXInstance } from '../instances/Instance.ts';
import { RBXWorkspace } from './WorkspaceService.ts';
import { RBXPlayersService } from './PlayersService.ts';
import { RBXTweenService } from './TweenService.ts';
import { RBXRunService } from './RunService.ts';
import { RBXDebrisService } from './DebrisService.ts';
import { RBXCollectionService } from './CollectionService.ts';
import { RBXLightingService } from './LightingService.ts';
import { RBXReplicatedStorageService, RBXServerStorageService } from './ReplicatedStorageService.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXDataModel extends RBXInstance {
  PlaceId = 123456;
  JobId = 'session_' + Math.random().toString(36).substring(2, 9);
  readonly Loaded = new RBXScriptSignal<void>();

  // Registered Singleton Services
  readonly Workspace: RBXWorkspace;
  readonly workspace: RBXWorkspace;
  readonly Players: RBXPlayersService;
  readonly TweenService: RBXTweenService;
  readonly RunService: RBXRunService;
  readonly Debris: RBXDebrisService;
  readonly CollectionService: RBXCollectionService;
  readonly Lighting: RBXLightingService;
  readonly ReplicatedStorage: RBXReplicatedStorageService;
  readonly ServerStorage: RBXServerStorageService;
  readonly StarterGui: RBXInstance;

  private serviceMap = new Map<string, RBXInstance>();

  constructor() {
    super('DataModel', 'game');

    this.Workspace = new RBXWorkspace();
    this.Workspace.Parent = this;
    this.workspace = this.Workspace;

    this.Players = new RBXPlayersService();
    this.Players.Parent = this;

    this.TweenService = new RBXTweenService();
    this.TweenService.Parent = this;

    this.RunService = new RBXRunService();
    this.RunService.Parent = this;

    this.Debris = new RBXDebrisService();
    this.Debris.Parent = this;

    this.CollectionService = new RBXCollectionService();
    this.CollectionService.Parent = this;

    this.Lighting = new RBXLightingService();
    this.Lighting.Parent = this;

    this.ReplicatedStorage = new RBXReplicatedStorageService();
    this.ReplicatedStorage.Parent = this;

    this.ServerStorage = new RBXServerStorageService();
    this.ServerStorage.Parent = this;

    this.StarterGui = new RBXInstance('StarterGui', 'StarterGui');
    this.StarterGui.Parent = this;

    // Register primary services into lookup map (exact name and lowercase)
    const registerService = (service: RBXInstance, ...aliases: string[]) => {
      this.serviceMap.set(service.ClassName, service);
      this.serviceMap.set(service.ClassName.toLowerCase(), service);
      this.serviceMap.set(service.Name, service);
      this.serviceMap.set(service.Name.toLowerCase(), service);
      for (const alias of aliases) {
        this.serviceMap.set(alias, service);
        this.serviceMap.set(alias.toLowerCase(), service);
      }
    };

    registerService(this.Workspace, 'WorkspaceService');
    registerService(this.Players, 'PlayersService');
    registerService(this.TweenService);
    registerService(this.RunService);
    registerService(this.Debris, 'DebrisService');
    registerService(this.CollectionService);
    registerService(this.Lighting, 'LightingService');
    registerService(this.ReplicatedStorage);
    registerService(this.ServerStorage);
    registerService(this.StarterGui);
  }

  GetService(name: string): RBXInstance {
    if (name === null || name === undefined || typeof name !== 'string') {
      throw new Error('GetService requires a string service name argument');
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error('GetService requires a non-empty service name');
    }

    // 1. Direct or lowercase lookup in registered singletons
    const found = this.serviceMap.get(trimmed) || this.serviceMap.get(trimmed.toLowerCase());
    if (found) {
      return found;
    }

    // 2. Standard Roblox known services lazy instantiation
    const standardServices: Record<string, string> = {
      soundservice: 'SoundService',
      httpservice: 'HttpService',
      userinputservice: 'UserInputService',
      contextactionservice: 'ContextActionService',
      marketplaceservice: 'MarketplaceService',
      teleportservice: 'TeleportService',
      chat: 'Chat',
      teams: 'Teams',
      startergui: 'StarterGui',
      starterpack: 'StarterPack',
      starterplayerscripts: 'StarterPlayerScripts',
      startercharacterscripts: 'StarterCharacterScripts',
      replicatedfirst: 'ReplicatedFirst',
    };

    const key = trimmed.toLowerCase();
    if (key in standardServices) {
      const canonicalName = standardServices[key];
      const newService = new RBXInstance(canonicalName, canonicalName);
      newService.Parent = this;
      this.serviceMap.set(canonicalName, newService);
      this.serviceMap.set(key, newService);
      return newService;
    }

    throw new Error(`Service '${name}' is not a valid service name`);
  }

  getService(name: string): RBXInstance {
    return this.GetService(name);
  }

  IsLoaded(): boolean {
    return true;
  }

  isLoaded(): boolean {
    return true;
  }

  override IsA(className: string): boolean {
    if (className === 'DataModel') return true;
    return super.IsA(className);
  }

  override Destroy(): void {
    this.Loaded.DisconnectAll();
    this.Debris.clearAll();
    RBXTweenService.cancelAll();
    this.RunService.setRunning(false);
    super.Destroy();
  }
}
