import React, { useState, useEffect, useRef } from 'react';
import { RepeatMode } from '@/types/music';
import { cn } from '@/utils/cn';

interface PlayerControlsProps {
  audioRef: React.RefObject<HTMLAudioElement>; // ВАЖНО: Новият проп за достъп до аудио елемента
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
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerControls({
  audioRef,
  isPlaying,
  isLoading,
  shuffle,
  repeatMode,
  volume,
  isMuted,
  playbackRate,
  currentTime,
  duration,
  onPlayPause,
  onPrevious,
  onNext,
  onShuffle,
  onRepeat,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onSeek,
}: PlayerControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // --- SPATIAL AUDIO STATE & REFS ---
  const [spatialOn, setSpatialOn] = useState(false);
  const [irLoaded, setIrLoaded] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<any>({});

  // --- SPATIAL AUDIO ИНИЦИАЛИЗАЦИЯ ---
  useEffect(() => {
   const source = audioCtx.createMediaElementSource(audioRef.current);
      const reverb = audioCtx.createConvolver();
      const panner = audioCtx.createPanner();
      const dryGain = audioCtx.createGain();
      const wetGain = audioCtx.createGain();
      const reverbGain = audioCtx.createGain(); // НОВО: Отделен контрол за силата на ехото

      // Настройки на Panner
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.positionX.value = 0.2;
      panner.positionY.value = 0;
      panner.positionZ.value = -1.2;

      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      
      // ТУК ЗАДАВАМЕ СИЛАТА НА ЕХОТО (0.15 = 15%)
      // Ако пак ти е много, направи го 0.05. Ако не искаш никакво ехо, направи го 0.
      reverbGain.gain.value = 0.15; 

      // --- ПАРАЛЕЛНА DSP ВЕРИГА ---
      
      // 1. Нормален (чист) звук при изключен Spatial
      source.connect(dryGain).connect(audioCtx.destination);
      
      // 2. Чист 3D звук (Panner) -> отива директно в WetGain
      source.connect(panner);
      panner.connect(wetGain);
      
      // 3. Добавяме леко ехо (Reverb) паралелно
      panner.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(wetGain);

      wetGain.connect(audioCtx.destination);

      // Настройки на Panner
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.positionX.value = 0.2;
      panner.positionY.value = 0;
      panner.positionZ.value = -1.2;

      dryGain.gain.value = 1;
      wetGain.gain.value = 0;

      // Правилната DSP верига
      source.connect(dryGain).connect(audioCtx.destination);
      source.connect(panner);
      panner.connect(reverb);
      reverb.connect(wetGain);
      wetGain.connect(audioCtx.destination);

      nodesRef.current = { panner, reverb, dryGain, wetGain };

      // Генериране на изкуствено ехо (Synthetic Impulse Response)
      const duration = 0.4; // дължина на ехото в секунди
      const sampleRate = audioCtx.sampleRate;
      const length = sampleRate * duration;
      const impulse = audioCtx.createBuffer(2, length, sampleRate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      
      for (let i = 0; i < length; i++) {
        // Плавно затихване на ехото
        const factor = Math.exp(-i / (sampleRate * 0.5)); 
        left[i] = (Math.random() * 2 - 1) * factor;
        right[i] = (Math.random() * 2 - 1) * factor;
      }
      
      reverb.buffer = impulse;
      setIrLoaded(true); // Веднага активираме бутона!
    }
  }, [audioRef]);

  // --- SPATIAL AUDIO ПРЕВКЛЮЧВАНЕ ---
  const toggleSpatial = () => {
    const { panner, dryGain, wetGain } = nodesRef.current;
    const audioCtx = audioCtxRef.current;
    
    if (!audioCtx || !panner) return; 

    // Ако контекстът е "спрян" заради браузър полиси, го пускаме
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const fadeTime = 0.3;
    const isTurningOn = !spatialOn;

    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    wetGain.gain.setValueAtTime(wetGain.gain.value, now);

    if (isTurningOn) {
      dryGain.gain.linearRampToValueAtTime(0, now + fadeTime);
      wetGain.gain.linearRampToValueAtTime(1, now + fadeTime);
      
      panner.positionZ.setValueAtTime(-0.5, now);
      panner.positionZ.linearRampToValueAtTime(-1.5, now + 0.5);
    } else {
      dryGain.gain.linearRampToValueAtTime(1, now + fadeTime);
      wetGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    }

    setSpatialOn(isTurningOn);
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
        <div className="flex-1 relative group">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Shuffle Button */}
        <button
          onClick={onShuffle}
          className={cn(
            'p-2 rounded-full transition-colors',
            shuffle ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          )}
          title="Shuffle"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
          </svg>
        </button>

        {/* Previous Button */}
        <button
          onClick={onPrevious}
          className="p-2 text-gray-300 hover:text-white transition-colors"
          title="Previous"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          disabled={isLoading}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 disabled:opacity-50"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="p-2 text-gray-300 hover:text-white transition-colors"
          title="Next"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>

        {/* Repeat Button */}
        <button
          onClick={onRepeat}
          className={cn(
            'p-2 rounded-full transition-colors relative',
            repeatMode !== 'off' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          )}
          title={`Repeat: ${repeatMode}`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
          </svg>
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
              1
            </span>
          )}
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button onClick={onMuteToggle} className="text-gray-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          <div className="relative w-24 group">
            <div className="h-1.5 bg-gray-700 rounded-full">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Spatial Audio Toggle & Playback Speed Container */}
        <div className="flex items-center gap-4">
          
          {/* Spatial Audio Button */}
          <button
            onClick={toggleSpatial}
            disabled={!irLoaded}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium transition-all shadow-md",
              !irLoaded 
                ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                : spatialOn
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/40"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            )}
            title="Toggle Spatial Audio"
          >
            {!irLoaded ? 'Loading 3D...' : spatialOn ? 'Spatial: ON' : 'Spatial: OFF'}
          </button>

          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {playbackRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </div>
          
        </div>
      </div>
    </div>
  );
}