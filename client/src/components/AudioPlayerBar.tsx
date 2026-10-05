import { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ExternalLink,
  Radio
} from 'lucide-react';
import type { Story } from '../types';

interface AudioPlayerBarProps {
  currentStory: Story | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayerBar({
  currentStory,
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
}: AudioPlayerBarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  if (!currentStory) return null;

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(prevVolume || 80);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-0 right-0 z-40 px-3 sm:px-6 flex flex-col items-center pointer-events-none">
      
      {/* Main Glassmorphic Dock */}
      <div className="w-full max-w-4xl bg-[#171412]/85 backdrop-blur-2xl border border-amber-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.8)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
        
        {/* Left: Thumbnail & Story Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 min-w-0">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-black/60 border-2 border-amber-500/40 shadow-inner shrink-0 flex items-center justify-center">
            {currentStory.thumbnailUrl ? (
              <img
                src={currentStory.thumbnailUrl}
                alt={currentStory.title}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
              />
            ) : (
              <Radio className="w-5 h-5 text-amber-400" />
            )}
            <div className="absolute inset-0 rounded-full border border-black/20" />
            {/* Center Vinyl Hole */}
            <div className="absolute w-2.5 h-2.5 bg-black rounded-full border border-amber-400/50" />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-amber-50 truncate tracking-wide drop-shadow-sm">
              {currentStory.cleanTitle || currentStory.title}
            </h4>
            <p className="text-xs text-amber-200/70 truncate flex items-center gap-1.5 mt-0.5">
              <span>{currentStory.author || currentStory.collection || 'Sunday Suspense'}</span>
              {currentStory.characterSeries && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/40">
                  {currentStory.characterSeries.replace('_', ' ')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={onPrev}
            title="Previous Story"
            className="p-1.5 sm:p-2 text-amber-200/70 hover:text-amber-100 hover:scale-110 active:scale-95 transition cursor-pointer"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-black flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            )}
          </button>

          <button
            onClick={onNext}
            title="Next Story"
            className="p-1.5 sm:p-2 text-amber-200/70 hover:text-amber-100 hover:scale-110 active:scale-95 transition cursor-pointer"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>
        </div>

        {/* Right: Scrubber, Volume & YouTube Redirect */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 sm:max-w-md justify-end">
          
          {/* Timeline Scrubber */}
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <span className="text-[10px] sm:text-xs font-mono text-amber-200/60 shrink-0">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 flex items-center group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800/80 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%, rgba(255, 255, 255, 0.15) 100%)`,
                }}
              />
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-amber-200/60 shrink-0">
              {duration > 0 ? formatTime(duration) : currentStory.duration || '0:00'}
            </span>
          </div>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleMute}
              className="text-amber-200/70 hover:text-amber-100 transition cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false);
                onVolumeChange(Number(e.target.value));
              }}
              className="w-14 h-1 bg-zinc-800/80 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* YouTube Redirect Icon */}
          <a
            href={currentStory.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="ইউটিউবে খুলুন (Open original on YouTube)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-200 border border-red-500/30 transition shadow shrink-0 text-xs font-semibold cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

        </div>

      </div>

      {/* Subtext indicator like reference */}
      <div className="mt-1.5 text-[11px] text-amber-200/50 font-medium tracking-wider drop-shadow flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>সানডে সাসপেন্স রেডিও • ডিজিটাল আর্কাইভ</span>
      </div>

    </div>
  );
}
