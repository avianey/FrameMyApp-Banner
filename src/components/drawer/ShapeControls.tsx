import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ShapeElementModel, ShapeType, FillType } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';

const shapesList: { id: ShapeType; label: string; icon: string }[] = [
  { id: 'rectangle', label: 'Rectangle', icon: 'rectangle' },
  { id: 'rounded-rect', label: 'Arrondi', icon: 'crop_square' },
  { id: 'circle', label: 'Cercle', icon: 'circle' },
  { id: 'pill', label: 'Pilule', icon: 'pill' },
  { id: 'star', label: 'Étoile', icon: 'star' },
  { id: 'hexagon', label: 'Hexagone', icon: 'hexagon' }
];

interface ShapeControlsProps {
  element: ShapeElementModel;
}

export const ShapeControls: React.FC<ShapeControlsProps> = ({ element }) => {
  const { updateElement, deleteElement } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = (updates: Partial<ShapeElementModel>) => {
    updateElement(element.id, updates);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          handleUpdate({ imageUrl: result });
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Identifiant personnalisé (customId) */}
      <div className="space-y-1.5 bg-m3-sys-surfaceContainer rounded-2xl p-3.5 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
            <span className="material-symbols-rounded text-sm text-m3-sys-primary">badge</span>
            <span>ID Personnalisé (customId)</span>
          </label>
          <span className="text-[10px] text-m3-sys-primary font-mono bg-m3-sys-primaryContainer/30 px-1.5 py-0.5 rounded">
            Template ID
          </span>
        </div>
        <input
          type="text"
          value={element.customId || ''}
          onChange={e => handleUpdate({ customId: e.target.value.trim() })}
          placeholder="ex: card_bg, hero_badge, cta_shape..."
          className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono font-medium focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
        />
        <p className="text-[11px] text-m3-sys-onSurfaceVariant/80 leading-tight">
          Surchargeable dans les templates YAML : <code className="text-m3-sys-primary font-mono text-[10px]">elements.{element.customId || 'id'}</code>
        </p>
      </div>

      {/* Choix de la forme */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Forme géométrique
        </label>
        <div className="grid grid-cols-3 gap-2">
          {shapesList.map(s => (
            <button
              key={s.id}
              onClick={() => handleUpdate({ shapeType: s.id })}
              className={`p-2 rounded-xl flex flex-col items-center justify-center border cursor-pointer active:scale-95 transition-all ${
                element.shapeType === s.id
                  ? 'border-m3-sys-primary bg-m3-sys-primaryContainer/30 text-m3-sys-primary'
                  : 'border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface'
              }`}
            >
              <span className="material-symbols-rounded text-lg mb-1 leading-none flex items-center justify-center">
                {s.icon}
              </span>
              <span className="text-[11px] font-medium">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Remplissage (Fill) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Remplissage (Fill)
        </label>
        <div className="grid grid-cols-5 gap-1 p-1 bg-m3-sys-surfaceContainerHighest rounded-full text-center">
          {(['none', 'solid', 'linear', 'radial', 'image'] as FillType[]).map(f => (
            <button
              key={f}
              onClick={() => handleUpdate({ fillType: f })}
              className={`py-1 text-[11px] font-medium rounded-full cursor-pointer transition-all ${
                element.fillType === f
                  ? 'bg-m3-sys-primary text-white shadow-sm'
                  : 'text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainer'
              }`}
            >
              {f === 'none' && 'Aucun'}
              {f === 'solid' && 'Uni'}
              {f === 'linear' && 'Linéaire'}
              {f === 'radial' && 'Radial'}
              {f === 'image' && 'Image'}
            </button>
          ))}
        </div>
      </div>

      {/* Options de couleur avec Alpha */}
      {element.fillType === 'solid' && (
        <div className="space-y-2">
          <ColorAlphaPicker
            label="Couleur de remplissage"
            value={element.solidColor}
            onChange={rgba => handleUpdate({ solidColor: rgba })}
          />
        </div>
      )}

      {element.fillType === 'linear' && (
        <div className="space-y-4">
          <ColorAlphaPicker
            label="Couleur 1"
            value={element.color1}
            onChange={rgba => handleUpdate({ color1: rgba })}
          />
          <ColorAlphaPicker
            label="Couleur 2"
            value={element.color2}
            onChange={rgba => handleUpdate({ color2: rgba })}
          />
          <div className="bg-m3-sys-surfaceContainer rounded-xl p-3 border border-m3-sys-outlineVariant/30">
            <div className="flex justify-between text-xs mb-1">
              <span>Angle du dégradé</span>
              <span>{element.angle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={element.angle}
              onChange={e => handleUpdate({ angle: parseInt(e.target.value, 10) })}
              className="w-full accent-m3-sys-primary"
            />
          </div>
        </div>
      )}

      {element.fillType === 'radial' && (
        <div className="space-y-4">
          <ColorAlphaPicker
            label="Couleur centrale"
            value={element.radialColor1}
            onChange={rgba => handleUpdate({ radialColor1: rgba })}
          />
          <ColorAlphaPicker
            label="Couleur extérieure"
            value={element.radialColor2}
            onChange={rgba => handleUpdate({ radialColor2: rgba })}
          />
        </div>
      )}

      {element.fillType === 'image' && (
        <div className="space-y-2 bg-m3-sys-surfaceContainer p-3 rounded-xl border border-m3-sys-outlineVariant/30 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-m3-sys-surfaceContainerHighest rounded-lg text-xs font-medium hover:bg-m3-sys-outlineVariant/30 transition-colors"
          >
            Sélectionner une image
          </button>
          {element.imageUrl && (
            <img
              src={element.imageUrl}
              alt="Shape texture"
              className="w-full h-20 object-cover rounded-lg mt-2"
            />
          )}
        </div>
      )}

      {/* Contour (Stroke) avec Alpha */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Contour (Stroke)</span>
          <input
            type="checkbox"
            checked={element.stroke?.enable}
            onChange={e =>
              handleUpdate({
                stroke: {
                  ...(element.stroke || { width: 2, color: 'rgba(255, 255, 255, 1)' }),
                  enable: e.target.checked
                }
              })
            }
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>
        {element.stroke?.enable && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur du contour"
              value={element.stroke.color}
              onChange={rgba =>
                handleUpdate({
                  stroke: { ...element.stroke, color: rgba }
                })
              }
            />
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Épaisseur du contour</span>
                <span>{element.stroke.width || 2}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={element.stroke.width || 2}
                onChange={e =>
                  handleUpdate({
                    stroke: { ...element.stroke, width: parseInt(e.target.value, 10) }
                  })
                }
                className="w-full accent-m3-sys-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ombre de la forme avec Alpha */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Ombre de la forme</span>
          <input
            type="checkbox"
            checked={element.shadow?.enable}
            onChange={e =>
              handleUpdate({
                shadow: {
                  ...(element.shadow || {
                    blur: 14,
                    x: 0,
                    y: 4,
                    color: 'rgba(0, 0, 0, 0.3)'
                  }),
                  enable: e.target.checked
                }
              })
            }
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>
        {element.shadow?.enable && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur d’ombre"
              value={element.shadow.color}
              onChange={rgba =>
                handleUpdate({
                  shadow: { ...element.shadow, color: rgba }
                })
              }
            />
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Rayon de flou</span>
                <span>{element.shadow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={element.shadow.blur}
                onChange={e =>
                  handleUpdate({
                    shadow: { ...element.shadow, blur: parseInt(e.target.value, 10) }
                  })
                }
                className="w-full accent-m3-sys-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage X ({element.shadow.x}px)
                </label>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="1"
                  value={element.shadow.x}
                  onChange={e =>
                    handleUpdate({
                      shadow: { ...element.shadow, x: parseInt(e.target.value, 10) }
                    })
                  }
                  className="w-full accent-m3-sys-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Décalage Y ({element.shadow.y}px)
                </label>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="1"
                  value={element.shadow.y}
                  onChange={e =>
                    handleUpdate({
                      shadow: { ...element.shadow, y: parseInt(e.target.value, 10) }
                    })
                  }
                  className="w-full accent-m3-sys-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opacité globale, Rotation & Arrondi */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Opacité globale</span>
            <span>{Math.round(element.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={element.opacity}
            onChange={e => handleUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-m3-sys-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Rotation</span>
            <span>{element.rotation || 0}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={element.rotation || 0}
            onChange={e => handleUpdate({ rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-m3-sys-primary"
          />
        </div>

        {element.shapeType === 'rounded-rect' && (
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span>Rayon d'arrondi</span>
              <span>{element.borderRadius ?? 16}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={element.borderRadius ?? 16}
              onChange={e => handleUpdate({ borderRadius: parseInt(e.target.value, 10) })}
              className="w-full accent-m3-sys-primary"
            />
          </div>
        )}
      </div>

      {/* Bouton Supprimer */}
      <button
        onClick={() => deleteElement(element.id)}
        className="w-full py-3 rounded-full bg-m3-sys-error/10 text-m3-sys-error font-medium hover:bg-m3-sys-error/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
      >
        <span className="material-symbols-rounded text-sm leading-none">delete</span>
        <span>Supprimer la forme</span>
      </button>
    </div>
  );
};
