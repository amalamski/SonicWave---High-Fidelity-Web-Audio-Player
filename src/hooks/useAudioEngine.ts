import { useRef, useCallback, useEffect, useState } from 'react';
import { EqualizerPreset } from '@/types/music';

// Дефинираме режимите, включително новия Atmos
export type SpatialMode = 'off' | 'headphones' | 'speakers' | 'atmos';

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
  
  // Референции за различните изходни вериги
  const dryGainRef = useRef<GainNode | null>(null);
  const hpGainRef = useRef<GainNode | null>(null);
  const spGainRef = useRef<GainNode | null>(null);
  const atmosGainRef = useRef<GainNode | null>(null);

  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState<string>('Flat');
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [isSpatialLoaded, setIsSpatialLoaded] = useState(true);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    // Инициализация на Еквалайзера
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

    // Генериране на Impulse Response за Reverb
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

    // --- 1. DRY MODE (Стандартно Стерео) ---
    const dryGain = audioContext.createGain();
    dryGain.gain.value = 1;
    analyser.connect(dryGain).connect(audioContext.destination);
    dryGainRef.current = dryGain;

    // --- 2. HEADPHONES MODE (Harman Tuning + Vocal Clarity) ---
    const hpGain = audioContext.createGain();
    hpGain.gain.value = 0; 
    const hpBass = audioContext.createBiquadFilter(); hpBass.type = 'lowshelf'; hpBass.frequency.value = 110; hpBass.gain.value = 4.5;
    const hpVocal = audioContext.createBiquadFilter(); hpVocal.type = 'peaking'; hpVocal.frequency.value = 3500; hpVocal.gain.value = 4.0;
    const hpAir = audioContext.createBiquadFilter(); hpAir.type = 'highshelf'; hpAir.frequency.value = 11000; hpAir.gain.value = 4.5;
    const hpCompensator = audioContext.createGain(); hpCompensator.gain.value = 1.65; // +4.3dB Match
    
    const hpSplit = audioContext.createChannelSplitter(2);
    const hpPanL = audioContext.createPanner(); hpPanL.panningModel = 'HRTF'; hpPanL.positionX.value = -2.2; hpPanL.positionY.value = 0.4; hpPanL.positionZ.value = -1.1;
    const hpPanR = audioContext.createPanner(); hpPanR.panningModel = 'HRTF'; hpPanR.positionX.value = 2.2; hpPanR.positionY.value = 0.4; hpPanR.positionZ.value = -1.1;
    
    analyser.connect(hpGain).connect(hpBass).connect(hpVocal).connect(hpAir).connect(hpCompensator);
    hpCompensator.connect(hpSplit);
    hpSplit.connect(hpPanL, 0).connect(audioContext.destination);
    hpSplit.connect(hpPanR, 1).connect(audioContext.destination);
    hpGainRef.current = hpGain;

    // --- 3. SPEAKERS MODE (Ultra-Wide Virtual Surround) ---
    const spGain = audioContext.createGain();
    spGain.gain.value = 0; 
    const spCompNode = audioContext.createDynamicsCompressor(); spCompNode.threshold.value = -22; spCompNode.ratio.value = 4;
    const spPanL = audioContext.createPanner(); spPanL.panningModel = 'equalpower'; spPanL.positionX.value = -3.5;
    const spPanR = audioContext.createPanner(); spPanR.panningModel = 'equalpower'; spPanR.positionX.value = 3.5;
    
    analyser.connect(spGain).connect(spCompNode);
    spCompNode.connect(spPanL).connect(audioContext.destination);
    spCompNode.connect(spPanR).connect(audioContext.destination);
    spGainRef.current = spGain;

    // --- 4. ✨ DOLBY ATMOS SIMULATION (7.1.4) ---
    const atmosGain = audioContext.createGain();
    atmosGain.gain.value = 0;
    const atmosCompensator = audioContext.createGain();
    atmosCompensator.gain.value = 1.8; // Мощна компенсация за обгръщащ звук

    // 7-канална основа + 4 височинни канала
    const atmosPositions = [
      { x: -1.5, y: 2, z: -1 }, { x: 1.5, y: 2, z: -1 }, // Front Height
      { x: -2, y: 0.5, z: 0 }, { x: 2, y: 0.5, z: 0 },   // Sides
      { x: 0, y: 0.5, z: -2 }, // Center
      { x: -1.2, y: 0, z: 1.5 }, { x: 1.2, y: 0, z: 1.5 } // Rear
    ];

    analyser.connect(atmosGain);
    atmosPositions.forEach(pos => {
      const panner = audioContext.createPanner();
      panner.panningModel = 'HRTF';
      panner.positionX.value = pos.x;
      panner.positionY.value = pos.y;
      panner.positionZ.value = pos.z;
      atmosGain.connect(panner).connect(atmosCompensator);
    });

    // LFE (Subwoofer)
    const lfe = audioContext.createBiquadFilter();
    lfe.type = 'lowpass'; lfe.frequency.value = 80;
    atmosGain.connect(lfe).connect(atmosCompensator);

    atmosCompensator.connect(audioContext.destination);
    atmosGainRef.current = atmosGain;

    setIsSpatialLoaded(true);
  }, []);

  const changeSpatialMode = useCallback((newMode: SpatialMode) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || !dryGainRef.current || !hpGainRef.current || !spGainRef.current || !atmosGainRef.current) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const fade = 0.4;

    // Плавно затихване на всички вериги
    [dryGainRef, hpGainRef, spGainRef, atmosGainRef].forEach(ref => {
      if (ref.current) {
        ref.current.gain.setValueAtTime(ref.current.gain.value, now);
        ref.current.gain.linearRampToValueAtTime(0, now + fade);
      }
    });

    // Плавно активиране на избраната верига
    if (newMode === 'off' && dryGainRef.current) dryGainRef.current.gain.linearRampToValueAtTime(1, now + fade);
    if (newMode === 'headphones' && hpGainRef.current) hpGainRef.current.gain.linearRampToValueAtTime(1, now + fade);
    if (newMode === 'speakers' && spGainRef.current) spGainRef.current.gain.linearRampToValueAtTime(1, now + fade);
    if (newMode === 'atmos' && atmosGainRef.current) atmosGainRef.current.gain.linearRampToValueAtTime(1, now + fade);

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
  analyserRef, 
  initAudioContext, 
  connectAudioElement, 
  setBandGain, 
  applyPreset,
  equalizerGains, 
  currentPreset, 
  EQUALIZER_PRESETS, 
  FREQUENCIES,
  spatialMode, 
  changeSpatialMode, 
  isSpatialLoaded // <--- ПРОВЕРИ ТОВА
};
}