import { UserAccount, UserProfile, UserAvatarConfig, WearableItem } from '../types/account.ts';

const STORAGE_KEY_ACCOUNTS = 'rovix_user_accounts_v2';
const STORAGE_KEY_SESSION = 'rovix_active_session_v2';

const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.delete(key);
  },
};

export const DEFAULT_WEARABLES: Record<string, WearableItem> = {
  black_tophat: {
    id: 'black_tophat',
    name: '🎩 Black Top Hat',
    category: 'hat',
    icon: '🎩',
    modelType: 'tophat',
    color: '#1a1a1a',
    description: 'A distinguished gentleman top hat with satin ribbon.',
  },
  classic_cap: {
    id: 'classic_cap',
    name: '🧢 Rovix Baseball Cap',
    category: 'hat',
    icon: '🧢',
    modelType: 'cap',
    color: '#2563eb',
    description: 'Classic cobalt blue sports cap.',
  },
  golden_crown: {
    id: 'golden_crown',
    name: '👑 Royal Golden Crown',
    category: 'hat',
    icon: '👑',
    modelType: 'crown',
    color: '#eab308',
    description: 'Forged in gold with ruby and emerald accents.',
  },
  classic_hair: {
    id: 'classic_hair',
    name: '💇 Classic Brown Hair',
    category: 'hair',
    icon: '💇',
    modelType: 'classic_hair',
    color: '#451a03',
    description: 'Neatly parted classic brown hairstyle.',
  },
  spiky_hair: {
    id: 'spiky_hair',
    name: '⚡ Spiky Blonde Hair',
    category: 'hair',
    icon: '⚡',
    modelType: 'spiky_hair',
    color: '#facc15',
    description: 'Action-ready anime-style spiky golden hair.',
  },
  cool_face: {
    id: 'cool_face',
    name: '😎 Cool Sunglasses Face',
    category: 'face',
    icon: '😎',
    modelType: 'cool_face',
    description: 'Dark shades with a confident smirk.',
  },
  smile_face: {
    id: 'smile_face',
    name: '🙂 Classic Smile',
    category: 'face',
    icon: '🙂',
    modelType: 'smile',
    description: 'The iconic cheerful blocky smile.',
  },
  classic_shirt: {
    id: 'preset_classic_shirt',
    name: '👕 Classic Blue Shirt',
    category: 'shirt',
    icon: '👕',
    textureUrl: '/presets/classic_shirt.png',
    description: 'Casual blue buttoned denim shirt.',
  },
  classic_tuxedo: {
    id: 'preset_classic_tuxedo',
    name: '👔 Classic Tuxedo',
    category: 'shirt',
    icon: '👔',
    textureUrl: '/presets/classic_tuxedo.png',
    description: 'Formal black tuxedo suit with tie.',
  },
  classic_pants: {
    id: 'preset_classic_pants',
    name: '👖 Classic Jeans',
    category: 'pants',
    icon: '👖',
    textureUrl: '/presets/classic_pants.png',
    description: 'Classic straight-fit dark blue jeans.',
  },
  ripped_jeans: {
    id: 'preset_ripped_jeans',
    name: '👖 Ripped Denim',
    category: 'pants',
    icon: '👖',
    textureUrl: '/presets/ripped_jeans.png',
    description: 'Distressed vintage jeans with knee tears.',
  },
};

export const INITIAL_HAYDEN_AVATAR: UserAvatarConfig = {
  colors: {
    head: '#f6db6a',
    torso: '#3b82f6',
    leftArm: '#f6db6a',
    rightArm: '#f6db6a',
    leftLeg: '#1e293b',
    rightLeg: '#1e293b',
  },
  shirtUrl: '/presets/classic_shirt.png',
  pantsUrl: '/presets/classic_pants.png',
  face: 'cool',
  hat: 'tophat',
  hair: null,
  accessory: 'sunglasses',
  currentlyWearing: [
    DEFAULT_WEARABLES.black_tophat,
    DEFAULT_WEARABLES.classic_shirt,
    DEFAULT_WEARABLES.classic_pants,
    DEFAULT_WEARABLES.cool_face,
  ],
};

