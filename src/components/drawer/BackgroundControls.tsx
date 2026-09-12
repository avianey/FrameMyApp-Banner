import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BackgroundType } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';

export const BackgroundControls: React.FC = () => {
  const { state, setBackground, applyBackgroundImage } = useEditor();
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
          applyBackgroundImage(result);
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
              className={`py-1.5 text-xs font-medium rounded-full cursor-pointer transition-all ${
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Image de fond</label>
            {background.imageUrl && (
              <span className="text-[10px] font-mono font-bold text-m3-sys-primary bg-m3-sys-primaryContainer px-2 py-0.5 rounded-full">
                {state.canvasWidth} × {state.canvasHeight} px
              </span>
            )}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              const files = e.dataTransfer.files;
              if (files && files[0] && files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = ev => {
                  const result = ev.target?.result as string;
                  if (result) {
                    applyBackgroundImage(result);
                  }
                };
                reader.readAsDataURL(files[0]);
              }
            }}
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
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden h-32 border border-m3-sys-outlineVariant">
                <img
                  src={background.imageUrl}
                  alt="Background"
                  className={`w-full h-full ${background.imageFit === 'contain' ? 'object-contain bg-black/10' : 'object-cover'}`}
                />
                <button
                  onClick={() => setBackground({ imageUrl: '', type: 'solid' })}
                  title="Supprimer l'image"
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full shadow hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm leading-none">delete</span>
                </button>
              </div>

              {/* Options de remplissage */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
                  Mode d'ajustement
                </label>
                <div className="grid grid-cols-2 gap-1 bg-m3-sys-surfaceContainerHighest p-1 rounded-xl">
                  <button
                    onClick={() => setBackground({ imageFit: 'cover' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      background.imageFit !== 'contain'
                        ? 'bg-m3-sys-primary text-white shadow-sm font-bold'
                        : 'text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainer'
                    }`}
                  >
                    Remplir (100%)
                  </button>
                  <button
                    onClick={() => setBackground({ imageFit: 'contain' })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      background.imageFit === 'contain'
                        ? 'bg-m3-sys-primary text-white shadow-sm font-bold'
                        : 'text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainer'
                    }`}
                  >
                    Ajuster (Contenir)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
