import React from 'react';
import { useEditor } from '../../context/EditorContext';

export const ExportOverlay: React.FC = () => {
  const { state, updateExportZone } = useEditor();
  const { exportZone, activePanel, isDrawingExportMode, zoom } = state;
  const currentZoom = zoom || 1;

  if (activePanel !== 'export') {
    return null;
  }

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
        x: Math.max(0, Math.min(800 - initialZone.width, initialZone.x + dx)),
        y: Math.max(0, Math.min(600 - initialZone.height, initialZone.y + dy))
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const ratioVal = exportZone.ratio ? Math.round(exportZone.ratio * 100) / 100 : 1;

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

      {/* Cadre de sélection déplaçable */}
      <div
        onPointerDown={handleStartDrag}
        className="absolute border-2 border-dashed border-m3-sys-primary bg-m3-sys-primary/10 rounded pointer-events-auto cursor-move flex items-start justify-between p-1.5 shadow-m3-2"
        style={{
          left: `${exportZone.x}px`,
          top: `${exportZone.y}px`,
          width: `${exportZone.width}px`,
          height: `${exportZone.height}px`
        }}
      >
        <span className="bg-m3-sys-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
          Zone Export {Math.round(exportZone.width)} × {Math.round(exportZone.height)}
        </span>
        <span className="bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface text-[10px] font-mono px-1.5 py-0.5 rounded border border-m3-sys-outlineVariant/50">
          Ratio {ratioVal}:1
        </span>
      </div>
    </div>
  );
};
