import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BackgroundType } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';
import { ImageUploadField } from '../common/ImageUploadField';
import { assetManager } from '../../utils/assetManager';
import { resolveAsset } from '../../utils/templateEngine';

interface CanvasPreset {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  icon: string;
}

const canvasPresets: CanvasPreset[] = [
  { id: 'play-screenshot', name: 'Google Play Screenshot (9:16)', description: 'Capture d’écran smartphone', width: 1080, height: 1920, icon: 'smartphone' },
  { id: 'play-banner', name: 'Google Play Bannière', description: 'Graphique de promotion officiel', width: 1024, height: 500, icon: 'shop' },
  { id: 'hd-16-9', name: 'YouTube / Écran HD (16:9)', description: 'Vignette & Présentation', width: 1920, height: 1080, icon: 'tv' },
  { id: 'web-banner', name: 'Bannière Web / OpenGraph', description: 'Partage Facebook & LinkedIn', width: 1200, height: 630, icon: 'web' },
  { id: 'insta-sq', name: 'Format Carré (1:1)', description: 'Post Instagram & réseaux', width: 1080, height: 1080, icon: 'crop_square' },
  { id: 'insta-story', name: 'Story / Reels / TikTok (9:16)', description: 'Vertical plein écran', width: 1080, height: 1920, icon: 'stay_current_portrait' },
  { id: 'twitter-hdr', name: 'En-tête Twitter / X (3:1)', description: 'Bannière de profil', width: 1500, height: 500, icon: 'view_compact' },
  { id: 'default-studio', name: 'Standard Studio', description: 'Format par défaut', width: 800, height: 600, icon: 'aspect_ratio' }
];

