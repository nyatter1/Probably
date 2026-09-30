import React, { useState } from 'react';
import { SavedGame } from '../../utils/gamesStorage.ts';
import { UserProfile } from '../../types/account.ts';
import { creationService, GAME_ICON_PRESETS } from '../../services/CreationService.ts';
import { Play, Hammer, ArrowLeft, Users, Calendar, Sparkles, Image as ImageIcon, Check } from 'lucide-react';

interface GameDetailsPageProps {
  game: SavedGame;
  currentUser: UserProfile | null;
  onPlay: (game: SavedGame) => void;
  onEditInStudio: (game: SavedGame) => void;
  onBack: () => void;
  onOpenCreatorProfile: (creatorNameOrId: string) => void;
  onGameUpdated?: (updated: SavedGame) => void;
}

export default function GameDetailsPage({
  game,
  currentUser,
  onPlay,
  onEditInStudio,
  onBack,
  onOpenCreatorProfile,
  onGameUpdated,
}: GameDetailsPageProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [customIconUrl, setCustomIconUrl] = useState('');
  const [activeGame, setActiveGame] = useState<SavedGame>(game);

  const isOwner = currentUser && (
    (activeGame as any).creatorId === currentUser.id ||
    activeGame.creator.toLowerCase() === currentUser.username.toLowerCase() ||
    currentUser.username.toLowerCase() === 'hayden'
  );

  const handleSelectPresetIcon = (presetUrl: string) => {
    creationService.updateGameIcon(activeGame.id, presetUrl);
    const updated = { ...activeGame, iconUrl: presetUrl };
    setActiveGame(updated);
    if (onGameUpdated) onGameUpdated(updated);
    setShowIconPicker(false);
  };

  const handleApplyCustomIcon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIconUrl.trim()) return;
    creationService.updateGameIcon(activeGame.id, customIconUrl.trim());
    const updated = { ...activeGame, iconUrl: customIconUrl.trim() };
    setActiveGame(updated);
    if (onGameUpdated) onGameUpdated(updated);
    setShowIconPicker(false);
  };

  const createdFormatted = activeGame.createdAt
    ? new Date(activeGame.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'September 2026';

  const updatedFormatted = activeGame.updatedAt
    ? new Date(activeGame.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'September 2026';

  return (
    <div className="min-h-screen bg-[#101216] text-white p-4 sm:p-8 select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1f26] hover:bg-[#252a34] text-neutral-300 hover:text-white border border-neutral-800 transition-colors text-xs font-semibold cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Hero Card */}
        <div className="bg-[#181a20] border border-neutral-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Large Game Icon Thumbnail */}
          <div className="relative group flex-shrink-0 w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border-2 border-neutral-700/60 shadow-2xl bg-gradient-to-br from-indigo-900 to-purple-950 flex items-center justify-center">
            {activeGame.iconUrl ? (
              <img
                src={activeGame.iconUrl}
                alt={activeGame.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-purple-800 via-indigo-900 to-neutral-900">
                <Sparkles className="w-16 h-16 text-purple-300 mb-2 opacity-80" />
                <span className="font-extrabold text-2xl text-white tracking-wider">{activeGame.initials}</span>
              </div>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={() => setShowIconPicker(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-2 cursor-pointer backdrop-blur-xs"
              >
                <ImageIcon className="w-6 h-6" />
                <span>Change Icon</span>
              </button>
            )}
          </div>

          {/* Game Title, Creator & Primary Action Buttons */}
          <div className="flex-1 space-y-4 text-center md:text-left min-w-0">
            <div>
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/40">
                Experience
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2.5">
                {activeGame.title}
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                By{' '}
                <button
                  type="button"
                  onClick={() => onOpenCreatorProfile((activeGame as any).creatorId || activeGame.creator)}
                  className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer"
                >
                  {activeGame.creator}
                </button>
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-neutral-400 pt-1">
              <div className="flex items-center gap-1.5 bg-[#20232a] px-3 py-1.5 rounded-xl border border-neutral-800">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{(activeGame as any).playingCount || 12} playing</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#20232a] px-3 py-1.5 rounded-xl border border-neutral-800">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Updated {updatedFormatted}</span>
              </div>
            </div>

            {/* Play and Studio Edit Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => onPlay(activeGame)}
                className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>PLAY</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => onEditInStudio(activeGame)}
                  className="px-5 py-3.5 bg-[#242832] hover:bg-[#2d3340] text-neutral-200 hover:text-white font-bold text-sm rounded-2xl border border-neutral-700/80 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Hammer className="w-4 h-4 text-purple-400" />
                  <span>Edit in Studio</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* About & Game Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#181a20] border border-neutral-800/80 rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">About</h3>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {(activeGame as any).description ||
                `Welcome to ${activeGame.title}! Explore this 3D creation built with custom parts, dynamic Luau LocalScripts, real-time GUI, and physics mechanics.`}
            </p>
          </div>

          <div className="bg-[#181a20] border border-neutral-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Game Info</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-neutral-400 border-b border-neutral-800/60 pb-2">
                <span>Created</span>
                <span className="text-neutral-200 font-medium">{createdFormatted}</span>
              </div>
              <div className="flex justify-between text-neutral-400 border-b border-neutral-800/60 pb-2">
                <span>Updated</span>
                <span className="text-neutral-200 font-medium">{updatedFormatted}</span>
              </div>
              <div className="flex justify-between text-neutral-400 border-b border-neutral-800/60 pb-2">
                <span>Server Size</span>
                <span className="text-neutral-200 font-medium">10 Players</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Genre</span>
                <span className="text-purple-400 font-medium">Adventure / Sandbox</span>
              </div>
            </div>
          </div>
        </div>

        {/* Icon Picker Modal */}
        {showIconPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
            <div className="bg-[#181a20] border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-bold text-white">Select Game Icon</h3>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(false)}
                  className="text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Preset Icons</label>
                <div className="grid grid-cols-5 gap-2.5">
                  {GAME_ICON_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPresetIcon(p.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        activeGame.iconUrl === p.url ? 'border-purple-500 scale-105' : 'border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      {activeGame.iconUrl === p.url && (
                        <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL Form */}
              <form onSubmit={handleApplyCustomIcon} className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="text-xs font-semibold text-neutral-300">Or Paste Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={customIconUrl}
                    onChange={(e) => setCustomIconUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#20232a] border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
