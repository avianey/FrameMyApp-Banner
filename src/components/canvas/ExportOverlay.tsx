import React from 'react';
import { useEditor } from '../../context/EditorContext';

export const ExportOverlay: React.FC = () => {
  const { state, updateExportZone } = useEditor();
  const {
    exportZone,
    activePanel,
    isDrawingExportMode,
    zoom,
    canvasWidth = 800,
    canvasHeight = 600
  } = state;
  const currentZoom = zoom || 1;

  if (activePanel !== 'export') {
    return null;
  }

  const isLocked = exportZone.lockRatio !== false;
  const ratioVal = exportZone.ratio || (exportZone.targetWidth / exportZone.targetHeight) || 1;

  // Déplacement complet du cadre
  const handleStartDrag = (e: React.PointerEvent) => {
    if (isDrawingExportMode) return;
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialZone = { ...exportZone };

    const onMove = (me: PointerEvent) => {
      const dx = (me.clientX - startX) / currentZoom;
      const dy = (me.clientY - startY) / currentZoom;
      updateExportZone({
        x: Math.max(0, Math.min(canvasWidth - initialZone.width, Math.round(initialZone.x + dx))),
        y: Math.max(0, Math.min(canvasHeight - initialZone.height, Math.round(initialZone.y + dy)))
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Redimensionnement depuis les coins avec respect du verrouillage de ratio
  const handleStartResize = (corner: 'br' | 'bl' | 'tr' | 'tl') => (e: React.PointerEvent) => {
    if (isDrawingExportMode) return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initX = exportZone.x;
    const initY = exportZone.y;
    const initW = exportZone.width;
    const initH = exportZone.height;
    const currentRatio = ratioVal;

    const onMove = (me: PointerEvent) => {
      const dx = (me.clientX - startX) / currentZoom;
      const dy = (me.clientY - startY) / currentZoom;

      let newW = initW;
      let newH = initH;
      let newX = initX;
      let newY = initY;

      if (corner === 'br') {
        newW = Math.max(50, Math.min(canvasWidth - initX, initW + dx));
        if (isLocked) {
          newH = Math.max(40, Math.min(canvasHeight - initY, Math.round(newW / currentRatio)));
          newW = Math.round(newH * currentRatio);
        } else {
          newH = Math.max(40, Math.min(canvasHeight - initY, initH + dy));
        }
      } else if (corner === 'bl') {
        const proposedW = Math.max(50, Math.min(initX + initW, initW - dx));
        newW = proposedW;
        newX = initX + (initW - newW);
        if (isLocked) {
          newH = Math.max(40, Math.min(canvasHeight - initY, Math.round(newW / currentRatio)));
          newW = Math.round(newH * currentRatio);
          newX = initX + (initW - newW);
        } else {
          newH = Math.max(40, Math.min(canvasHeight - initY, initH + dy));
        }
      } else if (corner === 'tr') {
        newW = Math.max(50, Math.min(canvasWidth - initX, initW + dx));
        if (isLocked) {
          newH = Math.max(40, Math.min(initY + initH, Math.round(newW / currentRatio)));
          newW = Math.round(newH * currentRatio);
          newY = initY + (initH - newH);
        } else {
          const proposedH = Math.max(40, Math.min(initY + initH, initH - dy));
          newH = proposedH;
          newY = initY + (initH - newH);
        }
      } else if (corner === 'tl') {
        newW = Math.max(50, Math.min(initX + initW, initW - dx));
        newX = initX + (initW - newW);
        if (isLocked) {
          newH = Math.max(40, Math.min(initY + initH, Math.round(newW / currentRatio)));
          newW = Math.round(newH * currentRatio);
          newX = initX + (initW - newW);
          newY = initY + (initH - newH);
        } else {
          newH = Math.max(40, Math.min(initY + initH, initH - dy));
          newY = initY + (initH - newH);
        }
      }

      const updatedRatio = isLocked ? currentRatio : (newW / newH);
      updateExportZone({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
        ratio: updatedRatio,
        preset: 'custom'
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const formattedRatio = Math.round(ratioVal * 100) / 100;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Masque SVG avec trou découpé */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="export-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={exportZone.x}
                y={exportZone.y}
                width={exportZone.width}
                height={exportZone.height}
                fill="black"
                rx="4"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(29, 27, 32, 0.45)"
            mask="url(#export-mask)"
          />
        </svg>
      </div>

      {/* Cadre de sélection déplaçable et redimensionnable */}
      <div
        onPointerDown={handleStartDrag}
        className="absolute border-2 border-dashed border-m3-sys-primary bg-m3-sys-primary/10 rounded pointer-events-auto cursor-move flex items-start justify-between p-1.5 shadow-m3-2 select-none"
        style={{
          left: `${exportZone.x}px`,
          top: `${exportZone.y}px`,
          width: `${exportZone.width}px`,
          height: `${exportZone.height}px`
        }}
      >
        <span className="bg-m3-sys-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
          <span className="material-symbols-rounded text-xs">
            {isLocked ? 'lock' : 'lock_open'}
          </span>
          <span>
            {Math.round(exportZone.width)} × {Math.round(exportZone.height)}
          </span>
        </span>
        <span className="bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface text-[10px] font-mono px-1.5 py-0.5 rounded border border-m3-sys-outlineVariant/50 font-bold">
          Ratio {formattedRatio}:1
        </span>

        {/* 4 Poignées de redimensionnement de coin */}
        <div
          onPointerDown={handleStartResize('tl')}
          title={isLocked ? 'Redimensionner (ratio conservé)' : 'Redimensionner librement'}
          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-m3-sys-primary border-2 border-white rounded-full shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={handleStartResize('tr')}
          title={isLocked ? 'Redimensionner (ratio conservé)' : 'Redimensionner librement'}
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-m3-sys-primary border-2 border-white rounded-full shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={handleStartResize('bl')}
          title={isLocked ? 'Redimensionner (ratio conservé)' : 'Redimensionner librement'}
          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-m3-sys-primary border-2 border-white rounded-full shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
        />
        <div
          onPointerDown={handleStartResize('br')}
          title={isLocked ? 'Redimensionner (ratio conservé)' : 'Redimensionner librement'}
          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-m3-sys-primary border-2 border-white rounded-full shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
        />
      </div>
    </div>
  );
};
