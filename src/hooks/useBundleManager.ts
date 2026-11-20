import { useState, useCallback, useMemo, useRef } from 'react';
import {
  BackgroundConfig,
  CanvasElement,
  ExportZone,
  LoadedBundle,
  BundleItem,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig
} from '../types';
import {
  resolveComposition,
  serializeCanvasToMaster,
  serializeCanvasToOverride,
  serializeCanvasToVariant
} from '../utils/templateEngine';
import { stringifyYaml } from '../utils/yamlHelper';
import {
  createBundleZip,
  downloadBlob,
  downloadFile,
  writeTextToDirectory,
  verifyDirectoryPermission,
  saveDirectoryHandleToIdb,
  getDirectoryHandleFromIdb
} from '../utils/bundleIo';
import { assetManager, convertUrlsToRelativeAssetPaths } from '../utils/assetManager';
import { cloneElementsForTarget } from '../utils/elementClipboardHelper';
import { computeCanvasSignature } from './useDiskSync';

interface UseBundleManagerOptions {
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  canvasWidth: number;
  canvasHeight: number;
  projectName: string;
  setProjectName: (name: string) => void;
  syncFilePath?: string | null;
  setSyncFilePath: (path: string) => void;
  setSyncStatus: (status: any) => void;
  lastSavedSignatureRef: React.MutableRefObject<string>;
  externalLoadedBundleRef?: React.MutableRefObject<LoadedBundle | null>;
  externalActiveBundleItemIdRef?: React.MutableRefObject<string | null>;
  recordHistory: () => void;
  applyCompositionDirectly: (
    comp: any,
    recordHist?: boolean,
    fitMode?: 'always' | 'on-change' | 'never'
  ) => void;
  pasteIntoActiveCanvas?: (sourceElements: CanvasElement[], offsetPx?: number) => void;
  showSnackbar: (message: string, icon?: string) => void;
}

