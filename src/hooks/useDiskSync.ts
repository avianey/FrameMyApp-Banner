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

export function extractAssetsFromElementsAndBackground(
  bg?: BackgroundConfig | null,
  els?: CanvasElement[] | null
): string[] {
  const assets: string[] = [];
  if (
    bg?.imageUrl &&
    !bg.imageUrl.startsWith('http://') &&
    !bg.imageUrl.startsWith('https://') &&
    !bg.imageUrl.startsWith('data:') &&
    !bg.imageUrl.startsWith('blob:')
  ) {
    assets.push(bg.imageUrl);
  }
  if (Array.isArray(els)) {
    for (const el of els) {
      if (el.type === 'device') {
        const d = el as DeviceElementModel;
        if (
          d.screenImageUrl &&
          !d.screenImageUrl.startsWith('http://') &&
          !d.screenImageUrl.startsWith('https://') &&
          !d.screenImageUrl.startsWith('data:') &&
          !d.screenImageUrl.startsWith('blob:')
        ) {
          assets.push(d.screenImageUrl);
        }
      } else if (el.type === 'shape') {
        const s = el as ShapeElementModel;
        if (
          s.imageUrl &&
          !s.imageUrl.startsWith('http://') &&
          !s.imageUrl.startsWith('https://') &&
          !s.imageUrl.startsWith('data:') &&
          !s.imageUrl.startsWith('blob:')
        ) {
          assets.push(s.imageUrl);
        }
      }
    }
  }
  return Array.from(new Set(assets));
}

interface UseDiskSyncOptions {
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  loadedBundle: LoadedBundle | null;
  loadedBundleRef?: React.MutableRefObject<LoadedBundle | null>;
  activeBundleItemId: string | null;
  activeBundleItemIdRef?: React.MutableRefObject<string | null>;
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
  loadedBundleRef,
  activeBundleItemId,
  activeBundleItemIdRef,
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

  // Permission recovery modal state when permissions are lost across sessions or assets need loading
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [permissionTargetName, setPermissionTargetName] = useState<string>('');
  const [permissionDetectedAssets, setPermissionDetectedAssets] = useState<string[]>([]);
  const [permissionTitle, setPermissionTitle] = useState<string | undefined>(undefined);
  const [permissionConfirmLabel, setPermissionConfirmLabel] = useState<string | undefined>(undefined);
  const [permissionCancelLabel, setPermissionCancelLabel] = useState<string | undefined>(undefined);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState<string | null>(null);
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

      const effectiveBundle = loadedBundleRef?.current ?? loadedBundle;
      const activeId = activeBundleItemIdRef?.current ?? activeBundleItemId;

      const isBundleSubItem = Boolean(
        effectiveBundle && activeId && effectiveBundle.master?.id !== activeId
      );

