import React, { useState } from 'react';
import {
  Terminal,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { OutputLogMessage } from '../utils/luaEngine.ts';

interface StudioOutputConsoleProps {
  logs: OutputLogMessage[];
  onClear: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function StudioOutputConsole({
  logs,
  onClear,
  isOpen,
  onToggleOpen,
}: StudioOutputConsoleProps) {
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warn' | 'log'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((l) => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (searchQuery.trim()) {
      return l.message.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="bg-[#181a1f] border-t border-[#2d3036] flex flex-col shrink-0 select-none z-30 transition-all duration-150">
      {/* HEADER BAR */}
      <div className="h-7 bg-[#141619] border-b border-[#2d3036] flex items-center justify-between px-3 text-xs">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center gap-1.5 text-neutral-300 hover:text-white font-bold text-[11px] uppercase tracking-wider cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Output Window</span>
          <span className="text-[10px] text-neutral-500 font-mono">({logs.length})</span>
          {isOpen ? <ChevronDown className="w-3 h-3 text-neutral-400" /> : <ChevronUp className="w-3 h-3 text-neutral-400" />}
        </button>

        {isOpen && (
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-1 bg-[#1e2026] border border-neutral-700/80 rounded px-1.5 py-0.5">
              <Search className="w-3 h-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Filter output..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-[11px] text-white focus:outline-none w-24"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-[#1e2026] rounded border border-neutral-700/80 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${filterType === 'all' ? 'bg-[#2a2d34] text-white font-bold' : 'text-neutral-400'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('error')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${filterType === 'error' ? 'bg-red-900/60 text-red-300 font-bold' : 'text-neutral-400'}`}
              >
                Errors
              </button>
              <button
                type="button"
                onClick={() => setFilterType('warn')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${filterType === 'warn' ? 'bg-amber-900/60 text-amber-300 font-bold' : 'text-neutral-400'}`}
              >
                Warns
              </button>
            </div>

            <button
              type="button"
              onClick={onClear}
              className="p-1 hover:bg-[#252830] text-neutral-400 hover:text-white rounded cursor-pointer"
              title="Clear Output"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* LOGS LIST (EXPANDABLE) */}
      {isOpen && (
        <div className="h-36 overflow-y-auto p-2 font-mono text-[11px] space-y-1 bg-[#0f1115] select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-neutral-500 italic py-2 text-center text-xs font-sans">
              Output is empty. Run Play Test or call print() in Lua scripts to see output logs.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 py-0.5 px-1.5 rounded leading-4 ${
                  log.type === 'error'
                    ? 'text-red-400 bg-red-950/20'
                    : log.type === 'warn'
                    ? 'text-amber-300 bg-amber-950/20'
                    : log.type === 'info'
                    ? 'text-blue-300 bg-blue-950/20'
                    : 'text-neutral-200'
                }`}
              >
                <span className="text-neutral-500 text-[10px] shrink-0">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />}
                {log.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />}
                {log.type === 'info' && <Info className="w-3.5 h-3.5 shrink-0 text-blue-400 mt-0.5" />}
                <span className="break-all whitespace-pre-wrap">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
