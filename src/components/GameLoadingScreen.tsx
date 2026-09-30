import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface GameLoadingScreenProps {
  gameTitle: string;
  gameCreator: string;
  gameInitials: string;
  iconUrl?: string;
  onCancel: () => void;
  onLoadComplete: () => void;
}

export default function GameLoadingScreen({
  gameTitle,
  gameCreator,
  gameInitials,
  iconUrl,
  onCancel,
  onLoadComplete,
}: GameLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 3.5s loading time simulating Roblox experience join
    const totalDuration = 3500;
    const interval = 50;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min(100, Math.floor((elapsed / totalDuration) * 100));
      setProgress(pct);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        onLoadComplete();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onLoadComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2d31] flex flex-col items-center justify-center select-none text-white font-sans animate-fade-in">
      {/* Top right close button - matches Screenshot 1 */}
      <button
        type="button"
        onClick={onCancel}
        title="Cancel and return to home"
        className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors p-2 cursor-pointer z-10"
      >
        <X className="w-6 h-6 stroke-[2]" />
      </button>

      {/* Center Game Card: Icon, Title, and Creator - matches Screenshot 1 */}
      <div className="flex flex-col items-center text-center max-w-md px-6">
        {/* Game Icon / Thumbnail */}
        <div className="w-56 h-40 bg-[#1e2022] border border-neutral-700/60 shadow-2xl flex items-center justify-center relative overflow-hidden mb-6 group">
          {/* Classic Roblox thumbnail style background */}
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={gameTitle}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#2f435e] via-[#1e2938] to-[#121820]" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Centered stylized initials badge */}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 bg-[#232527] border-2 border-neutral-500/50 flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-black tracking-wider text-white font-mono">
                    {gameInitials}
                  </span>
                </div>
                <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-semibold">
                  Rovix Experience
                </span>
              </div>
            </>
          )}

          {/* Subtle loading shimmer bar along bottom of thumbnail */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
            <div
              className="h-full bg-white transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Game Title */}
        <h2 className="text-2xl font-bold text-white tracking-normal mb-1">
          {gameTitle}
        </h2>

        {/* Creator Name */}
        <p className="text-sm text-neutral-400 font-normal">
          By {gameCreator}
        </p>
      </div>

      {/* Bottom right logo - updated to our logo spinning */}
      <div className="absolute bottom-7 right-8 flex items-center gap-3">
        <div className="animate-spin opacity-90" style={{ animationDuration: '4s' }}>
          <img
            src="/image-removebg-preview.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md brightness-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = './image-removebg-preview.png';
            }}
          />
        </div>
      </div>
    </div>
  );
}
