import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BackgroundConfig,
  CanvasElement,
  ExportZone,
  SyncStatus,
  LoadedBundle,
  BannerMasterConfig,
  BannerOverrideConfig,
  TextElementModel,
  DeviceElementModel,
  ShapeElementModel
} from '../types';
import {
  serializeCanvasToMaster,
  serializeCanvasToOverride,
  serializeCanvasToVariant,
  resolveComposition
} from '../utils/templateEngine';
import { stringifyYaml, parseYaml } from '../utils/yamlHelper';
import {
  writeTextToDirectory,
  downloadFile,
  verifyDirectoryPermission,
  saveDirectoryHandleToIdb,
  getDirectoryHandleFromIdb,
  removeDirectoryHandleFromIdb,
  readDirectoryBundle
} from '../utils/bundleIo';
import { assetManager, convertUrlsToRelativeAssetPaths } from '../utils/assetManager';

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'banner_template'
  );
}

export function computeCanvasSignature(
  bg: BackgroundConfig,
  els: CanvasElement[],
  zone: ExportZone,
  w?: number,
  h?: number,
  name?: string
): string {
  return JSON.stringify({
    name: name || 'Projet sans nom',
    bg: {
      ...bg,
      imageUrl: assetManager.getAssetPathFromUrl(bg.imageUrl) || bg.imageUrl
    },
    els: els.map(e => {
      if (e.type === 'text') {
        const t = e as TextElementModel;
        return {
          id: t.id,
          customId: t.customId,
          type: t.type,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          rotation: t.rotation,
          opacity: t.opacity,
          text: t.text,
          fontSize: t.fontSize,
          fontFamily: t.fontFamily,
          color: t.color,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          textAlign: t.textAlign
        };
      } else if (e.type === 'device') {
        const d = e as DeviceElementModel;
        return {
          id: d.id,
          customId: d.customId,
          type: d.type,
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height,
          rotation: d.rotation,
          deviceType: d.deviceType,
          bodyColor: d.bodyColor,
          brushedMetal: d.brushedMetal,
          brushedMetalOpacity: d.brushedMetalOpacity,
          bodyThickness: d.bodyThickness,
          bodyThicknessPercent: d.bodyThicknessPercent,
          screenBorderColor: d.screenBorderColor,
          screenBorderWidth: d.screenBorderWidth,
          screenBorderWidthPercent: d.screenBorderWidthPercent,
          screenImageUrl: assetManager.getAssetPathFromUrl(d.screenImageUrl) || d.screenImageUrl,
          imageAspectRatio: d.imageAspectRatio,
          screenColor: d.screenColor,
          screenFit: d.screenFit,
          screenPadding: d.screenPadding,
          borderRadius: d.borderRadius,
          borderRadiusPercent: d.borderRadiusPercent,
          showButtons: d.showButtons,
          buttonColor: d.buttonColor,
          showCamera: d.showCamera,
          showHomeIndicator: d.showHomeIndicator,
          homeIndicatorColor: d.homeIndicatorColor,
          showFlare: d.showFlare,
          flareColor: d.flareColor,
          flareAngle: d.flareAngle,
          flareSpread: d.flareSpread,
          shadow: d.shadow ? { ...d.shadow } : undefined
        };
      } else {
        const s = e as ShapeElementModel;
        return {
          id: s.id,
          customId: s.customId,
          type: s.type,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          rotation: s.rotation,
          opacity: s.opacity,
          shapeType: s.shapeType,
          fillType: s.fillType,
          solidColor: s.solidColor,
          imageUrl: assetManager.getAssetPathFromUrl(s.imageUrl) || s.imageUrl,
          imageFit: s.imageFit,
          imageOffsetX: s.imageOffsetX,
          imageOffsetY: s.imageOffsetY,
          imageScale: s.imageScale
        };
      }
    }),
    zone: {
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      targetWidth: zone.targetWidth,
      targetHeight: zone.targetHeight
    },
    w,
    h
  });
}

