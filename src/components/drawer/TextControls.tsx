import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { TextElementModel } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';

const fonts = [
  'Roboto',
  'Inter',
  'Poppins',
  'Montserrat',
  'Playfair Display',
  'Space Grotesk',
  'Oswald',
  'Pacifico',
  'Lobster',
  'Dancing Script',
  'Caveat',
  'Cinzel'
];

interface TextControlsProps {
  element: TextElementModel;
}

export const TextControls: React.FC<TextControlsProps> = ({ element }) => {
  const { updateElement, deleteElement } = useEditor();

  const handleUpdate = (updates: Partial<TextElementModel>) => {
    updateElement(element.id, updates);
  };

  return (
    <div className="space-y-6">
      {/* Choix Police Google Fonts */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Police Google Font
        </label>
        <select
          value={element.fontFamily}
          onChange={e => handleUpdate({ fontFamily: e.target.value })}
          className="w-full p-2.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-medium"
        >
          {fonts.map(f => (
            <option key={f} value={f} style={{ fontFamily: `'${f}'` }}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Couleur du texte avec Alpha */}
      <ColorAlphaPicker
        label="Couleur du texte (Alpha)"
        value={element.color}
        onChange={rgba => handleUpdate({ color: rgba })}
      />

      {/* Taille & Rotation */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Taille du texte</span>
            <span>{element.fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="140"
            step="1"
            value={element.fontSize}
            onChange={e => handleUpdate({ fontSize: parseInt(e.target.value, 10) })}
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
      </div>

      {/* Espacement & Lignes */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Espacement des lettres</span>
            <span>{element.letterSpacing}px</span>
          </div>
          <input
            type="range"
            min="-2"
            max="24"
            step="1"
            value={element.letterSpacing}
            onChange={e => handleUpdate({ letterSpacing: parseInt(e.target.value, 10) })}
            className="w-full accent-m3-sys-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Lignes Minimales</span>
            <span>{element.minLines}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={element.minLines}
            onChange={e => handleUpdate({ minLines: parseInt(e.target.value, 10) })}
            className="w-full accent-m3-sys-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Interligne</span>
            <span>{element.lineHeight}</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.4"
            step="0.1"
            value={element.lineHeight}
            onChange={e => handleUpdate({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-m3-sys-primary"
          />
        </div>
      </div>

      {/* Lueur (Glow) avec Alpha */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Effet de Lueur (Glow)</span>
          <input
            type="checkbox"
            checked={element.glow?.enable}
            onChange={e =>
              handleUpdate({
                glow: { ...element.glow, enable: e.target.checked }
              })
            }
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>
        {element.glow?.enable && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur de lueur"
              value={element.glow.color}
              onChange={rgba =>
                handleUpdate({
                  glow: { ...element.glow, color: rgba }
                })
              }
            />
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Rayon de lueur</span>
                <span>{element.glow.blur}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="60"
                step="1"
                value={element.glow.blur}
                onChange={e =>
                  handleUpdate({
                    glow: { ...element.glow, blur: parseInt(e.target.value, 10) }
                  })
                }
                className="w-full accent-m3-sys-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ombre portée avec Alpha */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Ombre portée</span>
          <input
            type="checkbox"
            checked={element.shadow?.enable}
            onChange={e =>
              handleUpdate({
                shadow: { ...element.shadow, enable: e.target.checked }
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
              <div className="flex justify-between text-xs mb-1">
                <span>Flou d’ombre</span>
                <span>{element.shadow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
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
                  min="-30"
                  max="30"
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
                  min="-30"
                  max="30"
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

      {/* Bouton Supprimer */}
      <button
        onClick={() => deleteElement(element.id)}
        className="w-full py-3 rounded-full bg-m3-sys-error/10 text-m3-sys-error font-medium hover:bg-m3-sys-error/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
      >
        <span className="material-symbols-rounded text-sm leading-none">delete</span>
        <span>Supprimer le texte</span>
      </button>
    </div>
  );
};
