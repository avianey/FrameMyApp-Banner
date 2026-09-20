import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  EditorState,
  BackgroundConfig,
  CanvasElement,
  TextElementModel,
  ShapeElementModel,
  ShapeType,
  ExportZone,
  ActivePanel,
  LoadedBundle,
  BundleItem,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig
} from '../types';
import {
  resolveComposition,
  serializeCanvasToMaster,
  serializeCanvasToVariant,
  serializeCanvasToOverride
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
import {
  alignElements,
  distributeElements,
  AlignReference,
  AlignType,
  DistributeType
} from '../utils/alignment';

interface SnackbarState {
  message: string;
  icon: string;
  visible: boolean;
}

interface HistorySnapshot {
  canvasWidth?: number;
  canvasHeight?: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
}

interface EditorContextType {
  state: EditorState;
  snackbar: SnackbarState;
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
  applyBackgroundImage: (imageUrl: string) => void;
  setCanvasDimensions: (width: number, height: number) => void;
  addText: () => void;
  addShape: (shapeType?: ShapeType) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  selectElement: (id: string | null, multi?: boolean) => void;
  setActivePanel: (panel: ActivePanel) => void;
  updateExportZone: (updates: Partial<ExportZone>) => void;
  setIsDrawingExportMode: (mode: boolean) => void;
  showSnackbar: (message: string, icon?: string) => void;
  resetZoom: () => void;
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
  alignSelected: (type: AlignType, reference: AlignReference) => void;
  distributeSelected: (type: DistributeType, reference: AlignReference, customGap?: number) => void;

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
  imageFit: 'cover'
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
    rotation: 12,
    fillType: 'linear',
    solidColor: 'rgba(16, 185, 129, 0.9)',
    color1: 'rgba(6, 182, 212, 0.9)',
    color2: 'rgba(59, 130, 246, 0.9)',
    angle: 45,
    radialColor1: 'rgba(245, 158, 11, 1)',
    radialColor2: 'rgba(220, 38, 38, 0.85)',
    imageUrl: '',
    opacity: 0.95,
    borderRadius: 32,
    stroke: {
      enable: true,
      width: 3,
      color: 'rgba(255, 255, 255, 0.9)'
    },
    shadow: {
      enable: true,
      color: 'rgba(0, 0, 0, 0.35)',
      blur: 16,
      x: 4,
      y: 8
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

function computeCanvasSignature(
  bg: BackgroundConfig,
  els: CanvasElement[],
  zone: ExportZone,
  w?: number,
  h?: number
): string {
  return JSON.stringify({
    bg,
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
          imageUrl: s.imageUrl
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

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [canvasWidth, setCanvasWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);
  const [background, setBackgroundState] = useState<BackgroundConfig>(initialBackground);
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const selectedElementId = selectedElementIds.length > 0 ? selectedElementIds[selectedElementIds.length - 1] : null;
  const [activePanel, setActivePanelState] = useState<ActivePanel>(null);
  const [exportZone, setExportZoneState] = useState<ExportZone>(initialExportZone);
  const [isDrawingExportMode, setIsDrawingExportModeState] = useState<boolean>(false);
  const [zoom, setZoomState] = useState<number>(1.0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [pan, setPanState] = useState<{ x: number; y: number }>({ x: 60, y: 40 });
  const panRef = useRef(pan);
  panRef.current = pan;
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Bundle & Templates state with persistent directory handle
  const [loadedBundle, setLoadedBundleState] = useState<LoadedBundle | null>(null);
  const bundleDirHandleRef = useRef<any>(null);

  // Restore persisted directory handle from IDB on app mount
  useEffect(() => {
    getDirectoryHandleFromIdb().then(handle => {
      if (handle) {
        bundleDirHandleRef.current = handle;
      }
    });
  }, []);

  const setLoadedBundle = useCallback((bundle: LoadedBundle | null) => {
    if (bundle) {
      if (bundle.directoryHandle) {
        bundleDirHandleRef.current = bundle.directoryHandle;
        saveDirectoryHandleToIdb(bundle.directoryHandle);
      } else if (bundleDirHandleRef.current) {
        bundle.directoryHandle = bundleDirHandleRef.current;
      }
    }
    setLoadedBundleState(bundle);
  }, []);

  const [activeBundleItemId, setActiveBundleItemId] = useState<string | null>(null);
  const [savedCanvasSignatures, setSavedCanvasSignatures] = useState<Record<string, string>>({});
  const [isBatchExportModalOpen, setIsBatchExportModalOpen] = useState<boolean>(false);
  const [isDocOpen, setIsDocOpen] = useState<boolean>(false);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'templates' | 'customIds'>('templates');

  // Undo / Redo history stacks
  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const recordHistory = useCallback(() => {
    pastRef.current.push({
      canvasWidth,
      canvasHeight,
      background: JSON.parse(JSON.stringify(background)),
      elements: JSON.parse(JSON.stringify(elements)),
      exportZone: JSON.parse(JSON.stringify(exportZone))
    });
    if (pastRef.current.length > 50) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    updateHistoryFlags();
  }, [canvasWidth, canvasHeight, background, elements, exportZone, updateHistoryFlags]);

  // Theme support
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

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: 'Notification',
    icon: 'check_circle',
    visible: false
  });

  const snackbarTimerRef = useRef<number | null>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const artboardContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Centrage initial de la composition dans le viewport
  useEffect(() => {
    const centerIfReady = () => {
      if (viewportRef.current) {
        const vp = viewportRef.current;
        if (vp.clientWidth > 0 && vp.clientHeight > 0) {
          const initX = Math.round((vp.clientWidth - canvasWidth * zoomRef.current) / 2);
          const initY = Math.round((vp.clientHeight - canvasHeight * zoomRef.current) / 2);
          setPanState({ x: initX, y: initY });
          panRef.current = { x: initX, y: initY };
          return true;
        }
      }
      return false;
    };

    if (!centerIfReady()) {
      const timer = setTimeout(centerIfReady, 50);
      return () => clearTimeout(timer);
    }
  }, [canvasWidth, canvasHeight]);

  const showSnackbar = useCallback((message: string, icon = 'check_circle') => {
    if (snackbarTimerRef.current) {
      window.clearTimeout(snackbarTimerRef.current);
    }
    setSnackbar({ message, icon, visible: true });
    snackbarTimerRef.current = window.setTimeout(() => {
      setSnackbar(prev => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const currentSnapshot: HistorySnapshot = {
      canvasWidth,
      canvasHeight,
      background: JSON.parse(JSON.stringify(background)),
      elements: JSON.parse(JSON.stringify(elements)),
      exportZone: JSON.parse(JSON.stringify(exportZone))
    };
    futureRef.current.push(currentSnapshot);

    const previousSnapshot = pastRef.current.pop();
    if (previousSnapshot) {
      if (previousSnapshot.canvasWidth) setCanvasWidth(previousSnapshot.canvasWidth);
      if (previousSnapshot.canvasHeight) setCanvasHeight(previousSnapshot.canvasHeight);
      setBackgroundState(previousSnapshot.background);
      setElements(previousSnapshot.elements);
      setExportZoneState(previousSnapshot.exportZone);

      setSelectedElementIds(prevIds =>
        prevIds.filter(id => previousSnapshot.elements.some(e => e.id === id))
      );
    }

    updateHistoryFlags();
    showSnackbar('Action annulée (Undo)', 'undo');
  }, [canvasWidth, canvasHeight, background, elements, exportZone, updateHistoryFlags, showSnackbar]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const currentSnapshot: HistorySnapshot = {
      canvasWidth,
      canvasHeight,
      background: JSON.parse(JSON.stringify(background)),
      elements: JSON.parse(JSON.stringify(elements)),
      exportZone: JSON.parse(JSON.stringify(exportZone))
    };
    pastRef.current.push(currentSnapshot);

    const nextSnapshot = futureRef.current.pop();
    if (nextSnapshot) {
      if (nextSnapshot.canvasWidth) setCanvasWidth(nextSnapshot.canvasWidth);
      if (nextSnapshot.canvasHeight) setCanvasHeight(nextSnapshot.canvasHeight);
      setBackgroundState(nextSnapshot.background);
      setElements(nextSnapshot.elements);
      setExportZoneState(nextSnapshot.exportZone);

      setSelectedElementIds(prevIds =>
        prevIds.filter(id => nextSnapshot.elements.some(e => e.id === id))
      );
    }

    updateHistoryFlags();
    showSnackbar('Action rétablie (Redo)', 'redo');
  }, [canvasWidth, canvasHeight, background, elements, exportZone, updateHistoryFlags, showSnackbar]);

  const clearAll = useCallback(() => {
    recordHistory();
    setCanvasWidth(800);
    setCanvasHeight(600);
    setElements([]);
    setBackgroundState(initialBackground);
    setSelectedElementIds([]);
    setActivePanelState(null);
    setActiveBundleItemId(null);
    setExportZoneState(initialExportZone);
    setZoomState(1.0);
    showSnackbar('Projet réinitialisé', 'delete_sweep');
  }, [recordHistory, showSnackbar]);

  const setBackground = useCallback(
    (updates: Partial<BackgroundConfig>) => {
      recordHistory();
      setBackgroundState(prev => ({ ...prev, ...updates }));
    },
    [recordHistory]
  );

  const addText = useCallback(() => {
    recordHistory();
    const id = 'txt-' + Date.now();
    setElements(prev => {
      const textCount = prev.filter(e => e.type === 'text').length + 1;
      const customId = textCount === 1 ? 'title' : textCount === 2 ? 'subtitle' : `text_${textCount}`;
      const offset = (prev.length * 15) % 200;
      const newText: TextElementModel = {
        id,
        customId,
        type: 'text',
        text: 'Nouveau Texte',
        x: 120 + offset,
        y: 120 + offset,
        width: 280,
        height: 60,
        rotation: 0,
        fontFamily: 'Roboto',
        fontWeight: 400,
        fontSize: 32,
        color: 'rgba(30, 27, 75, 1)',
        letterSpacing: 0,
        lineHeight: 1.3,
        minLines: 1,
        glow: { enable: false, color: 'rgba(56, 189, 248, 0.75)', blur: 10, x: 0, y: 0 },
        shadow: { enable: false, color: 'rgba(0, 0, 0, 0.3)', blur: 4, x: 2, y: 2 }
      };
      return [...prev, newText];
    });
    setSelectedElementIds([id]);
    setActivePanelState('text');
  }, [recordHistory]);

  const addShape = useCallback(
    (shapeType: ShapeType = 'rounded-rect') => {
      recordHistory();
      const id = 'shape-' + Date.now();
      setElements(prev => {
        const shapeCount = prev.filter(e => e.type === 'shape').length + 1;
        const customId = shapeCount === 1 ? 'hero_badge' : `shape_${shapeCount}`;
        const offset = (prev.length * 15) % 200;
        const newShape: ShapeElementModel = {
          id,
          customId,
          type: 'shape',
          shapeType,
          x: 140 + offset,
          y: 140 + offset,
          width: 190,
          height: 190,
          rotation: 0,
          fillType: 'solid',
          solidColor: 'rgba(103, 80, 164, 0.9)',
          color1: 'rgba(139, 92, 246, 0.9)',
          color2: 'rgba(236, 72, 153, 0.9)',
          angle: 90,
          radialColor1: 'rgba(251, 191, 36, 1)',
          radialColor2: 'rgba(185, 28, 28, 0.9)',
          imageUrl: '',
          opacity: 1,
          borderRadius: 16,
          stroke: {
            enable: false,
            width: 2,
            color: 'rgba(255, 255, 255, 1)'
          },
          shadow: {
            enable: true,
            color: 'rgba(0, 0, 0, 0.25)',
            blur: 14,
            x: 0,
            y: 6
          }
        };
        return [...prev, newShape];
      });
      setSelectedElementIds([id]);
      setActivePanelState('shape');
    },
    [recordHistory]
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
    recordHistory();
    let textIdx = 1;
    let shapeIdx = 1;
    setElements(prev =>
      prev.map(el => {
        if (el.customId && el.customId.trim()) return el;
        let newCustomId = '';
        if (el.type === 'text') {
          newCustomId = textIdx === 1 ? 'title' : textIdx === 2 ? 'subtitle' : `text_${textIdx}`;
          textIdx++;
        } else {
          newCustomId = shapeIdx === 1 ? 'badge_card' : `shape_${shapeIdx}`;
          shapeIdx++;
        }
        return { ...el, customId: newCustomId } as CanvasElement;
      })
    );
    showSnackbar('IDs personnalisés générés avec succès', 'badge');
  }, [recordHistory, showSnackbar]);

  const deleteElement = useCallback(
    (id: string) => {
      recordHistory();
      setElements(prev => prev.filter(el => el.id !== id));
      setSelectedElementIds(prev => {
        const next = prev.filter(x => x !== id);
        if (next.length === 0) {
          setActivePanelState(null);
        } else if (next.length === 1) {
          setElements(currentEls => {
            const remaining = currentEls.find(e => e.id === next[0]);
            if (remaining) {
              setActivePanelState(remaining.type === 'text' ? 'text' : 'shape');
            }
            return currentEls;
          });
        }
        return next;
      });
    },
    [recordHistory]
  );

  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    recordHistory();
    const count = selectedElementIds.length;
    const idsToDelete = new Set(selectedElementIds);
    setElements(prev => prev.filter(el => !idsToDelete.has(el.id)));
    setSelectedElementIds([]);
    setActivePanelState(null);
    showSnackbar(`${count} élément${count > 1 ? 's supprimés' : ' supprimé'}`, 'delete_sweep');
  }, [selectedElementIds, recordHistory, showSnackbar]);

  const selectElement = useCallback((id: string | null, multi = false) => {
    if (!id) {
      setSelectedElementIds([]);
      setActivePanelState(prev => (prev === 'text' || prev === 'shape' || prev === 'align' ? null : prev));
      return;
    }

    if (multi) {
      setSelectedElementIds(prev => {
        let next: string[];
        if (prev.includes(id)) {
          next = prev.filter(x => x !== id);
        } else {
          next = [...prev, id];
        }

        if (next.length === 0) {
          setActivePanelState(null);
        } else if (next.length === 1) {
          const singleId = next[0];
          setElements(currentEls => {
            const found = currentEls.find(e => e.id === singleId);
            if (found) {
              setActivePanelState(found.type === 'text' ? 'text' : 'shape');
            }
            return currentEls;
          });
        } else {
          setActivePanelState('align');
        }

        return next;
      });
    } else {
      setSelectedElementIds([id]);
      setElements(currentEls => {
        const found = currentEls.find(e => e.id === id);
        if (found) {
          setActivePanelState(found.type === 'text' ? 'text' : 'shape');
        }
        return currentEls;
      });
    }
  }, []);

  // Layer hierarchy actions
  const bringForward = useCallback(
    (id: string) => {
      recordHistory();
      setElements(prev => {
        const idx = prev.findIndex(e => e.id === id);
        if (idx === -1 || idx >= prev.length - 1) return prev;
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx + 1];
        next[idx + 1] = temp;
        return next;
      });
      showSnackbar('Calque monté d’un niveau', 'keyboard_arrow_up');
    },
    [recordHistory, showSnackbar]
  );

  const sendBackward = useCallback(
    (id: string) => {
      recordHistory();
      setElements(prev => {
        const idx = prev.findIndex(e => e.id === id);
        if (idx <= 0) return prev;
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[idx - 1];
        next[idx - 1] = temp;
        return next;
      });
      showSnackbar('Calque descendu d’un niveau', 'keyboard_arrow_down');
    },
    [recordHistory, showSnackbar]
  );

  const bringToFront = useCallback(
    (id: string) => {
      recordHistory();
      setElements(prev => {
        const target = prev.find(e => e.id === id);
        if (!target) return prev;
        return [...prev.filter(e => e.id !== id), target];
      });
      showSnackbar('Placé au premier plan', 'vertical_align_top');
    },
    [recordHistory, showSnackbar]
  );

  const sendToBack = useCallback(
    (id: string) => {
      recordHistory();
      setElements(prev => {
        const target = prev.find(e => e.id === id);
        if (!target) return prev;
        return [target, ...prev.filter(e => e.id !== id)];
      });
      showSnackbar('Placé à l’arrière-plan', 'vertical_align_bottom');
    },
    [recordHistory, showSnackbar]
  );

  // Alignment & Distribution actions
  const alignSelected = useCallback(
    (type: AlignType, reference: AlignReference) => {
      if (selectedElementIds.length === 0) return;
      recordHistory();
      setElements(prev =>
        alignElements(prev, selectedElementIds, type, reference, {
          width: canvasWidth,
          height: canvasHeight
        })
      );
      showSnackbar('Alignement appliqué', 'format_align_center');
    },
    [selectedElementIds, canvasWidth, canvasHeight, recordHistory, showSnackbar]
  );

  const distributeSelected = useCallback(
    (type: DistributeType, reference: AlignReference, customGap?: number) => {
      if (selectedElementIds.length < 2) return;
      recordHistory();
      setElements(prev =>
        distributeElements(
          prev,
          selectedElementIds,
          type,
          reference,
          { width: canvasWidth, height: canvasHeight },
          customGap
        )
      );
      showSnackbar('Espacement uniforme appliqué', 'distribute_horizontal');
    },
    [selectedElementIds, canvasWidth, canvasHeight, recordHistory, showSnackbar]
  );

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
    if (panel === 'bg' || panel === 'export') {
      setSelectedElementIds([]);
    }
  }, []);

  const updateExportZone = useCallback((updates: Partial<ExportZone>) => {
    setExportZoneState(prev => ({ ...prev, ...updates }));
  }, []);

  const setIsDrawingExportMode = useCallback((mode: boolean) => {
    setIsDrawingExportModeState(mode);
  }, []);

  const setPan = useCallback((panOrUpdater: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    setPanState(prev => {
      const next = typeof panOrUpdater === 'function' ? panOrUpdater(prev) : panOrUpdater;
      panRef.current = next;
      return next;
    });
  }, []);

  const setZoom = useCallback(
    (
      zoomOrUpdater: number | ((prev: number) => number),
      focalPoint?: { clientX: number; clientY: number }
    ) => {
      const prevZoom = zoomRef.current;
      const targetRaw = typeof zoomOrUpdater === 'function' ? zoomOrUpdater(prevZoom) : zoomOrUpdater;
      const nextZoom = Math.min(3.5, Math.max(0.2, Math.round(targetRaw * 100) / 100));

      if (nextZoom === prevZoom) return;

      const vp = viewportRef.current;
      const currentPan = panRef.current;

      if (!vp) {
        setZoomState(nextZoom);
        zoomRef.current = nextZoom;
        return;
      }

      const vpRect = vp.getBoundingClientRect();
      let focalVpX: number;
      let focalVpY: number;

      if (focalPoint) {
        // Zoom via roulette : le point pointé par la souris (dans le repère du viewport)
        focalVpX = focalPoint.clientX - vpRect.left;
        focalVpY = focalPoint.clientY - vpRect.top;
      } else {
        // Zoom via loupes de la toolbar / boutons +/- : le CENTRE DE LA COMPOSITION
        focalVpX = currentPan.x + (canvasWidth / 2) * prevZoom;
        focalVpY = currentPan.y + (canvasHeight / 2) * prevZoom;
      }

      // Coordonnées du point focal dans le document de composition
      const canvasX = (focalVpX - currentPan.x) / prevZoom;
      const canvasY = (focalVpY - currentPan.y) / prevZoom;

      // Nouvelle position pan pour que le point (canvasX, canvasY) reste immobile à (focalVpX, focalVpY)
      const newPanX = Math.round(focalVpX - canvasX * nextZoom);
      const newPanY = Math.round(focalVpY - canvasY * nextZoom);

      setZoomState(nextZoom);
      zoomRef.current = nextZoom;

      setPanState({ x: newPanX, y: newPanY });
      panRef.current = { x: newPanX, y: newPanY };
    },
    [canvasWidth, canvasHeight, viewportRef]
  );

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(3.5, prev + 0.15));
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.2, prev - 0.15));
  }, [setZoom]);

  const resetZoom = useCallback(() => {
    setZoomState(1.0);
    zoomRef.current = 1.0;
    if (viewportRef.current) {
      const vp = viewportRef.current;
      const centeredX = Math.round((vp.clientWidth - canvasWidth) / 2);
      const centeredY = Math.round((vp.clientHeight - canvasHeight) / 2);
      setPanState({ x: centeredX, y: centeredY });
      panRef.current = { x: centeredX, y: centeredY };
      showSnackbar('Vue recentrée (100%)', 'center_focus_strong');
    }
  }, [canvasWidth, canvasHeight, showSnackbar, viewportRef]);

  const setCanvasDimensions = useCallback(
    (width: number, height: number) => {
      recordHistory();
      setCanvasWidth(width);
      setCanvasHeight(height);

      // Adapter le zoom et centrer la scène dans le viewport si nécessaire
      if (viewportRef.current) {
        const vpW = viewportRef.current.clientWidth - 80;
        const vpH = viewportRef.current.clientHeight - 80;
        if (vpW > 100 && vpH > 100 && (width > vpW || height > vpH)) {
          const fitZoom = Math.min(1.0, Math.max(0.1, Math.min(vpW / width, vpH / height)));
          const roundFit = Math.round(fitZoom * 100) / 100;
          setZoomState(roundFit);
          zoomRef.current = roundFit;
          const newPanX = Math.round((viewportRef.current.clientWidth - width * roundFit) / 2);
          const newPanY = Math.round((viewportRef.current.clientHeight - height * roundFit) / 2);
          setPanState({ x: newPanX, y: newPanY });
          panRef.current = { x: newPanX, y: newPanY };
        } else {
          const currentZ = zoomRef.current || 1.0;
          const newPanX = Math.round((viewportRef.current.clientWidth - width * currentZ) / 2);
          const newPanY = Math.round((viewportRef.current.clientHeight - height * currentZ) / 2);
          setPanState({ x: newPanX, y: newPanY });
          panRef.current = { x: newPanX, y: newPanY };
        }
      }
    },
    [recordHistory, viewportRef]
  );

  const applyBackgroundImage = useCallback(
    (imageUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || 800;
        const naturalHeight = img.naturalHeight || 600;

        recordHistory();
        setCanvasWidth(naturalWidth);
        setCanvasHeight(naturalHeight);
        setBackgroundState(prev => ({
          ...prev,
          type: 'image',
          imageUrl,
          imageFit: 'cover'
        }));

        // La zone de crop est définie sur les dimensions exactes de l'image
        setExportZoneState({
          x: 0,
          y: 0,
          width: naturalWidth,
          height: naturalHeight,
          ratio: naturalWidth / naturalHeight,
          targetWidth: naturalWidth,
          targetHeight: naturalHeight,
          preset: 'custom',
          lockRatio: true
        });

        // Zoom automatique pour ajuster à l'écran si nécessaire
        if (viewportRef.current) {
          const vpW = viewportRef.current.clientWidth - 100;
          const vpH = viewportRef.current.clientHeight - 100;
          let currentFit = 1.0;
          if (vpW > 100 && vpH > 100 && (naturalWidth > vpW || naturalHeight > vpH)) {
            const fitZoom = Math.min(1.0, Math.max(0.1, Math.min(vpW / naturalWidth, vpH / naturalHeight)));
            currentFit = Math.round(fitZoom * 100) / 100;
            setZoomState(currentFit);
            zoomRef.current = currentFit;
          }
          const newPanX = Math.round((viewportRef.current.clientWidth - naturalWidth * currentFit) / 2);
          const newPanY = Math.round((viewportRef.current.clientHeight - naturalHeight * currentFit) / 2);
          setPanState({ x: newPanX, y: newPanY });
          panRef.current = { x: newPanX, y: newPanY };
        }

        showSnackbar(`Image de fond appliquée : composition adaptée à ${naturalWidth} × ${naturalHeight} px`, 'aspect_ratio');
      };
      img.onerror = () => {
        recordHistory();
        setBackgroundState(prev => ({ ...prev, type: 'image', imageUrl }));
        showSnackbar('Image de fond appliquée', 'image');
      };
      img.src = imageUrl;
    },
    [recordHistory, showSnackbar, viewportRef]
  );

  // Apply composition directly (e.g. from resolved template or undo)
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
        recordHistory();
      }
      setBackgroundState(comp.background);
      setElements(comp.elements);
      setExportZoneState(comp.exportZone);
      setSelectedElementIds([]);

      // Dimensions fixes définies par la composition (master/override/variant)
      const targetW = comp.canvasWidth || comp.exportZone?.width || 800;
      const targetH = comp.canvasHeight || comp.exportZone?.height || 600;

      setCanvasWidth(targetW);
      setCanvasHeight(targetH);

      // Adapter le zoom et centrer la composition dans le viewport si nécessaire
      if (viewportRef.current) {
        const vpW = viewportRef.current.clientWidth - 80;
        const vpH = viewportRef.current.clientHeight - 80;
        if (vpW > 100 && vpH > 100 && (targetW > vpW || targetH > vpH)) {
          const fitZoom = Math.min(1.0, Math.max(0.1, Math.min(vpW / targetW, vpH / targetH)));
          const roundFit = Math.round(fitZoom * 100) / 100;
          setZoomState(roundFit);
          zoomRef.current = roundFit;
          const newPanX = Math.round((viewportRef.current.clientWidth - targetW * roundFit) / 2);
          const newPanY = Math.round((viewportRef.current.clientHeight - targetH * roundFit) / 2);
          setPanState({ x: newPanX, y: newPanY });
          panRef.current = { x: newPanX, y: newPanY };
        } else {
          const currentZ = zoomRef.current || 1.0;
          const newPanX = Math.round((viewportRef.current.clientWidth - targetW * currentZ) / 2);
          const newPanY = Math.round((viewportRef.current.clientHeight - targetH * currentZ) / 2);
          setPanState({ x: newPanX, y: newPanY });
          panRef.current = { x: newPanX, y: newPanY };
        }
      }
    },
    [recordHistory, viewportRef]
  );

  // Compute live canvas signature to track changes
  const currentCanvasSignature = useMemo(() => {
    return computeCanvasSignature(background, elements, exportZone, canvasWidth, canvasHeight);
  }, [background, elements, exportZone, canvasWidth, canvasHeight]);

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

  // Apply a BundleItem with cascade resolution
  const applyBundleItem = useCallback(
    (item: BundleItem) => {
      if (!loadedBundle) return;
      recordHistory();

      const masterConfig = (loadedBundle.master?.config as BannerMasterConfig) || {};
      let resolved: { background: BackgroundConfig; elements: CanvasElement[]; exportZone: ExportZone; canvasWidth: number; canvasHeight: number };

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
        // Variant: check if there's a matching override for this slug
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

      // Record baseline signature so dirty detection starts clean
      const initialSig = computeCanvasSignature(
        resolved.background,
        resolved.elements,
        resolved.exportZone,
        resolved.canvasWidth,
        resolved.canvasHeight
      );
      setSavedCanvasSignatures(prev => ({
        ...prev,
        [item.id]: initialSig
      }));

      showSnackbar(`Appliqué : ${item.name}`, 'auto_stories');
    },
    [loadedBundle, recordHistory, applyCompositionDirectly, showSnackbar]
  );

  // Save current canvas state directly back to the YAML file on the filesystem
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
          // Variant
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

        // Prompt directory picker ONLY if no root handle was ever loaded or persisted
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
          await writeTextToDirectory(dirHandle, item.path, yamlContent);
          showSnackbar(`Enregistré dans : ${item.path}`, 'save');
        } else {
          downloadFile(item.path.split('/').pop() || 'template.yml', yamlContent, 'text/yaml');
          showSnackbar(`Fichier téléchargé : ${item.path}`, 'download');
        }

        // Update in-memory item
        const updatedItem: BundleItem = {
          ...item,
          rawContent: yamlContent,
          config: updatedConfig
        };

        if (item.type === 'master') {
          setLoadedBundle({
            ...loadedBundle,
            master: updatedItem
          });
        } else if (item.type === 'override') {
          setLoadedBundle({
            ...loadedBundle,
            overrides: {
              ...loadedBundle.overrides,
              [item.slug]: updatedItem
            }
          });
        } else {
          setLoadedBundle({
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

  // Export current canvas state as a standalone YAML file
  const exportCanvasAsTemplateYaml = useCallback(
    (customName?: string) => {
      const templateName = customName || loadedBundle?.master?.name || 'banner_template';
      const masterConfig = serializeCanvasToMaster(templateName, background, elements, exportZone, canvasWidth, canvasHeight);
      const yamlStr = stringifyYaml(masterConfig);
      const filename = `${templateName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.yml`;
      downloadFile(filename, yamlStr, 'text/yaml');
      showSnackbar(`Template exporté : ${filename}`, 'download');
    },
    [background, elements, exportZone, canvasWidth, canvasHeight, loadedBundle, showSnackbar]
  );

  // Export current canvas state into a complete Bundle ZIP
  const exportCanvasAsBundleZip = useCallback(async () => {
    try {
      const currentMaster = serializeCanvasToMaster(
        loadedBundle?.name || 'marketing_bundle',
        background,
        elements,
        exportZone,
        canvasWidth,
        canvasHeight
      );

      const bundleToExport: LoadedBundle = loadedBundle || {
        name: 'marketing_bundle',
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
  }, [loadedBundle, background, elements, exportZone, showSnackbar]);

  const selectedElementIdsRef = useRef<string[]>(selectedElementIds);
  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  // Global keyboard shortcuts for Suppr / Del, Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        activeEl?.classList.contains('editable-text-content');

      if (isInput) return;

      // Touche Suppr / Del / Backspace pour supprimer le(s) élément(s) sélectionné(s)
      if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
        const currentIds = selectedElementIdsRef.current;
        if (currentIds.length > 1) {
          e.preventDefault();
          deleteSelectedElements();
          return;
        } else if (currentIds.length === 1) {
          e.preventDefault();
          deleteElement(currentIds[0]);
          showSnackbar('Élément supprimé', 'delete');
          return;
        }
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (!cmdOrCtrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteElement, deleteSelectedElements, undo, redo, showSnackbar]);

  return (
    <EditorContext.Provider
      value={{
        state: {
          canvasWidth,
          canvasHeight,
          background,
          elements,
          selectedElementId,
          selectedElementIds,
          activePanel,
          exportZone,
          isDrawingExportMode,
          theme,
          zoom,
          pan,
          canUndo,
          canRedo
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
        setCanvasDimensions,
        addText,
        addShape,
        updateElement,
        deleteElement,
        deleteSelectedElements,
        selectElement,
        setActivePanel,
        updateExportZone,
        setIsDrawingExportMode,
        showSnackbar,
        resetZoom,
        setZoom,
        zoomIn,
        zoomOut,
        setPan,
        toggleTheme,
        recordHistory,
        undo,
        redo,
        clearAll,
        bringForward,
        sendBackward,
        bringToFront,
        sendToBack,
        alignSelected,
        distributeSelected,
        loadedBundle,
        setLoadedBundle,
        activeBundleItemId,
        applyBundleItem,
        applyCompositionDirectly,
        exportCanvasAsTemplateYaml,
        exportCanvasAsBundleZip,
        updateElementCustomId,
        autoGenerateCustomIds,
        isItemDirty,
        markItemSaved,
        saveBundleItemToDisk
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
