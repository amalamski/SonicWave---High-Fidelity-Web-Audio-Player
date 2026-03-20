export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork?: string;
  file?: File;
  url?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface EqualizerPreset {
  name: string;
  gains: number[];
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  currentTrackIndex: number;
}
