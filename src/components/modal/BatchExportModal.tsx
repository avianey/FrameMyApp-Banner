import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BatchExportItem, BannerMasterConfig, BannerOverrideConfig, BannerVariantConfig } from '../../types';
import { resolveComposition } from '../../utils/templateEngine';
import { captureZoneToBlob, writeBlobToDirectory, createBatchExportZip } from '../../utils/batchExportRenderer';
import { downloadBlob } from '../../utils/bundleIo';

export const BatchExportModal: React.FC = () => {
  const {
    isBatchExportModalOpen,
    setIsBatchExportModalOpen,
    loadedBundle,
    artboardRef,
    state,
    applyCompositionDirectly,
    showSnackbar
  } = useEditor();

  const [dirHandle, setDirHandle] = useState<any>(null);
  const [exportMode, setExportMode] = useState<'directory' | 'zip'>('directory');
  const [items, setItems] = useState<BatchExportItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentRenderingName, setCurrentRenderingName] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Carets repliables (Master & Overrides repliés par défaut, Variantes dépliées)
  const [isMasterExpanded, setIsMasterExpanded] = useState(false);
  const [isOverridesExpanded, setIsOverridesExpanded] = useState(false);
  const [isVariantsExpanded, setIsVariantsExpanded] = useState(true);

  const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Initialize items whenever bundle changes or modal opens
  useEffect(() => {
    if (!isBatchExportModalOpen || !loadedBundle) {
      setItems([]);
      setIsExporting(false);
      setIsCompleted(false);
      setProgressIndex(0);
      return;
    }

    const list: BatchExportItem[] = [];

    // 1. Master (non sélectionné par défaut)
    if (loadedBundle.master) {
      list.push({
        item: loadedBundle.master,
        outputPath: 'master.png',
        selected: false,
        status: 'pending'
      });
    }

    // 2. Overrides (non sélectionnées par défaut)
    for (const [slug, item] of Object.entries(loadedBundle.overrides)) {
      list.push({
        item,
        outputPath: `overrides/${slug}.png`,
        selected: false,
        status: 'pending'
      });
    }

    // 3. Variants (sélectionnées par défaut)
    for (const variant of loadedBundle.variants) {
      const vPath = variant.path.startsWith('variants/') ? variant.path.substring(9) : variant.path;
      const cleanVPath = vPath.replace(/\.(yml|yaml|json)$/i, '.png');
      list.push({
        item: variant,
        outputPath: `variants/${cleanVPath}`,
        selected: true,
        status: 'pending'
      });
    }

    setItems(list);
    setIsCompleted(false);
    setProgressIndex(0);
    setIsMasterExpanded(false);
    setIsOverridesExpanded(false);
    setIsVariantsExpanded(true);
  }, [isBatchExportModalOpen, loadedBundle]);

  if (!isBatchExportModalOpen || !loadedBundle) return null;

  const handlePickDirectory = async () => {
    try {
      if (!hasFsSupport) {
        setExportMode('zip');
        return;
      }
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads'
      });
      setDirHandle(handle);
      setExportMode('directory');
      showSnackbar(`Dossier sélectionné : ${handle.name}`, 'folder');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory picker error', err);
        showSnackbar('Sélection du dossier annulée ou non autorisée', 'warning');
      }
    }
  };

  const toggleSelectAll = (selectAll: boolean) => {
    setItems(prev => prev.map(it => ({ ...it, selected: selectAll })));
  };

  const toggleGroup = (type: 'master' | 'override' | 'variant', selectAll?: boolean) => {
    setItems(prev => {
      const groupItems = prev.filter(it => it.item.type === type);
      const shouldSelect = selectAll !== undefined ? selectAll : !groupItems.every(it => it.selected);
      return prev.map(it => (it.item.type === type ? { ...it, selected: shouldSelect } : it));
    });
  };

  const toggleItem = (outputPath: string) => {
    setItems(prev =>
      prev.map(it => (it.outputPath === outputPath ? { ...it, selected: !it.selected } : it))
    );
  };

  const runBatchExport = async () => {
    const selectedItems = items.filter(it => it.selected);
    if (selectedItems.length === 0) {
      showSnackbar('Veuillez sélectionner au moins un élément à exporter', 'warning');
      return;
    }

    if (!artboardRef.current) {
      showSnackbar('Artboard non disponible', 'error');
      return;
    }

    setIsExporting(true);
    setIsCompleted(false);
    setProgressIndex(0);

    // Save initial editor state to restore later (including canvas dimensions)
    const initialComposition = {
      background: JSON.parse(JSON.stringify(state.background)),
      elements: JSON.parse(JSON.stringify(state.elements)),
      exportZone: JSON.parse(JSON.stringify(state.exportZone)),
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight
    };

    const renderedFiles: { path: string; blob: Blob }[] = [];
    const timestamp = Date.now();
    const cleanBundleName = (loadedBundle.name || 'bundle').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const folderContainerName = `framemyapp_${cleanBundleName}_${timestamp}`;

    let rootSubDirHandle: any = null;
    if (exportMode === 'directory' && dirHandle) {
      try {
        rootSubDirHandle = await dirHandle.getDirectoryHandle(folderContainerName, {
          create: true
        });
      } catch (e) {
        console.warn('Could not create container directory, will write in root', e);
        rootSubDirHandle = dirHandle;
      }
    }

    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      if (!current.selected) continue;

      setProgressIndex(i + 1);
      setCurrentRenderingName(current.item.name);

      // Mark status as rendering
      setItems(prev =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'rendering' } : it))
      );

      try {
        // 1. Resolve composition
        const masterConfig = (loadedBundle.master?.config as BannerMasterConfig) || {};
        let resolved;

        if (current.item.type === 'master') {
          resolved = resolveComposition(
            current.item.config as BannerMasterConfig,
            undefined,
            undefined,
            loadedBundle.assets,
            current.item.path
          );
        } else if (current.item.type === 'override') {
          resolved = resolveComposition(
            masterConfig,
            current.item.config as BannerOverrideConfig,
            undefined,
            loadedBundle.assets,
            current.item.path
          );
        } else {
          // Variant
          const matchingOverride = loadedBundle.overrides[current.item.slug];
          resolved = resolveComposition(
            masterConfig,
            matchingOverride?.config as BannerOverrideConfig | undefined,
            current.item.config as BannerVariantConfig,
            loadedBundle.assets,
            current.item.path
          );
        }

        // 2. Apply to editor DOM
        applyCompositionDirectly(resolved, false);

        // 3. Wait for layout, fonts and images to settle
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => setTimeout(r, 100));

        // 4. Capture
        const { blob, dataUrl } = await captureZoneToBlob(artboardRef.current, resolved.exportZone);

        // 5. Store/write
        if (exportMode === 'directory' && rootSubDirHandle) {
          await writeBlobToDirectory(rootSubDirHandle, current.outputPath, blob);
        } else {
          renderedFiles.push({ path: current.outputPath, blob });
        }

        successCount++;

        // Update item status to done with preview
        setItems(prev =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'done', previewDataUrl: dataUrl } : it
          )
        );
      } catch (err: any) {
        console.error(`Error rendering ${current.item.name}:`, err);
        setItems(prev =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error', errorMessage: err.message } : it
          )
        );
      }
    }

    // 6. If ZIP mode, package and trigger download
    if (exportMode === 'zip' || !rootSubDirHandle) {
      if (renderedFiles.length > 0) {
        const zipBlob = await createBatchExportZip(renderedFiles, folderContainerName);
        downloadBlob(`${folderContainerName}.zip`, zipBlob);
        showSnackbar(`Archive ZIP téléchargée (${renderedFiles.length} images)`, 'folder_zip');
      }
    } else {
      showSnackbar(
        `Export terminé : ${successCount} images créées dans ${dirHandle.name}/${folderContainerName}/`,
        'folder'
      );
    }

    // Restore canvas to original state
    applyCompositionDirectly(initialComposition, false);

    setIsExporting(false);
    setIsCompleted(true);
    setGeneratedCount(successCount);
  };

  const selectedCount = items.filter(it => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-m3-3 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-m3-sys-primaryContainer flex items-center justify-center text-m3-sys-onPrimaryContainer">
              <span className="material-symbols-rounded text-xl leading-none">layers</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-m3-sys-onSurface">
                Export par lot (Batch Export)
              </h3>
              <p className="text-xs text-m3-sys-onSurfaceVariant">
                Bundle : <span className="font-semibold text-m3-sys-primary">{loadedBundle.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => !isExporting && setIsBatchExportModalOpen(false)}
            disabled={isExporting}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant cursor-pointer disabled:opacity-30"
          >
            <span className="material-symbols-rounded text-lg leading-none">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 no-scrollbar">
          {/* Destination Directory Picker */}
          <div className="bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1.5">
                <span className="material-symbols-rounded text-sm text-m3-sys-primary">folder_open</span>
                <span>Répertoire de destination</span>
              </span>
              <div className="flex items-center space-x-2 text-xs">
                {hasFsSupport && (
                  <button
                    onClick={() => setExportMode('directory')}
                    className={`px-2 py-1 rounded-md font-medium cursor-pointer transition-all ${
                      exportMode === 'directory'
                        ? 'bg-m3-sys-primary text-white shadow-sm'
                        : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
                    }`}
                  >
                    Dossier local
                  </button>
                )}
                <button
                  onClick={() => setExportMode('zip')}
                  className={`px-2 py-1 rounded-md font-medium cursor-pointer transition-all ${
                    exportMode === 'zip'
                      ? 'bg-m3-sys-primary text-white shadow-sm'
                      : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
                  }`}
                >
                  Archive .ZIP
                </button>
              </div>
            </div>

            {exportMode === 'directory' && hasFsSupport ? (
              <div className="flex items-center justify-between bg-m3-sys-surfaceContainerHighest rounded-xl p-3 border border-m3-sys-outlineVariant/40">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <span className="material-symbols-rounded text-lg text-m3-sys-primary flex-shrink-0">
                    {dirHandle ? 'check_circle' : 'folder_special'}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-medium text-m3-sys-onSurface truncate">
                      {dirHandle
                        ? `Dossier : ${dirHandle.name}`
                        : 'Aucun dossier sélectionné'}
                    </p>
                    <p className="text-[10px] text-m3-sys-onSurfaceVariant truncate">
                      {dirHandle
                        ? 'Sous-dossier horodaté framemyapp_* créé automatiquement'
                        : 'Cliquez sur "Sélectionner un dossier" ci-contre'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePickDirectory}
                  disabled={isExporting}
                  className="ml-3 px-3.5 py-1.5 rounded-full bg-m3-sys-primary text-white text-xs font-semibold hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0 shadow-sm disabled:opacity-40"
                >
                  {dirHandle ? 'Changer de dossier' : 'Sélectionner un dossier'}
                </button>
              </div>
            ) : (
              <div className="bg-m3-sys-surfaceContainerHighest rounded-xl p-3 border border-m3-sys-outlineVariant/40 flex items-center space-x-2 text-xs text-m3-sys-onSurfaceVariant">
                <span className="material-symbols-rounded text-base text-m3-sys-primary">
                  folder_zip
                </span>
                <span>
                  Toutes les images seront packagées dans un fichier <strong>.ZIP</strong>{' '}
                  reproduisant l'arborescence (variants/, overrides/, master.png).
                </span>
              </div>
            )}
          </div>

          {/* Items selection list */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-m3-sys-onSurfaceVariant">
                Éléments à générer ({selectedCount} / {items.length})
              </span>
              <div className="space-x-2">
                <button
                  onClick={() => toggleSelectAll(true)}
                  disabled={isExporting}
                  className="text-m3-sys-primary hover:underline cursor-pointer disabled:opacity-40 font-medium"
                >
                  Tout cocher
                </button>
                <span>•</span>
                <button
                  onClick={() => toggleSelectAll(false)}
                  disabled={isExporting}
                  className="text-m3-sys-onSurfaceVariant hover:underline cursor-pointer disabled:opacity-40 font-medium"
                >
                  Tout décocher
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {/* 1. MASTER GROUP */}
              {items.filter(it => it.item.type === 'master').length > 0 && (
                <div className="border border-m3-sys-outlineVariant/30 rounded-2xl overflow-hidden bg-m3-sys-surfaceContainer/50">
                  <div
                    onClick={() => setIsMasterExpanded(prev => !prev)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-m3-sys-surfaceContainerHighest/50 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span
                        className={`material-symbols-rounded text-lg text-m3-sys-onSurfaceVariant transition-transform duration-200 flex-shrink-0 ${
                          isMasterExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        chevron_right
                      </span>
                      <input
                        type="checkbox"
                        checked={
                          items.filter(it => it.item.type === 'master').every(it => it.selected) &&
                          items.filter(it => it.item.type === 'master').length > 0
                        }
                        ref={input => {
                          if (input) {
                            const mItems = items.filter(it => it.item.type === 'master');
                            const sel = mItems.filter(it => it.selected).length;
                            input.indeterminate = sel > 0 && sel < mItems.length;
                          }
                        }}
                        onChange={e => {
                          e.stopPropagation();
                          toggleGroup('master', e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                        disabled={isExporting}
                        className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                      />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
                        MASTER
                      </span>
                      <span className="text-xs font-semibold text-m3-sys-onSurface truncate">
                        Canevas Maître (Base)
                      </span>
                    </div>
                    <span className="text-xs font-medium text-m3-sys-onSurfaceVariant flex-shrink-0 ml-2">
                      {items.filter(it => it.item.type === 'master' && it.selected).length} /{' '}
                      {items.filter(it => it.item.type === 'master').length}
                    </span>
                  </div>

                  {isMasterExpanded && (
                    <div className="p-2 pt-1 space-y-1.5 border-t border-m3-sys-outlineVariant/20 bg-m3-sys-surfaceContainerLow/30">
                      {items
                        .filter(it => it.item.type === 'master')
                        .map(item => (
                          <div
                            key={item.outputPath}
                            onClick={() => !isExporting && toggleItem(item.outputPath)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              item.selected
                                ? 'bg-m3-sys-surfaceContainerHigh border-m3-sys-outlineVariant/60'
                                : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => {}}
                                disabled={isExporting}
                                className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                              />
                              <div className="truncate">
                                <p className="text-xs font-medium text-m3-sys-onSurface truncate">
                                  {item.item.name}
                                </p>
                                <p className="text-[10px] text-m3-sys-onSurfaceVariant font-mono truncate">
                                  {item.outputPath}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {item.previewDataUrl && (
                                <img
                                  src={item.previewDataUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-m3-sys-outlineVariant/50"
                                />
                              )}
                              {item.status === 'rendering' && (
                                <span className="material-symbols-rounded text-sm text-m3-sys-primary animate-spin">
                                  progress_activity
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="material-symbols-rounded text-sm text-emerald-500">
                                  check_circle
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span
                                  title={item.errorMessage}
                                  className="material-symbols-rounded text-sm text-rose-500"
                                >
                                  error
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. OVERRIDES GROUP */}
              {items.filter(it => it.item.type === 'override').length > 0 && (
                <div className="border border-m3-sys-outlineVariant/30 rounded-2xl overflow-hidden bg-m3-sys-surfaceContainer/50">
                  <div
                    onClick={() => setIsOverridesExpanded(prev => !prev)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-m3-sys-surfaceContainerHighest/50 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span
                        className={`material-symbols-rounded text-lg text-m3-sys-onSurfaceVariant transition-transform duration-200 flex-shrink-0 ${
                          isOverridesExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        chevron_right
                      </span>
                      <input
                        type="checkbox"
                        checked={
                          items.filter(it => it.item.type === 'override').every(it => it.selected) &&
                          items.filter(it => it.item.type === 'override').length > 0
                        }
                        ref={input => {
                          if (input) {
                            const oItems = items.filter(it => it.item.type === 'override');
                            const sel = oItems.filter(it => it.selected).length;
                            input.indeterminate = sel > 0 && sel < oItems.length;
                          }
                        }}
                        onChange={e => {
                          e.stopPropagation();
                          toggleGroup('override', e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                        disabled={isExporting}
                        className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                      />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                        OVERRIDES
                      </span>
                      <span className="text-xs font-semibold text-m3-sys-onSurface truncate">
                        Surcharges thématiques
                      </span>
                    </div>
                    <span className="text-xs font-medium text-m3-sys-onSurfaceVariant flex-shrink-0 ml-2">
                      {items.filter(it => it.item.type === 'override' && it.selected).length} /{' '}
                      {items.filter(it => it.item.type === 'override').length}
                    </span>
                  </div>

                  {isOverridesExpanded && (
                    <div className="p-2 pt-1 space-y-1.5 border-t border-m3-sys-outlineVariant/20 bg-m3-sys-surfaceContainerLow/30">
                      {items
                        .filter(it => it.item.type === 'override')
                        .map(item => (
                          <div
                            key={item.outputPath}
                            onClick={() => !isExporting && toggleItem(item.outputPath)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              item.selected
                                ? 'bg-m3-sys-surfaceContainerHigh border-m3-sys-outlineVariant/60'
                                : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => {}}
                                disabled={isExporting}
                                className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                              />
                              <div className="truncate">
                                <p className="text-xs font-medium text-m3-sys-onSurface truncate">
                                  {item.item.name}
                                </p>
                                <p className="text-[10px] text-m3-sys-onSurfaceVariant font-mono truncate">
                                  {item.outputPath}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {item.previewDataUrl && (
                                <img
                                  src={item.previewDataUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-m3-sys-outlineVariant/50"
                                />
                              )}
                              {item.status === 'rendering' && (
                                <span className="material-symbols-rounded text-sm text-m3-sys-primary animate-spin">
                                  progress_activity
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="material-symbols-rounded text-sm text-emerald-500">
                                  check_circle
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span
                                  title={item.errorMessage}
                                  className="material-symbols-rounded text-sm text-rose-500"
                                >
                                  error
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. VARIANTS GROUP */}
              {items.filter(it => it.item.type === 'variant').length > 0 && (
                <div className="border border-m3-sys-outlineVariant/30 rounded-2xl overflow-hidden bg-m3-sys-surfaceContainer/50">
                  <div
                    onClick={() => setIsVariantsExpanded(prev => !prev)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-m3-sys-surfaceContainerHighest/50 transition-colors select-none"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span
                        className={`material-symbols-rounded text-lg text-m3-sys-onSurfaceVariant transition-transform duration-200 flex-shrink-0 ${
                          isVariantsExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        chevron_right
                      </span>
                      <input
                        type="checkbox"
                        checked={
                          items.filter(it => it.item.type === 'variant').every(it => it.selected) &&
                          items.filter(it => it.item.type === 'variant').length > 0
                        }
                        ref={input => {
                          if (input) {
                            const vItems = items.filter(it => it.item.type === 'variant');
                            const sel = vItems.filter(it => it.selected).length;
                            input.indeterminate = sel > 0 && sel < vItems.length;
                          }
                        }}
                        onChange={e => {
                          e.stopPropagation();
                          toggleGroup('variant', e.target.checked);
                        }}
                        onClick={e => e.stopPropagation()}
                        disabled={isExporting}
                        className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                      />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                        VARIANTES
                      </span>
                      <span className="text-xs font-semibold text-m3-sys-onSurface truncate">
                        Déclinaisons (Langues / Formats)
                      </span>
                    </div>
                    <span className="text-xs font-medium text-m3-sys-onSurfaceVariant flex-shrink-0 ml-2">
                      {items.filter(it => it.item.type === 'variant' && it.selected).length} /{' '}
                      {items.filter(it => it.item.type === 'variant').length}
                    </span>
                  </div>

                  {isVariantsExpanded && (
                    <div className="p-2 pt-1 space-y-1.5 border-t border-m3-sys-outlineVariant/20 bg-m3-sys-surfaceContainerLow/30 max-h-64 overflow-y-auto no-scrollbar">
                      {items
                        .filter(it => it.item.type === 'variant')
                        .map(item => (
                          <div
                            key={item.outputPath}
                            onClick={() => !isExporting && toggleItem(item.outputPath)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              item.selected
                                ? 'bg-m3-sys-surfaceContainerHigh border-m3-sys-outlineVariant/60'
                                : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => {}}
                                disabled={isExporting}
                                className="w-4 h-4 accent-m3-sys-primary cursor-pointer rounded"
                              />
                              <div className="truncate">
                                <p className="text-xs font-medium text-m3-sys-onSurface truncate">
                                  {item.item.name}
                                </p>
                                <p className="text-[10px] text-m3-sys-onSurfaceVariant font-mono truncate">
                                  {item.outputPath}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {item.previewDataUrl && (
                                <img
                                  src={item.previewDataUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-m3-sys-outlineVariant/50"
                                />
                              )}
                              {item.status === 'rendering' && (
                                <span className="material-symbols-rounded text-sm text-m3-sys-primary animate-spin">
                                  progress_activity
                                </span>
                              )}
                              {item.status === 'done' && (
                                <span className="material-symbols-rounded text-sm text-emerald-500">
                                  check_circle
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span
                                  title={item.errorMessage}
                                  className="material-symbols-rounded text-sm text-rose-500"
                                >
                                  error
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar when running */}
          {isExporting && (
            <div className="space-y-1.5 bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 animate-pulse">
              <div className="flex justify-between text-xs font-semibold text-m3-sys-onSurface">
                <span>Rendu en cours : {currentRenderingName}</span>
                <span>
                  {progressIndex} / {selectedCount}
                </span>
              </div>
              <div className="w-full h-2 bg-m3-sys-surfaceContainerHighest rounded-full overflow-hidden">
                <div
                  className="h-full bg-m3-sys-primary transition-all duration-300"
                  style={{ width: `${(progressIndex / selectedCount) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success summary */}
          {isCompleted && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center space-x-3 text-xs text-emerald-300">
              <span className="material-symbols-rounded text-xl text-emerald-400">
                verified
              </span>
              <div>
                <p className="font-bold">Génération terminée avec succès !</p>
                <p className="text-[11px] text-emerald-300/80">
                  {generatedCount} images ont été produites en haute définition (PNG).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <button
            onClick={() => setIsBatchExportModalOpen(false)}
            disabled={isExporting}
            className="px-4 py-2 rounded-full border border-m3-sys-outlineVariant/50 text-xs font-semibold hover:bg-m3-sys-surfaceContainerHighest transition-all cursor-pointer disabled:opacity-40"
          >
            {isCompleted ? 'Fermer' : 'Annuler'}
          </button>

          <button
            onClick={runBatchExport}
            disabled={isExporting || selectedCount === 0 || (exportMode === 'directory' && !dirHandle)}
            className="px-6 py-2.5 rounded-full bg-m3-sys-primary text-white text-xs font-bold shadow-m3-2 hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-rounded text-base leading-none">
              {isExporting ? 'progress_activity' : 'bolt'}
            </span>
            <span>
              {isExporting
                ? 'Export en cours...'
                : `Lancer l'export (${selectedCount} images)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
