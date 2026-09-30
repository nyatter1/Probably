import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Shirt as ShirtIcon,
  Layers,
  Sparkles,
  Plus,
  Settings,
  Tag,
} from 'lucide-react';
import { validateRobloxTemplate, TEMPLATE_WIDTH, TEMPLATE_HEIGHT } from '../utils/robloxClothingUV.ts';
import { getStoredInventory, addClothingToInventory, ClothingItem } from '../utils/inventoryStorage.ts';

export interface ClothingManagerProps {
  clothingType: 'shirt' | 'pants';
  activeShirtUrl: string | null;
  activePantsUrl: string | null;
  onApplyShirt: (url: string | null) => void;
  onApplyPants: (url: string | null) => void;
  onOpenStudio?: () => void;
  onEditItem?: (item: ClothingItem) => void;
}

export default function ClothingManager({
  clothingType,
  activeShirtUrl,
  activePantsUrl,
  onApplyShirt,
  onApplyPants,
  onOpenStudio,
  onEditItem,
}: ClothingManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inventory, setInventory] = useState(getStoredInventory());
  const [lastUploadedItem, setLastUploadedItem] = useState<ClothingItem | null>(null);
  const [validationInfo, setValidationInfo] = useState<{
    valid?: boolean;
    isExactSize?: boolean;
    width?: number;
    height?: number;
    error?: string;
  } | null>(null);

  const isShirt = clothingType === 'shirt';
  const activeUrl = isShirt ? activeShirtUrl : activePantsUrl;
  const onApply = isShirt ? onApplyShirt : onApplyPants;

  useEffect(() => {
    setInventory(getStoredInventory());
  }, [clothingType]);

  const itemsList = isShirt ? inventory.shirts : inventory.pants;

  const handleProcessFile = async (file: File) => {
    const result = await validateRobloxTemplate(file);
    setValidationInfo({
      valid: result.valid,
      isExactSize: result.isExactSize,
      width: result.width,
      height: result.height,
      error: result.error,
    });

    if (result.valid && result.dataUrl) {
      // Save directly into persistent inventory
      const cleanName = file.name.replace(/\.[^/.]+$/, '').substring(0, 50) || (isShirt ? 'Custom Shirt' : 'Custom Pants');
      const created = addClothingToInventory({
        name: cleanName,
        description: isShirt ? 'Custom Shirt' : 'Custom Pants',
        type: clothingType,
        dataUrl: result.dataUrl,
        isOnSale: true,
        price: 0,
      });

      setLastUploadedItem(created);
      setInventory(getStoredInventory());
      onApply(result.dataUrl);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemove = () => {
    onApply(null);
    setValidationInfo(null);
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Active Clothing Status Banner */}
      <div className="bg-[#202225] border border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2b2d31] border border-neutral-700/60 flex items-center justify-center shrink-0">
            {isShirt ? <ShirtIcon className="w-5 h-5 text-neutral-300" /> : <Layers className="w-5 h-5 text-neutral-300" />}
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">
              Current {isShirt ? 'Shirt' : 'Pants'}
            </div>
            <div className="text-sm font-semibold text-white">
              {activeUrl ? 'Equipped on Avatar' : 'None (Base Skin)'}
            </div>
          </div>
        </div>

        {activeUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="px-3 py-1.5 text-xs font-medium bg-[#2b2d31] hover:bg-[#383a40] text-red-400 hover:text-red-300 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove {isShirt ? 'Shirt' : 'Pants'}
          </button>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-neutral-700 hover:border-neutral-500 bg-[#202225]/70 hover:bg-[#202225]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-full bg-[#2b2d31] flex items-center justify-center text-neutral-300 mb-1">
          <Upload className="w-5 h-5" />
        </div>

        <div className="text-sm font-semibold text-white">
          Upload Classic {isShirt ? 'Shirt' : 'Pants'} Template
        </div>
        <div className="text-xs text-neutral-400 max-w-sm">
          Drag and drop your 2D PNG clothing template, or click to browse.
        </div>
        <div className="text-[11px] text-neutral-500 font-mono mt-1">
          Free • Saved to your Inventory • {TEMPLATE_WIDTH} × {TEMPLATE_HEIGHT} px
        </div>
      </div>

      {/* Validation Message */}
      {validationInfo && (
        <div
          className={`p-3 border text-xs flex items-center justify-between gap-3 ${
            validationInfo.valid
              ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
              : 'bg-red-950/30 border-red-700/60 text-red-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {validationInfo.valid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">
                {validationInfo.valid ? 'Template Loaded & Saved to Inventory' : 'Template Error'}
              </div>
              <div className="text-[11px] mt-0.5 text-neutral-300">
                {validationInfo.isExactSize
                  ? `Exact template resolution (${TEMPLATE_WIDTH}×${TEMPLATE_HEIGHT} px) verified.`
                  : validationInfo.error ||
                    `Template resolution is ${validationInfo.width}×${validationInfo.height} px.`}
              </div>
            </div>
          </div>

          {validationInfo.valid && lastUploadedItem && onEditItem && (
            <button
              type="button"
              onClick={() => onEditItem(lastUploadedItem)}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure / Put On Sale</span>
            </button>
          )}
        </div>
      )}

      {/* Saved Inventory & Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Your {isShirt ? 'Shirt' : 'Pants'} Inventory ({itemsList.length}):</span>
          </div>

          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
            >
              <span>Manage in Rovix Studio</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {itemsList.map((item) => {
            const isSelected = activeUrl === item.dataUrl;
            const isOnSale = item.isOnSale !== false;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onApply(item.dataUrl);
                  setValidationInfo({
                    valid: true,
                    isExactSize: true,
                    width: TEMPLATE_WIDTH,
                    height: TEMPLATE_HEIGHT,
                  });
                }}
                className={`p-3 border bg-[#202225] cursor-pointer transition-all flex items-center justify-between gap-3 group ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-neutral-900 border border-neutral-700/60 overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative">
                    <img
                      src={item.dataUrl}
                      alt={item.name}
                      className="w-full h-full object-contain pixelated"
                    />
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {item.isPreset ? (
                        <span className="text-[9px] px-1 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                          Preset
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            isOnSale
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isOnSale
                            ? item.price && item.price > 0
                              ? `⬢ ${item.price}`
                              : 'Free'
                            : 'Off Sale'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">{item.description}</div>
                  </div>
                </div>

                {onEditItem && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem(item);
                    }}
                    className="p-2 rounded-lg bg-[#2b2d31] hover:bg-[#383a40] text-neutral-300 hover:text-white border border-neutral-700/70 opacity-80 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                    title="Configure & Price Item"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
