import { RBXInstance } from '../instances/Instance.ts';
import { RBXPlayer } from './Player.ts';
import { RBXScriptSignal } from '../events/RBXScriptSignal.ts';

export class RBXPlayersService extends RBXInstance {
  LocalPlayer: RBXPlayer;
  private players: RBXPlayer[] = [];

  readonly PlayerAdded = new RBXScriptSignal<RBXPlayer>();
  readonly PlayerRemoving = new RBXScriptSignal<RBXPlayer>();

  constructor() {
    super('Players', 'Players');
    this.LocalPlayer = new RBXPlayer('TestPlayer');
    this.LocalPlayer.Parent = this;
    this.players.push(this.LocalPlayer);
  }

  GetPlayers(): RBXPlayer[] {
    return [...this.players];
  }

  getPlayers(): RBXPlayer[] {
    return this.GetPlayers();
  }

  override IsA(className: string): boolean {
    if (className === 'Players') return true;
    return super.IsA(className);
  }
}
