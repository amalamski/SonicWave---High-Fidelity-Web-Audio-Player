import React from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, 
  Shuffle, Repeat, Volume1, Volume2, VolumeX,
  Loader2
} from 'lucide-react';
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

// Форматира секунди в mm:ss
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Използваме именован експорт за успех при билда
export function PlayerControls({
  isPlaying, isLoading, shuffle, repeatMode, volume, isMuted,
  playbackRate, currentTime, duration, onPlayPause, onPrevious, onNext,
  onShuffle, onRepeat, onVolumeChange, onMuteToggle, onPlaybackRateChange,
  onSeek, spatialMode, onSpatialModeChange, isSpatialLoaded
}: PlayerControlsProps) {
  
  // Определя иконата за звука
  const VolumeIcon = isMuted ? VolumeX : volume > 0.5 ? Volume2 : Volume1;

  return (
    <div className="flex flex-col gap-4">
      {/* Прогрес бар и времетраене */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-mono w-10 text-right">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          step={0.1}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1 equalizer-slider appearance-none bg-gray-700 rounded-full cursor-pointer"
        />
        <span className="text-xs text-gray-400 font-mono w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Бутони за управление */}
      <div className="flex items-center justify-between gap-6">
        
        {/* Лява секция: Разбъркване и Назад */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onShuffle}
            className={cn(
              "p-2 rounded-full transition-colors",
              shuffle ? "text-purple-400 bg-purple-500/10" : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button 
            onClick={onPrevious}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            title="Previous"
          >
            <SkipBack size={18} />
          </button>
        </div>

        {/* Център: Пускане / Пауза */}
        <button
          onClick={onPlayPause}
          disabled={isLoading}
          className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Дясна секция: Напред, Повторение, Скорост, Звук и Spatial */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={onNext}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              title="Next"
            >
              <SkipForward size={18} />
            </button>
            <button 
              onClick={onRepeat}
              className={cn(
                "p-2 rounded-full transition-colors relative",
                repeatMode !== 'none' ? "text-purple-400 bg-purple-500/10" : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat size={18} />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-purple-500 text-white w-4 h-4 flex items-center justify-center rounded-full scale-75">1</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 border-l border-gray-800 pl-4">
            {/* Скорост */}
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
              className="text-xs bg-transparent focus:outline-none cursor-pointer font-medium text-gray-300 hover:text-white"
              title="Playback Rate"
            >
              <option value="0.5" className="bg-gray-800 text-white">0.5x</option>
              <option value="1" className="bg-gray-800 text-white">1x</option>
              <option value="1.5" className="bg-gray-800 text-white">1.5x</option>
              <option value="2" className="bg-gray-800 text-white">2x</option>
            </select>

            {/* Звук */}
            <div className="flex items-center gap-2 group w-24">
              <button 
                onClick={onMuteToggle}
                className="text-gray-400 group-hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                <VolumeIcon size={18} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 equalizer-slider appearance-none bg-gray-700 rounded-full cursor-pointer group-hover:bg-gray-600 transition-colors"
                title="Volume"
              />
            </div>
            
            {/* Spatial Audio Menu */}
            <div className="flex items-center gap-1.5 border-l border-gray-800 pl-4">
              <span className="text-xs text-gray-500">Spatial:</span>
              <select
                disabled={!isSpatialLoaded}
                value={spatialMode}
                onChange={(e) => onSpatialModeChange(e.target.value as SpatialMode)}
                className={cn(
                  "text-xs bg-transparent focus:outline-none cursor-pointer font-medium transition-colors",
                  !isSpatialLoaded ? "text-gray-500" :
                  spatialMode !== 'off' ? "text-purple-400" : "text-gray-300"
                )}
                title="Spatial Audio Mode"
              >
                <option value="off" className="bg-gray-800 text-white">
                  {!isSpatialLoaded ? 'Loading...' : 'Normal (Off)'}
                </option>
                {isSpatialLoaded && (
                  <>
                    <option value="headphones" className="bg-gray-800 text-white">🎧 Headphones</option>
                    <option value="speakers" className="bg-gray-800 text-white">💻 Speakers</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}