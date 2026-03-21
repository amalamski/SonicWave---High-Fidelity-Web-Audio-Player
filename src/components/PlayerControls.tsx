import React from 'react';
import { RepeatMode } from '@/types/music';
import { cn } from '@/utils/cn';
import { SpatialMode } from '@/hooks/useAudioEngine';

interface PlayerControlsProps {
  isPlaying: boolean; isLoading: boolean; shuffle: boolean; repeatMode: RepeatMode;
  volume: number; isMuted: boolean; playbackRate: number; currentTime: number; duration: number;
  onPlayPause: () => void; onPrevious: () => void; onNext: () => void; onShuffle: () => void;
  onRepeat: () => void; onVolumeChange: (volume: number) => void; onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void; onSeek: (time: number) => void;
  spatialMode: SpatialMode; onSpatialModeChange: (mode: SpatialMode) => void; isSpatialLoaded: boolean;
}

const formatTime = (s: number) => {
  if (isNaN(s) || !isFinite(s)) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export function PlayerControls({
  isPlaying, isLoading, shuffle, repeatMode, volume, isMuted, playbackRate, currentTime, duration,
  onPlayPause, onPrevious, onNext, onShuffle, onRepeat, onVolumeChange, onMuteToggle, onPlaybackRateChange,
  onSeek, spatialMode, onSpatialModeChange, isSpatialLoaded
}: PlayerControlsProps) {
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-mono w-10 text-right">{formatTime(currentTime)}</span>
        <input type="range" min={0} max={duration || 0} value={currentTime} step={0.1} onChange={(e) => onSeek(parseFloat(e.target.value))} className="flex-1 h-1 appearance-none bg-gray-700 rounded-full cursor-pointer" />
        <span className="text-xs text-gray-400 font-mono w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onShuffle} className={cn("text-lg", shuffle ? "text-purple-400" : "text-gray-400")}>🔀</button>
          <button onClick={onPrevious} className="text-lg text-gray-400 hover:text-white">⏮</button>
        </div>

        <button onClick={onPlayPause} disabled={isLoading} className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:scale-105 transition-all">
          {isLoading ? "..." : isPlaying ? "⏸" : "▶"}
        </button>

        <div className="flex items-center gap-6">
          <button onClick={onNext} className="text-lg text-gray-400 hover:text-white">⏭</button>
          <button onClick={onRepeat} className={cn("text-lg", repeatMode !== 'none' ? "text-purple-400" : "text-gray-400")}>🔁</button>
          
          <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
            <span className="text-xs text-gray-500">Spatial:</span>
            <select
              value={spatialMode}
              onChange={(e) => onSpatialModeChange(e.target.value as SpatialMode)}
              className="text-xs bg-transparent focus:outline-none cursor-pointer text-purple-400"
            >
              <option value="off" className="bg-gray-900">Normal</option>
              <option value="headphones" className="bg-gray-900">🎧 Headphones</option>
              <option value="speakers" className="bg-gray-900">💻 Speakers</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}