export const BackgroundControls: React.FC = () => {
  const {
    state,
    setBackground,
    applyBackgroundImage,
    setCanvasDimensions,
    updateExportZone,
    showSnackbar,
    editingImageElementId,
    setEditingImageElementId,
    loadedBundle
  } = useEditor();

  const { background, canvasWidth = 800, canvasHeight = 600 } = state;

  // État local des chaînes pour la saisie libre sans forcer de clamp à chaque touche
  const [widthStr, setWidthStr] = useState<string>(String(canvasWidth));
  const [heightStr, setHeightStr] = useState<string>(String(canvasHeight));
  const [isFocusedWidth, setIsFocusedWidth] = useState<boolean>(false);
  const [isFocusedHeight, setIsFocusedHeight] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocusedWidth) {
      setWidthStr(String(canvasWidth));
    }
  }, [canvasWidth, isFocusedWidth]);

  useEffect(() => {
    if (!isFocusedHeight) {
      setHeightStr(String(canvasHeight));
    }
  }, [canvasHeight, isFocusedHeight]);

  const handleBlurWidth = () => {
    setIsFocusedWidth(false);
    const parsed = parseInt(widthStr, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 8000) {
      setCanvasDimensions(parsed, canvasHeight);
    } else {
      setWidthStr(String(canvasWidth));
    }
  };

  const handleBlurHeight = () => {
    setIsFocusedHeight(false);
    const parsed = parseInt(heightStr, 10);
    if (!isNaN(parsed) && parsed >= 100 && parsed <= 8000) {
      setCanvasDimensions(canvasWidth, parsed);
    } else {
      setHeightStr(String(canvasHeight));
    }
  };

  const handleApplyPreset = (p: CanvasPreset) => {
    setCanvasDimensions(p.width, p.height);
    setWidthStr(String(p.width));
    setHeightStr(String(p.height));
    showSnackbar(`Dimensions de la scène : ${p.name} (${p.width} × ${p.height} px)`, 'aspect_ratio');
  };

  const handleSyncExportZoneToCanvas = () => {
    updateExportZone({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      targetWidth: canvasWidth,
      targetHeight: canvasHeight,
      ratio: canvasWidth / canvasHeight,
      preset: 'custom'
    });
    showSnackbar(`Cadre d'export ajusté à la scène (${canvasWidth} × ${canvasHeight} px)`, 'fit_screen');
  };

  const handleTypeChange = (type: BackgroundType) => {
    setBackground({ type });
  };

  return (
    <div className="space-y-6">
      {/* 1. Dimensions de la Scène (Canvas) */}
      <div className="space-y-3 pb-5 border-b border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider flex items-center space-x-1.5">
            <span className="material-symbols-rounded text-sm text-m3-sys-primary">aspect_ratio</span>
            <span>Dimensions de la scène</span>
          </label>
          <span className="text-[10px] font-mono text-m3-sys-outline">
            {canvasWidth} × {canvasHeight} px
          </span>
        </div>

        {/* Champs manuels Largeur & Hauteur */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] text-m3-sys-onSurfaceVariant font-medium flex items-center justify-between">
              <span>Largeur</span>
              <span className="text-[10px] text-m3-sys-outline">px</span>
            </label>
            <input
              type="number"
              min="100"
              max="8000"
              value={widthStr}
              onFocus={() => setIsFocusedWidth(true)}
              onChange={e => setWidthStr(e.target.value)}
              onBlur={handleBlurWidth}
              onKeyDown={e => e.key === 'Enter' && handleBlurWidth()}
              className="w-full px-3 py-1.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/40 text-xs font-mono text-m3-sys-onSurface focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-m3-sys-onSurfaceVariant font-medium flex items-center justify-between">
              <span>Hauteur</span>
              <span className="text-[10px] text-m3-sys-outline">px</span>
            </label>
            <input
              type="number"
              min="100"
              max="8000"
              value={heightStr}
              onFocus={() => setIsFocusedHeight(true)}
              onChange={e => setHeightStr(e.target.value)}
              onBlur={handleBlurHeight}
              onKeyDown={e => e.key === 'Enter' && handleBlurHeight()}
              className="w-full px-3 py-1.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/40 text-xs font-mono text-m3-sys-onSurface focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Bouton pour caler le cadre d'export sur la scène */}
        <button
          onClick={handleSyncExportZoneToCanvas}
          title="Ajuster la zone d'exportation pour qu'elle recouvre exactement l'intégralité de la scène"
          className="w-full py-1.5 px-3 rounded-xl bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-primary text-[11px] font-semibold border border-m3-sys-outlineVariant/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm active:scale-98"
        >
          <span className="material-symbols-rounded text-sm">fit_screen</span>
          <span>Adapter le cadre d'export à la scène</span>
        </button>

        {/* Presets Cards pour la scène */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-medium text-m3-sys-onSurfaceVariant flex items-center justify-between">
            <span>Préréglages standards</span>
            <span className="text-[10px] text-m3-sys-outline">Formats populaires</span>
          </label>

          <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar pr-0.5">
            {canvasPresets.map(p => {
              const isSelected = canvasWidth === p.width && canvasHeight === p.height;
              return (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'border-m3-sys-primary bg-m3-sys-primaryContainer/30 text-m3-sys-onSurface font-bold shadow-sm'
                      : 'border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="material-symbols-rounded text-base text-m3-sys-primary flex-shrink-0">
                      {p.icon}
                    </span>
                    <div className="truncate">
                      <div className="truncate leading-tight">{p.name}</div>
                      <div className="text-[10px] text-m3-sys-onSurfaceVariant font-normal truncate">
                        {p.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-m3-sys-outline font-mono flex-shrink-0 ml-2">
                    {p.width} × {p.height}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Type de fond */}
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

          {(() => {
            const displayBgUrl =
              (background.imageUrl ? assetManager.getDisplayUrl(background.imageUrl) : undefined) ||
              (background.imageUrl && loadedBundle?.assets ? resolveAsset(background.imageUrl, undefined, loadedBundle.assets) : undefined) ||
              background.imageUrl;

            return (
              <ImageUploadField
                imageUrl={displayBgUrl}
                onImageLoaded={(result, file) => applyBackgroundImage(result, file)}
                onDelete={() => setBackground({ imageUrl: '', type: 'solid' })}
                objectFit={background.imageFit === 'contain' ? 'contain' : 'cover'}
              >
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

              {/* Bouton de recadrage interactif */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => setEditingImageElementId(editingImageElementId === 'background' ? null : 'background')}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all cursor-pointer shadow-sm ${
                    editingImageElementId === 'background'
                      ? 'bg-indigo-500 text-white border-indigo-600'
                      : 'bg-m3-sys-surfaceContainerHighest hover:bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  }`}
                >
                  <span className="material-symbols-rounded text-base">crop</span>
                  <span>{editingImageElementId === 'background' ? 'Terminer le recadrage' : 'Ajuster / Déplacer l\'image'}</span>
                </button>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-m3-sys-onSurfaceVariant">
                    Zoom de l'image : {Math.round((background.imageScale || 1.0) * 100)}%
                  </span>
                  <button
                    onClick={() => setBackground({ imageOffsetX: 0, imageOffsetY: 0, imageScale: 1.0 })}
                    title="Réinitialiser le centrage et le zoom de l'image"
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Recentrer
                  </button>
                </div>

                <p className="text-[10px] text-m3-sys-onSurfaceVariant/70 italic text-center">
                  Astuce : Double-cliquez directement sur la scène pour déplacer ou zoomer l'image.
                </p>
              </div>

              {/* Options de flou et de couleur de premier plan */}
              <div className="pt-3 border-t border-m3-sys-outlineVariant/30 space-y-4">
                {/* Option Flou de l'image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(background.imageBlurEnable)}
                        onChange={e => {
                          const enable = e.target.checked;
                          setBackground({
                            imageBlurEnable: enable,
                            imageBlur: enable ? (background.imageBlur ?? 1) : background.imageBlur
                          });
                        }}
                        className="w-4 h-4 rounded text-m3-sys-primary focus:ring-m3-sys-primary accent-m3-sys-primary cursor-pointer"
                      />
                      <span>Flouter l'image</span>
                    </label>
                    {background.imageBlurEnable && (
                      <span className="text-[11px] font-mono font-bold text-m3-sys-primary bg-m3-sys-primaryContainer px-2 py-0.5 rounded-full">
                        {background.imageBlur ?? 1} px
                      </span>
                    )}
                  </div>

                  {background.imageBlurEnable && (
                    <div className="bg-m3-sys-surfaceContainerHighest p-3 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs text-m3-sys-onSurfaceVariant">
                        <span>Intensité du flou</span>
                        <span className="font-mono font-bold">{background.imageBlur ?? 1} px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={background.imageBlur ?? 1}
                        onChange={e => setBackground({ imageBlur: parseInt(e.target.value, 10) || 1 })}
                        className="w-full accent-m3-sys-primary cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-m3-sys-outline font-mono">
                        <span>1 px</span>
                        <span>25 px</span>
                        <span>50 px</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Option Couleur de Foreground (Voile de couleur) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(background.imageOverlayEnable)}
                        onChange={e => {
                          const enable = e.target.checked;
                          setBackground({
                            imageOverlayEnable: enable,
                            imageOverlayColor: background.imageOverlayColor || '#FFFFFF11'
                          });
                        }}
                        className="w-4 h-4 rounded text-m3-sys-primary focus:ring-m3-sys-primary accent-m3-sys-primary cursor-pointer"
                      />
                      <span>Couleur de premier plan (Foreground)</span>
                    </label>
                    {background.imageOverlayEnable && (
                      <div
                        className="w-4 h-4 rounded-full border border-m3-sys-outlineVariant shadow-sm flex-shrink-0"
                        style={{ backgroundColor: background.imageOverlayColor || '#FFFFFF11' }}
                      />
                    )}
                  </div>

                  {background.imageOverlayEnable && (
                    <div className="bg-m3-sys-surfaceContainerHighest p-3 rounded-xl space-y-2">
                      <ColorAlphaPicker
                        label="Couleur de premier plan"
                        value={background.imageOverlayColor || '#FFFFFF11'}
                        onChange={rgba => setBackground({ imageOverlayColor: rgba })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </ImageUploadField>
          );
        })()}
      </div>
    )}
  </div>
);
};
