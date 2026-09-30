import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
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
  SyncStatus
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
import { assetManager } from '../utils/assetManager';
import { verifyDirectoryPermission, saveDirectoryHandleToIdb, readDirectoryBundle } from '../utils/bundleIo';

export { slugifyFilename, computeCanvasSignature };
export type { HistorySnapshot };

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

  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;
  isBatchExportModalOpen: boolean;
  setIsBatchExportModalOpen: (open: boolean) => void;
  isDocOpen: boolean;
  setIsDocOpen: (open: boolean) => void;
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
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  moveSelectedElements: (dx: number, dy: number, isRepeat?: boolean) => void;
  selectElement: (id: string | null, multi?: boolean) => void;
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
  applyBundleItem: (item: BundleItem) => void;
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
  requestYamlAssetsPermission: (item: BundleItem, filename: string, detectedAssets: string[]) => void;
  authorizeDiskAccess: () => Promise<void>;
  dismissDiskAccessAndStartNew: () => void;
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
  imageOverlayColor: '#FFFFFF11'
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
  x: 50,
  y: 40,
  width: 700,
  height: 525,
  preset: 'custom',
  ratio: 700 / 525,
  targetWidth: 1200,
  targetHeight: 900,
  lockRatio: true
};

function cleanDraftProject(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.background?.imageUrl?.startsWith('blob:')) {
      parsed.background.imageUrl = '';
    }
    if (Array.isArray(parsed.elements)) {
      parsed.elements = parsed.elements.map((el: any) => ({
        ...el,
        screenImageUrl: el.screenImageUrl?.startsWith('blob:') ? '' : el.screenImageUrl,
        imageUrl: el.imageUrl?.startsWith('blob:') ? '' : el.imageUrl
      }));
    }
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
  const [isDocOpen, setIsDocOpen] = useState<boolean>(false);
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
    showSnackbar
  });

  recordHistoryRef.current = history.recordHistory;

  // Forward declaration of bundle manager helpers
  const markItemSavedRef = useRef<(id: string) => void>(() => {});
  const loadedBundleRef = useRef<LoadedBundle | null>(null);

  // Hook 4: Disk Sync (Handles, Auto-Save, Renaming, Startup Restore)
  const diskSync = useDiskSync({
    canvasWidth: navigation.canvasWidth,
    canvasHeight: navigation.canvasHeight,
    background,
    elements,
    exportZone: navigation.exportZone,
    loadedBundle: loadedBundleRef.current,
    activeBundleItemId: null,
    setCanvasWidth: navigation.setCanvasWidth,
    setCanvasHeight: navigation.setCanvasHeight,
    setBackground: setBackgroundState,
    setElements,
    setExportZone: navigation.setExportZoneState,
    setLoadedBundleState: () => {},
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
    setSyncFilePath: diskSync.setSyncFilePath,
    setSyncStatus: diskSync.setSyncStatus,
    lastSavedSignatureRef: diskSync.lastSavedSignatureRef,
    recordHistory: history.recordHistory,
    applyCompositionDirectly,
    showSnackbar
  });

  loadedBundleRef.current = bundleManager.loadedBundle;
  markItemSavedRef.current = bundleManager.markItemSaved;

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
      const { assetPath, displayUrl } = assetManager.registerAsset(file.name, file);
      assetManager.registerUrlMapping(displayUrl, assetPath);

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
          await assetManager.saveAllToDirectory(dirHandle);
          const cleanName = assetPath.split('/').pop();
          showSnackbar(`Image copiée sur disque : assets/${cleanName}`, 'save');
        } catch (err: any) {
          console.warn('Erreur lors de la sauvegarde sur disque de l’asset:', err);
          showSnackbar(`Impossible d'écrire dans assets/ : ${err.message || ''}`, 'warning');
        }
      } else {
        showSnackbar('Image conservée en mémoire (connectez un dossier pour assets/)', 'info');
      }

      return { assetPath, displayUrl };
    },
    [diskSync, bundleManager.loadedBundle?.directoryHandle, showSnackbar]
  );

  const applyBackgroundImage = useCallback(
    async (imageUrl: string, file?: File) => {
      let finalUrl = imageUrl;
      if (file) {
        const { displayUrl } = await persistAsset(file);
        assetManager.registerUrlMapping(imageUrl, displayUrl);
        finalUrl = displayUrl;
      }

      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || 800;
        const naturalHeight = img.naturalHeight || 600;

        history.recordHistory();
        setBackgroundState(prev => ({
          ...prev,
          type: 'image',
          imageUrl: finalUrl,
          imageFit: prev.imageFit || 'cover',
          imageOffsetX: 0,
          imageOffsetY: 0,
          imageScale: 1.0,
          imageNaturalWidth: naturalWidth,
          imageNaturalHeight: naturalHeight
        }));

        showSnackbar(`Image de fond appliquée (${naturalWidth} × ${naturalHeight} px)`, 'image');
      };
      img.onerror = () => {
        history.recordHistory();
        setBackgroundState(prev => ({ ...prev, type: 'image', imageUrl: finalUrl }));
        showSnackbar('Image de fond appliquée', 'image');
      };
      img.src = finalUrl;
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

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
    if (panel === 'bg' || panel === 'export') {
      setSelectedElementIds([]);
    }
  }, []);

  const clearAll = useCallback(() => {
    history.recordHistory();
    navigation.setCanvasWidth(800);
    navigation.setCanvasHeight(600);
    setElements([]);
    setBackgroundState(initialBackground);
    setSelectedElementIds([]);
    setActivePanelState(null);
    bundleManager.setActiveBundleItemId(null);
    navigation.setExportZoneState(initialExportZone);
    navigation.resetZoom();
    try {
      localStorage.removeItem('framemyapp_draft_project');
    } catch {}
    showSnackbar('Projet réinitialisé', 'delete_sweep');
  }, [history, navigation, bundleManager, showSnackbar]);

  const [pendingYamlImport, setPendingYamlImport] = useState<{
    item: BundleItem;
    filename: string;
    detectedAssets: string[];
  } | null>(null);

  const requestYamlAssetsPermission = useCallback(
    (item: BundleItem, filename: string, detectedAssets: string[]) => {
      setPendingYamlImport({ item, filename, detectedAssets });
    },
    []
  );

  const authorizeDiskAccess = useCallback(async () => {
    if (pendingYamlImport) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop'
        });
        if (dirHandle) {
          await verifyDirectoryPermission(dirHandle, true, true);
          const bundle = await readDirectoryBundle(dirHandle);
          if (!bundle.master) {
            bundle.master = pendingYamlImport.item;
          }
          bundleManager.setLoadedBundle(bundle);
          diskSync.setProjectName(pendingYamlImport.item.name || bundle.name);
          diskSync.setSyncDirectoryName(bundle.name);
          diskSync.setSyncDirectoryHandle(dirHandle);
          diskSync.setSyncFilePath(pendingYamlImport.filename);
          saveDirectoryHandleToIdb(dirHandle, 'sync_dir_handle');
          saveDirectoryHandleToIdb(dirHandle, 'root_bundle_dir');
          bundleManager.applyBundleItem(bundle.master || pendingYamlImport.item);
          setPendingYamlImport(null);
          showSnackbar(`Template et dossier connectés : ${dirHandle.name}`, 'folder_open');
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('showDirectoryPicker error:', err);
        }
        return;
      }
    }
    await diskSync.authorizeDiskAccess();
  }, [pendingYamlImport, bundleManager, diskSync, showSnackbar]);

  const dismissDiskAccessAndStartNew = useCallback(() => {
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
    diskSync.dismissDiskAccessAndStartNew();
  }, [pendingYamlImport, bundleManager, diskSync, showSnackbar]);

  return (
    <EditorContext.Provider
      value={{
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
        isDocOpen,
        setIsDocOpen,
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
        deleteElement,
        deleteSelectedElements,
        moveSelectedElements,
        selectElement,
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
        isPermissionModalOpen: diskSync.isPermissionModalOpen || Boolean(pendingYamlImport),
        permissionTargetName: pendingYamlImport ? pendingYamlImport.filename : diskSync.permissionTargetName,
        permissionDetectedAssets: pendingYamlImport ? pendingYamlImport.detectedAssets : [],
        permissionTitle: pendingYamlImport ? 'Charger les images du template ?' : undefined,
        permissionConfirmLabel: pendingYamlImport ? 'Sélectionner le dossier du projet' : 'Autoriser l’accès',
        permissionCancelLabel: pendingYamlImport ? 'Continuer sans les images' : 'Nouveau document',
        requestYamlAssetsPermission,
        authorizeDiskAccess,
        dismissDiskAccessAndStartNew
      }}
    >
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
