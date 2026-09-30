import React, { useState, useEffect } from 'react';
import { UserProfile, WearableItem } from '../../types/account.ts';
import { SavedGame } from '../../utils/gamesStorage.ts';
import { accountService } from '../../services/AccountService.ts';
import { followService } from '../../services/FollowService.ts';
import { creationService } from '../../services/CreationService.ts';
import ProfileAvatarViewer from './ProfileAvatarViewer.tsx';
import CurrentlyWearingViewer from './CurrentlyWearingViewer.tsx';
import FollowListModal from './FollowListModal.tsx';
import EditProfileModal from './EditProfileModal.tsx';
import {
  UserPlus,
  UserCheck,
  Edit3,
  Calendar,
  Sparkles,
  Play,
  Plus,
  Users,
  Compass,
  Hammer
} from 'lucide-react';

interface ProfilePageProps {
  profileUser: UserProfile;
  currentUser: UserProfile | null;
  onPlayGame: (game: SavedGame) => void;
  onOpenGameDetails: (game: SavedGame) => void;
  onOpenStudio: (game?: SavedGame) => void;
  onOpenAvatarEditor: () => void;
  onSelectUserProfile: (user: UserProfile) => void;
  onAuthPrompt: () => void;
}

export default function ProfilePage({
  profileUser,
  currentUser,
  onPlayGame,
  onOpenGameDetails,
  onOpenStudio,
  onOpenAvatarEditor,
  onSelectUserProfile,
  onAuthPrompt,
}: ProfilePageProps) {
  const [user, setUser] = useState<UserProfile>(profileUser);
  const [creations, setCreations] = useState<SavedGame[]>([]);
  const [modalState, setModalState] = useState<'followers' | 'following' | 'edit' | null>(null);
  const [followTick, setFollowTick] = useState(0);

  // Sync user and creations
  useEffect(() => {
    const fresh = accountService.getUserById(profileUser.id) || profileUser;
    setUser(fresh);
    const userCreations = creationService.getCreationsForUser(profileUser.id);
    setCreations(userCreations);
  }, [profileUser, followTick]);

  // Subscribe to follow changes
  useEffect(() => {
    const unsub = followService.subscribe(() => {
      setFollowTick((t) => t + 1);
    });
    return unsub;
  }, []);

  const isOwnProfile = currentUser && currentUser.id === user.id;
  const isFollowing = currentUser ? followService.isFollowing(currentUser.id, user.id) : false;
  const counts = followService.getCounts(user.id);

  const handleFollowClick = () => {
    if (!currentUser) {
      onAuthPrompt();
      return;
    }
    followService.toggleFollow(currentUser.id, user.id);
    setFollowTick((t) => t + 1);
  };

  const followersList = followService.getFollowers(user.id);
  const followingList = followService.getFollowing(user.id);

  const joinedDateFormatted = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'September 2026';

  const handleCreateNewGame = () => {
    if (!currentUser) {
      onAuthPrompt();
      return;
    }
    const newGame = creationService.createNewGameForUser(currentUser.id, `${currentUser.displayName}'s Place`);
    onOpenStudio(newGame);
  };

  return (
    <div className="min-h-screen bg-[#101216] text-white p-3 sm:p-6 lg:p-8 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#181a20]/95 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Desktop 3-Column / Mobile Stack Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 1. LEFT: 3D Portrait Avatar (approx 3 cols) */}
            <div className="lg:col-span-3 flex flex-col items-center">
              <div className="w-full max-w-[260px] aspect-square bg-[#121418] rounded-3xl border border-neutral-800 shadow-xl overflow-hidden relative group">
                <ProfileAvatarViewer avatar={user.avatar} className="w-full h-full" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-purple-300">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>3D Portrait</span>
                </div>
              </div>
            </div>

            {/* 2. CENTER: Profile Info (approx 6 cols) */}
            <div className="lg:col-span-5 space-y-4 text-center lg:text-left min-w-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {user.displayName}
                </h1>
                <p className="text-sm font-semibold text-purple-400 mt-0.5">@{user.username}</p>
              </div>

              {/* Followers & Following Counts (Interactive) */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold pt-1">
                <button
                  type="button"
                  onClick={() => setModalState('followers')}
                  className="flex items-center gap-1.5 bg-[#20232a] hover:bg-[#282c35] px-3.5 py-2 rounded-xl border border-neutral-800 hover:border-purple-500/40 transition-all cursor-pointer group"
                >
                  <span className="text-white font-extrabold group-hover:text-purple-300">
                    {counts.followersCount}
                  </span>
                  <span className="text-neutral-400">Followers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalState('following')}
                  className="flex items-center gap-1.5 bg-[#20232a] hover:bg-[#282c35] px-3.5 py-2 rounded-xl border border-neutral-800 hover:border-purple-500/40 transition-all cursor-pointer group"
                >
                  <span className="text-white font-extrabold group-hover:text-purple-300">
                    {counts.followingCount}
                  </span>
                  <span className="text-neutral-400">Following</span>
                </button>

                <div className="flex items-center gap-1.5 text-neutral-400 bg-[#16181d] px-3 py-2 rounded-xl border border-neutral-800/60">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Joined {joinedDateFormatted}</span>
                </div>
              </div>

              {/* Follow / Edit Profile Action Button */}
              <div className="pt-2">
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setModalState('edit')}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFollowClick}
                    className={`px-7 py-2.5 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                      isFollowing
                        ? 'bg-neutral-800 hover:bg-red-950/70 text-neutral-200 hover:text-red-300 border border-neutral-700/80 hover:border-red-700/60'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* About Section */}
              <div className="pt-3 border-t border-neutral-800/70">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  About
                </h3>
                <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line bg-[#14161a] p-3.5 rounded-2xl border border-neutral-800/60">
                  {user.bio || 'Welcome to my profile! Playing and creating 3D experiences.'}
                </p>
              </div>
            </div>

            {/* 3. RIGHT: 3D Currently Wearing (approx 4 cols) */}
            <div className="lg:col-span-4 w-full">
              <CurrentlyWearingViewer
                avatar={user.avatar}
                isOwner={Boolean(isOwnProfile)}
                onItemClick={() => {
                  if (isOwnProfile) onOpenAvatarEditor();
                }}
              />
            </div>
          </div>
        </div>

        {/* CREATIONS SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Compass className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Creations</h2>
              <span className="text-xs font-semibold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700/50">
                {creations.length}
              </span>
            </div>

            {isOwnProfile && (
              <button
                type="button"
                onClick={handleCreateNewGame}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Game</span>
              </button>
            )}
          </div>

          {creations.length === 0 ? (
            <div className="bg-[#181a20] border border-neutral-800/80 rounded-2xl p-10 text-center space-y-3">
              <Hammer className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No creations yet</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                {isOwnProfile
                  ? 'Start creating your first 3D game using Studio with parts, models, and Luau scripts!'
                  : `${user.displayName} hasn't published any creations yet.`}
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={handleCreateNewGame}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build a Game</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {creations.map((game) => (
                <div
                  key={game.id}
                  onClick={() => onOpenGameDetails(game)}
                  className="bg-[#181a20] hover:bg-[#1e222a] border border-neutral-800 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer group flex flex-col"
                >
                  {/* Game Thumbnail / Icon */}
                  <div className="aspect-[16/10] bg-[#121418] relative overflow-hidden flex items-center justify-center">
                    {game.iconUrl ? (
                      <img
                        src={game.iconUrl}
                        alt={game.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-950 p-4 text-center">
                        <Sparkles className="w-8 h-8 text-purple-400 mb-1" />
                        <span className="font-extrabold text-lg text-white">{game.initials}</span>
                      </div>
                    )}

                    {/* Hover Play Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayGame(game);
                        }}
                        className="p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all cursor-pointer"
                        title="Play Now"
                      >
                        <Play className="w-5 h-5 fill-white" />
                      </button>
                    </div>
                  </div>

                  {/* Info Card */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {game.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate">by {game.creator}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Users className="w-3 h-3" />
                        <span>{(game as any).playingCount || 12} playing</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayGame(game);
                        }}
                        className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>PLAY</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalState === 'followers' && (
        <FollowListModal
          title="Followers"
          users={followersList}
          currentUserId={currentUser ? currentUser.id : null}
          onClose={() => setModalState(null)}
          onSelectUser={(u) => onSelectUserProfile(u)}
          onFollowChange={() => setFollowTick((t) => t + 1)}
        />
      )}

      {modalState === 'following' && (
        <FollowListModal
          title="Following"
          users={followingList}
          currentUserId={currentUser ? currentUser.id : null}
          onClose={() => setModalState(null)}
          onSelectUser={(u) => onSelectUserProfile(u)}
          onFollowChange={() => setFollowTick((t) => t + 1)}
        />
      )}

      {modalState === 'edit' && isOwnProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setModalState(null)}
          onSaved={(updated) => {
            setUser(updated);
            setFollowTick((t) => t + 1);
          }}
          onOpenAvatarEditor={onOpenAvatarEditor}
        />
      )}
    </div>
  );
}
