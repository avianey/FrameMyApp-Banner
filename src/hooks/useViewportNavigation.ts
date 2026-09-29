import { useState, useRef, useCallback } from 'react';
import { ExportZone } from '../types';

interface UseViewportNavigationOptions {
  viewportRef: React.RefObject<HTMLDivElement>;
  recordHistory: () => void;
  showSnackbar: (message: string, icon?: string) => void;
  initialCanvasWidth?: number;
  initialCanvasHeight?: number;
  initialExportZone?: ExportZone;
}

const defaultExportZone: ExportZone = {
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

export function useViewportNavigation({
  viewportRef,
  recordHistory,
  showSnackbar,
  initialCanvasWidth = 800,
  initialCanvasHeight = 600,
  initialExportZone = defaultExportZone
}: UseViewportNavigationOptions) {
  const [canvasWidth, setCanvasWidth] = useState<number>(initialCanvasWidth);
  const [canvasHeight, setCanvasHeight] = useState<number>(initialCanvasHeight);
  const [exportZone, setExportZoneState] = useState<ExportZone>(initialExportZone);
  const [isDrawingExportMode, setIsDrawingExportModeState] = useState<boolean>(false);

  const [zoom, setZoomState] = useState<number>(1.0);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const [pan, setPanState] = useState<{ x: number; y: number }>({ x: 60, y: 40 });
  const panRef = useRef(pan);
  panRef.current = pan;

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

  const centerCanvas = useCallback(
    (customWidth?: number, customHeight?: number, autoFit = true) => {
      const w = customWidth || canvasWidth;
      const h = customHeight || canvasHeight;

      if (!viewportRef.current) return;
      const vp = viewportRef.current;
      const vpW = vp.clientWidth - 80;
      const vpH = vp.clientHeight - 80;

      let fitZoom = zoomRef.current || 1.0;
      if (autoFit && vpW > 100 && vpH > 100) {
        if (w > vpW || h > vpH) {
          fitZoom = Math.min(1.0, Math.max(0.1, Math.min(vpW / w, vpH / h)));
          fitZoom = Math.round(fitZoom * 100) / 100;
        } else {
          fitZoom = 1.0;
        }
        setZoomState(fitZoom);
        zoomRef.current = fitZoom;
      }

      const newPanX = Math.round((vp.clientWidth - w * fitZoom) / 2);
      const newPanY = Math.round((vp.clientHeight - h * fitZoom) / 2);

      setPanState({ x: newPanX, y: newPanY });
      panRef.current = { x: newPanX, y: newPanY };
    },
    [canvasWidth, canvasHeight, viewportRef]
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
