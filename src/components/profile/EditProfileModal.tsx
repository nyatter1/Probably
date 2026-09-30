import React, { useState } from 'react';
import { UserProfile } from '../../types/account.ts';
import { accountService } from '../../services/AccountService.ts';
import { X, Save, Edit3, User, Sparkles } from 'lucide-react';

interface EditProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onSaved: (updatedUser: UserProfile) => void;
  onOpenAvatarEditor?: () => void;
}

export default function EditProfileModal({
  user,
  onClose,
  onSaved,
  onOpenAvatarEditor,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName || user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = accountService.updateUserProfile(user.id, {
      displayName: displayName.trim(),
      bio: bio.trim(),
    });

    setIsSaving(false);

    if (res.success && res.user) {
      onSaved(res.user);
      onClose();
    } else {
      setError(res.error || 'Failed to save changes');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-[#181a20] border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-[#1e2027]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Edit Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 bg-[#141619]">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder="Your display name"
              className="w-full px-3.5 py-2 bg-[#20232a] border border-neutral-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
            <p className="text-[11px] text-neutral-500">
              Username: @{user.username} (Usernames cannot be changed)
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                About / Bio
              </label>
              <span className="text-[10px] text-neutral-500">{bio.length}/500</span>
            </div>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              placeholder="Tell other players about yourself, your games, or your style..."
              className="w-full px-3.5 py-2.5 bg-[#20232a] border border-neutral-700/80 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Avatar Shortcut */}
          {onOpenAvatarEditor && (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-xs font-bold text-white">Customize 3D Avatar</p>
                  <p className="text-[10px] text-neutral-400">Change skin tones, clothing, and accessories</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAvatarEditor();
                }}
                className="px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Avatar Editor
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