export function useBundleManager({
  background,
  elements,
  exportZone,
  canvasWidth,
  canvasHeight,
  projectName,
  setProjectName,
  syncFilePath,
  setSyncFilePath,
  setSyncStatus,
  lastSavedSignatureRef,
  externalLoadedBundleRef,
  externalActiveBundleItemIdRef,
  recordHistory,
  applyCompositionDirectly,
  pasteIntoActiveCanvas,
  showSnackbar
}: UseBundleManagerOptions) {
  const [loadedBundle, setLoadedBundleState] = useState<LoadedBundle | null>(null);
  const loadedBundleRef = useRef<LoadedBundle | null>(null);
  const [activeBundleItemId, setActiveBundleItemIdState] = useState<string | null>(null);
  const activeBundleItemIdRef = useRef<string | null>(null);
  const [savedCanvasSignatures, setSavedCanvasSignatures] = useState<Record<string, string>>({});
  const bundleDirHandleRef = useRef<any>(null);

  const setActiveBundleItemId = useCallback(
    (id: string | null) => {
      activeBundleItemIdRef.current = id;
      if (externalActiveBundleItemIdRef) {
        externalActiveBundleItemIdRef.current = id;
      }
      setActiveBundleItemIdState(id);
    },
    [externalActiveBundleItemIdRef]
  );

  const setLoadedBundle = useCallback(
    (bundleOrUpdater: LoadedBundle | null | ((prev: LoadedBundle | null) => LoadedBundle | null)) => {
      let resolvedBundle: LoadedBundle | null = null;
      if (typeof bundleOrUpdater === 'function') {
        setLoadedBundleState(prev => {
          resolvedBundle = bundleOrUpdater(prev);
          loadedBundleRef.current = resolvedBundle;
          if (externalLoadedBundleRef) {
            externalLoadedBundleRef.current = resolvedBundle;
          }
          return resolvedBundle;
        });
      } else {
        resolvedBundle = bundleOrUpdater;
        loadedBundleRef.current = resolvedBundle;
        if (externalLoadedBundleRef) {
          externalLoadedBundleRef.current = resolvedBundle;
        }
        setLoadedBundleState(resolvedBundle);
      }

      if (resolvedBundle) {
        if (resolvedBundle.directoryHandle) {
          bundleDirHandleRef.current = resolvedBundle.directoryHandle;
          saveDirectoryHandleToIdb(resolvedBundle.directoryHandle);
          saveDirectoryHandleToIdb(resolvedBundle.directoryHandle, 'sync_dir_handle');
        } else if (bundleDirHandleRef.current) {
          resolvedBundle.directoryHandle = bundleDirHandleRef.current;
        }
        const targetPath = resolvedBundle.master?.path || syncFilePath || 'master.yml';
        setSyncFilePath(targetPath);
        setSyncStatus('synced');
      } else {
        bundleDirHandleRef.current = null;
      }
    },
    [setSyncFilePath, setSyncStatus, syncFilePath, externalLoadedBundleRef]
  );

  const detachBundle = useCallback(() => {
    bundleDirHandleRef.current = null;
    loadedBundleRef.current = null;
    setLoadedBundleState(null);
    setActiveBundleItemId(null);
    setSavedCanvasSignatures({});
  }, []);

  const currentCanvasSignature = useMemo(() => {
    return computeCanvasSignature(background, elements, exportZone, canvasWidth, canvasHeight, projectName);
  }, [background, elements, exportZone, canvasWidth, canvasHeight, projectName]);

  const isItemDirty = useCallback(
    (itemId: string) => {
      if (activeBundleItemId !== itemId) return false;
      const savedSig = savedCanvasSignatures[itemId];
      if (!savedSig) return false;
      return currentCanvasSignature !== savedSig;
    },
    [activeBundleItemId, savedCanvasSignatures, currentCanvasSignature]
  );

  const markItemSaved = useCallback(
    (itemId: string) => {
      setSavedCanvasSignatures(prev => ({
        ...prev,
        [itemId]: currentCanvasSignature
      }));
    },
    [currentCanvasSignature]
  );

  const applyBundleItem = useCallback(
    (item: BundleItem, bundleOverride?: LoadedBundle) => {
      let activeBundle = bundleOverride || loadedBundleRef.current || loadedBundle;
      if (typeof activeBundle === 'function') {
        activeBundle = loadedBundle;
      }
      if (!activeBundle || typeof activeBundle !== 'object') return;
      recordHistory();

      const masterConfig = (activeBundle.master?.config as BannerMasterConfig) || {};
      const activeOverrides = activeBundle.overrides || {};
      const activeAssets = activeBundle.assets || {};

      let resolved: {
        background: BackgroundConfig;
        elements: CanvasElement[];
        exportZone: ExportZone;
        canvasWidth: number;
        canvasHeight: number;
      };

      if (item.type === 'master') {
        resolved = resolveComposition(
          item.config as BannerMasterConfig,
          undefined,
          undefined,
          activeAssets,
          item.path
        );
      } else if (item.type === 'override') {
        resolved = resolveComposition(
          masterConfig,
          item.config as BannerOverrideConfig,
          undefined,
          activeAssets,
          item.path
        );
      } else {
        const matchingOverride = activeOverrides[item.slug];
        resolved = resolveComposition(
          masterConfig,
          matchingOverride?.config as BannerOverrideConfig | undefined,
          item.config as BannerVariantConfig,
          activeAssets,
          item.path
        );
      }

      const isInitialLoad = !activeBundleItemIdRef.current;
      const fitMode = item.type === 'master' || isInitialLoad ? 'always' : 'on-change';

      applyCompositionDirectly(resolved, false, fitMode);
      setActiveBundleItemId(item.id);

      const initialSig = computeCanvasSignature(
        resolved.background,
        resolved.elements,
        resolved.exportZone,
        resolved.canvasWidth,
        resolved.canvasHeight,
        item.name || projectName
      );
      setSavedCanvasSignatures(prev => ({
        ...prev,
        [item.id]: initialSig
      }));

      if (item.path) {
        setSyncFilePath(item.path);
      }
      if (item.name) {
        setProjectName(item.name);
      }
      lastSavedSignatureRef.current = initialSig;
      setSyncStatus('synced');

      showSnackbar(`Appliqué : ${item.name}`, 'auto_stories');
    },
    [
      loadedBundle,
      recordHistory,
      applyCompositionDirectly,
      projectName,
      setSyncFilePath,
      setProjectName,
      lastSavedSignatureRef,
      setSyncStatus,
      showSnackbar
    ]
  );

  const saveBundleItemToDisk = useCallback(
    async (item: BundleItem): Promise<boolean> => {
      const currentBundle = loadedBundleRef.current || loadedBundle;
      if (!currentBundle) return false;

      try {
        let yamlContent = '';
        let updatedConfig: any = null;

        const activeOverrides = currentBundle.overrides || {};

        if (item.type === 'master') {
          const masterConfig = serializeCanvasToMaster(
            item.name || 'Master',
            background,
            elements,
            exportZone,
            canvasWidth,
            canvasHeight
          );
          yamlContent = stringifyYaml(masterConfig);
          updatedConfig = masterConfig;
        } else if (item.type === 'override') {
          const overrideConfig = serializeCanvasToOverride(
            item,
            background,
            elements,
            exportZone,
            currentBundle.master?.config as BannerMasterConfig | undefined,
            canvasWidth,
            canvasHeight
          );
          yamlContent = stringifyYaml(overrideConfig);
          updatedConfig = overrideConfig;
        } else {
          const matchingOverride = activeOverrides[item.slug];
          const variantConfig = serializeCanvasToVariant(
            item,
            elements,
            currentBundle.master?.config as BannerMasterConfig | undefined,
            matchingOverride?.config as BannerOverrideConfig | undefined,
            background,
            exportZone,
            canvasWidth,
            canvasHeight
          );
          yamlContent = stringifyYaml(variantConfig);
          updatedConfig = variantConfig;
        }

        let dirHandle = currentBundle.directoryHandle || bundleDirHandleRef.current;
        if (!dirHandle) {
          dirHandle = await getDirectoryHandleFromIdb();
          if (dirHandle) {
            bundleDirHandleRef.current = dirHandle;
            currentBundle.directoryHandle = dirHandle;
          }
        }

        const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

        if (!dirHandle && hasFsSupport) {
          try {
            dirHandle = await (window as any).showDirectoryPicker({
              mode: 'readwrite',
              startIn: 'desktop'
            });
            if (dirHandle) {
              bundleDirHandleRef.current = dirHandle;
              currentBundle.directoryHandle = dirHandle;
              saveDirectoryHandleToIdb(dirHandle);
            }
          } catch (err: any) {
            if (err.name === 'AbortError') return false;
            console.warn('showDirectoryPicker failed:', err);
          }
        }

        const cleanConfig = convertUrlsToRelativeAssetPaths(updatedConfig, currentBundle.assets);
        yamlContent = stringifyYaml(cleanConfig);

        if (dirHandle) {
          await verifyDirectoryPermission(dirHandle, true);
          await assetManager.saveAllToDirectory(dirHandle, true);
          await writeTextToDirectory(dirHandle, item.path, yamlContent);
          showSnackbar(`Enregistré dans : ${item.path}`, 'save');
        } else {
          downloadFile(item.path.split('/').pop() || 'template.yml', yamlContent, 'text/yaml');
          showSnackbar(`Fichier téléchargé : ${item.path}`, 'download');
        }

        const updatedItem: BundleItem = {
          ...item,
          rawContent: yamlContent,
          config: cleanConfig
        };

        let newBundle: LoadedBundle;
        if (item.type === 'master') {
          newBundle = {
            ...currentBundle,
            master: updatedItem
          };
        } else if (item.type === 'override') {
          newBundle = {
            ...currentBundle,
            overrides: {
              ...(currentBundle.overrides || {}),
              [item.slug]: updatedItem
            }
          };
        } else {
          newBundle = {
            ...currentBundle,
            variants: (currentBundle.variants || []).map(v => (v.id === item.id ? updatedItem : v))
          };
        }

        loadedBundleRef.current = newBundle;
        setLoadedBundleState(newBundle);

        markItemSaved(item.id);
        const sig = computeCanvasSignature(
          background,
          elements,
          exportZone,
          canvasWidth,
          canvasHeight,
          item.name || projectName
        );
        lastSavedSignatureRef.current = sig;
        setSyncStatus('synced');
        if (item.path) {
          setSyncFilePath(item.path);
        }
        return true;
      } catch (err: any) {
        console.error('Erreur lors de l\'enregistrement sur le disque :', err);
        showSnackbar(`Erreur d'enregistrement : ${err.message}`, 'error');
        return false;
      }
    },
    [
      loadedBundle,
      background,
      elements,
      exportZone,
      canvasWidth,
      canvasHeight,
      projectName,
      lastSavedSignatureRef,
      setSyncFilePath,
      setSyncStatus,
      markItemSaved,
      showSnackbar
    ]
  );

  const exportCanvasAsTemplateYaml = useCallback(
    (customName?: string) => {
      const templateName = customName || projectName || loadedBundle?.master?.name || 'banner_template';
      const masterConfig = convertUrlsToRelativeAssetPaths(serializeCanvasToMaster(
        templateName,
        background,
        elements,
        exportZone,
        canvasWidth,
        canvasHeight
      ));
      const yamlStr = stringifyYaml(masterConfig);
      const filename = `${templateName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.yml`;
      downloadFile(filename, yamlStr, 'text/yaml');
      showSnackbar(`Template exporté : ${filename}`, 'download');
    },
    [background, elements, exportZone, canvasWidth, canvasHeight, projectName, loadedBundle, showSnackbar]
  );

  const exportCanvasAsBundleZip = useCallback(async () => {
    try {
      const bundleName = loadedBundle?.name || projectName || 'marketing_bundle';
      const currentMaster = convertUrlsToRelativeAssetPaths(serializeCanvasToMaster(
        bundleName,
        background,
        elements,
        exportZone,
        canvasWidth,
        canvasHeight
      ));

      const bundleToExport: LoadedBundle = loadedBundle || {
        name: bundleName,
        master: {
          id: 'master',
          type: 'master',
          path: 'master.yml',
          slug: 'master',
          name: currentMaster.name || 'Master',
          rawContent: stringifyYaml(currentMaster),
          config: currentMaster
        },
        overrides: {},
        variants: [],
        assets: {}
      };

      const zipBlob = await createBundleZip(bundleToExport, currentMaster);
      const zipName = `${(bundleToExport.name || 'bundle').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.zip`;
      downloadBlob(zipName, zipBlob);
      showSnackbar(`Bundle ZIP téléchargé : ${zipName}`, 'folder_zip');
    } catch (err) {
      console.error(err);
      showSnackbar('Erreur lors de la création du bundle ZIP', 'error');
    }
  }, [loadedBundle, projectName, background, elements, exportZone, canvasWidth, canvasHeight, showSnackbar]);

  const copyElementsToTargets = useCallback(
    async (
      sourceElements: CanvasElement[],
      targetItemIds: string[],
      options?: { keepExactPosition?: boolean }
    ): Promise<number> => {
      const currentBundle = loadedBundleRef.current || loadedBundle;
      if (!currentBundle || sourceElements.length === 0 || targetItemIds.length === 0) return 0;

      const keepExactPosition = options?.keepExactPosition ?? true;
      let dirHandle = currentBundle.directoryHandle || bundleDirHandleRef.current;
      if (!dirHandle) {
        dirHandle = await getDirectoryHandleFromIdb();
        if (dirHandle) {
          bundleDirHandleRef.current = dirHandle;
          currentBundle.directoryHandle = dirHandle;
        }
      }

      let hasWritePerm = false;
      if (dirHandle) {
        try {
          hasWritePerm = await verifyDirectoryPermission(dirHandle, true);
          if (hasWritePerm) {
            await assetManager.saveAllToDirectory(dirHandle, true);
          }
        } catch (err) {
          console.warn('Permission disque indisponible lors de la copie multi-cibles:', err);
          hasWritePerm = false;
        }
      }

      let updatedBundle: LoadedBundle = {
        ...currentBundle,
        overrides: { ...(currentBundle.overrides || {}) },
        variants: [...(currentBundle.variants || [])]
      };

      let copiedCount = 0;
      let persistedCount = 0;
      const masterConfigBase = (updatedBundle.master?.config as BannerMasterConfig) || {};
      const activeAssets = updatedBundle.assets || {};

      for (const targetId of targetItemIds) {
        if (targetId === activeBundleItemIdRef.current) {
          pasteIntoActiveCanvas?.(sourceElements, 24);
          copiedCount++;
          continue;
        }

        const targetItem: BundleItem | undefined =
          (updatedBundle.master?.id === targetId ? updatedBundle.master : undefined) ||
          Object.values(updatedBundle.overrides).find(o => o.id === targetId) ||
          updatedBundle.variants.find(v => v.id === targetId);

        if (!targetItem) continue;

        const currentMasterCfg = (updatedBundle.master?.config as BannerMasterConfig) || masterConfigBase;
        const matchingOverride =
          targetItem.type === 'variant' ? updatedBundle.overrides[targetItem.slug] : undefined;

        const resolved =
          targetItem.type === 'master'
            ? resolveComposition(
                targetItem.config as BannerMasterConfig,
                undefined,
                undefined,
                activeAssets,
                targetItem.path
              )
            : targetItem.type === 'override'
            ? resolveComposition(
                currentMasterCfg,
                targetItem.config as BannerOverrideConfig,
                undefined,
                activeAssets,
                targetItem.path
              )
            : resolveComposition(
                currentMasterCfg,
                matchingOverride?.config as BannerOverrideConfig | undefined,
                targetItem.config as BannerVariantConfig,
                activeAssets,
                targetItem.path
              );

        const clones = cloneElementsForTarget(sourceElements, resolved.elements, {
          offsetPx: keepExactPosition ? 0 : 24,
          preferOriginalCustomId: true,
          assetsMap: activeAssets,
          targetItemPath: targetItem.path
        });
        const nextElements = [...resolved.elements, ...clones];

        let serializedConfig: any;
        if (targetItem.type === 'master') {
          serializedConfig = serializeCanvasToMaster(
            targetItem.name || 'Master',
            resolved.background,
            nextElements,
            resolved.exportZone,
            resolved.canvasWidth,
            resolved.canvasHeight
          );
        } else if (targetItem.type === 'override') {
          serializedConfig = serializeCanvasToOverride(
            targetItem,
            resolved.background,
            nextElements,
            resolved.exportZone,
            currentMasterCfg,
            resolved.canvasWidth,
            resolved.canvasHeight
          );
        } else {
          serializedConfig = serializeCanvasToVariant(
            targetItem,
            nextElements,
            currentMasterCfg,
            matchingOverride?.config as BannerOverrideConfig | undefined,
            resolved.background,
            resolved.exportZone,
            resolved.canvasWidth,
            resolved.canvasHeight
          );
        }

        const cleanConfig = convertUrlsToRelativeAssetPaths(serializedConfig, activeAssets);
        const yamlContent = stringifyYaml(cleanConfig);

        if (dirHandle && hasWritePerm) {
          try {
            await writeTextToDirectory(dirHandle, targetItem.path, yamlContent);
            persistedCount++;
          } catch (err) {
            console.error(`Erreur d'écriture dans ${targetItem.path}:`, err);
          }
        }

        const updatedItem: BundleItem = {
          ...targetItem,
          rawContent: yamlContent,
          config: cleanConfig
        };

        if (targetItem.type === 'master') {
          updatedBundle = { ...updatedBundle, master: updatedItem };
        } else if (targetItem.type === 'override') {
          updatedBundle = {
            ...updatedBundle,
            overrides: { ...updatedBundle.overrides, [targetItem.slug]: updatedItem }
          };
        } else {
          updatedBundle = {
            ...updatedBundle,
            variants: updatedBundle.variants.map(v => (v.id === targetItem.id ? updatedItem : v))
          };
        }

        copiedCount++;
      }

      loadedBundleRef.current = updatedBundle;
      if (externalLoadedBundleRef) {
        externalLoadedBundleRef.current = updatedBundle;
      }
      setLoadedBundleState(updatedBundle);

      if (copiedCount > 0) {
        const elWord = sourceElements.length > 1 ? `${sourceElements.length} éléments copiés` : 'Élément copié';
        const targetWord = copiedCount > 1 ? `${copiedCount} cibles` : '1 cible';
        const diskInfo = persistedCount > 0 ? ' (enregistré sur disque)' : '';
        showSnackbar(`${elWord} dans ${targetWord}${diskInfo}`, 'content_paste_go');
      }

      return copiedCount;
    },
    [loadedBundle, pasteIntoActiveCanvas, externalLoadedBundleRef, showSnackbar]
  );

  return {
    loadedBundle,
    setLoadedBundle,
    setLoadedBundleState,
    detachBundle,
    activeBundleItemId,
    setActiveBundleItemId,
    savedCanvasSignatures,
    isItemDirty,
    markItemSaved,
    applyBundleItem,
    saveBundleItemToDisk,
    copyElementsToTargets,
    exportCanvasAsTemplateYaml,
    exportCanvasAsBundleZip
  };
}
