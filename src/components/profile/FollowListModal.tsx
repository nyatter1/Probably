import React, { useState } from 'react';
import { UserProfile } from '../../types/account.ts';
import { followService } from '../../services/FollowService.ts';
import { X, Search, UserCheck, UserPlus, Users } from 'lucide-react';

interface FollowListModalProps {
  title: 'Followers' | 'Following';
  users: UserProfile[];
  currentUserId: string | null;
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onFollowChange?: () => void;
}

export default function FollowListModal({
  title,
  users,
  currentUserId,
  onClose,
  onSelectUser,
  onFollowChange,
}: FollowListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q)
    );
  });

  const handleToggleFollow = (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!currentUserId) return;
    followService.toggleFollow(currentUserId, targetUserId);
    if (onFollowChange) onFollowChange();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#181a20] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-[#1e2027]">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
            <span className="text-xs font-semibold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700/50">
              {users.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-neutral-800/80 bg-[#141619]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#20232a] border border-neutral-700/70 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* User List */}
        <div className="overflow-y-auto p-2 space-y-1 divide-y divide-neutral-800/40">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">
              {searchTerm ? 'No users found matching query' : `No ${title.toLowerCase()} yet.`}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = currentUserId === user.id;
              const isFollowing = currentUserId ? followService.isFollowing(currentUserId, user.id) : false;

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#20232a] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar preview dot / initials */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-md flex-shrink-0 border border-neutral-700/50"
                      style={{
                        backgroundColor: user.avatar?.colors?.torso || '#3b82f6',
                      }}
                    >
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {user.displayName}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">@{user.username}</p>
                    </div>
                  </div>

                  {!isSelf && currentUserId && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, user.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isFollowing
                          ? 'bg-neutral-800 hover:bg-red-950/60 text-neutral-300 hover:text-red-300 border border-neutral-700/60 hover:border-red-700/50'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
