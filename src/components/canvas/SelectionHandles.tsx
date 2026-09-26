import React from 'react';
import { CanvasElement, DeviceElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { computeDeviceHeightFromWidth } from '../../utils/deviceHelper';

interface SelectionHandlesProps {
  element: CanvasElement;
  elementRef: React.RefObject<HTMLDivElement>;
}

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({ element, elementRef }) => {
  const { updateElement, state, recordHistory } = useEditor();
  const currentZoom = state.zoom || 1;

  const handleStartDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    recordHistory();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = element.x;
    const initY = element.y;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / currentZoom;
      const dy = (moveEvent.clientY - startY) / currentZoom;
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
    recordHistory();
    const startX = e.clientX;
    const startY = e.clientY;
    const initW = element.width;
    const initH = element.height;
    const initX = element.x;
    const initY = element.y;
    const initCenterX = initX + initW / 2;
    const initCenterY = initY + initH / 2;

    const rotation = element.rotation || 0;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const denom = initW * initW + initH * initH;

    // Si l'élément est un appareil avec une capture d'écran, le ratio d'image est strictement verrouillé
    const isDeviceWithImage = element.type === 'device' && Boolean((element as DeviceElementModel).screenImageUrl);

    const onMove = (moveEvent: PointerEvent) => {
      const screenDx = (moveEvent.clientX - startX) / currentZoom;
      const screenDy = (moveEvent.clientY - startY) / currentZoom;

      // Projection du déplacement écran sur les axes locaux de l'élément (prenant en compte la rotation)
      const dw = screenDx * cos + screenDy * sin;
      const dh = -screenDx * sin + screenDy * cos;

      const isCtrl = moveEvent.ctrlKey || moveEvent.metaKey;
      const isShift = moveEvent.shiftKey;
      const mustLockRatio = isCtrl || isDeviceWithImage;

      if (mustLockRatio) {
        // Redimensionnement proportionnel (avec ancrage au centre si Shift, ou par le coin opposé)
        const deltaScale = denom > 0 ? (dw * initW + dh * initH) / denom : 0;
        const scaleFactor = isShift
          ? Math.max(0.05, 1 + 2 * deltaScale)
          : Math.max(0.05, 1 + deltaScale);

        let targetW = Math.max(40, Math.round(initW * scaleFactor));
        let targetH: number;

        if (isDeviceWithImage) {
          const dev = element as DeviceElementModel;
          const imageRatio = dev.imageAspectRatio || (initH > 0 && initW > 0 ? (initW / initH) : (9 / 16));
          targetH = computeDeviceHeightFromWidth(targetW, imageRatio, dev);
        } else {
          targetH = Math.max(30, Math.round(initH * scaleFactor));
        }

        if (isShift) {
          const newX = Math.round(initCenterX - targetW / 2);
          const newY = Math.round(initCenterY - targetH / 2);

          updateElement(element.id, {
            x: newX,
            y: newY,
            width: targetW,
            height: targetH
          });
        } else {
          const newX = Math.round(initX + ((initW - targetW) / 2) * (1 - cos) + ((initH - targetH) / 2) * sin);
          const newY = Math.round(initY + ((initH - targetH) / 2) * (1 - cos) - ((initW - targetW) / 2) * sin);

          updateElement(element.id, {
            x: newX,
            y: newY,
            width: targetW,
            height: targetH
          });
        }
      } else {
        // Mode Redimensionnement libre (éléments sans image ou formes/textes libres)
        const targetW = Math.max(30, Math.round(initW + dw));
        const targetH = Math.max(30, Math.round(initH + dh));

        const newX = Math.round(initX + ((initW - targetW) / 2) * (1 - cos) + ((initH - targetH) / 2) * sin);
        const newY = Math.round(initY + ((initH - targetH) / 2) * (1 - cos) - ((initW - targetW) / 2) * sin);

        updateElement(element.id, {
          x: newX,
          y: newY,
          width: targetW,
          height: targetH
        });
      }
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
    recordHistory();

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
          className="selection-ui-handle drag-pill-handle cursor-move"
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
        title="Redimensionner (Glisser : libre, Ctrl+Glisser : conserver ratio, Ctrl+Shift+Glisser : conserver ratio et ancrer le centre)"
        className="selection-ui-handle handle-resize bottom-[-6px] right-[-6px] cursor-se-resize"
      />
    </>
  );
};
