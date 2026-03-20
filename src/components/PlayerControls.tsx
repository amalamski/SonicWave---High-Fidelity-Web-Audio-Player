import React, { useState, useEffect, useRef } from 'react';
import { RepeatMode } from '@/types/music';
import { cn } from '@/utils/cn';

interface PlayerControlsProps {
  audioRef: React.RefObject<HTMLAudioElement>;
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

type SpatialMode = 'off' | 'headphones' | 'speakers';

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

  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [irLoaded, setIrLoaded] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<any>({});

  // Автоматично събуждане на аудио контекста
  useEffect(() => {
    if (isPlaying && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [isPlaying]);

  // --- ИЗГРАЖДАНЕ НА ТРИТЕ АУДИО ВЕРИГИ (OFF / HEADPHONES / SPEAKERS) ---
  useEffect(() => {
    if (audioRef.current && !audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaElementSource(audioRef.current);

      // 1. Генериране на общо ехо (Impulse Response) за стаята
      const duration = 0.4; 
      const sampleRate = audioCtx.sampleRate;
      const length = sampleRate * duration;
      const impulseBuffer = audioCtx.createBuffer(2, length, sampleRate);
      const left = impulseBuffer.getChannelData(0);
      const right = impulseBuffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const factor = Math.exp(-i / (sampleRate * 0.3)); 
        left[i] = (Math.random() * 2 - 1) * factor;
        right[i] = (Math.random() * 2 - 1) * factor;
      }

      // ----------------------------------------------------------------
      // ВЕРИГА 1: ЧИСТ ЗВУК (OFF)
      // ----------------------------------------------------------------
      const dryGain = audioCtx.createGain();
      dryGain.gain.value = 1;
      source.connect(dryGain).connect(audioCtx.destination);

      // ----------------------------------------------------------------
      // ВЕРИГА 2: СЛУШАЛКИ (HEADPHONES - HRTF 3D)
      // ----------------------------------------------------------------
      const hpGain = audioCtx.createGain();
      hpGain.gain.value = 0; // Първоначално изключена

      const hpBass = audioCtx.createBiquadFilter();
      hpBass.type = 'lowshelf'; hpBass.frequency.value = 150; hpBass.gain.value = 4;

      const hpTreble = audioCtx.createBiquadFilter();
      hpTreble.type = 'highshelf'; hpTreble.frequency.value = 3000; hpTreble.gain.value = 6;

      const hpSplit = audioCtx.createChannelSplitter(2);
      
      const hpPanL = audioCtx.createPanner();
      hpPanL.panningModel = 'HRTF'; hpPanL.positionX.value = -1.5; hpPanL.positionZ.value = -1.5;
      
      const hpPanR = audioCtx.createPanner();
      hpPanR.panningModel = 'HRTF'; hpPanR.positionX.value = 1.5; hpPanR.positionZ.value = -1.5;

      const hpRev = audioCtx.createConvolver();
      hpRev.buffer = impulseBuffer;
      const hpRevGain = audioCtx.createGain(); hpRevGain.gain.value = 0.08;

      source.connect(hpGain).connect(hpBass).connect(hpTreble);
      hpTreble.connect(hpSplit);
      hpSplit.connect(hpPanL, 0).connect(audioCtx.destination);
      hpSplit.connect(hpPanR, 1).connect(audioCtx.destination);
      hpTreble.connect(hpRev).connect(hpRevGain).connect(audioCtx.destination);

      // ----------------------------------------------------------------
      // ВЕРИГА 3: ГОВОРИТЕЛИ НА ЛАПТОП (SPEAKERS - WIDE + COMPRESSOR)
      // ----------------------------------------------------------------
      const spGain = audioCtx.createGain();
      spGain.gain.value = 0; // Първоначално изключена

      const spBass = audioCtx.createBiquadFilter();
      spBass.type = 'lowshelf'; spBass.frequency.value = 200; spBass.gain.value = 5;

      const spTreble = audioCtx.createBiquadFilter();
      spTreble.type = 'highshelf'; spTreble.frequency.value = 4000; spTreble.gain.value = 4;

      const spComp = audioCtx.createDynamicsCompressor();
      spComp.threshold.value = -24; spComp.knee.value = 30; spComp.ratio.value = 4; 
      spComp.attack.value = 0.003; spComp.release.value = 0.25;

      const spSplit = audioCtx.createChannelSplitter(2);
      
      const spPanL = audioCtx.createPanner();
      spPanL.panningModel = 'equalpower'; spPanL.positionX.value = -2.5; spPanL.positionZ.value = -1.0;
      
      const spPanR = audioCtx.createPanner();
      spPanR.panningModel = 'equalpower'; spPanR.positionX.value = 2.5; spPanR.positionZ.value = -1.0;

      const spRev = audioCtx.createConvolver();
      spRev.buffer = impulseBuffer;
      const spRevGain = audioCtx.createGain(); spRevGain.gain.value = 0.12;

      source.connect(spGain).connect(spBass).connect(spTreble);
      spTreble.connect(spSplit);
      spSplit.connect(spPanL, 0).connect(spComp);
      spSplit.connect(spPanR, 1).connect(spComp);
      spTreble.connect(spComp); // Phantom Center
      spTreble.connect(spRev).connect(spRevGain).connect(spComp);
      spComp.connect(audioCtx.destination);

      // Запазваме само Gain възлите, защото те контролират силата на веригите
      nodesRef.current = { dryGain, hpGain, spGain };
      setIrLoaded(true);
    }
  }, [audioRef]);

  // --- ЛОГИКА ЗА ПРЕВКЛЮЧВАНЕ НА РЕЖИМИТЕ (С ПЛАВНО ПРЕЛИВАНЕ) ---
  const handleModeChange = (newMode: SpatialMode) => {
    const { dryGain, hpGain, spGain } = nodesRef.current;
    const audioCtx = audioCtxRef.current;
    
    if (!audioCtx || !dryGain) return; 

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const fadeTime = 0.3;

    // "Закотвяне" на текущите нива, за да няма пукане
    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    hpGain.gain.setValueAtTime(hpGain.gain.value, now);
    spGain.gain.setValueAtTime(spGain.gain.value, now);

    // Плавно преливане към новите стойности (включваме избраното, изключваме другите)
    dryGain.gain.linearRampToValueAtTime(newMode === 'off' ? 1 : 0, now + fadeTime);
    hpGain.gain.linearRampToValueAtTime(newMode === 'headphones' ? 1 : 0, now + fadeTime);
    spGain.gain.linearRampToValueAtTime(newMode === 'speakers' ? 1 : 0, now + fadeTime);

    setSpatialMode(newMode);
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
        <button
          onClick={onShuffle}
          className={cn('p-2 rounded-full transition-colors', shuffle ? 'text-purple-400' : 'text-gray-400 hover:text-white')}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg>
        </button>

        <button onClick={onPrevious} className="p-2 text-gray-300 hover:text-white transition-colors">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
        </button>

        <button
          onClick={onPlayPause}
          disabled={isLoading}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-purple-500/30 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          ) : (
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>

        <button onClick={onNext} className="p-2 text-gray-300 hover:text-white transition-colors">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
        </button>

        <button
          onClick={onRepeat}
          className={cn('p-2 rounded-full transition-colors relative', repeatMode !== 'off' ? 'text-purple-400' : 'text-gray-400 hover:text-white')}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg>
          {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[10px] bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center">1</span>}
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button onClick={onMuteToggle} className="text-gray-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
            )}
          </button>
          <div className="relative w-24 group">
            <div className="h-1.5 bg-gray-700 rounded-full">
              <div className="h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
            </div>
            <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => onVolumeChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>
        </div>

        {/* Spatial Audio 3-Way Selector & Speed Container */}
        <div className="flex items-center gap-4">
          
          {/* Spatial Mode Dropdown */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1.5 shadow-md">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Audio:</span>
            <select
              disabled={!irLoaded}
              value={spatialMode}
              onChange={(e) => handleModeChange(e.target.value as SpatialMode)}
              className={cn(
                "text-xs bg-transparent focus:outline-none cursor-pointer font-medium transition-colors",
                !irLoaded ? "text-gray-500" :
                spatialMode !== 'off' ? "text-purple-400" : "text-gray-300"
              )}
            >
              <option value="off" className="bg-gray-800 text-white">{!irLoaded ? 'Loading...' : 'Normal (Off)'}</option>
              {irLoaded && <option value="headphones" className="bg-gray-800 text-white">🎧 Headphones</option>}
              {irLoaded && <option value="speakers" className="bg-gray-800 text-white">💻 Speakers</option>}
            </select>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <select
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {playbackRates.map((rate) => (
                <option key={rate} value={rate}>{rate}x</option>
              ))}
            </select>
          </div>
          
        </div>
      </div>
    </div>
  );
}