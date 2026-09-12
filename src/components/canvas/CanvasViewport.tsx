import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Artboard } from './Artboard';

export const CanvasViewport: React.FC = () => {
  const {
    viewportRef,
    state,
    updateElement,
    applyBackgroundImage,
    setActivePanel,
    showSnackbar,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setPan
  } = useEditor();
  const { zoom, pan } = state;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);

  // Wheel zoom event handler (non-passive to allow e.preventDefault)
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom(
        prev => {
          const next = prev * zoomFactor;
          return Math.min(3.5, Math.max(0.2, Math.round(next * 100) / 100));
        },
        { clientX: e.clientX, clientY: e.clientY }
      );
    };

    const preventAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    viewportEl.addEventListener('wheel', handleWheel, { passive: false });
    viewportEl.addEventListener('auxclick', preventAuxClick);
    return () => {
      viewportEl.removeEventListener('wheel', handleWheel);
      viewportEl.removeEventListener('auxclick', preventAuxClick);
    };
  }, [setZoom, viewportRef]);

  // Space key detection for pan navigation (Inkscape style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Clic molette (bouton 1) ou drag avec espace
    if (e.button === 1 || (isSpacePressed && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initPanX: pan.x,
        initPanY: pan.y
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.startX;
      const dy = e.clientY - panStartRef.current.startY;
      setPan({
        x: Math.round(panStartRef.current.initPanX + dx),
        y: Math.round(panStartRef.current.initPanY + dy)
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

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

        applyBackgroundImage(result);
        setActivePanel('bg');
      };
      reader.readAsDataURL(files[0]);
    }
  };

  let cursorClass = 'cursor-default';
  if (isPanning) {
    cursorClass = 'cursor-grabbing';
  } else if (isSpacePressed) {
    cursorClass = 'cursor-grab';
  }

  return (
    <main
      ref={viewportRef}
      id="canvas-viewport"
      className={`flex-1 h-full overflow-hidden canvas-grid relative select-none transition-all ${cursorClass} ${
        isDragOver ? 'ring-4 ring-inset ring-m3-sys-primary' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
          title="Dézoomer"
          className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-lg leading-none">remove</span>
        </button>
        <button
          onClick={resetZoom}
          title="Recentrer à 100%"
          className="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest cursor-pointer transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="Zoomer"
          className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-lg leading-none">add</span>
        </button>
      </div>
    </main>
  );
};
