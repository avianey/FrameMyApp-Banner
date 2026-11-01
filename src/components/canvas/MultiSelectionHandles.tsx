import React from 'react';
import { CanvasElement, DeviceElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { getElementAABB } from '../../utils/alignment';
import { computeDeviceHeightFromWidth, computeDeviceWidthFromHeight } from '../../utils/deviceHelper';

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HandleDef {
  type: HandleType;
  dirX: -1 | 0 | 1;
  dirY: -1 | 0 | 1;
  x: number;
  y: number;
  cursor: string;
}

function getEffectiveElementHeight(el: CanvasElement): number {
  if (el.type === 'text') {
    const minLines = (el as any).minLines || 1;
    const fontSize = (el as any).fontSize || 24;
    const lineHeight = (el as any).lineHeight || 1.2;
    return Math.max(el.height || 0, minLines * fontSize * lineHeight);
  }
  return el.height || 0;
}

export const MultiSelectionHandles: React.FC = () => {
  const { state, updateElements, recordHistory } = useEditor();
  const { elements, selectedElementIds = [], zoom = 1 } = state;

  const selectedElements = elements.filter(el => selectedElementIds.includes(el.id));
  if (selectedElements.length < 2) return null;

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (const el of selectedElements) {
    const h = getEffectiveElementHeight(el);
    const aabb = getElementAABB({
      x: el.x,
      y: el.y,
      width: el.width,
      height: h,
      rotation: el.rotation
    });
    if (aabb.left < minLeft) minLeft = aabb.left;
    if (aabb.top < minTop) minTop = aabb.top;
    if (aabb.right > maxRight) maxRight = aabb.right;
    if (aabb.bottom > maxBottom) maxBottom = aabb.bottom;
  }

  const groupX = minLeft;
  const groupY = minTop;
  const groupW = Math.max(1, maxRight - minLeft);
  const groupH = Math.max(1, maxBottom - minTop);

  const handleStartResize = (
    e: React.PointerEvent,
    dirX: -1 | 0 | 1,
    dirY: -1 | 0 | 1
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const currentZoom = zoom || 1;
    let hasMoved = false;

    const initGroupX = groupX;
    const initGroupY = groupY;
    const initGroupW = groupW;
    const initGroupH = groupH;
    const initGroupCenterX = initGroupX + initGroupW / 2;
    const initGroupCenterY = initGroupY + initGroupH / 2;

    const snapshots = selectedElements.map(el => {
      const h = getEffectiveElementHeight(el);
      return {
        el,
        initX: el.x,
        initY: el.y,
        initW: el.width,
        initH: h,
        initCenterX: el.x + el.width / 2,
        initCenterY: el.y + h / 2
      };
    });

    const hasDeviceWithImage = selectedElements.some(
      el => el.type === 'device' && Boolean((el as DeviceElementModel).screenImageUrl)
    );

    const onMove = (moveEvent: PointerEvent) => {
      if (!hasMoved) {
        hasMoved = true;
        recordHistory();
      }

      const dx = (moveEvent.clientX - startX) / currentZoom;
      const dy = (moveEvent.clientY - startY) / currentZoom;

      const deltaW = dirX !== 0 ? dirX * dx : 0;
      const deltaH = dirY !== 0 ? dirY * dy : 0;

      const isShift = moveEvent.shiftKey;
      const isCentered = moveEvent.ctrlKey || moveEvent.metaKey || moveEvent.altKey;
      const mustLockRatio = isShift || hasDeviceWithImage;

      let targetGroupW: number;
      let targetGroupH: number;

      if (mustLockRatio) {
        let scaleFactor = 1;
        if (dirX === 0) {
          scaleFactor = Math.max(0.05, 1 + (isCentered ? 2 : 1) * (deltaH / initGroupH));
        } else if (dirY === 0) {
          scaleFactor = Math.max(0.05, 1 + (isCentered ? 2 : 1) * (deltaW / initGroupW));
        } else {
          const denom = initGroupW * initGroupW + initGroupH * initGroupH;
          const proj = denom > 0 ? (deltaW * initGroupW + deltaH * initGroupH) / denom : 0;
          scaleFactor = Math.max(0.05, 1 + (isCentered ? 2 : 1) * proj);
        }
        targetGroupW = Math.max(30, initGroupW * scaleFactor);
        targetGroupH = Math.max(30, initGroupH * scaleFactor);
      } else {
        const mult = isCentered ? 2 : 1;
        targetGroupW = dirX !== 0 ? Math.max(30, initGroupW + mult * deltaW) : initGroupW;
        targetGroupH = dirY !== 0 ? Math.max(30, initGroupH + mult * deltaH) : initGroupH;
      }

      const scaleX = targetGroupW / initGroupW;
      const scaleY = targetGroupH / initGroupH;

      let anchorX: number;
      let anchorY: number;

      if (isCentered) {
        anchorX = initGroupCenterX;
        anchorY = initGroupCenterY;
      } else {
        anchorX =
          dirX === 1
            ? initGroupX
            : dirX === -1
            ? initGroupX + initGroupW
            : initGroupCenterX;
        anchorY =
          dirY === 1
            ? initGroupY
            : dirY === -1
            ? initGroupY + initGroupH
            : initGroupCenterY;
      }

      const updatesById: Record<string, Partial<CanvasElement>> = {};

      for (const snap of snapshots) {
        const { el, initW, initH, initCenterX, initCenterY } = snap;
        const newCenterX = anchorX + (initCenterX - anchorX) * scaleX;
        const newCenterY = anchorY + (initCenterY - anchorY) * scaleY;

        let newW = Math.max(20, Math.round(initW * scaleX));
        let newH = Math.max(20, Math.round(initH * scaleY));

        if (el.type === 'device' && (el as DeviceElementModel).screenImageUrl) {
          const dev = el as DeviceElementModel;
          const imageRatio =
            dev.imageAspectRatio || (initH > 0 && initW > 0 ? initW / initH : 9 / 16);
          if (dirX === 0 && !mustLockRatio) {
            newW = computeDeviceWidthFromHeight(newH, imageRatio, dev);
          } else {
            newH = computeDeviceHeightFromWidth(newW, imageRatio, dev);
          }
        }

        const newX = Math.round(newCenterX - newW / 2);
        const newY = Math.round(newCenterY - newH / 2);

        updatesById[el.id] = {
          x: newX,
          y: newY,
          width: newW,
          height: newH
        };
      }

      updateElements(updatesById);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const s = 1 / (zoom || 1);
  const offset = 6 * s;

  const handleDefs: HandleDef[] = [
    { type: 'nw', dirX: -1, dirY: -1, x: -offset, y: -offset, cursor: 'nwse-resize' },
    { type: 'ne', dirX: 1, dirY: -1, x: groupW + offset, y: -offset, cursor: 'nesw-resize' },
    { type: 'se', dirX: 1, dirY: 1, x: groupW + offset, y: groupH + offset, cursor: 'nwse-resize' },
    { type: 'sw', dirX: -1, dirY: 1, x: -offset, y: groupH + offset, cursor: 'nesw-resize' },
    { type: 'n', dirX: 0, dirY: -1, x: groupW / 2, y: -offset, cursor: 'ns-resize' },
    { type: 's', dirX: 0, dirY: 1, x: groupW / 2, y: groupH + offset, cursor: 'ns-resize' },
    { type: 'w', dirX: -1, dirY: 0, x: -offset, y: groupH / 2, cursor: 'ew-resize' },
    { type: 'e', dirX: 1, dirY: 0, x: groupW + offset, y: groupH / 2, cursor: 'ew-resize' }
  ];

  return (
    <div
      className="selection-ui-handle absolute pointer-events-none z-30"
      style={{
        left: `${groupX}px`,
        top: `${groupY}px`,
        width: `${groupW}px`,
        height: `${groupH}px`
      }}
    >
      {/* Cadre englobant de sélection multiple */}
      <div
        className="absolute border border-m3-sys-primary rounded-lg pointer-events-none"
        style={{
          inset: `${-offset}px`,
          borderWidth: `${1.5 * s}px`,
          borderRadius: `${8 * s}px`
        }}
      />

      {/* 8 Poignées de redimensionnement de groupe */}
      {handleDefs.map(hd => (
        <div
          key={hd.type}
          onPointerDown={e => handleStartResize(e, hd.dirX, hd.dirY)}
          title="Redimensionner la sélection (Glisser : libre, Shift : conserver ratio, Ctrl : ancrer le centre, Shift+Ctrl : conserver ratio et ancrer le centre)"
          className="selection-ui-handle handle-resize pointer-events-auto"
          style={{
            left: `${hd.x}px`,
            top: `${hd.y}px`,
            transform: `translate(-50%, -50%) scale(${s})`,
            cursor: hd.cursor
          }}
        />
      ))}
    </div>
  );
};
