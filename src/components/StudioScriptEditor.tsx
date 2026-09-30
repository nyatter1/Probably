import React, { useState } from 'react';
import {
  Code,
  Play,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Info,
  Terminal,
} from 'lucide-react';
import { LUA_SCRIPT_TEMPLATES } from '../utils/luaEngine.ts';

interface StudioScriptEditorProps {
  partName: string;
  initialCode: string;
  onCodeChange: (newCode: string) => void;
  onClose: () => void;
  onStartPlayTest: () => void;
}

export default function StudioScriptEditor({
  partName,
  initialCode,
  onCodeChange,
  onClose,
  onStartPlayTest,
}: StudioScriptEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchWord, setSearchWord] = useState('');

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    onCodeChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const updated = val.substring(0, start) + '    ' + val.substring(end);
      setCode(updated);
      onCodeChange(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTemplate = (templateSource: string) => {
    setCode(templateSource);
    onCodeChange(templateSource);
    setShowTemplates(false);
  };

  const categories = ['All', 'Obstacles', 'Minigames', 'Obby', 'Mechanics', 'Interactive', 'Visuals'];
  const filteredTemplates =
    activeCategory === 'All'
      ? LUA_SCRIPT_TEMPLATES
      : LUA_SCRIPT_TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs overflow-hidden select-text">
      {/* 1. SCRIPT EDITOR TOOLBAR */}
      <div className="h-10 bg-[#252526] border-b border-[#333333] px-3 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e1e1e] border border-neutral-700 rounded text-neutral-200 text-xs font-semibold">
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>Script:</span>
            <span className="text-white font-bold">{partName}.lua</span>
          </div>

          {/* Template Preset Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-2.5 py-1 rounded bg-[#2d2d30] hover:bg-[#38383c] text-white font-semibold flex items-center gap-1.5 border border-neutral-700 cursor-pointer text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Insert Preset Template</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showTemplates && (
              <div className="absolute left-0 mt-1 w-80 bg-[#1e1e1e] border border-[#3e3e42] shadow-2xl rounded-lg py-2 z-50 overflow-hidden font-sans">
                <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-[#333333] flex items-center justify-between">
                  <span>Lua Script Presets</span>
                  <span className="text-[10px] text-amber-400">{filteredTemplates.length} templates</span>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-b border-[#2d2d30] scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        activeCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#2d2d30] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto p-1 space-y-1">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl.source)}
                      className="p-2 rounded hover:bg-[#2a2d32] cursor-pointer transition-colors group"
                    >
                      <div className="font-semibold text-xs text-neutral-200 group-hover:text-blue-400 flex items-center justify-between">
                        <span>{tpl.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#333333] rounded text-neutral-400 font-mono">
                          {tpl.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              <span>Saved (Ctrl+S)</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 bg-[#2d2d30] hover:bg-[#38383c] text-neutral-300 hover:text-white rounded border border-neutral-700 flex items-center gap-1 text-xs cursor-pointer"
            title="Copy script code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCode('');
              onCodeChange('');
            }}
            className="px-2 py-1 bg-[#2d2d30] hover:bg-[#38383c] text-neutral-400 hover:text-red-300 rounded border border-neutral-700 flex items-center gap-1 text-xs cursor-pointer"
            title="Clear script"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={onStartPlayTest}
            className="px-3 py-1 bg-[#2a6839] hover:bg-[#347d46] text-white font-bold rounded flex items-center gap-1.5 border border-[#3e9354] shadow transition-all cursor-pointer text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run in Play Test</span>
          </button>
        </div>
      </div>

      {/* 2. SCRIPT CODE EDITOR CANVAS (WITH LINE NUMBERS & TABBING) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line numbers gutter */}
        <div className="w-12 bg-[#1e1e1e] border-r border-[#333333] select-none text-right pr-2.5 py-3 text-[#858585] text-xs font-mono shrink-0 overflow-hidden leading-5">
          {Array.from({ length: Math.max(lineCount, 25) }, (_, i) => (
            <div key={i + 1} className="h-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area Code Editor */}
        <div className="flex-1 relative overflow-auto bg-[#1e1e1e]">
          <textarea
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`-- Write your Roblox Lua script here!
-- Examples:
-- local part = script.Parent
-- part.Touched:Connect(function(hit)
--     local hum = hit.Parent:FindFirstChild("Humanoid")
--     if hum then hum.Health = 0 end
-- end)`}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full h-full p-3 bg-transparent text-[#d4d4d4] font-mono text-xs leading-5 resize-none focus:outline-none placeholder-[#6a737d] whitespace-pre tab-size-4"
            style={{ tabSize: 4 }}
          />
        </div>
      </div>

      {/* 3. SCRIPT STATUS BAR */}
      <div className="h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] font-sans font-medium select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            <span>Luau / Roblox Script Engine</span>
          </div>
          <span>•</span>
          <span>{lineCount} lines</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>

        <div className="flex items-center gap-2">
          <Info className="w-3 h-3" />
          <span>Supports Touched, TweenService, Vector3, Color3, task.wait(), Health, and Disappearing mechanics</span>
        </div>
      </div>
    </div>
  );
}
