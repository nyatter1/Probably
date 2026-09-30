import { AvatarColors } from '../components/AvatarCanvas3D.tsx';

export interface ClothingItem {
  id: string;
  name: string;
  description: string;
  type: 'shirt' | 'pants';
  dataUrl: string;
  createdAt: number;
  isPreset?: boolean;
  isOnSale?: boolean;
  price?: number; // Rovux (0 = Free)
  creator?: string;
  cloudinaryUrl?: string;
}

const STORAGE_KEY_INVENTORY = 'rovix_clothing_inventory_v3';
const STORAGE_KEY_AVATAR = 'rovix_saved_avatar_v3';

// Only the clean normal basic shirt and pants owned
export const INITIAL_SHIRTS: ClothingItem[] = [
  {
    id: 'basic_classic_shirt',
    name: 'Classic Basic Shirt',
    description: 'Standard basic shirt template for all avatars.',
    type: 'shirt',
    dataUrl: '/presets/classic_shirt.png',
    createdAt: 1,
    isPreset: true,
    isOnSale: false,
    price: 0,
    creator: 'Rovix',
  },
];

export const INITIAL_PANTS: ClothingItem[] = [
  {
    id: 'basic_classic_pants',
    name: 'Classic Basic Jeans',
    description: 'Standard basic denim jeans template for all avatars.',
    type: 'pants',
    dataUrl: '/presets/classic_pants.png',
    createdAt: 2,
    isPreset: true,
    isOnSale: false,
    price: 0,
    creator: 'Rovix',
  },
];

export function getStoredInventory(): { shirts: ClothingItem[]; pants: ClothingItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INVENTORY);
    if (!raw) {
      return { shirts: INITIAL_SHIRTS, pants: INITIAL_PANTS };
    }
    const parsed = JSON.parse(raw);
    const shirts: ClothingItem[] = Array.isArray(parsed.shirts) ? parsed.shirts : INITIAL_SHIRTS;
    const pants: ClothingItem[] = Array.isArray(parsed.pants) ? parsed.pants : INITIAL_PANTS;
    
    // Ensure default basic items are available
    if (shirts.length === 0) shirts.push(INITIAL_SHIRTS[0]);
    if (pants.length === 0) pants.push(INITIAL_PANTS[0]);

    return { shirts, pants };
  } catch (e) {
    console.error('Failed to load inventory from storage:', e);
    return { shirts: INITIAL_SHIRTS, pants: INITIAL_PANTS };
  }
}

export function saveStoredInventory(inventory: { shirts: ClothingItem[]; pants: ClothingItem[] }) {
  try {
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
  } catch (e) {
    console.error('Failed to save inventory to storage:', e);
  }
}

export function addClothingToInventory(item: Omit<ClothingItem, 'id' | 'createdAt'>): ClothingItem {
  const inventory = getStoredInventory();
  const newItem: ClothingItem = {
    ...item,
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: Date.now(),
    isOnSale: item.isOnSale ?? true,
    price: item.price ?? 0,
    creator: item.creator || 'You',
  };

  if (item.type === 'shirt') {
    inventory.shirts.unshift(newItem);
  } else {
    inventory.pants.unshift(newItem);
  }

  saveStoredInventory(inventory);
  return newItem;
}

export function updateClothingInInventory(itemOrId: ClothingItem | string, maybeUpdates?: Partial<ClothingItem>): ClothingItem | null {
  const inventory = getStoredInventory();
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  const updates = typeof itemOrId === 'string' ? maybeUpdates || {} : itemOrId;

  const sIdx = inventory.shirts.findIndex((s) => s.id === id);
  if (sIdx >= 0) {
    inventory.shirts[sIdx] = { ...inventory.shirts[sIdx], ...updates };
    saveStoredInventory(inventory);
    return inventory.shirts[sIdx];
  }

  const pIdx = inventory.pants.findIndex((p) => p.id === id);
  if (pIdx >= 0) {
    inventory.pants[pIdx] = { ...inventory.pants[pIdx], ...updates };
    saveStoredInventory(inventory);
    return inventory.pants[pIdx];
  }

  return null;
}

export const updateClothingItem = updateClothingInInventory;

export function deleteClothingFromInventory(id: string, type: 'shirt' | 'pants') {
  const inventory = getStoredInventory();
  if (type === 'shirt') {
    inventory.shirts = inventory.shirts.filter((s) => s.id !== id);
  } else {
    inventory.pants = inventory.pants.filter((p) => p.id !== id);
  }
  saveStoredInventory(inventory);
}

export interface SavedAvatarState {
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
}

export const DEFAULT_AVATAR_COLORS: AvatarColors = {
  head: '#f5cd30',
  torso: '#0d69ac',
  leftArm: '#f5cd30',
  rightArm: '#f5cd30',
  leftLeg: '#a1c48c',
  rightLeg: '#a1c48c',
};

export function getSavedAvatar(): SavedAvatarState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVATAR);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        colors: parsed.colors || DEFAULT_AVATAR_COLORS,
        shirtUrl: parsed.shirtUrl ?? INITIAL_SHIRTS[0].dataUrl,
        pantsUrl: parsed.pantsUrl ?? INITIAL_PANTS[0].dataUrl,
      };
    }
  } catch (e) {
    console.error('Failed to load saved avatar:', e);
  }

  return {
    colors: DEFAULT_AVATAR_COLORS,
    shirtUrl: INITIAL_SHIRTS[0].dataUrl,
    pantsUrl: INITIAL_PANTS[0].dataUrl,
  };
}

export function saveAvatarState(state: SavedAvatarState) {
  try {
    localStorage.setItem(STORAGE_KEY_AVATAR, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save avatar state:', e);
  }
}

export const saveAvatarToStorage = saveAvatarState;