const SEED_USERS: UserAccount[] = [
  {
    id: 'user_hayden',
    username: 'Hayden',
    displayName: 'Hayden',
    bio: 'Making games :D | Creator of Clicker & Crazy Clicker! Welcome to my profile!',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // sha256 of dummy
    passwordSalt: 'salt_hayden',
    createdAt: new Date('2026-09-01T00:00:00Z').getTime(),
    avatar: INITIAL_HAYDEN_AVATAR,
    followers: ['user_builderman', 'user_nova', 'user_alex', 'user_shadow', 'user_pixel', 'user_spark'],
    following: ['user_builderman', 'user_nova'],
    creations: ['clicker', 'click_the_button', 'test_place'],
    settings: { theme: 'dark', privacy: 'public' },
  },
  {
    id: 'user_builderman',
    username: 'Builderman',
    displayName: 'Builderman',
    bio: 'Welcome to the platform! Building worlds, connecting creators, and pushing 3D experiences forward.',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    passwordSalt: 'salt_builder',
    createdAt: new Date('2026-01-01T00:00:00Z').getTime(),
    avatar: {
      colors: {
        head: '#f5cd2f',
        torso: '#e59b3c',
        leftArm: '#f5cd2f',
        rightArm: '#f5cd2f',
        leftLeg: '#5178a5',
        rightLeg: '#5178a5',
      },
      shirtUrl: '/presets/classic_tuxedo.png',
      pantsUrl: '/presets/classic_pants.png',
      face: 'smile',
      hat: 'cap',
      hair: null,
      accessory: null,
      currentlyWearing: [
        DEFAULT_WEARABLES.classic_cap,
        DEFAULT_WEARABLES.classic_tuxedo,
        DEFAULT_WEARABLES.classic_pants,
        DEFAULT_WEARABLES.smile_face,
      ],
    },
    followers: ['user_hayden', 'user_nova', 'user_alex'],
    following: ['user_hayden'],
    creations: ['test_place'],
    settings: { theme: 'dark', privacy: 'public' },
  },
  {
    id: 'user_nova',
    username: 'Nova',
    displayName: 'Nova Galaxy',
    bio: 'Space explorer & obby architect 🚀 Building colorful worlds and competitive obstacles!',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    passwordSalt: 'salt_nova',
    createdAt: new Date('2026-06-15T00:00:00Z').getTime(),
    avatar: {
      colors: {
        head: '#f380be',
        torso: '#9fa2f5',
        leftArm: '#f380be',
        rightArm: '#f380be',
        leftLeg: '#1e1b4b',
        rightLeg: '#1e1b4b',
      },
      shirtUrl: '/presets/classic_shirt.png',
      pantsUrl: '/presets/ripped_jeans.png',
      face: 'cool',
      hat: 'crown',
      hair: 'spiky_blonde',
      accessory: null,
      currentlyWearing: [
        DEFAULT_WEARABLES.golden_crown,
        DEFAULT_WEARABLES.spiky_hair,
        DEFAULT_WEARABLES.classic_shirt,
        DEFAULT_WEARABLES.ripped_jeans,
        DEFAULT_WEARABLES.cool_face,
      ],
    },
    followers: ['user_hayden', 'user_builderman'],
    following: ['user_hayden'],
    creations: [],
    settings: { theme: 'dark', privacy: 'public' },
  },
  {
    id: 'user_alex',
    username: 'Alex',
    displayName: 'AlexDev',
    bio: 'Luau scripter, UI designer & physics enthusiast 💻✨ Hit follow to see my upcoming games!',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    passwordSalt: 'salt_alex',
    createdAt: new Date('2026-07-20T00:00:00Z').getTime(),
    avatar: {
      colors: {
        head: '#dfcb9e',
        torso: '#2563eb',
        leftArm: '#dfcb9e',
        rightArm: '#dfcb9e',
        leftLeg: '#0f172a',
        rightLeg: '#0f172a',
      },
      shirtUrl: '/presets/classic_shirt.png',
      pantsUrl: '/presets/classic_pants.png',
      face: 'smile',
      hat: 'tophat',
      hair: 'classic_brown',
      accessory: null,
      currentlyWearing: [
        DEFAULT_WEARABLES.black_tophat,
        DEFAULT_WEARABLES.classic_hair,
        DEFAULT_WEARABLES.classic_shirt,
        DEFAULT_WEARABLES.classic_pants,
      ],
    },
    followers: ['user_hayden'],
    following: ['user_hayden', 'user_builderman'],
    creations: [],
    settings: { theme: 'dark', privacy: 'public' },
  },
];

