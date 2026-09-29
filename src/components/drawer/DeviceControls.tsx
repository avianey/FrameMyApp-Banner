import React, { useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { DeviceElementModel, DeviceModelType } from '../../types';
import { ColorAlphaPicker } from '../common/ColorAlphaPicker';
import { LayerOrderControls } from './LayerOrderControls';
import { SceneAlignmentControls } from './SceneAlignmentControls';
import {
  getDeviceEffectiveDimensions,
  computeDeviceHeightFromWidth,
  computeDeviceWidthFromHeight
} from '../../utils/deviceHelper';

const deviceModels: {
  id: DeviceModelType;
  label: string;
  sublabel: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  borderRadius: number;
  screenPadding: number;
  bodyColor: string;
  buttonColor: string;
}[] = [
  {
    id: 'pixel-10',
    label: 'Pixel 10',
    sublabel: 'Google Pixel Flagship',
    icon: 'smartphone',
    defaultWidth: 260,
    defaultHeight: 565,
    borderRadius: 36,
    screenPadding: 10,
    bodyColor: '#1e2022',
    buttonColor: '#3a3f45'
  },
  {
    id: 'iphone-pro-max',
    label: 'iPhone Pro Max',
    sublabel: 'Apple Dynamic Island',
    icon: 'smartphone',
    defaultWidth: 265,
    defaultHeight: 570,
    borderRadius: 44,
    screenPadding: 10,
    bodyColor: '#1d1d1f',
    buttonColor: '#3a3835'
  },
  {
    id: 'samsung-galaxy',
    label: 'Samsung Galaxy',
    sublabel: 'Galaxy Infinity Screen',
    icon: 'smartphone',
    defaultWidth: 260,
    defaultHeight: 575,
    borderRadius: 22,
    screenPadding: 8,
    bodyColor: '#1a1c1e',
    buttonColor: '#33373b'
  },
  {
    id: 'pixel-tab',
    label: 'Pixel Tab',
    sublabel: 'Google Pixel Tablette',
    icon: 'tablet_android',
    defaultWidth: 500,
    defaultHeight: 325,
    borderRadius: 26,
    screenPadding: 16,
    bodyColor: '#2b2c2e',
    buttonColor: '#424448'
  }
];

interface DeviceControlsProps {
  element: DeviceElementModel;
}

export const DeviceControls: React.FC<DeviceControlsProps> = ({ element }) => {
  const { updateElement, deleteElement, showSnackbar } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseW = element.deviceType === 'pixel-tab' ? 500 : 260;
  const effectiveDims = getDeviceEffectiveDimensions(element);
  const {
    radiusPercent,
    bodyPercent,
    borderPercent,
    effectiveBorderRadius,
    effectiveBodyThickness,
    effectiveScreenBorderWidth
  } = effectiveDims;

  const handleUpdate = (updates: Partial<DeviceElementModel>) => {
    updateElement(element.id, updates);
  };

  // Ajustement automatique du ratio de l'écran en fonction de l'image
  const applyImageWithAspectRatio = (imageUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const newTotalH = computeDeviceHeightFromWidth(element.width, imgRatio, element);

      handleUpdate({
        screenImageUrl: imageUrl,
        imageAspectRatio: imgRatio,
        height: newTotalH
      });
      showSnackbar('Dimensions adaptées au ratio de l’image', 'aspect_ratio');
    };
    img.src = imageUrl;
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        if (result) {
          applyImageWithAspectRatio(result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleFitToCurrentScreenImage = () => {
    if (!element.screenImageUrl) return;
    if (element.imageAspectRatio) {
      const newTotalH = computeDeviceHeightFromWidth(element.width, element.imageAspectRatio, element);
      handleUpdate({ height: newTotalH });
      showSnackbar('Dimensions adaptées au ratio de l’image', 'aspect_ratio');
    } else {
      applyImageWithAspectRatio(element.screenImageUrl);
    }
  };

  const handleSelectModel = (model: typeof deviceModels[0]) => {
    const baseW = model.defaultWidth;
    const baseH = model.defaultHeight;
    const radiusPercent = (model.borderRadius / baseW) * 100;
    const bodyPercent = (10 / baseW) * 100;
    const borderPercent = (4 / baseW) * 100;

    let targetH = element.height;
    if (element.screenImageUrl && element.imageAspectRatio) {
      targetH = computeDeviceHeightFromWidth(element.width, element.imageAspectRatio, {
        ...element,
        deviceType: model.id,
        borderRadiusPercent: radiusPercent,
        bodyThicknessPercent: bodyPercent,
        screenBorderWidthPercent: borderPercent
      });
    } else if (!element.screenImageUrl) {
      targetH = baseH;
    }

    handleUpdate({
      deviceType: model.id,
      borderRadius: model.borderRadius,
      borderRadiusPercent: radiusPercent,
      screenPadding: model.screenPadding,
      bodyThicknessPercent: bodyPercent,
      screenBorderWidthPercent: borderPercent,
      bodyColor: model.bodyColor,
      buttonColor: model.buttonColor,
      ...(element.screenImageUrl ? { height: targetH } : { width: baseW, height: baseH })
    });
    showSnackbar(`Modèle changé : ${model.label}`, 'devices');
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
          placeholder="ex: app_screen, hero_mockup..."
          className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono font-medium focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
        />
        <p className="text-[11px] text-m3-sys-onSurfaceVariant/80 leading-tight">
          Image de capture surchargeable via <code className="text-m3-sys-primary font-mono text-[10px]">images.{element.customId || 'id'}</code> dans les variantes YAML.
        </p>
      </div>

      {/* Hiérarchie et ordre des calques */}
      <LayerOrderControls elementId={element.id} />

      {/* Alignement et collage sur la scène */}
      <SceneAlignmentControls elementId={element.id} />

      {/* Choix du modèle d'appareil */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
            Modèle d'appareil (Skin CSS)
          </label>
          <span className="text-[10px] font-mono text-m3-sys-primary">
            {deviceModels.find(m => m.id === element.deviceType)?.label || 'Pixel 10'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {deviceModels.map(m => {
            const isCurrent = element.deviceType === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectModel(m)}
                className={`p-3 rounded-2xl flex flex-col text-left border cursor-pointer active:scale-98 transition-all ${
                  isCurrent
                    ? 'border-m3-sys-primary bg-m3-sys-primaryContainer/25 shadow-sm'
                    : 'border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 w-full">
                  <span
                    className={`material-symbols-rounded text-xl ${
                      isCurrent ? 'text-m3-sys-primary' : 'text-m3-sys-onSurfaceVariant'
                    }`}
                  >
                    {m.icon}
                  </span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-m3-sys-primary" />
                  )}
                </div>
                <span className="text-xs font-bold text-m3-sys-onSurface leading-tight">
                  {m.label}
                </span>
                <span className="text-[10px] text-m3-sys-onSurfaceVariant/80 truncate mt-0.5">
                  {m.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Capture d'écran (Screen Image) & Ratio d'aspect */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
            <span className="material-symbols-rounded text-sm text-m3-sys-primary">screenshot</span>
            <span>Capture d'écran (Screen)</span>
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
        />

        {element.screenImageUrl ? (
          <div className="space-y-3">
            <div className="relative w-full h-28 rounded-xl overflow-hidden border border-m3-sys-outlineVariant/40 bg-black flex items-center justify-center">
              <img
                src={element.screenImageUrl}
                alt="Aperçu capture"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => handleUpdate({ screenImageUrl: '' })}
                title="Supprimer la capture"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-outlineVariant/30 text-xs font-medium transition-all text-center cursor-pointer flex items-center justify-center space-x-1"
              >
                <span className="material-symbols-rounded text-sm">upload</span>
                <span>Remplacer</span>
              </button>
              <button
                onClick={handleFitToCurrentScreenImage}
                title="Ajuster automatiquement la hauteur du device pour respecter le ratio exact de la capture"
                className="py-2 px-3 rounded-xl bg-m3-sys-primary/10 hover:bg-m3-sys-primary/20 text-m3-sys-primary text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center space-x-1"
              >
                <span className="material-symbols-rounded text-sm">aspect_ratio</span>
                <span>Adapter ratio</span>
              </button>
            </div>

            {/* Mode d'ajustement de l'image */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-medium text-m3-sys-onSurfaceVariant">
                <span>Cadrage de l'image</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-m3-sys-surfaceContainerHighest rounded-xl text-center">
                {(['cover', 'contain'] as ('cover' | 'contain')[]).map(fit => (
                  <button
                    key={fit}
                    onClick={() => handleUpdate({ screenFit: fit })}
                    className={`py-1 text-xs font-medium rounded-lg cursor-pointer transition-all ${
                      (element.screenFit || 'cover') === fit
                        ? 'bg-m3-sys-primary text-white shadow-sm'
                        : 'text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainer'
                    }`}
                  >
                    {fit === 'cover' ? 'Remplir (Cover)' : 'Ajuster (Contain)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-m3-sys-outlineVariant/60 hover:border-m3-sys-primary rounded-xl flex flex-col items-center justify-center space-y-1.5 text-m3-sys-onSurfaceVariant hover:text-m3-sys-primary hover:bg-m3-sys-primaryContainer/10 transition-all cursor-pointer"
            >
              <span className="material-symbols-rounded text-2xl">add_photo_alternate</span>
              <span className="text-xs font-medium">Charger une capture d'écran</span>
              <span className="text-[10px] text-m3-sys-outline">Le ratio d'aspect s'adaptera automatiquement</span>
            </button>
          </div>
        )}
      </div>

      {/* Couleur de la coque & Finition Métal Brossé */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Coque & Châssis
        </label>
        <ColorAlphaPicker
          label="Teinte du boîtier"
          value={element.bodyColor || '#1e2022'}
          onChange={rgba => handleUpdate({ bodyColor: rgba })}
        />

        {/* Nuanciers rapides de coques réalistes */}
        <div className="pt-2 border-t border-m3-sys-outlineVariant/20 space-y-1.5">
          <span className="text-[11px] font-medium text-m3-sys-onSurfaceVariant">Nuances réalistes :</span>
          <div className="flex items-center space-x-2">
            {[
              { color: '#1a1c1e', label: 'Obsidienne / Noir' },
              { color: '#383b40', label: 'Gris Sidéral / Titane' },
              { color: '#d8dadc', label: 'Argent / Porcelaine' },
              { color: '#e3d7bf', label: 'Or Titane' },
              { color: '#32423b', label: 'Vert Forêt' },
              { color: '#273444', label: 'Bleu Minuit' }
            ].map(preset => (
              <button
                key={preset.color}
                onClick={() => handleUpdate({ bodyColor: preset.color })}
                title={preset.label}
                className="w-6 h-6 rounded-full border-2 border-white/60 shadow-sm active:scale-90 transition-transform cursor-pointer"
                style={{ backgroundColor: preset.color }}
              />
            ))}
          </div>
        </div>

        {/* Option Métal Brossé (coché par défaut) */}
        <div className="pt-3 border-t border-m3-sys-outlineVariant/20 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-m3-sys-onSurface">Finition métal brossé</span>
            <p className="text-[11px] text-m3-sys-onSurfaceVariant">Texture de micro-rayures et reflets métalliques</p>
          </div>
          <input
            type="checkbox"
            checked={element.brushedMetal ?? true}
            onChange={e => handleUpdate({ brushedMetal: e.target.checked })}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {/* Épaisseur du boîtier (châssis proportionnel à la taille) */}
        <div className="pt-3 border-t border-m3-sys-outlineVariant/20 space-y-1">
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Épaisseur du boîtier (châssis)</span>
            <span className="font-mono text-m3-sys-primary font-semibold">
              {bodyPercent.toFixed(1)}% <span className="text-m3-sys-outline font-normal">({effectiveBodyThickness} px)</span>
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="15"
            step="0.1"
            value={bodyPercent}
            onChange={e => {
              const val = parseFloat(e.target.value);
              const pxAtBase = Math.max(1, Math.round((val / 100) * baseW));
              const updates: Partial<DeviceElementModel> = {
                bodyThicknessPercent: val,
                bodyThickness: pxAtBase
              };
              if (element.screenImageUrl && element.imageAspectRatio) {
                updates.height = computeDeviceHeightFromWidth(element.width, element.imageAspectRatio, {
                  ...element,
                  bodyThicknessPercent: val
                });
              }
              handleUpdate(updates);
            }}
            className="w-full accent-m3-sys-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-m3-sys-outline">
            <span>Ultra fin (0.5%)</span>
            <span>Standard (3.8%)</span>
            <span>Épais (15%)</span>
          </div>
        </div>
      </div>

      {/* Bordure d'écran (Bezel) & Géométrie */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Bordures d'Écran & Finitions
        </label>

        {/* Couleur de la bordure d'écran (distincte du boîtier, par défaut noire) */}
        <ColorAlphaPicker
          label="Couleur de bordure d'écran"
          value={element.screenBorderColor || '#000000'}
          onChange={rgba => handleUpdate({ screenBorderColor: rgba })}
        />

        {/* Épaisseur de la bordure d'écran proportionnelle à la taille */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Bordure d'écran (Bezel intérieur)</span>
            <span className="font-mono text-m3-sys-primary font-semibold">
              {borderPercent.toFixed(1)}% <span className="text-m3-sys-outline font-normal">({effectiveScreenBorderWidth} px)</span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={borderPercent}
            onChange={e => {
              const val = parseFloat(e.target.value);
              const pxAtBase = Math.round((val / 100) * baseW);
              const updates: Partial<DeviceElementModel> = {
                screenBorderWidthPercent: val,
                screenBorderWidth: pxAtBase,
                screenPadding: pxAtBase
              };
              if (element.screenImageUrl && element.imageAspectRatio) {
                updates.height = computeDeviceHeightFromWidth(element.width, element.imageAspectRatio, {
                  ...element,
                  screenBorderWidthPercent: val
                });
              }
              handleUpdate(updates);
            }}
            className="w-full accent-m3-sys-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-m3-sys-outline">
            <span>Sans bordure (0%)</span>
            <span>Fine (1.5%)</span>
            <span>Large (10%)</span>
          </div>
        </div>

        {/* Arrondi des coins (Border Radius proportionnel) */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Arrondi du boîtier</span>
            <span className="font-mono text-m3-sys-primary font-semibold">
              {radiusPercent.toFixed(1)}% <span className="text-m3-sys-outline font-normal">({effectiveBorderRadius} px)</span>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="0.1"
            value={radiusPercent}
            onChange={e => {
              const val = parseFloat(e.target.value);
              const pxAtBase = Math.round((val / 100) * baseW);
              handleUpdate({
                borderRadiusPercent: val,
                borderRadius: pxAtBase
              });
            }}
            className="w-full accent-m3-sys-primary cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-m3-sys-outline">
            <span>Carré (0%)</span>
            <span>Classique (14%)</span>
            <span>Très arrondi (25%)</span>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1">
            <span>Rotation de l'appareil</span>
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

      {/* Caméra Frontale & Boutons Physiques */}
      <div className="space-y-4 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        {/* Toggle Caméra frontale / Notch sans reflet */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-m3-sys-onSurface">Caméra frontale / Notch</span>
            <p className="text-[11px] text-m3-sys-onSurfaceVariant">
              Silhouette noire épurée (sans reflet ni lentille)
            </p>
          </div>
          <input
            type="checkbox"
            checked={element.showCamera ?? true}
            onChange={e => handleUpdate({ showCamera: e.target.checked })}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {/* Toggle Boutons physiques */}
        <div className="pt-3 border-t border-m3-sys-outlineVariant/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-m3-sys-onSurface">Boutons physiques</span>
              <p className="text-[11px] text-m3-sys-onSurfaceVariant">Power, volume et touches latérales</p>
            </div>
            <input
              type="checkbox"
              checked={element.showButtons ?? true}
              onChange={e => handleUpdate({ showButtons: e.target.checked })}
              className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
            />
          </div>

          {(element.showButtons ?? true) && (
            <ColorAlphaPicker
              label="Couleur des boutons"
              value={element.buttonColor || '#3a3f45'}
              onChange={rgba => handleUpdate({ buttonColor: rgba })}
            />
          )}
        </div>
      </div>

      {/* Barre de Navigation Système (Home Indicator) */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-m3-sys-onSurface">Trait de navigation système</span>
            <p className="text-[11px] text-m3-sys-onSurfaceVariant">Ligne de navigation tactile au bas de l'écran</p>
          </div>
          <input
            type="checkbox"
            checked={element.showHomeIndicator ?? true}
            onChange={e => handleUpdate({ showHomeIndicator: e.target.checked })}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {(element.showHomeIndicator ?? true) && (
          <div className="pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur du trait de navigation"
              value={element.homeIndicatorColor || 'rgba(255, 255, 255, 0.45)'}
              onChange={rgba => handleUpdate({ homeIndicatorColor: rgba })}
            />
          </div>
        )}
      </div>

      {/* Reflet de l'écran (Flare) */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-m3-sys-onSurface">Reflet d'écran (Flare)</span>
            <p className="text-[11px] text-m3-sys-onSurfaceVariant">Dégradé de lumière réaliste sur la dalle</p>
          </div>
          <input
            type="checkbox"
            checked={element.showFlare ?? true}
            onChange={e => handleUpdate({ showFlare: e.target.checked })}
            className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
          />
        </div>

        {(element.showFlare ?? true) && (
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <ColorAlphaPicker
              label="Couleur & opacité du reflet"
              value={element.flareColor || 'rgba(255, 255, 255, 0.15)'}
              onChange={rgba => handleUpdate({ flareColor: rgba })}
            />

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Orientation du reflet</span>
                <span>{element.flareAngle ?? 135}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={element.flareAngle ?? 135}
                onChange={e => handleUpdate({ flareAngle: parseInt(e.target.value, 10) })}
                className="w-full accent-m3-sys-primary"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span>Étendue du reflet</span>
                <span>{element.flareSpread ?? 50}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={element.flareSpread ?? 50}
                onChange={e => handleUpdate({ flareSpread: parseInt(e.target.value, 10) })}
                className="w-full accent-m3-sys-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Ombre portée du Device */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Ombre portée réaliste</span>
          <input
            type="checkbox"
            checked={element.shadow?.enable}
            onChange={e =>
              handleUpdate({
                shadow: {
                  ...(element.shadow || {
                    blur: 20,
                    x: 0,
                    y: 10,
                    color: 'rgba(0, 0, 0, 0.35)'
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
              label="Couleur d'ombre"
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
                max="80"
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
                  min="-60"
                  max="60"
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
                  min="-60"
                  max="60"
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

      {/* Dimensions manuelles */}
      <div className="bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
            Dimensions de l'appareil
          </label>
          {element.screenImageUrl && (
            <span className="text-[10px] text-m3-sys-primary font-medium flex items-center space-x-1 bg-m3-sys-primaryContainer/30 px-2 py-0.5 rounded-full">
              <span className="material-symbols-rounded text-xs">lock</span>
              <span>Ratio image verrouillé</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[11px] text-m3-sys-onSurfaceVariant">Largeur (px)</span>
            <input
              type="number"
              value={element.width}
              onChange={e => {
                const newW = Math.max(60, parseInt(e.target.value, 10) || 60);
                if (element.screenImageUrl && element.imageAspectRatio) {
                  const newH = computeDeviceHeightFromWidth(newW, element.imageAspectRatio, element);
                  handleUpdate({ width: newW, height: newH });
                } else {
                  handleUpdate({ width: newW });
                }
              }}
              className="w-full mt-1 px-3 py-1.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono font-medium focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
            />
          </div>
          <div>
            <span className="text-[11px] text-m3-sys-onSurfaceVariant">Hauteur (px)</span>
            <input
              type="number"
              value={element.height}
              onChange={e => {
                const newH = Math.max(60, parseInt(e.target.value, 10) || 60);
                if (element.screenImageUrl && element.imageAspectRatio) {
                  const newW = computeDeviceWidthFromHeight(newH, element.imageAspectRatio, element);
                  handleUpdate({ width: newW, height: newH });
                } else {
                  handleUpdate({ height: newH });
                }
              }}
              className="w-full mt-1 px-3 py-1.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono font-medium focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bouton Supprimer l'appareil */}
      <button
        onClick={() => deleteElement(element.id)}
        className="w-full py-3 rounded-full bg-m3-sys-error/10 text-m3-sys-error font-medium hover:bg-m3-sys-error/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
      >
        <span className="material-symbols-rounded text-sm leading-none">delete</span>
        <span>Supprimer l'appareil</span>
      </button>
    </div>
  );
};
