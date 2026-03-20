import { useState, useCallback, useRef, useEffect } from 'react';
import { Track, RepeatMode, AudioState } from '@/types/music';

// INITIAL STATE: Оставяме само един тестов трак. 
// Потребителят ще добавя своите песни чрез функцията addToPlaylist.
const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-1',
    title: 'Demo Track (Upload your own!)',
    artist: 'System Audio',
    album: 'Getting Started',
    duration: 372, // Времетраенето ще се ъпдейтне автоматично от метаданните
    artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop', // Визуална подсказка
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Сигурен, работещ тестов аудио файл
  }
];

export function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(DEMO_TRACKS);
  const [originalPlaylist, setOriginalPlaylist] = useState<Track[]>(DEMO_TRACKS);
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    playbackRate: 1,
    isMuted: false,
    shuffle: false,
    repeatMode: 'off',
    currentTrackIndex: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const currentTrack = playlist[state.currentTrackIndex] || null;

  const updateMediaSession = useCallback((track: Track) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork ? [
          { src: track.artwork, sizes: '300x300', type: 'image/jpeg' }
        ] : []
      });
    }
  }, []);

  useEffect(() => {
    if (currentTrack) {
      updateMediaSession(currentTrack);
    }
  }, [currentTrack, updateMediaSession]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        previous();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        next();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setState((prev) => ({ ...prev, isPlaying: true }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const next = useCallback(() => {
    setState((prev) => {
      let nextIndex = prev.currentTrackIndex + 1;
      if (nextIndex >= playlist.length) {
        nextIndex = 0;
      }
      return { ...prev, currentTrackIndex: nextIndex, currentTime: 0 };
    });
  }, [playlist.length]);

  const previous = useCallback(() => {
    setState((prev) => {
      if (prev.currentTime > 3) {
        return { ...prev, currentTime: 0 };
      }
      let prevIndex = prev.currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = playlist.length - 1;
      }
      return { ...prev, currentTrackIndex: prevIndex, currentTime: 0 };
    });
  }, [playlist.length]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((prev) => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setState((prev) => ({ ...prev, volume, isMuted: volume === 0 }));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMuted = !state.isMuted;
      audioRef.current.muted = newMuted;
      setState((prev) => ({ ...prev, isMuted: newMuted }));
    }
  }, [state.isMuted]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState((prev) => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => {
      const newShuffle = !prev.shuffle;
      if (newShuffle) {
        const currentTrack = playlist[prev.currentTrackIndex];
        const shuffled = [...playlist].sort(() => Math.random() - 0.5);
        const newCurrentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
        setPlaylist(shuffled);
        return { ...prev, shuffle: newShuffle, currentTrackIndex: newCurrentIndex };
      } else {
        const currentTrack = playlist[prev.currentTrackIndex];
        const newCurrentIndex = originalPlaylist.findIndex(t => t.id === currentTrack.id);
        setPlaylist(originalPlaylist);
        return { ...prev, shuffle: newShuffle, currentTrackIndex: newCurrentIndex };
      }
    });
  }, [playlist, originalPlaylist]);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...prev, repeatMode: modes[nextIndex] };
    });
  }, []);

  const playTrack = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentTrackIndex: index, currentTime: 0 }));
    setTimeout(() => play(), 100);
  }, [play]);

  const addToPlaylist = useCallback((track: Track) => {
    setPlaylist((prev) => [...prev, track]);
    setOriginalPlaylist((prev) => [...prev, track]);
  }, []);

  const removeFromPlaylist = useCallback((index: number) => {
    setPlaylist((prev) => prev.filter((_, i) => i !== index));
    setOriginalPlaylist((prev) => prev.filter((_, i) => i !== index));
    setState((prev) => {
      if (prev.currentTrackIndex >= index && prev.currentTrackIndex > 0) {
        return { ...prev, currentTrackIndex: prev.currentTrackIndex - 1 };
      }
      return prev;
    });
  }, []);

  const reorderPlaylist = useCallback((fromIndex: number, toIndex: number) => {
    setPlaylist((prev) => {
      const newPlaylist = [...prev];
      const [removed] = newPlaylist.splice(fromIndex, 1);
      newPlaylist.splice(toIndex, 0, removed);
      return newPlaylist;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setState((prev) => ({ ...prev, currentTime: audioRef.current!.currentTime }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState((prev) => ({ ...prev, duration: audioRef.current!.duration }));
      setIsLoading(false);
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (state.repeatMode === 'one') {
      seek(0);
      play();
    } else if (state.repeatMode === 'all' || state.currentTrackIndex < playlist.length - 1) {
      next();
    } else {
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [state.repeatMode, state.currentTrackIndex, playlist.length, seek, play, next]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  return {
    audioRef,
    playlist,
    state,
    currentTrack,
    isLoading,
    play,
    pause,
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
  };
}