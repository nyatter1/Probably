import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Star,
  Check,
  Shirt,
  User,
  Sparkles,
} from 'lucide-react';
import {
  MarketplaceItem,
  formatStarsCount,
  isItemFavorited,
  toggleItemFavorite,
} from '../../utils/marketplaceItems.ts';
import { AvatarColors } from '../AvatarCanvas3D.tsx';
import ClothingDummyPreview from './ClothingDummyPreview.tsx';

interface MarketplaceItemDetailsViewProps {
  item: MarketplaceItem;
  isEquipped: boolean;
  avatarColors?: AvatarColors;
  userShirtUrl?: string | null;
  userPantsUrl?: string | null;
  onEquipItem: (item: MarketplaceItem) => void;
  onBack: () => void;
}

export default function MarketplaceItemDetailsView({
  item,
  isEquipped,
  avatarColors,
  userShirtUrl,
  userPantsUrl,
  onEquipItem,
  onBack,
}: MarketplaceItemDetailsViewProps) {
  const [isFavoritedState, setIsFavoritedState] = useState(() => isItemFavorited(item.id));
  const [stars, setStars] = useState(item.starsCount);
  const [isPreviewOnAvatar, setIsPreviewOnAvatar] = useState(false);

  const handleToggleFavorite = () => {
    const next = toggleItemFavorite(item.id);
    setIsFavoritedState(next);
    setStars((s) => (next ? s + 1 : Math.max(0, s - 1)));
  };

  return (
    <div className="flex-1 bg-[#191b1d] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Breadcrumb / Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Main Item Layout */}
        <div className="flex flex-col md:flex-row gap-8 items-start pt-2">
          {/* Left Column: 3D Preview Card + Stars Counter */}
          <div className="w-full md:w-[46%] flex flex-col items-start shrink-0">
            {/* 3D Preview Card (Dark themed matching Rovix UI) */}
            <div className="w-full aspect-square bg-[#202225] rounded-2xl overflow-hidden relative shadow-lg border border-neutral-700/80 group">
              <ClothingDummyPreview
                clothingType={item.clothingType}
                textureUrl={item.dataUrl}
                isInteractive={true}
                showUserAvatar={isPreviewOnAvatar}
                avatarColors={avatarColors}
                userShirtUrl={userShirtUrl}
                userPantsUrl={userPantsUrl}
                className="w-full h-full"
              />

              {/* Toggle Try On with real avatar in bottom-right */}
              <button
                type="button"
                onClick={() => setIsPreviewOnAvatar(!isPreviewOnAvatar)}
                className={`absolute bottom-3.5 right-3.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 backdrop-blur-sm border ${
                  isPreviewOnAvatar
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-[#181a1d]/85 hover:bg-[#181a1d] text-white border-white/20'
                }`}
                title="Toggle between Mannequin and Your Avatar"
              >
                <User className="w-3.5 h-3.5" />
                <span>{isPreviewOnAvatar ? 'My Avatar' : 'Try On'}</span>
              </button>
            </div>

            {/* Stars Count under Preview Card: ☆ 35.9K */}
            <div className="pt-3 px-1">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="flex items-center gap-1.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer group"
                title="Favorite this item"
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    isFavoritedState
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                <span className="text-sm font-medium">{formatStarsCount(stars)}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Title, Creator, Buy / Wear Button, Details Table */}
          <div className="flex-1 w-full space-y-4 pt-1">
            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {item.name}
              </h1>

              {/* Creator with verified check: By Rovix ✓ */}
              <div className="flex items-center gap-1.5 text-sm text-neutral-300 mt-1 font-semibold">
                <span>By</span>
                <span className="text-white hover:underline cursor-pointer">{item.creator}</span>
                {item.isVerified && (
                  <span title="Verified Creator" className="inline-flex">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                  </span>
                )}
              </div>
            </div>

            {/* Horizontal Line */}
            <div className="border-b border-neutral-800 w-full pt-1" />

            {/* Sale / Availability */}
            <div className="space-y-3 pt-1">
              <div className="text-sm font-medium text-neutral-300">
                {!item.isOnSale
                  ? 'This item is not currently for sale.'
                  : isEquipped
                  ? 'You currently have this item equipped.'
                  : item.numericPrice > 0
                  ? `Available in Marketplace for ⬢ ${item.numericPrice} Rovux.`
                  : 'This item is available for free.'}
              </div>

              {/* Single Primary Action: Buy / Wear / Off Sale */}
              <div className="flex items-center gap-3">
                {!item.isOnSale && !isEquipped ? (
                  <button
                    type="button"
                    onClick={() => onEquipItem(item)}
                    className="px-6 py-2.5 rounded-lg text-sm font-bold bg-[#26282b] hover:bg-[#303337] text-neutral-300 border border-neutral-700 shadow transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Shirt className="w-4 h-4 text-neutral-400" />
                    <span>Wear (Off Sale)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEquipItem(item)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow transition-colors cursor-pointer flex items-center gap-2 ${
                      isEquipped
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                        : item.numericPrice > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-[#0055ff] hover:bg-[#0047d9] text-white'
                    }`}
                  >
                    {isEquipped ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Equipped (Take Off)</span>
                      </>
                    ) : item.numericPrice > 0 ? (
                      <>
                        <span className="text-amber-300 font-bold">⬢</span>
                        <span>Buy for {item.numericPrice} Rovux</span>
                      </>
                    ) : (
                      <>
                        <Shirt className="w-4 h-4" />
                        <span>Wear Item (Free)</span>
                      </>
                    )}
                  </button>
                )}

                <div className="text-xs text-neutral-400 font-medium">
                  {item.price}
                </div>
              </div>
            </div>

            {/* Key-Value Metadata Table */}
            <div className="pt-4 space-y-2.5 text-xs text-neutral-300">
              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Tradable</span>
                <span className="font-semibold text-white">{item.tradable}</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="flex items-center gap-1 text-neutral-400">
                  <span>Type</span>
                  <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                </span>
                <span className="font-semibold text-white">{item.type}</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Placement</span>
                <span className="font-semibold text-white">{item.placement}</span>
              </div>

              <div className="grid grid-cols-2 max-w-sm py-1.5 border-t border-neutral-800/80">
                <span className="text-neutral-400">Created</span>
                <span className="font-semibold text-white">{item.created}</span>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="pt-4 text-xs text-neutral-400 leading-relaxed border-t border-neutral-800">
                <div className="font-semibold text-neutral-300 mb-1">Description</div>
                <p>{item.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
