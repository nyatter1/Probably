import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Shirt,
  Layers,
  HelpCircle,
  Sparkles,
  Save,
} from 'lucide-react';
import { ClothingItem, updateClothingItem } from '../../utils/inventoryStorage.ts';
import ClothingDummyPreview from './ClothingDummyPreview.tsx';

interface ManageItemViewProps {
  item: ClothingItem;
  onSave: (updatedItem: ClothingItem) => void;
  onBack: () => void;
}

export default function ManageItemView({ item, onSave, onBack }: ManageItemViewProps) {
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [isOnSale, setIsOnSale] = useState<boolean>(item.isOnSale ?? true);
  const [priceRovux, setPriceRovux] = useState<string>(
    item.price !== undefined ? String(item.price) : '0'
  );
  const [isSaved, setIsSaved] = useState(false);

  const parsedPrice = Math.max(0, parseInt(priceRovux, 10) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateClothingItem(item.id, {
      name: name.trim() || item.name,
      description: description.trim(),
      isOnSale,
      price: isOnSale ? parsedPrice : 0,
    });

    if (updated) {
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onSave(updated);
      }, 700);
    }
  };

  return (
    <div className="flex-1 bg-[#141618] text-[#e3e5e8] overflow-y-auto min-h-screen select-none font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Back navigation */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Top Header: Manage Item + Badge + On Sale Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Manage Item
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#202225] border border-neutral-700/80 rounded-md text-xs font-bold text-neutral-300">
              {item.type === 'shirt' ? (
                <>
                  <Shirt className="w-3.5 h-3.5 text-blue-400" />
                  <span>Shirt</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pants</span>
                </>
              )}
            </span>
          </div>

          {/* On Sale Toggle Switch */}
          <div className="flex items-center gap-3 bg-[#1e2023] px-3.5 py-2 rounded-xl border border-neutral-800 self-start sm:self-auto">
            <span className="text-xs font-bold text-neutral-200">On Sale</span>
            <button
              type="button"
              role="switch"
              aria-checked={isOnSale}
              onClick={() => setIsOnSale(!isOnSale)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isOnSale ? 'bg-blue-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isOnSale ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Main Top Grid: 3D Preview on left, Name & Description on right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left 3D Dummy Preview (4 cols) */}
            <div className="md:col-span-4 w-full aspect-square bg-[#1c1e22] rounded-2xl overflow-hidden border border-neutral-800 shadow-md relative p-2">
              <ClothingDummyPreview
                clothingType={item.type}
                textureUrl={item.dataUrl}
                isInteractive={true}
                className="w-full h-full"
              />
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-neutral-400 font-medium">
                Drag to rotate
              </div>
            </div>

            {/* Right Form Fields (8 cols) */}
            <div className="md:col-span-8 space-y-5">
              {/* Item Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200">
                    Item Name
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {name.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name"
                  className="w-full px-3.5 py-2.5 bg-[#1a1c1f] border border-neutral-700/80 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Item Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200">
                    Item Description
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {description.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Give your item an authentic description"
                  className="w-full px-3.5 py-2.5 bg-[#1a1c1f] border border-neutral-700/80 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing Section (Shows when On Sale is true) */}
          {isOnSale ? (
            <div className="border-t border-neutral-800/80 pt-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Pricing</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Set how much Rovux buyers will pay in the public Marketplace. Set to 0 for Free.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1a1c1f] p-5 rounded-xl border border-neutral-800">
                {/* Price Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <span>Price in Rovux</span>
                    <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
                  </label>

                  <div className="relative max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-base text-amber-400 font-bold">⬢</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={999999}
                      value={priceRovux}
                      onChange={(e) => setPriceRovux(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-[#131416] border border-neutral-700 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    {parsedPrice === 0
                      ? 'Item will be listed as Free on the Marketplace.'
                      : `Item will be listed for ⬢ ${parsedPrice} Rovux.`}
                  </p>
                </div>

                {/* Marketplace Summary Card */}
                <div className="bg-[#141517] p-4 rounded-lg border border-neutral-800/80 space-y-2">
                  <div className="text-xs font-bold text-neutral-300">Publication Summary</div>
                  <div className="text-xs text-neutral-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-semibold">Published to Marketplace</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Listing Price:</span>
                      <span className="text-white font-bold">
                        {parsedPrice === 0 ? 'Free' : `⬢ ${parsedPrice} Rovux`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-neutral-800/80 pt-6">
              <div className="bg-[#1e1717] border border-amber-900/40 p-4 rounded-xl text-xs text-amber-300/90 leading-relaxed">
                <span className="font-bold">Item is currently Off Sale:</span> This item remains in your inventory for your avatar to wear, but it will not appear in the public Marketplace and cannot be bought by other players.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-neutral-300 bg-[#202225] hover:bg-[#282b2f] border border-neutral-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaved}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-2 ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
