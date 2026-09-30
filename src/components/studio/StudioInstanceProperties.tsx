import React from 'react';
import { RBXInstance } from '../../scripting/instances/Instance.ts';
import { RBXGuiObject } from '../../scripting/instances/ui/GuiObject.ts';
import { RBXTextLabel } from '../../scripting/instances/ui/TextLabel.ts';
import { RBXTextButton } from '../../scripting/instances/ui/TextButton.ts';
import { RBXImageLabel, RBXImageButton } from '../../scripting/instances/ui/ImageLabel.ts';
import { RBXTextBox } from '../../scripting/instances/ui/TextBox.ts';
import {
  RBXUICorner,
  RBXUIStroke,
  RBXUIPadding,
  RBXUIListLayout,
  RBXUIScale,
  RBXUIAspectRatioConstraint,
} from '../../scripting/instances/ui/UIComponents.ts';
import { RBXClickDetector } from '../../scripting/instances/ClickDetector.ts';
import { RBXAttachment } from '../../scripting/instances/Attachment.ts';
import { RBXWeld, RBXWeldConstraint } from '../../scripting/instances/Weld.ts';
import { RBXScript } from '../../scripting/instances/Script.ts';
import { RBXColor3 } from '../../scripting/datatypes/Color3.ts';
import { RBXUDim } from '../../scripting/datatypes/UDim.ts';
import { RBXUDim2 } from '../../scripting/datatypes/UDim2.ts';
import { RBXVector3 } from '../../scripting/datatypes/Vector3.ts';
import { FileCode } from 'lucide-react';

export const AVAILABLE_ROBLOX_FONTS = [
  'GothamBold',
  'GothamBlack',
  'GothamMedium',
  'Gotham',
  'FredokaOne',
  'SourceSansBold',
  'SourceSans',
  'SourceSansLight',
  'Arcade',
  'Code',
  'Roboto',
  'RobotoMono',
  'SciFi',
  'Cartoon',
  'Highway',
  'Antique',
  'Arial',
  'ArialBold',
];

interface StudioInstancePropertiesProps {
  instance: RBXInstance;
  onUpdate: () => void;
  onOpenScript?: (script: RBXScript) => void;
}

