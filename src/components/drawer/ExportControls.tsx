import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { exportComposition } from '../../utils/export';

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  w: number;
  h: number;
  outW: number;
  outH: number;
  icon: string;
}

const presets: ExportPreset[] = [
  { id: 'insta-sq', name: 'Instagram Carré', description: '1:1 (Post feed)', w: 500, h: 500, outW: 1080, outH: 1080, icon: 'crop_square' },
  { id: 'insta-story', name: 'Story / Reels / TikTok', description: '9:16 (Vertical plein écran)', w: 337, h: 600, outW: 1080, outH: 1920, icon: 'stay_current_portrait' },
  { id: 'yt-thumb', name: 'YouTube / Écran HD', description: '16:9 (Vignette & Présentation)', w: 640, h: 360, outW: 1920, outH: 1080, icon: 'tv' },
  { id: 'banner', name: 'Bannière Web / OpenGraph', description: '1.91:1 (Partage Facebook & LinkedIn)', w: 700, h: 366, outW: 1200, outH: 630, icon: 'web' },
  { id: 'twitter-hdr', name: 'En-tête Twitter / X', description: '3:1 (Bannière profil)', w: 720, h: 240, outW: 1500, outH: 500, icon: 'view_compact' },
  { id: 'uhd-4k', name: 'Format 4K Ultra HD', description: '16:9 (Très haute définition)', w: 640, h: 360, outW: 3840, outH: 2160, icon: 'high_density' }
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

  const {
    exportZone,
    isDrawingExportMode,
    selectedElementId,
    zoom,
    canvasWidth = 800,
    canvasHeight = 600
  } = state;
  const [isExporting, setIsExporting] = useState(false);

  // État local des chaînes pour permettre la saisie libre sans forcer de clamp à chaque touche
  const [widthStr, setWidthStr] = useState<string>(String(Math.round(exportZone.targetWidth)));
  const [heightStr, setHeightStr] = useState<string>(String(Math.round(exportZone.targetHeight)));
  const [isFocusedWidth, setIsFocusedWidth] = useState<boolean>(false);
  const [isFocusedHeight, setIsFocusedHeight] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocusedWidth) {
      setWidthStr(String(Math.round(exportZone.targetWidth)));
    }
  }, [exportZone.targetWidth, isFocusedWidth]);

  useEffect(() => {
    if (!isFocusedHeight) {
      setHeightStr(String(Math.round(exportZone.targetHeight)));
    }
  }, [exportZone.targetHeight, isFocusedHeight]);

  const isLocked = exportZone.lockRatio !== false;

  const handleToggleDrawMode = () => {
    const next = !isDrawingExportMode;
    setIsDrawingExportMode(next);
    if (next) {
      showSnackbar('Glissez sur le canevas pour tracer votre zone de cadrage', 'draw');
    }
  };

  const handleToggleLockRatio = () => {
    const nextLock = !isLocked;
    updateExportZone({ lockRatio: nextLock });
    showSnackbar(
      nextLock
        ? 'Proportions verrouillées (ratio conservé lors du redimensionnement)'
        : 'Proportions déverrouillées (dimensions libres)',
      nextLock ? 'lock' : 'lock_open'
    );
  };

  const handleApplyPreset = (p: ExportPreset) => {
    const w = Math.min(canvasWidth, p.w);
    const h = Math.min(canvasHeight, p.h);
    const x = Math.max(0, Math.round((canvasWidth - w) / 2));
    const y = Math.max(0, Math.round((canvasHeight - h) / 2));
    const newRatio = p.outW / p.outH;
    updateExportZone({
      x,
      y,
      width: w,
      height: h,
      ratio: newRatio,
      targetWidth: p.outW,
      targetHeight: p.outH,
      preset: p.id,
      lockRatio: true
    });
    showSnackbar(`Preset appliqué : ${p.name} (${p.outW} × ${p.outH} px)`);
  };

  // Application d'une valeur de largeur validée
  const commitWidth = (val: number) => {
    const clampedW = Math.max(50, Math.min(10000, val));
    if (isLocked) {
      const ratio = exportZone.ratio || (exportZone.targetWidth / exportZone.targetHeight) || 1;
      const newH = Math.max(50, Math.min(10000, Math.round(clampedW / ratio)));
      updateExportZone({
        targetWidth: clampedW,
        targetHeight: newH
      });
    } else {
      const currentH = exportZone.targetHeight || 900;
      const newRatio = clampedW / currentH;

      let canvasW = exportZone.width;
      let canvasH = Math.round(canvasW / newRatio);
      if (canvasH > canvasHeight) {
        canvasH = canvasHeight;
        canvasW = Math.round(canvasH * newRatio);
      }
      if (canvasW > canvasWidth) {
        canvasW = canvasWidth;
        canvasH = Math.round(canvasW / newRatio);
      }
      const x = Math.max(0, Math.min(canvasWidth - canvasW, exportZone.x));
      const y = Math.max(0, Math.min(canvasHeight - canvasH, exportZone.y));

      updateExportZone({
        targetWidth: clampedW,
        ratio: newRatio,
        width: canvasW,
        height: canvasH,
        x,
        y,
        preset: 'custom'
      });
    }
  };

  // Application d'une valeur de hauteur validée
  const commitHeight = (val: number) => {
    const clampedH = Math.max(50, Math.min(10000, val));
    if (isLocked) {
      const ratio = exportZone.ratio || (exportZone.targetWidth / exportZone.targetHeight) || 1;
      const newW = Math.max(50, Math.min(10000, Math.round(clampedH * ratio)));
      updateExportZone({
        targetWidth: newW,
        targetHeight: clampedH
      });
    } else {
      const currentW = exportZone.targetWidth || 1200;
      const newRatio = currentW / clampedH;

      let canvasW = exportZone.width;
      let canvasH = Math.round(canvasW / newRatio);
      if (canvasH > canvasHeight) {
        canvasH = canvasHeight;
        canvasW = Math.round(canvasH * newRatio);
      }
      if (canvasW > canvasWidth) {
        canvasW = canvasWidth;
        canvasH = Math.round(canvasW / newRatio);
      }
      const x = Math.max(0, Math.min(canvasWidth - canvasW, exportZone.x));
      const y = Math.max(0, Math.min(canvasHeight - canvasH, exportZone.y));

      updateExportZone({
        targetHeight: clampedH,
        ratio: newRatio,
        width: canvasW,
        height: canvasH,
        x,
        y,
        preset: 'custom'
      });
    }
  };

  // Gestionnaires de saisie libre sans écraser pendant la frappe
  const handleWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setWidthStr(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 10000) {
      commitWidth(parsed);
    }
  };

  const handleWidthBlur = () => {
    setIsFocusedWidth(false);
    const parsed = parseInt(widthStr, 10);
    if (isNaN(parsed) || parsed < 50) {
      commitWidth(50);
      setWidthStr('50');
    } else if (parsed > 10000) {
      commitWidth(10000);
      setWidthStr('10000');
    } else {
      commitWidth(parsed);
      setWidthStr(String(parsed));
    }
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setHeightStr(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed >= 50 && parsed <= 10000) {
      commitHeight(parsed);
    }
  };

  const handleHeightBlur = () => {
    setIsFocusedHeight(false);
    const parsed = parseInt(heightStr, 10);
    if (isNaN(parsed) || parsed < 50) {
      commitHeight(50);
      setHeightStr('50');
    } else if (parsed > 10000) {
      commitHeight(10000);
      setHeightStr('10000');
    } else {
      commitHeight(parsed);
      setHeightStr(String(parsed));
    }
  };

  const handleHeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Inversion d'orientation (Paysage ↔ Portrait)
  const handleSwapOrientation = () => {
    const oldW = exportZone.targetWidth;
    const oldH = exportZone.targetHeight;
    const newRatio = oldH / oldW;

    let newCanvasW = exportZone.height;
    let newCanvasH = exportZone.width;
    if (newCanvasW > canvasWidth) {
      newCanvasW = canvasWidth;
      newCanvasH = Math.round(newCanvasW / newRatio);
    }
    if (newCanvasH > canvasHeight) {
      newCanvasH = canvasHeight;
      newCanvasW = Math.round(newCanvasH * newRatio);
    }

    const x = Math.max(0, Math.round((canvasWidth - newCanvasW) / 2));
    const y = Math.max(0, Math.round((canvasHeight - newCanvasH) / 2));

    updateExportZone({
      targetWidth: oldH,
      targetHeight: oldW,
      ratio: newRatio,
      width: newCanvasW,
      height: newCanvasH,
      x,
      y,
      preset: 'custom'
    });
    showSnackbar('Orientation inversée (Paysage ↔ Portrait)', 'screen_rotation');
  };

  // Centrer la zone d'export sur le canevas
  const handleCenterInCanvas = () => {
    const x = Math.max(0, Math.round((canvasWidth - exportZone.width) / 2));
    const y = Math.max(0, Math.round((canvasHeight - exportZone.height) / 2));
    updateExportZone({ x, y });
    showSnackbar('Zone de cadrage centrée sur le plan de travail', 'filter_center_focus');
  };

  // Couvrir tout le canevas
  const handleFullCanvas = () => {
    const ratio = canvasWidth / canvasHeight;
    updateExportZone({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      ratio,
      targetWidth: isLocked ? Math.round(exportZone.targetHeight * ratio) : exportZone.targetWidth,
      preset: 'full'
    });
    showSnackbar('Cadrage ajusté à la totalité de la composition', 'fullscreen');
  };

  // Rendu textuel élégant du ratio
  const formatRatio = (r: number): string => {
    if (Math.abs(r - 16 / 9) < 0.03) return '16:9';
    if (Math.abs(r - 9 / 16) < 0.03) return '9:16';
    if (Math.abs(r - 1) < 0.03) return '1:1';
    if (Math.abs(r - 4 / 3) < 0.03) return '4:3';
    if (Math.abs(r - 3 / 2) < 0.03) return '3:2';
    if (Math.abs(r - 3) < 0.05) return '3:1';
    if (Math.abs(r - 1200 / 630) < 0.04) return '1.91:1';
    return `${Math.round(r * 100) / 100}:1`;
  };

  const handleExport = async () => {
    if (!artboardRef.current || isExporting) return;

    setIsExporting(true);
    const currentSelection = selectedElementId;
    const currentZoom = zoom;
    selectElement(null);
    setZoom(1.0);

    // Court délai pour permettre à l'UI de désélectionner avant capture
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

  const currentRatio = exportZone.ratio || (exportZone.targetWidth / exportZone.targetHeight) || 1;

  return (
    <div className="space-y-6 select-none">
      {/* 1. Résolution Cible Réelle & Dimensions Custom */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="material-symbols-rounded text-base text-m3-sys-primary">photo_size_select_large</span>
            <label className="text-xs font-bold text-m3-sys-onSurface uppercase tracking-wider">
              Résolution Cible Réelle
            </label>
          </div>
          <span className="text-[10px] font-mono font-bold text-m3-sys-onPrimaryContainer bg-m3-sys-primaryContainer px-2 py-0.5 rounded-full">
            Ratio {formatRatio(currentRatio)}
          </span>
        </div>

        {/* Champs de saisie Largeur / Hauteur */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-m3-sys-onSurfaceVariant flex items-center justify-between">
              <span>Largeur (px)</span>
              <span className="text-[9px] text-m3-sys-outline font-mono">W</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="50"
                max="10000"
                step="10"
                value={widthStr}
                onFocus={() => setIsFocusedWidth(true)}
                onChange={handleWidthInputChange}
                onBlur={handleWidthBlur}
                onKeyDown={handleWidthKeyDown}
                className="w-full p-2 pr-7 bg-m3-sys-surfaceContainerHighest rounded-xl text-xs font-mono font-bold text-m3-sys-onSurface border border-m3-sys-outlineVariant/40 focus:outline-none focus:ring-2 focus:ring-m3-sys-primary"
              />
              <span className="absolute right-2 text-[10px] text-m3-sys-outline font-mono pointer-events-none">
                px
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-m3-sys-onSurfaceVariant flex items-center justify-between">
              <span>Hauteur (px)</span>
              <span className="text-[9px] text-m3-sys-outline font-mono">H</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="50"
                max="10000"
                step="10"
                value={heightStr}
                onFocus={() => setIsFocusedHeight(true)}
                onChange={handleHeightInputChange}
                onBlur={handleHeightBlur}
                onKeyDown={handleHeightKeyDown}
                className="w-full p-2 pr-7 bg-m3-sys-surfaceContainerHighest rounded-xl text-xs font-mono font-bold text-m3-sys-onSurface border border-m3-sys-outlineVariant/40 focus:outline-none focus:ring-2 focus:ring-m3-sys-primary"
              />
              <span className="absolute right-2 text-[10px] text-m3-sys-outline font-mono pointer-events-none">
                px
              </span>
            </div>
          </div>
        </div>

        {/* Verrouillage du ratio & permutation */}
        <div className="pt-2 border-t border-m3-sys-outlineVariant/20 flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isLocked}
              onChange={handleToggleLockRatio}
              className="w-4 h-4 rounded border-m3-sys-outline text-m3-sys-primary focus:ring-m3-sys-primary cursor-pointer"
            />
            <span className="text-xs text-m3-sys-onSurface font-medium group-hover:text-m3-sys-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">
                {isLocked ? 'lock' : 'lock_open'}
              </span>
              <span>Conserver les proportions</span>
            </span>
          </label>

          <button
            onClick={handleSwapOrientation}
            title="Inverser largeur et hauteur (Paysage ↔ Portrait)"
            className="px-2.5 py-1 rounded-lg bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-[11px] font-semibold text-m3-sys-onSurface flex items-center space-x-1 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">screen_rotation</span>
            <span>Permuter</span>
          </button>
        </div>

        <p className="text-[10px] text-m3-sys-onSurfaceVariant leading-tight">
          {isLocked
            ? '🔒 Ratio figé : ajuster une valeur recalcule automatiquement la seconde.'
            : '🔓 Dimensions libres : saisissez librement la largeur et la hauteur de sortie souhaitée.'}
        </p>
      </div>

      {/* 2. Cadrage sur le Plan de Travail (Canvas) */}
      <div className="space-y-3 bg-m3-sys-surfaceContainerLow rounded-2xl p-3.5 border border-m3-sys-outlineVariant/20">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-rounded text-base">crop</span>
            <span>Cadre sur le Canevas</span>
          </label>
          <span className="text-[10px] font-mono text-m3-sys-outline">
            {Math.round(exportZone.width)} × {Math.round(exportZone.height)} px
          </span>
        </div>

        {/* Boutons d'ajustement rapide */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCenterInCanvas}
            className="py-1.5 px-2.5 rounded-xl border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-xs font-medium text-m3-sys-onSurface flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">filter_center_focus</span>
            <span>Centrer le cadre</span>
          </button>
          <button
            onClick={handleFullCanvas}
            className="py-1.5 px-2.5 rounded-xl border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest text-xs font-medium text-m3-sys-onSurface flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-sm">fullscreen</span>
            <span>Plein canevas</span>
          </button>
        </div>

        {/* Tracé au curseur */}
        <button
          onClick={handleToggleDrawMode}
          className={`w-full py-2.5 px-3 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isDrawingExportMode
              ? 'border-m3-sys-primary bg-m3-sys-primary/10 text-m3-sys-primary animate-pulse'
              : 'border-m3-sys-outline/60 hover:border-m3-sys-primary text-m3-sys-onSurface'
          }`}
        >
          <span className="material-symbols-rounded text-sm">gesture</span>
          <span>
            {isDrawingExportMode
              ? 'Glissez sur le canevas...'
              : 'Tracer un cadre au curseur'}
          </span>
        </button>
      </div>

      {/* 3. Préréglages Prédéfinis */}
      <div className="space-y-2 pt-2 border-t border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase tracking-wider flex items-center justify-between">
          <span>Préréglages Formats Sociaux</span>
          <span className="text-[10px] text-m3-sys-outline font-normal">Presets HD</span>
        </label>
        <div className="space-y-1.5">
          {presets.map(p => {
            const isSelected = exportZone.preset === p.id;
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
                  {p.outW} × {p.outH}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Bouton de Téléchargement Direct */}
      <div className="pt-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-3.5 px-4 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary font-bold text-xs sm:text-sm shadow-m3-2 hover:shadow-m3-3 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
        >
          {isExporting ? (
            <>
              <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
              <span>Génération HD en cours...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-lg">download</span>
              <span>Télécharger le rendu ({Math.round(exportZone.targetWidth)} × {Math.round(exportZone.targetHeight)} px)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
