import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Gamepad2,
  Shirt,
  BarChart3,
  Search,
  Bell,
  ArrowLeft,
  Upload,
  Plus,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronDown,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon
} from 'lucide-react';
import {
  ClothingItem,
  getStoredInventory,
  addClothingToInventory,
  saveStoredInventory
} from '../utils/inventoryStorage.ts';
import { uploadToCloudinary } from '../utils/cloudinary.ts';
import {
  SavedGame,
  getSavedGames,
  saveGame,
  deleteGame,
  toggleGamePublic,
  updateGameIcon,
  subscribeToLiveGames
} from '../utils/gamesStorage.ts';
import { validateRobloxTemplate } from '../utils/robloxClothingUV.ts';
import RovixStudioEditor from './RovixStudioEditor.tsx';
import { AvatarColors } from './AvatarCanvas3D.tsx';
import { accountService } from '../services/AccountService.ts';

interface RovixStudioProps {
  onBackToApp: () => void;
  onEquipClothing: (type: 'shirt' | 'pants', url: string) => void;
  activeShirtUrl: string | null;
  activePantsUrl: string | null;
  avatarColors: AvatarColors;
  onPlayGame: (game: SavedGame) => void;
}

export default function RovixStudio({
  onBackToApp,
  onEquipClothing,
  activeShirtUrl,
  activePantsUrl,
  avatarColors,
  onPlayGame,
}: RovixStudioProps) {
  // Navigation: 'experiences' | 'avatar_items' | 'upload_asset' | 'analytics'
  const [activeSection, setActiveSection] = useState<
    'experiences' | 'avatar_items' | 'upload_asset' | 'analytics'
  >('experiences');

  // Active in-browser 3D Studio Editor state
  const [editingGame, setEditingGame] = useState<SavedGame | null>(null);

  // Avatar items subfilter
  const [classicsFilter, setClassicsFilter] = useState<'shirt' | 'pants'>('shirt');

  // Upload Asset Form State
  const [uploadType, setUploadType] = useState<'shirt' | 'pants'>('shirt');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('Classic clothing template');
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [selectedFileError, setSelectedFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // Experience Thumbnail upload modal state
  const [thumbnailGameId, setThumbnailGameId] = useState<string | null>(null);

  // Storage states
  const [inventory, setInventory] = useState(getStoredInventory());
  const [games, setGames] = useState<SavedGame[]>(getSavedGames());

  useEffect(() => {
    const unsub = subscribeToLiveGames((liveGames) => {
      setGames(liveGames);
    });
    return () => unsub();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const refreshGames = () => {
    setGames(getSavedGames());
  };

  const refreshInventory = () => {
    setInventory(getStoredInventory());
  };

  const handleStartUpload = (type: 'shirt' | 'pants') => {
    setUploadType(type);
    setUploadName(type === 'shirt' ? 'My Custom Shirt' : 'My Custom Pants');
    setUploadDescription(type === 'shirt' ? 'Shirt' : 'Pants');
    setSelectedImageDataUrl(null);
    setSelectedFileError(null);
    setActiveSection('upload_asset');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await validateRobloxTemplate(file);
    if (!result.valid) {
      setSelectedFileError(result.error || 'Invalid file format');
      return;
    }

    setSelectedFileError(null);
    setSelectedImageDataUrl(result.dataUrl);
    if (!uploadName || uploadName === 'My Custom Shirt' || uploadName === 'My Custom Pants') {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setUploadName(cleanName.substring(0, 50));
    }
  };

  const handleSubmitUpload = async () => {
    if (!selectedImageDataUrl) {
      setSelectedFileError('Please select a PNG template file to upload.');
      return;
    }
    if (!uploadName.trim()) {
      setSelectedFileError('Please provide a name for this asset.');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalUrl = selectedImageDataUrl;
      try {
        const cloudUrl = await uploadToCloudinary(selectedImageDataUrl, 'clothing');
        if (cloudUrl) finalUrl = cloudUrl;
      } catch (cloudErr) {
        console.warn('Cloudinary upload fallback to dataUrl:', cloudErr);
      }

      const newItem = addClothingToInventory({
        name: uploadName.trim(),
        description: uploadDescription.trim() || (uploadType === 'shirt' ? 'Shirt' : 'Pants'),
        type: uploadType,
        dataUrl: finalUrl,
        cloudinaryUrl: finalUrl.startsWith('http') ? finalUrl : undefined,
      });

      refreshInventory();
      setIsSubmitting(false);
      setUploadSuccessToast(
        `"${newItem.name}" uploaded to Cloudinary & saved to inventory!`
      );
      setTimeout(() => setUploadSuccessToast(null), 4000);

      setClassicsFilter(uploadType);
      setActiveSection('avatar_items');
    } catch (err: any) {
      setIsSubmitting(false);
      setSelectedFileError(err.message || 'Failed to upload asset.');
    }
  };

  const handleDeleteItem = (id: string, type: 'shirt' | 'pants') => {
    const cur = getStoredInventory();
    if (type === 'shirt') {
      cur.shirts = cur.shirts.filter((item) => item.id !== id);
    } else {
      cur.pants = cur.pants.filter((item) => item.id !== id);
    }
    saveStoredInventory(cur);
    refreshInventory();
  };

  // Thumbnail change via Cloudinary
  const handleThumbnailSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !thumbnailGameId) return;

    try {
      let finalUrl = '';
      try {
        finalUrl = await uploadToCloudinary(file, 'game_thumbnails');
      } catch {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateGameIcon(thumbnailGameId, event.target?.result as string);
          refreshGames();
          setThumbnailGameId(null);
        };
        reader.readAsDataURL(file);
        return;
      }

      updateGameIcon(thumbnailGameId, finalUrl);
      refreshGames();
      setThumbnailGameId(null);
      setUploadSuccessToast('Experience icon uploaded to Cloudinary!');
      setTimeout(() => setUploadSuccessToast(null), 3000);
    } catch (err) {
      console.error('Thumbnail upload error:', err);
    }
  };

  // Public / Private toggle
  const handleTogglePublic = (game: SavedGame) => {
    const nextPublic = !game.isPublic;
    toggleGamePublic(game.id, nextPublic);
    refreshGames();
    setUploadSuccessToast(
      `"${game.title}" is now ${nextPublic ? 'PUBLIC (visible on Homepage)' : 'PRIVATE (hidden from Homepage)'}.`
    );
    setTimeout(() => setUploadSuccessToast(null), 3500);
  };

  const handleCreateNewExperience = () => {
    const user = accountService.getCurrentUser();
    const creatorName = user ? user.displayName || user.username : 'Creator';
    const creatorId = user ? user.id : undefined;

    const newPlace: SavedGame = {
      id: 'game_' + Date.now(),
      title: 'New Experience ' + (games.length + 1),
      creator: creatorName,
      creatorId,
      initials: 'NE',
      gradient: 'from-[#1e3a5f] via-[#12233a] to-[#0a1420]',
      isPublic: true,
      updatedAt: Date.now(),
      parts: [
        {
          id: 'part_start',
          name: 'Platform',
          shape: 'block',
          position: [0, 1.5, 0],
          size: [8, 3, 8],
          rotation: [0, 0, 0],
          color: '#0d69ac',
          material: 'Plastic',
          transparency: 0,
          anchored: true,
          canCollide: true,
        },
      ],
    } as any;
    saveGame(newPlace);
    if (creatorId) {
      accountService.addCreationToUser(creatorId, newPlace.id);
    }
    refreshGames();
    setEditingGame(newPlace);
  };

  // IF USER IS IN 3D STUDIO EDITOR
  if (editingGame) {
    return (
      <RovixStudioEditor
        initialGame={editingGame}
        avatarColors={avatarColors}
        shirtUrl={activeShirtUrl}
        pantsUrl={activePantsUrl}
        onBackToDashboard={() => {
          refreshGames();
          setEditingGame(null);
        }}
      />
    );
  }

  const currentItemsList =
    classicsFilter === 'shirt' ? inventory.shirts : inventory.pants;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#111215] text-[#e3e5e8] font-sans antialiased overflow-hidden select-none">
      {/* Hidden file input for thumbnail */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleThumbnailSelect}
        className="hidden"
      />

      {/* 1. STUDIO TOP BAR */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-[#212328] bg-[#14161a] shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBackToApp}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white px-2.5 py-1.5 rounded bg-[#1e2025] hover:bg-[#282b31] border border-neutral-700/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Rovix</span>
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-800">
            <Menu className="w-5 h-5 text-neutral-400 cursor-pointer hover:text-white" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Rovix Studio</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Creator Hub
              </span>
            </h1>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e2025] border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer">
            <Search className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1e2025] border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer">
            <Bell className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2a2d33] border border-neutral-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
            T
          </div>
        </div>
      </header>

      {/* 2. BODY LAYOUT: Studio Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT CREATOR SIDEBAR */}
        <aside className="w-56 bg-[#14161a] border-r border-[#212328] flex flex-col justify-between py-4 px-3 shrink-0 z-20">
          <div className="space-y-6">
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Creations
              </div>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveSection('experiences')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors text-left ${
                    activeSection === 'experiences'
                      ? 'bg-[#22252a] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1b1d22]'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 shrink-0" />
                  <span>Experiences ({games.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('avatar_items')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-colors text-left ${
                    activeSection === 'avatar_items' || activeSection === 'upload_asset'
                      ? 'bg-[#22252a] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1b1d22]'
                  }`}
                >
                  <Shirt className="w-4 h-4 shrink-0" />
                  <span>Avatar items</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('analytics')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors text-left ${
                    activeSection === 'analytics'
                      ? 'bg-[#22252a] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-[#1b1d22]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span>Analytics</span>
                  </div>
                  <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                    Soon
                  </span>
                </button>
              </nav>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/70">
            <button
              type="button"
              onClick={onBackToApp}
              className="w-full py-2 px-3 bg-[#1e2025] hover:bg-[#282b31] text-neutral-300 hover:text-white text-xs font-medium rounded flex items-center justify-center gap-2 border border-neutral-700/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to App</span>
            </button>
          </div>
        </aside>

        {/* MAIN STUDIO VIEWPORT */}
        <main className="flex-1 bg-[#0d0e11] overflow-y-auto p-6 sm:p-8">
          {uploadSuccessToast && (
            <div className="fixed top-16 right-6 z-50 bg-[#1e232a] border border-emerald-500/60 text-emerald-300 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessToast}</span>
            </div>
          )}

          {/* VIEW 1: EXPERIENCES */}
          {activeSection === 'experiences' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs shadow-sm">
                    My Experiences ({games.length})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNewExperience}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-md shadow flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create in Studio</span>
                  </button>
                </div>
              </div>

              {/* Saved Places List */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Experiences & Places
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="bg-[#16181d] border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl flex flex-col justify-between transition-all shadow-md group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Game Icon / Thumbnail with Change Icon button */}
                        <div className="relative w-20 h-20 bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden shrink-0 group/icon">
                          {g.iconUrl ? (
                            <img
                              src={g.iconUrl}
                              alt={g.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${g.gradient} flex items-center justify-center font-black text-xl text-white font-mono`}>
                              {g.initials}
                            </div>
                          )}

                          {/* Hover Overlay: Change Icon */}
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnailGameId(g.id);
                              thumbnailInputRef.current?.click();
                            }}
                            title="Change Experience Icon"
                            className="absolute inset-0 bg-black/70 opacity-0 group-hover/icon:opacity-100 flex flex-col items-center justify-center text-[10px] text-white transition-opacity cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4 mb-0.5" />
                            <span>Change Icon</span>
                          </button>
                        </div>

                        {/* Game Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white truncate">{g.title}</h3>
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            By {g.creator} • {g.parts?.length || 0} parts
                          </div>

                          {/* Public / Private toggle button */}
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePublic(g)}
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                                g.isPublic
                                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60'
                                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                              }`}
                            >
                              {g.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{g.isPublic ? 'Public (On Homepage)' : 'Private (Hidden)'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingGame(g)}
                            className="px-3.5 py-1.5 bg-[#25282f] hover:bg-[#32363f] text-white text-xs font-semibold rounded border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Edit in Studio</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onPlayGame(g)}
                            className="px-3.5 py-1.5 bg-[#2a6839] hover:bg-[#347d46] text-white text-xs font-semibold rounded border border-[#3e9354] transition-colors cursor-pointer"
                          >
                            Play
                          </button>
                        </div>

                        {g.id !== 'test_place' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete "${g.title}"?`)) {
                                deleteGame(g.id);
                                refreshGames();
                              }
                            }}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                            title="Delete Experience"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create an Experience in Studio Prompt */}
              <div className="mt-8 border border-neutral-800 rounded-xl p-10 bg-[#14161a] flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#1e2026] border border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-300 shadow-xl mb-4">
                  <Gamepad2 className="w-8 h-8" />
                </div>

                <h2 className="text-lg font-bold text-white tracking-tight mb-1">
                  Design in Rovix Studio
                </h2>
                <p className="text-xs text-neutral-400 max-w-md mb-5 leading-relaxed">
                  Place 3D parts, move, rotate, scale, color them, adjust collision & anchored physics, and play test in real-time.
                </p>

                <button
                  type="button"
                  onClick={handleCreateNewExperience}
                  className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create in Studio</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: AVATAR ITEMS LIST */}
          {activeSection === 'avatar_items' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Menu className="w-5 h-5 text-neutral-400" />
                  <h2 className="text-lg font-bold text-white">Avatar items</h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStartUpload(classicsFilter)}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-bold text-xs rounded-md shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Asset</span>
                  </button>
                </div>
              </div>

              {/* Subtabs for Classics (Shirt & Pants only) */}
              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => setClassicsFilter('shirt')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    classicsFilter === 'shirt'
                      ? 'bg-white text-black'
                      : 'bg-[#181a1f] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Classic Shirts ({inventory.shirts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setClassicsFilter('pants')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                    classicsFilter === 'pants'
                      ? 'bg-white text-black'
                      : 'bg-[#181a1f] text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  Classic Pants ({inventory.pants.length})
                </button>
              </div>

              {/* Inventory Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    Showing {classicsFilter === 'shirt' ? 'Classic Shirts' : 'Classic Pants'}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Free Uploads • Saved in Inventory
                  </span>
                </div>

                {currentItemsList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {currentItemsList.map((item) => {
                      const isEquipped =
                        item.type === 'shirt'
                          ? activeShirtUrl === item.dataUrl
                          : activePantsUrl === item.dataUrl;

                      return (
                        <div
                          key={item.id}
                          className={`bg-[#16181d] border rounded-lg overflow-hidden flex flex-col justify-between group transition-all ${
                            isEquipped
                              ? 'border-blue-500 shadow-md ring-1 ring-blue-500/50'
                              : 'border-neutral-800 hover:border-neutral-600'
                          }`}
                        >
                          <div className="aspect-square w-full bg-[#1e2025] relative p-3 flex items-center justify-center overflow-hidden">
                            <img
                              src={item.dataUrl}
                              alt={item.name}
                              className="w-full h-full object-contain pixelated"
                            />

                            {isEquipped && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold shadow">
                                Equipped
                              </div>
                            )}

                            {!item.isPreset && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(item.id, item.type);
                                }}
                                title="Delete from inventory"
                                className="absolute bottom-2 right-2 p-1.5 rounded bg-black/60 hover:bg-red-950 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="p-3 space-y-2">
                            <div>
                              <div className="text-xs font-bold text-white truncate">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-neutral-400 truncate">
                                {item.description}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                onEquipClothing(item.type, item.dataUrl);
                                setUploadSuccessToast(`Equipped "${item.name}" on your avatar!`);
                                setTimeout(() => setUploadSuccessToast(null), 3000);
                              }}
                              className={`w-full py-1.5 text-xs font-semibold rounded transition-colors ${
                                isEquipped
                                  ? 'bg-[#25282f] text-neutral-300 border border-neutral-700'
                                  : 'bg-white hover:bg-neutral-200 text-black shadow-sm'
                              }`}
                            >
                              {isEquipped ? 'Wearing' : 'Wear on Avatar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-neutral-800 rounded-xl p-12 bg-[#14161a] flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-[#1e2026] border border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-300 shadow-xl mb-4">
                      <Shirt className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Add avatar items</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mb-6">
                      Publish and store your classic clothing templates in your inventory.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStartUpload(classicsFilter)}
                      className="px-5 py-2 bg-white text-black font-bold text-xs rounded shadow"
                    >
                      Upload Asset
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: UPLOAD ASSET FORM */}
          {activeSection === 'upload_asset' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 pb-2 border-b border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveSection('avatar_items')}
                  className="p-1.5 rounded hover:bg-[#202227] text-neutral-400 hover:text-white transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white">Upload Asset</h2>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Asset Type
                </label>
                <div className="relative">
                  <select
                    value={uploadType}
                    onChange={(e) => {
                      const newType = e.target.value as 'shirt' | 'pants';
                      setUploadType(newType);
                      setUploadDescription(newType === 'shirt' ? 'Shirt' : 'Pants');
                    }}
                    className="w-full bg-[#181a1f] border border-blue-500/90 rounded px-3 py-2 text-sm text-white focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="shirt">Shirt</option>
                    <option value="pants">Pants</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <div className="text-[11px] text-blue-400 underline cursor-pointer hover:text-blue-300">
                  Learn More
                </div>
              </div>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/bmp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-start gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-28 h-28 bg-[#181a1f] border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group shrink-0 relative"
                  >
                    {selectedImageDataUrl ? (
                      <img
                        src={selectedImageDataUrl}
                        alt="Preview"
                        className="w-full h-full object-contain pixelated"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-neutral-500 group-hover:text-neutral-300">
                        <Plus className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-1.5 bg-[#25282f] hover:bg-[#32363f] text-white font-semibold rounded border border-neutral-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Upload
                    </button>
                    <div className="text-neutral-400 text-[11px] space-y-0.5">
                      <div>Format: *.jpg, *.png, *.tga, *.bmp</div>
                      <div>Max size per file: 20 MB</div>
                      <div className="text-neutral-500">Image will be visible to others after moderation.</div>
                    </div>
                  </div>
                </div>

                {selectedFileError && (
                  <div className="text-xs text-red-400 font-medium pt-1">
                    {selectedFileError}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Name *
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Asset name"
                  className="w-full bg-[#181a1f] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500"
                />
                <div className="text-[11px] text-neutral-500">
                  Up to 50 characters
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Description *
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full bg-[#181a1f] border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-500 resize-none"
                />
                <div className="text-[11px] text-neutral-500">
                  {uploadDescription.length}/1000 characters
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveSection('avatar_items')}
                  className="px-4 py-2 bg-[#25282f] hover:bg-[#32363f] text-neutral-300 hover:text-white text-xs font-semibold rounded border border-neutral-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitUpload}
                  className="px-5 py-2 bg-[#2a6839] hover:bg-[#327a44] text-white text-xs font-bold rounded border border-[#3e9354] transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Uploading...</span>
                  ) : (
                    <span>Upload (Free)</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: ANALYTICS (COMING SOON) */}
          {activeSection === 'analytics' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="pb-4 border-b border-neutral-800">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Experience Analytics</span>
                  <span className="text-xs font-normal text-neutral-400">(Coming Soon)</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Track player visits, concurrent users, and engagement metrics for your creations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#16181d] border border-neutral-800 p-5 rounded-lg space-y-1">
                  <div className="text-xs text-neutral-400 font-medium">Total Place Visits</div>
                  <div className="text-2xl font-bold text-white">1</div>
                  <div className="text-[11px] text-emerald-400">● Live in Test Place</div>
                </div>

                <div className="bg-[#16181d] border border-neutral-800 p-5 rounded-lg space-y-1">
                  <div className="text-xs text-neutral-400 font-medium">Concurrent Players</div>
                  <div className="text-2xl font-bold text-white">1</div>
                  <div className="text-[11px] text-blue-400">Active session</div>
                </div>

                <div className="bg-[#16181d] border border-neutral-800 p-5 rounded-lg space-y-1">
                  <div className="text-xs text-neutral-400 font-medium">Average Playtime</div>
                  <div className="text-2xl font-bold text-white">3m 42s</div>
                  <div className="text-[11px] text-neutral-500">Session duration</div>
                </div>
              </div>

              <div className="border border-neutral-800 rounded-xl p-8 bg-[#14161a] text-center space-y-3">
                <BarChart3 className="w-12 h-12 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Real-Time Analytics Dashboard</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Detailed retention graphs, monetization metrics, and player geographic data are coming soon to Rovix Studio.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
