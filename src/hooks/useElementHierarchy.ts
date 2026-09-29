import { useCallback } from 'react';
import { CanvasElement } from '../types';
import {
  alignElements,
  distributeElements,
  AlignReference,
  AlignType,
  DistributeType
} from '../utils/alignment';

interface UseElementHierarchyOptions {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedElementIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  recordHistory: () => void;
  showSnackbar: (message: string, icon?: string) => void;
}

export function useElementHierarchy({
  setElements,
  selectedElementIds,
  canvasWidth,
  canvasHeight,
  recordHistory,
  showSnackbar
}: UseElementHierarchyOptions) {
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
    [recordHistory, setElements, showSnackbar]
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
    [recordHistory, setElements, showSnackbar]
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
    [recordHistory, setElements, showSnackbar]
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
    [recordHistory, setElements, showSnackbar]
  );

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
    [selectedElementIds, canvasWidth, canvasHeight, recordHistory, setElements, showSnackbar]
  );

  const alignElementToCanvas = useCallback(
    (id: string, type: AlignType | 'center-both') => {
      recordHistory();
      setElements(prev => {
        if (type === 'center-both') {
          return prev.map(el => {
            if (el.id !== id) return el;
            return {
              ...el,
              x: Math.round(canvasWidth / 2 - el.width / 2),
              y: Math.round(canvasHeight / 2 - el.height / 2)
            };
          });
        }
        return alignElements(prev, [id], type, 'canvas', {
          width: canvasWidth,
          height: canvasHeight
        });
      });

      const snackbarInfo: Record<string, { label: string; icon: string }> = {
        left: { label: 'Collé au bord gauche', icon: 'align_horizontal_left' },
        'center-h': { label: 'Centré horizontalement', icon: 'align_horizontal_center' },
        right: { label: 'Collé au bord droit', icon: 'align_horizontal_right' },
        top: { label: 'Collé au bord supérieur', icon: 'align_vertical_top' },
        'center-v': { label: 'Centré verticalement', icon: 'align_vertical_center' },
        bottom: { label: 'Collé au bord inférieur', icon: 'align_vertical_bottom' },
        'center-both': { label: 'Centré dans la scène', icon: 'filter_center_focus' }
      };
      const info = snackbarInfo[type] || { label: 'Alignement appliqué', icon: 'format_align_center' };
      showSnackbar(info.label, info.icon);
    },
    [canvasWidth, canvasHeight, recordHistory, setElements, showSnackbar]
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
    [selectedElementIds, canvasWidth, canvasHeight, recordHistory, setElements, showSnackbar]
  );

  return {
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    alignSelected,
    alignElementToCanvas,
    distributeSelected
  };
}
