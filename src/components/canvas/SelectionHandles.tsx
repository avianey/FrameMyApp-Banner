import React from 'react';
import { CanvasElement } from '../../types';
import { useEditor } from '../../context/EditorContext';

interface SelectionHandlesProps {
  element: CanvasElement;
  elementRef: React.RefObject<HTMLDivElement>;
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({ element, elementRef }) => {
  const { updateElement } = useEditor();

  const handleStartDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = element.x;
    const initY = element.y;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      updateElement(element.id, {
        x: Math.round(initX + dx),
        y: Math.round(initY + dy)
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleStartResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initW = element.width;
    const initH = element.height;

    const onMove = (moveEvent: PointerEvent) => {
      const dw = moveEvent.clientX - startX;
      const dh = moveEvent.clientY - startY;
      updateElement(element.id, {
        width: Math.max(40, Math.round(initW + dw)),
        height: Math.max(30, Math.round(initH + dh))
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleStartRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - centerX;
      const dy = me.clientY - centerY;
      let deg = Math.round(Math.atan2(dy, dx) * (180 / Math.PI)) + 90;
      if (deg > 180) deg -= 360;
      if (deg < -180) deg += 360;

      updateElement(element.id, { rotation: deg });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <>
      {/* Cadre de sélection */}
      <div className="selection-ui-handle absolute -inset-1 border-2 border-m3-sys-primary rounded-lg pointer-events-none z-30" />

      {/* Poignée de déplacement pour le texte */}
      {element.type === 'text' && (
        <div
          onPointerDown={handleStartDrag}
          className="selection-ui-handle drag-pill-handle"
        >
          <span className="material-symbols-rounded text-[14px]">drag_indicator</span>
          <span>Déplacer</span>
        </div>
      )}

      {/* Poignée de rotation */}
      <div className="selection-ui-handle handle-rotate-line" />
      <div
        onPointerDown={handleStartRotate}
        title="Faire pivoter"
        className="selection-ui-handle handle-rotate-anchor"
      >
        <span className="material-symbols-rounded text-[14px]">rotate_right</span>
      </div>

      {/* Poignée de redimensionnement */}
      <div
        onPointerDown={handleStartResize}
        className="selection-ui-handle handle-resize bottom-[-6px] right-[-6px] cursor-se-resize"
      />
    </>
  );
};
