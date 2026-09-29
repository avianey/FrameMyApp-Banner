import React from 'react';
import { GlowConfig, ShadowConfig } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';

interface EffectsControlsProps {
  glow?: GlowConfig;
  shadow?: ShadowConfig;
  onChange: (updates: { glow?: GlowConfig; shadow?: ShadowConfig }) => void;
  titleGlow?: string;
  titleShadow?: string;
  maxBlurGlow?: number;
  maxBlurShadow?: number;
  maxOffset?: number;
}

const DEFAULT_GLOW: GlowConfig = {
  enable: true,
  color: 'rgba(56, 189, 248, 0.75)',
  blur: 16,
  x: 0,
  y: 0
};

const DEFAULT_SHADOW: ShadowConfig = {
  enable: true,
  color: 'rgba(0, 0, 0, 0.3)',
  blur: 16,
  x: 0,
  y: 6
};

export default function EffectsControls({
  glow,
  shadow,
  onChange,
  titleGlow = 'Effet de lueur (Glow)',
  titleShadow = 'Ombre portée',
  maxBlurGlow = 60,
  maxBlurShadow = 60,
  maxOffset = 40
}: EffectsControlsProps) {
  const currentGlow = glow || { ...DEFAULT_GLOW, enable: false };
  const currentShadow = shadow || { ...DEFAULT_SHADOW, enable: false };

  const handleGlowToggle = (checked: boolean) => {
    onChange({
      glow: {
        ...(glow || DEFAULT_GLOW),
        enable: checked
      }
    });
  };

  const handleGlowUpdate = (partial: Partial<GlowConfig>) => {
    onChange({
      glow: {
        ...currentGlow,
        ...partial
      }
    });
  };

  const handleShadowToggle = (checked: boolean) => {
    onChange({
      shadow: {
        ...(shadow || DEFAULT_SHADOW),
        enable: checked
      }
    });
  };

  const handleShadowUpdate = (partial: Partial<ShadowConfig>) => {
    onChange({
      shadow: {
        ...currentShadow,
        ...partial
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* ================= EFFET DE LUEUR (GLOW) ================= */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{titleGlow}</span>
          <input
            type="checkbox"
            checked={!!currentGlow.enable}
            onChange={e => handleGlowToggle(e.target.checked)}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {currentGlow.enable && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur de lueur"
              value={currentGlow.color}
              onChange={rgba => handleGlowUpdate({ color: rgba })}
            />

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Rayon de lueur</span>
                <span>{currentGlow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxBlurGlow}
                step="1"
                value={currentGlow.blur}
                onChange={e => handleGlowUpdate({ blur: parseInt(e.target.value, 10) || 0 })}
                className="w-full accent-m3-sys-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage X ({currentGlow.x}px)
                </label>
                <input
                  type="range"
                  min={-maxOffset}
                  max={maxOffset}
                  step="1"
                  value={currentGlow.x}
                  onChange={e => handleGlowUpdate({ x: parseInt(e.target.value, 10) || 0 })}
                  className="w-full accent-m3-sys-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage Y ({currentGlow.y}px)
                </label>
                <input
                  type="range"
                  min={-maxOffset}
                  max={maxOffset}
                  step="1"
                  value={currentGlow.y}
                  onChange={e => handleGlowUpdate({ y: parseInt(e.target.value, 10) || 0 })}
                  className="w-full accent-m3-sys-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= OMBRE PORTÉE (SHADOW) ================= */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{titleShadow}</span>
          <input
            type="checkbox"
            checked={!!currentShadow.enable}
            onChange={e => handleShadowToggle(e.target.checked)}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {currentShadow.enable && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur d’ombre"
              value={currentShadow.color}
              onChange={rgba => handleShadowUpdate({ color: rgba })}
            />

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Rayon de flou</span>
                <span>{currentShadow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxBlurShadow}
                step="1"
                value={currentShadow.blur}
                onChange={e => handleShadowUpdate({ blur: parseInt(e.target.value, 10) || 0 })}
                className="w-full accent-m3-sys-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage X ({currentShadow.x}px)
                </label>
                <input
                  type="range"
                  min={-maxOffset}
                  max={maxOffset}
                  step="1"
                  value={currentShadow.x}
                  onChange={e => handleShadowUpdate({ x: parseInt(e.target.value, 10) || 0 })}
                  className="w-full accent-m3-sys-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage Y ({currentShadow.y}px)
                </label>
                <input
                  type="range"
                  min={-maxOffset}
                  max={maxOffset}
                  step="1"
                  value={currentShadow.y}
                  onChange={e => handleShadowUpdate({ y: parseInt(e.target.value, 10) || 0 })}
                  className="w-full accent-m3-sys-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
