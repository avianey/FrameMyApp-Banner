import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { TextElement } from './TextElement';
import { ShapeElement } from './ShapeElement';
import { ExportOverlay } from './ExportOverlay';

export const Artboard: React.FC = () => {
  const {
    state,
    artboardRef,
    artboardContainerRef,
    selectElement,
    updateExportZone,
    setIsDrawingExportMode,
    showSnackbar
  } = useEditor();

  const {
    background,
    elements,
    selectedElementId,
    activePanel,
    isDrawingExportMode,
    zoom,
    canvasWidth = 800,
    canvasHeight = 600
  } = state;

  // Background style computation
  const getBackgroundStyle = (): React.CSSProperties => {
    if (background.type === 'solid') {
      return { backgroundColor: background.solidColor };
    }
    if (background.type === 'linear') {
      return {
        background: `linear-gradient(${background.angle}deg, ${background.color1}, ${background.color2})`
      };
    }
    if (background.type === 'radial') {
      return {
        background: `radial-gradient(${background.radialShape} at center, ${background.radialColor1}, ${background.radialColor2})`
      };
    }
    if (background.type === 'image' && background.imageUrl) {
      return {
        backgroundImage: `url('${background.imageUrl}')`,
        backgroundSize: background.imageFit === 'contain' ? 'contain' : (background.imageFit === 'auto' ? 'auto' : '100% 100%'),
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return { backgroundColor: '#F8FAFC' };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If in drawing export mode, start interactive rectangle drawing
    if (activePanel === 'export' && isDrawingExportMode) {
      e.preventDefault();
      const rect = artboardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentZoom = zoom || 1;
      const startX = Math.max(0, Math.min(canvasWidth, (e.clientX - rect.left) / currentZoom));
      const startY = Math.max(0, Math.min(canvasHeight, (e.clientY - rect.top) / currentZoom));

      const onMove = (me: PointerEvent) => {
        const curX = Math.max(0, Math.min(canvasWidth, (me.clientX - rect.left) / currentZoom));
        const curY = Math.max(0, Math.min(canvasHeight, (me.clientY - rect.top) / currentZoom));

        const x = Math.min(startX, curX);
        const y = Math.min(startY, curY);
        const width = Math.max(30, Math.abs(curX - startX));
        const height = Math.max(30, Math.abs(curY - startY));
        const customRatio = width / height;

        let targetWidth = 1200;
        let targetHeight = Math.round(targetWidth / customRatio);
        if (customRatio < 0.75) {
          targetHeight = 1200;
          targetWidth = Math.round(targetHeight * customRatio);
        }

        updateExportZone({
          x,
          y,
          width,
          height,
          ratio: customRatio,
          preset: 'custom',
          targetWidth,
          targetHeight
        });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setIsDrawingExportMode(false);
        showSnackbar('Ratio custom figé et synchronisé !', 'aspect_ratio');
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return;
    }

    // Deselect if clicked on artboard backdrop
    const target = e.target as HTMLElement;
    if (
      target === artboardRef.current ||
      target.id === 'artboard-bg' ||
      target.id === 'artboard-elements'
    ) {
      if (!isDrawingExportMode) {
        selectElement(null);
      }
    }
  };

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 transition-all duration-150"
      style={{
        width: `${Math.round(canvasWidth * zoom)}px`,
        height: `${Math.round(canvasHeight * zoom)}px`
      }}
    >
      <div
        ref={artboardContainerRef}
        id="artboard-container"
        className="relative transition-transform duration-150 shadow-m3-3 rounded-2xl overflow-visible touch-none flex-shrink-0"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          minWidth: `${canvasWidth}px`,
          minHeight: `${canvasHeight}px`,
          maxWidth: `${canvasWidth}px`,
          maxHeight: `${canvasHeight}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        <div
          ref={artboardRef}
          id="artboard"
          onPointerDown={handlePointerDown}
          className="w-full h-full rounded-2xl relative overflow-hidden bg-white"
        >
          {/* Fond dynamique */}
          <div
            id="artboard-bg"
            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-200"
            style={getBackgroundStyle()}
          />

          {/* Objets (Textes & Formes) */}
          <div id="artboard-elements" className="absolute inset-0 w-full h-full">
            {elements.map(el => {
              const isSelected = selectedElementId === el.id;
              if (el.type === 'text') {
                return <TextElement key={el.id} element={el} isSelected={isSelected} />;
              }
              return <ShapeElement key={el.id} element={el} isSelected={isSelected} />;
            })}
          </div>
        </div>

        {/* Masque et boîte de sélection pour l'exportation */}
        <ExportOverlay />
      </div>
    </div>
  );
};
