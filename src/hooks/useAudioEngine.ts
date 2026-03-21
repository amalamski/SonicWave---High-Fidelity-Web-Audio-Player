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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const equalizerBandsRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const dryGainRef = useRef<GainNode | null>(null);
  const hpGainRef = useRef<GainNode | null>(null);
  const spGainRef = useRef<GainNode | null>(null);

  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState<string>('Flat');
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [irLoaded, setIrLoaded] = useState(false);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    const bands = FREQUENCIES.map((freq) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });
    equalizerBandsRef.current = bands;

    let lastNode: AudioNode = gainNode;
    bands.forEach((band) => {
      lastNode.connect(band);
      lastNode = band;
    });
    lastNode.connect(analyser);

    // --- IR GENERATION ---
    const duration = 0.6; 
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulseBuffer = audioContext.createBuffer(2, length, sampleRate);
    const left = impulseBuffer.getChannelData(0);
    const right = impulseBuffer.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const factor = Math.exp(-i / (sampleRate * 0.28)); 
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    // --- 1. DRY CHAIN ---
    const dryGain = audioContext.createGain();
    dryGain.gain.value = 1;
    analyser.connect(dryGain).connect(audioContext.destination);
    dryGainRef.current = dryGain;

    // --- 2. HARMAN-TUNED HEADPHONES CHAIN ---
    const hpGain = audioContext.createGain();
    hpGain.gain.value = 0; 
    
    // Harman Step 1: Sub-Bass Rise (симулира усещане на тялото)
    const hpSubBass = audioContext.createBiquadFilter();
    hpSubBass.type = 'lowshelf'; hpSubBass.frequency.value = 105; hpSubBass.gain.value = 5.5;

    // Harman Step 2: Ear Canal Resonance (Pinna gain на 3kHz)
    const hpPinna = audioContext.createBiquadFilter();
    hpPinna.type = 'peaking'; hpPinna.frequency.value = 3000; hpPinna.Q.value = 1.2; hpPinna.gain.value = 6;

    // Harman Step 3: Clarity/Air (High shelf за детайл)
    const hpAir = audioContext.createBiquadFilter();
    hpAir.type = 'highshelf'; hpAir.frequency.value = 11000; hpAir.gain.value = 2.5;

    // Vocal Mid-Clarity (вашата любима част за вокалите)
    const hpVocalMid = audioContext.createBiquadFilter();
    hpVocalMid.type = 'peaking'; hpVocalMid.frequency.value = 1400; hpVocalMid.Q.value = 0.7; hpVocalMid.gain.value = 2.5;

    // Gain Compensation (+2.5dB за запазване на силата)
    const hpCompensator = audioContext.createGain();
    hpCompensator.gain.value = 1.35; // 1.35x ≈ +2.6dB

    const hpRev = audioContext.createConvolver();
    hpRev.buffer = impulseBuffer;
    const hpRevGain = audioContext.createGain(); hpRevGain.gain.value = 0.08;

    const hpSplit = audioContext.createChannelSplitter(2);
    const hpPanL = audioContext.createPanner(); hpPanL.panningModel = 'HRTF'; hpPanL.positionX.value = -2.5;
    const hpPanR = audioContext.createPanner(); hpPanR.panningModel = 'HRTF'; hpPanR.positionX.value = 2.5;

    // Chain: EQ -> Split -> HRTF
    analyser.connect(hpGain).connect(hpSubBass).connect(hpVocalMid).connect(hpPinna).connect(hpAir).connect(hpCompensator);
    hpCompensator.connect(hpSplit);
    hpSplit.connect(hpPanL, 0).connect(audioContext.destination);
    hpSplit.connect(hpPanR, 1).connect(audioContext.destination);
    
    // Parallel Reverb
    hpCompensator.connect(hpRev).connect(hpRevGain).connect(audioContext.destination);
    
    hpGainRef.current = hpGain;

    // --- 3. SPEAKERS CHAIN ---
    const spGain = audioContext.createGain();
    spGain.gain.value = 0; 
    const spCompNode = audioContext.createDynamicsCompressor();
    spCompNode.threshold.value = -20; spCompNode.ratio.value = 3.5;
    const spPanL = audioContext.createPanner(); spPanL.panningModel = 'equalpower'; spPanL.positionX.value = -4;
    const spPanR = audioContext.createPanner(); spPanR.panningModel = 'equalpower'; spPanR.positionX.value = 4;
    
    analyser.connect(spGain).connect(spCompNode);
    spCompNode.connect(spPanL).connect(audioContext.destination);
    spCompNode.connect(spPanR).connect(audioContext.destination);
    spGainRef.current = spGain;

    setIrLoaded(true);
  }, []);

  const changeSpatialMode = useCallback((newMode: SpatialMode) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || !dryGainRef.current || !hpGainRef.current || !spGainRef.current) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const fade = 0.4;

    [dryGainRef, hpGainRef, spGainRef].forEach(ref => ref.current?.gain.setValueAtTime(ref.current.gain.value, now));

    dryGainRef.current.gain.linearRampToValueAtTime(newMode === 'off' ? 1 : 0, now + fade);
    hpGainRef.current.gain.linearRampToValueAtTime(newMode === 'headphones' ? 1 : 0, now + fade);
    spGainRef.current.gain.linearRampToValueAtTime(newMode === 'speakers' ? 1 : 0, now + fade);

    setSpatialMode(newMode);
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current) initAudioContext();
    if (sourceRef.current) sourceRef.current.disconnect();
    const source = audioContextRef.current!.createMediaElementSource(audio);
    source.connect(gainNodeRef.current!);
    sourceRef.current = source;
  }, [initAudioContext]);

  const setBandGain = useCallback((bandIndex: number, gain: number) => {
    if (equalizerBandsRef.current[bandIndex]) {
      equalizerBandsRef.current[bandIndex].gain.value = gain;
      setEqualizerGains(prev => {
        const n = [...prev]; n[bandIndex] = gain; return n;
      });
    }
  }, []);

  const applyPreset = useCallback((preset: EqualizerPreset) => {
    preset.gains.forEach((g, i) => setBandGain(i, g));
    setCurrentPreset(preset.name);
  }, [setBandGain]);

  return {
    analyserRef, initAudioContext, connectAudioElement, setBandGain, applyPreset,
    equalizerGains, currentPreset, EQUALIZER_PRESETS, FREQUENCIES,
    spatialMode, changeSpatialMode, irLoaded
  };
}