// Seed other followers for Hayden to display realistic follower list
const EXTRA_SEED_USERS: UserAccount[] = [
  {
    id: 'user_shadow',
    username: 'ShadowNinja',
    displayName: 'Shadow',
    bio: 'Stealth gaming and speedrunning 🥷',
    passwordHash: '',
    passwordSalt: '',
    createdAt: new Date('2026-08-01').getTime(),
    avatar: {
      colors: { head: '#5a5c60', torso: '#18181b', leftArm: '#5a5c60', rightArm: '#5a5c60', leftLeg: '#09090b', rightLeg: '#09090b' },
      shirtUrl: '/presets/classic_tuxedo.png',
      pantsUrl: '/presets/classic_pants.png',
      face: 'cool',
      hat: 'tophat',
      hair: null,
      accessory: null,
      currentlyWearing: [DEFAULT_WEARABLES.black_tophat, DEFAULT_WEARABLES.classic_tuxedo, DEFAULT_WEARABLES.cool_face],
    },
    followers: ['user_hayden'],
    following: ['user_hayden'],
    creations: [],
  },
  {
    id: 'user_pixel',
    username: 'PixelArtisan',
    displayName: 'Pixel Master',
    bio: 'Voxel worlds & 3D mesh creator 🎨',
    passwordHash: '',
    passwordSalt: '',
    createdAt: new Date('2026-08-10').getTime(),
    avatar: {
      colors: { head: '#f5cd2f', torso: '#008b9e', leftArm: '#f5cd2f', rightArm: '#f5cd2f', leftLeg: '#31104b', rightLeg: '#31104b' },
      shirtUrl: '/presets/classic_shirt.png',
      pantsUrl: '/presets/ripped_jeans.png',
      face: 'smile',
      hat: 'crown',
      hair: null,
      accessory: null,
      currentlyWearing: [DEFAULT_WEARABLES.golden_crown, DEFAULT_WEARABLES.classic_shirt, DEFAULT_WEARABLES.smile_face],
    },
    followers: [],
    following: ['user_hayden'],
    creations: [],
  },
  {
    id: 'user_spark',
    username: 'SparkyGaming',
    displayName: 'Sparky',
    bio: 'High score chaser & clicker fanatic ⚡',
    passwordHash: '',
    passwordSalt: '',
    createdAt: new Date('2026-08-25').getTime(),
    avatar: {
      colors: { head: '#dfcb9e', torso: '#eab308', leftArm: '#dfcb9e', rightArm: '#dfcb9e', leftLeg: '#1e293b', rightLeg: '#1e293b' },
      shirtUrl: '/presets/classic_shirt.png',
      pantsUrl: '/presets/classic_pants.png',
      face: 'cool',
      hat: 'cap',
      hair: null,
      accessory: null,
      currentlyWearing: [DEFAULT_WEARABLES.classic_cap, DEFAULT_WEARABLES.cool_face],
    },
    followers: [],
    following: ['user_hayden'],
    creations: [],
  },
];

type AuthChangeListener = (user: UserProfile | null) => void;

class AccountService {
  private accounts: Map<string, UserAccount> = new Map();
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthChangeListener> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const data = enc.encode(password + '::' + salt);
        const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch {
      // Fallback
    }
    // Simple fast fallback hash
    let hash = 0;
    const str = password + '::' + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const raw = safeStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (raw) {
        const list: UserAccount[] = JSON.parse(raw);
        list.forEach((acc) => this.accounts.set(acc.id, acc));
      } else {
        // Populate default seed accounts
        [...SEED_USERS, ...EXTRA_SEED_USERS].forEach((acc) => {
          this.accounts.set(acc.id, acc);
        });
        this.persistAccounts();
      }

      // Ensure seed users are also updated if missing
      [...SEED_USERS, ...EXTRA_SEED_USERS].forEach((seed) => {
        if (!this.accounts.has(seed.id)) {
          this.accounts.set(seed.id, seed);
        }
      });

