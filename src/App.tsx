import { useState, useEffect, useCallback } from 'react';
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

  const {
    audioRef,
    playlist,
    state,
    currentTrack,
    isLoading,
    play,
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

  const {
    analyserRef,
    initAudioContext,
    connectAudioElement,
    setBandGain,
    applyPreset,
    equalizerGains,
    currentPreset,
    EQUALIZER_PRESETS,
    FREQUENCIES,
  } = useAudioEngine();

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleFirstPlay = () => {
        initAudioContext();
        connectAudioElement(audio);
      };
      audio.addEventListener('play', handleFirstPlay, { once: true });
      return () => audio.removeEventListener('play', handleFirstPlay);
    }
  }, [audioRef, initAudioContext, connectAudioElement]);

  const handleVolumeUp = useCallback(() => {
    setVolume(Math.min(state.volume + 0.1, 1));
  }, [setVolume, state.volume]);

  const handleVolumeDown = useCallback(() => {
    setVolume(Math.max(state.volume - 0.1, 0));
  }, [setVolume, state.volume]);

  const handleSeekForward = useCallback(() => {
    seek(Math.min(state.currentTime + 5, state.duration));
  }, [seek, state.currentTime, state.duration]);

  const handleSeekBackward = useCallback(() => {
    seek(Math.max(state.currentTime - 5, 0));
  }, [seek, state.currentTime]);

  const { shortcuts } = useKeyboardShortcuts({
    onPlayPause: togglePlay,
    onNext: next,
    onPrevious: previous,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onMute: toggleMute,
    onSeekForward: handleSeekForward,
    onSeekBackward: handleSeekBackward,
    onToggleShuffle: toggleShuffle,
    onToggleRepeat: toggleRepeat,
  });

  const handleFilesAdded = useCallback((tracks: unknown[]) => {
    tracks.forEach((track) => addToPlaylist(track as any));
  }, [addToPlaylist]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous" 
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onLoadStart={handleLoadStart}
        onCanPlay={() => isLoading && play()}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                SonicWave
              </h1>
              <p className="text-xs text-gray-500">Music Player</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEqualizer(!showEqualizer)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Equalizer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Keyboard Shortcuts"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Now Playing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Album Art & Visualizer */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AlbumArt
                  track={currentTrack}
                  isPlaying={state.isPlaying}
                  className="w-full max-w-sm mx-auto"
                />
                
                {/* Visualizer */}
                <div className="hidden md:block bg-gray-800/50 backdrop-blur-lg rounded-2xl p-4 h-64">
                  <AudioVisualizer
                    analyser={analyserRef.current}
                    isPlaying={state.isPlaying}
                  />
                </div>
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white truncate">
                {currentTrack?.title || 'No Track Selected'}
              </h2>
              <p className="text-gray-400 mt-1">
                {currentTrack?.artist || 'Select a track to play'}
              </p>
              {currentTrack