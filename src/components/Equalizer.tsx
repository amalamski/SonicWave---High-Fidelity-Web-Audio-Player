import { EqualizerPreset } from '@/types/music';

interface EqualizerProps {
  gains: number[];
  frequencies: number[];
  presets: EqualizerPreset[];
  currentPreset: string;
  onGainChange: (bandIndex: number, gain: number) => void;
  onPresetChange: (preset: EqualizerPreset) => void;
}

function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${freq / 1000}k`;
  }
  return freq.toString();
}

export function Equalizer({
  gains,
  frequencies,
  presets,
  currentPreset,
  onGainChange,
  onPresetChange,
}: EqualizerProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Equalizer</h3>
        <select
          value={currentPreset}
          onChange={(e) => {
            const preset = presets.find((p) => p.name === e.target.value);
            if (preset) onPresetChange(preset);
          }}
          className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {presets.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end justify-between gap-2 h-48">
        {frequencies.map((freq, index) => (
          <div key={freq} className="flex flex-col items-center gap-2 flex-1">
            <div className="relative h-40 w-full flex justify-center">
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={gains[index]}
                onChange={(e) => onGainChange(index, Number(e.target.value))}
                className="absolute w-40 appearance-none bg-transparent cursor-pointer equalizer-slider"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center center',
                }}
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-gray-400">
                {gains[index] > 0 ? `+${gains[index]}` : gains[index]}
              </div>
            </div>
            <span className="text-xs text-gray-400">{formatFrequency(freq)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
