import { useState, useCallback } from 'react';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AlbumArt } from '@/components/AlbumArt';
import { PlayerControls } from '@/components/PlayerControls';
import { Playlist } from '@/components/Playlist';
import { Equalizer } from '@/components/Equalizer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { FileUpload } from '@/components/FileUpload';
import { ShortcutsModal } from '@/components/ShortcutsModal';

export function App() {
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 1. Вземаме всичко от Music Player-а
  const {
    audioRef,
    playlist,
    state,
    currentTrack,
    isLoading,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleLoadStart,
  } = useMusicPlayer();

  // 2. Вземаме всичко от Audio Engine-а
  const {
    analyserRef,
    connectAudioElement,
    setBandGain,
    applyPreset,
    equalizerGains,
    currentPreset,
    EQUALIZER_PRESETS,
    FREQUENCIES,
    spatialMode,
    changeSpatialMode,
    isSpatialLoaded,
  } = useAudioEngine();

  // ФИКС: Свързваме аудиото, когато се зареди песен, за да се активира Spatial Audio
  const onLoadedMetadata = useCallback(() => {
    handleLoadedMetadata();
    if (audioRef.current) {
      connectAudioElement(audioRef.current);
    }
  }, [handleLoadedMetadata, connectAudioElement, audioRef]);

  useKeyboardShortcuts({
    onPlayPause: togglePlay,
    onNext: next,
    onPrevious: previous,
    onVolumeUp: () => setVolume(Math.min(1, state.volume + 0.1)),
    onVolumeDown: () => setVolume(Math.max(0, state.volume - 0.1)),
    onMute: toggleMute,
    onSeekForward: () => seek(Math.min(state.duration, state.currentTime + 5)),
    onSeekBackward: () => seek(Math.max(0, state.currentTime - 5)),
    onToggleShuffle: toggleShuffle,
    onToggleRepeat: toggleRepeat,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-purple-500/30">
      <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-8 gap-8 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* ЛЯВА СЕКЦИЯ: Трак и Визуализация */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                SonicStream
              </h1>
              <p className="text-gray-400 text-sm">Hi-Fi Spatial Audio Player</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <kbd className="text-xs border border-gray-600 px-1.5 py-0.5 rounded">?</kbd>
              </button>
              <button
                onClick={() => setShowEqualizer(!showEqualizer)}
                className={`p-2 rounded-full transition-all ${
                  showEqualizer ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'hover:bg-gray-800 text-gray-400'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h2M11 9h2M11 13h2M11 17h2M11 21h2M18 5h2M18 9h2M18 13h2M18 17h2M18 21h2M4 5h2M4 9h2M4 13h2M4 17h2M4 21h2"/></svg>
              </button>
            </div>
          </div>

          <div className="relative group aspect-square lg:aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-white/5">
            <AlbumArt currentTrack={currentTrack} isPlaying={state.isPlaying} />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <AudioVisualizer analyserRef={analyserRef} isPlaying={state.isPlaying} />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold truncate">{currentTrack?.title}</h2>
            <p className="text-purple-400 font-medium">{currentTrack?.artist}</p>
          </div>

          {showEqualizer && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <Equalizer
                frequencies={FREQUENCIES}
                gains={equalizerGains}
                setGain={setBandGain}
                presets={EQUALIZER_PRESETS}
                onApplyPreset={applyPreset}
                current