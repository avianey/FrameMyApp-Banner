import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  EditorState,
  BackgroundConfig,
  CanvasElement,
  ShapeType,
  DeviceModelType,
  ExportZone,
  ActivePanel,
  LoadedBundle,
  BundleItem,
  SyncStatus,
  AiModelConfig
} from '../types';
import {
  createTextElement,
  createShapeElement,
  createDeviceElement
} from '../utils/elementFactories';
import { useCanvasHistory, HistorySnapshot } from '../hooks/useCanvasHistory';
import { useViewportNavigation } from '../hooks/useViewportNavigation';
import { useElementHierarchy } from '../hooks/useElementHierarchy';
import { useDiskSync, slugifyFilename, computeCanvasSignature } from '../hooks/useDiskSync';
import { useBundleManager } from '../hooks/useBundleManager';
import { assetManager, dataUrlToBlob } from '../utils/assetManager';
import {
  verifyDirectoryPermission,
  saveDirectoryHandleToIdb,
  readDirectoryBundle,
  getLongestCommonDirectory,
  checkSameFileExistsInDirectory
} from '../utils/bundleIo';
import { captureExportPreview, ExportPreviewData } from '../utils/export';

export { slugifyFilename, computeCanvasSignature };
export type { HistorySnapshot, ExportPreviewData };

interface SnackbarState {
  message: string;
  icon: string;
  visible: boolean;
}

export interface EditorContextType {
  state: EditorState;
  snackbar: SnackbarState;

  // Project Name (Subtitle) & Save Panel
  projectName: string;
  setProjectName: (name: string) => void;
  isSavePanelOpen: boolean;
  setIsSavePanelOpen: (open: boolean) => void;

  // Synchronization & Disk Auto-Save
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  syncDirectoryName: string | null;
  setSyncDirectoryName: (name: string | null) => void;
  syncFilePath: string | null;
  setSyncFilePath: (path: string | null) => void;
  syncDirectoryHandle: any;
  setSyncDirectoryHandle: (handle: any) => void;
  syncFileHandle: any;
  syncToDisk: () => Promise<boolean>;
  selectSyncDirectory: () => Promise<boolean>;
  selectSyncFile: () => Promise<boolean>;
  pauseDiskSync: () => void;
  resumeDiskSync: () => void;

  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;
  isBatchExportModalOpen: boolean;
  setIsBatchExportModalOpen: (open: boolean) => void;
  isExportPreviewOpen: boolean;
  setIsExportPreviewOpen: (open: boolean) => void;
  exportPreviewData: ExportPreviewData | null;
  isGeneratingPreview: boolean;
  openExportPreview: () => Promise<void>;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (open: boolean) => void;
  activeLeftTab: 'templates' | 'customIds';
  setActiveLeftTab: (tab: 'templates' | 'customIds') => void;
  artboardRef: React.RefObject<HTMLDivElement>;
  artboardContainerRef: React.RefObject<HTMLDivElement>;
  viewportRef: React.RefObject<HTMLDivElement>;

