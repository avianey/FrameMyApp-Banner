import { useState, useRef, useCallback } from 'react';
import { ExportZone } from '../types';

export type ViewportFitMode = 'always' | 'on-change' | 'never';

export interface SetCanvasDimensionsOptions {
  recordHistory?: boolean;
  syncExportZone?: boolean;
  fitMode?: ViewportFitMode;
}

interface UseViewportNavigationOptions {
  viewportRef: React.RefObject<HTMLDivElement>;
  recordHistory: () => void;
  showSnackbar: (message: string, icon?: string) => void;
  initialCanvasWidth?: number;
  initialCanvasHeight?: number;
  initialExportZone?: ExportZone;
}

const defaultExportZone: ExportZone = {
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

export function useViewportNavigation({
  viewportRef,
  recordHistory,
  showSnackbar,
  initialCanvasWidth = 800,
  initialCanvasHeight = 600,
  initialExportZone = defaultExportZone
}: UseViewportNavigationOptions) {
  const [canvasWidth, setCanvasWidthState] = useState<number>(initialCanvasWidth);
  const canvasWidthRef = useRef<number>(canvasWidth);
  canvasWidthRef.current = canvasWidth;

  const [canvasHeight, setCanvasHeightState] = useState<number>(initialCanvasHeight);
  const canvasHeightRef = useRef<number>(canvasHeight);
  canvasHeightRef.current = canvasHeight;

  const [exportZone, setExportZoneState] = useState<ExportZone>(initialExportZone);
  const [isDrawingExportMode, setIsDrawingExportModeState] = useState<boolean>(false);

  const [zoom, setZoomState] = useState<number>(1.0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [pan, setPanState] = useState<{ x: number; y: number }>({ x: 60, y: 40 });
  const panRef = useRef(pan);
  panRef.current = pan;

  const setCanvasWidth = useCallback(
    (widthOrUpdater: number | ((prev: number) => number)) => {
      setCanvasWidthState(prev => {
        const next = typeof widthOrUpdater === 'function' ? widthOrUpdater(prev) : widthOrUpdater;
        canvasWidthRef.current = next;
        return next;
      });
    },
    []
  );

  const setCanvasHeight = useCallback(
    (heightOrUpdater: number | ((prev: number) => number)) => {
      setCanvasHeightState(prev => {
        const next = typeof heightOrUpdater === 'function' ? heightOrUpdater(prev) : heightOrUpdater;
        canvasHeightRef.current = next;
        return next;
      });
    },
    []
  );

  const updateExportZone = useCallback((updates: Partial<ExportZone>) => {
    setExportZoneState(prev => ({ ...prev, ...updates }));
  }, []);

  const setIsDrawingExportMode = useCallback((mode: boolean) => {
    setIsDrawingExportModeState(mode);
  }, []);

  const setPan = useCallback(
    (
      panOrUpdater:
        | { x: number; y: number }
        | ((prev: { x: number; y: number }) => { x: number; y: number })
    ) => {
      setPanState(prev => {
        const next = typeof panOrUpdater === 'function' ? panOrUpdater(prev) : panOrUpdater;
        panRef.current = next;
        return next;
      });
    },
    []
  );

  /**
   * Calcule la zone libre du viewport non couverte par la BottomBar ni par les panneaux latéraux ouverts.
   */
  const getSafeViewportBounds = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return null;

    const vpRect = vp.getBoundingClientRect();
    const vpWidth = vp.clientWidth;
    const vpHeight = vp.clientHeight;

    const topInset = 24;
    let bottomInset = 108; // Fallback sûr pour la BottomBar flottante (bottom-6 + hauteur + marge)

    if (typeof document !== 'undefined') {
      const bottomBar = document.querySelector('[data-bottom-bar="true"]') as HTMLElement | null;
      if (bottomBar) {
        const barRect = bottomBar.getBoundingClientRect();
        if (barRect.height > 0 && barRect.top < vpRect.bottom) {
          bottomInset = Math.max(96, Math.ceil(vpRect.bottom - barRect.top) + 20);
        }
      }
    }

    let leftInset = 32;
    let rightInset = 32;

    if (typeof document !== 'undefined') {
      const leftSidebar = document.getElementById('left-sidebar');
      if (
        leftSidebar &&
        !leftSidebar.classList.contains('-translate-x-full') &&
        leftSidebar.offsetWidth > 0
      ) {
        leftInset = leftSidebar.offsetWidth + 24;
      }

      const sideDrawer = document.getElementById('side-drawer');
      if (
        sideDrawer &&
        !sideDrawer.classList.contains('translate-x-full') &&
        sideDrawer.offsetWidth > 0
      ) {
        rightInset = sideDrawer.offsetWidth + 24;
      }
    }

    // Sur écran étroit, si les tiroirs ne laissent pas assez d'espace horizontal, recentrer sur tout le viewport
    if (vpWidth - leftInset - rightInset < 220) {
      leftInset = 24;
      rightInset = 24;
    }

    const availW = Math.max(100, vpWidth - leftInset - rightInset);
    const availH = Math.max(100, vpHeight - topInset - bottomInset);

    return {
      vpWidth,
      vpHeight,
      topInset,
      bottomInset,
      leftInset,
      rightInset,
      availW,
      availH
    };
  }, [viewportRef]);

  const setZoom = useCallback(
    (
      zoomOrUpdater: number | ((prev: number) => number),
      focalPoint?: { clientX: number; clientY: number }
    ) => {
      const prevZoom = zoomRef.current;
      const targetRaw = typeof zoomOrUpdater === 'function' ? zoomOrUpdater(prevZoom) : zoomOrUpdater;
      const nextZoom = Math.min(3.5, Math.max(0.1, Math.round(targetRaw * 100) / 100));

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
        focalVpX = currentPan.x + (canvasWidthRef.current / 2) * prevZoom;
        focalVpY = currentPan.y + (canvasHeightRef.current / 2) * prevZoom;
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
    [viewportRef]
  );

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(3.5, prev + 0.15));
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev - 0.15));
  }, [setZoom]);

  const resetZoom = useCallback(() => {
    setZoomState(1.0);
    zoomRef.current = 1.0;
    const bounds = getSafeViewportBounds();
    if (bounds) {
      const centeredX = Math.round(bounds.leftInset + (bounds.availW - canvasWidthRef.current) / 2);
      const centeredY = Math.round(bounds.topInset + (bounds.availH - canvasHeightRef.current) / 2);
      setPanState({ x: centeredX, y: centeredY });
      panRef.current = { x: centeredX, y: centeredY };
      showSnackbar('Vue recentrée (100%)', 'center_focus_strong');
    }
  }, [getSafeViewportBounds, showSnackbar]);

  const centerCanvas = useCallback(
    (customWidth?: number, customHeight?: number, autoFit = true) => {
      const w = customWidth || canvasWidthRef.current;
      const h = customHeight || canvasHeightRef.current;

      const bounds = getSafeViewportBounds();
      if (!bounds) return;

      let fitZoom = zoomRef.current || 1.0;
      if (autoFit) {
        if (w > bounds.availW || h > bounds.availH) {
          const rawFit = Math.min(bounds.availW / w, bounds.availH / h);
          // Math.floor garantit que le canvas scalé reste entièrement au-dessus de la BottomBar
          fitZoom = Math.min(1.0, Math.max(0.1, Math.floor(rawFit * 100) / 100));
        } else {
          fitZoom = 1.0;
        }
        setZoomState(fitZoom);
        zoomRef.current = fitZoom;
      }

      const newPanX = Math.round(bounds.leftInset + (bounds.availW - w * fitZoom) / 2);
      const newPanY = Math.round(bounds.topInset + (bounds.availH - h * fitZoom) / 2);

      setPanState({ x: newPanX, y: newPanY });
      panRef.current = { x: newPanX, y: newPanY };
    },
    [getSafeViewportBounds]
  );

  const setCanvasDimensions = useCallback(
    (width: number, height: number, options?: SetCanvasDimensionsOptions) => {
      const prevW = canvasWidthRef.current;
      const prevH = canvasHeightRef.current;
      const dimensionsChanged = prevW !== width || prevH !== height;
      const shouldRecordHistory = options?.recordHistory ?? true;
      const shouldSyncExportZone = options?.syncExportZone ?? true;
      const fitMode: ViewportFitMode = options?.fitMode ?? 'always';

      if (shouldRecordHistory) {
        recordHistory();
      }
      setCanvasWidth(width);
      setCanvasHeight(height);

      // Synchroniser la zone d'exportation si elle couvrait le plein canevas ou dépasse les nouvelles bornes
      if (shouldSyncExportZone) {
        setExportZoneState(prevZone => {
          const wasFull =
            prevZone.preset === 'full' ||
            (prevZone.x === 0 &&
              prevZone.y === 0 &&
              Math.abs(prevZone.width - prevW) < 2 &&
              Math.abs(prevZone.height - prevH) < 2);
          if (wasFull || prevZone.x + prevZone.width > width || prevZone.y + prevZone.height > height) {
            const newRatio = width / height;
            return {
              ...prevZone,
              x: 0,
              y: 0,
              width,
              height,
              targetWidth: wasFull ? width : prevZone.targetWidth,
              targetHeight: wasFull ? height : Math.round(prevZone.targetWidth / newRatio),
              ratio: newRatio,
              preset: wasFull ? 'full' : prevZone.preset
            };
          }
          return prevZone;
        });
      }

      // Adapter le zoom et centrer la scène dans la zone visible non couverte selon le fitMode
      if (fitMode === 'always' || (fitMode === 'on-change' && dimensionsChanged)) {
        centerCanvas(width, height, true);
      }
    },
    [recordHistory, setCanvasWidth, setCanvasHeight, centerCanvas]
  );

  return {
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    exportZone,
    setExportZoneState,
    updateExportZone,
    isDrawingExportMode,
    setIsDrawingExportMode,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    pan,
    setPan,
    setCanvasDimensions,
    centerCanvas
  };
}
