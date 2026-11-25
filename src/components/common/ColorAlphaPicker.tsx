import React, { useState } from 'react';
import { ColorUtil } from '../../utils/color';

interface ColorAlphaPickerProps {
  label: string;
  value: string;
  onChange: (rgba: string) => void;
}

export const ColorAlphaPicker: React.FC<ColorAlphaPickerProps> = ({ label, value, onChange }) => {
  const parsed = ColorUtil.parse(value);
  const hex8 = ColorUtil.toHex8String(parsed.r, parsed.g, parsed.b, parsed.a);
  const alphaPct = Math.round(parsed.a * 100);

  const [prevHex8, setPrevHex8] = useState<string>(hex8);
  const [textValue, setTextValue] = useState<string>(hex8);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastEmittedHex8, setLastEmittedHex8] = useState<string | null>(null);

  // Sync immediately during render whenever `value` changes externally (e.g. selection switch, undo/redo)
  // avoiding the post-paint useEffect lag that could let a stale onBlur write back an old color.
  // Pure React state (no ref mutation during render) keeps this safe under React.StrictMode double-rendering.
  if (hex8 !== prevHex8) {
    setPrevHex8(hex8);
    if (hex8 !== lastEmittedHex8) {
      setTextValue(hex8);
      setIsDirty(false);
    }
    setLastEmittedHex8(null);
  }

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newHex = e.target.value;
    const rgba = ColorUtil.fromHexAndAlpha(newHex, parsed.a);
    const newParsed = ColorUtil.parse(rgba);
    const newHex8 = ColorUtil.toHex8String(newParsed.r, newParsed.g, newParsed.b, newParsed.a);
    setTextValue(newHex8);
    setIsDirty(false);
    if (newHex8 !== hex8) {
      setLastEmittedHex8(newHex8);
      onChange(rgba);
    }
  };

  const handleAlphaSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newA = parseInt(e.target.value, 10) / 100;
    const rgba = ColorUtil.fromHexAndAlpha(parsed.hex, newA);
    const newParsed = ColorUtil.parse(rgba);
    const newHex8 = ColorUtil.toHex8String(newParsed.r, newParsed.g, newParsed.b, newParsed.a);
    setTextValue(newHex8);
    setIsDirty(false);
    if (newHex8 !== hex8) {
      setLastEmittedHex8(newHex8);
      onChange(rgba);
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextValue(val);
    setIsDirty(true);

    // Only emit live updates on complete 6- or 8-digit hex codes (#RRGGBB / #RRGGBBAA)
    // so typing a full hex code doesn't trigger 3/4-digit shorthand expansion mid-typing.
    if (ColorUtil.isFullHex(val)) {
      const p = ColorUtil.parse(val);
      const formatted = ColorUtil.toHex8String(p.r, p.g, p.b, p.a);
      if (formatted !== hex8) {
        setLastEmittedHex8(formatted);
        onChange(ColorUtil.toRgbaString(p.r, p.g, p.b, p.a));
      }
    }
  };

  const handleTextBlur = () => {
    const wasDirty = isDirty;
    setIsDirty(false);

    if (wasDirty && ColorUtil.isValidHex(textValue)) {
      const p = ColorUtil.parse(textValue);
      const formatted = ColorUtil.toHex8String(p.r, p.g, p.b, p.a);
      setTextValue(formatted);
      if (formatted !== hex8) {
        setLastEmittedHex8(formatted);
        onChange(ColorUtil.toRgbaString(p.r, p.g, p.b, p.a));
      }
    } else {
      setTextValue(hex8);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="space-y-2 bg-m3-sys-surfaceContainer rounded-2xl p-3 border border-m3-sys-outlineVariant/30 shadow-sm transition-colors">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-medium text-m3-sys-onSurface truncate">{label}</span>
        <div className="relative flex items-center">
          <input
            type="text"
            value={textValue}
            onChange={handleTextInputChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            title="Modifier la valeur hexadécimale avec alpha (#RRGGBBAA)"
            placeholder="#FFFFFFFF"
            maxLength={9}
            className="w-24 px-2 py-1 bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface font-mono text-[11px] font-bold rounded-lg border border-m3-sys-outlineVariant/50 focus:border-m3-sys-primary focus:ring-1 focus:ring-m3-sys-primary outline-none uppercase text-center cursor-text transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Color preview swatch + native color picker overlay */}
        <div
          title="Choisir une couleur"
          className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-m3-sys-outlineVariant/60 hover:border-m3-sys-primary shadow-sm checkerboard-pattern flex-shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
        >
          <div className="w-full h-full" style={{ backgroundColor: value }} />
          <input
            type="color"
            value={parsed.hex}
            onChange={handleColorPickerChange}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </div>

        {/* Alpha slider and percentage */}
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-[11px] text-m3-sys-onSurfaceVariant">
            <span className="font-medium">Opacité (Alpha)</span>
            <span className="font-semibold font-mono text-m3-sys-onSurface">{alphaPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={alphaPct}
            onChange={handleAlphaSliderChange}
            className="w-full accent-m3-sys-primary cursor-pointer h-2 bg-m3-sys-surfaceContainerHighest rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default ColorAlphaPicker;
