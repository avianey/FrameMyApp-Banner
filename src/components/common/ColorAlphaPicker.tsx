import React from 'react';
import { ColorUtil } from '../../utils/color';

interface ColorAlphaPickerProps {
  label: string;
  value: string;
  onChange: (rgba: string) => void;
}

export const ColorAlphaPicker: React.FC<ColorAlphaPickerProps> = ({ label, value, onChange }) => {
  const parsed = ColorUtil.parse(value);
  const alphaPct = Math.round(parsed.a * 100);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newHex = e.target.value;
    const rgba = ColorUtil.fromHexAndAlpha(newHex, parsed.a);
    onChange(rgba);
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newA = parseInt(e.target.value, 10) / 100;
    const rgba = ColorUtil.fromHexAndAlpha(parsed.hex, newA);
    onChange(rgba);
  };

  return (
    <div className="space-y-1.5 bg-m3-sys-surfaceContainer rounded-2xl p-3 border border-m3-sys-outlineVariant/30">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span className="font-medium text-m3-sys-onSurface">{label}</span>
        <span className="font-mono text-[10px] text-m3-sys-onSurfaceVariant uppercase font-bold">
          {value}
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-m3-sys-outlineVariant shadow-inner checkerboard-pattern flex-shrink-0 cursor-pointer">
          <div className="w-full h-full" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={parsed.hex}
            onChange={handleColorChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-[11px] text-m3-sys-onSurfaceVariant">
            <span>Opacité (Alpha)</span>
            <span className="font-medium font-mono">{alphaPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={alphaPct}
            onChange={handleAlphaChange}
            className="w-full accent-m3-sys-primary"
          />
        </div>
      </div>
    </div>
  );
};
