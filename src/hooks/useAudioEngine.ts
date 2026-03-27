import { useRef, useCallback, useEffect, useState } from 'react';
import { EqualizerPreset, SpatialMode, SpatialPreset } from '@/types/music';

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

export const SPATIAL_PRESETS: SpatialPreset[] = [
  { name: 'Normal (Off)', mode: 'off', description: 'No spatial processing' },
  { name: 'Spatial (Headphones)', mode: 'headphones', description: 'Airy HRTF with crossfeed & deep bass' },
  { name: 'Spatial (Speakers)', mode: 'speakers', description: 'MacBook signature wide stereo with juicy lows' },
  { name: 'Dolby Atmos', mode: 'dolby-atmos', description: 'Immersive 3D depth, cinematic sub-bass' },
];

function generateImpulseResponse(
  audioContext: AudioContext,
  duration: number,
  decay: number,
  reverse: boolean = false
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const amplitude = Math.exp(-decay * t);
    const n = reverse ? length - i - 1 : i;
    leftChannel[n] = (Math.random() * 2 - 1) * amplitude;
    rightChannel[n] = (Math.random() * 2 - 1) * amplitude;
  }

  return impulse;
}

function generateHRTFImpulse(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * 0.08); 
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  let lastL = 0, lastR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-35 * t); 
    
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;
    lastL = 0.4 * lastL + 0.6 * noiseL;
    lastR = 0.4 * lastR + 0.6 * noiseR;

    leftChannel[i] = lastL * decay;
    rightChannel[i] = lastR * decay;

    if (t > 0.0005) {
      leftChannel[i] += lastR * decay * 0.4;
      rightChannel[i] += lastL * decay * 0.4;
    }
  }

  let maxAmp = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(leftChannel[i]) > maxAmp) maxAmp = Math.abs(leftChannel[i]);
    if (Math.abs(rightChannel[i]) > maxAmp) maxAmp = Math.abs(rightChannel[i]);
  }
  if (maxAmp > 0) {
    for (let i = 0; i < length; i++) {
      leftChannel[i] = (leftChannel[i] / maxAmp) * 0.85; 
      rightChannel[i] = (rightChannel[i] / maxAmp) * 0.85;
    }
  }

  return impulse;
}

function generateRoomImpulse(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * 0.15); 
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  let lastNoiseL = 0;
  let lastNoiseR = 0;
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-25 * t); 
    
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;
    
    lastNoiseL = 0.5 * lastNoiseL + 0.5 * noiseL; 
    lastNoiseR = 0.5 * lastNoiseR + 0.5 * noiseR; 

    leftChannel[i] = lastNoiseL * decay;
    
    if (t > 0.010) {
      rightChannel[i] = lastNoiseR * Math.exp(-25 * (t - 0.010)) * 0.8; 
    } else {
      rightChannel[i] = lastNoiseR * decay;
    }
  }

  let maxAmp = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(leftChannel[i]) > maxAmp) maxAmp = Math.abs(leftChannel[i]);
    if (Math.abs(rightChannel[i]) > maxAmp) maxAmp = Math.abs(rightChannel[i]);
  }
  if (maxAmp > 0) {
    for (let i = 0; i < length; i++) {
      leftChannel[i] = (leftChannel[i] / maxAmp) * 0.9;
      rightChannel[i] = (rightChannel[i] / maxAmp) * 0.9;
    }
  }

  return impulse;
}