  // Background & Elements actions
  setBackground: (updates: Partial<BackgroundConfig>) => void;
  applyBackgroundImage: (imageUrl: string, file?: File) => void;
  persistAsset: (file: File) => Promise<{ assetPath: string; displayUrl: string }>;
  setCanvasDimensions: (width: number, height: number) => void;
  addText: () => void;
  addShape: (shapeType?: ShapeType) => void;
  addDevice: (deviceType?: DeviceModelType) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateElements: (updatesById: Record<string, Partial<CanvasElement>>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  moveSelectedElements: (dx: number, dy: number, isRepeat?: boolean) => void;
  selectElement: (id: string | null, multi?: boolean) => void;
  selectElements: (ids: string[]) => void;
  setActivePanel: (panel: ActivePanel) => void;
  editingImageElementId: string | 'background' | null;
  setEditingImageElementId: (id: string | 'background' | null) => void;
  updateExportZone: (updates: Partial<ExportZone>) => void;
  setIsDrawingExportMode: (mode: boolean) => void;
  showSnackbar: (message: string, icon?: string) => void;
  resetZoom: () => void;
  centerCanvas: (customWidth?: number, customHeight?: number, autoFit?: boolean) => void;
  setZoom: (zoomOrUpdater: number | ((prev: number) => number), focalPoint?: { clientX: number; clientY: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (panOrUpdater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  toggleTheme: () => void;
  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;

  // Layer hierarchy actions
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Alignment & Distribution actions
  alignSelected: (type: any, reference: any) => void;
  alignElementToCanvas: (id: string, type: any) => void;
  distributeSelected: (type: any, reference: any, customGap?: number) => void;

  // Bundle & Templates actions
  loadedBundle: LoadedBundle | null;
  setLoadedBundle: (bundle: LoadedBundle | null) => void;
  activeBundleItemId: string | null;
  applyBundleItem: (item: BundleItem, bundleOverride?: LoadedBundle) => void;
  detachBundleAndResetToBlank: () => void;
  applyCompositionDirectly: (
    comp: {
      background: BackgroundConfig;
      elements: CanvasElement[];
      exportZone: ExportZone;
      canvasWidth?: number;
      canvasHeight?: number;
    },
    recordHist?: boolean
  ) => void;
  exportCanvasAsTemplateYaml: (filename?: string) => void;
  exportCanvasAsBundleZip: () => Promise<void>;
  updateElementCustomId: (id: string, customId: string) => void;
  autoGenerateCustomIds: () => void;
  isItemDirty: (itemId: string) => boolean;
  markItemSaved: (itemId: string) => void;
  saveBundleItemToDisk: (item: BundleItem) => Promise<boolean>;

  // Disk permission recovery modal
  isPermissionModalOpen: boolean;
  permissionTargetName: string;
  permissionDetectedAssets?: string[];
  permissionTitle?: string;
  permissionConfirmLabel?: string;
  permissionCancelLabel?: string;
  permissionErrorMessage?: string | null;
  requestYamlAssetsPermission: (item: BundleItem, filename: string, detectedAssets: string[], fileHandle?: any) => void;
  authorizeDiskAccess: () => Promise<void>;
  dismissDiskAccessAndStartNew: () => void;
  abortPendingImport: () => void;

  // AI Background Generation
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  isGeneratingAiBg: boolean;
  aiHasApiKey: boolean;
  aiModels: AiModelConfig[];
  selectedAiModel: string;
  setSelectedAiModel: (model: string) => void;
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;
  aiError: string | null;
  setAiError: (err: string | null) => void;
  generateAiBackground: () => Promise<void>;
}

const initialBackground: BackgroundConfig = {
  type: 'linear',
  solidColor: 'rgba(79, 70, 229, 1)',
  color1: 'rgba(99, 102, 241, 1)',
  color2: 'rgba(236, 72, 153, 0.95)',
  angle: 135,
  radialShape: 'circle',
  radialColor1: 'rgba(244, 63, 94, 1)',
  radialColor2: 'rgba(30, 27, 75, 1)',
  imageUrl: '',
  imageFit: 'cover',
  imageOffsetX: 0,
  imageOffsetY: 0,
  imageScale: 1.0,
  imageBlurEnable: false,
  imageBlur: 1,
  imageOverlayEnable: false,
  imageOverlayColor: '#FFFFFF11',
  zoomBlurEnable: false,
  zoomBlurIntensity: 25,
  zoomBlurOrigin: 'auto-device',
  zoomBlurOriginX: 50,
  zoomBlurOriginY: 50
};

const initialElements: CanvasElement[] = [
  {
    id: 'txt-1',
    customId: 'main_title',
    type: 'text',
    text: 'Titre Material 3',
    x: 70,
    y: 90,
    width: 380,
    height: 90,
    rotation: 0,
    fontFamily: 'Space Grotesk',
    fontWeight: 700,
    fontSize: 44,
    color: 'rgba(255, 255, 255, 1)',
    letterSpacing: 1,
    lineHeight: 1.2,
    minLines: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    glow: { enable: true, color: 'rgba(59, 130, 246, 0.85)', blur: 16, x: 0, y: 0 },
    shadow: { enable: true, color: 'rgba(0, 0, 0, 0.45)', blur: 8, x: 2, y: 4 }
  },
  {
    id: 'shape-1',
    customId: 'hero_card',
    type: 'shape',
    shapeType: 'rounded-rect',
    x: 480,
    y: 200,
    width: 230,
    height: 230,
    rotation: -8,
    fillType: 'linear',
    solidColor: 'rgba(99, 102, 241, 0.85)',
    color1: 'rgba(59, 130, 246, 0.9)',
    color2: 'rgba(147, 51, 234, 0.9)',
    angle: 45,
    radialColor1: 'rgba(251, 191, 36, 1)',
    radialColor2: 'rgba(185, 28, 28, 0.9)',
    imageUrl: '',
    opacity: 0.95,
    borderRadius: 32,
    stroke: {
      enable: true,
      width: 2,
      color: 'rgba(255, 255, 255, 0.4)'
    },
    glow: {
      enable: false,
      color: 'rgba(56, 189, 248, 0.75)',
      blur: 16,
      x: 0,
      y: 0
    },
    shadow: {
      enable: true,
      color: 'rgba(0, 0, 0, 0.3)',
      blur: 24,
      x: 0,
      y: 12
    }
  }
];

const initialExportZone: ExportZone = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  preset: 'full',
  ratio: 800 / 600,
  targetWidth: 800,
  targetHeight: 600,
  lockRatio: true
};

function cleanDraftProject(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

export function extractAssetsFromConfig(config: any): string[] {
  if (!config) return [];
  const assets: string[] = [];
  if (
    config.background?.imageUrl &&
    !config.background.imageUrl.startsWith('http') &&
    !config.background.imageUrl.startsWith('data:') &&
    !config.background.imageUrl.startsWith('blob:')
  ) {
    assets.push(config.background.imageUrl);
  }
  if (Array.isArray(config.elements)) {
    for (const el of config.elements) {
      if (
        el.screenImageUrl &&
        !el.screenImageUrl.startsWith('http') &&
        !el.screenImageUrl.startsWith('data:') &&
        !el.screenImageUrl.startsWith('blob:')
      ) {
        assets.push(el.screenImageUrl);
      }
      if (
        el.imageUrl &&
        !el.imageUrl.startsWith('http') &&
        !el.imageUrl.startsWith('data:') &&
        !el.imageUrl.startsWith('blob:')
      ) {
        assets.push(el.imageUrl);
      }
    }
  }
  if (config.images && typeof config.images === 'object') {
    for (const val of Object.values(config.images)) {
      if (typeof val === 'string' && !val.startsWith('http') && !val.startsWith('data:') && !val.startsWith('blob:')) {
        assets.push(val);
      }
    }
  }
  return Array.from(new Set(assets));
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // DOM References
  const artboardRef = useRef<HTMLDivElement>(null);
  const artboardContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const snackbarTimerRef = useRef<number | null>(null);

  // Snackbar Notification State
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: '',
    icon: 'check_circle',
    visible: false
  });

  const showSnackbar = useCallback((message: string, icon = 'check_circle') => {
    if (snackbarTimerRef.current) {
      window.clearTimeout(snackbarTimerRef.current);
    }
    setSnackbar({ message, icon, visible: true });
    snackbarTimerRef.current = window.setTimeout(() => {
      setSnackbar(prev => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  // Theme Support
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Modals & Sidebars
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState<boolean>(false);
  const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState<boolean>(false);
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState<boolean>(false);
  const [exportPreviewData, setExportPreviewData] = useState<ExportPreviewData | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'templates' | 'customIds'>('templates');

  // Core Canvas State (with localStorage draft fallback)
  const [background, setBackgroundState] = useState<BackgroundConfig>(() => {
    try {
      const parsed = cleanDraftProject(localStorage.getItem('framemyapp_draft_project'));
      if (parsed && parsed.background) return { ...initialBackground, ...parsed.background };
    } catch {}
    return initialBackground;
  });

  const [elements, setElements] = useState<CanvasElement[]>(() => {
    try {
      const parsed = cleanDraftProject(localStorage.getItem('framemyapp_draft_project'));
      if (parsed && parsed.elements && Array.isArray(parsed.elements)) return parsed.elements;
    } catch {}
    return initialElements;
  });

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const selectedElementId = selectedElementIds.length > 0 ? selectedElementIds[selectedElementIds.length - 1] : null;
  const [activePanel, setActivePanelState] = useState<ActivePanel>(null);
  const [editingImageElementId, setEditingImageElementId] = useState<string | 'background' | null>(null);

  // Hook 1: Viewport Navigation (Zoom, Pan, Dimensions, ExportZone)
  const initialDimensions = (() => {
    try {
      const p = cleanDraftProject(localStorage.getItem('framemyapp_draft_project'));
      if (p) {
        return {
          w: p.canvasWidth || 800,
          h: p.canvasHeight || 600,
          zone: p.exportZone ? { ...initialExportZone, ...p.exportZone } : initialExportZone
        };
      }
    } catch {}
    return { w: 800, h: 600, zone: initialExportZone };
  })();

  // Forward declaration of recordHistory for navigation hook
  const recordHistoryRef = useRef<() => void>(() => {});

  const navigation = useViewportNavigation({
    viewportRef,
    recordHistory: () => recordHistoryRef.current(),
    showSnackbar,
    initialCanvasWidth: initialDimensions.w,
    initialCanvasHeight: initialDimensions.h,
    initialExportZone: initialDimensions.zone
  });

  // Hook 2: Element Hierarchy & Alignment
  const hierarchy = useElementHierarchy({
    elements,
    setElements,
    selectedElementIds,
    canvasWidth: navigation.canvasWidth,
    canvasHeight: navigation.canvasHeight,
    recordHistory: () => recordHistoryRef.current(),
    showSnackbar
  });

  // Synchronized ref for selectedElementIds
  const selectedElementIdsRef = useRef<string[]>(selectedElementIds);
  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const moveSelectedElements = useCallback(
    (dx: number, dy: number, isRepeat: boolean = false) => {
      const currentIds = selectedElementIdsRef.current;
      if (currentIds.length === 0 || (dx === 0 && dy === 0)) return;
      if (!isRepeat) {
        recordHistoryRef.current();
      }
      setElements(prev =>
        prev.map(el => {
          if (!currentIds.includes(el.id)) return el;
          return {
            ...el,
            x: Math.round(el.x + dx),
            y: Math.round(el.y + dy)
          };
        })
      );
    },
    []
  );

  const clipboardElementsRef = useRef<CanvasElement[]>([]);
  const syncToDiskRef = useRef<() => Promise<boolean>>(async () => false);

  const duplicateElementsByIds = useCallback(
    (sourceElements: CanvasElement[]) => {
      if (sourceElements.length === 0) return;
      recordHistoryRef.current();
      const now = Date.now();
      const cloned = sourceElements.map((el, idx) => {
        const copy: CanvasElement = JSON.parse(JSON.stringify(el));
        copy.id = `${el.type}-${now}-${idx}`;
        copy.x = Math.round(el.x + 24);
        copy.y = Math.round(el.y + 24);
        if (copy.customId) {
          copy.customId = `${copy.customId}_copy`;
        }
        return copy;
      });
      setElements(prev => [...prev, ...cloned]);
      const newIds = cloned.map(c => c.id);
      setSelectedElementIds(newIds);
      if (newIds.length > 1) {
        setActivePanelState('align');
      } else if (cloned[0]) {
        setActivePanelState(cloned[0].type as ActivePanel);
      }
      showSnackbar(
        cloned.length > 1 ? `${cloned.length} éléments dupliqués` : 'Élément dupliqué',
        'content_copy'
      );
    },
    [showSnackbar]
  );

  const duplicateSelectedElements = useCallback(() => {
    const selected = elements.filter(e => selectedElementIdsRef.current.includes(e.id));
    duplicateElementsByIds(selected);
  }, [elements, duplicateElementsByIds]);

  // Hook 3: Canvas History (Undo / Redo & Shortcuts)
  const history = useCanvasHistory({
    canvasWidth: navigation.canvasWidth,
    canvasHeight: navigation.canvasHeight,
    background,
    elements,
    exportZone: navigation.exportZone,
    selectedElementIds,
    editingImageElementId,
    onApplySnapshot: snapshot => {
      if (snapshot.canvasWidth) navigation.setCanvasWidth(snapshot.canvasWidth);
      if (snapshot.canvasHeight) navigation.setCanvasHeight(snapshot.canvasHeight);
      setBackgroundState(snapshot.background);
      setElements(snapshot.elements);
      navigation.setExportZoneState(snapshot.exportZone);
      setSelectedElementIds(prevIds => prevIds.filter(id => snapshot.elements.some(e => e.id === id)));
    },
    onDeleteSelected: () => {
      if (selectedElementIds.length > 0) {
        recordHistoryRef.current();
        setElements(prev => prev.filter(e => !selectedElementIds.includes(e.id)));
        setSelectedElementIds([]);
        setActivePanelState(null);
        showSnackbar('Élément(s) supprimé(s)', 'delete');
      }
    },
    onMoveSelected: moveSelectedElements,
    onExitImageEditing: () => setEditingImageElementId(null),
    onDuplicateSelected: duplicateSelectedElements,
    onCopySelected: () => {
      const selected = elements.filter(e => selectedElementIdsRef.current.includes(e.id));
      if (selected.length > 0) {
        clipboardElementsRef.current = JSON.parse(JSON.stringify(selected));
        showSnackbar(
          selected.length > 1 ? `${selected.length} éléments copiés` : 'Élément copié',
          'content_copy'
        );
      }
    },
    onPaste: () => {
      if (clipboardElementsRef.current.length > 0) {
        duplicateElementsByIds(clipboardElementsRef.current);
      }
    },
    onSelectAll: () => {
      if (elements.length > 0) {
        const allIds = elements.map(e => e.id);
        setSelectedElementIds(allIds);
        setActivePanelState(allIds.length > 1 ? 'align' : (elements[0].type as ActivePanel));
        showSnackbar(`${allIds.length} élément(s) sélectionné(s)`, 'select_all');
      }
    },
    onSave: () => {
      syncToDiskRef.current();
    },
    showSnackbar
  });

  recordHistoryRef.current = history.recordHistory;

  // Forward declaration of bundle manager helpers
  const markItemSavedRef = useRef<(id: string) => void>(() => {});
  const loadedBundleRef = useRef<LoadedBundle | null>(null);
  const activeBundleItemIdRef = useRef<string | null>(null);
  const setLoadedBundleRef = useRef<React.Dispatch<React.SetStateAction<LoadedBundle | null>>>(() => {});
  const setActiveBundleItemIdRef = useRef<(id: string | null) => void>(() => {});

  // Hook 4: Disk Sync (Handles, Auto-Save, Renaming, Startup Restore)
  const diskSync = useDiskSync({
    canvasWidth: navigation.canvasWidth,
    canvasHeight: navigation.canvasHeight,
    background,
    elements,
    exportZone: navigation.exportZone,
    loadedBundle: loadedBundleRef.current,
    loadedBundleRef,
    activeBundleItemId: activeBundleItemIdRef.current,
    activeBundleItemIdRef,
    setCanvasWidth: navigation.setCanvasWidth,
    setCanvasHeight: navigation.setCanvasHeight,
    setBackground: setBackgroundState,
    setElements,
    setExportZone: navigation.setExportZoneState,
    setLoadedBundleState: updater => {
      setLoadedBundleRef.current(updater);
    },
    setActiveBundleItemId: id => {
      setActiveBundleItemIdRef.current(id);
    },
    markItemSaved: id => markItemSavedRef.current(id),
    showSnackbar,
    centerCanvas: (w, h, autoFit) => navigation.centerCanvas(w, h, autoFit),
    initialBackground,
    initialExportZone
  });

  // Application direct composition
  const applyCompositionDirectly = useCallback(
    (
      comp: {
        background: BackgroundConfig;
        elements: CanvasElement[];
        exportZone: ExportZone;
        canvasWidth?: number;
        canvasHeight?: number;
      },
      recordHist = true
    ) => {
      if (recordHist) {
        history.recordHistory();
      }
      setBackgroundState(comp.background);
      setElements(comp.elements);
      navigation.setExportZoneState(comp.exportZone);
      setSelectedElementIds([]);

      const targetW = comp.canvasWidth || comp.exportZone?.width || 800;
      const targetH = comp.canvasHeight || comp.exportZone?.height || 600;
      navigation.setCanvasDimensions(targetW, targetH);
    },
    [history, navigation]
  );

  // Hook 5: Bundle & Template Manager
  const bundleManager = useBundleManager({
    background,
    elements,
    exportZone: navigation.exportZone,
    canvasWidth: navigation.canvasWidth,
    canvasHeight: navigation.canvasHeight,
    projectName: diskSync.projectName,
    setProjectName: diskSync.setProjectName,
    syncFilePath: diskSync.syncFilePath,
    setSyncFilePath: diskSync.setSyncFilePath,
    setSyncStatus: diskSync.setSyncStatus,
    lastSavedSignatureRef: diskSync.lastSavedSignatureRef,
    recordHistory: history.recordHistory,
    applyCompositionDirectly,
    showSnackbar
  });

  loadedBundleRef.current = bundleManager.loadedBundle;
  activeBundleItemIdRef.current = bundleManager.activeBundleItemId;
  setLoadedBundleRef.current = bundleManager.setLoadedBundle;
  setActiveBundleItemIdRef.current = bundleManager.setActiveBundleItemId;
  markItemSavedRef.current = bundleManager.markItemSaved;
  syncToDiskRef.current = () => diskSync.syncToDisk();

  // Element Actions
  const setBackground = useCallback(
    (updates: Partial<BackgroundConfig>) => {
      history.recordHistory();
      setBackgroundState(prev => ({ ...prev, ...updates }));
    },
    [history]
  );

  const persistAsset = useCallback(
    async (file: File): Promise<{ assetPath: string; displayUrl: string }> => {
      const { assetPath, displayUrl, alreadyOnDisk } = assetManager.registerAsset(file.name, file);
      assetManager.registerUrlMapping(displayUrl, assetPath);

      const cleanFilename = assetPath.split('/').pop() || assetPath;
      bundleManager.setLoadedBundle(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          assets: {
            ...prev.assets,
            [assetPath]: displayUrl,
            [cleanFilename]: displayUrl
          }
        };
      });

      let dirHandle = diskSync.syncDirectoryHandle || bundleManager.loadedBundle?.directoryHandle;

      if (!dirHandle && typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        try {
          showSnackbar('Sélectionnez le dossier du projet pour enregistrer l’image dans assets/...', 'folder');
          dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'desktop'
          });
          if (dirHandle) {
            diskSync.setSyncDirectoryHandle(dirHandle);
            diskSync.setSyncDirectoryName(dirHandle.name);
            saveDirectoryHandleToIdb(dirHandle, 'sync_dir_handle');
            saveDirectoryHandleToIdb(dirHandle, 'root_bundle_dir');
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('showDirectoryPicker error:', err);
          }
        }
      }

      if (dirHandle) {
        try {
          await verifyDirectoryPermission(dirHandle, true, true);
          const isSameOnDisk =
            alreadyOnDisk || (await checkSameFileExistsInDirectory(dirHandle, assetPath, file));
          if (isSameOnDisk) {
            assetManager.markAssetExistsOnDisk(assetPath);
            showSnackbar(`Image référencée depuis ${assetPath}`, 'image');
          } else {
            await assetManager.saveAllToDirectory(dirHandle);
            showSnackbar(`Image enregistrée sur disque : ${assetPath}`, 'save');
          }
        } catch (err: any) {
          console.warn('Erreur lors de la sauvegarde sur disque de l’asset:', err);
          showSnackbar(`Impossible d'écrire dans assets/ : ${err.message || ''}`, 'warning');
        }
      } else {
        showSnackbar('Image conservée en mémoire (connectez un dossier pour assets/)', 'info');
      }

      return { assetPath, displayUrl };
    },
    [diskSync, bundleManager, showSnackbar]
  );

  const applyBackgroundImage = useCallback(
    async (imageUrl: string, file?: File) => {
      // 1. Lire immédiatement les dimensions naturelles de l'image (disponible en mémoire instantanément)
      const probeImg = new Image();
      const getDimsPromise = new Promise<{ width: number; height: number }>(resolve => {
        probeImg.onload = () => {
          resolve({
            width: probeImg.naturalWidth > 0 ? probeImg.naturalWidth : 0,
            height: probeImg.naturalHeight > 0 ? probeImg.naturalHeight : 0
          });
        };
        probeImg.onerror = () => resolve({ width: 0, height: 0 });
      });
      probeImg.src = imageUrl;

      let finalUrl = imageUrl;
      if (file) {
        const { assetPath, displayUrl } = await persistAsset(file);
        assetManager.registerUrlMapping(imageUrl, assetPath);
        finalUrl = displayUrl;
      }

      const dims = await getDimsPromise;
      const naturalWidth = dims.width > 0 ? dims.width : (probeImg.naturalWidth || 0);
      const naturalHeight = dims.height > 0 ? dims.height : (probeImg.naturalHeight || 0);

      history.recordHistory();
      setBackgroundState(prev => ({
        ...prev,
        type: 'image',
        imageUrl: finalUrl,
        imageFit: prev.imageFit === 'contain' ? 'contain' : 'cover',
        imageOffsetX: 0,
        imageOffsetY: 0,
        imageScale: 1.0,
        imageNaturalWidth: naturalWidth > 0 ? naturalWidth : undefined,
        imageNaturalHeight: naturalHeight > 0 ? naturalHeight : undefined
      }));

      if (naturalWidth > 0 && naturalHeight > 0) {
        showSnackbar(`Image de fond appliquée (${naturalWidth} × ${naturalHeight} px)`, 'image');
      } else {
        showSnackbar('Image de fond appliquée', 'image');
      }
    },
    [history, showSnackbar, persistAsset]
  );

  const addText = useCallback(() => {
    history.recordHistory();
    setElements(prev => {
      const textCount = prev.filter(e => e.type === 'text').length + 1;
      const offset = (prev.length * 15) % 200;
      const newText = createTextElement(textCount, offset);
      setSelectedElementIds([newText.id]);
      return [...prev, newText];
    });
    setActivePanelState('text');
  }, [history]);

  const addShape = useCallback(
    (shapeType: ShapeType = 'rounded-rect') => {
      history.recordHistory();
      setElements(prev => {
        const shapeCount = prev.filter(e => e.type === 'shape').length + 1;
        const offset = (prev.length * 15) % 200;
        const newShape = createShapeElement(shapeType, shapeCount, offset);
        setSelectedElementIds([newShape.id]);
        return [...prev, newShape];
      });
      setActivePanelState('shape');
    },
    [history]
  );

  const addDevice = useCallback(
    (deviceType: DeviceModelType = 'pixel-10') => {
      history.recordHistory();
      setElements(prev => {
        const deviceCount = prev.filter(e => e.type === 'device').length + 1;
        const offset = (prev.length * 15) % 200;
        const newDevice = createDeviceElement(deviceType, deviceCount, offset);
        setSelectedElementIds([newDevice.id]);
        return [...prev, newDevice];
      });
      setActivePanelState('device');
    },
    [history]
  );

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => (el.id === id ? ({ ...el, ...updates } as CanvasElement) : el)));
  }, []);

  const updateElements = useCallback((updatesById: Record<string, Partial<CanvasElement>>) => {
    setElements(prev =>
      prev.map(el => {
        const updates = updatesById[el.id];
        return updates ? ({ ...el, ...updates } as CanvasElement) : el;
      })
    );
  }, []);

  const updateElementCustomId = useCallback((id: string, customId: string) => {
    setElements(prev =>
      prev.map(el => (el.id === id ? ({ ...el, customId: customId.trim() } as CanvasElement) : el))
    );
  }, []);

  const autoGenerateCustomIds = useCallback(() => {
    history.recordHistory();
    setElements(prev => {
      let textIdx = 1;
      let shapeIdx = 1;
      let deviceIdx = 1;

      return prev.map(el => {
        if (el.customId && el.customId.trim().length > 0) return el;
        let generated = '';
        if (el.type === 'text') {
          generated = textIdx === 1 ? 'title' : textIdx === 2 ? 'subtitle' : `text_${textIdx}`;
          textIdx++;
        } else if (el.type === 'device') {
          generated = deviceIdx === 1 ? 'app_screen' : `device_${deviceIdx}`;
          deviceIdx++;
        } else {
          generated = shapeIdx === 1 ? 'badge' : shapeIdx === 2 ? 'button' : `shape_${shapeIdx}`;
          shapeIdx++;
        }
        return { ...el, customId: generated };
      });
    });
    showSnackbar('IDs personnalisés générés', 'auto_fix_high');
  }, [history, showSnackbar]);

  const deleteElement = useCallback(
    (id: string) => {
      history.recordHistory();
      setElements(prev => prev.filter(el => el.id !== id));
      setSelectedElementIds(prev => prev.filter(itemId => itemId !== id));
      setActivePanelState(null);
    },
    [history]
  );

  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    history.recordHistory();
    setElements(prev => prev.filter(el => !selectedElementIds.includes(el.id)));
    setSelectedElementIds([]);
    setActivePanelState(null);
    showSnackbar('Éléments supprimés', 'delete');
  }, [selectedElementIds, history, showSnackbar]);

  const selectElement = useCallback((id: string | null, multi = false) => {
    if (id === null) {
      setSelectedElementIds([]);
      setActivePanelState(null);
      return;
    }

    if (multi) {
      setSelectedElementIds(prev => {
        const next = prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id];
        if (next.length > 1) {
          setActivePanelState('align');
        } else if (next.length === 1) {
          const singleEl = elements.find(e => e.id === next[0]);
          if (singleEl) {
            setActivePanelState(singleEl.type as ActivePanel);
          }
        } else {
          setActivePanelState(null);
        }
        return next;
      });
    } else {
      setSelectedElementIds([id]);
      setElements(currentElements => {
        const el = currentElements.find(item => item.id === id);
        if (el) {
          setActivePanelState(el.type as ActivePanel);
        }
        return currentElements;
      });
    }
  }, [elements]);

  const selectElements = useCallback(
    (ids: string[]) => {
      setSelectedElementIds(ids);
      if (ids.length > 1) {
        setActivePanelState('align');
      } else if (ids.length === 1) {
        const singleEl = elements.find(e => e.id === ids[0]);
        if (singleEl) {
          setActivePanelState(singleEl.type as ActivePanel);
        }
      } else {
        setActivePanelState(null);
      }
    },
    [elements]
  );

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
    if (panel === 'bg' || panel === 'export') {
      setSelectedElementIds([]);
    }
  }, []);

  const detachBundleAndResetToBlank = useCallback(() => {
    // 1. Annuler immédiatement l'auto-sync pour empêcher toute écriture sur le disque
    diskSync.cancelAutoSync();

    // 2. Dissocier le bundle et la synchronisation disque
    bundleManager.detachBundle();
    diskSync.detachDiskSync();
    assetManager.clear();

    // 3. Réinitialiser l'état du canvas à un template vierge
    history.recordHistory();
    navigation.setCanvasWidth(800);
    navigation.setCanvasHeight(600);
    setElements([]);
    setBackgroundState(initialBackground);
    setSelectedElementIds([]);
    setActivePanelState(null);
    navigation.setExportZoneState(initialExportZone);
    navigation.resetZoom();
    navigation.centerCanvas?.(800, 600, true);

    try {
      localStorage.removeItem('framemyapp_draft_project');
      localStorage.removeItem('framemyapp_sync_file_path');
      localStorage.removeItem('framemyapp_sync_dir_name');
      localStorage.removeItem('framemyapp_project_name');
      localStorage.removeItem('framemyapp_required_assets');
    } catch {}

    diskSync.setProjectName('Nouveau template');

    showSnackbar('Projet dissocié et réinitialisé', 'delete_sweep');
  }, [diskSync, bundleManager, history, navigation, showSnackbar]);

  const clearAll = useCallback(() => {
    detachBundleAndResetToBlank();
  }, [detachBundleAndResetToBlank]);

  const [pendingYamlImport, setPendingYamlImport] = useState<{
    item: BundleItem;
    filename: string;
    detectedAssets: string[];
    fileHandle?: any;
  } | null>(null);
  const [permissionModalError, setPermissionModalError] = useState<string | null>(null);
  const [isSuggestedBlocked, setIsSuggestedBlocked] = useState<boolean>(false);

  const requestYamlAssetsPermission = useCallback(
    (item: BundleItem, filename: string, detectedAssets: string[], fileHandle?: any) => {
      setPermissionModalError(null);
      setIsSuggestedBlocked(false);
      try {
        localStorage.setItem('framemyapp_required_assets', JSON.stringify(detectedAssets));
        localStorage.setItem('framemyapp_sync_file_path', filename);
        if (item.name) {
          localStorage.setItem('framemyapp_project_name', item.name);
        }
      } catch {}
      setPendingYamlImport({ item, filename, detectedAssets, fileHandle });
    },
    []
  );

  const abortPendingImport = useCallback(() => {
    setPendingYamlImport(null);
    setPermissionModalError(null);
    setIsSuggestedBlocked(false);
    diskSync.dismissPermissionModal();
    showSnackbar('Import du template abandonné', 'info');
  }, [diskSync, showSnackbar]);

  const authorizeDiskAccess = useCallback(async () => {
    if (pendingYamlImport) {
      try {
        setPermissionModalError(null);
        const startInDir =
          diskSync.syncDirectoryHandle && diskSync.syncDirectoryHandle.kind === 'directory'
            ? diskSync.syncDirectoryHandle
            : 'documents';
        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'framemyapp_project_folder',
          mode: 'readwrite',
          startIn: startInDir
        });
        if (dirHandle) {
          await verifyDirectoryPermission(dirHandle, true, true);
          const bundle = await readDirectoryBundle(dirHandle, pendingYamlImport.filename);
          if (!bundle.master) {
            bundle.master = pendingYamlImport.item;
          }
          if (bundle.master) {
            bundle.master.path = pendingYamlImport.filename;
          }
          bundleManager.setLoadedBundle(bundle);
          diskSync.setProjectName(pendingYamlImport.item.name || bundle.name);
          diskSync.setSyncDirectoryName(bundle.name);
          diskSync.setSyncDirectoryHandle(dirHandle);
          diskSync.setSyncFilePath(pendingYamlImport.filename);
          await saveDirectoryHandleToIdb(dirHandle, 'sync_dir_handle');
          await saveDirectoryHandleToIdb(dirHandle, 'root_bundle_dir');
          bundleManager.applyBundleItem(bundle.master || pendingYamlImport.item, bundle);
          setPendingYamlImport(null);
          setPermissionModalError(null);
          showSnackbar(`Template et dossier connectés : ${dirHandle.name}`, 'folder_open');
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        if (err.name === 'NotAllowedError') {
          const msg = "L'autorisation d'accès aux dossiers a été refusée ou révoquée dans Chrome. Pour la réactiver, autorisez l'accès aux fichiers dans les paramètres de votre navigateur (icône 🔒 à gauche de la barre d'adresse) puis réessayez.";
          setPermissionModalError(msg);
        } else {
          console.warn('showDirectoryPicker error:', err);
          const msg = `Erreur d'accès au dossier : ${err.message || 'Non autorisé'}`;
          setPermissionModalError(msg);
        }
        throw err;
      }
    }
    try {
      await diskSync.authorizeDiskAccess();
    } catch (err: any) {
      throw err;
    }
  }, [pendingYamlImport, bundleManager, diskSync, showSnackbar]);

  const dismissDiskAccessAndStartNew = useCallback(() => {
    setPermissionModalError(null);
    setIsSuggestedBlocked(false);
    if (pendingYamlImport) {
      const item = pendingYamlImport.item;
      bundleManager.setLoadedBundle({
        name: item.name,
        master: item,
        overrides: {},
        variants: [],
        assets: {}
      });
      diskSync.setProjectName(item.name);
      diskSync.setSyncFilePath(pendingYamlImport.filename);
      bundleManager.applyBundleItem(item);
      setPendingYamlImport(null);
      showSnackbar(`Template chargé sans images : ${item.name}`, 'auto_stories');
      return;
    }
    if (diskSync.permissionDetectedAssets && diskSync.permissionDetectedAssets.length > 0) {
      diskSync.dismissPermissionModal();
      showSnackbar('Projet ouvert sans les images locales', 'visibility_off');
      return;
    }
    diskSync.dismissDiskAccessAndStartNew();
  }, [pendingYamlImport, bundleManager, diskSync, showSnackbar]);

  // Export Preview Lightbox trigger (sans modification de l'état de zoom du canvas)
  const openExportPreview = useCallback(async () => {
    if (!artboardRef.current) return;
    setIsExportPreviewOpen(true);
    setIsGeneratingPreview(true);
    setEditingImageElementId(null);

    try {
      const { blob, dataUrl } = await captureExportPreview(artboardRef.current, navigation.exportZone);
      setExportPreviewData({
        blob,
        dataUrl,
        targetWidth: Math.round(navigation.exportZone.targetWidth),
        targetHeight: Math.round(navigation.exportZone.targetHeight),
        ratio: navigation.exportZone.ratio || (navigation.exportZone.targetWidth / navigation.exportZone.targetHeight) || 1,
        preset: navigation.exportZone.preset
      });
    } catch (err: any) {
      console.error('Erreur génération preview :', err);
      showSnackbar('Échec de la génération de l’aperçu', 'error');
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [artboardRef, navigation.exportZone, showSnackbar]);

  // AI Background Generation State & Actions
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isGeneratingAiBg, setIsGeneratingAiBg] = useState<boolean>(false);
  const [aiHasApiKey, setAiHasApiKey] = useState<boolean>(false);
  const [aiModels, setAiModels] = useState<AiModelConfig[]>([
    { id: 'gemini-4-argon', name: 'Gemini 4 Argon', description: 'Modèle par défaut', default: true }
  ]);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('gemini-4-argon');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const hasWarnedMissingKeyRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAiConfig() {
      try {
        const res = await fetch('/api/ai/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const hasKey = Boolean(data.hasApiKey);
        setAiHasApiKey(hasKey);
        if (!hasKey && !hasWarnedMissingKeyRef.current) {
          hasWarnedMissingKeyRef.current = true;
          console.warn(
            '[FrameMyApp AI] Variable d\'environnement GEMINI_API_KEY manquante ou vide sur le serveur. Le bouton "Générer par IA" est désactivé.'
          );
        }
        if (Array.isArray(data.models) && data.models.length > 0) {
          setAiModels(data.models);
          const defaultModel = data.models.find((m: AiModelConfig) => m.default) || data.models[0];
          if (defaultModel) {
            setSelectedAiModel(defaultModel.id);
          }
        }
      } catch (e) {
        if (!cancelled && !hasWarnedMissingKeyRef.current) {
          hasWarnedMissingKeyRef.current = true;
          console.warn('[FrameMyApp AI] Impossible de vérifier GEMINI_API_KEY auprès du serveur :', e);
        }
      }
    }
    checkAiConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateAiBackground = useCallback(async () => {
    if (isGeneratingAiBg) return;
    if (!aiPrompt.trim()) {
      setAiError('Veuillez saisir un prompt descriptif.');
      return;
    }

    const w = navigation.canvasWidth || 800;
    const h = navigation.canvasHeight || 600;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h)) || 1;
    const rw = Math.round(w / divisor);
    const rh = Math.round(h / divisor);
    const ratioVal = w / h;
    let aspectRatio = `${rw}:${rh}`;
    if (Math.abs(ratioVal - 16 / 9) < 0.03) aspectRatio = '16:9';
    else if (Math.abs(ratioVal - 9 / 16) < 0.03) aspectRatio = '9:16';
    else if (Math.abs(ratioVal - 1) < 0.03) aspectRatio = '1:1';
    else if (Math.abs(ratioVal - 4 / 3) < 0.03) aspectRatio = '4:3';
    else if (Math.abs(ratioVal - 3 / 4) < 0.03) aspectRatio = '3:4';
    else if (Math.abs(ratioVal - 3 / 1) < 0.05) aspectRatio = '3:1';

    setIsGeneratingAiBg(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedAiModel,
          prompt: aiPrompt.trim(),
          width: w,
          height: h,
          aspectRatio
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.dataUrl) {
        throw new Error(data.error || `Erreur lors de la génération (${response.status})`);
      }

      const { blob, ext } = dataUrlToBlob(data.dataUrl);
      const filename = `ai_bg_${Date.now()}.${ext || 'png'}`;
      const file = new File([blob], filename, { type: data.mimeType || 'image/png' });

      await applyBackgroundImage(data.dataUrl, file);
      setIsAiModalOpen(false);
    } catch (err: any) {
      console.error('[FrameMyApp AI] Échec de génération :', err);
      const msg = err.message || 'Échec de la génération par IA';
      setAiError(msg);
      showSnackbar(`Erreur IA : ${msg}`, 'error');
    } finally {
      setIsGeneratingAiBg(false);
    }
  }, [isGeneratingAiBg, aiPrompt, navigation.canvasWidth, navigation.canvasHeight, selectedAiModel, applyBackgroundImage, showSnackbar]);

  const contextValue = useMemo(
    () => ({
      state: {
        canvasWidth: navigation.canvasWidth,
        canvasHeight: navigation.canvasHeight,
        background,
        elements,
        selectedElementId,
        selectedElementIds,
        activePanel,
        exportZone: navigation.exportZone,
        isDrawingExportMode: navigation.isDrawingExportMode,
        theme,
        zoom: navigation.zoom,
        pan: navigation.pan,
        canUndo: history.canUndo,
        canRedo: history.canRedo
      },
      snackbar,
      isConfirmModalOpen,
      setIsConfirmModalOpen,
      isBatchExportModalOpen,
      setIsBatchExportModalOpen,
      isExportPreviewOpen,
      setIsExportPreviewOpen,
      exportPreviewData,
      isGeneratingPreview,
      openExportPreview,
      isLeftSidebarOpen,
      setIsLeftSidebarOpen,
      activeLeftTab,
      setActiveLeftTab,
      artboardRef,
      artboardContainerRef,
      viewportRef,
      setBackground,
      applyBackgroundImage,
      persistAsset,
      setCanvasDimensions: navigation.setCanvasDimensions,
      addText,
      addShape,
      addDevice,
      updateElement,
      updateElements,
      deleteElement,
      deleteSelectedElements,
      duplicateSelectedElements,
      moveSelectedElements,
      selectElement,
      selectElements,
      setActivePanel,
      editingImageElementId,
      setEditingImageElementId,
      updateExportZone: navigation.updateExportZone,
      setIsDrawingExportMode: navigation.setIsDrawingExportMode,
      showSnackbar,
      resetZoom: navigation.resetZoom,
      centerCanvas: navigation.centerCanvas,
      setZoom: navigation.setZoom,
      zoomIn: navigation.zoomIn,
      zoomOut: navigation.zoomOut,
      setPan: navigation.setPan,
      toggleTheme,
      recordHistory: history.recordHistory,
      undo: history.undo,
      redo: history.redo,
      clearAll,
      bringForward: hierarchy.bringForward,
      sendBackward: hierarchy.sendBackward,
      bringToFront: hierarchy.bringToFront,
      sendToBack: hierarchy.sendToBack,
      alignSelected: hierarchy.alignSelected,
      alignElementToCanvas: hierarchy.alignElementToCanvas,
      distributeSelected: hierarchy.distributeSelected,
      loadedBundle: bundleManager.loadedBundle,
      setLoadedBundle: bundleManager.setLoadedBundle,
      activeBundleItemId: bundleManager.activeBundleItemId,
      applyBundleItem: bundleManager.applyBundleItem,
      detachBundleAndResetToBlank,
      applyCompositionDirectly,
      exportCanvasAsTemplateYaml: bundleManager.exportCanvasAsTemplateYaml,
      exportCanvasAsBundleZip: bundleManager.exportCanvasAsBundleZip,
      updateElementCustomId,
      autoGenerateCustomIds,
      isItemDirty: bundleManager.isItemDirty,
      markItemSaved: bundleManager.markItemSaved,
      saveBundleItemToDisk: bundleManager.saveBundleItemToDisk,
      projectName: diskSync.projectName,
      setProjectName: diskSync.setProjectName,
      isSavePanelOpen,
      setIsSavePanelOpen,
      syncStatus: diskSync.syncStatus,
      lastSyncTime: diskSync.lastSyncTime,
      isAutoSyncEnabled: diskSync.isAutoSyncEnabled,
      setIsAutoSyncEnabled: diskSync.setIsAutoSyncEnabled,
      syncDirectoryName: diskSync.syncDirectoryName,
      setSyncDirectoryName: diskSync.setSyncDirectoryName,
      syncFilePath: diskSync.syncFilePath,
      setSyncFilePath: diskSync.setSyncFilePath,
      syncDirectoryHandle: diskSync.syncDirectoryHandle,
      setSyncDirectoryHandle: diskSync.setSyncDirectoryHandle,
      syncFileHandle: diskSync.syncFileHandle,
      syncToDisk: diskSync.syncToDisk,
      selectSyncDirectory: diskSync.selectSyncDirectory,
      selectSyncFile: diskSync.selectSyncFile,
      pauseDiskSync: diskSync.pauseDiskSync,
      resumeDiskSync: diskSync.resumeDiskSync,
      isPermissionModalOpen: diskSync.isPermissionModalOpen || Boolean(pendingYamlImport),
      permissionTargetName: pendingYamlImport ? pendingYamlImport.filename : diskSync.permissionTargetName,
      permissionDetectedAssets: pendingYamlImport ? pendingYamlImport.detectedAssets : diskSync.permissionDetectedAssets,
      permissionTitle: pendingYamlImport ? 'Charger les images du template ?' : diskSync.permissionTitle,
      permissionConfirmLabel: pendingYamlImport ? 'Sélectionner le dossier du projet' : diskSync.permissionConfirmLabel,
      permissionCancelLabel: pendingYamlImport ? 'Continuer sans les images' : diskSync.permissionCancelLabel,
      permissionErrorMessage: permissionModalError || diskSync.permissionErrorMessage,
      requestYamlAssetsPermission,
      authorizeDiskAccess,
      dismissDiskAccessAndStartNew,
      abortPendingImport,
      isAiModalOpen,
      setIsAiModalOpen,
      isGeneratingAiBg,
      aiHasApiKey,
      aiModels,
      selectedAiModel,
      setSelectedAiModel,
      aiPrompt,
      setAiPrompt,
      aiError,
      setAiError,
      generateAiBackground
    }),
    [
      navigation,
      background,
      elements,
      selectedElementId,
      selectedElementIds,
      activePanel,
      theme,
      history,
      snackbar,
      isConfirmModalOpen,
      isBatchExportModalOpen,
      isExportPreviewOpen,
      exportPreviewData,
      isGeneratingPreview,
      openExportPreview,
      isLeftSidebarOpen,
      activeLeftTab,
      setBackground,
      applyBackgroundImage,
      persistAsset,
      addText,
      addShape,
      addDevice,
      updateElement,
      updateElements,
      deleteElement,
      deleteSelectedElements,
      duplicateSelectedElements,
      moveSelectedElements,
      selectElement,
      selectElements,
      setActivePanel,
      editingImageElementId,
      showSnackbar,
      toggleTheme,
      clearAll,
      hierarchy,
      bundleManager,
      detachBundleAndResetToBlank,
      applyCompositionDirectly,
      updateElementCustomId,
      autoGenerateCustomIds,
      diskSync,
      isSavePanelOpen,
      pendingYamlImport,
      permissionModalError,
      requestYamlAssetsPermission,
      authorizeDiskAccess,
      dismissDiskAccessAndStartNew,
      abortPendingImport,
      isAiModalOpen,
      isGeneratingAiBg,
      aiHasApiKey,
      aiModels,
      selectedAiModel,
      aiPrompt,
      aiError,
      generateAiBackground
    ]
  );

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
