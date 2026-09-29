import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { AlignType } from '../../utils/alignment';

interface SceneAlignmentControlsProps {
  elementId: string;
}

export const SceneAlignmentControls: React.FC<SceneAlignmentControlsProps> = ({ elementId }) => {
  const { state, alignElementToCanvas } = useEditor();
  const { selectedElementIds, elements } = state;

  // Afficher ces contrôles uniquement si un seul élément est sélectionné
  if (selectedElementIds.length > 1) {
    return null;
  }

  const currentElement = elements.find(e => e.id === elementId);
  if (!currentElement) {
    return null;
  }

  const handleAlign = (type: AlignType | 'center-both') => {
    alignElementToCanvas(elementId, type);
  };

  return (
    <div className="space-y-2.5 bg-m3-sys-surfaceContainer rounded-2xl p-3.5 border border-m3-sys-outlineVariant/30">
      {/* En-tête avec raccourci Centrer tout */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
          <span className="material-symbols-rounded text-sm text-m3-sys-primary">crop_free</span>
          <span>Alignement sur la scène</span>
        </label>
        <button
          type="button"
          onClick={() => handleAlign('center-both')}
          title="Centrer au milieu de la scène (horizontal & vertical)"
          className="text-[11px] font-medium text-m3-sys-primary hover:text-m3-sys-onPrimaryContainer bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer px-2 py-0.5 rounded-full border border-m3-sys-outlineVariant/40 transition-colors cursor-pointer flex items-center space-x-1 shadow-none"
        >
          <span className="material-symbols-rounded text-xs">filter_center_focus</span>
          <span>Centrer tout</span>
        </button>
      </div>

      {/* Alignements horizontaux */}
      <div className="space-y-1">
        <span className="text-[10px] font-semibold text-m3-sys-onSurfaceVariant/80 uppercase">
          Horizontal
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {/* Bord gauche */}
          <button
            type="button"
            onClick={() => handleAlign('left')}
            title="Coller au bord gauche de la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_horizontal_left</span>
            <span className="text-[10px] mt-0.5 leading-tight">À gauche</span>
          </button>

          {/* Centrer H */}
          <button
            type="button"
            onClick={() => handleAlign('center-h')}
            title="Centrer horizontalement dans la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_horizontal_center</span>
            <span className="text-[10px] mt-0.5 leading-tight">Centrer H</span>
          </button>

          {/* Bord droit */}
          <button
            type="button"
            onClick={() => handleAlign('right')}
            title="Coller au bord droit de la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_horizontal_right</span>
            <span className="text-[10px] mt-0.5 leading-tight">À droite</span>
          </button>
        </div>
      </div>

      {/* Alignements verticaux */}
      <div className="space-y-1 pt-1 border-t border-m3-sys-outlineVariant/20">
        <span className="text-[10px] font-semibold text-m3-sys-onSurfaceVariant/80 uppercase">
          Vertical
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {/* Bord haut */}
          <button
            type="button"
            onClick={() => handleAlign('top')}
            title="Coller au bord supérieur de la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_vertical_top</span>
            <span className="text-[10px] mt-0.5 leading-tight">En haut</span>
          </button>

          {/* Centrer V */}
          <button
            type="button"
            onClick={() => handleAlign('center-v')}
            title="Centrer verticalement dans la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_vertical_center</span>
            <span className="text-[10px] mt-0.5 leading-tight">Centrer V</span>
          </button>

          {/* Bord bas */}
          <button
            type="button"
            onClick={() => handleAlign('bottom')}
            title="Coller au bord inférieur de la scène"
            className="flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">align_vertical_bottom</span>
            <span className="text-[10px] mt-0.5 leading-tight">En bas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
