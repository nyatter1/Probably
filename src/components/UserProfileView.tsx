import React, { useState, useEffect } from 'react';
import {
  User,
  Play,
  Hammer,
  RotateCw,
  ChevronRight,
  MoreHorizontal,
  Star,
  Bell,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  X,
  Check,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import ProfileBust3D from './profile/ProfileBust3D.tsx';
import ProfileBanner3D from './profile/ProfileBanner3D.tsx';
import ProfileAvatar2D from './profile/ProfileAvatar2D.tsx';
import { AvatarColors } from './AvatarCanvas3D.tsx';
import { SavedGame, CLICK_THE_BUTTON_PLACE } from '../utils/gamesStorage.ts';
import { getStoredInventory } from '../utils/inventoryStorage.ts';
import ClothingDummyPreview from './marketplace/ClothingDummyPreview.tsx';
import MarketplaceItemDetailsView from './marketplace/MarketplaceItemDetailsView.tsx';
import { MarketplaceItem, findMarketplaceItemByUrl } from '../utils/marketplaceItems.ts';

export interface UserProfileViewProps {
  colors: AvatarColors;
  shirtUrl: string | null;
  pantsUrl: string | null;
  backgroundUrl?: string | null;
  savedGames: SavedGame[];
  onPlayGame: (game: SavedGame) => void;
  onOpenStudio: (game?: SavedGame) => void;
  onNavigateToAvatar: () => void;
  onEquipShirt?: (url: string | null) => void;
  onEquipPants?: (url: string | null) => void;
}

const STORAGE_KEY_PROFILE = 'rovix_user_profile_v3';

interface ProfileData {
  displayName: string;
  username: string;
  bio: string;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
}

const DEFAULT_PROFILE: ProfileData = {
  displayName: 'Test123',
  username: '@Test123',
  bio: '',
  friendsCount: 0,
  followersCount: 0,
  followingCount: 0,
};

export default function UserProfileView({
  colors,
  shirtUrl,
  pantsUrl,
  backgroundUrl,
  savedGames,
  onPlayGame,
  onOpenStudio,
  onNavigateToAvatar,
  onEquipShirt,
  onEquipPants,
}: UserProfileViewProps) {
  // Load persistent profile details (Test123 / @Test123)
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const userRaw = localStorage.getItem('rovix_current_user_v1');
      if (userRaw) {
        const userObj = JSON.parse(userRaw);
        if (userObj.username) {
          return {
            displayName: userObj.displayName || userObj.username,
            username: `@${userObj.username}`,
            bio: userObj.bio || `Hello! I'm ${userObj.username} on Rovix!`,
            friendsCount: 0,
            followersCount: 0,
            followingCount: 0,
          };
        }
      }
      const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.displayName) {
          return { ...DEFAULT_PROFILE, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_PROFILE;
  });

  // Edit profile modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState(profile);

  // Bio expanded state (more / less)
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Active profile tab: 'About' or 'Creations' (Screenshot 1 & 2)
  const [activeTab, setActiveTab] = useState<'About' | 'Creations'>('About');

  // Banner view mode: default 3D (Screenshot 1 top-right button)
  const [isBanner3D, setIsBanner3D] = useState(true);

  // Creations view mode: 'list' or 'grid' (Screenshot 2 view toggle)
  const [creationsViewMode, setCreationsViewMode] = useState<'list' | 'grid'>('list');

  // Selected marketplace item for Marketplace Item Details View (Screenshot 2)
  const [selectedMarketplaceItem, setSelectedMarketplaceItem] = useState<MarketplaceItem | null>(null);

  // Selected experience for Details Page (Screenshot 3)
  const [selectedGame, setSelectedGame] = useState<SavedGame | null>(null);

  // Experience interaction states for Details Page
  const [isFavorited, setIsFavorited] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);
  const [likesCount, setLikesCount] = useState(5);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [expSubTab, setExpSubTab] = useState<'About' | 'Store' | 'Servers'>('About');

  // Real clothing inventory
  const inventory = getStoredInventory();

  // ONLY items the avatar is ACTUALLY currently wearing (NO placeholder unequipped items!)
  const wearingItems: { id: string; name: string; type: 'shirt' | 'pants'; url: string; isEquipped: boolean }[] = [];

  if (shirtUrl) {
    const matching = inventory.shirts.find((s) => s.dataUrl === shirtUrl);
    wearingItems.push({
      id: 'equipped_shirt',
      name: matching?.name || 'Classic Shirt',
      type: 'shirt',
      url: shirtUrl,
      isEquipped: true,
    });
  }

  if (pantsUrl) {
    const matching = inventory.pants.find((p) => p.dataUrl === pantsUrl);
    wearingItems.push({
      id: 'equipped_pants',
      name: matching?.name || 'Classic Jeans',
      type: 'pants',
      url: pantsUrl,
      isEquipped: true,
    });
  }

  // Filter real creations: Public experiences for everyone, plus private experiences if viewing own profile
  const currentUserRaw = localStorage.getItem('rovix_current_user_v1');
  const currentUserObj = currentUserRaw ? JSON.parse(currentUserRaw) : null;

  const displayGames = savedGames.filter((g) => {
    if (g.isPublic) return true;
    const isCreator =
      currentUserObj &&
      (g.creatorId === currentUserObj.uid ||
        g.creator === currentUserObj.username ||
        g.creator === currentUserObj.displayName);
    return isCreator;
  });

  const handleSaveProfile = () => {
    setProfile(editForm);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(editForm));
    } catch {}
    setIsEditingProfile(false);
  };

  const handleToggleLike = (type: 'like' | 'dislike') => {
    if (userRating === type) {
      setUserRating(null);
      if (type === 'like') setLikesCount((c) => Math.max(0, c - 1));
      else setDislikesCount((c) => Math.max(0, c - 1));
    } else {
      if (userRating === 'like') setLikesCount((c) => Math.max(0, c - 1));
      if (userRating === 'dislike') setDislikesCount((c) => Math.max(0, c - 1));

      setUserRating(type);
      if (type === 'like') setLikesCount((c) => c + 1);
      else setDislikesCount((c) => c + 1);
    }
  };

  // =========================================================================
  // VIEW 0: MARKETPLACE ITEM DETAILS PAGE (SCREENSHOT 2)
  // =========================================================================
  if (selectedMarketplaceItem) {
    const isEquipped =
      (selectedMarketplaceItem.clothingType === 'shirt' && shirtUrl === selectedMarketplaceItem.dataUrl) ||
      (selectedMarketplaceItem.clothingType === 'pants' && pantsUrl === selectedMarketplaceItem.dataUrl);

    return (
      <MarketplaceItemDetailsView
        item={selectedMarketplaceItem}
        isEquipped={isEquipped}
        avatarColors={colors}
        userShirtUrl={shirtUrl}
        userPantsUrl={pantsUrl}
        onEquipItem={(item) => {
          if (item.clothingType === 'shirt') {
            onEquipShirt?.(shirtUrl === item.dataUrl ? null : item.dataUrl);
          } else {
            onEquipPants?.(pantsUrl === item.dataUrl ? null : item.dataUrl);
          }
        }}
        onBack={() => setSelectedMarketplaceItem(null)}
      />
    );
  }

  // =========================================================================
  // VIEW 1: EXPERIENCE DETAILS PAGE (AUTHENTIC ROBLOX DARK THEME)
  // =========================================================================
  if (selectedGame) {
    return (
      <div className="flex-1 bg-[#191b1d] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Back to Profile Breadcrumb */}
          <button
            type="button"
            onClick={() => setSelectedGame(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>

          {/* Top Hero Section: Thumbnail on left, Details on right */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Game Thumbnail */}
            <div className="w-full md:w-[58%] aspect-[16/10] bg-[#202225] rounded-xl overflow-hidden relative shadow-md border border-neutral-800 shrink-0">
              {selectedGame.iconUrl ? (
                <img
                  src={selectedGame.iconUrl}
                  alt={selectedGame.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${selectedGame.gradient || 'from-[#1e3a5f] to-[#0a1420]'} flex items-center justify-center`}>
                  <span className="text-4xl font-black text-white font-mono">{selectedGame.initials || 'BR'}</span>
                </div>
              )}
            </div>

            {/* Game Info & Action Buttons */}
            <div className="flex-1 w-full flex flex-col justify-between self-stretch py-1">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {selectedGame.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => onOpenStudio(selectedGame)}
                    className="p-1.5 hover:bg-[#282a2e] rounded-md text-neutral-400 hover:text-white transition-colors"
                    title="Edit in Rovix Studio"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-xs text-neutral-300 mt-1 font-semibold">
                  By <span className="hover:underline cursor-pointer">{selectedGame.creator || profile.username}</span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {selectedGame.isPublic ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ● Public Experience
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      🔒 Private Experience
                    </span>
                  )}
                  <span className="text-xs text-neutral-400">
                    Maturity: Minimal • Ages 16+
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {/* Big Blue Play Button (Roblox authentic blue #0055ff) */}
                <button
                  type="button"
                  onClick={() => onPlayGame(selectedGame)}
                  className="w-full bg-[#0055ff] hover:bg-[#0047d9] active:bg-[#003dbb] text-white py-3.5 px-6 rounded-lg font-bold text-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>

                {/* Interaction Row: Favorited, Notify, Ratings */}
                <div className="flex items-center justify-between text-xs text-neutral-300 pt-1 px-1">
                  {/* Favorited */}
                  <button
                    type="button"
                    onClick={() => setIsFavorited(!isFavorited)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        isFavorited ? 'fill-amber-400 text-amber-400' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white">
                      {isFavorited ? 'Favorited' : 'Favorite'}
                    </span>
                  </button>

                  {/* Notify */}
                  <button
                    type="button"
                    onClick={() => setIsNotified(!isNotified)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <Bell
                      className={`w-5 h-5 transition-colors ${
                        isNotified ? 'fill-blue-400 text-blue-400' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white">
                      Notify
                    </span>
                  </button>

                  {/* Ratings Bar: 👍 5 | 👎 0 */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleLike('like')}
                        className={`flex items-center gap-1 font-semibold cursor-pointer ${
                          userRating === 'like' ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${userRating === 'like' ? 'fill-current' : ''}`} />
                        <span>{likesCount}</span>
                      </button>

                      <div className="w-[1px] h-3.5 bg-neutral-700" />

                      <button
                        type="button"
                        onClick={() => handleToggleLike('dislike')}
                        className={`flex items-center gap-1 font-semibold cursor-pointer ${
                          userRating === 'dislike' ? 'text-red-400' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <ThumbsDown className={`w-4 h-4 ${userRating === 'dislike' ? 'fill-current' : ''}`} />
                        <span>{dislikesCount}</span>
                      </button>
                    </div>

                    {/* Progress rating bar */}
                    <div className="w-20 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs: About, Store, Servers */}
          <div className="border-b border-neutral-800 pt-4">
            <div className="flex gap-10 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setExpSubTab('About')}
                className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  expSubTab === 'About'
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setExpSubTab('Store')}
                className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  expSubTab === 'Store'
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Store
              </button>
              <button
                type="button"
                onClick={() => setExpSubTab('Servers')}
                className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  expSubTab === 'Servers'
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                Servers
              </button>
            </div>
          </div>

          {/* About Tab Content */}
          <div className="space-y-4 pt-1">
            <h2 className="text-base font-bold text-white">Description</h2>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl whitespace-pre-line">
              {selectedGame.description || 'Welcome to Button RNG! Press the rainbow button to generate cash and unlock higher tiers. Can you reach $1.8QT? Built with full 3D interactive physics and custom Lua scripts.'}
            </p>

            <div>
              <span className="inline-block px-3 py-1.5 bg-[#232528] text-neutral-300 text-xs font-semibold rounded-md border border-neutral-700/60">
                Maturity: Minimal • Ages 16+
              </span>
            </div>

            {/* Horizontal Stats Table */}
            <div className="border-y border-neutral-800 py-4 mt-6">
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-4 text-center text-xs">
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Active</div>
                  <div className="font-bold text-white">{selectedGame.playingCount || 0}</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Favorites</div>
                  <div className="font-bold text-white">4</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Visits</div>
                  <div className="font-bold text-white">1,411</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Voice Chat</div>
                  <div className="font-bold text-white">Supported</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Camera</div>
                  <div className="font-bold text-white">Supported</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Created</div>
                  <div className="font-bold text-white">6/2/2026</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Updated</div>
                  <div className="font-bold text-white">9/30/2026</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Server Size</div>
                  <div className="font-bold text-white">5</div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1">Genre</div>
                  <div className="font-bold text-white">Simulation</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions: Edit in Studio + Report Abuse */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => onOpenStudio(selectedGame)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#232528] hover:bg-[#2c3035] text-white text-xs font-semibold rounded-md border border-neutral-700/60 transition-colors cursor-pointer"
              >
                <Hammer className="w-3.5 h-3.5 text-blue-400" />
                <span>Open in Rovix Studio</span>
              </button>

              <span className="text-xs text-red-400 font-semibold hover:underline cursor-pointer">
                Report Abuse
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN ROBLOX PROFILE PAGE (AUTHENTIC ROBLOX DARK THEME)
  // =========================================================================
  return (
    <div className="flex-1 bg-[#191b1d] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ================================================================= */}
        {/* 1. TOP BANNER WITH 3D AVATAR & 3D BUTTON (MATCHES DARK THEME)    */}
        {/* ================================================================= */}
        <div className="relative w-full h-64 sm:h-72 rounded-2xl bg-[#222429] border border-neutral-800/80 overflow-hidden flex items-center justify-center shadow-lg">
          {/* Subtle dark ambient gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35 pointer-events-none" />

          {/* Centered Avatar: 3D interactive (default) or 2D render */}
          <div className="w-full h-full relative z-10 flex items-center justify-center">
            {isBanner3D ? (
              <ProfileBanner3D
                colors={colors}
                shirtUrl={shirtUrl}
                pantsUrl={pantsUrl}
                backgroundUrl={backgroundUrl}
                className="w-full h-full"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {backgroundUrl && (
                  <img
                    src={backgroundUrl}
                    alt="Profile Background"
                    className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-75"
                  />
                )}
                <ProfileAvatar2D
                  colors={colors}
                  shirtUrl={shirtUrl}
                  pantsUrl={pantsUrl}
                  height={230}
                  className="filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] relative z-10"
                />
              </div>
            )}
          </div>

          {/* 3D / 2D Toggle Button in top-right of banner */}
          <button
            type="button"
            onClick={() => setIsBanner3D(!isBanner3D)}
            className="absolute top-3.5 right-3.5 px-3 py-1 bg-black/60 hover:bg-black/80 text-white text-xs font-bold rounded-md backdrop-blur-sm border border-white/10 transition-colors cursor-pointer shadow-sm z-20"
            title="Toggle 2D / 3D Avatar"
          >
            {isBanner3D ? '2D' : '3D'}
          </button>
        </div>

        {/* ================================================================= */}
        {/* 2. PROFILE HEADER: AVATAR BUST ON LEFT + USERNAME + BUTTONS      */}
        {/* ================================================================= */}
        <div className="relative -mt-16 sm:-mt-20 px-2 sm:px-4 z-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Circular Profile Icon with Blue User Badge */}
            <div className="relative shrink-0 group">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#202225] border-4 border-[#191b1d] shadow-2xl relative overflow-hidden flex items-center justify-center ring-2 ring-neutral-700/80">
                {backgroundUrl && (
                  <img
                    src={backgroundUrl}
                    alt="Icon Background"
                    className="absolute inset-0 w-full h-full object-cover object-center scale-110 filter brightness-70"
                  />
                )}
                <ProfileBust3D
                  colors={colors}
                  shirtUrl={shirtUrl}
                  className="w-full h-full relative z-10"
                />
              </div>

              {/* Blue person badge on bottom-right of avatar circle */}
              <div
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#00a2ff] border-2 border-[#191b1d] flex items-center justify-center text-white shadow-md z-20"
                title="Online"
              >
                <User className="w-4 h-4 fill-white" />
              </div>
            </div>

            {/* User Info & Action Buttons */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Display Name and Username Handle */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {profile.displayName}
                  </h1>
                  <div className="text-xs sm:text-sm text-neutral-400 mt-0.5 font-medium">
                    {profile.username}
                  </div>
                </div>

                {/* Right side buttons: Edit avatar, Edit profile, ... */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onNavigateToAvatar}
                    className="px-4 py-2 bg-[#2a2d32] hover:bg-[#34373d] text-white text-xs font-semibold rounded-lg border border-neutral-700/70 transition-colors cursor-pointer"
                  >
                    Edit avatar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditForm(profile);
                      setIsEditingProfile(true);
                    }}
                    className="px-4 py-2 bg-[#2a2d32] hover:bg-[#34373d] text-white text-xs font-semibold rounded-lg border border-neutral-700/70 transition-colors cursor-pointer"
                  >
                    Edit profile
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenStudio()}
                    className="p-2 bg-[#2a2d32] hover:bg-[#34373d] text-white rounded-lg border border-neutral-700/70 transition-colors cursor-pointer"
                    title="Open Rovix Studio"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stat Pills: [0 Friends] [0 Followers] [0 Following] (NO fake numbers!) */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="px-3.5 py-1.5 bg-[#232528] text-neutral-300 text-xs font-semibold rounded-full border border-neutral-700/60">
                  {profile.friendsCount} Friends
                </span>
                <span className="px-3.5 py-1.5 bg-[#232528] text-neutral-300 text-xs font-semibold rounded-full border border-neutral-700/60">
                  {profile.followersCount} Followers
                </span>
                <span className="px-3.5 py-1.5 bg-[#232528] text-neutral-300 text-xs font-semibold rounded-full border border-neutral-700/60">
                  {profile.followingCount} Following
                </span>
              </div>

              {/* Bio (clean, no fake bio) */}
              {profile.bio ? (
                <div className="pt-2 text-xs text-neutral-300 leading-relaxed">
                  <div className="whitespace-pre-line font-normal">
                    {isBioExpanded ? profile.bio : profile.bio.split('\n').slice(0, 2).join('\n')}
                  </div>
                  {profile.bio.length > 50 && (
                    <button
                      type="button"
                      onClick={() => setIsBioExpanded(!isBioExpanded)}
                      className="text-xs font-semibold text-blue-400 underline hover:text-blue-300 mt-0.5 cursor-pointer block"
                    >
                      {isBioExpanded ? 'less' : 'more'}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* EDIT PROFILE MODAL (DARK THEME) */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-[#202225] rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-700 text-white">
              <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
                <h3 className="text-base font-bold text-white">Edit Profile</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full bg-[#181a1d] border border-neutral-700 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Username Handle</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-[#181a1d] border border-neutral-700 px-3 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">About (Bio)</label>
                  <textarea
                    rows={4}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full bg-[#181a1d] border border-neutral-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-[#2b2d31] hover:bg-[#34373c] text-neutral-300 font-semibold rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-[#0055ff] hover:bg-[#0047d9] text-white font-semibold rounded-lg text-xs shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. TABS: ABOUT & CREATIONS                                        */}
        {/* ================================================================= */}
        <div className="border-b border-neutral-800 pt-4">
          <div className="flex justify-center gap-16 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('About')}
              className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'About'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('Creations')}
              className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'Creations'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              Creations
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. TAB 1: ABOUT -> CURRENTLY WEARING (ONLY REAL EQUIPPED ITEMS)   */}
        {/* ================================================================= */}
        {activeTab === 'About' ? (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold text-white">Currently Wearing</h2>

            {/* Row of dark theme boxes matching the client */}
            <div className="relative">
              <div className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
                {wearingItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      const mpItem = findMarketplaceItemByUrl(item.url) || {
                        id: item.id,
                        name: item.name,
                        creator: 'Rovix',
                        isVerified: true,
                        type: item.type === 'shirt' ? 'Classic Shirts' : 'Classic Pants',
                        placement: item.type === 'shirt' ? 'Clothing | Classic Shirt' : 'Clothing | Classic Pants',
                        tradable: 'No',
                        created: 'Jan 28, 2020',
                        starsCount: 35912,
                        isAvailable: true,
                        isOnSale: true,
                        numericPrice: 0,
                        price: 'Free',
                        dataUrl: item.url,
                        clothingType: item.type,
                        description: 'Classic clothing item for avatars.',
                      };
                      setSelectedMarketplaceItem(mpItem);
                    }}
                    className="flex flex-col items-start cursor-pointer group shrink-0 w-32 sm:w-36"
                  >
                    {/* Square box with white dummy preview matching Rovix dark theme */}
                    <div className="w-full aspect-square bg-[#1c1e22] group-hover:bg-[#23262b] rounded-xl border border-neutral-800 group-hover:border-neutral-600 overflow-hidden flex items-center justify-center p-1 transition-all shadow-sm relative">
                      <ClothingDummyPreview
                        clothingType={item.type}
                        textureUrl={item.url}
                        className="w-full h-full"
                      />
                      {item.isEquipped && (
                        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#232528]" title="Equipped" />
                      )}
                    </div>

                    {/* Title below box */}
                    <span className="text-xs font-bold text-white mt-2 truncate w-full group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </span>
                  </div>
                ))}

                {/* If user has no custom items equipped, show clean avatar editor link */}
                {wearingItems.length === 0 && (
                  <div
                    onClick={onNavigateToAvatar}
                    className="flex flex-col items-center justify-center w-36 aspect-square bg-[#232528] rounded-xl border border-neutral-800/80 cursor-pointer p-4 text-center hover:bg-[#2b2e34] transition-colors"
                  >
                    <span className="text-xs font-semibold text-neutral-300">Equip Clothes in Avatar Editor</span>
                  </div>
                )}

                {/* Carousel arrow icon on the right */}
                {wearingItems.length > 3 && (
                  <button
                    type="button"
                    onClick={onNavigateToAvatar}
                    className="self-center p-2 rounded-full bg-[#232528] hover:bg-[#2e3136] border border-neutral-700 shadow text-white shrink-0 cursor-pointer ml-2"
                    title="View Avatar Items"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* =============================================================== */
          /* 5. TAB 2: CREATIONS -> EXPERIENCES (DARK THEME)                 */
          /* =============================================================== */
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Experiences</h2>

              {/* View toggle buttons: List view [ ▭ ] vs Grid view [ ☷ ] */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreationsViewMode('list')}
                  className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                    creationsViewMode === 'list'
                      ? 'border-neutral-500 bg-[#2b2e33] text-white'
                      : 'border-neutral-800 bg-[#202225] text-neutral-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCreationsViewMode('grid')}
                  className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                    creationsViewMode === 'grid'
                      ? 'border-neutral-500 bg-[#2b2e33] text-white'
                      : 'border-neutral-800 bg-[#202225] text-neutral-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIST VIEW */}
            {creationsViewMode === 'list' ? (
              <div className="space-y-6">
                {displayGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col sm:flex-row gap-6 items-start group"
                  >
                    {/* Left: Large Thumbnail */}
                    <div
                      onClick={() => setSelectedGame(game)}
                      className="w-full sm:w-80 aspect-[16/10] bg-[#202225] rounded-xl overflow-hidden relative shadow-md border border-neutral-800 shrink-0 cursor-pointer group-hover:border-neutral-600 transition-colors"
                    >
                      {game.iconUrl ? (
                        <img
                          src={game.iconUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${game.gradient || 'from-[#1e3a5f] to-[#0a1420]'} flex items-center justify-center`}>
                          <span className="text-3xl font-black text-white font-mono">{game.initials}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Title + Line + Stats */}
                    <div className="flex-1 w-full pt-1">
                      {/* Title */}
                      <h3
                        onClick={() => setSelectedGame(game)}
                        className="text-xl sm:text-2xl font-bold text-white hover:text-blue-400 cursor-pointer tracking-tight transition-colors"
                      >
                        {game.title}
                      </h3>

                      {/* Horizontal line under title */}
                      <div className="border-b border-neutral-800 w-full my-3" />

                      {/* Stats: Active 0, Visits 1.4K */}
                      <div className="flex items-center gap-12 text-xs pt-1">
                        <div>
                          <div className="text-neutral-400 mb-0.5">Active</div>
                          <div className="font-bold text-white">{game.playingCount || 0}</div>
                        </div>

                        <div>
                          <div className="text-neutral-400 mb-0.5">Visits</div>
                          <div className="font-bold text-white">1.4K</div>
                        </div>
                      </div>

                      {/* Quick Play & Studio links */}
                      <div className="flex items-center gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setSelectedGame(game)}
                          className="px-4 py-2 bg-[#0055ff] hover:bg-[#0047d9] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>View Experience</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenStudio(game)}
                          className="px-3.5 py-2 bg-[#2a2d32] hover:bg-[#34373d] text-white text-xs font-semibold rounded-lg border border-neutral-700/70 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Hammer className="w-3.5 h-3.5 text-blue-400" />
                          <span>Edit in Studio</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {displayGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="group cursor-pointer flex flex-col bg-[#202225] border border-neutral-800 hover:border-neutral-600 rounded-xl overflow-hidden transition-all shadow-sm"
                  >
                    <div className="aspect-[16/10] w-full bg-[#181a1d] relative overflow-hidden">
                      {game.iconUrl ? (
                        <img
                          src={game.iconUrl}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${game.gradient || 'from-[#1e3a5f] to-[#0a1420]'} flex items-center justify-center`}>
                          <span className="text-2xl font-black text-white font-mono">{game.initials}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5">
                      <div className="font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {game.title}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5 truncate">
                        By {game.creator || profile.username}
                      </div>
                      <div className="flex items-center gap-4 text-xs mt-2 text-neutral-400">
                        <span>Active: <strong className="text-white">{game.playingCount || 0}</strong></span>
                        <span>Visits: <strong className="text-white">1.4K</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
