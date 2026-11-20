import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BundleItem } from '../../types';

export const CopyElementToModal: React.FC = () => {
  const {
    loadedBundle,
    activeBundleItemId,
    copyToModalElements,
    closeCopyToModal,
    copyElementsToTargets,
    copyElements
  } = useEditor();

  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [keepExactPosition, setKeepExactPosition] = useState<boolean>(true);
  const [isCopying, setIsCopying] = useState<boolean>(false);

  const overridesList = useMemo<BundleItem[]>(() => {
    if (!loadedBundle?.overrides) return [];
    return Object.values(loadedBundle.overrides).sort((a, b) => a.slug.localeCompare(b.slug));
  }, [loadedBundle]);

  const groupedVariants = useMemo<Record<string, BundleItem[]>>(() => {
    const groups: Record<string, BundleItem[]> = {};
    if (!loadedBundle?.variants) return groups;
    for (const v of loadedBundle.variants) {
      const key = (v.lang || 'standard').toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    return groups;
  }, [loadedBundle]);

  useEffect(() => {
    if (copyToModalElements) {
      setSelectedTargetIds([]);
      setKeepExactPosition(true);
      setIsCopying(false);
    }
  }, [copyToModalElements]);

  if (!copyToModalElements || copyToModalElements.length === 0 || !loadedBundle) {
    return null;
  }

  const toggleTarget = (id: string) => {
    setSelectedTargetIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllOverrides = () => {
    const ids = overridesList.map(o => o.id);
    setSelectedTargetIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const selectAllVariants = () => {
    const ids = loadedBundle.variants.map(v => v.id);
    setSelectedTargetIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const handleConfirm = async () => {
    if (selectedTargetIds.length === 0 || isCopying) return;
    setIsCopying(true);
    try {
      await copyElementsToTargets(copyToModalElements, selectedTargetIds, {
        keepExactPosition
      });
      closeCopyToModal();
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyToClipboard = () => {
    copyElements(copyToModalElements.map(e => e.id));
    closeCopyToModal();
  };

  const firstEl = copyToModalElements[0];
  const elementSummary =
    copyToModalElements.length > 1
      ? `${copyToModalElements.length} éléments sélectionnés`
      : firstEl.customId ||
        (firstEl.type === 'text'
          ? firstEl.text.slice(0, 30) || 'Texte'
          : firstEl.type === 'device'
          ? `Appareil (${firstEl.deviceType})`
          : `Forme (${firstEl.shapeType})`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-m3-3 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-m3-sys-primary/15 text-m3-sys-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-xl leading-none">drive_file_move</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-m3-sys-onSurface">
                Copier vers un Master, Override ou Variante
              </h3>
              <p className="text-xs text-m3-sys-onSurfaceVariant truncate">
                Source : <span className="font-mono font-semibold text-m3-sys-primary">{elementSummary}</span>
              </p>
            </div>
          </div>

          <button
            onClick={closeCopyToModal}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-rounded text-base leading-none">close</span>
          </button>
        </div>

        {/* Quick selection bar */}
        <div className="px-5 pt-3.5 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-m3-sys-outlineVariant/20">
          <div className="flex flex-wrap items-center gap-1.5">
            {overridesList.length > 0 && (
              <button
                type="button"
                onClick={selectAllOverrides}
                className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                + Tous les overrides ({overridesList.length})
              </button>
            )}
            {loadedBundle.variants.length > 0 && (
              <button
                type="button"
                onClick={selectAllVariants}
                className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-semibold cursor-pointer transition-colors"
              >
                + Toutes les variantes ({loadedBundle.variants.length})
              </button>
            )}
            {selectedTargetIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTargetIds([])}
                className="px-2 py-1 rounded-full text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest text-[11px] cursor-pointer"
              >
                Effacer
              </button>
            )}
          </div>

          <span className="text-[11px] font-mono text-m3-sys-onSurfaceVariant">
            {selectedTargetIds.length} cible{selectedTargetIds.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Targets list */}
        <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto no-scrollbar">
          {/* Master */}
          {loadedBundle.master && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1">
                <span className="material-symbols-rounded text-sm text-indigo-400">auto_awesome</span>
                <span>Master Preset</span>
              </p>
              <label
                className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  selectedTargetIds.includes(loadedBundle.master.id)
                    ? 'border-indigo-500 bg-indigo-500/15'
                    : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedTargetIds.includes(loadedBundle.master.id)}
                    onChange={() => toggleTarget(loadedBundle.master!.id)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-m3-sys-onSurface truncate">
                      {loadedBundle.master.name}
                    </p>
                    <p className="text-[10px] font-mono text-m3-sys-onSurfaceVariant truncate">
                      {loadedBundle.master.path}
                    </p>
                  </div>
                </div>
                {activeBundleItemId === loadedBundle.master.id && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex-shrink-0">
                    Actif
                  </span>
                )}
              </label>
            </div>
          )}

          {/* Overrides */}
          {overridesList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1">
                <span className="material-symbols-rounded text-sm text-amber-400">tune</span>
                <span>Overrides partagés</span>
              </p>
              <div className="space-y-1.5">
                {overridesList.map(ov => {
                  const checked = selectedTargetIds.includes(ov.id);
                  return (
                    <label
                      key={ov.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        checked
                          ? 'border-amber-500 bg-amber-500/15'
                          : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(ov.id)}
                          className="w-4 h-4 accent-amber-500 cursor-pointer flex-shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-m3-sys-onSurface truncate">
                            {ov.name}
                          </p>
                          <p className="text-[10px] font-mono text-m3-sys-onSurfaceVariant truncate">
                            {ov.path}
                          </p>
                        </div>
                      </div>
                      {activeBundleItemId === ov.id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 flex-shrink-0">
                          Actif
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variants */}
          {Object.keys(groupedVariants).length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1">
                <span className="material-symbols-rounded text-sm text-emerald-400">translate</span>
                <span>Variantes</span>
              </p>
              {Object.entries(groupedVariants).map(([langKey, variants]) => (
                <div key={langKey} className="space-y-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                    {langKey}
                  </span>
                  <div className="space-y-1.5">
                    {variants.map(v => {
                      const checked = selectedTargetIds.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            checked
                              ? 'border-emerald-500 bg-emerald-500/15'
                              : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTarget(v.id)}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer flex-shrink-0"
                            />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-m3-sys-onSurface truncate">
                                {v.name}
                              </p>
                              <p className="text-[10px] font-mono text-m3-sys-onSurfaceVariant truncate">
                                {v.path}
                              </p>
                            </div>
                          </div>
                          {activeBundleItemId === v.id && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 flex-shrink-0">
                              Actif
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Option position exacte */}
          <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-m3-sys-surfaceContainer border border-m3-sys-outlineVariant/30 cursor-pointer">
            <input
              type="checkbox"
              checked={keepExactPosition}
              onChange={e => setKeepExactPosition(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-m3-sys-primary cursor-pointer flex-shrink-0"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-m3-sys-onSurface block">
                Conserver les coordonnées exactes (X, Y)
              </span>
              <span className="text-[10px] text-m3-sys-onSurfaceVariant block">
                Place l'élément exactement au même emplacement dans les autres cibles (décalé de +24px si collé dans le document actif).
              </span>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-m3-sys-outlineVariant/30 flex items-center justify-between gap-2 bg-m3-sys-surfaceContainer">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            title="Copier dans le presse-papiers pour coller manuellement avec Ctrl+V"
            className="px-3.5 py-2 rounded-full border border-m3-sys-outlineVariant/50 text-xs font-semibold text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest cursor-pointer flex items-center space-x-1.5"
          >
            <span className="material-symbols-rounded text-sm">content_copy</span>
            <span>Presse-papiers</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={closeCopyToModal}
              className="px-4 py-2 rounded-full border border-m3-sys-outlineVariant/50 text-xs font-semibold hover:bg-m3-sys-surfaceContainerHighest cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedTargetIds.length === 0 || isCopying}
              className={`px-5 py-2.5 rounded-full text-xs font-bold shadow-m3-1 transition-all flex items-center space-x-1.5 ${
                selectedTargetIds.length > 0 && !isCopying
                  ? 'bg-m3-sys-primary text-white hover:brightness-110 active:scale-95 cursor-pointer'
                  : 'bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant/50 cursor-not-allowed shadow-none'
              }`}
            >
              <span className="material-symbols-rounded text-sm">content_paste_go</span>
              <span>
                {isCopying
                  ? 'Copie...'
                  : `Copier (${selectedTargetIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
