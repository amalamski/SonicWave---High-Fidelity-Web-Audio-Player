import { useRef, useCallback, useEffect, useState } from 'react';
import { EqualizerPreset } from '@/types/music';

export type SpatialMode = 'off' | 'headphones' | 'speakers';

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
  
  // Spatial Audio Refs
  const dryGainRef = useRef<GainNode | null>(null);
  const hpGainRef = useRef<GainNode | null>(null);
  const spGainRef = useRef<GainNode | null>(null);

  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState<string>('Flat');
  
  // Spatial Audio State
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [irLoaded, setIrLoaded] = useState(false);

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

    // 1. Създаване на Еквалайзер (10 bands)
    const bands: BiquadFilterNode[] = FREQUENCIES.map((freq) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });
    equalizerBandsRef.current = bands;

    // 2. Свързване: Source -> Gain -> EQ Bands -> Analyser
    let lastNode: AudioNode = gainNode;
    bands.forEach((band) => {
      lastNode.connect(band);
      lastNode = band;
    });
    lastNode.connect(analyser);

    // =========================================================
    // 3. SPATIAL AUDIO ENGINE (Свързваме го СЛЕД Еквалайзера)
    // =========================================================
    
    // Генериране на импулс (стая)
    const duration = 0.4; 
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulseBuffer = audioContext.createBuffer(2, length, sampleRate);
    const left = impulseBuffer.getChannelData(0);
    const right = impulseBuffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const factor = Math.exp(-i / (sampleRate * 0.3)); 
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    // --- ВЕРИГА 1: ЧИСТ ЗВУК (OFF) ---
    const dryGain = audioContext.createGain();
    dryGain.gain.value = 1;
    analyser.connect(dryGain).connect(audioContext.destination);
    dryGainRef.current = dryGain;

    // --- ВЕРИГА 2: СЛУШАЛКИ (HEADPHONES) - ТУНИНГ ЗА ВИСОКИ СРЕДНИ ---
    const hpGain = audioContext.createGain();
    hpGain.gain.value = 0; 
    const hpBass = audioContext.createBiquadFilter(); hpBass.type = 'lowshelf'; hpBass.frequency.value = 120; hpBass.gain.value = 2.5;
    const hpMid = audioContext.createBiquadFilter(); hpMid.type = 'peaking'; hpMid.frequency.value = 800; hpMid.Q.value = 1; hpMid.gain.value = -1.5;
    
    // ПРОМЯНА: Подсилваме високите средни (по-ниска честота, по-широк обхват, малко повече gain)
    const hpPresence = audioContext.createBiquadFilter(); hpPresence.type = 'peaking'; hpPresence.frequency.value = 2800; hpPresence.Q.value = 0.9; hpPresence.gain.value = 5;
    
    // ПРОМЯНА: Успокояваме най-високите честоти (свалени до 1.5dB)
    const hpTreble = audioContext.createBiquadFilter(); hpTreble.type = 'highshelf'; hpTreble.frequency.value = 7000; hpTreble.gain.value = 1.5;
    
    const hpSplit = audioContext.createChannelSplitter(2);
    const hpPanL = audioContext.createPanner(); hpPanL.panningModel = 'HRTF'; hpPanL.positionX.value = -2.0; hpPanL.positionZ.value = -1.0;
    const hpPanR = audioContext.createPanner(); hpPanR.panningModel = 'HRTF'; hpPanR.positionX.value = 2.0; hpPanR.positionZ.value = -1.0;
    const hpRev = audioContext.createConvolver(); hpRev.buffer = impulseBuffer;
    const hpRevGain = audioContext.createGain(); hpRevGain.gain.value = 0.05; 

    analyser.connect(hpGain).connect(hpBass).connect(hpMid).connect(hpPresence).connect(hpTreble);
    hpTreble.connect(hpSplit);
    hpSplit.connect(hpPanL, 0).connect(audioContext.destination);
    hpSplit.connect(hpPanR, 1).connect(audioContext.destination);
    hpTreble.connect(hpRev).connect(hpRevGain).connect(audioContext.destination);
    hpGainRef.current = hpGain;

    // --- ВЕРИГА 3: ГОВОРИТЕЛИ (SPEAKERS) ---
    const spGain = audioContext.createGain();
    spGain.gain.value = 0; 
    const spBass = audioContext.createBiquadFilter(); spBass.type = 'lowshelf'; spBass.frequency.value = 200; spBass.gain.value = 5;
    const spTreble = audioContext.createBiquadFilter(); spTreble.type = 'highshelf'; spTreble.frequency.value = 4000; spTreble.gain.value = 4;
    const spComp = audioContext.createDynamicsCompressor(); spComp.threshold.value = -24; spComp.knee.value = 30; spComp.ratio.value = 4; spComp.attack.value = 0.003; spComp.release.value = 0.25;
    const spSplit = audioContext.createChannelSplitter(2);
    const spPanL = audioContext.createPanner(); spPanL.panningModel = 'equalpower'; spPanL.positionX.value = -2.5; spPanL.positionZ.value = -1.0;
    const spPanR = audioContext.createPanner(); spPanR.panningModel = 'equalpower'; spPanR.positionX.value = 2.5; spPanR.positionZ.value = -1.0;
    const spRev = audioContext.createConvolver(); spRev.buffer = impulseBuffer;
    const spRevGain = audioContext.createGain(); spRevGain.gain.value = 0.12;

    analyser.connect(spGain).connect(spBass).connect(spTreble);
    spTreble.connect(spSplit);
    spSplit.connect(spPanL, 0).connect(spComp);
    spSplit.connect(spPanR, 1).connect(spComp);
    spTreble.connect(spComp); 
    spTreble.connect(spRev).connect(spRevGain).connect(spComp);
    spComp.connect(audioContext.destination);
    spGainRef.current = spGain;

    setIrLoaded(true);
  }, []);

  const changeSpatialMode = useCallback((newMode: SpatialMode) => {
    const audioCtx = audioContextRef.current;
    const dryGain = dryGainRef.current;
    const hpGain = hpGainRef.current;
    const spGain = spGainRef.current;

    if (!audioCtx || !dryGain || !hpGain || !spGain) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const fadeTime = 0.3;

    dryGain.gain.setValueAtTime(dryGain.gain.value, now);
    hpGain.gain.setValueAtTime(hpGain.gain.value, now);
    spGain.gain.setValueAtTime(spGain.gain.value, now);

    dryGain.gain.linearRampToValueAtTime(newMode === 'off' ? 1 : 0, now + fadeTime);
    hpGain.gain.linearRampToValueAtTime(newMode === 'headphones' ? 1 : 0, now + fadeTime);
    spGain.gain.linearRampToValueAtTime(newMode === 'speakers' ? 1 : 0, now + fadeTime);

    setSpatialMode(newMode);
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      initAudioContext();
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    // Този source вече минава през цялата верига (Gain -> EQ -> Analyser -> Spatial -> Destination)
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
    spatialMode,
    changeSpatialMode,
    irLoaded,
  };
}