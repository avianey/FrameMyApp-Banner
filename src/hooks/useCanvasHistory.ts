import { useState, useRef, useCallback, useEffect } from 'react';
import { BackgroundConfig, CanvasElement, ExportZone } from '../types';

export interface HistorySnapshot {
  canvasWidth?: number;
  canvasHeight?: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  bundleItemId?: string | null;
  bundleItemName?: string | null;
}

interface HistoryRecord {
  before: HistorySnapshot;
  after?: HistorySnapshot;
}

interface UseCanvasHistoryOptions {
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  exportZone: ExportZone;
  selectedElementIds: string[];
  editingImageElementId?: string | 'background' | null;
  getActiveBundleContext?: () => { bundleItemId: string | null; bundleItemName: string | null };
  onApplySnapshot: (snapshot: HistorySnapshot, direction: 'undo' | 'redo') => boolean | void;
  onDeleteSelected?: () => void;
  onMoveSelected?: (dx: number, dy: number, isRepeat: boolean) => void;
  onExitImageEditing?: () => void;
  onDuplicateSelected?: () => void;
  onCopySelected?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onSave?: () => void;
  showSnackbar: (message: string, icon?: string) => void;
}

function cloneSnapshotData<T>(data: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(data);
    } catch {
      // Fallback
    }
  }
  return JSON.parse(JSON.stringify(data));
}

