import { useRef, useCallback, useState } from 'react';
import { EqualizerPreset } from '@/types/music';

export type SpatialMode = 'off' | 'headphones' | 'speakers';

const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQUALIZER_PRESETS: EqualizerPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Bass Boost', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
];

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const equalizerBandsRef = useRef<BiquadFilterNode[]>([]);
  const hpGainRef = useRef<GainNode | null>(null);
  const spGainRef = useRef<GainNode | null>(null);
  
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [isSpatialLoaded, setIsSpatialLoaded] = useState(false);
  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState('Flat');
  const analyserRef = useRef<AnalyserNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = context.createGain();
    const analyser = context.createAnalyser();
    
    let lastNode: AudioNode = gainNode;
    FREQUENCIES.forEach((freq) => {
      const filter = context.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.gain.value = 0;
      lastNode.connect(filter);
      equalizerBandsRef.current.push(filter);
      lastNode = filter;
    });

    const hpGain = context.createGain();
    const spGain = context.createGain();
    hpGain.gain.value = 0;
    spGain.gain.value = 0;

    lastNode.connect(hpGain);
    lastNode.connect(spGain);
    lastNode.connect(context.destination);
    
    hpGain.connect(context.destination);
    spGain.connect(context.destination);

    audioContextRef.current = context;
    gainNodeRef.current = gainNode;
    analyserRef.current = analyser;
    hpGainRef.current = hpGain;
    spGainRef.current = spGain;
    
    gainNode.connect(analyser);
    setIsSpatialLoaded(true);
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current) initAudioContext();
    if (sourceRef.current) return;
    const source = audioContextRef.current!.createMediaElementSource(audio);
    source.connect(gainNodeRef.current!);
    sourceRef.current = source;
  }, [initAudioContext]);

  const changeSpatialMode = useCallback((newMode: SpatialMode) => {
    if (!audioContextRef.current) return;
    const now = audioContextRef.current.currentTime;
    [hpGainRef, spGainRef].forEach(ref => {
      if (ref.current) ref.current.gain.linearRampToValueAtTime(0, now + 0.2);
    });
    if (newMode === 'headphones' && hpGainRef.current) hpGainRef.current.gain.linearRampToValueAtTime(1, now + 0.2);
    if (newMode === 'speakers' && spGainRef.current) spGainRef.current.gain.linearRampToValueAtTime(1, now + 0.2);
    setSpatialMode(newMode);
  }, []);

  const setBandGain = useCallback((bandIndex: number, gain: number) => {
    if (equalizerBandsRef.current[bandIndex]) {
      equalizerBandsRef.current[bandIndex].gain.value = gain;
      setEqualizerGains(prev => {
        const n = [...prev]; n[bandIndex] = gain; return n;
      });
    }
  }, []);

  return {
    analyserRef, connectAudioElement, setBandGain, equalizerGains,
    currentPreset, spatialMode, changeSpatialMode, isSpatialLoaded,
    FREQUENCIES, EQUALIZER_PRESETS,
    applyPreset: (preset: any) => {
      preset.gains.forEach((g: number, i: number) => setBandGain(i, g));
      setCurrentPreset(preset.name);
    }
  };
}