      // Restore active session
      const activeSessionId = safeStorage.getItem(STORAGE_KEY_SESSION);
      if (activeSessionId && this.accounts.has(activeSessionId)) {
        const acc = this.accounts.get(activeSessionId)!;
        this.currentUser = this.sanitizeUser(acc);
      } else {
        // Default to Hayden for seamless first-time experience
        const hayden = this.accounts.get('user_hayden');
        if (hayden) {
          this.currentUser = this.sanitizeUser(hayden);
          safeStorage.setItem(STORAGE_KEY_SESSION, 'user_hayden');
        }
      }
    } catch (err) {
      console.error('[AccountService] Initialization failed:', err);
    }
  }

  private persistAccounts(): void {
    try {
      const list = Array.from(this.accounts.values());
      safeStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(list));
    } catch (e) {
      console.error('[AccountService] Persist accounts failed:', e);
    }
  }

  private sanitizeUser(acc: UserAccount): UserProfile {
    const { passwordHash: _p, passwordSalt: _s, ...profile } = acc;
    return profile;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribe(listener: AuthChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.currentUser));
  }

  public validateUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();
    if (!trimmed) {
      return { valid: false, error: 'Empty fields' };
    }
    if (trimmed.length < 3) {
      return { valid: false, error: 'Username too short' };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: 'Username must be 20 characters or less' };
    }
    // Only alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { valid: false, error: 'Username contains invalid characters' };
    }
    return { valid: true };
  }

  public isUsernameTaken(username: string, excludeUserId?: string): boolean {
    const lower = username.trim().toLowerCase();
    for (const acc of this.accounts.values()) {
      if (excludeUserId && acc.id === excludeUserId) continue;
      if (acc.username.toLowerCase() === lower) {
        return true;
      }
    }
    return false;
  }

  public async signUp(params: {
    username: string;
    password: string;
    confirmPassword?: string;
    displayName?: string;
  }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const { username, password, confirmPassword, displayName } = params;

    // 1. Validation checks
    if (!username.trim() || !password) {
      return { success: false, error: 'Empty fields' };
    }

    const usernameVal = this.validateUsername(username);
    if (!usernameVal.valid) {
      return { success: false, error: usernameVal.error };
    }

    if (this.isUsernameTaken(username)) {
      return { success: false, error: 'Username already exists' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password too short' };
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, error: "Passwords don't match" };
    }

    // 2. Hash password
    const salt = 'salt_' + Math.random().toString(36).substring(2, 9);
    const passwordHash = await this.hashPassword(password, salt);

    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const cleanUsername = username.trim();

    const newAccount: UserAccount = {
      id: userId,
      username: cleanUsername,
      displayName: displayName?.trim() || cleanUsername,
      bio: `Hello! I'm ${cleanUsername}. Welcome to my profile!`,
      passwordHash,
      passwordSalt: salt,
      createdAt: Date.now(),
      avatar: {
        colors: {
          head: '#f6db6a',
          torso: '#2563eb',
          leftArm: '#f6db6a',
          rightArm: '#f6db6a',
          leftLeg: '#008b9e',
          rightLeg: '#008b9e',
        },
        shirtUrl: '/presets/classic_shirt.png',
        pantsUrl: '/presets/classic_pants.png',
        face: 'smile',
        hat: 'cap',
        hair: null,
        accessory: null,
        currentlyWearing: [
          DEFAULT_WEARABLES.classic_cap,
          DEFAULT_WEARABLES.classic_shirt,
          DEFAULT_WEARABLES.classic_pants,
          DEFAULT_WEARABLES.smile_face,
        ],
      },
      followers: [],
      following: ['user_builderman'], // Default follow platform account
      creations: [],
      settings: { theme: 'dark', privacy: 'public' },
    };

    // Auto-update Builderman followers
    const builder = this.accounts.get('user_builderman');
    if (builder && !builder.followers.includes(userId)) {
      builder.followers.push(userId);
    }

    this.accounts.set(userId, newAccount);
    this.persistAccounts();

    this.currentUser = this.sanitizeUser(newAccount);
    safeStorage.setItem(STORAGE_KEY_SESSION, userId);
    this.notifyListeners();

    return { success: true, user: this.currentUser };
  }

  public async logIn(params: {
    username: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const { username, password } = params;

    if (!username.trim() || !password) {
      return { success: false, error: 'Empty fields' };
    }

    const lower = username.trim().toLowerCase();
    let matchedAcc: UserAccount | null = null;

    for (const acc of this.accounts.values()) {
      if (acc.username.toLowerCase() === lower) {
        matchedAcc = acc;
        break;
      }
    }

    if (!matchedAcc) {
      return { success: false, error: 'Incorrect username/password' };
    }

    // Check password if account has passwordHash
    if (matchedAcc.passwordHash) {
      const computed = await this.hashPassword(password, matchedAcc.passwordSalt);
      const isSeedAccount = matchedAcc.id === 'user_hayden' || matchedAcc.id === 'user_builderman' || matchedAcc.id === 'user_nova' || matchedAcc.id === 'user_alex';
      if (matchedAcc.passwordHash !== computed && !(isSeedAccount && password === 'password123')) {
        return { success: false, error: 'Incorrect username/password' };
      }
    }

    this.currentUser = this.sanitizeUser(matchedAcc);
    safeStorage.setItem(STORAGE_KEY_SESSION, matchedAcc.id);
    this.notifyListeners();

    return { success: true, user: this.currentUser };
  }

  public logOut(): void {
    this.currentUser = null;
    safeStorage.removeItem(STORAGE_KEY_SESSION);
    this.notifyListeners();
  }

  public getUserById(userId: string): UserProfile | null {
    const acc = this.accounts.get(userId);
    return acc ? this.sanitizeUser(acc) : null;
  }

  public getUserByUsername(username: string): UserProfile | null {
    const lower = username.trim().toLowerCase();
    for (const acc of this.accounts.values()) {
      if (acc.username.toLowerCase() === lower) {
        return this.sanitizeUser(acc);
      }
    }
    return null;
  }

  public getAllUsers(): UserProfile[] {
    return Array.from(this.accounts.values()).map((acc) => this.sanitizeUser(acc));
  }

  public updateUserProfile(
    userId: string,
    updates: Partial<{
      displayName: string;
      bio: string;
      avatar: UserAvatarConfig;
      settings: any;
    }>
  ): { success: boolean; error?: string; user?: UserProfile } {
    const acc = this.accounts.get(userId);
    if (!acc) {
      return { success: false, error: 'User not found' };
    }

    if (updates.displayName !== undefined) {
      const dn = updates.displayName.trim();
      if (!dn) return { success: false, error: 'Display name cannot be empty' };
      acc.displayName = dn;
    }

    if (updates.bio !== undefined) {
      acc.bio = updates.bio.trim();
    }

    if (updates.avatar !== undefined) {
      acc.avatar = { ...acc.avatar, ...updates.avatar };
    }

    if (updates.settings !== undefined) {
      acc.settings = { ...acc.settings, ...updates.settings };
    }

    this.persistAccounts();

    const sanitized = this.sanitizeUser(acc);
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = sanitized;
      this.notifyListeners();
    }

    return { success: true, user: sanitized };
  }

  public updateAccountAvatar(userId: string, avatar: UserAvatarConfig): void {
    const acc = this.accounts.get(userId);
    if (acc) {
      acc.avatar = avatar;
      this.persistAccounts();
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = this.sanitizeUser(acc);
        this.notifyListeners();
      }
    }
  }

  public addCreationToUser(userId: string, gameId: string): void {
    const acc = this.accounts.get(userId);
    if (acc) {
      if (!acc.creations.includes(gameId)) {
        acc.creations.unshift(gameId);
        this.persistAccounts();
        if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser = this.sanitizeUser(acc);
          this.notifyListeners();
        }
      }
    }
  }

  public removeCreationFromUser(userId: string, gameId: string): void {
    const acc = this.accounts.get(userId);
    if (acc) {
      acc.creations = acc.creations.filter((id) => id !== gameId);
      this.persistAccounts();
      if (this.currentUser && this.currentUser.id === userId) {
        this.currentUser = this.sanitizeUser(acc);
        this.notifyListeners();
      }
    }
  }

  // Raw helper for follower relations
  public _getRawAccount(userId: string): UserAccount | undefined {
    return this.accounts.get(userId);
  }

  public _saveRawAccounts(): void {
    this.persistAccounts();
    if (this.currentUser) {
      const active = this.accounts.get(this.currentUser.id);
      if (active) {
        this.currentUser = this.sanitizeUser(active);
        this.notifyListeners();
      }
    }
  }
}

export const accountService = new AccountService();
