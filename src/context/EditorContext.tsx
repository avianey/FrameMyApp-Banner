import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  EditorState,
  BackgroundConfig,
  CanvasElement,
  TextElementModel,
  ShapeElementModel,
  ShapeType,
  ExportZone,
  ActivePanel
} from '../types';

interface SnackbarState {
  message: string;
  icon: string;
  visible: boolean;
}

interface EditorContextType {
  state: EditorState;
  snackbar: SnackbarState;
  artboardRef: React.RefObject<HTMLDivElement>;
  artboardContainerRef: React.RefObject<HTMLDivElement>;
  viewportRef: React.RefObject<HTMLDivElement>;
  setBackground: (updates: Partial<BackgroundConfig>) => void;
  addText: () => void;
  addShape: (shapeType?: ShapeType) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  updateExportZone: (updates: Partial<ExportZone>) => void;
  setIsDrawingExportMode: (mode: boolean) => void;
  showSnackbar: (message: string, icon?: string) => void;
  resetZoom: () => void;
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
    type: 'text',
    text: 'Titre Material 3',
    x: 70,
    y: 90,
    width: 380,
    height: 90,
    rotation: 0,
    fontFamily: 'Space Grotesk',
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
  targetHeight: 900
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [background, setBackgroundState] = useState<BackgroundConfig>(initialBackground);
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activePanel, setActivePanelState] = useState<ActivePanel>(null);
  const [exportZone, setExportZoneState] = useState<ExportZone>(initialExportZone);
  const [isDrawingExportMode, setIsDrawingExportModeState] = useState<boolean>(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: 'Notification',
    icon: 'check_circle',
    visible: false
  });

  const snackbarTimerRef = useRef<number | null>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const artboardContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const showSnackbar = useCallback((message: string, icon = 'check_circle') => {
    if (snackbarTimerRef.current) {
      window.clearTimeout(snackbarTimerRef.current);
    }
    setSnackbar({ message, icon, visible: true });
    snackbarTimerRef.current = window.setTimeout(() => {
      setSnackbar(prev => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  const setBackground = useCallback((updates: Partial<BackgroundConfig>) => {
    setBackgroundState(prev => ({ ...prev, ...updates }));
  }, []);

  const addText = useCallback(() => {
    const id = 'txt-' + Date.now();
    setElements(prev => {
      const offset = (prev.length * 15) % 200;
      const newText: TextElementModel = {
        id,
        type: 'text',
        text: 'Nouveau Texte',
        x: 120 + offset,
        y: 120 + offset,
        width: 280,
        height: 60,
        rotation: 0,
        fontFamily: 'Roboto',
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
    setSelectedElementId(id);
    setActivePanelState('text');
  }, []);

  const addShape = useCallback((shapeType: ShapeType = 'rounded-rect') => {
    const id = 'shape-' + Date.now();
    setElements(prev => {
      const offset = (prev.length * 15) % 200;
      const newShape: ShapeElementModel = {
        id,
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
    setSelectedElementId(id);
    setActivePanelState('shape');
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => (el.id === id ? ({ ...el, ...updates } as CanvasElement) : el)));
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElementId(prev => {
      if (prev === id) {
        setActivePanelState(null);
        return null;
      }
      return prev;
    });
  }, []);

  const selectElement = useCallback((id: string | null) => {
    setSelectedElementId(id);
    if (id) {
      setElements(prev => {
        const found = prev.find(e => e.id === id);
        if (found) {
          setActivePanelState(found.type === 'text' ? 'text' : 'shape');
        }
        return prev;
      });
    } else {
      setActivePanelState(prev => (prev === 'text' || prev === 'shape' ? null : prev));
    }
  }, []);

  const setActivePanel = useCallback((panel: ActivePanel) => {
    setActivePanelState(panel);
    if (panel === 'bg' || panel === 'export') {
      setSelectedElementId(null);
    }
  }, []);

  const updateExportZone = useCallback((updates: Partial<ExportZone>) => {
    setExportZoneState(prev => ({ ...prev, ...updates }));
  }, []);

  const setIsDrawingExportMode = useCallback((mode: boolean) => {
    setIsDrawingExportModeState(mode);
  }, []);

  const resetZoom = useCallback(() => {
    if (viewportRef.current && artboardContainerRef.current) {
      viewportRef.current.scrollTo({
        left: artboardContainerRef.current.offsetLeft - 40,
        top: artboardContainerRef.current.offsetTop - 40,
        behavior: 'smooth'
      });
      showSnackbar('Vue recentrée', 'center_focus_strong');
    }
  }, [showSnackbar]);

  const state: EditorState = {
    background,
    elements,
    selectedElementId,
    activePanel,
    exportZone,
    isDrawingExportMode
  };

  return (
    <EditorContext.Provider
      value={{
        state,
        snackbar,
        artboardRef,
        artboardContainerRef,
        viewportRef,
        setBackground,
        addText,
        addShape,
        updateElement,
        deleteElement,
        selectElement,
        setActivePanel,
        updateExportZone,
        setIsDrawingExportMode,
        showSnackbar,
        resetZoom
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
