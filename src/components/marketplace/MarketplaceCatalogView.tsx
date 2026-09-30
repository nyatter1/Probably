import React, { useState } from 'react';
import { ShoppingBag, Star, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';
import {
  getAllMarketplaceItems,
  MarketplaceItem,
  formatStarsCount,
} from '../../utils/marketplaceItems.ts';
import {
  MARKETPLACE_BACKGROUNDS,
  BackgroundItem,
  getOwnedBackgroundIds,
  getEquippedBackgroundId,
} from '../../utils/backgroundsStorage.ts';
import ClothingDummyPreview from './ClothingDummyPreview.tsx';

interface MarketplaceCatalogViewProps {
  onSelectItem: (item: MarketplaceItem) => void;
  onSelectBackground: (background: BackgroundItem) => void;
  activeShirtUrl: string | null;
  activePantsUrl: string | null;
}

export default function MarketplaceCatalogView({
  onSelectItem,
  onSelectBackground,
  activeShirtUrl,
  activePantsUrl,
}: MarketplaceCatalogViewProps) {
  const [filterType, setFilterType] = useState<'all' | 'shirt' | 'pants' | 'backgrounds' | 'borders'>('all');
  const clothingItems = getAllMarketplaceItems();
  const ownedBackgroundIds = getOwnedBackgroundIds();
  const equippedBackgroundId = getEquippedBackgroundId();

  const filteredClothing = clothingItems.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'backgrounds' || filterType === 'borders') return false;
    return item.clothingType === filterType;
  });

  const showBackgrounds = filterType === 'all' || filterType === 'backgrounds';
  const showBorders = filterType === 'borders';

  return (
    <div className="flex-1 bg-[#191b1d] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-500" />
              <span>Marketplace</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Browse authentic classic Rovix clothing items and 3D profile backgrounds.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#202225] p-1 rounded-lg border border-neutral-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-[#32363c] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Items ({clothingItems.length + MARKETPLACE_BACKGROUNDS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('shirt')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'shirt'
                  ? 'bg-[#32363c] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Shirts ({clothingItems.filter((i) => i.clothingType === 'shirt').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pants')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'pants'
                  ? 'bg-[#32363c] text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Pants ({clothingItems.filter((i) => i.clothingType === 'pants').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('backgrounds')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterType === 'backgrounds'
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Backgrounds ({MARKETPLACE_BACKGROUNDS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('borders')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterType === 'borders'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-400/90 hover:text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Borders (Coming Soon)</span>
            </button>
          </div>
        </div>

        {/* SECTION: Borders (Coming Soon) */}
        {showBorders && (
          <div className="py-16 text-center space-y-4 bg-[#202225] border border-neutral-800 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Avatar Profile Borders (Coming Soon)</h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Custom animated profile borders, neon avatar frames, and glowing edges are currently in development for the Rovix Marketplace!
            </p>
            <div className="pt-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                Coming Soon
              </span>
            </div>
          </div>
        )}

        {/* SECTION 1: Backgrounds (when active or in all) */}
        {showBackgrounds && (
          <div className="space-y-3">
            {filterType === 'all' && (
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>Profile Backgrounds</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setFilterType('backgrounds')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {MARKETPLACE_BACKGROUNDS.map((bg) => {
                const isOwned = ownedBackgroundIds.includes(bg.id);
                const isEquipped = equippedBackgroundId === bg.id;

                return (
                  <div
                    key={bg.id}
                    onClick={() => onSelectBackground(bg)}
                    className="group cursor-pointer flex flex-col bg-[#202225] border border-neutral-800 hover:border-neutral-600 rounded-xl overflow-hidden transition-all shadow-sm"
                  >
                    {/* Full Background Image Display */}
                    <div className="aspect-video w-full bg-black relative overflow-hidden flex items-center justify-center">
                      <img
                        src={bg.imageUrl}
                        alt={bg.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                      {isEquipped ? (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-600 text-[10px] font-bold text-white shadow">
                          Equipped
                        </div>
                      ) : isOwned ? (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#1f2227]/90 border border-white/20 text-[10px] font-bold text-neutral-300 shadow">
                          Owned
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-blue-600/90 text-[10px] font-bold text-white shadow">
                          Free
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-2.5 space-y-1">
                      <div className="font-bold text-xs text-white truncate group-hover:text-blue-400 transition-colors">
                        {bg.name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                        <span>By {bg.creator}</span>
                        {bg.isVerified && (
                          <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800/60 mt-1">
                        <span className="font-semibold text-emerald-400">{bg.price}</span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{formatStarsCount(bg.starsCount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: Clothing Catalog Grid */}
        {filterType !== 'backgrounds' && (
          <div className="space-y-3 pt-2">
            {filterType === 'all' && (
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Classic Clothing</span>
              </h2>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredClothing.map((item) => {
                const isEquipped =
                  (item.clothingType === 'shirt' && activeShirtUrl === item.dataUrl) ||
                  (item.clothingType === 'pants' && activePantsUrl === item.dataUrl);

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group cursor-pointer flex flex-col bg-[#202225] border border-neutral-800 hover:border-neutral-600 rounded-xl overflow-hidden transition-all shadow-sm"
                  >
                    {/* 3D Dummy Preview Card */}
                    <div className="aspect-square w-full bg-[#1c1e22] relative overflow-hidden flex items-center justify-center p-2 group-hover:bg-[#23262b] transition-colors">
                      <ClothingDummyPreview
                        clothingType={item.clothingType}
                        textureUrl={item.dataUrl}
                        className="w-full h-full"
                      />
                      {isEquipped && (
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-600 text-[10px] font-bold text-white shadow-md">
                          Wearing
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3 space-y-1">
                      <div className="font-bold text-xs text-white truncate group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                        <span>By {item.creator}</span>
                        {item.isVerified && (
                          <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-800/60 mt-1">
                        <span className="font-semibold text-neutral-300">{item.price}</span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{formatStarsCount(item.starsCount)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
