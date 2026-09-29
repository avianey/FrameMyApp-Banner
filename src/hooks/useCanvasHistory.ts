import { useState, useRef, useCallback, useEffect } from 'react';
import { BackgroundConfig, CanvasElement, ExportZone } from '../types';

export interface HistorySnapshot {
  canvasWidth?: number;
  canvasHeight?: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
}

interface UseCanvasHistoryOptions {
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  selectedElementIds: string[];
  editingImageElementId?: string | 'background' | null;
  onApplySnapshot: (snapshot: HistorySnapshot) => void;
  onDeleteSelected?: () => void;
  onExitImageEditing?: () => void;
  showSnackbar: (message: string, icon?: string) => void;
}

export function useCanvasHistory({
  canvasWidth,
  canvasHeight,
  background,
  elements,
  exportZone,
  selectedElementIds,
  editingImageElementId,
  onApplySnapshot,
  onDeleteSelected,
  onExitImageEditing,
  showSnackbar
}: UseCanvasHistoryOptions) {
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
      onApplySnapshot(previousSnapshot);
    }

    updateHistoryFlags();
    showSnackbar('Action annulée (Undo)', 'undo');
  }, [canvasWidth, canvasHeight, background, elements, exportZone, onApplySnapshot, updateHistoryFlags, showSnackbar]);

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
      onApplySnapshot(nextSnapshot);
    }

    updateHistoryFlags();
    showSnackbar('Action rétablie (Redo)', 'redo');
  }, [canvasWidth, canvasHeight, background, elements, exportZone, onApplySnapshot, updateHistoryFlags, showSnackbar]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  // Global keyboard shortcuts (Undo / Redo, Delete, Escape)
  const selectedElementIdsRef = useRef<string[]>(selectedElementIds);
  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        activeEl?.classList.contains('editable-text-content');

      if (isInput) return;

      if (e.key === 'Escape' && editingImageElementId) {
        e.preventDefault();
        onExitImageEditing?.();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
        if (selectedElementIdsRef.current.length > 0 && onDeleteSelected) {
          e.preventDefault();
          onDeleteSelected();
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
  }, [undo, redo, onDeleteSelected, onExitImageEditing, editingImageElementId]);

  return {
    canUndo,
    canRedo,
    recordHistory,
    undo,
    redo,
    clearHistory
  };
}