function generateAtmosImpulse(audioContext: AudioContext): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * 0.50); 
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const leftChannel = impulse.getChannelData(0);
  const rightChannel = impulse.getChannelData(1);

  let lastL = 0, lastR = 0;
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const decay = Math.exp(-7 * t); 
    
    const noiseL = Math.random() * 2 - 1;
    const noiseR = Math.random() * 2 - 1;
    
    lastL = 0.6 * lastL + 0.4 * noiseL;
    lastR = 0.6 * lastR + 0.4 * noiseR;

    const panL = Math.cos(t * Math.PI * 2);
    const panR = Math.sin(t * Math.PI * 2);

    leftChannel[i] = lastL * decay * (1 + 0.3 * panL);
    rightChannel[i] = lastR * decay * (1 + 0.3 * panR);
  }

  let maxAmp = 0;
  for (let i = 0; i < length; i++) {
    if (Math.abs(leftChannel[i]) > maxAmp) maxAmp = Math.abs(leftChannel[i]);
    if (Math.abs(rightChannel[i]) > maxAmp) maxAmp = Math.abs(rightChannel[i]);
  }
  if (maxAmp > 0) {
    for (let i = 0; i < length; i++) {
      leftChannel[i] = (leftChannel[i] / maxAmp) * 0.9;
      rightChannel[i] = (rightChannel[i] / maxAmp) * 0.9;
    }
  }

  return impulse;
}

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const equalizerBandsRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const spatialConvolverInputRef = useRef<GainNode | null>(null);
  const spatialConvolverRef = useRef<ConvolverNode | null>(null);
  
  const spatialDryGainRef = useRef<GainNode | null>(null);
  const spatialWetGainRef = useRef<GainNode | null>(null);
  const spatialMergerRef = useRef<GainNode | null>(null);
  const stereoPannerRef = useRef<StereoPannerNode | null>(null);
  
  const spatialDelayLeftRef = useRef<DelayNode | null>(null);
  const spatialDelayRightRef = useRef<DelayNode | null>(null);
  const spatialLowpassRef = useRef<BiquadFilterNode | null>(null);
  const spatialHighpassRef = useRef<BiquadFilterNode | null>(null);
  
  const spatialBassBoostRef = useRef<BiquadFilterNode | null>(null);
  
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const crossfeedGainRef = useRef<GainNode | null>(null);
  
  const [equalizerGains, setEqualizerGains] = useState<number[]>(new Array(10).fill(0));
  const [currentPreset, setCurrentPreset] = useState<string>('Flat');
  const [spatialMode, setSpatialMode] = useState<SpatialMode>('off');
  const [currentSpatialPreset, setCurrentSpatialPreset] = useState<string>('Normal (Off)');
  const [isSpatialLoaded, setIsSpatialLoaded] = useState(false);

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

    const bands: BiquadFilterNode[] = FREQUENCIES.map((freq) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.4;
      filter.gain.value = 0;
      return filter;
    });
    equalizerBandsRef.current = bands;

    const splitter = audioContext.createChannelSplitter(2);
    splitterRef.current = splitter;

    const merger = audioContext.createChannelMerger(2);
    mergerRef.current = merger;

    const delayLeft = audioContext.createDelay(0.1);
    delayLeft.delayTime.value = 0;
    spatialDelayLeftRef.current = delayLeft;

    const delayRight = audioContext.createDelay(0.1);
    delayRight.delayTime.value = 0;
    spatialDelayRightRef.current = delayRight;

    const crossfeedGain = audioContext.createGain();
    crossfeedGain.gain.value = 0;
    crossfeedGainRef.current = crossfeedGain;

    splitter.connect(merger, 0, 0); 
    splitter.connect(merger, 1, 1); 

    splitter.connect(delayLeft, 0);
    delayLeft.connect(crossfeedGain);
    crossfeedGain.connect(merger, 0, 1); 

    splitter.connect(delayRight, 1);
    delayRight.connect(crossfeedGain);
    crossfeedGain.connect(merger, 0, 0); 

    const dryGain = audioContext.createGain();
    dryGain.gain.value = 1.0;
    spatialDryGainRef.current = dryGain;

    const convolverInput = audioContext.createGain();
    convolverInput.gain.value = 1.0;
    spatialConvolverInputRef.current = convolverInput;

    const convolver = audioContext.createConvolver();
    spatialConvolverRef.current = convolver;

    const wetGain = audioContext.createGain();
    wetGain.gain.value = 0.0;
    spatialWetGainRef.current = wetGain;

    const spatialMerger = audioContext.createGain();
    spatialMergerRef.current = spatialMerger;

    const stereoPanner = audioContext.createStereoPanner();
    stereoPanner.pan.value = 0;
    stereoPannerRef.current = stereoPanner;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 20000;
    lowpass.Q.value = 0.7;
    spatialLowpassRef.current = lowpass;

    const highpass = audioContext.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 20;
    highpass.Q.value = 0.7;
    spatialHighpassRef.current = highpass;

    // ИСТИНСКИ СОЧЕН БАС (Психоакустичен филтър свален на 80Hz)
    const spatialBassBoost = audioContext.createBiquadFilter();
    spatialBassBoost.type = 'peaking';
    spatialBassBoost.frequency.value = 80; // Свален от 150 на 80 (сочната част на баса)
    spatialBassBoost.Q.value = 0.6; // По-широка, топла камбана
    spatialBassBoost.gain.value = 0; 
    spatialBassBoostRef.current = spatialBassBoost;

    let lastEqNode: AudioNode = gainNode;
    bands.forEach((band) => {
      lastEqNode.connect(band);
      lastEqNode = band;
    });

    lastEqNode.connect(splitter);
    
    merger.connect(dryGain);
    dryGain.connect(spatialMerger);

    lastEqNode.connect(convolverInput);
    convolverInput.connect(convolver);
    convolver.connect(wetGain);
    wetGain.connect(spatialMerger);

    spatialMerger.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(spatialBassBoost); 
    spatialBassBoost.connect(stereoPanner);
    stereoPanner.connect(analyser);
    
    const limiter = audioContext.createDynamicsCompressor();
    limiter.threshold.value = -1.0;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.001; 
    limiter.release.value = 0.050;
    
    analyser.connect(limiter);
    limiter.connect(audioContext.destination);

    convolver.buffer = generateImpulseResponse(audioContext, 0.01, 100);
    setIsSpatialLoaded(true);
  }, []);

  const connectAudioElement = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current) initAudioContext();
    
    if (sourceRef.current) {
      return; 
    }

    try {
      const source = audioContextRef.current!.createMediaElementSource(audio);
      source.connect(gainNodeRef.current!);
      sourceRef.current = source;
    } catch (e) {
      console.warn("Audio node connection safe-catch:", e);
    }
  }, [initAudioContext]);

  const applySpatialMode = useCallback(async (mode: SpatialMode) => {
    if (!audioContextRef.current || !spatialConvolverInputRef.current || 
        !spatialDryGainRef.current || !spatialWetGainRef.current ||
        !spatialLowpassRef.current || !spatialHighpassRef.current ||
        !stereoPannerRef.current || !crossfeedGainRef.current || 
        !spatialDelayLeftRef.current || !spatialDelayRightRef.current ||
        !spatialBassBoostRef.current) { 
      return;
    }

    const ctx = audioContextRef.current;
    
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch(e) {}
    }

    const currentTime = ctx.currentTime || 0;
    const nyquist = ctx.sampleRate / 2;
    const safeFreq = (freq: number) => Math.min(freq, nyquist - 100);

    const oldConvolver = spatialConvolverRef.current;
    let newBuffer: AudioBuffer | null = null;

    try {
      switch (mode) {
        case 'off':
          newBuffer = generateImpulseResponse(ctx, 0.01, 100);
          crossfeedGainRef.current.gain.setTargetAtTime(0.0, currentTime, 0.05);
          spatialDryGainRef.current.gain.setTargetAtTime(1.0, currentTime, 0.05);
          spatialWetGainRef.current.gain.setTargetAtTime(0.0, currentTime, 0.05);
          spatialLowpassRef.current.frequency.setTargetAtTime(safeFreq(20000), currentTime, 0.05);
          spatialHighpassRef.current.frequency.setTargetAtTime(20, currentTime, 0.05);
          spatialBassBoostRef.current.gain.setTargetAtTime(0, currentTime, 0.05);
          break;

        case 'headphones':
          newBuffer = generateHRTFImpulse(ctx);
          spatialDelayLeftRef.current.delayTime.setTargetAtTime(0.0003, currentTime, 0.05);
          spatialDelayRightRef.current.delayTime.setTargetAtTime(0.0003, currentTime, 0.05);
          crossfeedGainRef.current.gain.setTargetAtTime(0.20, currentTime, 0.05);
          
          spatialDryGainRef.current.gain.setTargetAtTime(1.0, currentTime, 0.05);
          spatialWetGainRef.current.gain.setTargetAtTime(0.40, currentTime, 0.05);
          spatialLowpassRef.current.frequency.setTargetAtTime(safeFreq(16000), currentTime, 0.05);
          // ПО-СОЧЕН БАС: Сваляме High-Pass от 120Hz на 80Hz. Басът има леко 3D тяло.
          spatialHighpassRef.current.frequency.setTargetAtTime(80, currentTime, 0.05); 
          spatialBassBoostRef.current.gain.setTargetAtTime(0, currentTime, 0.05);
          break;

        case 'speakers':
          newBuffer = generateRoomImpulse(ctx);
          spatialDelayLeftRef.current.delayTime.setTargetAtTime(0.010, currentTime, 0.05); 
          spatialDelayRightRef.current.delayTime.setTargetAtTime(0.010, currentTime, 0.05);
          crossfeedGainRef.current.gain.setTargetAtTime(-0.35, currentTime, 0.05);
          
          spatialDryGainRef.current.gain.setTargetAtTime(1.0, currentTime, 0.05);
          spatialWetGainRef.current.gain.setTargetAtTime(0.50, currentTime, 0.05); 
          spatialLowpassRef.current.frequency.setTargetAtTime(safeFreq(16000), currentTime, 0.05); 
          // ПО-СОЧЕН БАС: Сваляме High-Pass на 90Hz (беше 150)
          spatialHighpassRef.current.frequency.setTargetAtTime(90, currentTime, 0.05); 
          // ТОПЪЛ БУУСТ: +2.0 dB на 80Hz (Истински дълбок сок)
          spatialBassBoostRef.current.gain.setTargetAtTime(2.0, currentTime, 0.05);
          break;

        case 'dolby-atmos':
          newBuffer = generateAtmosImpulse(ctx);
          spatialDelayLeftRef.current.delayTime.setTargetAtTime(0.012, currentTime, 0.05); 
          spatialDelayRightRef.current.delayTime.setTargetAtTime(0.012, currentTime, 0.05);
          crossfeedGainRef.current.gain.setTargetAtTime(-0.25, currentTime, 0.05); 
          
          spatialDryGainRef.current.gain.setTargetAtTime(1.0, currentTime, 0.05);
          spatialWetGainRef.current.gain.setTargetAtTime(0.60, currentTime, 0.05); 
          spatialLowpassRef.current.frequency.setTargetAtTime(safeFreq(18000), currentTime, 0.05);
          // КИНО БАС: Сваляме High-Pass на 60Hz. Оставяме LFE (суб-баса) да вибрира в стаята!
          spatialHighpassRef.current.frequency.setTargetAtTime(60, currentTime, 0.05); 
          // КИНО ТЕЖЕСТ: +2.5 dB на 80Hz
          spatialBassBoostRef.current.gain.setTargetAtTime(2.5, currentTime, 0.05);
          break;
      }

      if (oldConvolver && newBuffer) {
        spatialConvolverInputRef.current.disconnect(oldConvolver);
        oldConvolver.disconnect();
        
        const newConvolver = ctx.createConvolver();
        newConvolver.buffer = newBuffer;
        spatialConvolverInputRef.current.connect(newConvolver);
        newConvolver.connect(spatialWetGainRef.current);
        spatialConvolverRef.current = newConvolver;
      }

      setSpatialMode(mode);
    } catch (e) {
      console.error("Spatial transition error blocked:", e);
    }
  }, []);

  const applySpatialPreset = useCallback((preset: SpatialPreset) => {
    applySpatialMode(preset.mode);
    setCurrentSpatialPreset(preset.name);
  }, [applySpatialMode]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const setBandGain = useCallback((bandIndex: number, gain: number) => {
    if (equalizerBandsRef.current[bandIndex]) {
      equalizerBandsRef.current[bandIndex].gain.setTargetAtTime(gain, audioContextRef.current?.currentTime || 0, 0.05);
      
      setEqualizerGains((prev) => {
        const newGains = [...prev];
        newGains[bandIndex] = gain;
        
        if (gainNodeRef.current && audioContextRef.current) {
          const maxBoost = Math.max(0, ...newGains);
          const targetGain = 0.85 * Math.pow(10, - (maxBoost * 0.25) / 20);
          gainNodeRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, 0.1);
        }
        return newGains;
      });
    }
  }, []);

  const applyPreset = useCallback((preset: EqualizerPreset) => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(console.error);
    }
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
    currentSpatialPreset,
    applySpatialMode,
    applySpatialPreset,
    SPATIAL_PRESETS,
  };
}