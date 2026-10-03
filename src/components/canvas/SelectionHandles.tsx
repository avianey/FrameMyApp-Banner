import React from 'react';
import { CanvasElement, DeviceElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { computeDeviceHeightFromWidth, computeDeviceWidthFromHeight } from '../../utils/deviceHelper';

interface SelectionHandlesProps {
  element: CanvasElement;
  elementRef: React.RefObject<HTMLDivElement>;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HandleDef {
  type: HandleType;
  dirX: -1 | 0 | 1;
  dirY: -1 | 0 | 1;
  x: number;
  y: number;
}

const getResizeCursor = (type: HandleType, rotation: number): string => {
  const baseAngles: Record<HandleType, number> = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315
  };
  const angle = (baseAngles[type] + rotation) % 360;
  const norm = (angle + 360) % 360;

  if (norm >= 337.5 || norm < 22.5 || (norm >= 157.5 && norm < 202.5)) {
    return 'ns-resize';
  }
  if ((norm >= 22.5 && norm < 67.5) || (norm >= 202.5 && norm < 247.5)) {
    return 'nesw-resize';
  }
  if ((norm >= 67.5 && norm < 112.5) || (norm >= 247.5 && norm < 292.5)) {
    return 'ew-resize';
  }
  return 'nwse-resize';
};

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

  const handleStartResize = (
    e: React.PointerEvent,
    dirX: -1 | 0 | 1,
    dirY: -1 | 0 | 1
  ) => {
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

    // Opposite anchor point in local coordinates [0..1]
    const uHandle = dirX === -1 ? 0 : dirX === 1 ? 1 : 0.5;
    const vHandle = dirY === -1 ? 0 : dirY === 1 ? 1 : 0.5;
    const uAnchor = 1 - uHandle;
    const vAnchor = 1 - vHandle;

    const isDeviceWithImage =
      element.type === 'device' && Boolean((element as DeviceElementModel).screenImageUrl);

    const onMove = (moveEvent: PointerEvent) => {
      const screenDx = (moveEvent.clientX - startX) / currentZoom;
      const screenDy = (moveEvent.clientY - startY) / currentZoom;

      // Projection onto local unrotated axes
      const dxLocal = screenDx * cos + screenDy * sin;
      const dyLocal = -screenDx * sin + screenDy * cos;

      const deltaW = dirX !== 0 ? dirX * dxLocal : 0;
      const deltaH = dirY !== 0 ? dirY * dyLocal : 0;

      const isCtrl = moveEvent.ctrlKey || moveEvent.metaKey;
      const isShift = moveEvent.shiftKey;
      const mustLockRatio = isCtrl || isDeviceWithImage;

      let targetW: number;
      let targetH: number;

      if (mustLockRatio) {
        if (dirX === 0) {
          // Vertical side handle (n or s)
          const scaleFactor = Math.max(0.05, 1 + (isShift ? 2 : 1) * (deltaH / initH));
          targetH = Math.max(30, Math.round(initH * scaleFactor));
          if (element.type === 'device') {
            const dev = element as DeviceElementModel;
            const imageRatio =
              dev.imageAspectRatio || (initH > 0 && initW > 0 ? initW / initH : 9 / 16);
            targetW = computeDeviceWidthFromHeight(targetH, imageRatio, dev);
          } else {
            targetW = Math.max(30, Math.round(initW * scaleFactor));
          }
        } else if (dirY === 0) {
          // Horizontal side handle (e or w)
          const scaleFactor = Math.max(0.05, 1 + (isShift ? 2 : 1) * (deltaW / initW));
          targetW = Math.max(30, Math.round(initW * scaleFactor));
          if (element.type === 'device') {
            const dev = element as DeviceElementModel;
            const imageRatio =
              dev.imageAspectRatio || (initH > 0 && initW > 0 ? initW / initH : 9 / 16);
            targetH = computeDeviceHeightFromWidth(targetW, imageRatio, dev);
          } else {
            targetH = Math.max(30, Math.round(initH * scaleFactor));
          }
        } else {
          // Corner handle (nw, ne, se, sw)
          const denom = initW * initW + initH * initH;
          const effectiveProj = denom > 0 ? (deltaW * initW + deltaH * initH) / denom : 0;
          const scaleFactor = Math.max(0.05, 1 + (isShift ? 2 : 1) * effectiveProj);
          targetW = Math.max(30, Math.round(initW * scaleFactor));
          if (element.type === 'device') {
            const dev = element as DeviceElementModel;
            const imageRatio =
              dev.imageAspectRatio || (initH > 0 && initW > 0 ? initW / initH : 9 / 16);
            targetH = computeDeviceHeightFromWidth(targetW, imageRatio, dev);
          } else {
            targetH = Math.max(30, Math.round(initH * scaleFactor));
          }
        }
      } else {
        // Free resize
        const mult = isShift ? 2 : 1;
        targetW = dirX !== 0 ? Math.max(30, Math.round(initW + mult * deltaW)) : initW;
        targetH = dirY !== 0 ? Math.max(30, Math.round(initH + mult * deltaH)) : initH;
      }

      let newX: number;
      let newY: number;

      if (isShift) {
        newX = Math.round(initCenterX - targetW / 2);
        newY = Math.round(initCenterY - targetH / 2);
      } else {
        const deltaDimW = initW - targetW;
        const deltaDimH = initH - targetH;

        const newCenterX =
          initCenterX + (uAnchor - 0.5) * deltaDimW * cos - (vAnchor - 0.5) * deltaDimH * sin;
        const newCenterY =
          initCenterY + (uAnchor - 0.5) * deltaDimW * sin + (vAnchor - 0.5) * deltaDimH * cos;

        newX = Math.round(newCenterX - targetW / 2);
        newY = Math.round(newCenterY - targetH / 2);
      }

      updateElement(element.id, {
        x: newX,
        y: newY,
        width: targetW,
        height: targetH
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

  const s = 1 / currentZoom;
  const offset = 4 * s;
  const w = element.width;
  const h =
    element.type === 'text'
      ? Math.max(
          element.height || 0,
          ((element as any).minLines || 1) * ((element as any).fontSize || 24) * ((element as any).lineHeight || 1.2)
        )
      : element.height;
  const stemHeight = 36 * s;

  const handleDefs: HandleDef[] = [
    // 4 Coins (angles exacts de la boîte de sélection)
    { type: 'nw', dirX: -1, dirY: -1, x: -offset, y: -offset },
    { type: 'ne', dirX: 1, dirY: -1, x: w + offset, y: -offset },
    { type: 'se', dirX: 1, dirY: 1, x: w + offset, y: h + offset },
    { type: 'sw', dirX: -1, dirY: 1, x: -offset, y: h + offset },
    // 4 Côtés (milieux exacts des segments de la boîte de sélection)
    { type: 'n', dirX: 0, dirY: -1, x: w / 2, y: -offset },
    { type: 's', dirX: 0, dirY: 1, x: w / 2, y: h + offset },
    { type: 'w', dirX: -1, dirY: 0, x: -offset, y: h / 2 },
    { type: 'e', dirX: 1, dirY: 0, x: w + offset, y: h / 2 }
  ];

  return (
    <>
      {/* Cadre de sélection à épaisseur constante indépendante du zoom */}
      <div
        className="selection-ui-handle absolute border-2 border-m3-sys-primary rounded-lg pointer-events-none z-30"
        style={{
          inset: `${-offset}px`,
          borderWidth: `${2 * s}px`,
          borderRadius: `${8 * s}px`
        }}
      />

      {/* Poignée de déplacement pour le texte (taille et position constantes) */}
      {element.type === 'text' && (
        <div
          onPointerDown={handleStartDrag}
          className="selection-ui-handle drag-pill-handle cursor-move"
          style={{
            top: `${-offset - stemHeight}px`,
            left: `${-offset}px`,
            transform: `scale(${s})`,
            transformOrigin: 'bottom left'
          }}
        >
          <span className="material-symbols-rounded text-[14px]">drag_indicator</span>
          <span>Déplacer</span>
        </div>
      )}

      {/* Poignée de rotation (tige et ancre bien espacées du bord et de l'ancre n) */}
      <div
        className="selection-ui-handle handle-rotate-line"
        style={{
          left: `${w / 2}px`,
          top: `${-offset - stemHeight}px`,
          height: `${stemHeight}px`,
          width: `${1.5 * s}px`,
          transform: 'translateX(-50%)'
        }}
      />
      <div
        onPointerDown={handleStartRotate}
        title="Faire pivoter"
        className="selection-ui-handle handle-rotate-anchor"
        style={{
          left: `${w / 2}px`,
          top: `${-offset - stemHeight}px`,
          transform: `translate(-50%, -50%) scale(${s})`
        }}
      >
        <span className="material-symbols-rounded text-[14px]">rotate_right</span>
      </div>

      {/* 8 Poignées de redimensionnement parfaitement centrées sur angles et côtés */}
      {handleDefs.map(hd => (
        <div
          key={hd.type}
          onPointerDown={e => handleStartResize(e, hd.dirX, hd.dirY)}
          title="Redimensionner (Glisser : libre, Ctrl : conserver ratio, Shift : ancrer le centre, Ctrl+Shift : conserver ratio et ancrer le centre)"
          className="selection-ui-handle handle-resize"
          style={{
            left: `${hd.x}px`,
            top: `${hd.y}px`,
            transform: `translate(-50%, -50%) scale(${s})`,
            cursor: getResizeCursor(hd.type, element.rotation || 0)
          }}
        />
      ))}
    </>
  );
};