interface UseDiskSyncOptions {
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  loadedBundle: LoadedBundle | null;
  activeBundleItemId: string | null;
  setCanvasWidth: (w: number) => void;
  setCanvasHeight: (h: number) => void;
  setBackground: (bg: BackgroundConfig) => void;
  setElements: (els: CanvasElement[]) => void;
  setExportZone: (zone: ExportZone) => void;
  setLoadedBundleState: React.Dispatch<React.SetStateAction<LoadedBundle | null>>;
  markItemSaved: (itemId: string) => void;
  showSnackbar: (message: string, icon?: string) => void;
  centerCanvas?: (w?: number, h?: number, autoFit?: boolean) => void;
  initialBackground: BackgroundConfig;
  initialExportZone: ExportZone;
}

export function useDiskSync({
  canvasWidth,
  canvasHeight,
  background,
  elements,
  exportZone,
  loadedBundle,
  activeBundleItemId,
  setCanvasWidth,
  setCanvasHeight,
  setBackground,
  setElements,
  setExportZone,
  setLoadedBundleState,
  markItemSaved,
  showSnackbar,
  centerCanvas,
  initialBackground,
  initialExportZone
}: UseDiskSyncOptions) {
  // Project Name & Subtitle
  const [projectName, setProjectNameState] = useState<string>(() => {
    return localStorage.getItem('framemyapp_project_name') || 'Projet sans nom';
  });
  const [previousSyncFilePath, setPreviousSyncFilePath] = useState<string | null>(() => {
    return localStorage.getItem('framemyapp_prev_sync_file') || null;
  });

  // Synchronization state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isAutoSyncEnabled, setIsAutoSyncEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('framemyapp_auto_sync') !== 'false';
  });
  const [syncDirectoryHandle, setSyncDirectoryHandleState] = useState<any>(null);
  const syncDirHandleRef = useRef<any>(null);
  const [syncDirectoryName, setSyncDirectoryNameState] = useState<string | null>(() => {
    return localStorage.getItem('framemyapp_sync_dir_name') || null;
  });
  const [syncFilePath, setSyncFilePathState] = useState<string | null>(() => {
    return localStorage.getItem('framemyapp_sync_file_path') || null;
  });
  const [syncFileHandle, setSyncFileHandleState] = useState<any>(null);
  const syncFileHandleRef = useRef<any>(null);

  // Permission recovery modal state when permissions are lost across sessions
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [permissionTargetName, setPermissionTargetName] = useState<string>('');
  const pendingDiskHandleRef = useRef<any>(null);

  const lastSavedSignatureRef = useRef<string>('');
  const autoSyncTimerRef = useRef<any>(null);
  const isInitialLoadCompleteRef = useRef<boolean>(false);

  // Setters for synchronization
  const setIsAutoSyncEnabled = useCallback((enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
    try {
      localStorage.setItem('framemyapp_auto_sync', String(enabled));
    } catch {}
  }, []);

  const setSyncDirectoryHandle = useCallback((handle: any) => {
    syncDirHandleRef.current = handle;
    setSyncDirectoryHandleState(handle);
    if (handle) {
      saveDirectoryHandleToIdb(handle, 'sync_dir_handle');
    }
  }, []);

  const setSyncDirectoryName = useCallback((name: string | null) => {
    setSyncDirectoryNameState(name);
    if (name) {
      localStorage.setItem('framemyapp_sync_dir_name', name);
    } else {
      localStorage.removeItem('framemyapp_sync_dir_name');
    }
  }, []);

  const setSyncFilePath = useCallback((path: string | null) => {
    setSyncFilePathState(path);
    if (path) {
      localStorage.setItem('framemyapp_sync_file_path', path);
    } else {
      localStorage.removeItem('framemyapp_sync_file_path');
    }
  }, []);

  const setSyncFileHandle = useCallback((handle: any) => {
    syncFileHandleRef.current = handle;
    setSyncFileHandleState(handle);
    if (handle) {
      saveDirectoryHandleToIdb(handle, 'sync_file_handle');
    }
  }, []);

  const setProjectName = useCallback(
    (name: string) => {
      const val = name.trim() || 'Projet sans nom';
      setProjectNameState(val);
      try {
        localStorage.setItem('framemyapp_project_name', val);
      } catch {}

      if (loadedBundle) {
        setLoadedBundleState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            name: val,
            master: prev.master ? { ...prev.master, name: val } : null
          };
        });
      }

      const isBundleSubItem = Boolean(
        loadedBundle && activeBundleItemId && loadedBundle.master?.id !== activeBundleItemId
      );
      if (!isBundleSubItem) {
        const newFilename = `${slugifyFilename(val)}.yml`;
        setSyncFilePathState(currentPath => {
          if (currentPath && currentPath !== newFilename && currentPath !== 'master.yml') {
            setPreviousSyncFilePath(currentPath);
            try {
              localStorage.setItem('framemyapp_prev_sync_file', currentPath);
            } catch {}
          }
          try {
            localStorage.setItem('framemyapp_sync_file_path', newFilename);
          } catch {}
          return newFilename;
        });
      }

      setSyncStatus('dirty');
    },
    [loadedBundle, activeBundleItemId, setLoadedBundleState]
  );

  const loadFromDiskHandle = useCallback(
    async (handle: any, isCancelled = false): Promise<boolean> => {
      if (!handle || isCancelled) return false;

      let loadedConfig: any = null;
      let loadedName = '';

      const isDir = handle.kind === 'directory' || typeof handle.getFileHandle === 'function';

      if (isDir) {
        let bundle: any = null;
        try {
          bundle = await readDirectoryBundle(handle);
          if (bundle && bundle.master) {
            setLoadedBundleState(bundle);
            const masterConfig = bundle.master.config as BannerMasterConfig;
            if (masterConfig) {
              loadedConfig = resolveComposition(
                masterConfig,
                undefined,
                undefined,
                bundle.assets,
                bundle.master.path
              );
              loadedName = bundle.master.name || bundle.name;
            }
          }
        } catch (e) {
          console.warn('readDirectoryBundle failed:', e);
        }

        if (!loadedConfig) {
          const targetFile = syncFilePath || `${slugifyFilename(projectName)}.yml`;
          try {
            const fHandle = await handle.getFileHandle(targetFile);
            const file = await fHandle.getFile();
            const text = await file.text();
            const rawConfig = parseYaml<BannerMasterConfig>(text);
            loadedConfig = resolveComposition(
              rawConfig,
              undefined,
              undefined,
              bundle?.assets || {},
              targetFile
            );
            loadedName = rawConfig.name || targetFile.replace(/\.(ya?ml|json)$/i, '');
          } catch (e) {
            console.warn(`Fichier ${targetFile} non encore présent sur disque:`, e);
          }
        }
      } else {
        // File handle
        try {
          const file = await handle.getFile();
          const text = await file.text();
          const rawConfig = parseYaml<BannerMasterConfig>(text);
          loadedConfig = resolveComposition(rawConfig, undefined, undefined, {}, handle.name);
          loadedName = rawConfig.name || handle.name.replace(/\.(ya?ml|json)$/i, '');
        } catch (e) {
          console.warn('getFile on fileHandle failed:', e);
        }
      }

      if (loadedConfig && !isCancelled) {
        const targetW = loadedConfig.canvasWidth || loadedConfig.exportZone?.width || 800;
        const targetH = loadedConfig.canvasHeight || loadedConfig.exportZone?.height || 600;
        const restoredBg = loadedConfig.background
          ? { ...initialBackground, ...loadedConfig.background }
          : initialBackground;
        const restoredElements = loadedConfig.elements || [];
        const restoredZone = loadedConfig.exportZone
          ? { ...initialExportZone, ...loadedConfig.exportZone }
          : initialExportZone;

        setBackground(restoredBg);
        setElements(restoredElements);
        setExportZone(restoredZone);
        setCanvasWidth(targetW);
        setCanvasHeight(targetH);

        centerCanvas?.(targetW, targetH, true);

        if (loadedName) {
          setProjectNameState(loadedName);
        }

        const restoredSig = computeCanvasSignature(
          restoredBg,
          restoredElements,
          restoredZone,
          targetW,
          targetH,
          loadedName || projectName
        );
        lastSavedSignatureRef.current = restoredSig;
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        showSnackbar(`Projet restauré depuis le disque : ${loadedName || 'YAML'}`, 'cloud_done');
        return true;
      }

      return false;
    },
    [
      syncFilePath,
      projectName,
      initialBackground,
      initialExportZone,
      setBackground,
      setElements,
      setExportZone,
      setCanvasWidth,
      setCanvasHeight,
      centerCanvas,
      setProjectNameState,
      setLoadedBundleState,
      showSnackbar
    ]
  );

  // Restore on mount from IndexedDB & Disk
  useEffect(() => {
    let isCancelled = false;

    async function restoreFromDisk() {
      try {
        const dirHandle =
          (await getDirectoryHandleFromIdb('sync_dir_handle')) ||
          (await getDirectoryHandleFromIdb('root_bundle_dir'));
        const fileHandle = await getDirectoryHandleFromIdb('sync_file_handle');

        const activeHandle = dirHandle || fileHandle;
        if (!activeHandle) {
          // No saved disk handle: user starts normally. Restore local draft if any.
          try {
            const draftJson = localStorage.getItem('framemyapp_draft_project');
            if (draftJson) {
              const draft = JSON.parse(draftJson);
              if (draft && draft.elements && draft.elements.length > 0) {
                if (draft.background) {
                  const bg = { ...draft.background };
                  if (bg.imageUrl?.startsWith('blob:')) bg.imageUrl = '';
                  setBackground(bg);
                }
                const cleanEls = draft.elements.map((el: any) => ({
                  ...el,
                  screenImageUrl: el.screenImageUrl?.startsWith('blob:') ? '' : el.screenImageUrl,
                  imageUrl: el.imageUrl?.startsWith('blob:') ? '' : el.imageUrl
                }));
                setElements(cleanEls);
                if (draft.exportZone) setExportZone(draft.exportZone);
                if (draft.canvasWidth) setCanvasWidth(draft.canvasWidth);
                if (draft.canvasHeight) setCanvasHeight(draft.canvasHeight);
              }
            }
          } catch {}
          return;
        }

        if (dirHandle) {
          syncDirHandleRef.current = dirHandle;
          setSyncDirectoryHandleState(dirHandle);
          setSyncDirectoryName(dirHandle.name);
        }
        if (fileHandle) {
          syncFileHandleRef.current = fileHandle;
          setSyncFileHandleState(fileHandle);
        }

        // Check permission passively (no browser prompt)
        const hasPerm = await verifyDirectoryPermission(activeHandle, false, false);
        if (hasPerm) {
          // Permissions are still valid: load from disk immediately
          await loadFromDiskHandle(activeHandle, isCancelled);
        } else {
          // Permissions were revoked/lost across sessions!
          // Open the modal asking the user to authorize or start new document
          pendingDiskHandleRef.current = activeHandle;
          setPermissionTargetName(activeHandle.name || 'Projet local');
          setIsPermissionModalOpen(true);
        }
      } catch (err) {
        console.warn('Erreur lors de la vérification du disque au démarrage:', err);
      } finally {
        if (!isCancelled) {
          isInitialLoadCompleteRef.current = true;
        }
      }
    }

    restoreFromDisk();

    return () => {
      isCancelled = true;
    };
  }, [loadFromDiskHandle, setBackground, setElements, setExportZone, setCanvasWidth, setCanvasHeight]);

  const authorizeDiskAccess = useCallback(async () => {
    const handle = pendingDiskHandleRef.current || syncDirHandleRef.current || syncFileHandleRef.current;
    if (!handle) {
      setIsPermissionModalOpen(false);
      return;
    }

    // Called on user click: requestIfPrompt = true, allowed by browser!
    const granted = await verifyDirectoryPermission(handle, true, true);
    if (granted) {
      setIsPermissionModalOpen(false);

      if (
        handle.kind === 'file' &&
        !syncDirHandleRef.current &&
        typeof window !== 'undefined' &&
        'showDirectoryPicker' in window
      ) {
        try {
          showSnackbar('Sélectionnez le dossier parent pour charger les images (assets/)...', 'folder');
          const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
          if (dirHandle) {
            await verifyDirectoryPermission(dirHandle, true, true);
            syncDirHandleRef.current = dirHandle;
            setSyncDirectoryHandleState(dirHandle);
            setSyncDirectoryName(dirHandle.name);
            saveDirectoryHandleToIdb(dirHandle, 'sync_dir_handle');
            saveDirectoryHandleToIdb(dirHandle, 'root_bundle_dir');
            await loadFromDiskHandle(dirHandle, false);
            showSnackbar(`Dossier et assets connectés : ${dirHandle.name}`, 'folder_open');
            return;
          }
        } catch (e: any) {
          if (e.name !== 'AbortError') console.warn('showDirectoryPicker error in authorizeDiskAccess:', e);
        }
      }

      await loadFromDiskHandle(handle, false);
      showSnackbar(`Accès autorisé : ${handle.name}`, 'folder_open');
    } else {
      showSnackbar('Permission refusée par le navigateur', 'warning');
    }
  }, [loadFromDiskHandle, showSnackbar]);

  const dismissDiskAccessAndStartNew = useCallback(() => {
    setIsPermissionModalOpen(false);
    pendingDiskHandleRef.current = null;
    syncDirHandleRef.current = null;
    syncFileHandleRef.current = null;
    setSyncDirectoryHandleState(null);
    setSyncDirectoryName(null);
    setSyncFileHandleState(null);
    setSyncFilePathState(null);
    removeDirectoryHandleFromIdb('sync_dir_handle');
    removeDirectoryHandleFromIdb('root_bundle_dir');
    removeDirectoryHandleFromIdb('sync_file_handle');
    try {
      localStorage.removeItem('framemyapp_sync_dir_name');
      localStorage.removeItem('framemyapp_sync_file_path');
      localStorage.removeItem('framemyapp_draft_project');
    } catch {}
    // Reset canvas to blank
    setBackground(initialBackground);
    setElements([]);
    setExportZone(initialExportZone);
    setCanvasWidth(800);
    setCanvasHeight(600);
    centerCanvas?.(800, 600, true);
    showSnackbar('Nouveau document vierge démarré', 'note_add');
  }, [
    initialBackground,
    initialExportZone,
    setBackground,
    setElements,
    setExportZone,
    setCanvasWidth,
    setCanvasHeight,
    centerCanvas,
    setSyncDirectoryName,
    setSyncFilePath,
    showSnackbar
  ]);

  const selectSyncDirectory = useCallback(async (): Promise<boolean> => {
    const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    if (!hasFsSupport) {
      showSnackbar('Votre navigateur ne prend pas en charge le sélecteur de dossier natif', 'error');
      return false;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'desktop'
      });
      if (handle) {
        await verifyDirectoryPermission(handle, true, true);
        syncDirHandleRef.current = handle;
        setSyncDirectoryHandle(handle);
        setSyncDirectoryName(handle.name);
        if (!syncFilePath) {
          const defaultPath = `${slugifyFilename(projectName)}.yml`;
          setSyncFilePath(defaultPath);
        }
        showSnackbar(`Dossier de synchronisation connecté : ${handle.name}`, 'folder');
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('selectSyncDirectory error:', err);
      showSnackbar(`Impossible d'accéder au dossier : ${err.message || ''}`, 'error');
    }
    return false;
  }, [projectName, syncFilePath, setSyncDirectoryHandle, setSyncDirectoryName, setSyncFilePath, showSnackbar]);

  const selectSyncFile = useCallback(async (): Promise<boolean> => {
    const hasFsSupport = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
    if (!hasFsSupport) {
      showSnackbar('Votre navigateur ne prend pas en charge le sélecteur de fichier natif', 'error');
      return false;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Fichiers YAML / JSON de Template',
            accept: {
              'text/yaml': ['.yml', '.yaml'],
              'application/json': ['.json']
            }
          }
        ]
      });
      if (handle) {
        await verifyDirectoryPermission(handle, true, true);
        syncFileHandleRef.current = handle;
        setSyncFileHandle(handle);
        setSyncFilePath(handle.name);
        saveDirectoryHandleToIdb(handle, 'sync_file_handle');

        const file = await handle.getFile();
        const raw = await file.text();
        const config = parseYaml<BannerMasterConfig>(raw);
        const name = config.name || handle.name.replace(/\.(ya?ml|json)$/i, '');
        setProjectName(name);

        // Prompt user to select parent folder so images/assets can be loaded and synchronized
        try {
          showSnackbar('Sélectionnez le dossier parent pour charger les images (assets/)...', 'folder');
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: handle
          });
          if (dirHandle) {
            await verifyDirectoryPermission(dirHandle, true, true);
            syncDirHandleRef.current = dirHandle;
            setSyncDirectoryHandle(dirHandle);
            setSyncDirectoryName(dirHandle.name);
            saveDirectoryHandleToIdb(dirHandle, 'sync_dir_handle');
            saveDirectoryHandleToIdb(dirHandle, 'root_bundle_dir');
            await loadFromDiskHandle(dirHandle, false);
            showSnackbar(`Template et dossier connectés : ${dirHandle.name}`, 'folder_open');
            return true;
          }
        } catch (dirErr: any) {
          if (dirErr.name !== 'AbortError') console.warn('Directory picker failed:', dirErr);
        }

        // If directory was not chosen, load file config into canvas
        await loadFromDiskHandle(handle, false);
        showSnackbar(`Fichier connecté pour la synchro : ${handle.name}`, 'file_open');
        return true;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('selectSyncFile error:', err);
      showSnackbar(`Impossible d'accéder au fichier : ${err.message || ''}`, 'error');
    }
    return false;
  }, [setProjectName, setSyncFileHandle, setSyncFilePath, showSnackbar, loadFromDiskHandle]);

  const syncToDisk = useCallback(async (): Promise<boolean> => {
    setSyncStatus('syncing');

    try {
      let yamlContent = '';
      let targetFilename = syncFilePath;

      if (loadedBundle && activeBundleItemId) {
        const item =
          (loadedBundle.master?.id === activeBundleItemId ? loadedBundle.master : null) ||
          loadedBundle.overrides[activeBundleItemId] ||
          loadedBundle.variants.find(v => v.id === activeBundleItemId);

        if (item) {
          if (item.type === 'master') {
            const masterConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToMaster(
                projectName || item.name || 'Master',
                background,
                elements,
                exportZone,
                canvasWidth,
                canvasHeight
              ),
              loadedBundle?.assets
            );
            yamlContent = stringifyYaml(masterConfig);
          } else if (item.type === 'override') {
            const overrideConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToOverride(
                item,
                background,
                elements,
                exportZone,
                loadedBundle.master?.config as BannerMasterConfig | undefined
              ),
              loadedBundle?.assets
            );
            yamlContent = stringifyYaml(overrideConfig);
          } else {
            const variantConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToVariant(
                item,
                elements,
                loadedBundle.master?.config as BannerMasterConfig | undefined,
                loadedBundle.overrides[item.slug]?.config as BannerOverrideConfig | undefined
              ),
              loadedBundle?.assets
            );
            yamlContent = stringifyYaml(variantConfig);
          }
          targetFilename = item.path;
        }
      }

      if (!yamlContent) {
        const masterConfig = convertUrlsToRelativeAssetPaths(
          serializeCanvasToMaster(
            projectName || 'Projet sans nom',
            background,
            elements,
            exportZone,
            canvasWidth,
            canvasHeight
          ),
          loadedBundle?.assets
        );
        yamlContent = stringifyYaml(masterConfig);
        if (!targetFilename) {
          targetFilename = `${slugifyFilename(projectName)}.yml`;
          setSyncFilePath(targetFilename);
        }
      }

      let targetFileHandle = syncFileHandleRef.current || syncFileHandle;
      let targetDirHandle =
        syncDirHandleRef.current ||
        syncDirectoryHandle ||
        loadedBundle?.directoryHandle;

      const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

      if (!targetDirHandle && !targetFileHandle && hasFsSupport) {
        try {
          targetDirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'desktop'
          });
          if (targetDirHandle) {
            syncDirHandleRef.current = targetDirHandle;
            setSyncDirectoryHandle(targetDirHandle);
            setSyncDirectoryName(targetDirHandle.name);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setSyncStatus('dirty');
            return false;
          }
        }
      }

      if (targetDirHandle) {
        await verifyDirectoryPermission(targetDirHandle, true, true);
        await assetManager.saveAllToDirectory(targetDirHandle);
      }

      if (targetFileHandle) {
        await verifyDirectoryPermission(targetFileHandle, true, true);
        if (
          typeof (targetFileHandle as any).move === 'function' &&
          targetFilename &&
          targetFileHandle.name !== targetFilename
        ) {
          try {
            await (targetFileHandle as any).move(targetFilename);
          } catch (e) {
            console.warn('File move not permitted:', e);
          }
        }
        const writable = await targetFileHandle.createWritable();
        await writable.write(yamlContent);
        await writable.close();
        showSnackbar(`Synchronisé sur le disque : ${targetFilename || targetFileHandle.name}`, 'cloud_done');
      } else if (targetDirHandle) {
        await verifyDirectoryPermission(targetDirHandle, true);
        await writeTextToDirectory(targetDirHandle, targetFilename || 'banner_template.yml', yamlContent);

        if (previousSyncFilePath && previousSyncFilePath !== targetFilename && previousSyncFilePath !== 'master.yml') {
          try {
            if (typeof targetDirHandle.removeEntry === 'function') {
              await targetDirHandle.removeEntry(previousSyncFilePath);
            }
          } catch (e) {
            console.warn('Could not remove previous file after rename:', e);
          }
          setPreviousSyncFilePath(null);
          try {
            localStorage.removeItem('framemyapp_prev_sync_file');
          } catch {}
        }

        showSnackbar(`Synchronisé dans ${targetDirHandle.name}/${targetFilename || 'banner_template.yml'}`, 'cloud_done');
      } else {
        downloadFile(targetFilename?.split('/').pop() || 'banner_template.yml', yamlContent, 'text/yaml');
        showSnackbar(`Fichier téléchargé : ${targetFilename || 'banner_template.yml'}`, 'download');
      }

      const currentSig = computeCanvasSignature(
        background,
        elements,
        exportZone,
        canvasWidth,
        canvasHeight,
        projectName
      );
      lastSavedSignatureRef.current = currentSig;
      if (activeBundleItemId) {
        markItemSaved(activeBundleItemId);
      }
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('Erreur lors de la synchronisation disque :', err);
      setSyncStatus('error');
      showSnackbar(`Erreur de synchronisation : ${err.message || 'Échec'}`, 'error');
      return false;
    }
  }, [
    syncFilePath,
    previousSyncFilePath,
    loadedBundle,
    activeBundleItemId,
    projectName,
    background,
    elements,
    exportZone,
    canvasWidth,
    canvasHeight,
    syncFileHandle,
    syncDirectoryHandle,
    setSyncDirectoryHandle,
    setSyncDirectoryName,
    setSyncFilePath,
    markItemSaved,
    showSnackbar
  ]);

  // Persistance continue du brouillon local de travail (cache navigateur avec sanitization des URLs)
  useEffect(() => {
    try {
      const sanitized = convertUrlsToRelativeAssetPaths(
        {
          canvasWidth,
          canvasHeight,
          background,
          elements,
          exportZone
        },
        loadedBundle?.assets
      );
      localStorage.setItem('framemyapp_draft_project', JSON.stringify(sanitized));
    } catch {}
  }, [canvasWidth, canvasHeight, background, elements, exportZone, loadedBundle?.assets]);

  // Canvas change detection & debounced auto-sync
  useEffect(() => {
    if (!isInitialLoadCompleteRef.current) {
      return;
    }

    const currentSig = computeCanvasSignature(
      background,
      elements,
      exportZone,
      canvasWidth,
      canvasHeight,
      projectName
    );

    if (!lastSavedSignatureRef.current) {
      lastSavedSignatureRef.current = currentSig;
      return;
    }

    if (currentSig !== lastSavedSignatureRef.current) {
      setSyncStatus('dirty');

      const hasTarget = Boolean(
        syncFileHandleRef.current ||
        syncFileHandle ||
        syncDirHandleRef.current ||
        syncDirectoryHandle ||
        loadedBundle?.directoryHandle
      );

      if (isAutoSyncEnabled && hasTarget) {
        if (autoSyncTimerRef.current) {
          clearTimeout(autoSyncTimerRef.current);
        }
        autoSyncTimerRef.current = setTimeout(() => {
          syncToDisk();
        }, 1500);
      }
    } else {
      setSyncStatus('synced');
    }

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [
    background,
    elements,
    exportZone,
    canvasWidth,
    canvasHeight,
    projectName,
    isAutoSyncEnabled,
    syncDirectoryHandle,
    syncFileHandle,
    loadedBundle,
    syncToDisk
  ]);

  return {
    projectName,
    setProjectName,
    syncStatus,
    setSyncStatus,
    lastSyncTime,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    syncDirectoryName,
    setSyncDirectoryName,
    syncFilePath,
    setSyncFilePath,
    syncDirectoryHandle,
    setSyncDirectoryHandle,
    syncFileHandle,
    setSyncFileHandle,
    selectSyncDirectory,
    selectSyncFile,
    syncToDisk,
    lastSavedSignatureRef,
    isPermissionModalOpen,
    permissionTargetName,
    authorizeDiskAccess,
    dismissDiskAccessAndStartNew
  };
}
