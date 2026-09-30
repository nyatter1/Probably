import { getStoredInventory, ClothingItem } from './inventoryStorage.ts';

export interface MarketplaceItem {
  id: string;
  name: string;
  creator: string;
  isVerified: boolean;
  type: string;
  placement: string;
  tradable: string;
  created: string;
  starsCount: number;
  isAvailable: boolean;
  isOnSale: boolean;
  numericPrice: number; // In Rovux (0 = Free)
  price: string;
  dataUrl: string;
  clothingType: 'shirt' | 'pants';
  description?: string;
  isOwned?: boolean;
}

export const BASE_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 'neoclassic_shirt',
    name: 'NeoClassic Male v2 - Shirt',
    creator: 'Rovix',
    isVerified: true,
    type: 'Classic Shirts',
    placement: 'Clothing | Classic Shirt',
    tradable: 'No',
    created: 'Jan 28, 2020',
    starsCount: 35912,
    isAvailable: true,
    isOnSale: true,
    numericPrice: 0,
    price: 'Free',
    dataUrl: '/presets/neoclassic_shirt.png',
    clothingType: 'shirt',
    description: 'Classic two-tone zip jacket designed for the NeoClassic avatar package.',
    isOwned: true,
  },
  {
    id: 'classic_shirt',
    name: 'Classic Shirt',
    creator: 'Rovix',
    isVerified: true,
    type: 'Classic Shirts',
    placement: 'Clothing | Classic Shirt',
    tradable: 'No',
    created: 'May 14, 2007',
    starsCount: 128450,
    isAvailable: true,
    isOnSale: true,
    numericPrice: 0,
    price: 'Free',
    dataUrl: '/presets/classic_shirt.png',
    clothingType: 'shirt',
    description: 'Iconic classic black jacket layered over blue graphic tee.',
    isOwned: true,
  },
  {
    id: 'classic_tuxedo',
    name: 'Classic Tuxedo',
    creator: 'Rovix',
    isVerified: true,
    type: 'Classic Shirts',
    placement: 'Clothing | Classic Shirt',
    tradable: 'No',
    created: 'Jul 19, 2008',
    starsCount: 42180,
    isAvailable: true,
    isOnSale: true,
    numericPrice: 0,
    price: 'Free',
    dataUrl: '/presets/classic_tuxedo.png',
    clothingType: 'shirt',
    description: 'Black formal tuxedo suit jacket with necktie for sophisticated avatars.',
    isOwned: true,
  },
  {
    id: 'classic_pants',
    name: 'Classic Jeans',
    creator: 'Rovix',
    isVerified: true,
    type: 'Classic Pants',
    placement: 'Clothing | Classic Pants',
    tradable: 'No',
    created: 'May 14, 2007',
    starsCount: 85210,
    isAvailable: true,
    isOnSale: true,
    numericPrice: 0,
    price: 'Free',
    dataUrl: '/presets/classic_pants.png',
    clothingType: 'pants',
    description: 'Classic dark denim jeans with front pockets and white sneakers.',
    isOwned: true,
  },
  {
    id: 'ripped_jeans',
    name: 'Ripped Jeans',
    creator: 'Rovix',
    isVerified: true,
    type: 'Classic Pants',
    placement: 'Clothing | Classic Pants',
    tradable: 'No',
    created: 'Aug 10, 2013',
    starsCount: 67840,
    isAvailable: true,
    isOnSale: true,
    numericPrice: 0,
    price: 'Free',
    dataUrl: '/presets/ripped_jeans.png',
    clothingType: 'pants',
    description: 'Vintage distressed denim jeans with knee rips and street styling.',
    isOwned: true,
  },
];

const STORAGE_KEY_FAVORITES = 'rovix_marketplace_favorites_v2';

export function getFavoritesMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function saveFavoritesMap(favs: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favs));
  } catch {}
}

export function isItemFavorited(itemId: string): boolean {
  const map = getFavoritesMap();
  return !!map[itemId];
}

export function toggleItemFavorite(itemId: string): boolean {
  const map = getFavoritesMap();
  const next = !map[itemId];
  map[itemId] = next;
  saveFavoritesMap(map);
  return next;
}

function mapClothingItemToMarketplace(item: ClothingItem): MarketplaceItem {
  const isOnSale = item.isOnSale !== false;
  const numPrice = item.price ?? 0;
  const priceStr = !isOnSale ? 'Off Sale' : numPrice === 0 ? 'Free' : `⬢ ${numPrice}`;

  return {
    id: item.id,
    name: item.name,
    creator: item.creator || 'Rovix Creator',
    isVerified: item.isPreset ? true : false,
    type: item.type === 'shirt' ? 'Classic Shirts' : 'Classic Pants',
    placement: item.type === 'shirt' ? 'Clothing | Classic Shirt' : 'Clothing | Classic Pants',
    tradable: 'No',
    created: new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    starsCount: item.isPreset ? (item.type === 'shirt' ? 35912 : 85210) : 12,
    isAvailable: isOnSale,
    isOnSale,
    numericPrice: numPrice,
    price: priceStr,
    dataUrl: item.dataUrl,
    clothingType: item.type,
    description: item.description || 'Custom Rovix classic clothing item.',
    isOwned: true,
  };
}

export function getAllMarketplaceItems(includeOffSale: boolean = false): MarketplaceItem[] {
  const inventory = getStoredInventory();
  const favMap = getFavoritesMap();

  const allItems: MarketplaceItem[] = [];

  // 1. Process preset base items, checking if inventory overrides them
  BASE_MARKETPLACE_ITEMS.forEach((base) => {
    const customInInv =
      inventory.shirts.find((s) => s.id === base.id || s.dataUrl === base.dataUrl) ||
      inventory.pants.find((p) => p.id === base.id || p.dataUrl === base.dataUrl);

    if (customInInv) {
      allItems.push(mapClothingItemToMarketplace(customInInv));
    } else {
      allItems.push(base);
    }
  });

  // 2. Add user uploaded/created custom shirts
  inventory.shirts.forEach((s) => {
    if (!allItems.some((item) => item.dataUrl === s.dataUrl || item.id === s.id)) {
      allItems.push(mapClothingItemToMarketplace(s));
    }
  });

  // 3. Add user uploaded/created custom pants
  inventory.pants.forEach((p) => {
    if (!allItems.some((item) => item.dataUrl === p.dataUrl || item.id === p.id)) {
      allItems.push(mapClothingItemToMarketplace(p));
    }
  });

  // Attach favorites count
  const withFavs = allItems.map((item) => {
    const isFav = !!favMap[item.id];
    return {
      ...item,
      starsCount: item.starsCount + (isFav ? 1 : 0),
    };
  });

  if (includeOffSale) {
    return withFavs;
  }

  // Filter ONLY items currently ON SALE for public marketplace catalog
  return withFavs.filter((item) => item.isOnSale);
}

export function findMarketplaceItemByUrl(url: string | null): MarketplaceItem | undefined {
  if (!url) return undefined;
  const all = getAllMarketplaceItems(true); // include off-sale so user wearing it can view details
  return all.find((item) => item.dataUrl === url || url.includes(item.id));
}

export function formatStarsCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toLocaleString();
}
