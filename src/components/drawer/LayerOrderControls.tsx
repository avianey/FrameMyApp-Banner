import React from 'react';
import { useEditor } from '../../context/EditorContext';

interface LayerOrderControlsProps {
  elementId: string;
}

export const LayerOrderControls: React.FC<LayerOrderControlsProps> = ({ elementId }) => {
  const {
    state,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    copyElements,
    duplicateSelectedElements,
    openCopyToModal,
    loadedBundle
  } = useEditor();
  const { elements } = state;

  const currentIndex = elements.findIndex(e => e.id === elementId);
  const totalLayers = elements.length;

  if (currentIndex === -1) {
    return null;
  }

  const isTop = currentIndex === totalLayers - 1;
  const isBottom = currentIndex === 0;
  const layerNumber = currentIndex + 1;

  return (
    <div className="space-y-2.5 bg-m3-sys-surfaceContainer rounded-2xl p-3.5 border border-m3-sys-outlineVariant/30">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
          <span className="material-symbols-rounded text-sm text-m3-sys-primary">layers</span>
          <span>Calque & Presse-papiers</span>
        </label>
        <span className="text-[11px] font-medium text-m3-sys-onSurfaceVariant bg-m3-sys-surfaceContainerHighest px-2 py-0.5 rounded-full border border-m3-sys-outlineVariant/40">
          Niveau {layerNumber} / {totalLayers}
        </span>
      </div>

      {/* Actions Copier / Dupliquer / Copier vers */}
      <div className={`grid ${loadedBundle ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
        <button
          type="button"
          onClick={() => copyElements([elementId])}
          title="Copier l'élément (Ctrl+C) pour le coller ici ou dans un autre master/override/variante"
          className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer transition-all"
        >
          <span className="material-symbols-rounded text-base">content_copy</span>
          <span className="text-[10px] mt-0.5 leading-tight">Copier</span>
        </button>

        <button
          type="button"
          onClick={duplicateSelectedElements}
          title="Dupliquer l'élément ici (Ctrl+D)"
          className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer transition-all"
        >
          <span className="material-symbols-rounded text-base">control_point_duplicate</span>
          <span className="text-[10px] mt-0.5 leading-tight">Dupliquer</span>
        </button>

        {loadedBundle && (
          <button
            type="button"
            onClick={() => openCopyToModal([elementId])}
            title="Copier vers un autre Master, Override ou Variante du bundle..."
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-primary/15 hover:bg-m3-sys-primary/25 text-m3-sys-primary active:scale-95 cursor-pointer transition-all"
          >
            <span className="material-symbols-rounded text-base">drive_file_move</span>
            <span className="text-[10px] mt-0.5 leading-tight">Copier vers…</span>
          </button>
        )}
      </div>

      {/* Contrôles d'ordre Z-index (si plusieurs calques) */}
      {totalLayers > 1 && (
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-m3-sys-outlineVariant/20">
          {/* Premier plan */}
          <button
            type="button"
            onClick={() => bringToFront(elementId)}
            disabled={isTop}
            title="Passer au premier plan (tout au-dessus)"
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
              isTop
                ? 'opacity-40 cursor-not-allowed bg-m3-sys-surfaceContainerLow text-m3-sys-onSurfaceVariant/50'
                : 'bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer shadow-none'
            }`}
          >
            <span className="material-symbols-rounded text-lg">vertical_align_top</span>
            <span className="text-[10px] mt-0.5 leading-tight">1er plan</span>
          </button>

          {/* Monter d'un niveau */}
          <button
            type="button"
            onClick={() => bringForward(elementId)}
            disabled={isTop}
            title="Monter d'un cran dans la pile"
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
              isTop
                ? 'opacity-40 cursor-not-allowed bg-m3-sys-surfaceContainerLow text-m3-sys-onSurfaceVariant/50'
                : 'bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer shadow-none'
            }`}
          >
            <span className="material-symbols-rounded text-lg">keyboard_arrow_up</span>
            <span className="text-[10px] mt-0.5 leading-tight">Monter</span>
          </button>

          {/* Descendre d'un niveau */}
          <button
            type="button"
            onClick={() => sendBackward(elementId)}
            disabled={isBottom}
            title="Descendre d'un cran dans la pile"
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
              isBottom
                ? 'opacity-40 cursor-not-allowed bg-m3-sys-surfaceContainerLow text-m3-sys-onSurfaceVariant/50'
                : 'bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer shadow-none'
            }`}
          >
            <span className="material-symbols-rounded text-lg">keyboard_arrow_down</span>
            <span className="text-[10px] mt-0.5 leading-tight">Descendre</span>
          </button>

          {/* Dernier plan / Arrière-plan */}
          <button
            type="button"
            onClick={() => sendToBack(elementId)}
            disabled={isBottom}
            title="Passer à l'arrière-plan (tout en-dessous)"
            className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
              isBottom
                ? 'opacity-40 cursor-not-allowed bg-m3-sys-surfaceContainerLow text-m3-sys-onSurfaceVariant/50'
                : 'bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 cursor-pointer shadow-none'
            }`}
          >
            <span className="material-symbols-rounded text-lg">vertical_align_bottom</span>
            <span className="text-[10px] mt-0.5 leading-tight">Arrière-plan</span>
          </button>
        </div>
      )}
    </div>
  );
};