      if (effectiveBundle && !isBundleSubItem) {
        setLoadedBundleState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            name: val,
            master: prev.master ? { ...prev.master, name: val } : null
          };
        });
      }

      // If standalone project (no active bundle), sync file path tracks the project name
      if (!effectiveBundle && !isBundleSubItem) {
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
    [loadedBundle, loadedBundleRef, activeBundleItemId, activeBundleItemIdRef, setLoadedBundleState]
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
          const targetFile = syncFilePath || (projectName ? `${slugifyFilename(projectName)}.yml` : undefined);
          bundle = await readDirectoryBundle(handle, targetFile);
          if (bundle && bundle.master) {
            setLoadedBundleState(bundle);
            if (bundle.master.path) {
              setSyncFilePathState(bundle.master.path);
              try {
                localStorage.setItem('framemyapp_sync_file_path', bundle.master.path);
              } catch {}
            }
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

  const loadFromDiskHandleRef = useRef(loadFromDiskHandle);
  loadFromDiskHandleRef.current = loadFromDiskHandle;

  // Restore on mount from IndexedDB & Disk
  useEffect(() => {
    let isCancelled = false;

    async function restoreFromDisk() {
      try {
        const dirHandle =
          (await getDirectoryHandleFromIdb('sync_dir_handle')) ||
          (await getDirectoryHandleFromIdb('root_bundle_dir'));
        const fileHandle = await getDirectoryHandleFromIdb('sync_file_handle');

        if (isCancelled) return;

        const activeHandle = dirHandle || fileHandle;

        if (dirHandle) {
          syncDirHandleRef.current = dirHandle;
          setSyncDirectoryHandleState(dirHandle);
          setSyncDirectoryName(dirHandle.name);
        }
        if (fileHandle) {
          syncFileHandleRef.current = fileHandle;
          setSyncFileHandleState(fileHandle);
        }

        // 1. Détecter si le projet repris (depuis localStorage draft ou état courant) a des assets manquants
        let detectedDraftAssets: string[] = [];
        try {
          const reqStr = localStorage.getItem('framemyapp_required_assets');
          if (reqStr) {
            const parsedReq = JSON.parse(reqStr);
            if (Array.isArray(parsedReq)) detectedDraftAssets = parsedReq;
          }
        } catch {}

        try {
          const draftJson = localStorage.getItem('framemyapp_draft_project');
          if (draftJson) {
            const draft = JSON.parse(draftJson);
            if (draft && draft.elements && draft.elements.length > 0) {
              if (draft.background) {
                setBackground(draft.background);
              }
              setElements(draft.elements);
              if (draft.exportZone) setExportZone(draft.exportZone);
              if (draft.canvasWidth) setCanvasWidth(draft.canvasWidth);
              if (draft.canvasHeight) setCanvasHeight(draft.canvasHeight);
            }
            if (detectedDraftAssets.length === 0) {
              detectedDraftAssets = extractAssetsFromElementsAndBackground(draft.background, draft.elements);
            }
          }
        } catch {}

        if (detectedDraftAssets.length === 0) {
          detectedDraftAssets = extractAssetsFromElementsAndBackground(background, elements);
        }

        // 2. Si un handle existe, tester la permission passive
        if (activeHandle) {
          const hasPerm = await verifyDirectoryPermission(activeHandle, false, false);
          if (isCancelled) return;
          if (hasPerm) {
            await loadFromDiskHandleRef.current(activeHandle, isCancelled);
            return;
          }
        }

        const savedSyncFile = localStorage.getItem('framemyapp_sync_file_path');
        const savedSyncDir = localStorage.getItem('framemyapp_sync_dir_name');
        const savedProjectName = localStorage.getItem('framemyapp_project_name');

        const needsAssetsLoading = detectedDraftAssets.length > 0;
        const needsDiskReauth = Boolean(activeHandle || (savedSyncDir && savedSyncDir !== ''));

        // 3. Si des images locales sont requises OU si un projet/dossier est en attente d'autorisation
        if (needsAssetsLoading || needsDiskReauth) {
          pendingDiskHandleRef.current = activeHandle;
          const targetName =
            savedSyncFile ||
            (activeHandle ? activeHandle.name : null) ||
            savedSyncDir ||
            savedProjectName ||
            'Projet local';
          setPermissionTargetName(targetName);
          setPermissionDetectedAssets(detectedDraftAssets);
          setPermissionTitle(
            needsAssetsLoading
              ? 'Charger les images du template ?'
              : 'Reprendre le projet local ?'
          );
          setPermissionConfirmLabel(
            needsAssetsLoading
              ? 'Sélectionner le dossier du projet'
              : 'Autoriser l’accès'
          );
          setPermissionCancelLabel(
            needsAssetsLoading
              ? 'Continuer sans les images'
              : 'Nouveau document'
          );
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
  }, [setBackground, setElements, setExportZone, setCanvasWidth, setCanvasHeight]);

  const dismissPermissionModal = useCallback(() => {
    setIsPermissionModalOpen(false);
    setPermissionErrorMessage(null);
  }, []);

  const authorizeDiskAccess = useCallback(async (targetMode: 'suggested' | 'other' = 'suggested') => {
    setPermissionErrorMessage(null);
    const handle = pendingDiskHandleRef.current || syncDirHandleRef.current || syncFileHandleRef.current;
    let chosenDirHandle: any = null;

    // 1. Tenter la ré-autorisation active directe si c'est un directory handle existant
    if (handle && (handle.kind === 'directory' || typeof handle.getFileHandle === 'function')) {
      try {
        const granted = await verifyDirectoryPermission(handle, true, true);
        if (granted) {
          chosenDirHandle = handle;
        }
      } catch (err: any) {
        console.warn('verifyDirectoryPermission failed:', err);
      }
    }

    // 2. Si non accordé ou si besoin d'ouvrir le sélecteur, ouvrir avec startIn pré-sélectionné
    if (!chosenDirHandle && typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const startInDir =
          handle && handle.kind === 'directory'
            ? handle
            : 'documents';
        const pickerId =
          targetMode === 'suggested' ? 'framemyapp_assets_folder' : 'framemyapp_project_folder';
        chosenDirHandle = await (window as any).showDirectoryPicker({
          id: pickerId,
          mode: 'readwrite',
          startIn: startInDir
        });
        if (chosenDirHandle) {
          await verifyDirectoryPermission(chosenDirHandle, true, true);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return;
        }
        const msg =
          e.name === 'NotAllowedError'
            ? "L'autorisation d'accès aux dossiers a été refusée ou révoquée dans Chrome. Pour la réactiver, autorisez l'accès aux fichiers dans les paramètres de votre navigateur (icône 🔒 ou réglages du site à gauche de l'adresse) ou sélectionnez un autre dossier."
            : `Erreur d'accès au dossier : ${e.message || 'Non autorisé'}`;
        setPermissionErrorMessage(msg);
        throw e;
      }
    }

    if (chosenDirHandle) {
      setPermissionErrorMessage(null);
      setIsPermissionModalOpen(false);
      pendingDiskHandleRef.current = null;
      syncDirHandleRef.current = chosenDirHandle;
      setSyncDirectoryHandleState(chosenDirHandle);
      setSyncDirectoryName(chosenDirHandle.name);
      await saveDirectoryHandleToIdb(chosenDirHandle, 'sync_dir_handle');
      await saveDirectoryHandleToIdb(chosenDirHandle, 'root_bundle_dir');

      const targetFile = syncFilePath || `${slugifyFilename(projectName)}.yml`;
      const bundle = await readDirectoryBundle(chosenDirHandle, targetFile);
      setLoadedBundleState(bundle);
      if (bundle.master?.path) {
        setSyncFilePath(bundle.master.path);
      }

      await loadFromDiskHandle(chosenDirHandle, false);
      showSnackbar(`Template et dossier connectés : ${chosenDirHandle.name}`, 'folder_open');
    } else {
      showSnackbar('Permission refusée par le navigateur', 'warning');
    }
  }, [syncFilePath, projectName, setBackground, setElements, setLoadedBundleState, loadFromDiskHandle, setSyncFilePath, showSnackbar]);

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
      localStorage.removeItem('framemyapp_required_assets');
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

  const cancelAutoSync = useCallback(() => {
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
  }, []);

  const detachDiskSync = useCallback(() => {
    cancelAutoSync();
    syncDirHandleRef.current = null;
    syncFileHandleRef.current = null;
    pendingDiskHandleRef.current = null;
    setSyncDirectoryHandleState(null);
    setSyncDirectoryName(null);
    setSyncFileHandleState(null);
    setSyncFilePathState(null);
    setSyncStatus('synced');
    removeDirectoryHandleFromIdb('sync_dir_handle');
    removeDirectoryHandleFromIdb('root_bundle_dir');
    removeDirectoryHandleFromIdb('sync_file_handle');
    try {
      localStorage.removeItem('framemyapp_sync_dir_name');
      localStorage.removeItem('framemyapp_sync_file_path');
      localStorage.removeItem('framemyapp_draft_project');
      localStorage.removeItem('framemyapp_required_assets');
    } catch {}
  }, [cancelAutoSync, setSyncDirectoryName, setSyncStatus]);

  const isSyncPausedRef = useRef<boolean>(false);

  const pauseDiskSync = useCallback(() => {
    isSyncPausedRef.current = true;
    cancelAutoSync();
  }, [cancelAutoSync]);

  const resumeDiskSync = useCallback(() => {
    cancelAutoSync();
    isSyncPausedRef.current = false;
    const currentSig = computeCanvasSignature(
      background,
      elements,
      exportZone,
      canvasWidth,
      canvasHeight,
      projectName
    );
    lastSavedSignatureRef.current = currentSig;
    setSyncStatus('synced');
  }, [background, elements, exportZone, canvasWidth, canvasHeight, projectName, cancelAutoSync]);

  const selectSyncDirectory = useCallback(async (): Promise<boolean> => {
    const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
    if (!hasFsSupport) {
      showSnackbar('Votre navigateur ne prend pas en charge le sélecteur de dossier natif', 'error');
      return false;
    }
    try {
      const startInDir =
        syncDirHandleRef.current && syncDirHandleRef.current.kind === 'directory'
          ? syncDirHandleRef.current
          : 'documents';
      const handle = await (window as any).showDirectoryPicker({
        id: 'framemyapp_project_folder',
        mode: 'readwrite',
        startIn: startInDir
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
        id: 'framemyapp_file_picker',
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
            id: 'framemyapp_project_folder',
            mode: 'readwrite',
            startIn: 'documents'
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
    if (isSyncPausedRef.current) {
      return false;
    }

    setSyncStatus('syncing');

    try {
      let yamlContent = '';
      let targetFilename = syncFilePath;

      const effectiveBundle = loadedBundleRef?.current ?? loadedBundle;
      const activeId = activeBundleItemIdRef?.current ?? activeBundleItemId;

      if (effectiveBundle && activeId) {
        const overridesList = Object.values(effectiveBundle.overrides || {});
        const item: BundleItem | undefined =
          (effectiveBundle.master?.id === activeId ? effectiveBundle.master : undefined) ||
          overridesList.find(o => o.id === activeId || o.slug === activeId) ||
          effectiveBundle.variants?.find(v => v.id === activeId || v.slug === activeId);

        if (item) {
          if (item.type === 'master') {
            const masterConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToMaster(
                item.name || projectName || 'Master',
                background,
                elements,
                exportZone,
                canvasWidth,
                canvasHeight
              ),
              effectiveBundle.assets
            );
            yamlContent = stringifyYaml(masterConfig);
            item.config = masterConfig;
            item.rawContent = yamlContent;
          } else if (item.type === 'override') {
            const overrideConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToOverride(
                item,
                background,
                elements,
                exportZone,
                effectiveBundle.master?.config as BannerMasterConfig | undefined
              ),
              effectiveBundle.assets
            );
            yamlContent = stringifyYaml(overrideConfig);
            item.config = overrideConfig;
            item.rawContent = yamlContent;
          } else {
            const matchingOverride = effectiveBundle.overrides ? effectiveBundle.overrides[item.slug] : undefined;
            const variantConfig = convertUrlsToRelativeAssetPaths(
              serializeCanvasToVariant(
                item,
                elements,
                effectiveBundle.master?.config as BannerMasterConfig | undefined,
                matchingOverride?.config as BannerOverrideConfig | undefined
              ),
              effectiveBundle.assets
            );
            yamlContent = stringifyYaml(variantConfig);
            item.config = variantConfig;
            item.rawContent = yamlContent;
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
          effectiveBundle?.assets
        );
        yamlContent = stringifyYaml(masterConfig);
        if (!targetFilename) {
          targetFilename = effectiveBundle?.master?.path || `${slugifyFilename(projectName)}.yml`;
          setSyncFilePath(targetFilename);
        }
      }

      let targetFileHandle = syncFileHandleRef.current || syncFileHandle;
      let targetDirHandle =
        syncDirHandleRef.current ||
        syncDirectoryHandle ||
        effectiveBundle?.directoryHandle;

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
        await assetManager.saveAllToDirectory(targetDirHandle, true);
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

        if (!effectiveBundle && previousSyncFilePath && previousSyncFilePath !== targetFilename && previousSyncFilePath !== 'master.yml') {
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
      if (activeId) {
        markItemSaved(activeId);
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
    loadedBundleRef,
    activeBundleItemId,
    activeBundleItemIdRef,
    projectName,
    background,
    elements,
    exportZone,
    canvasWidth,
    canvasHeight,
    syncFileHandle,
    syncDirectoryHandle,
    setSyncFilePath,
    setSyncDirectoryHandle,
    setSyncDirectoryName,
    markItemSaved,
    showSnackbar
  ]);

  // Persistance continue du brouillon local de travail (cache navigateur avec sanitization des URLs)
  useEffect(() => {
    if (isSyncPausedRef.current) {
      return;
    }
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
      const required = extractAssetsFromElementsAndBackground(sanitized.background, sanitized.elements);
      if (required.length > 0) {
        localStorage.setItem('framemyapp_required_assets', JSON.stringify(required));
      }
    } catch {}
  }, [canvasWidth, canvasHeight, background, elements, exportZone, loadedBundle?.assets]);

  // Canvas change detection & debounced auto-sync
  useEffect(() => {
    if (!isInitialLoadCompleteRef.current || isSyncPausedRef.current) {
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
    permissionDetectedAssets,
    permissionTitle,
    permissionConfirmLabel,
    permissionCancelLabel,
    permissionErrorMessage,
    authorizeDiskAccess,
    dismissPermissionModal,
    dismissDiskAccessAndStartNew,
    cancelAutoSync,
    detachDiskSync,
    pauseDiskSync,
    resumeDiskSync
  };
}
