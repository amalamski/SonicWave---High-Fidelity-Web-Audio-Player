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

  const {
    audioRef, playlist, state, currentTrack, isLoading,
    togglePlay, next, previous, seek, setVolume, toggleMute,
    setPlaybackRate, toggleShuffle, toggleRepeat, playTrack,
    addToPlaylist, removeFromPlaylist, reorderPlaylist,
    handleTimeUpdate, handleLoadedMetadata, handleEnded, handleLoadStart,
  } = useMusicPlayer();

  const {
    analyserRef, connectAudioElement, setBandGain, applyPreset,
    equalizerGains, currentPreset, EQUALIZER_PRESETS, FREQUENCIES,
    spatialMode, changeSpatialMode, isSpatialLoaded,
  } = useAudioEngine();

  const onLoadedMetadata = useCallback(() => {
    handleLoadedMetadata();
    if (audioRef.current) {
      connectAudioElement(audioRef.current);
    }
  }, [handleLoadedMetadata, connectAudioElement, audioRef]);

  useKeyboardShortcuts({
    onPlayPause: togglePlay, onNext: next, onPrevious: previous,
    onVolumeUp: () => setVolume(Math.min(1, state.volume + 0.1)),
    onVolumeDown: () => setVolume(Math.max(0, state.volume - 0.1)),
    onMute: toggleMute, onSeekForward: () => seek(Math.min(state.duration, state.currentTime + 5)),
    onSeekBackward: () => seek(Math.max(0, state.currentTime - 5)),
    onToggleShuffle: toggleShuffle, onToggleRepeat: toggleRepeat,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      <main className="flex-1 flex flex-col lg:flex-row p-4 lg:p-8 gap-8 max-w-7xl mx-auto w-full overflow-hidden">
        
        {/* ЛЯВО: Плеър */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">SonicStream</h1>
            <button onClick={() => setShowEqualizer(!showEqualizer)} className={`p-2 rounded-full ${showEqualizer ? 'bg-purple-600' : 'bg-gray-800'}`}>EQ</button>
          </div>
          <div className="relative aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
            <AlbumArt currentTrack={currentTrack} isPlaying={state.isPlaying} />
            <div className="absolute bottom-0 left-0 right-0 p-8"><AudioVisualizer analyserRef={analyserRef} isPlaying={state.isPlaying} /></div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold truncate">{currentTrack?.title || 'No track'}</h2>
            <p className="text-purple-400 font-medium">{currentTrack?.artist || 'Upload music'}</p>
          </div>
          {showEqualizer && <Equalizer frequencies={FREQUENCIES} gains={equalizerGains} setGain={setBandGain} presets={EQUALIZER_PRESETS} onApplyPreset={applyPreset} currentPreset={currentPreset} />}
        </div>

        {/* ДЯСНО: Плейлист и Качване */}
        <div className="lg:w-80 flex flex-col gap-6">
          <FileUpload onUpload={addToPlaylist} />
          <Playlist tracks={playlist} currentTrackId={currentTrack?.id} isPlaying={state.isPlaying} onTrackSelect={playTrack} onRemoveTrack={removeFromPlaylist} onReorder={reorderPlaylist} />
        </div>
      </main>

      <footer className="bg-gray-900/80 backdrop-blur-xl border-t border-white/5 p-6 sticky bottom-0">
        <PlayerControls
          isPlaying={state.isPlaying} isLoading={isLoading} shuffle={state.shuffle} repeatMode={state.repeatMode} volume={state.volume} isMuted={state.isMuted} playbackRate={state.playbackRate} currentTime={state.currentTime} duration={state.duration}
          onPlayPause={togglePlay} onPrevious={previous} onNext={next} onShuffle={toggleShuffle} onRepeat={toggleRepeat} onVolumeChange={setVolume} onMuteToggle={toggleMute} onPlaybackRateChange={setPlaybackRate} onSeek={seek}
          spatialMode={spatialMode} onSpatialModeChange={changeSpatialMode} isSpatialLoaded={isSpatialLoaded}
        />
      </footer>

      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={handleEnded} onLoadStart={handleLoadStart} />
    </div>
  );
}