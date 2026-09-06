import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { exportComposition } from '../../utils/export';

const presets = [
  { id: 'insta-sq', name: 'Instagram Carré (1:1)', w: 500, h: 500, outW: 1080, outH: 1080 },
  { id: 'insta-story', name: 'Story / Reel / TikTok (9:16)', w: 337, h: 600, outW: 1080, outH: 1920 },
  { id: 'yt-thumb', name: 'YouTube (16:9)', w: 640, h: 360, outW: 1280, outH: 720 },
  { id: 'banner', name: 'Bannière / Cover', w: 700, h: 260, outW: 1200, outH: 450 }
];

export const ExportControls: React.FC = () => {
  const {
    state,
    artboardRef,
    updateExportZone,
    setIsDrawingExportMode,
    selectElement,
    showSnackbar,
    setZoom
  } = useEditor();

  const { exportZone, isDrawingExportMode, selectedElementId, zoom } = state;
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleDrawMode = () => {
    const next = !isDrawingExportMode;
    setIsDrawingExportMode(next);
    if (next) {
      showSnackbar('Glissez sur le document pour tracer votre cadre', 'draw');
    }
  };

  const handleApplyPreset = (p: (typeof presets)[0]) => {
    const x = Math.max(0, Math.round((800 - p.w) / 2));
    const y = Math.max(0, Math.round((600 - p.h) / 2));
    const newRatio = p.w / p.h;
    updateExportZone({
      x,
      y,
      width: p.w,
      height: p.h,
      ratio: newRatio,
      targetWidth: p.outW,
      targetHeight: p.outH,
      preset: p.id
    });
    showSnackbar(`Preset appliqué : ${p.name}`);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newW = Math.max(50, parseInt(e.target.value, 10) || 100);
    const ratio = exportZone.ratio || 1;
    const newH = Math.round(newW / ratio);
    updateExportZone({
      targetWidth: newW,
      targetHeight: newH
    });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = Math.max(50, parseInt(e.target.value, 10) || 100);
    const ratio = exportZone.ratio || 1;
    const newW = Math.round(newH * ratio);
    updateExportZone({
      targetWidth: newW,
      targetHeight: newH
    });
  };

  const handleExport = async () => {
    if (!artboardRef.current || isExporting) return;

    setIsExporting(true);
    const currentSelection = selectedElementId;
    const currentZoom = zoom;
    selectElement(null);
    setZoom(1.0);

    // Short timeout to allow selection UI to unmount cleanly and zoom reset before screenshot
    await new Promise(res => setTimeout(res, 120));

    try {
      await exportComposition(artboardRef.current, exportZone);
      showSnackbar('Image exportée avec succès !', 'file_download_done');
    } catch (error) {
      console.error('Erreur export :', error);
      showSnackbar('Échec de l’exportation', 'error');
    } finally {
      setZoom(currentZoom);
      if (currentSelection) {
        selectElement(currentSelection);
      }
      setIsExporting(false);
    }
  };

  const currentRatioText = exportZone.ratio ? Math.round(exportZone.ratio * 100) / 100 : 1;

  return (
    <div className="space-y-6">
      {/* Bouton de tracé interactif */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Cliquer-Glisser sur le dessin
        </label>
        <button
          onClick={handleToggleDrawMode}
          className={`w-full py-3 px-4 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
            isDrawingExportMode
              ? 'border-m3-sys-primary bg-m3-sys-primary/10 text-m3-sys-primary'
              : 'border-m3-sys-outline hover:border-m3-sys-primary text-m3-sys-onSurface'
          }`}
        >
          <span className="material-symbols-rounded text-sm">gesture</span>
          <span>
            {isDrawingExportMode
              ? 'Glissez maintenant sur le canvas...'
              : 'Tracer un cadre au curseur'}
          </span>
        </button>
        <p className="text-[11px] text-m3-sys-onSurfaceVariant">
          Tracer une zone fige immédiatement son ratio personnalisé.
        </p>
      </div>

      {/* Préréglages */}
      <div className="space-y-2 pt-2 border-t border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
          Préréglages prédéfinis
        </label>
        <div className="space-y-1.5">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p)}
              className="w-full px-3 py-2 rounded-xl border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-left flex items-center justify-between text-xs font-medium transition-colors"
            >
              <span>{p.name}</span>
              <span className="text-m3-sys-outline font-mono">
                {p.outW} × {p.outH}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Résolution synchronisée */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
            Résolution finale figée
          </label>
          <span className="text-[11px] font-mono text-m3-sys-primary bg-m3-sys-primaryContainer px-2 py-0.5 rounded-full">
            Ratio : {currentRatioText}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-m3-sys-onSurfaceVariant">Largeur (px)</label>
            <input
              type="number"
              min="100"
              max="8000"
              step="1"
              value={Math.round(exportZone.targetWidth)}
              onChange={handleWidthChange}
              className="w-full p-2 bg-m3-sys-surfaceContainerHighest rounded-lg text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] text-m3-sys-onSurfaceVariant">Hauteur (px)</label>
            <input
              type="number"
              min="100"
              max="8000"
              step="1"
              value={Math.round(exportZone.targetHeight)}
              onChange={handleHeightChange}
              className="w-full p-2 bg-m3-sys-surfaceContainerHighest rounded-lg text-xs font-mono font-bold"
            />
          </div>
        </div>
        <p className="text-[10px] text-m3-sys-outline">
          Modifier l'un des deux champs recalcule automatiquement l'autre selon le ratio fixé.
        </p>
      </div>

      {/* Bouton de Téléchargement */}
      <div className="pt-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-4 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary font-medium text-sm shadow-m3-3 hover:brightness-105 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
        >
          {isExporting ? (
            <>
              <span className="material-symbols-rounded animate-spin">progress_activity</span>
              <span>Génération de l'image...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded">download</span>
              <span>Télécharger le rendu</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
