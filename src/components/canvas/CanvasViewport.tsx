import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Artboard } from './Artboard';
import { computeDeviceHeightFromWidth } from '../../utils/deviceHelper';
import { computeImageCropGeometry, clampImageOffset } from '../../utils/imageCropHelper';
import { ShapeElementModel } from '../../types';

export const CanvasViewport: React.FC = () => {
  const {
    viewportRef,
    state,
    updateElement,
    setBackground,
    applyBackgroundImage,
    setActivePanel,
    showSnackbar,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    centerCanvas,
    setPan,
    selectElement,
    editingImageElementId,
    setEditingImageElementId
  } = useEditor();
  const { zoom, pan } = state;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number } | null>(null);
  const hasMovedRef = useRef<boolean>(false);
  const editingImageElementIdRef = useRef(editingImageElementId);
  const hasInitiallyCenteredRef = useRef<boolean>(false);

  useEffect(() => {
    editingImageElementIdRef.current = editingImageElementId;
  }, [editingImageElementId]);

  // Centrage automatique et calcul du meilleur zoom à l'ouverture de la scène
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasInitiallyCenteredRef.current) {
        centerCanvas(state.canvasWidth, state.canvasHeight, true);
        hasInitiallyCenteredRef.current = true;
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [centerCanvas, state.canvasWidth, state.canvasHeight]);

  const handleToolbarZoomStepRef = useRef<(delta: number) => void>(() => {});

  // Wheel zoom event handler (non-passive to allow e.preventDefault)
  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Si l'utilisateur est en train d'éditer ou recadrer l'image de fond et que la molette tourne sur le viewport
      if (editingImageElementIdRef.current === 'background') {
        const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
        handleToolbarZoomStepRef.current(zoomDelta);
        return;
      }

      // Si l'utilisateur est en train d'éditer ou recadrer une image d'une forme, NE JAMAIS zoomer la scène
      if (editingImageElementIdRef.current) {
        return;
      }

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

  // Space key detection for pan navigation (Inkscape style) & Escape to exit editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingImageElementIdRef.current) {
        e.preventDefault();
        setEditingImageElementId(null);
        return;
      }
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
  }, [setEditingImageElementId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Si l'utilisateur est en train de tracer la zone d'export, ne pas capturer le pan
    if (state.activePanel === 'export' && state.isDrawingExportMode) {
      return;
    }

    // Détection immédiate du double-clic sur l'arrière-plan du canevas
    if (e.button === 0 && e.detail === 2) {
      if (state.background.type === 'image' && state.background.imageUrl) {
        e.preventDefault();
        e.stopPropagation();
        selectElement(null);
        setEditingImageElementId('background');
        setActivePanel('bg');
        setIsPanning(false);
        panStartRef.current = null;
        return;
      }
    }

    // Autoriser le déplacement de la scène avec :
    // 1. Clic gauche (bouton 0) sur l'arrière-plan ou scène
    // 2. Clic molette (bouton 1)
    // 3. Espace + clic gauche
    if (e.button === 0 || e.button === 1) {
      hasMovedRef.current = false;
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
      if (!hasMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        hasMovedRef.current = true;
      }
      setPan({
        x: Math.round(panStartRef.current.initPanX + dx),
        y: Math.round(panStartRef.current.initPanY + dy)
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      const wasDrag = hasMovedRef.current;
      setIsPanning(false);
      panStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}

      // Si c'était un simple clic sans déplacement sur l'arrière-plan avec le clic gauche : désélectionner et ouvrir le volet d'arrière-plan
      if (!wasDrag && e.button === 0) {
        selectElement(null);
        setActivePanel('bg');
        if (editingImageElementId && editingImageElementId !== 'background') {
          setEditingImageElementId(null);
        }
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target === viewportRef.current ||
      target.id === 'artboard' ||
      target.id === 'artboard-bg' ||
      target.id === 'artboard-elements' ||
      target.id === 'canvas-viewport' ||
      Boolean(target.closest('#artboard-bg'))
    ) {
      if (state.background.type === 'image' && state.background.imageUrl) {
        e.preventDefault();
        e.stopPropagation();
        selectElement(null);
        setEditingImageElementId('background');
        setActivePanel('bg');
      }
    }
  };

  const isEditingBg = editingImageElementId === 'background';
  const editingShape = typeof editingImageElementId === 'string' && editingImageElementId !== 'background'
    ? state.elements.find(el => el.id === editingImageElementId && el.type === 'shape') as ShapeElementModel | undefined
    : undefined;

  const currentImageScale = isEditingBg
    ? (state.background.imageScale || 1.0)
    : (editingShape?.imageScale || 1.0);

  const handleToolbarZoomStep = (delta: number) => {
    const minScale = 1.0;
    const nextScale = Math.round(Math.max(minScale, Math.min(5.0, currentImageScale + delta)) * 100) / 100;
    if (isEditingBg) {
      const geom = computeImageCropGeometry(
        state.canvasWidth,
        state.canvasHeight,
        state.background.imageNaturalWidth || 0,
        state.background.imageNaturalHeight || 0,
        nextScale,
        state.background.imageOffsetX || 0,
        state.background.imageOffsetY || 0,
        state.background.imageFit || 'cover'
      );
      const clamped = clampImageOffset(
        state.background.imageOffsetX || 0,
        state.background.imageOffsetY || 0,
        geom.maxOffsetX,
        geom.maxOffsetY
      );
      setBackground({
        imageScale: nextScale,
        imageOffsetX: clamped.offsetX,
        imageOffsetY: clamped.offsetY
      });
    } else if (editingShape) {
      const geom = computeImageCropGeometry(
        editingShape.width,
        editingShape.height,
        editingShape.imageNaturalWidth || 0,
        editingShape.imageNaturalHeight || 0,
        nextScale,
        editingShape.imageOffsetX || 0,
        editingShape.imageOffsetY || 0,
        editingShape.imageFit || 'cover'
      );
      const clamped = clampImageOffset(
        editingShape.imageOffsetX || 0,
        editingShape.imageOffsetY || 0,
        geom.maxOffsetX,
        geom.maxOffsetY
      );
      updateElement(editingShape.id, {
        imageScale: nextScale,
        imageOffsetX: clamped.offsetX,
        imageOffsetY: clamped.offsetY
      });
    }
  };

  handleToolbarZoomStepRef.current = handleToolbarZoomStep;

  const handleToolbarCenter = () => {
    if (isEditingBg) {
      setBackground({ imageOffsetX: 0, imageOffsetY: 0, imageScale: 1.0 });
    } else if (editingShape) {
      updateElement(editingShape.id, { imageOffsetX: 0, imageOffsetY: 0, imageScale: 1.0 });
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
      const file = files[0];
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        if (!result) return;

        applyBackgroundImage(result, file);
        setActivePanel('bg');
      };
      reader.readAsDataURL(file);
    }
  };

  let cursorClass = 'cursor-grab';
  if (isPanning) {
    cursorClass = 'cursor-grabbing';
  } else if (isSpacePressed) {
    cursorClass = 'cursor-grab';
  }

  return (
    <main
      ref={viewportRef}
      id="canvas-viewport"
      className={`flex-1 h-full overflow-hidden canvas-grid relative select-none touch-none transition-all ${cursorClass} ${
        isDragOver ? 'ring-4 ring-inset ring-m3-sys-primary' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Bandeau flottant d'ajustement / recadrage d'image au sommet du studio (taille fixe, non déformé, non rotaté) */}
      {editingImageElementId && (
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-40 bg-m3-sys-surfaceContainerHighest/95 backdrop-blur-md rounded-full shadow-m3-4 border border-indigo-500/50 px-4 py-1.5 flex items-center space-x-3 text-xs font-semibold select-none animate-scale-up"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <span className="material-symbols-rounded text-base text-indigo-400">crop</span>
          <span className="text-xs text-m3-sys-onSurface font-bold whitespace-nowrap">
            {isEditingBg ? "Recadrer l'arrière-plan" : "Recadrer l'image de la forme"}
          </span>

          <div className="w-px h-4 bg-m3-sys-outlineVariant/50" />

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleToolbarZoomStep(-0.1)}
              title="Dézoomer l'image"
              className="w-6 h-6 rounded-full hover:bg-m3-sys-surfaceContainer flex items-center justify-center text-m3-sys-onSurface cursor-pointer active:scale-90 transition-all"
            >
              <span className="material-symbols-rounded text-sm">remove</span>
            </button>
            <span className="font-mono text-xs text-m3-sys-onSurface font-bold px-1 min-w-[40px] text-center">
              {Math.round(currentImageScale * 100)}%
            </span>
            <button
              onClick={() => handleToolbarZoomStep(0.1)}
              title="Zoomer l'image"
              className="w-6 h-6 rounded-full hover:bg-m3-sys-surfaceContainer flex items-center justify-center text-m3-sys-onSurface cursor-pointer active:scale-90 transition-all"
            >
              <span className="material-symbols-rounded text-sm">add</span>
            </button>
          </div>

          <div className="w-px h-4 bg-m3-sys-outlineVariant/50" />

          {/* Bouton Recentrer */}
          <button
            onClick={handleToolbarCenter}
            title="Recentrer l'image dans le cadre"
            className="px-2.5 py-1 rounded-full hover:bg-m3-sys-surfaceContainer text-xs text-m3-sys-onSurface cursor-pointer flex items-center space-x-1 transition-colors"
          >
            <span className="material-symbols-rounded text-sm">filter_center_focus</span>
            <span className="hidden sm:inline">Recentrer</span>
          </button>

          {/* Bouton Terminer */}
          <button
            onClick={() => setEditingImageElementId(null)}
            title="Valider et quitter le mode recadrage (Échap)"
            className="px-3.5 py-1 rounded-full bg-m3-sys-primary text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center space-x-1 shadow-sm ml-1"
          >
            <span className="material-symbols-rounded text-sm">check</span>
            <span>Terminer</span>
          </button>
        </div>
      )}

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
