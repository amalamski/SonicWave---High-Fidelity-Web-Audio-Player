import React from 'react';
import { SpatialPreset, SpatialMode } from '@/types/music';
import { cn } from '@/utils/cn';

interface SpatialAudioProps {
  currentPreset: string;
  spatialMode: SpatialMode;
  presets: SpatialPreset[];
  onPresetChange: (preset: SpatialPreset) => void;
}

const getModeIcon = (mode: SpatialMode): string => {
  switch (mode) {
    case 'off':
      return '🔇';
    case 'headphones':
      return '🎧';
    case 'speakers':
      return '🔊';
    default:
      return '🎵';
  }
};

const getModeDescription = (mode: SpatialMode): string => {
  switch (mode) {
    case 'off':
      return 'Standard stereo output without spatial processing';
    case 'headphones':
      return 'HRTF-based spatialization with crossfeed for natural headphone listening';
    case 'speakers':
      return 'Room simulation with early reflections and reverb for speaker playback';
    default:
      return '';
  }
};

export const SpatialAudio: React.FC<SpatialAudioProps> = ({
  currentPreset,
  spatialMode,
  presets,
  onPresetChange,
}) => {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span className="text-xl">🌐</span>
          Spatial Audio
        </h3>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium transition-all",
          spatialMode === 'off' 
            ? "bg-gray-500/30 text-gray-300" 
            : "bg-purple-500/30 text-purple-300 animate-pulse"
        )}>
          {spatialMode === 'off' ? 'Off' : 'Active'}
        </div>
      </div>

      {/* Current Mode Display */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getModeIcon(spatialMode)}</span>
          <div>
            <p className="text-white font-medium">{currentPreset}</p>
            <p className="text-gray-400 text-xs">{getModeDescription(spatialMode)}</p>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        {presets.map((preset) => (
          <button
            key={preset.mode}
            onClick={() => onPresetChange(preset)}
            className={cn(
              "w-full p-3 rounded-xl transition-all duration-300 flex items-center gap-3 group",
              currentPreset === preset.name
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25"
                : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-white/20"
            )}
          >
            <span className={cn(
              "text-2xl transition-transform duration-300",
              currentPreset === preset.name ? "scale-110" : "group-hover:scale-105"
            )}>
              {getModeIcon(preset.mode)}
            </span>
            <div className="text-left flex-1">
              <p className="font-medium">{preset.name}</p>
              <p className={cn(
                "text-xs",
                currentPreset === preset.name ? "text-white/70" : "text-gray-500"
              )}>
                {preset.description}
              </p>
            </div>
            {currentPreset === preset.name && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-100" />
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Technical Info */}
      <div className="mt-4 p-3 bg-black/20 rounded-xl">
        <p className="text-gray-400 text-xs font-medium mb-2">DSP Processing Chain</p>
        <div className="flex flex-wrap gap-2">
          {spatialMode === 'off' && (
            <span className="px-2 py-1 bg-gray-500/20 rounded text-gray-400 text-xs">
              Bypass
            </span>
          )}
          {spatialMode === 'headphones' && (
            <>
              <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">
                HRTF
              </span>
              <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-300 text-xs">
                Crossfeed
              </span>
              <span className="px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">
                ITD/ILD
              </span>
              <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 text-xs">
                Convolver
              </span>
            </>
          )}
          {spatialMode === 'speakers' && (
            <>
              <span className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">
                Room IR
              </span>
              <span className="px-2 py-1 bg-blue-500/20 rounded text-blue-300 text-xs">
                Early Reflections
              </span>
              <span className="px-2 py-1 bg-green-500/20 rounded text-green-300 text-xs">
                Late Reverb
              </span>
              <span className="px-2 py-1 bg-yellow-500/20 rounded text-yellow-300 text-xs">
                Absorption
              </span>
            </>
          )}
        </div>
      </div>

      {/* Visualizer */}
      {spatialMode !== 'off' && (
        <div className="mt-4 relative h-16 rounded-xl overflow-hidden bg-black/30">
          <div className="absolute inset-0 flex items-center justify-center">
            <SpatialVisualizer mode={spatialMode} />
          </div>
        </div>
      )}
    </div>
  );
};

// Simple animated visualizer for spatial mode
const SpatialVisualizer: React.FC<{ mode: SpatialMode }> = ({ mode }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {mode === 'headphones' && (
        <div className="flex items-center gap-8">
          {/* Left ear */}
          <div className="relative">
            <div className="w-8 h-12 border-2 border-purple-400 rounded-full opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping opacity-50" />
            </div>
          </div>
          
          {/* Head representation */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-b from-gray-600 to-gray-700 flex items-center justify-center">
            <span className="text-xl">👤</span>
          </div>
          
          {/* Right ear */}
          <div className="relative">
            <div className="w-8 h-12 border-2 border-blue-400 rounded-full opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
          
          {/* Sound waves */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute w-32 h-32 border border-purple-500/30 rounded-full animate-ping"
                style={{ 
                  animationDuration: '2s',
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.3 / i
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {mode === 'speakers' && (
        <div className="flex items-center gap-16 relative">
          {/* Left speaker */}
          <div className="relative">
            <div className="w-6 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-sm flex flex-col items-center justify-center gap-1 p-1">
              <div className="w-3 h-3 bg-gray-800 rounded-full" />
              <div className="w-4 h-3 bg-gray-800 rounded-sm" />
            </div>
            {/* Sound waves from left speaker */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute top-1/2 left-full w-8 h-16 border-l-2 border-purple-500/30 rounded-r-full animate-pulse"
                style={{ 
                  transform: `translateY(-50%) translateX(${i * 8}px)`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.5 / i
                }}
              />
            ))}
          </div>
          
          {/* Listener position */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center">
            <span className="text-sm">👂</span>
          </div>
          
          {/* Right speaker */}
          <div className="relative">
            <div className="w-6 h-10 bg-gradient-to-b from-gray-500 to-gray-700 rounded-sm flex flex-col items-center justify-center gap-1 p-1">
              <div className="w-3 h-3 bg-gray-800 rounded-full" />
              <div className="w-4 h-3 bg-gray-800 rounded-sm" />
            </div>
            {/* Sound waves from right speaker */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute top-1/2 right-full w-8 h-16 border-r-2 border-blue-500/30 rounded-l-full animate-pulse"
                style={{ 
                  transform: `translateY(-50%) translateX(-${i * 8}px)`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.5 / i
                }}
              />
            ))}
          </div>
          
          {/* Room reflections */}
          <div className="absolute inset-0 border border-dashed border-gray-600/30 rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default SpatialAudio;
