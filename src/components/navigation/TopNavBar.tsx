import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types/account.ts';
import {
  Home,
  Compass,
  Hammer,
  User,
  Sparkles,
  Search,
  LogIn,
  LogOut,
  ChevronDown,
  Layers,
  Settings,
  Users
} from 'lucide-react';

interface TopNavBarProps {
  activeTab: 'home' | 'discover' | 'create' | 'avatar' | 'profile' | 'gameDetails';
  onSelectTab: (tab: 'home' | 'discover' | 'create' | 'avatar' | 'profile') => void;
  currentUser: UserProfile | null;
  onOpenProfile: (user?: UserProfile) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogOut: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function TopNavBar({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
  onOpenAuth,
  onLogOut,
  searchQuery,
  onSearchChange,
}: TopNavBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#121418]/95 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 py-2.5 select-none transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Main Nav Tabs */}
        <div className="flex items-center gap-6">
          {/* Custom Brand Logo */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-white group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-white via-neutral-100 to-purple-300 bg-clip-text text-transparent">
              ROVIX
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>HOME</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('discover')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'discover'
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>DISCOVER</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('create')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>CREATE</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('avatar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'avatar'
                  ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>AVATAR</span>
            </button>
          </nav>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search experiences, creators, or tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 bg-[#1a1d24] border border-neutral-700/60 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Right User Auth / Profile Area */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl border transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-600/20'
                    : 'bg-[#1a1d24] hover:bg-[#222630] border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Avatar Initial Badge */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs border border-neutral-700/50 flex-shrink-0"
                  style={{
                    backgroundColor: currentUser.avatar?.colors?.torso || '#3b82f6',
                  }}
                >
                  {currentUser.displayName.slice(0, 1).toUpperCase()}
                </div>

                <div className="text-left hidden xs:block">
                  <p className="text-xs font-bold text-white leading-tight truncate max-w-[100px]">
                    {currentUser.displayName}
                  </p>
                  <p className="text-[10px] text-purple-400 leading-tight">@{currentUser.username}</p>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* User Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-[#181a20] border border-neutral-800 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-neutral-800/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser.displayName}</p>
                    <p className="text-[11px] text-neutral-400">@{currentUser.username}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenProfile(currentUser);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white hover:bg-[#242730] transition-colors cursor-pointer text-left"
                  >
                    <User className="w-4 h-4 text-purple-400" />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onSelectTab('create');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white hover:bg-[#242730] transition-colors cursor-pointer text-left"
                  >
                    <Hammer className="w-4 h-4 text-indigo-400" />
                    <span>My Creations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onSelectTab('avatar');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-200 hover:text-white hover:bg-[#242730] transition-colors cursor-pointer text-left"
                  >
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Avatar Editor</span>
                  </button>

                  <div className="border-t border-neutral-800/80 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onLogOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 bg-[#1f222a] hover:bg-[#282d38] text-white text-xs font-bold rounded-xl border border-neutral-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
