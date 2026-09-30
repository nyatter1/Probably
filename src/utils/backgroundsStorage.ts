export interface BackgroundItem {
  id: string;
  name: string;
  creator: string;
  isVerified: boolean;
  price: string;
  numericPrice: number;
  imageUrl: string;
  starsCount: number;
  created: string;
  description: string;
  category: string;
}

export const MARKETPLACE_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'bg_cars',
    name: 'Cars',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/cars.jpeg',
    starsCount: 45210,
    created: 'Jun 9, 2006',
    description: 'Lightning McQueen and Radiator Springs high octane speedway background.',
    category: 'Vehicles',
  },
  {
    id: 'bg_cars2',
    name: 'Cars 2',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/cars2.jpg',
    starsCount: 39850,
    created: 'Jun 24, 2011',
    description: 'World Grand Prix spy adventure and international racing background.',
    category: 'Vehicles',
  },
  {
    id: 'bg_avengers',
    name: 'Avengers',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/avengers.jpg',
    starsCount: 112500,
    created: 'May 4, 2012',
    description: 'Earths Mightiest Heroes assembled ready for battle.',
    category: 'Superheroes',
  },
  {
    id: 'bg_batman_deep_red',
    name: 'Batman Deep Red',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/batman_deep_red.jpg',
    starsCount: 142300,
    created: 'Mar 4, 2022',
    description: 'The Dark Knight watching over Gotham in deep crimson rain reflections.',
    category: 'Superheroes',
  },
  {
    id: 'bg_goku',
    name: 'Goku',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/goku.jpg',
    starsCount: 98400,
    created: 'Feb 26, 1986',
    description: 'Super Saiyan warrior aura and dynamic anime background.',
    category: 'Anime',
  },
  {
    id: 'bg_goku_ui',
    name: 'Goku Ultra Instinct',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/goku_ultra_instinct.jpg',
    starsCount: 135800,
    created: 'Oct 8, 2017',
    description: 'Mastered Ultra Instinct cosmic silver aura with divine godly energy.',
    category: 'Anime',
  },
  {
    id: 'bg_hunter_x_hunter',
    name: 'Hunter x Hunter',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/hunter_x_hunter.jpg',
    starsCount: 89400,
    created: 'Oct 2, 2011',
    description: 'Nen lightning electric aura and mythical hunter trial atmosphere.',
    category: 'Anime',
  },
  {
    id: 'bg_luffy',
    name: 'Monkey D. Luffy',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/luffy.jpg',
    starsCount: 168900,
    created: 'Aug 6, 2023',
    description: 'Sun God Nika Gear 5 joy boy freedom under the full moon.',
    category: 'Anime',
  },
  {
    id: 'bg_gta6',
    name: 'GTA 6',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/gta6.jpg',
    starsCount: 154200,
    created: 'Dec 5, 2023',
    description: 'Vice City neon sunset and high speed palm tree skyline.',
    category: 'Gaming',
  },
  {
    id: 'bg_minecraft_transformers',
    name: 'Minecraft Transformers',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/minecraft_transformers.jpg',
    starsCount: 62100,
    created: 'Oct 15, 2023',
    description: 'Blocky Autobots vs Decepticons epic pixelated showdown.',
    category: 'Gaming',
  },
  {
    id: 'bg_mclaren_mcl_6gt',
    name: 'McLaren MCL 6GT',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/mclaren_mcl_6gt.jpg',
    starsCount: 71300,
    created: 'Nov 18, 2023',
    description: 'Aerodynamic carbon fiber hypercar speeding through midnight city lights.',
    category: 'Vehicles',
  },
  {
    id: 'bg_gargantua',
    name: 'Gargantua Black Hole',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/gargantua.jpg',
    starsCount: 88900,
    created: 'Nov 7, 2014',
    description: 'Deep cosmic singularity and glowing gravitational accretion disk.',
    category: 'Sci-Fi',
  },
  {
    id: 'bg_cherry_blossom',
    name: 'Surreal Cherry Blossom',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/cherry_blossom.jpg',
    starsCount: 76400,
    created: 'Apr 12, 2022',
    description: 'Ethereal pink sakura petals floating over magical neon landscapes.',
    category: 'Aesthetic',
  },
  {
    id: 'bg_windows_11_dark',
    name: 'Windows 11 Dark Abstract',
    creator: 'Rovix',
    isVerified: true,
    price: 'Free',
    numericPrice: 0,
    imageUrl: '/backgrounds/windows_11_dark.png',
    starsCount: 51200,
    created: 'Jun 24, 2021',
    description: 'Sleek dark mode abstract ribbon flow with futuristic lighting.',
    category: 'Minimal',
  },
];

const STORAGE_KEY_OWNED_BACKGROUNDS = 'rovix_owned_backgrounds_v1';
const STORAGE_KEY_EQUIPPED_BACKGROUND = 'rovix_equipped_background_v1';

export function getOwnedBackgroundIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OWNED_BACKGROUNDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveOwnedBackgroundIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY_OWNED_BACKGROUNDS, JSON.stringify(ids));
  } catch {}
}

export function isBackgroundOwned(id: string): boolean {
  return getOwnedBackgroundIds().includes(id);
}

export function buyBackground(id: string): boolean {
  const owned = getOwnedBackgroundIds();
  if (!owned.includes(id)) {
    owned.push(id);
    saveOwnedBackgroundIds(owned);
    return true;
  }
  return false;
}

export function getEquippedBackgroundId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_EQUIPPED_BACKGROUND);
  } catch {}
  return null;
}

export function setEquippedBackgroundId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_EQUIPPED_BACKGROUND, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_EQUIPPED_BACKGROUND);
    }
  } catch {}
}

export function getEquippedBackgroundItem(): BackgroundItem | null {
  const id = getEquippedBackgroundId();
  if (!id) return null;
  return MARKETPLACE_BACKGROUNDS.find((b) => b.id === id) || null;
}
