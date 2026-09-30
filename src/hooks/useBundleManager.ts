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
  const [activeBundleItemId, setActiveBundleItemId] = useState<string | null>(null);
  const [savedCanvasSignatures, setSavedCanvasSignatures] = useState<Record<string, string>>({});
  const bundleDirHandleRef = useRef<any>(null);

  const setLoadedBundle = useCallback(
    (bundle: LoadedBundle | null) => {
      if (bundle) {
        if (bundle.name) {
          setProjectName(bundle.name);
        }
        if (bundle.directoryHandle) {
          bundleDirHandleRef.current = bundle.directoryHandle;
          saveDirectoryHandleToIdb(bundle.directoryHandle);
          saveDirectoryHandleToIdb(bundle.directoryHandle, 'sync_dir_handle');
        } else if (bundleDirHandleRef.current) {
          bundle.directoryHandle = bundleDirHandleRef.current;
        }
        const targetPath = bundle.master?.path || syncFilePath || 'master.yml';
        setSyncFilePath(targetPath);
        setSyncStatus('synced');
      }
      setLoadedBundleState(bundle);
    },
    [setProjectName, setSyncFilePath, setSyncStatus, syncFilePath]
  );

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
    (item: BundleItem) => {
      if (!loadedBundle) return;
      recordHistory();

      const masterConfig = (loadedBundle.master?.config as BannerMasterConfig) || {};
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
          loadedBundle.assets,
          item.path
        );
      } else if (item.type === 'override') {
        resolved = resolveComposition(
          masterConfig,
          item.config as BannerOverrideConfig,
          undefined,
          loadedBundle.assets,
          item.path
        );
      } else {
        const matchingOverride = loadedBundle.overrides[item.slug];
        resolved = resolveComposition(
          masterConfig,
          matchingOverride?.config as BannerOverrideConfig | undefined,
          item.config as BannerVariantConfig,
          loadedBundle.assets,
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
      if (!loadedBundle) return false;

      try {
        let yamlContent = '';
        let updatedConfig: any = null;

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
            loadedBundle.master?.config as BannerMasterConfig | undefined
          );
          yamlContent = stringifyYaml(overrideConfig);
          updatedConfig = overrideConfig;
        } else {
          const variantConfig = serializeCanvasToVariant(
            item,
            elements,
            loadedBundle.master?.config as BannerMasterConfig | undefined,
            loadedBundle.overrides[item.slug]?.config as BannerOverrideConfig | undefined
          );
          yamlContent = stringifyYaml(variantConfig);
          updatedConfig = variantConfig;
        }

        let dirHandle = loadedBundle.directoryHandle || bundleDirHandleRef.current;
        if (!dirHandle) {
          dirHandle = await getDirectoryHandleFromIdb();
          if (dirHandle) {
            bundleDirHandleRef.current = dirHandle;
            loadedBundle.directoryHandle = dirHandle;
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
              loadedBundle.directoryHandle = dirHandle;
              saveDirectoryHandleToIdb(dirHandle);
            }
          } catch (err: any) {
            if (err.name === 'AbortError') return false;
            console.warn('showDirectoryPicker failed:', err);
          }
        }

        if (dirHandle) {
          await verifyDirectoryPermission(dirHandle, true);
          await assetManager.saveAllToDirectory(dirHandle);
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

        if (item.type === 'master') {
          setLoadedBundleState({
            ...loadedBundle,
            master: updatedItem
          });
        } else if (item.type === 'override') {
          setLoadedBundleState({
            ...loadedBundle,
            overrides: {
              ...loadedBundle.overrides,
              [item.slug]: updatedItem
            }
          });
        } else {
          setLoadedBundleState({
            ...loadedBundle,
            variants: loadedBundle.variants.map(v => (v.id === item.id ? updatedItem : v))
          });
        }

        markItemSaved(item.id);
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
