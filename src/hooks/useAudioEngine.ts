import { useRef, useCallback, useEffect, useState } from 'react';
import { EqualizerPreset } from '@/types/music';

const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 2, 4, 6, 8, 10] },
  { name: 'Rock', gains: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5] },
  { name: 'Pop', gains: [-1, 2, 4, 6, 5, 4, 2, 0, -1, -2] },
  { name: 'Jazz', gains: [3, 2, 1, 2, -2, -2, 0, 2, 3, 4] },
  { name: 'Classical', gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4] },
  { name: 'Electronic', gains: [5, 4, 2, 0, -2, 2, 3, 4, 4, 5] },
  { name: 'Hip-Hop', gains: [5, 4, 3, 1, -1, -1, 2, 2, 3, 4] },
  { name: 'Vocal', gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1] },
];

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const equalizerBandsRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState<string>('Flat');

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    // Create 10-band equalizer
    const bands: BiquadFilterNode[] = FREQUENCIES.map((freq) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });
    equalizerBandsRef.current = bands;

    // Connect the chain
    let lastNode: AudioNode = gainNode;
    bands.forEach((band) => {
      lastNode.connect(band);
      lastNode = band;
    });
    lastNode.connect(analyser);
    analyser.connect(audioContext.destination);
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    const source = audioContextRef.current!.createMediaElementSource(audio);
    source.connect(gainNodeRef.current!);
    sourceRef.current = source;
  }, [initAudioContext]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const setBandGain = useCallback((bandIndex: number, gain: number) => {
    if (equalizerBandsRef.current[bandIndex]) {
      equalizerBandsRef.current[bandIndex].gain.value = gain;
      setEqualizerGains((prev) => {
        const newGains = [...prev];
        newGains[bandIndex] = gain;
        return newGains;
      });
    }
  }, []);

  const applyPreset = useCallback((preset: EqualizerPreset) => {
    preset.gains.forEach((gain, index) => {
      setBandGain(index, gain);
    });
    setCurrentPreset(preset.name);
  }, [setBandGain]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    audioRef,
    audioContextRef,
    analyserRef,
    initAudioContext,
    connectAudioElement,
    getAnalyser,
    setBandGain,
    applyPreset,
    equalizerGains,
    currentPreset,
    EQUALIZER_PRESETS,
    FREQUENCIES,
  };
}
