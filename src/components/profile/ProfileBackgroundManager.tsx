import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Check,
  Sparkles,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import {
  MARKETPLACE_BACKGROUNDS,
  BackgroundItem,
  getOwnedBackgroundIds,
  getEquippedBackgroundId,
  setEquippedBackgroundId,
} from '../../utils/backgroundsStorage.ts';

interface ProfileBackgroundManagerProps {
  onOpenMarketplaceBackgrounds: () => void;
  onBackgroundEquippedChange?: (backgroundUrl: string | null) => void;
}

export default function ProfileBackgroundManager({
  onOpenMarketplaceBackgrounds,
  onBackgroundEquippedChange,
}: ProfileBackgroundManagerProps) {
  const [ownedIds, setOwnedIds] = useState<string[]>(getOwnedBackgroundIds);
  const [equippedId, setEquippedId] = useState<string | null>(getEquippedBackgroundId);

  useEffect(() => {
    setOwnedIds(getOwnedBackgroundIds());
    setEquippedId(getEquippedBackgroundId());
  }, []);

  const handleEquip = (id: string | null) => {
    setEquippedBackgroundId(id);
    setEquippedId(id);
    const item = MARKETPLACE_BACKGROUNDS.find((b) => b.id === id);
    onBackgroundEquippedChange?.(item ? item.imageUrl : null);
  };

  const ownedItems = MARKETPLACE_BACKGROUNDS.filter((b) => ownedIds.includes(b.id));

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Active Background Status Banner */}
      <div className="bg-[#202225] border border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#2b2d31] border border-neutral-700/60 overflow-hidden shrink-0 flex items-center justify-center rounded">
            {equippedId ? (
              <img
                src={MARKETPLACE_BACKGROUNDS.find((b) => b.id === equippedId)?.imageUrl}
                alt="Equipped Background"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-neutral-400" />
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">
              Profile 3D Background
            </div>
            <div className="text-sm font-semibold text-white">
              {equippedId
                ? MARKETPLACE_BACKGROUNDS.find((b) => b.id === equippedId)?.name
                : 'Default (Studio Slate Grid)'}
            </div>
          </div>
        </div>

        {equippedId && (
          <button
            type="button"
            onClick={() => handleEquip(null)}
            className="px-3 py-1.5 text-xs font-medium bg-[#2b2d31] hover:bg-[#383a40] text-red-400 hover:text-red-300 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
        )}
      </div>

      {/* Unlocked / Bought Backgrounds Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Your Owned Backgrounds ({ownedItems.length}):</span>
          </div>

          <button
            type="button"
            onClick={onOpenMarketplaceBackgrounds}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Get More in Marketplace</span>
          </button>
        </div>

        {ownedItems.length === 0 ? (
          <div className="bg-[#1c1e22] border border-dashed border-neutral-800 p-8 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#25282e] flex items-center justify-center mx-auto text-neutral-400">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">No Backgrounds Claimed Yet</div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                Backgrounds must be claimed from the Marketplace before they appear in your avatar inventory.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenMarketplaceBackgrounds}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Claim Free Backgrounds in Marketplace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ownedItems.map((bg) => {
              const isEquipped = equippedId === bg.id;
              return (
                <div
                  key={bg.id}
                  onClick={() => handleEquip(isEquipped ? null : bg.id)}
                  className={`group relative aspect-[16/10] rounded-xl overflow-hidden border cursor-pointer transition-all shadow-md ${
                    isEquipped
                      ? 'border-blue-500 ring-2 ring-blue-500'
                      : 'border-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <img
                    src={bg.imageUrl}
                    alt={bg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white drop-shadow">
                        {bg.name}
                      </span>
                      {isEquipped && (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-[10px] font-bold text-white shadow flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Equipped</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Marketplace Backgrounds preview shelf */}
      <div className="border-t border-neutral-800/80 pt-5 space-y-3">
        <div className="text-xs font-bold text-neutral-300">
          All Available Marketplace Backgrounds (Free):
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {MARKETPLACE_BACKGROUNDS.map((bg) => {
            const isOwned = ownedIds.includes(bg.id);
            const isEquipped = equippedId === bg.id;

            return (
              <div
                key={bg.id}
                onClick={() => {
                  if (isOwned) {
                    handleEquip(isEquipped ? null : bg.id);
                  } else {
                    onOpenMarketplaceBackgrounds();
                  }
                }}
                className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer group ${
                  isEquipped
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <img
                  src={bg.imageUrl}
                  alt={bg.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors p-1.5 flex flex-col justify-between">
                  <div className="self-end">
                    {isEquipped ? (
                      <span className="px-1.5 py-0.2 bg-emerald-600 text-[9px] font-bold text-white rounded">
                        Active
                      </span>
                    ) : isOwned ? (
                      <span className="px-1.5 py-0.2 bg-neutral-800/90 text-[9px] font-semibold text-neutral-300 rounded border border-white/20">
                        Owned
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-blue-600/90 text-[9px] font-bold text-white rounded">
                        Free
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow truncate">
                    {bg.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