export default function StudioInstanceProperties({
  instance,
  onUpdate,
  onOpenScript,
}: StudioInstancePropertiesProps) {
  const notify = (prop: string, val: any) => {
    (instance as any)[prop] = val;
    instance.notifyPropertyChanged(prop, val);
    onUpdate();
  };

  const isGuiObj = instance instanceof RBXGuiObject;
  const isText = instance instanceof RBXTextLabel;
  const isImage = instance instanceof RBXImageLabel;
  const isTextBox = instance instanceof RBXTextBox;
  const isCorner = instance instanceof RBXUICorner;
  const isStroke = instance instanceof RBXUIStroke;
  const isClickDetector = instance instanceof RBXClickDetector;
  const isAttachment = instance instanceof RBXAttachment;
  const isWeld = instance instanceof RBXWeld || instance instanceof RBXWeldConstraint;
  const isScript = instance instanceof RBXScript;
  const isPadding = instance instanceof RBXUIPadding;
  const isListLayout = instance instanceof RBXUIListLayout;
  const isScale = instance instanceof RBXUIScale;
  const isAspect = instance instanceof RBXUIAspectRatioConstraint;

  return (
    <div className="p-3 space-y-3 text-xs font-sans">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-700/80">
        <div>
          <span className="font-bold text-white text-sm">{instance.Name}</span>
          <span className="ml-1.5 text-[10px] text-blue-400 font-mono">({instance.ClassName})</span>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-[11px] text-neutral-400 font-medium">Name</label>
        <input
          type="text"
          value={instance.Name}
          onChange={(e) => notify('Name', e.target.value)}
          className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
        />
      </div>

      {/* SCRIPT ACTIONS */}
      {isScript && (
        <div className="p-2.5 rounded-lg bg-[#1a1d24] border border-amber-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-bold text-[11px] uppercase tracking-wider">Luau Script</span>
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={(instance as RBXScript).Enabled}
                onChange={(e) => notify('Enabled', e.target.checked)}
              />
              <span>Enabled</span>
            </label>
          </div>
          <button
            type="button"
            onClick={() => onOpenScript?.(instance as RBXScript)}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Open Script Editor</span>
          </button>
        </div>
      )}

      {/* TEXT PROPERTIES */}
      {isText && (
        <div className="space-y-2.5 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Text Properties</div>

          {/* Text String */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Text</label>
            <textarea
              rows={2}
              value={(instance as RBXTextLabel).Text}
              onChange={(e) => notify('Text', e.target.value)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-sans text-xs resize-none"
            />
          </div>

          {/* Text Color */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">TextColor3</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(instance as RBXTextLabel).TextColor3.toHex()}
                onChange={(e) => notify('TextColor3', RBXColor3.fromHex(e.target.value))}
                className="w-8 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-neutral-300 text-[11px]">
                {(instance as RBXTextLabel).TextColor3.toHex()}
              </span>
            </div>
          </div>

          {/* Text Size & Scaled */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">TextSize</label>
              <input
                type="number"
                min={6}
                max={96}
                value={(instance as RBXTextLabel).TextSize}
                onChange={(e) => notify('TextSize', parseInt(e.target.value) || 14)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(instance as RBXTextLabel).TextScaled}
                  onChange={(e) => notify('TextScaled', e.target.checked)}
                />
                <span>TextScaled</span>
              </label>
            </div>
          </div>

          {/* Font Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Font</label>
            <select
              value={typeof (instance as RBXTextLabel).Font === 'object' ? (instance as RBXTextLabel).Font?.Name : (instance as RBXTextLabel).Font}
              onChange={(e) => notify('Font', e.target.value)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1.5 text-white text-xs cursor-pointer"
            >
              {AVAILABLE_ROBLOX_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Alignment */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">TextXAlignment</label>
              <select
                value={(instance as RBXTextLabel).TextXAlignment}
                onChange={(e) => notify('TextXAlignment', e.target.value)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="Left">Left</option>
                <option value="Center">Center</option>
                <option value="Right">Right</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">TextYAlignment</label>
              <select
                value={(instance as RBXTextLabel).TextYAlignment}
                onChange={(e) => notify('TextYAlignment', e.target.value)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value="Top">Top</option>
                <option value="Center">Center</option>
                <option value="Bottom">Bottom</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TEXTBOX PLACEHOLDER */}
      {isTextBox && (
        <div className="space-y-1 pt-1 border-t border-neutral-800">
          <label className="text-[11px] text-neutral-400">PlaceholderText</label>
          <input
            type="text"
            value={(instance as RBXTextBox).PlaceholderText}
            onChange={(e) => notify('PlaceholderText', e.target.value)}
            className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white"
          />
        </div>
      )}

      {/* IMAGE PROPERTIES */}
      {isImage && (
        <div className="space-y-2.5 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Image Properties</div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Image (URL)</label>
            <input
              type="text"
              placeholder="https://... or /presets/..."
              value={(instance as RBXImageLabel).Image}
              onChange={(e) => notify('Image', e.target.value)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono text-[11px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">ScaleType</label>
            <select
              value={(instance as RBXImageLabel).ScaleType}
              onChange={(e) => notify('ScaleType', e.target.value)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white text-xs"
            >
              <option value="Stretch">Stretch</option>
              <option value="Fit">Fit</option>
              <option value="Crop">Crop</option>
            </select>
          </div>
        </div>
      )}

      {/* GUI OBJECT TRANSFORM (POSITION, SIZE, ANCHORPOINT) */}
      {isGuiObj && (
        <div className="space-y-2.5 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Transform (UDim2)</div>

          {/* Position (Scale X, Offset X, Scale Y, Offset Y) */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Position (Scale X, Off X, Scale Y, Off Y)</label>
            <div className="grid grid-cols-4 gap-1 font-mono">
              <input
                type="number"
                step="0.05"
                value={(instance as RBXGuiObject).Position.X.Scale}
                onChange={(e) => {
                  const p = (instance as RBXGuiObject).Position;
                  notify('Position', RBXUDim2.new(parseFloat(e.target.value) || 0, p.X.Offset, p.Y.Scale, p.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Scale X"
              />
              <input
                type="number"
                step="5"
                value={(instance as RBXGuiObject).Position.X.Offset}
                onChange={(e) => {
                  const p = (instance as RBXGuiObject).Position;
                  notify('Position', RBXUDim2.new(p.X.Scale, parseInt(e.target.value) || 0, p.Y.Scale, p.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Offset X"
              />
              <input
                type="number"
                step="0.05"
                value={(instance as RBXGuiObject).Position.Y.Scale}
                onChange={(e) => {
                  const p = (instance as RBXGuiObject).Position;
                  notify('Position', RBXUDim2.new(p.X.Scale, p.X.Offset, parseFloat(e.target.value) || 0, p.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Scale Y"
              />
              <input
                type="number"
                step="5"
                value={(instance as RBXGuiObject).Position.Y.Offset}
                onChange={(e) => {
                  const p = (instance as RBXGuiObject).Position;
                  notify('Position', RBXUDim2.new(p.X.Scale, p.X.Offset, p.Y.Scale, parseInt(e.target.value) || 0));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Offset Y"
              />
            </div>
          </div>

          {/* Size (Scale X, Offset X, Scale Y, Offset Y) */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Size (Scale X, Off X, Scale Y, Off Y)</label>
            <div className="grid grid-cols-4 gap-1 font-mono">
              <input
                type="number"
                step="0.05"
                value={(instance as RBXGuiObject).Size.X.Scale}
                onChange={(e) => {
                  const s = (instance as RBXGuiObject).Size;
                  notify('Size', RBXUDim2.new(parseFloat(e.target.value) || 0, s.X.Offset, s.Y.Scale, s.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Scale X"
              />
              <input
                type="number"
                step="5"
                value={(instance as RBXGuiObject).Size.X.Offset}
                onChange={(e) => {
                  const s = (instance as RBXGuiObject).Size;
                  notify('Size', RBXUDim2.new(s.X.Scale, parseInt(e.target.value) || 0, s.Y.Scale, s.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Offset X"
              />
              <input
                type="number"
                step="0.05"
                value={(instance as RBXGuiObject).Size.Y.Scale}
                onChange={(e) => {
                  const s = (instance as RBXGuiObject).Size;
                  notify('Size', RBXUDim2.new(s.X.Scale, s.X.Offset, parseFloat(e.target.value) || 0, s.Y.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Scale Y"
              />
              <input
                type="number"
                step="5"
                value={(instance as RBXGuiObject).Size.Y.Offset}
                onChange={(e) => {
                  const s = (instance as RBXGuiObject).Size;
                  notify('Size', RBXUDim2.new(s.X.Scale, s.X.Offset, s.Y.Scale, parseInt(e.target.value) || 0));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                title="Offset Y"
              />
            </div>
          </div>

          {/* AnchorPoint & Rotation */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">AnchorPoint (X, Y)</label>
              <div className="grid grid-cols-2 gap-1 font-mono">
                <input
                  type="number"
                  step="0.5"
                  value={(instance as RBXGuiObject).AnchorPoint.X}
                  onChange={(e) => {
                    const ap = (instance as RBXGuiObject).AnchorPoint;
                    notify('AnchorPoint', { X: parseFloat(e.target.value) || 0, Y: ap.Y });
                  }}
                  className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                />
                <input
                  type="number"
                  step="0.5"
                  value={(instance as RBXGuiObject).AnchorPoint.Y}
                  onChange={(e) => {
                    const ap = (instance as RBXGuiObject).AnchorPoint;
                    notify('AnchorPoint', { X: ap.X, Y: parseFloat(e.target.value) || 0 });
                  }}
                  className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">Rotation</label>
              <input
                type="number"
                step="15"
                value={(instance as RBXGuiObject).Rotation}
                onChange={(e) => notify('Rotation', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
          </div>

          {/* Background Color & Transparency */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">BackgroundColor3</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={(instance as RBXGuiObject).BackgroundColor3.toHex()}
                  onChange={(e) => notify('BackgroundColor3', RBXColor3.fromHex(e.target.value))}
                  className="w-8 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-neutral-300 text-[10px]">
                  {(instance as RBXGuiObject).BackgroundColor3.toHex()}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">Transparency</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={1}
                value={(instance as RBXGuiObject).BackgroundTransparency}
                onChange={(e) => notify('BackgroundTransparency', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
          </div>

          {/* Visible & ZIndex */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(instance as RBXGuiObject).Visible}
                  onChange={(e) => notify('Visible', e.target.checked)}
                />
                <span>Visible</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">ZIndex</label>
              <input
                type="number"
                value={(instance as RBXGuiObject).ZIndex}
                onChange={(e) => notify('ZIndex', parseInt(e.target.value) || 1)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* UICORNER PROPERTIES */}
      {isCorner && (
        <div className="space-y-2 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">UICorner Properties</div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">CornerRadius (Scale, Offset px)</label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <input
                type="number"
                step="0.05"
                value={(instance as RBXUICorner).CornerRadius.Scale}
                onChange={(e) => {
                  const cr = (instance as RBXUICorner).CornerRadius;
                  notify('CornerRadius', new RBXUDim(parseFloat(e.target.value) || 0, cr.Offset));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white"
                placeholder="Scale"
              />
              <input
                type="number"
                step="1"
                min={0}
                value={(instance as RBXUICorner).CornerRadius.Offset}
                onChange={(e) => {
                  const cr = (instance as RBXUICorner).CornerRadius;
                  notify('CornerRadius', new RBXUDim(cr.Scale, parseInt(e.target.value) || 0));
                }}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white"
                placeholder="Offset px"
              />
            </div>
          </div>
        </div>
      )}

      {/* UISTROKE PROPERTIES */}
      {isStroke && (
        <div className="space-y-2.5 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">UIStroke Properties</div>

          {/* Color */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(instance as RBXUIStroke).Color.toHex()}
                onChange={(e) => notify('Color', RBXColor3.fromHex(e.target.value))}
                className="w-8 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
              />
              <span className="font-mono text-neutral-300 text-[11px]">
                {(instance as RBXUIStroke).Color.toHex()}
              </span>
            </div>
          </div>

          {/* Thickness & Transparency */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">Thickness (px)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={(instance as RBXUIStroke).Thickness}
                onChange={(e) => notify('Thickness', parseFloat(e.target.value) || 1)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-neutral-400">Transparency</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={1}
                value={(instance as RBXUIStroke).Transparency}
                onChange={(e) => notify('Transparency', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              />
            </div>
          </div>

          {/* ApplyStrokeMode */}
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">ApplyStrokeMode</label>
            <select
              value={(instance as RBXUIStroke).ApplyStrokeMode}
              onChange={(e) => notify('ApplyStrokeMode', e.target.value)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white text-xs"
            >
              <option value="Contextual">Contextual</option>
              <option value="Border">Border</option>
            </select>
          </div>
        </div>
      )}

      {/* CLICKDETECTOR PROPERTIES */}
      {isClickDetector && (
        <div className="space-y-2 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">ClickDetector</div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">MaxActivationDistance (studs)</label>
            <input
              type="number"
              min={1}
              max={250}
              value={(instance as RBXClickDetector).MaxActivationDistance}
              onChange={(e) => notify('MaxActivationDistance', parseFloat(e.target.value) || 32)}
              className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
            />
          </div>
        </div>
      )}

      {/* ATTACHMENT PROPERTIES */}
      {isAttachment && (
        <div className="space-y-2 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Attachment</div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-400">Position (X, Y, Z)</label>
            <div className="grid grid-cols-3 gap-1 font-mono">
              {[0, 1, 2].map((idx) => (
                <input
                  key={idx}
                  type="number"
                  step="0.5"
                  value={[(instance as RBXAttachment).Position.X, (instance as RBXAttachment).Position.Y, (instance as RBXAttachment).Position.Z][idx]}
                  onChange={(e) => {
                    const cur = (instance as RBXAttachment).Position;
                    const vals = [cur.X, cur.Y, cur.Z];
                    vals[idx] = parseFloat(e.target.value) || 0;
                    notify('Position', new RBXVector3(vals[0], vals[1], vals[2]));
                  }}
                  className="w-full bg-[#202329] border border-neutral-700 rounded p-1 text-center text-white"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WELD PROPERTIES */}
      {isWeld && (
        <div className="space-y-2 pt-1 border-t border-neutral-800">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Weld / Joint</div>
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={(instance as any).Enabled}
              onChange={(e) => notify('Enabled', e.target.checked)}
            />
            <span>Enabled</span>
          </label>
        </div>
      )}

      {/* UISCALE */}
      {isScale && (
        <div className="space-y-1 pt-1 border-t border-neutral-800">
          <label className="text-[11px] text-neutral-400">Scale (multiplier)</label>
          <input
            type="number"
            step="0.1"
            min={0.1}
            max={10}
            value={(instance as RBXUIScale).Scale}
            onChange={(e) => notify('Scale', parseFloat(e.target.value) || 1)}
            className="w-full bg-[#202329] border border-neutral-700 rounded px-2 py-1 text-white font-mono"
          />
        </div>
      )}
    </div>
  );
}
