import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BackgroundType } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';

export const BackgroundControls: React.FC = () => {
  const { state, setBackground } = useEditor();
  const { background } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: BackgroundType) => {
    setBackground({ type });
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          setBackground({ type: 'image', imageUrl: result });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Type de fond */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider">
          Type de fond
        </label>
        <div className="grid grid-cols-4 gap-1 p-1 bg-m3-sys-surfaceContainerHighest rounded-full">
          {(['solid', 'linear', 'radial', 'image'] as BackgroundType[]).map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`py-1.5 text-xs font-medium rounded-full transition-all ${
                background.type === t
                  ? 'bg-m3-sys-primary text-white shadow-sm'
                  : 'text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainer'
              }`}
            >
              {t === 'solid' && 'Uni'}
              {t === 'linear' && 'Linéaire'}
              {t === 'radial' && 'Radial'}
              {t === 'image' && 'Image'}
            </button>
          ))}
        </div>
      </div>

      {/* Solid */}
      {background.type === 'solid' && (
        <div className="space-y-3">
          <ColorAlphaPicker
            label="Couleur unie (avec Alpha)"
            value={background.solidColor}
            onChange={rgba => setBackground({ solidColor: rgba })}
          />
        </div>
      )}

      {/* Linear */}
      {background.type === 'linear' && (
        <div className="space-y-4">
          <ColorAlphaPicker
            label="Couleur de départ"
            value={background.color1}
            onChange={rgba => setBackground({ color1: rgba })}
          />
          <ColorAlphaPicker
            label="Couleur d’arrivée"
            value={background.color2}
            onChange={rgba => setBackground({ color2: rgba })}
          />

          <div className="bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span>Orientation du dégradé</span>
              <span>{background.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={background.angle}
              onChange={e => setBackground({ angle: parseInt(e.target.value, 10) })}
              className="w-full accent-m3-sys-primary"
            />
          </div>
        </div>
      )}

      {/* Radial */}
      {background.type === 'radial' && (
        <div className="space-y-4">
          <ColorAlphaPicker
            label="Couleur centrale"
            value={background.radialColor1}
            onChange={rgba => setBackground({ radialColor1: rgba })}
          />
          <ColorAlphaPicker
            label="Couleur extérieure"
            value={background.radialColor2}
            onChange={rgba => setBackground({ radialColor2: rgba })}
          />
        </div>
      )}

      {/* Image */}
      {background.type === 'image' && (
        <div className="space-y-4 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
          <label className="text-sm font-medium">Image de fond</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-m3-sys-outlineVariant hover:border-m3-sys-primary rounded-xl p-5 text-center cursor-pointer transition-colors"
          >
            <span className="material-symbols-rounded text-3xl text-m3-sys-primary mb-1">
              cloud_upload
            </span>
            <p className="text-xs text-m3-sys-onSurfaceVariant">Cliquez ou glissez une image ici</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFile}
              className="hidden"
            />
          </div>

          {background.imageUrl && (
            <div className="relative rounded-xl overflow-hidden h-32 border border-m3-sys-outlineVariant">
              <img src={background.imageUrl} alt="Background" className="w-full h-full object-cover" />
              <button
                onClick={() => setBackground({ imageUrl: '' })}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow hover:bg-red-700 transition-colors"
              >
                <span className="material-symbols-rounded text-sm">delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
