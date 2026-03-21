import React from 'react';
import { RepeatMode } from '@/types/music';
import { cn } from '@/utils/cn';
import { SpatialMode } from '@/hooks/useAudioEngine';

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onSeek: (time: number) => void;
  spatialMode: SpatialMode;
  onSpatialModeChange: (mode: SpatialMode) => void;
  isSpatialLoaded: boolean;
}

// ВАЖНО: Използваме именован експорт, за да съвпадне с импорта в App.tsx
export function PlayerControls({
  isPlaying, isLoading, shuffle, repeatMode, volume, isMuted,
  playbackRate, currentTime, duration, onPlayPause, onPrevious, onNext,
  onShuffle, onRepeat, onVolumeChange, onMuteToggle, onPlaybackRateChange,
  onSeek, spatialMode, onSpatialModeChange, isSpatialLoaded
}: PlayerControlsProps) {
  
  return (
    <div className="flex flex-col gap-4">
      {/* Тук е твоят оригинален код за прогрес бара и бутоните... */}
      {/* Намери секцията за Spatial Audio и я замени с това: */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Spatial:</span>
        <select
  disabled={!isSpatialLoaded}
  value={spatialMode}
  onChange={(e) => onSpatialModeChange(e.target.value as SpatialMode)}
  className={cn(
    "text-xs bg-transparent focus:outline-none cursor-pointer font-medium transition-colors",
    !isSpatialLoaded ? "text-gray-500" :
    spatialMode !== 'off' ? "text-purple-400" : "text-gray-300"
  )}
>
  <option value="off" className="bg-gray-800 text-white">{!isSpatialLoaded ? 'Loading...' : 'Normal (Off)'}</option>
  {isSpatialLoaded && <option value="headphones" className="bg-gray-800 text-white">🎧 Headphones</option>}
  {isSpatialLoaded && <option value="speakers" className="bg-gray-800 text-white">💻 Speakers</option>}
</select>
      </div>
      {/* Продължение на твоя оригинален код... */}
    </div>
  );
}