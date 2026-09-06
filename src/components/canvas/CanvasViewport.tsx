import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Artboard } from './Artboard';

export const CanvasViewport: React.FC = () => {
  const {
    viewportRef,
    state,
    updateElement,
    setBackground,
    setActivePanel,
    showSnackbar,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom
  } = useEditor();
  const { zoom } = state;
  const [isDragOver, setIsDragOver] = useState(false);

  // Wheel zoom event handler (non-passive to allow e.preventDefault)
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(prev => {
        const next = prev * zoomFactor;
        return Math.min(3.5, Math.max(0.2, Math.round(next * 100) / 100));
      });
    };

    viewportEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      viewportEl.removeEventListener('wheel', handleWheel);
    };
  }, [setZoom, viewportRef]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        if (!result) return;

        if (state.selectedElementId) {
          const el = state.elements.find(item => item.id === state.selectedElementId);
          if (el && el.type === 'shape') {
            updateElement(el.id, { fillType: 'image', imageUrl: result });
            showSnackbar('Image appliquée sur la forme', 'image');
            return;
          }
        }

        setBackground({ type: 'image', imageUrl: result });
        setActivePanel('bg');
        showSnackbar('Image de fond mise à jour', 'image');
      };
      reader.readAsDataURL(files[0]);
    }
  };

  return (
    <main
      ref={viewportRef}
      id="canvas-viewport"
      className={`flex-1 h-full overflow-auto canvas-grid relative flex items-center justify-center p-8 sm:p-16 transition-all ${
        isDragOver ? 'ring-4 ring-inset ring-m3-sys-primary' : ''
      }`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Plan de travail avec échelle de zoom */}
      <Artboard />

      {/* Badge flottant des contrôles de zoom en bas à gauche */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center bg-m3-sys-surfaceContainerHigh/90 backdrop-blur-md rounded-full shadow-m3-2 border border-m3-sys-outlineVariant/50 p-1 space-x-1 select-none">
        <button
          onClick={zoomOut}
          title="Dézoomer (ou roulette de souris)"
          className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-lg leading-none">remove</span>
        </button>
        <button
          onClick={resetZoom}
          title="Réinitialiser à 100%"
          className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest cursor-pointer transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="Zoomer (ou roulette de souris)"
          className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-lg leading-none">add</span>
        </button>
      </div>
    </main>
  );
};
