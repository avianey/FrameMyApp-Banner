import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { ShapeElementModel, ShapeType, FillType, GradientStop } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';
import { ImageUploadField } from '../common/ImageUploadField';
import { assetManager } from '../../utils/assetManager';
import { resolveAsset } from '../../utils/templateEngine';
import { LayerOrderControls } from './LayerOrderControls';
import { SceneAlignmentControls } from './SceneAlignmentControls';
import EffectsControls from './EffectsControls';

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
  const {
    updateElement,
    deleteElement,
    editingImageElementId,
    setEditingImageElementId,
    showSnackbar,
    recordHistory,
    persistAsset,
    state,
    loadedBundle
  } = useEditor();

  const handleUpdate = (updates: Partial<ShapeElementModel>) => {
    updateElement(element.id, updates);
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

      {/* Hiérarchie et ordre des calques */}
      <LayerOrderControls elementId={element.id} />

      {/* Alignement et collage sur la scène */}
      <SceneAlignmentControls elementId={element.id} />

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

      {/* Dégradé Linéaire avec gestion complète des stops */}
      {element.fillType === 'linear' && (() => {
        const stops: GradientStop[] = element.gradientStops && element.gradientStops.length > 0
          ? element.gradientStops
          : [
              { color: element.color1 || 'rgba(6, 182, 212, 0.9)', offset: 0 },
              { color: element.color2 || 'rgba(59, 130, 246, 0.9)', offset: 100 }
            ];

        const previewCss = [...stops]
          .sort((a, b) => a.offset - b.offset)
          .map(s => `${s.color} ${s.offset}%`)
          .join(', ');

        const handleStopColorChange = (index: number, newColor: string) => {
          const next = stops.map((s, i) => i === index ? { ...s, color: newColor } : s);
          handleUpdate({
            gradientStops: next,
            color1: next[0]?.color || element.color1,
            color2: next[next.length - 1]?.color || element.color2
          });
        };

        const handleStopOffsetChange = (index: number, newOffset: number) => {
          const next = stops.map((s, i) => i === index ? { ...s, offset: Math.max(0, Math.min(100, newOffset)) } : s);
          handleUpdate({ gradientStops: next });
        };

        const handleAddStop = () => {
          const sorted = [...stops].sort((a, b) => a.offset - b.offset);
          let newOffset = 50;
          if (sorted.length >= 2) {
            let maxGap = 0;
            let gapMid = 50;
            for (let i = 0; i < sorted.length - 1; i++) {
              const gap = sorted[i + 1].offset - sorted[i].offset;
              if (gap > maxGap) {
                maxGap = gap;
                gapMid = Math.round((sorted[i].offset + sorted[i + 1].offset) / 2);
              }
            }
            newOffset = gapMid;
          }
          const newColor = 'rgba(236, 72, 153, 0.9)';
          const next = [...stops, { color: newColor, offset: newOffset }].sort((a, b) => a.offset - b.offset);
          handleUpdate({
            gradientStops: next,
            color1: next[0]?.color || element.color1,
            color2: next[next.length - 1]?.color || element.color2
          });
        };

        const handleRemoveStop = (index: number) => {
          if (stops.length <= 2) return;
          const next = stops.filter((_, i) => i !== index);
          handleUpdate({
            gradientStops: next,
            color1: next[0]?.color || element.color1,
            color2: next[next.length - 1]?.color || element.color2
          });
        };

        return (
          <div className="space-y-4">
            {/* Barre de prévisualisation du dégradé */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider">
                  Nuancier ({stops.length} étapes)
                </label>
                <button
                  onClick={handleAddStop}
                  title="Ajouter une couleur intermédiaire au dégradé"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-m3-sys-primary text-m3-sys-onPrimary text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  <span>Ajouter une étape</span>
                </button>
              </div>
              <div
                className="h-7 w-full rounded-xl shadow-inner border border-m3-sys-outlineVariant/50 checkerboard-pattern overflow-hidden relative"
              >
                <div
                  className="w-full h-full rounded-xl"
                  style={{ background: `linear-gradient(to right, ${previewCss})` }}
                />
              </div>
            </div>

            {/* Liste ordonnée des étapes de couleur */}
            <div className="space-y-3 bg-m3-sys-surfaceContainerLow rounded-2xl p-3 border border-m3-sys-outlineVariant/30">
              {stops.map((stop, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-m3-sys-surfaceContainer rounded-xl border border-m3-sys-outlineVariant/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-5 h-5 rounded-full border border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: stop.color }}
                      />
                      <span className="text-xs font-bold text-m3-sys-onSurface">
                        Étape {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-mono text-m3-sys-primary font-bold">
                        {stop.offset}%
                      </span>
                      {stops.length > 2 && (
                        <button
                          onClick={() => handleRemoveStop(index)}
                          title="Supprimer cette couleur intermédiaire"
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-m3-sys-error/20 text-m3-sys-error transition-all cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Curseur de position (%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-m3-sys-outline">
                      <span>Position sur l'axe</span>
                      <span>{stop.offset}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={stop.offset}
                      onChange={e => handleStopOffsetChange(index, parseInt(e.target.value, 10))}
                      className="w-full accent-m3-sys-primary"
                    />
                  </div>

                  {/* Sélecteur de couleur avec alpha */}
                  <ColorAlphaPicker
                    label={`Couleur de l'étape ${index + 1}`}
                    value={stop.color}
                    onChange={rgba => handleStopColorChange(index, rgba)}
                  />
                </div>
              ))}
            </div>

            {/* Angle d'orientation du dégradé */}
            <div className="bg-m3-sys-surfaceContainer rounded-xl p-3 border border-m3-sys-outlineVariant/30">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-m3-sys-onSurface">Orientation du dégradé</span>
                <span className="font-mono text-m3-sys-primary font-bold">{element.angle}°</span>
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
        );
      })()}

      {/* Dégradé Radial avec gestion complète des stops */}
      {element.fillType === 'radial' && (() => {
        const stops: GradientStop[] = element.radialStops && element.radialStops.length > 0
          ? element.radialStops
          : [
              { color: element.radialColor1 || 'rgba(245, 158, 11, 1)', offset: 0 },
              { color: element.radialColor2 || 'rgba(220, 38, 38, 0.85)', offset: 100 }
            ];

        const previewCss = [...stops]
          .sort((a, b) => a.offset - b.offset)
          .map(s => `${s.color} ${s.offset}%`)
          .join(', ');

        const handleStopColorChange = (index: number, newColor: string) => {
          const next = stops.map((s, i) => i === index ? { ...s, color: newColor } : s);
          handleUpdate({
            radialStops: next,
            radialColor1: next[0]?.color || element.radialColor1,
            radialColor2: next[next.length - 1]?.color || element.radialColor2
          });
        };

        const handleStopOffsetChange = (index: number, newOffset: number) => {
          const next = stops.map((s, i) => i === index ? { ...s, offset: Math.max(0, Math.min(100, newOffset)) } : s);
          handleUpdate({ radialStops: next });
        };

        const handleAddStop = () => {
          const sorted = [...stops].sort((a, b) => a.offset - b.offset);
          let newOffset = 50;
          if (sorted.length >= 2) {
            let maxGap = 0;
            let gapMid = 50;
            for (let i = 0; i < sorted.length - 1; i++) {
              const gap = sorted[i + 1].offset - sorted[i].offset;
              if (gap > maxGap) {
                maxGap = gap;
                gapMid = Math.round((sorted[i].offset + sorted[i + 1].offset) / 2);
              }
            }
            newOffset = gapMid;
          }
          const newColor = 'rgba(147, 51, 234, 0.9)';
          const next = [...stops, { color: newColor, offset: newOffset }].sort((a, b) => a.offset - b.offset);
          handleUpdate({
            radialStops: next,
            radialColor1: next[0]?.color || element.radialColor1,
            radialColor2: next[next.length - 1]?.color || element.radialColor2
          });
        };

        const handleRemoveStop = (index: number) => {
          if (stops.length <= 2) return;
          const next = stops.filter((_, i) => i !== index);
          handleUpdate({
            radialStops: next,
            radialColor1: next[0]?.color || element.radialColor1,
            radialColor2: next[next.length - 1]?.color || element.radialColor2
          });
        };

        return (
          <div className="space-y-4">
            {/* Barre de prévisualisation du dégradé radial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider">
                  Nuancier radial ({stops.length} étapes)
                </label>
                <button
                  onClick={handleAddStop}
                  title="Ajouter une couleur intermédiaire au dégradé radial"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-m3-sys-primary text-m3-sys-onPrimary text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  <span>Ajouter une étape</span>
                </button>
              </div>
              <div
                className="h-7 w-full rounded-xl shadow-inner border border-m3-sys-outlineVariant/50 checkerboard-pattern overflow-hidden relative"
              >
                <div
                  className="w-full h-full rounded-xl"
                  style={{ background: `linear-gradient(to right, ${previewCss})` }}
                />
              </div>
            </div>

            {/* Liste des étapes */}
            <div className="space-y-3 bg-m3-sys-surfaceContainerLow rounded-2xl p-3 border border-m3-sys-outlineVariant/30">
              {stops.map((stop, index) => (
                <div
                  key={index}
                  className="p-2.5 bg-m3-sys-surfaceContainer rounded-xl border border-m3-sys-outlineVariant/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-5 h-5 rounded-full border border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: stop.color }}
                      />
                      <span className="text-xs font-bold text-m3-sys-onSurface">
                        {index === 0 ? 'Centre' : index === stops.length - 1 ? 'Extérieur' : `Étape ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-mono text-m3-sys-primary font-bold">
                        {stop.offset}%
                      </span>
                      {stops.length > 2 && (
                        <button
                          onClick={() => handleRemoveStop(index)}
                          title="Supprimer cette couleur intermédiaire"
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-m3-sys-error/20 text-m3-sys-error transition-all cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Curseur de position (%) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-m3-sys-outline">
                      <span>Rayon / Éloignement</span>
                      <span>{stop.offset}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={stop.offset}
                      onChange={e => handleStopOffsetChange(index, parseInt(e.target.value, 10))}
                      className="w-full accent-m3-sys-primary"
                    />
                  </div>

                  <ColorAlphaPicker
                    label={`Couleur de l'étape ${index + 1}`}
                    value={stop.color}
                    onChange={rgba => handleStopColorChange(index, rgba)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {element.fillType === 'image' && (
        <div className="space-y-3 bg-m3-sys-surfaceContainer p-3.5 rounded-2xl border border-m3-sys-outlineVariant/30">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
              <span className="material-symbols-rounded text-sm text-m3-sys-primary">image</span>
              <span>Texture de forme (Image)</span>
            </label>
          </div>

          {(() => {
            const displayImageUrl =
              (element.imageUrl ? assetManager.getDisplayUrl(element.imageUrl) : undefined) ||
              (element.imageUrl && loadedBundle?.assets ? resolveAsset(element.imageUrl, undefined, loadedBundle.assets) : undefined) ||
              element.imageUrl;

            return (
              <ImageUploadField
                imageUrl={displayImageUrl}
                onImageLoaded={async (result, file) => {
                  recordHistory();
                  let finalUrl = result;
                  if (file) {
                    const { displayUrl } = await persistAsset(file);
                    assetManager.registerUrlMapping(result, displayUrl);
                    finalUrl = displayUrl;
                  }
                  const img = new Image();
                  img.onload = () => {
                    handleUpdate({
                      imageUrl: finalUrl,
                      imageNaturalWidth: img.naturalWidth,
                      imageNaturalHeight: img.naturalHeight,
                      imageScale: 1.0,
                      imageOffsetX: 0,
                      imageOffsetY: 0
                    });
                    showSnackbar('Image appliquée sur la forme', 'image');
                  };
                  img.src = finalUrl;
                }}
                onDelete={() => {
                  recordHistory();
                  handleUpdate({ imageUrl: '', fillType: 'solid' });
                  showSnackbar('Image supprimée de la forme', 'delete');
                }}
                placeholder="Cliquez ou glissez une texture ici"
                previewHeight="h-28"
                objectFit={element.imageFit === 'contain' ? 'contain' : 'cover'}
              >
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingImageElementId(editingImageElementId === element.id ? null : element.id)}
                    className={`w-full py-1.5 px-3 rounded-xl border flex items-center justify-center space-x-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm ${
                      editingImageElementId === element.id
                        ? 'bg-indigo-500 text-white border-indigo-600'
                        : 'bg-m3-sys-surfaceContainerHighest hover:bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    <span className="material-symbols-rounded text-sm">crop</span>
                    <span>{editingImageElementId === element.id ? 'Terminer le recadrage' : "Ajuster / Déplacer l'image"}</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-m3-sys-onSurfaceVariant">
                      Zoom : {Math.round((element.imageScale || 1.0) * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdate({ imageOffsetX: 0, imageOffsetY: 0, imageScale: 1.0 })}
                      className="text-indigo-400 hover:underline cursor-pointer text-[10px]"
                    >
                      Recentrer
                    </button>
                  </div>

                  <p className="text-[10px] text-m3-sys-onSurfaceVariant/70 italic text-center">
                    Astuce : Double-cliquez sur la forme sur le canevas pour déplacer ou zoomer l'image.
                  </p>
                </div>
              </ImageUploadField>
            );
          })()}
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

      {/* Effets Visuels (Glow & Ombre Portée) */}
      <EffectsControls
        glow={element.glow}
        shadow={element.shadow}
        onChange={updates => handleUpdate(updates)}
        titleGlow="Effet de lueur (Glow)"
        titleShadow="Ombre de la forme"
        maxBlurGlow={60}
        maxBlurShadow={60}
        maxOffset={40}
      />

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