export function useCanvasHistory({
  canvasWidth,
  canvasHeight,
  background,
  elements,
  exportZone,
  selectedElementIds,
  editingImageElementId,
  getActiveBundleContext,
  onApplySnapshot,
  onDeleteSelected,
  onMoveSelected,
  onExitImageEditing,
  onDuplicateSelected,
  onCopySelected,
  onPaste,
  onSelectAll,
  onSave,
  showSnackbar
}: UseCanvasHistoryOptions) {
  const pastRef = useRef<HistoryRecord[]>([]);
  const futureRef = useRef<HistoryRecord[]>([]);
  const lastRecordTimeRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const latestStateRef = useRef({
    canvasWidth,
    canvasHeight,
    background,
    elements,
    exportZone,
    getActiveBundleContext,
    onApplySnapshot,
    showSnackbar
  });
  latestStateRef.current = {
    canvasWidth,
    canvasHeight,
    background,
    elements,
    exportZone,
    getActiveBundleContext,
    onApplySnapshot,
    showSnackbar
  };

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const captureCurrentSnapshot = useCallback((): HistorySnapshot => {
    const s = latestStateRef.current;
    const bundleCtx = s.getActiveBundleContext?.();
    return {
      canvasWidth: s.canvasWidth,
      canvasHeight: s.canvasHeight,
      background: cloneSnapshotData(s.background),
      elements: cloneSnapshotData(s.elements),
      exportZone: cloneSnapshotData(s.exportZone),
      bundleItemId: bundleCtx?.bundleItemId ?? null,
      bundleItemName: bundleCtx?.bundleItemName ?? null
    };
  }, []);

  const sealCurrentHistoryState = useCallback(() => {
    lastRecordTimeRef.current = 0;
    if (pastRef.current.length === 0) return;
    const lastRecord = pastRef.current[pastRef.current.length - 1];
    if (lastRecord.after) return;

    const currentSnap = captureCurrentSnapshot();
    if ((lastRecord.before.bundleItemId ?? null) === (currentSnap.bundleItemId ?? null)) {
      lastRecord.after = currentSnap;
    }
  }, [captureCurrentSnapshot]);

  const recordHistory = useCallback(() => {
    const now = Date.now();
    const currentSnap = captureCurrentSnapshot();
    const lastRecord = pastRef.current.length > 0 ? pastRef.current[pastRef.current.length - 1] : null;
    const isSameBundleView =
      lastRecord !== null &&
      (lastRecord.before.bundleItemId ?? null) === (currentSnap.bundleItemId ?? null);

    // Coalesce rapid snapshots during continuous slider/color-picker dragging on the same view
    if (
      lastRecord &&
      !lastRecord.after &&
      isSameBundleView &&
      now - lastRecordTimeRef.current < 350
    ) {
      lastRecordTimeRef.current = now;
      return;
    }
    lastRecordTimeRef.current = now;

    // Seal previous unsealed record on the same view before recording a new edit
    if (lastRecord && !lastRecord.after && isSameBundleView) {
      lastRecord.after = currentSnap;
    }

    pastRef.current.push({ before: currentSnap });
    if (pastRef.current.length > 50) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    updateHistoryFlags();
  }, [captureCurrentSnapshot, updateHistoryFlags]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    lastRecordTimeRef.current = 0;

    const s = latestStateRef.current;
    const currentBundleItemId = s.getActiveBundleContext?.()?.bundleItemId ?? null;

    let appliedRecord: HistoryRecord | null = null;
    while (pastRef.current.length > 0) {
      const record = pastRef.current.pop()!;
      const targetViewId = record.before.bundleItemId ?? null;

      const afterSnapshot =
        record.after ??
        (currentBundleItemId === targetViewId
          ? captureCurrentSnapshot()
          : cloneSnapshotData(record.before));

      const applied = s.onApplySnapshot(record.before, 'undo');
      if (applied === false) {
        continue;
      }

      futureRef.current.push({
        before: record.before,
        after: afterSnapshot
      });
      appliedRecord = record;
      break;
    }

    updateHistoryFlags();

    if (appliedRecord) {
      const targetViewId = appliedRecord.before.bundleItemId ?? null;
      const targetViewName = appliedRecord.before.bundleItemName;
      if (targetViewName && targetViewId !== currentBundleItemId) {
        s.showSnackbar(`Annulé sur « ${targetViewName} » (Undo)`, 'undo');
      } else {
        s.showSnackbar('Action annulée (Undo)', 'undo');
      }
    }
  }, [captureCurrentSnapshot, updateHistoryFlags]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    lastRecordTimeRef.current = 0;

    const s = latestStateRef.current;
    const currentBundleItemId = s.getActiveBundleContext?.()?.bundleItemId ?? null;

    let appliedTarget: HistorySnapshot | null = null;
    while (futureRef.current.length > 0) {
      const record = futureRef.current.pop()!;
      const targetSnapshot = record.after ?? record.before;
      const applied = s.onApplySnapshot(targetSnapshot, 'redo');
      if (applied === false) {
        continue;
      }

      pastRef.current.push(record);
      appliedTarget = targetSnapshot;
      break;
    }

    updateHistoryFlags();

    if (appliedTarget) {
      const targetViewId = appliedTarget.bundleItemId ?? null;
      const targetViewName = appliedTarget.bundleItemName;
      if (targetViewName && targetViewId !== currentBundleItemId) {
        s.showSnackbar(`Rétabli sur « ${targetViewName} » (Redo)`, 'redo');
      } else {
        s.showSnackbar('Action rétablie (Redo)', 'redo');
      }
    }
  }, [updateHistoryFlags]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastRecordTimeRef.current = 0;
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  // Global keyboard shortcuts (Undo / Redo, Delete, Nudge with arrow keys, Escape)
  const selectedElementIdsRef = useRef<string[]>(selectedElementIds);
  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const onMoveSelectedRef = useRef(onMoveSelected);
  useEffect(() => {
    onMoveSelectedRef.current = onMoveSelected;
  }, [onMoveSelected]);

  const onDeleteSelectedRef = useRef(onDeleteSelected);
  useEffect(() => {
    onDeleteSelectedRef.current = onDeleteSelected;
  }, [onDeleteSelected]);

  const onExitImageEditingRef = useRef(onExitImageEditing);
  useEffect(() => {
    onExitImageEditingRef.current = onExitImageEditing;
  }, [onExitImageEditing]);

  const onDuplicateSelectedRef = useRef(onDuplicateSelected);
  useEffect(() => {
    onDuplicateSelectedRef.current = onDuplicateSelected;
  }, [onDuplicateSelected]);

  const onCopySelectedRef = useRef(onCopySelected);
  useEffect(() => {
    onCopySelectedRef.current = onCopySelected;
  }, [onCopySelected]);

  const onPasteRef = useRef(onPaste);
  useEffect(() => {
    onPasteRef.current = onPaste;
  }, [onPaste]);

  const onSelectAllRef = useRef(onSelectAll);
  useEffect(() => {
    onSelectAllRef.current = onSelectAll;
  }, [onSelectAll]);

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Allow Ctrl/Cmd+S even when focused inside an input
      if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveRef.current?.();
        return;
      }

      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        activeEl?.classList.contains('editable-text-content');

      if (isInput) return;

      const isInModal = Boolean(activeEl?.closest('[role="dialog"], [aria-modal="true"]'));
      if (isInModal) return;

      if (editingImageElementId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onExitImageEditingRef.current?.();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Del' || e.key === 'Backspace') {
        if (selectedElementIdsRef.current.length > 0 && onDeleteSelectedRef.current) {
          e.preventDefault();
          onDeleteSelectedRef.current();
          return;
        }
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementIdsRef.current.length > 0 && onMoveSelectedRef.current) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          else if (e.key === 'ArrowDown') dy = step;
          else if (e.key === 'ArrowLeft') dx = -step;
          else if (e.key === 'ArrowRight') dx = step;

          onMoveSelectedRef.current(dx, dy, e.repeat);
          return;
        }
      }

      if (!cmdOrCtrl) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      } else if (key === 'd') {
        e.preventDefault();
        onDuplicateSelectedRef.current?.();
      } else if (key === 'c') {
        e.preventDefault();
        onCopySelectedRef.current?.();
      } else if (key === 'v') {
        e.preventDefault();
        onPasteRef.current?.();
      } else if (key === 'a') {
        e.preventDefault();
        onSelectAllRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, editingImageElementId]);

  return {
    canUndo,
    canRedo,
    recordHistory,
    sealCurrentHistoryState,
    undo,
    redo,
    clearHistory
  };
}
