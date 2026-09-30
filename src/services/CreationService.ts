import { SavedGame, getSavedGames, saveGame, deleteGame as removeGameFromStorage, updateGameIcon as setStorageGameIcon } from '../utils/gamesStorage.ts';
import { accountService } from './AccountService.ts';

export const GAME_ICON_PRESETS = [
  { id: 'icon_clicker', name: 'Golden Clicker', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', gradient: 'from-amber-500 via-orange-600 to-yellow-400', emoji: '👆' },
  { id: 'icon_obby', name: 'Cyber Obby', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80', gradient: 'from-cyan-500 via-blue-600 to-indigo-900', emoji: '🏃' },
  { id: 'icon_galaxy', name: 'Galaxy Runner', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80', gradient: 'from-purple-600 via-pink-600 to-indigo-800', emoji: '🚀' },
  { id: 'icon_castle', name: 'Medieval Tycoon', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', gradient: 'from-emerald-600 via-teal-700 to-cyan-900', emoji: '🏰' },
  { id: 'icon_arena', name: 'Neon Battle Arena', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80', gradient: 'from-rose-600 via-red-700 to-amber-600', emoji: '⚔️' },
];

class CreationService {
  public getCreationsForUser(userId: string): SavedGame[] {
    const user = accountService.getUserById(userId);
    if (!user) return [];

    const allGames = getSavedGames();
    return allGames.filter((g) => {
      if ((g as any).creatorId === userId) return true;
      if (user.creations && user.creations.includes(g.id)) return true;
      if (g.creator.toLowerCase() === user.username.toLowerCase()) return true;
      return false;
    });
  }

  public getGameById(gameId: string): SavedGame | undefined {
    const allGames = getSavedGames();
    return allGames.find((g) => g.id === gameId);
  }

  public saveGameForUser(userId: string, game: SavedGame): SavedGame {
    const user = accountService.getUserById(userId);
    const creatorName = user ? user.displayName || user.username : game.creator || 'Creator';

    const fullGame: SavedGame = {
      ...game,
      creator: creatorName,
      creatorId: userId,
      updatedAt: Date.now(),
      isPublic: game.isPublic !== undefined ? game.isPublic : true,
    } as any;

    const saved = saveGame(fullGame);
    accountService.addCreationToUser(userId, saved.id);
    return saved;
  }

  public deleteGameForUser(userId: string, gameId: string): void {
    removeGameFromStorage(gameId);
    accountService.removeCreationFromUser(userId, gameId);
  }

  public updateGameIcon(gameId: string, iconUrl: string): void {
    setStorageGameIcon(gameId, iconUrl);
  }

  public createNewGameForUser(userId: string, title = 'New Place'): SavedGame {
    const user = accountService.getUserById(userId);
    const creatorName = user ? user.displayName || user.username : 'Creator';
    const id = 'game_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newGame: SavedGame = {
      id,
      title,
      creator: creatorName,
      creatorId: userId,
      initials: title.slice(0, 2).toUpperCase(),
      gradient: 'from-[#1e1b4b] via-[#31104b] to-[#0f172a]',
      iconUrl: GAME_ICON_PRESETS[0].url,
      isPublic: true,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      parts: [
        {
          id: 'baseplate_part',
          name: 'Baseplate',
          shape: 'block',
          position: [0, -0.5, 0],
          size: [64, 1, 64],
          rotation: [0, 0, 0],
          color: '#343842',
          material: 'SmoothPlastic',
          transparency: 0,
          anchored: true,
          canCollide: true,
        },
        {
          id: 'spawn_part',
          name: 'SpawnLocation',
          shape: 'block',
          position: [0, 0.1, 0],
          size: [6, 0.2, 6],
          rotation: [0, 0, 0],
          color: '#3b82f6',
          material: 'Neon',
          transparency: 0,
          anchored: true,
          canCollide: true,
        },
      ],
      uiTree: [],
    } as any;

    const saved = saveGame(newGame);
    accountService.addCreationToUser(userId, saved.id);
    return saved;
  }
}

export const creationService = new CreationService();
