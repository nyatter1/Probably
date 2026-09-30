import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, User, Lock, Eye, EyeOff } from 'lucide-react';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  UserProfileData,
} from '../../utils/firebase.ts';
import { DEFAULT_AVATAR_COLORS, saveAvatarToStorage, saveStoredInventory, INITIAL_SHIRTS, INITIAL_PANTS } from '../../utils/inventoryStorage.ts';
import { saveOwnedBackgroundIds, setEquippedBackgroundId } from '../../utils/backgroundsStorage.ts';

interface AuthPageProps {
  onAuthSuccess: (profile: UserProfileData) => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthMonth, setBirthMonth] = useState('Month');
  const [birthDay, setBirthDay] = useState('Day');
  const [birthYear, setBirthYear] = useState('Year');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatEmailFromUsername = (uname: string) => {
    const clean = uname.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    return `${clean || 'user'}@revix.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const email = formatEmailFromUsername(trimmedUsername);

      if (mode === 'signup') {
        if (birthMonth === 'Month' || birthDay === 'Day' || birthYear === 'Year') {
          setError('Please select your complete date of birth.');
          setLoading(false);
          return;
        }

        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Set Firebase Auth displayName to username
        await updateProfile(user, {
          displayName: trimmedUsername,
        });

        // 3. Create Firestore User Profile Document
        const birthdayStr = `${birthMonth} ${birthDay}, ${birthYear}`;
        const userDocData: UserProfileData = {
          uid: user.uid,
          username: trimmedUsername,
          displayName: trimmedUsername, // "shows ur username and display name as the same"
          birthday: birthdayStr,
          avatarColors: DEFAULT_AVATAR_COLORS,
          activeShirtUrl: '/presets/classic_shirt.png',
          activePantsUrl: '/presets/classic_pants.png',
          equippedBackgroundId: null,
          ownedClothing: ['basic_classic_shirt', 'basic_classic_pants'],
          ownedBackgrounds: [],
          bio: `Hello! I'm ${trimmedUsername} on Rovix!`,
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userDocData);
        } catch (dbErr) {
          console.warn('Firestore setDoc notice (using local persistence):', dbErr);
        }

        // Reset local storage for new user so old device state never bleeds into new account
        saveOwnedBackgroundIds([]);
        setEquippedBackgroundId(null);
        saveStoredInventory({
          shirts: INITIAL_SHIRTS,
          pants: INITIAL_PANTS,
        });
        saveAvatarToStorage({
          colors: DEFAULT_AVATAR_COLORS,
          shirtUrl: INITIAL_SHIRTS[0].dataUrl,
          pantsUrl: INITIAL_PANTS[0].dataUrl,
        });

        // Store user profile locally for instant restore
        localStorage.setItem('rovix_current_user_v1', JSON.stringify(userDocData));
        onAuthSuccess(userDocData);
      } else {
        // Log In flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let profileData: UserProfileData;
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (userDocSnap.exists()) {
            profileData = userDocSnap.data() as UserProfileData;
          } else {
            profileData = {
              uid: user.uid,
              username: trimmedUsername,
              displayName: trimmedUsername,
              avatarColors: DEFAULT_AVATAR_COLORS,
              activeShirtUrl: '/presets/classic_shirt.png',
              activePantsUrl: '/presets/classic_pants.png',
              equippedBackgroundId: null,
              ownedClothing: ['basic_classic_shirt', 'basic_classic_pants'],
              ownedBackgrounds: [],
              createdAt: new Date().toISOString(),
            };
          }
        } catch {
          profileData = {
            uid: user.uid,
            username: trimmedUsername,
            displayName: trimmedUsername,
            avatarColors: DEFAULT_AVATAR_COLORS,
            activeShirtUrl: '/presets/classic_shirt.png',
            activePantsUrl: '/presets/classic_pants.png',
            equippedBackgroundId: null,
            ownedClothing: ['basic_classic_shirt', 'basic_classic_pants'],
            ownedBackgrounds: [],
            createdAt: new Date().toISOString(),
          };
        }

        // Sync local storage with user profile
        saveOwnedBackgroundIds(profileData.ownedBackgrounds || []);
        setEquippedBackgroundId(profileData.equippedBackgroundId || null);

        localStorage.setItem('rovix_current_user_v1', JSON.stringify(profileData));
        onAuthSuccess(profileData);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This username is already registered. Please log in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect username or password.');
      } else {
        setError(err.message || 'An error occurred during authentication. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1013] text-[#e3e5e8] flex flex-col justify-between select-none font-sans px-4 py-8">
      {/* Top Header with ROVIX Logo */}
      <div className="w-full flex justify-center items-center pt-2 pb-6">
        <img
          src="/logo.png"
          alt="Logo"
          className="h-10 sm:h-12 w-auto object-contain brightness-110 drop-shadow-md"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/image-removebg-preview.png';
          }}
        />
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-[460px] mx-auto bg-[#232527] border border-[#393b3d]/60 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-xl sm:text-2xl font-black text-white text-center tracking-tight uppercase mb-6">
          {mode === 'signup' ? 'SIGN UP AND START HAVING FUN!' : 'LOG IN TO ROVIX'}
        </h1>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Birthday Field (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">Birthday</label>
              <div className="grid grid-cols-3 gap-2">
                {/* Month Dropdown */}
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="bg-[#191b1d] border border-neutral-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:border-white focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23AAAAAA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[right_10px_center] bg-no-repeat pr-6"
                >
                  <option value="Month" disabled>
                    Month
                  </option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m} className="bg-[#191b1d]">
                      {m}
                    </option>
                  ))}
                </select>

                {/* Day Dropdown */}
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="bg-[#191b1d] border border-neutral-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:border-white focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23AAAAAA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[right_10px_center] bg-no-repeat pr-6"
                >
                  <option value="Day" disabled>
                    Day
                  </option>
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="bg-[#191b1d]">
                      {d}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="bg-[#191b1d] border border-neutral-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:border-white focus:outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23AAAAAA%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:9px_9px] bg-[right_10px_center] bg-no-repeat pr-6"
                >
                  <option value="Year" disabled>
                    Year
                  </option>
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-[#191b1d]">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Don't use your real name"
                className="w-full bg-[#191b1d] border border-neutral-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-white focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-[#191b1d] border border-neutral-700/80 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-white focus:outline-none transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms Disclaimer */}
          {mode === 'signup' && (
            <p className="text-[10px] text-neutral-400 leading-relaxed pt-1">
              By clicking Sign Up, you are agreeing to the{' '}
              <a href="#" className="text-blue-400 hover:underline">
                Terms of Use
              </a>{' '}
              including the arbitration clause and you are acknowledging the{' '}
              <a href="#" className="text-blue-400 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-black text-sm text-black bg-white hover:bg-neutral-200 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
              <span>{mode === 'signup' ? 'Sign Up' : 'Log In'}</span>
            </button>
          </div>
        </form>

        {/* Toggle Mode Switch */}
        <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
          <p className="text-xs text-neutral-400">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode(mode === 'signup' ? 'login' : 'signup');
              }}
              className="text-blue-400 font-bold hover:underline cursor-pointer ml-1"
            >
              {mode === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-[11px] text-neutral-500 py-2">
        &copy; {CURRENT_YEAR} Rovix Corporation. All rights reserved.
      </div>
    </div>
  );
}
