import React, { useRef, useState } from 'react';
import { useEditor, extractAssetsFromConfig } from '../../context/EditorContext';
import { BundleItem, CanvasElement } from '../../types';
import {
  readFilesBundle,
  readZipBundle,
  readDirectoryBundle,
  readSingleTemplate,
  verifyDirectoryPermission
} from '../../utils/bundleIo';
import { serializeCanvasToMaster } from '../../utils/templateEngine';
import { stringifyYaml } from '../../utils/yamlHelper';
import { NewVariantModal } from '../modal/NewVariantModal';

export const LeftSidebar: React.FC = () => {
  const {
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    activeLeftTab,
    setActiveLeftTab,
    loadedBundle,
    setLoadedBundle,
    activeBundleItemId,
    applyBundleItem,
    setIsBatchExportModalOpen,
    setIsDocOpen,
    state,
    selectElement,
    updateElementCustomId,
    autoGenerateCustomIds,
    deleteElement,
    showSnackbar,
    isItemDirty,
    saveBundleItemToDisk,
    setProjectName,
    requestYamlAssetsPermission,
    setSyncFilePath,
    setSyncDirectoryName,
    setSyncDirectoryHandle
  } = useEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isNewVariantModalOpen, setIsNewVariantModalOpen] = useState(false);

  const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  const handleUpdateMasterFromCanvas = () => {
    if (!loadedBundle || !loadedBundle.master) return;
    saveBundleItemToDisk(loadedBundle.master);
  };

  // Handle single template or zip file import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'zip') {
        const bundle = await readZipBundle(file);
        setLoadedBundle(bundle);
        setProjectName(bundle.name);
        setSyncDirectoryName(bundle.name);
        setSyncFilePath('master.yml');
        if (bundle.master) {
          applyBundleItem(bundle.master);
        }
        showSnackbar(`Bundle chargé depuis ZIP : ${bundle.name}`, 'folder_zip');
      } else if (ext === 'yml' || ext === 'yaml' || ext === 'json') {
        const { name, config } = await readSingleTemplate(file);
        const templateName = name || file.name.replace(/\.(yml|yaml|json)$/i, '');
        const item: BundleItem = {
          id: 'template_' + Date.now(),
          type: 'master',
          path: file.name,
          slug: file.name.replace(/\.(yml|yaml|json)$/i, ''),
          name: templateName,
          rawContent: await file.text(),
          config
        };

        const detectedAssets = extractAssetsFromConfig(config);
        if (detectedAssets.length > 0 && hasFsSupport) {
          requestYamlAssetsPermission(item, file.name, detectedAssets);
          if (e.target) e.target.value = '';
          return;
        }

        setLoadedBundle({
          name: templateName,
          master: item,
          overrides: {},
          variants: [],
          assets: {}
        });
        setProjectName(templateName);
        setSyncFilePath(file.name);
        applyBundleItem(item);
        showSnackbar(`Template YAML chargé : ${templateName}`, 'auto_stories');
      }
    } catch (err: any) {
      console.error(err);
      showSnackbar(`Erreur d'import : ${err.message || 'Fichier invalide'}`, 'error');
    }

    if (e.target) e.target.value = '';
  };

  // Handle directory import via native Directory Picker
  const handleOpenDirectory = async () => {
    if (hasFsSupport) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop'
        });
        const bundle = await readDirectoryBundle(dirHandle);
        setLoadedBundle(bundle);
        setProjectName(bundle.name);
        setSyncDirectoryName(bundle.name);
        setSyncFilePath('master.yml');
        if (bundle.directoryHandle) {
          setSyncDirectoryHandle(bundle.directoryHandle);
        }
        if (bundle.master) {
          applyBundleItem(bundle.master);
        }
        showSnackbar(`Dossier de bundle chargé : ${bundle.name}`, 'folder');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker failed, falling back to input:', err);
      }
    }
    // Fallback to hidden input webkitdirectory
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const bundle = await readFilesBundle(files);
      setLoadedBundle(bundle);
      setProjectName(bundle.name);
      setSyncDirectoryName(bundle.name);
      setSyncFilePath('master.yml');
      if (bundle.master) {
        applyBundleItem(bundle.master);
      }
      showSnackbar(`Dossier chargé : ${bundle.name}`, 'folder');
    } catch (err: any) {
      console.error(err);
      showSnackbar('Erreur lors de la lecture du dossier de bundle', 'error');
    }

    if (e.target) e.target.value = '';
  };

  // Handle Drag & Drop of directory, zip or yaml
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    const files = e.dataTransfer.files;

    if (!items && !files) return;

    try {
      // Check if dropped item is a directory
      if (items && items.length > 0) {
        const firstItem = items[0];

        // 1. Try modern File System Access API first to obtain persistent FileSystemDirectoryHandle
        if (typeof (firstItem as any).getAsFileSystemHandle === 'function') {
          try {
            const handle = await (firstItem as any).getAsFileSystemHandle();
            if (handle && handle.kind === 'directory') {
              await verifyDirectoryPermission(handle, true);
              const bundle = await readDirectoryBundle(handle);
              setLoadedBundle(bundle);
              setProjectName(bundle.name);
              setSyncDirectoryName(bundle.name);
              setSyncFilePath('master.yml');
              setSyncDirectoryHandle(handle);
              if (bundle.master) {
                applyBundleItem(bundle.master);
              }
              showSnackbar(`Dossier déposé et connecté : ${bundle.name}`, 'folder');
              return;
            }
          } catch (err) {
            console.warn('getAsFileSystemHandle fallback to webkitGetAsEntry:', err);
          }
        }

        const entry = (firstItem as any).webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          // Read directory recursively using DataTransferItemList
          const collectedFiles: { path: string; file: File }[] = [];
          const readEntry = async (dirEntry: any, path: string) => {
            const reader = dirEntry.createReader();
            const entries: any[] = await new Promise((resolve, reject) => {
              reader.readEntries(resolve, reject);
            });
            for (const subEntry of entries) {
              if (subEntry.isFile) {
                const file: File = await new Promise((resolve, reject) => {
                  subEntry.file(resolve, reject);
                });
                collectedFiles.push({ path: `${path}/${subEntry.name}`, file });
              } else if (subEntry.isDirectory) {
                await readEntry(subEntry, `${path}/${subEntry.name}`);
              }
            }
          };

          await readEntry(entry, entry.name);
          const bundle = await readFilesBundle(
            collectedFiles.map(f => {
              Object.defineProperty(f.file, 'webkitRelativePath', {
                value: f.path,
                writable: false
              });
              return f.file;
            })
          );
          setLoadedBundle(bundle);
          setProjectName(bundle.name);
          setSyncDirectoryName(bundle.name);
          setSyncFilePath('master.yml');
          if (bundle.master) {
            applyBundleItem(bundle.master);
          }
          showSnackbar(`Dossier déposé et chargé : ${bundle.name}`, 'folder');
          return;
        }
      }

      // Single file drop (ZIP or YAML)
      if (files && files.length > 0) {
        const file = files[0];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'zip') {
          const bundle = await readZipBundle(file);
          setLoadedBundle(bundle);
          setProjectName(bundle.name);
          setSyncDirectoryName(bundle.name);
          setSyncFilePath('master.yml');
          if (bundle.master) {
            applyBundleItem(bundle.master);
          }
          showSnackbar(`Archive ZIP chargée : ${bundle.name}`, 'folder_zip');
        } else if (ext === 'yml' || ext === 'yaml' || ext === 'json') {
          const { name, config } = await readSingleTemplate(file);
          const templateName = name || file.name.replace(/\.(yml|yaml|json)$/i, '');
          const item: BundleItem = {
            id: 'template_' + Date.now(),
            type: 'master',
            path: file.name,
            slug: file.name.replace(/\.(yml|yaml|json)$/i, ''),
            name: templateName,
            rawContent: await file.text(),
            config
          };

          const detectedAssets = extractAssetsFromConfig(config);
          if (detectedAssets.length > 0 && hasFsSupport) {
            requestYamlAssetsPermission(item, file.name, detectedAssets);
            return;
          }

          setLoadedBundle({
            name: templateName,
            master: item,
            overrides: {},
            variants: [],
            assets: {}
          });
          setProjectName(templateName);
          setSyncFilePath(file.name);
          applyBundleItem(item);
          showSnackbar(`Template YAML chargé : ${templateName}`, 'auto_stories');
        }
      }
    } catch (err: any) {
      console.error(err);
      showSnackbar(`Erreur lors du dépôt : ${err.message || 'Format non reconnu'}`, 'error');
    }
  };

  // Group variants by language or subfolder
  const groupedVariants: Record<string, BundleItem[]> = {};
  if (loadedBundle) {
    for (const v of loadedBundle.variants) {
      const groupKey = (v.lang || 'standard').toUpperCase();
      if (!groupedVariants[groupKey]) {
        groupedVariants[groupKey] = [];
      }
      groupedVariants[groupKey].push(v);
    }
  }

  return (
    <>
      {/* Hidden inputs for directory and file picking */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.yml,.yaml,.json"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        className="hidden"
        onChange={handleFolderInputChange}
      />

      {/* Left Sidebar Container */}
      <aside
        id="left-sidebar"
        className={`w-80 md:w-96 bg-m3-sys-surfaceContainerLow border-r border-m3-sys-outlineVariant/40 h-full flex flex-col z-40 transition-transform duration-300 ease-in-out absolute left-0 top-0 shadow-m3-3 select-none ${
          isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Top Header & Tabs */}
        <div className="border-b border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer flex-shrink-0">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-m3-sys-primary/10 flex items-center justify-center text-m3-sys-primary flex-shrink-0">
                <span className="material-symbols-rounded text-xl leading-none">
                  {activeLeftTab === 'templates' ? 'auto_stories' : 'badge'}
                </span>
              </div>
              <div className="truncate">
                <h2 className="font-bold text-sm text-m3-sys-onSurface truncate">
                  {activeLeftTab === 'templates' ? 'Templates & Bundles' : 'Identifiants (Custom IDs)'}
                </h2>
                <p className="text-[11px] text-m3-sys-onSurfaceVariant truncate">
                  {activeLeftTab === 'templates'
                    ? 'Presets maîtres, déclinaisons & batch'
                    : 'Mapping des variables de surcharges'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsDocOpen(true)}
                title="Consulter la documentation des templates et identifiants"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant hover:text-m3-sys-primary transition-all cursor-pointer"
              >
                <span className="material-symbols-rounded text-lg leading-none">help_outline</span>
              </button>
              <button
                onClick={() => setIsLeftSidebarOpen(false)}
                title="Réduire le volet gauche"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface transition-all cursor-pointer"
              >
                <span className="material-symbols-rounded text-lg leading-none">chevron_left</span>
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1.5 gap-1 bg-m3-sys-surfaceContainerLow border-t border-m3-sys-outlineVariant/20">
            <button
              onClick={() => setActiveLeftTab('templates')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeLeftTab === 'templates'
                  ? 'bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer shadow-sm'
                  : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
              }`}
            >
              <span className="material-symbols-rounded text-sm">auto_stories</span>
              <span>Templates</span>
              {loadedBundle && (
                <span className="ml-1 px-1.5 py-0.2 bg-m3-sys-primary text-white text-[10px] rounded-full font-mono">
                  {loadedBundle.variants.length + 1}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveLeftTab('customIds')}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                activeLeftTab === 'customIds'
                  ? 'bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer shadow-sm'
                  : 'text-m3-sys-onSurfaceVariant hover:bg-m3-sys-surfaceContainerHighest'
              }`}
            >
              <span className="material-symbols-rounded text-sm">badge</span>
              <span>Custom IDs</span>
              <span className="ml-1 px-1.5 py-0.2 bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface text-[10px] rounded-full font-mono">
                {state.elements.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: TEMPLATES & BUNDLES */}
        {activeLeftTab === 'templates' && (
          <div
            className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenDirectory}
                title="Ouvrir un dossier de Bundle local (showDirectoryPicker)"
                className="p-3 rounded-2xl bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/30 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-rounded text-lg text-m3-sys-primary">
                  folder_open
                </span>
                <span className="text-xs font-semibold text-m3-sys-onSurface">Ouvrir Dossier</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Importer un fichier ZIP ou YAML"
                className="p-3 rounded-2xl bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/30 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-rounded text-lg text-m3-sys-primary">
                  file_open
                </span>
                <span className="text-xs font-semibold text-m3-sys-onSurface">Importer Fichier</span>
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div
              className={`p-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center text-center ${
                isDraggingOver
                  ? 'border-m3-sys-primary bg-m3-sys-primaryContainer/30 scale-[1.02]'
                  : 'border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainer/40 hover:border-m3-sys-primary/60'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs text-m3-sys-onSurfaceVariant">
                <span className="material-symbols-rounded text-base text-m3-sys-primary">
                  upload_file
                </span>
                <span className="text-[11px]">
                  Glissez-déposez un <strong>dossier</strong> ou un fichier <strong>.zip / .yml</strong>
                </span>
              </div>
            </div>

            {/* Active Bundle View */}
            {loadedBundle ? (
              <div className="space-y-4">
                {/* Bundle Status Card */}
                <div className="bg-m3-sys-surfaceContainer rounded-2xl p-3.5 border border-m3-sys-outlineVariant/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="material-symbols-rounded text-lg text-m3-sys-primary">
                        folder_zip
                      </span>
                      <span className="text-xs font-bold text-m3-sys-onSurface truncate">
                        {loadedBundle.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                      Actif
                    </span>
                  </div>

                  {/* Batch Export Button */}
                  <button
                    onClick={() => setIsBatchExportModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-m3-sys-primary to-indigo-600 text-white font-bold text-xs shadow-m3-2 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-base leading-none">bolt</span>
                    <span>Batch Export (Export par lot)</span>
                  </button>
                </div>

                {/* 1. MASTER ITEM */}
                {loadedBundle.master && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant px-1">
                      <span className="flex items-center space-x-1">
                        <span className="material-symbols-rounded text-sm text-indigo-400">
                          star
                        </span>
                        <span>Master Preset</span>
                      </span>
                      <span className="text-[10px] font-mono lowercase text-m3-sys-onSurfaceVariant/70">
                        master.yml
                      </span>
                    </div>

                    <div
                      onClick={() => applyBundleItem(loadedBundle.master!)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        activeBundleItemId === loadedBundle.master.id
                          ? 'border-indigo-500 bg-indigo-500/15 shadow-sm'
                          : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-rounded text-base">palette</span>
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-m3-sys-onSurface truncate">
                            {loadedBundle.master.name}
                          </p>
                          <p className="text-[10px] text-m3-sys-onSurfaceVariant">
                            Configuration de base
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          saveBundleItemToDisk(loadedBundle.master!);
                        }}
                        title={
                          isItemDirty(loadedBundle.master.id)
                            ? 'Modifications non enregistrées — Cliquer pour sauvegarder dans master.yml'
                            : 'Sauvegarder dans master.yml'
                        }
                        className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
                          isItemDirty(loadedBundle.master.id)
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white shadow-sm animate-pulse'
                            : activeBundleItemId === loadedBundle.master.id
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25'
                            : 'text-m3-sys-onSurfaceVariant/40 hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest'
                        }`}
                      >
                        <span className="material-symbols-rounded text-base">save</span>
                      </button>
                    </div>

                    <button
                      onClick={handleUpdateMasterFromCanvas}
                      title="Enregistrer le canvas actuel dans master.yml sur le disque"
                      className="w-full py-1.5 px-3 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-indigo-500/20 text-indigo-400 text-[11px] font-semibold transition-all flex items-center justify-center space-x-1.5 border border-m3-sys-outlineVariant/30 cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-sm">save</span>
                      <span>Enregistrer le Canvas comme Master</span>
                    </button>
                  </div>
                )}

                {/* 2. OVERRIDES */}
                {Object.keys(loadedBundle.overrides).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant px-1">
                      <span className="flex items-center space-x-1">
                        <span className="material-symbols-rounded text-sm text-amber-400">
                          tune
                        </span>
                        <span>Overrides partagés</span>
                      </span>
                      <span className="text-[10px] font-mono lowercase text-m3-sys-onSurfaceVariant/70">
                        overrides/
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {Object.values(loadedBundle.overrides).map(override => (
                        <div
                          key={override.id}
                          onClick={() => applyBundleItem(override)}
                          className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            activeBundleItemId === override.id
                              ? 'border-amber-500 bg-amber-500/15 shadow-sm'
                              : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-rounded text-sm">tune</span>
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-m3-sys-onSurface truncate">
                                {override.name}
                              </p>
                              <p className="text-[10px] font-mono text-m3-sys-onSurfaceVariant truncate">
                                {override.slug}.yml
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              saveBundleItemToDisk(override);
                            }}
                            title={
                              isItemDirty(override.id)
                                ? `Modifications non enregistrées — Cliquer pour sauvegarder dans ${override.slug}.yml`
                                : `Sauvegarder dans ${override.slug}.yml`
                            }
                            className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
                              isItemDirty(override.id)
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white shadow-sm animate-pulse'
                                : activeBundleItemId === override.id
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                : 'text-m3-sys-onSurfaceVariant/40 hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest'
                            }`}
                          >
                            <span className="material-symbols-rounded text-base">save</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. VARIANTS (Grouped by Language or Subfolder) */}
                {Object.keys(groupedVariants).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant px-1">
                      <span className="flex items-center space-x-1">
                        <span className="material-symbols-rounded text-sm text-emerald-400">
                          translate
                        </span>
                        <span>Variantes</span>
                      </span>
                      <button
                        onClick={() => setIsNewVariantModalOpen(true)}
                        title="Créer une nouvelle déclinaison / variante"
                        className="px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-rounded text-xs">add</span>
                        <span>Décliner</span>
                      </button>
                    </div>

                    {Object.entries(groupedVariants).map(([langKey, variants]) => (
                      <div key={langKey} className="space-y-1.5">
                        <div className="flex items-center space-x-1.5 px-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                            {langKey}
                          </span>
                          <span className="text-[11px] text-m3-sys-onSurfaceVariant font-medium">
                            ({variants.length} déclinaisons)
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {variants.map(variant => (
                            <div
                              key={variant.id}
                              onClick={() => applyBundleItem(variant)}
                              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                activeBundleItemId === variant.id
                                  ? 'border-emerald-500 bg-emerald-500/15 shadow-sm'
                                  : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 overflow-hidden">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                  <span className="material-symbols-rounded text-sm">flag</span>
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-m3-sys-onSurface truncate">
                                    {variant.name}
                                  </p>
                                  <p className="text-[10px] font-mono text-m3-sys-onSurfaceVariant truncate">
                                    {variant.path}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  saveBundleItemToDisk(variant);
                                }}
                                title={
                                  isItemDirty(variant.id)
                                    ? `Modifications non enregistrées — Cliquer pour sauvegarder dans ${variant.path}`
                                    : `Sauvegarder dans ${variant.path}`
                                }
                                className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
                                  isItemDirty(variant.id)
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white shadow-sm animate-pulse'
                                    : activeBundleItemId === variant.id
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'text-m3-sys-onSurfaceVariant/40 hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest'
                                }`}
                              >
                                <span className="material-symbols-rounded text-base">save</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-m3-sys-surfaceContainer rounded-2xl p-4 border border-m3-sys-outlineVariant/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-m3-sys-primary/10 text-m3-sys-primary mx-auto flex items-center justify-center">
                  <span className="material-symbols-rounded text-2xl">folder_zip</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-m3-sys-onSurface">
                    Aucun Bundle actif
                  </h4>
                  <p className="text-[11px] text-m3-sys-onSurfaceVariant mt-1">
                    Ouvrez un dossier de bundle existant sur votre disque, importez une archive ZIP ou exportez votre canvas actuel ci-dessous.
                  </p>
                </div>
                <div className="flex justify-center space-x-2 pt-1">
                  <button
                    onClick={handleOpenDirectory}
                    className="px-3.5 py-1.5 rounded-full bg-m3-sys-primary text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    <span className="material-symbols-rounded text-sm">folder_open</span>
                    <span>Ouvrir un dossier</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CUSTOM IDS (CALQUES & VARIABLES) */}
        {activeLeftTab === 'customIds' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-m3-sys-onSurface">
                  Mapping des Identifiants
                </h3>
                <p className="text-[11px] text-m3-sys-onSurfaceVariant">
                  {state.elements.length} élément{state.elements.length > 1 ? 's' : ''} sur le canvas
                </p>
              </div>

              <button
                onClick={autoGenerateCustomIds}
                title="Générer automatiquement des IDs personnalisés pour les éléments sans ID"
                className="px-2.5 py-1.5 rounded-full bg-m3-sys-primary/10 hover:bg-m3-sys-primary/20 text-m3-sys-primary text-[11px] font-semibold transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
              >
                <span className="material-symbols-rounded text-sm">magic_button</span>
                <span>Auto-ID</span>
              </button>
            </div>

            {/* Elements List with Custom ID inputs */}
            <div className="space-y-2.5">
              {state.elements.map((el: CanvasElement) => {
                const isSelected = state.selectedElementIds ? state.selectedElementIds.includes(el.id) : state.selectedElementId === el.id;
                const selectionIndex = state.selectedElementIds && isSelected ? state.selectedElementIds.indexOf(el.id) + 1 : undefined;
                const isText = el.type === 'text';
                const isDevice = el.type === 'device';

                let iconName = 'category';
                let elementLabel = 'Élément';

                if (isText) {
                  iconName = 'title';
                  elementLabel = el.text || 'Texte sans contenu';
                } else if (isDevice) {
                  iconName = el.deviceType === 'pixel-tab' ? 'tablet_android' : 'smartphone';
                  elementLabel = `Appareil (${el.deviceType})`;
                } else {
                  elementLabel = `Forme (${el.shapeType})`;
                }

                return (
                  <div
                    key={el.id}
                    onClick={e => selectElement(el.id, e.ctrlKey || e.metaKey)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'border-m3-sys-primary bg-m3-sys-primaryContainer/20 shadow-sm'
                        : 'border-m3-sys-outlineVariant/30 bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {selectionIndex !== undefined && (state.selectedElementIds?.length || 0) > 1 && (
                          <span className="w-4 h-4 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {selectionIndex}
                          </span>
                        )}
                        <span className="material-symbols-rounded text-base text-m3-sys-primary flex-shrink-0">
                          {iconName}
                        </span>
                        <span className="text-xs font-semibold text-m3-sys-onSurface truncate">
                          {elementLabel}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteElement(el.id);
                          }}
                          title="Supprimer cet élément"
                          className="w-6 h-6 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-rounded text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Custom ID input */}
                    <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                      <span className="text-[10px] font-mono text-m3-sys-onSurfaceVariant flex-shrink-0">
                        customId:
                      </span>
                      <input
                        type="text"
                        value={el.customId || ''}
                        onChange={e => updateElementCustomId(el.id, e.target.value)}
                        placeholder="ex: title, badge, hero_device..."
                        className="flex-1 px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/40 text-m3-sys-onSurface focus:ring-1 focus:ring-m3-sys-primary focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}

              {state.elements.length === 0 && (
                <div className="p-6 text-center text-xs text-m3-sys-onSurfaceVariant bg-m3-sys-surfaceContainer rounded-2xl border border-m3-sys-outlineVariant/30">
                  Aucun élément sur le canvas. Ajoutez du texte ou des formes pour leur attribuer un custom ID.
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-m3-sys-surfaceContainer rounded-2xl p-3.5 border border-m3-sys-outlineVariant/30 space-y-1.5 text-xs text-m3-sys-onSurfaceVariant">
              <p className="font-bold text-m3-sys-onSurface flex items-center space-x-1">
                <span className="material-symbols-rounded text-sm text-m3-sys-primary">help</span>
                <span>Comment utiliser les Custom IDs ?</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Les IDs permettent de cibler précisément un élément dans les fichiers YAML du bundle :
              </p>
              <div className="bg-m3-sys-surfaceContainerHighest p-2 rounded-xl font-mono text-[10px] space-y-1">
                <p className="text-indigo-400">content:</p>
                <p className="pl-3 text-emerald-400">main_title: "Mon titre"</p>
                <p className="text-indigo-400">elements:</p>
                <p className="pl-3 text-emerald-400">hero_badge:</p>
                <p className="pl-6 text-amber-400">solidColor: "#ff0000"</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Modal to create a new variant */}
      <NewVariantModal
        isOpen={isNewVariantModalOpen}
        onClose={() => setIsNewVariantModalOpen(false)}
      />
    </>
  );
};
