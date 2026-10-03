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
  recordHistory: () => void;
  applyCompositionDirectly: (comp: any, recordHist?: boolean) => void;
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
  recordHistory,
  applyCompositionDirectly,
  showSnackbar
}: UseBundleManagerOptions) {
  const [loadedBundle, setLoadedBundleState] = useState<LoadedBundle | null>(null);
  const loadedBundleRef = useRef<LoadedBundle | null>(null);
  const [activeBundleItemId, setActiveBundleItemId] = useState<string | null>(null);
  const [savedCanvasSignatures, setSavedCanvasSignatures] = useState<Record<string, string>>({});
  const bundleDirHandleRef = useRef<any>(null);

  const setLoadedBundle = useCallback(
    (bundleOrUpdater: LoadedBundle | null | ((prev: LoadedBundle | null) => LoadedBundle | null)) => {
      let resolvedBundle: LoadedBundle | null = null;
      if (typeof bundleOrUpdater === 'function') {
        setLoadedBundleState(prev => {
          resolvedBundle = bundleOrUpdater(prev);
          loadedBundleRef.current = resolvedBundle;
          return resolvedBundle;
        });
      } else {
        resolvedBundle = bundleOrUpdater;
        loadedBundleRef.current = resolvedBundle;
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
    [setSyncFilePath, setSyncStatus, syncFilePath]
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

      applyCompositionDirectly(resolved, false);
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
            currentBundle.master?.config as BannerMasterConfig | undefined
          );
          yamlContent = stringifyYaml(overrideConfig);
          updatedConfig = overrideConfig;
        } else {
          const matchingOverride = activeOverrides[item.slug];
          const variantConfig = serializeCanvasToVariant(
            item,
            elements,
            currentBundle.master?.config as BannerMasterConfig | undefined,
            matchingOverride?.config as BannerOverrideConfig | undefined
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

        if (dirHandle) {
          await verifyDirectoryPermission(dirHandle, true);
          await assetManager.saveAllToDirectory(dirHandle, true);
          const cleanConfig = convertUrlsToRelativeAssetPaths(updatedConfig);
          yamlContent = stringifyYaml(cleanConfig);
          await writeTextToDirectory(dirHandle, item.path, yamlContent);
          showSnackbar(`Enregistré dans : ${item.path}`, 'save');
        } else {
          const cleanConfig = convertUrlsToRelativeAssetPaths(updatedConfig);
          yamlContent = stringifyYaml(cleanConfig);
          downloadFile(item.path.split('/').pop() || 'template.yml', yamlContent, 'text/yaml');
          showSnackbar(`Fichier téléchargé : ${item.path}`, 'download');
        }

        const updatedItem: BundleItem = {
          ...item,
          rawContent: yamlContent,
          config: updatedConfig
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
    exportCanvasAsTemplateYaml,
    exportCanvasAsBundleZip
  };
}
