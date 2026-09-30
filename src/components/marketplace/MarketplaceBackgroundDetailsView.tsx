import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Star,
  Check,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import {
  BackgroundItem,
  isBackgroundOwned,
  buyBackground,
  getEquippedBackgroundId,
  setEquippedBackgroundId,
} from '../../utils/backgroundsStorage.ts';
import { formatStarsCount } from '../../utils/marketplaceItems.ts';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import AvatarCanvas3D from '../AvatarCanvas3D.tsx';

interface MarketplaceBackgroundDetailsViewProps {
  background: BackgroundItem;
  avatarColors: AvatarColors;
  userShirtUrl: string | null;
  userPantsUrl: string | null;
  onNavigateToAvatar: () => void;
  onBack: () => void;
}

export default function MarketplaceBackgroundDetailsView({
  background,
  avatarColors,
  userShirtUrl,
  userPantsUrl,
  onNavigateToAvatar,
  onBack,
}: MarketplaceBackgroundDetailsViewProps) {
  const [isOwned, setIsOwned] = useState(() => isBackgroundOwned(background.id));
  const [isFavorited, setIsFavorited] = useState(false);
  const [stars, setStars] = useState(background.starsCount);

  const handleBuy = () => {
    buyBackground(background.id);
    setIsOwned(true);
  };

  const handleToggleFavorite = () => {
    if (isFavorited) {
      setIsFavorited(false);
      setStars((s) => Math.max(0, s - 1));
    } else {
      setIsFavorited(true);
      setStars((s) => s + 1);
    }
  };

  return (
    <div className="flex-1 bg-[#191b1d] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Back navigation */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        {/* Main Item Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start pt-2">
          {/* Left Column: Background Image with 3D Avatar standing in front */}
          <div className="w-full md:w-[56%] flex flex-col items-start shrink-0">
            <div className="w-full aspect-video rounded-2xl overflow-hidden relative shadow-2xl border border-neutral-700/80 group bg-black">
              {/* Background Image (slightly zoomed in to fill nicely) */}
              <img
                src={background.imageUrl}
                alt={background.name}
                className="absolute inset-0 w-full h-full object-cover object-center scale-105 filter brightness-90"
              />

              {/* Gradient Overlay for visual depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* 3D Avatar positioned in front of the background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <AvatarCanvas3D
                  colors={avatarColors}
                  shirtUrl={userShirtUrl}
                  pantsUrl={userPantsUrl}
                  is3D={true}
                />
              </div>

              {/* Badges */}
              <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 shadow">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Profile Background</span>
              </div>

              <div className="absolute bottom-3.5 right-3.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-neutral-300 font-medium">
                Drag avatar to rotate
              </div>
            </div>

            {/* Stars count */}
            <div className="pt-3 px-1">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="flex items-center gap-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer group"
                title="Favorite this background"
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    isFavorited
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">{formatStarsCount(stars)}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Title, Creator, Buy / Owned State, Details Table */}
          <div className="flex-1 w-full space-y-4 pt-1">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {background.name}
              </h1>

              <div className="flex items-center gap-1.5 text-sm text-neutral-300 mt-1 font-semibold">
                <span>By</span>
                <span className="text-white hover:underline cursor-pointer">{background.creator}</span>
                {background.isVerified && (
                  <span title="Verified Creator" className="inline-flex">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                  </span>
                )}
              </div>
            </div>

            <div className="border-b border-neutral-800 w-full pt-1" />

            {/* Sale / Action Section */}
            <div className="space-y-3 pt-1">
              <div className="text-sm font-medium text-neutral-300">
                {isOwned
                  ? 'You own this item. Open Avatar Editor to equip it to your profile.'
                  : 'Get this profile background for free.'}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isOwned ? (
                  <button
                    type="button"
                    onClick={handleBuy}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#00a2ff] hover:bg-[#008de0] text-white shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Get (Free)</span>
                  </button>
                ) : (
                  <>
                    <div className="px-4 py-2 rounded-lg text-xs font-bold bg-[#27292d] text-emerald-400 border border-neutral-700 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Owned</span>
                    </div>

                    <button
                      type="button"
                      onClick={onNavigateToAvatar}
                      className="px-5 py-2.5 rounded-lg text-xs font-bold bg-[#00a2ff] hover:bg-[#008de0] text-white shadow transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Go to Avatar Editor to Equip</span>
                    </button>
                  </>
                )}

                <div className="text-xs text-neutral-400 font-medium">
                  {background.price}
                </div>
              </div>
            </div>

            {/* Key-Value Metadata */}
            <div className="pt-4 space-y-2.5 text-xs text-neutral-300">
              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Tradable</span>
                <span className="font-semibold text-white">No</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="flex items-center gap-1 text-neutral-400">
                  <span>Type</span>
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                </span>
                <span className="font-semibold text-white">Profile Background</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Placement</span>
                <span className="font-semibold text-white">Profile | 3D Banner &amp; Viewport</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Created</span>
                <span className="font-semibold text-white">{background.created}</span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-4 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800">
              <div className="font-semibold text-neutral-300 mb-1">Description</div>
              <p>{background.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
