import { AvatarColors } from '../components/AvatarCanvas3D.tsx';

export interface WearableItem {
  id: string;
  name: string;
  category: 'hat' | 'hair' | 'face' | 'shirt' | 'pants' | 'accessory';
  icon: string; // emoji or icon path
  color?: string;
  textureUrl?: string;
  modelType?: 'tophat' | 'cap' | 'beanie' | 'crown' | 'fedora' | 'spiky_hair' | 'classic_hair' | 'sunglasses' | 'smile' | 'cool_face' | 'swords';
  description?: string;
}

export interface UserAvatarConfig {
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  face: string; // 'smile' | 'cool' | 'determined' | 'happy'
  hat: string | null; // e.g. 'tophat' | 'cap' | 'crown' | 'fedora' | null
  hair: string | null; // e.g. 'classic_brown' | 'spiky_blonde' | null
  accessory: string | null; // e.g. 'sunglasses' | 'swords' | null
  currentlyWearing: WearableItem[];
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: number; // timestamp
  avatar: UserAvatarConfig;
  followers: string[]; // user IDs
  following: string[]; // user IDs
  creations: string[]; // game IDs
  settings?: {
    theme?: 'dark' | 'midnight' | 'neon';
    privacy?: 'public' | 'followers';
  };
}

export interface UserAccount extends UserProfile {
  passwordHash: string; // SHA-256 hashed password with salt
  passwordSalt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: number;
}
