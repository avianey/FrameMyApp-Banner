import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { AlignReference, AlignType, DistributeType } from '../../utils/alignment';

export const AlignmentControls: React.FC = () => {
  const {
    state,
    alignSelected,
    distributeSelected,
    selectElement,
    deleteSelectedElements
  } = useEditor();

  const { selectedElementIds, elements } = state;
  const [reference, setReference] = useState<AlignReference>('first');
  const [customGap, setCustomGap] = useState<number>(16);
  const [useCustomGap, setUseCustomGap] = useState<boolean>(false);

  const selectedElements = selectedElementIds
    .map(id => elements.find(e => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined);

  const firstElement = selectedElements[0];
  const lastElement = selectedElements[selectedElements.length - 1];

  const handleAlign = (type: AlignType) => {
    alignSelected(type, reference);
  };

  const handleDistribute = (type: DistributeType) => {
    distributeSelected(type, reference, useCustomGap ? customGap : undefined);
  };

  return (
    <div className="space-y-6">
      {/* En-tête : Résumé de la multi-sélection */}
      <div className="bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-rounded text-m3-sys-primary text-lg">
              select_all
            </span>
            <span className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase">
              Sélection Multiple
            </span>
          </div>
          <span className="text-xs font-bold text-m3-sys-primary bg-m3-sys-primaryContainer/40 px-2.5 py-0.5 rounded-full">
            {selectedElementIds.length} éléments
          </span>
        </div>

        {/* Liste condensée des éléments avec repères premier/dernier */}
        <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar pt-1">
          {selectedElements.map((el, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === selectedElements.length - 1;
            const name =
              el.type === 'text'
                ? el.text || 'Texte'
                : `Forme (${el.shapeType})`;

            return (
              <div
                key={el.id}
                className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/20"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-[10px] font-mono w-4 h-4 rounded-full bg-m3-sys-primary/10 text-m3-sys-primary font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate text-m3-sys-onSurface font-medium">
                    {name}
                  </span>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                  {isFirst && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      1er cliqué
                    </span>
                  )}
                  {isLast && !isFirst && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      Dernier cliqué
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cible de référence (Premier, Dernier, Composition) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
          <span className="material-symbols-rounded text-sm text-m3-sys-primary">
            straighten
          </span>
          <span>Aligner par rapport à</span>
        </label>

        <div className="grid grid-cols-3 gap-1.5 bg-m3-sys-surfaceContainer rounded-2xl p-1.5 border border-m3-sys-outlineVariant/30">
          <button
            type="button"
            onClick={() => setReference('first')}
            className={`px-2 py-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all cursor-pointer ${
              reference === 'first'
                ? 'bg-m3-sys-primary text-m3-sys-onPrimary shadow-sm'
                : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
            }`}
          >
            <span className="material-symbols-rounded text-base">filter_1</span>
            <span className="text-[10px] mt-0.5 leading-tight font-semibold">1er sélectionné</span>
          </button>

          <button
            type="button"
            onClick={() => setReference('last')}
            className={`px-2 py-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all cursor-pointer ${
              reference === 'last'
                ? 'bg-m3-sys-primary text-m3-sys-onPrimary shadow-sm'
                : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
            }`}
          >
            <span className="material-symbols-rounded text-base">filter_2</span>
            <span className="text-[10px] mt-0.5 leading-tight font-semibold">Dernier sélectionné</span>
          </button>

          <button
            type="button"
            onClick={() => setReference('canvas')}
            className={`px-2 py-2.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all cursor-pointer ${
              reference === 'canvas'
                ? 'bg-m3-sys-primary text-m3-sys-onPrimary shadow-sm'
                : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
            }`}
          >
            <span className="material-symbols-rounded text-base">crop_free</span>
            <span className="text-[10px] mt-0.5 leading-tight font-semibold">Composition</span>
          </button>
        </div>

        <p className="text-[11px] text-m3-sys-onSurfaceVariant/80 px-1">
          {reference === 'first' && (
            <>
              Référence : <strong className="text-m3-sys-onSurface">{firstElement?.type === 'text' ? firstElement.text || '1er Texte' : '1ère Forme'}</strong> (le premier élément que vous avez cliqué).
            </>
          )}
          {reference === 'last' && (
            <>
              Référence : <strong className="text-m3-sys-onSurface">{lastElement?.type === 'text' ? lastElement.text || 'Dernier Texte' : 'Dernière Forme'}</strong> (le dernier élément cliqué).
            </>
          )}
          {reference === 'canvas' && (
            <>
              Référence : les bords et le centre de la <strong>composition globale</strong> ({state.canvasWidth} × {state.canvasHeight} px).
            </>
          )}
        </p>
      </div>

      {/* Section Alignement Horizontal & Vertical */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
          <span className="material-symbols-rounded text-sm text-m3-sys-primary">
            format_align_center
          </span>
          <span>Alignement</span>
        </label>

        {/* Horizontal */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-m3-sys-onSurfaceVariant">
            Horizontal
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAlign('left')}
              title="Aligner à gauche"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_horizontal_left</span>
              <span className="text-[10px] mt-0.5">À gauche</span>
            </button>
            <button
              type="button"
              onClick={() => handleAlign('center-h')}
              title="Centrer horizontalement"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_horizontal_center</span>
              <span className="text-[10px] mt-0.5">Centrer H</span>
            </button>
            <button
              type="button"
              onClick={() => handleAlign('right')}
              title="Aligner à droite"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_horizontal_right</span>
              <span className="text-[10px] mt-0.5">À droite</span>
            </button>
          </div>
        </div>

        {/* Vertical */}
        <div className="space-y-1.5 pt-2 border-t border-m3-sys-outlineVariant/20">
          <span className="text-[11px] font-medium text-m3-sys-onSurfaceVariant">
            Vertical
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleAlign('top')}
              title="Aligner en haut"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_vertical_top</span>
              <span className="text-[10px] mt-0.5">En haut</span>
            </button>
            <button
              type="button"
              onClick={() => handleAlign('center-v')}
              title="Centrer verticalement"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_vertical_center</span>
              <span className="text-[10px] mt-0.5">Centrer V</span>
            </button>
            <button
              type="button"
              onClick={() => handleAlign('bottom')}
              title="Aligner en bas"
              className="py-2.5 px-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
            >
              <span className="material-symbols-rounded text-lg">align_vertical_bottom</span>
              <span className="text-[10px] mt-0.5">En bas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Espacement Uniforme (Distribution) */}
      <div className="space-y-3 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30">
        <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant uppercase flex items-center space-x-1.5">
          <span className="material-symbols-rounded text-sm text-m3-sys-primary">
            horizontal_distribute
          </span>
          <span>Espacement uniforme</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDistribute('horizontal')}
            title="Espacer uniformément à l'horizontale"
            className="py-2.5 px-3 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">horizontal_distribute</span>
            <span className="text-[11px] mt-1 text-center font-medium">Horizontal</span>
          </button>
          <button
            type="button"
            onClick={() => handleDistribute('vertical')}
            title="Espacer uniformément à la verticale"
            className="py-2.5 px-3 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primaryContainer hover:text-m3-sys-onPrimaryContainer text-m3-sys-onSurface text-xs font-medium flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-lg">vertical_distribute</span>
            <span className="text-[11px] mt-1 text-center font-medium">Vertical</span>
          </button>
        </div>

        {/* Option Espacement fixe en pixels */}
        <div className="pt-2 border-t border-m3-sys-outlineVariant/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-m3-sys-onSurface cursor-pointer flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useCustomGap}
                onChange={e => setUseCustomGap(e.target.checked)}
                className="w-4 h-4 accent-m3-sys-primary cursor-pointer"
              />
              <span>Espacement fixe personnalisé</span>
            </label>
            {useCustomGap && (
              <span className="text-xs font-mono font-semibold text-m3-sys-primary">
                {customGap} px
              </span>
            )}
          </div>

          {useCustomGap && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={customGap}
                onChange={e => setCustomGap(parseInt(e.target.value, 10))}
                className="flex-1 accent-m3-sys-primary cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="300"
                value={customGap}
                onChange={e => setCustomGap(Math.max(0, parseInt(e.target.value || '0', 10)))}
                className="w-16 px-2 py-1 bg-m3-sys-surfaceContainerHighest rounded-lg border border-m3-sys-outlineVariant/40 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-m3-sys-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions globales sur la sélection */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={() => selectElement(null)}
          className="w-full py-2.5 rounded-xl border border-m3-sys-outlineVariant/60 text-xs font-medium text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span className="material-symbols-rounded text-sm">deselect</span>
          <span>Désélectionner tout</span>
        </button>

        <button
          type="button"
          onClick={deleteSelectedElements}
          className="w-full py-2.5 rounded-xl bg-m3-sys-error/10 text-m3-sys-error text-xs font-medium hover:bg-m3-sys-error/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <span className="material-symbols-rounded text-sm leading-none">delete_sweep</span>
          <span>Supprimer les {selectedElementIds.length} éléments</span>
        </button>
      </div>
    </div>
  );
};
