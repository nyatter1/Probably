import React, { useState } from 'react';
import { RBXInstance } from '../../scripting/instances/Instance.ts';
import { RBXInstanceFactory } from '../../scripting/instances/InstanceFactory.ts';
import { RBXGuiObject } from '../../scripting/instances/ui/GuiObject.ts';
import { RBXUDim2 } from '../../scripting/datatypes/UDim2.ts';
import { StudioPart } from '../../utils/gamesStorage.ts';
import { RBXScript } from '../../scripting/instances/Script.ts';
import {
  Folder,
  Box,
  Monitor,
  Square,
  Type,
  MousePointer,
  Image as ImageIcon,
  TextCursorInput,
  Layers,
  Sparkles,
  PenTool,
  CornerDownRight,
  Maximize2,
  Ratio,
  Code,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Pin,
  Link,
  Shield,
} from 'lucide-react';

export interface StudioExplorerProps {
  parts: StudioPart[];
  starterGui: RBXInstance;
  livePlayerGui?: RBXInstance | null;
  isPlaying: boolean;
  selectedPartId: string | null;
  selectedUiInstance: RBXInstance | null;
  onSelectPart: (partId: string) => void;
  onSelectUiInstance: (instance: RBXInstance) => void;
  onDeletePart: (partId: string) => void;
  onOpenPartScript: (partId: string) => void;
  onOpenScriptInstance: (script: RBXScript) => void;
  onHierarchyUpdated: () => void;
}

export function getInstanceIcon(className: string) {
  switch (className) {
    case 'ScreenGui':
      return <Monitor className="w-3 h-3 text-purple-400" />;
    case 'Frame':
      return <Square className="w-3 h-3 text-blue-400" />;
    case 'TextLabel':
      return <Type className="w-3 h-3 text-cyan-400" />;
    case 'TextButton':
      return <MousePointer className="w-3 h-3 text-emerald-400" />;
    case 'ImageLabel':
    case 'ImageButton':
      return <ImageIcon className="w-3 h-3 text-pink-400" />;
    case 'TextBox':
      return <TextCursorInput className="w-3 h-3 text-amber-400" />;
    case 'ScrollingFrame':
      return <Layers className="w-3 h-3 text-indigo-400" />;
    case 'UICorner':
      return <CornerDownRight className="w-3 h-3 text-yellow-400" />;
    case 'UIStroke':
      return <PenTool className="w-3 h-3 text-orange-400" />;
    case 'UIScale':
      return <Maximize2 className="w-3 h-3 text-lime-400" />;
    case 'UIAspectRatioConstraint':
      return <Ratio className="w-3 h-3 text-teal-400" />;
    case 'Script':
    case 'LocalScript':
      return <Code className="w-3 h-3 text-amber-400" />;
    case 'ClickDetector':
      return <MousePointer className="w-3 h-3 text-cyan-300" />;
    case 'Attachment':
      return <Pin className="w-3 h-3 text-purple-300" />;
    case 'Weld':
    case 'WeldConstraint':
      return <Link className="w-3 h-3 text-rose-300" />;
    case 'Folder':
    case 'Model':
      return <Folder className="w-3 h-3 text-amber-500" />;
    default:
      return <Box className="w-3 h-3 text-neutral-400" />;
  }
}

export function getValidChildrenFor(target: RBXInstance | 'StarterGui' | 'Workspace'): Array<{ className: string; name: string }> {
  if (target === 'StarterGui' || (target instanceof RBXInstance && target.ClassName === 'StarterGui')) {
    return [{ className: 'ScreenGui', name: 'ScreenGui' }];
  }

  if (target instanceof RBXInstance) {
    if (['ScreenGui', 'Frame', 'ScrollingFrame'].includes(target.ClassName)) {
      return [
        { className: 'Frame', name: 'Frame' },
        { className: 'TextLabel', name: 'TextLabel' },
        { className: 'TextButton', name: 'TextButton' },
        { className: 'TextBox', name: 'TextBox' },
        { className: 'ImageLabel', name: 'ImageLabel' },
        { className: 'ImageButton', name: 'ImageButton' },
        { className: 'ScrollingFrame', name: 'ScrollingFrame' },
        { className: 'UICorner', name: 'UICorner' },
        { className: 'UIStroke', name: 'UIStroke' },
        { className: 'UIPadding', name: 'UIPadding' },
        { className: 'UIListLayout', name: 'UIListLayout' },
        { className: 'UIGridLayout', name: 'UIGridLayout' },
        { className: 'UIScale', name: 'UIScale' },
        { className: 'Script', name: 'Script' },
        { className: 'LocalScript', name: 'LocalScript' },
      ];
    }

    if (['TextButton', 'TextLabel', 'ImageButton', 'ImageLabel', 'TextBox'].includes(target.ClassName)) {
      return [
        { className: 'UICorner', name: 'UICorner' },
        { className: 'UIStroke', name: 'UIStroke' },
        { className: 'UIPadding', name: 'UIPadding' },
        { className: 'UIScale', name: 'UIScale' },
        { className: 'Frame', name: 'Frame' },
        { className: 'TextLabel', name: 'TextLabel' },
        { className: 'TextButton', name: 'TextButton' },
        { className: 'Script', name: 'Script' },
        { className: 'LocalScript', name: 'LocalScript' },
      ];
    }
  }

  // Workspace or 3D Part
  return [
    { className: 'Part', name: 'Part' },
    { className: 'ClickDetector', name: 'ClickDetector' },
    { className: 'Attachment', name: 'Attachment' },
    { className: 'Weld', name: 'Weld' },
    { className: 'WeldConstraint', name: 'WeldConstraint' },
    { className: 'Model', name: 'Model' },
    { className: 'Folder', name: 'Folder' },
    { className: 'Script', name: 'Script' },
    { className: 'LocalScript', name: 'LocalScript' },
  ];
}

export default function StudioExplorer({
  parts,
  starterGui,
  livePlayerGui,
  isPlaying,
  selectedPartId,
  selectedUiInstance,
  onSelectPart,
  onSelectUiInstance,
  onDeletePart,
  onOpenPartScript,
  onOpenScriptInstance,
  onHierarchyUpdated,
}: StudioExplorerProps) {
  const [activePlusMenuTarget, setActivePlusMenuTarget] = useState<RBXInstance | 'StarterGui' | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddChild = (parent: RBXInstance, className: string) => {
    const child = RBXInstanceFactory.new(className);
    if (child instanceof RBXGuiObject && parent.ClassName === 'ScreenGui') {
      if (className === 'Frame') {
        child.Size = RBXUDim2.new(0, 240, 0, 160);
        child.Position = RBXUDim2.new(0.5, -120, 0.5, -80);
      } else if (className === 'TextLabel') {
        child.Size = RBXUDim2.new(0, 200, 0, 50);
        child.Position = RBXUDim2.new(0.5, -100, 0.35, -25);
        (child as any).Text = 'New Label';
      } else if (className === 'TextButton') {
        child.Size = RBXUDim2.new(0, 180, 0, 46);
        child.Position = RBXUDim2.new(0.5, -90, 0.6, -23);
        (child as any).Text = 'Click Me';
      } else if (className === 'TextBox') {
        child.Size = RBXUDim2.new(0, 200, 0, 40);
        child.Position = RBXUDim2.new(0.5, -100, 0.5, -20);
      } else if (className === 'ImageLabel') {
        child.Size = RBXUDim2.new(0, 120, 0, 120);
        child.Position = RBXUDim2.new(0.5, -60, 0.5, -60);
      }
    }
    child.Parent = parent;
    setActivePlusMenuTarget(null);
    onSelectUiInstance(child);
    onHierarchyUpdated();
  };

  const handleDeleteUi = (instance: RBXInstance, e: React.MouseEvent) => {
    e.stopPropagation();
    instance.Destroy();
    onHierarchyUpdated();
  };

  // Recursive UI Node renderer
  const renderUiNode = (inst: RBXInstance, depth = 1) => {
    const children = inst.GetChildren();
    const hasChildren = children.length > 0;
    const isCollapsed = Boolean(collapsedNodes[inst.id]);
    const isSelected = selectedUiInstance?.id === inst.id;
    const validChildren = getValidChildrenFor(inst);

    return (
      <div key={inst.id} className="space-y-0.5">
        <div
          onClick={() => onSelectUiInstance(inst)}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          className={`flex items-center justify-between py-1 pr-2 rounded cursor-pointer transition-colors group ${
            isSelected
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-neutral-300 hover:bg-[#23262c]'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(inst.id, e)}
                className="p-0.5 hover:text-white text-neutral-400"
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {getInstanceIcon(inst.ClassName)}
            <span className="truncate">{inst.Name}</span>
          </div>

          {!isPlaying && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {inst instanceof RBXScript && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenScriptInstance(inst);
                  }}
                  title="Open Script"
                  className="p-0.5 hover:text-amber-300 text-amber-400 cursor-pointer"
                >
                  <Code className="w-3 h-3" />
                </button>
              )}

              {validChildren.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePlusMenuTarget(activePlusMenuTarget === inst ? null : inst);
                    }}
                    title="Insert Object"
                    className="p-0.5 hover:text-emerald-400 text-neutral-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {activePlusMenuTarget === inst && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-[#1b1d22] border border-neutral-700 shadow-2xl rounded p-1 z-50 max-h-56 overflow-y-auto space-y-0.5">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider px-2 py-1 border-b border-neutral-800 font-sans">
                        Insert Child
                      </div>
                      {validChildren.map((vc) => (
                        <button
                          key={vc.className}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddChild(inst, vc.className);
                          }}
                          className="w-full text-left px-2 py-1 rounded text-[11px] text-neutral-200 hover:bg-[#252830] hover:text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          {getInstanceIcon(vc.className)}
                          <span>{vc.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={(e) => handleDeleteUi(inst, e)}
                title="Delete"
                className="p-0.5 hover:text-red-400 text-neutral-500 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children nodes */}
        {hasChildren && !isCollapsed && (
          <div className="space-y-0.5">
            {children.map((child) => renderUiNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const activeGuiRoot = isPlaying && livePlayerGui ? livePlayerGui : starterGui;

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-mono select-none">
      {/* 1. WORKSPACE ROOT */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 py-1 px-1.5 text-neutral-300 font-bold">
          <Folder className="w-3.5 h-3.5 text-amber-400" />
          <span>Workspace</span>
        </div>

        <div className="pl-4 space-y-0.5">
          <div className="flex items-center gap-1.5 py-0.5 px-1.5 text-neutral-400">
            <Box className="w-3 h-3 text-emerald-500" />
            <span>Baseplate</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5 px-1.5 text-neutral-400">
            <Box className="w-3 h-3 text-neutral-400" />
            <span>SpawnLocation</span>
          </div>

          {/* 3D Parts */}
          {parts.map((p) => {
            const isSelected = selectedPartId === p.id && !selectedUiInstance;
            const hasScript = Boolean(p.script && p.script.code.trim());

            return (
              <div key={p.id} className="space-y-0.5">
                <div
                  onClick={() => onSelectPart(p.id)}
                  className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-300 hover:bg-[#23262c]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Box className="w-3 h-3" />
                    <span className="truncate">{p.name}</span>
                  </div>

                  {!isPlaying && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPartScript(p.id);
                        }}
                        title={hasScript ? 'Open Script' : 'Add Script'}
                        className="p-0.5 hover:text-amber-300 cursor-pointer"
                      >
                        <Code className={`w-3.5 h-3.5 ${hasScript ? 'text-amber-400' : 'text-neutral-500'}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePart(p.id);
                        }}
                        title="Delete"
                        className="p-0.5 hover:text-red-400 text-neutral-500 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-children of part (ClickDetector, Script) */}
                <div className="pl-5 space-y-0.5 text-[11px]">
                  {p.hasClickDetector && (
                    <div className="flex items-center gap-1.5 py-0.5 px-2 text-cyan-300">
                      <MousePointer className="w-3 h-3 text-cyan-400" />
                      <span>ClickDetector</span>
                    </div>
                  )}
                  {hasScript && (
                    <div
                      onClick={() => onOpenPartScript(p.id)}
                      className="flex items-center gap-1.5 py-0.5 px-2 text-amber-300/90 hover:bg-[#252830] rounded cursor-pointer"
                    >
                      <Code className="w-3 h-3 text-amber-400" />
                      <span>{p.script?.name || 'Script'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. STARTERGUI / PLAYERGUI ROOT */}
      <div className="space-y-0.5 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between py-1 px-1.5 text-neutral-300 font-bold group">
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-purple-400" />
            <span>{isPlaying ? 'PlayerGui (Live)' : 'StarterGui'}</span>
          </div>

          {!isPlaying && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActivePlusMenuTarget(activePlusMenuTarget === 'StarterGui' ? null : 'StarterGui')
                }
                title="Add ScreenGui"
                className="p-0.5 hover:text-emerald-400 text-neutral-400 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {activePlusMenuTarget === 'StarterGui' && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#1b1d22] border border-neutral-700 shadow-2xl rounded p-1 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      handleAddChild(starterGui, 'ScreenGui');
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[11px] text-neutral-200 hover:bg-[#252830] hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Monitor className="w-3 h-3 text-purple-400" />
                    <span>ScreenGui</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* UI Hierarchy */}
        <div className="space-y-0.5">
          {activeGuiRoot.GetChildren().length === 0 ? (
            <div className="pl-6 py-1 text-[11px] text-neutral-500 italic">
              No UI elements. Click '+' to add ScreenGui!
            </div>
          ) : (
            activeGuiRoot.GetChildren().map((child) => renderUiNode(child, 1))
          )}
        </div>
      </div>
    </div>
  );
}
