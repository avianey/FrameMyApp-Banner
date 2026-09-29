import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { TextElement } from './TextElement';
import { ShapeElement } from './ShapeElement';
import { DeviceElement } from './DeviceElement';
import { ExportOverlay } from './ExportOverlay';
import { InPlaceImageCropper } from './InPlaceImageCropper';
import { assetManager } from '../../utils/assetManager';
import { resolveAsset } from '../../utils/templateEngine';

export const Artboard: React.FC = () => {
  const {
    state,
    artboardRef,
    artboardContainerRef,
    selectElement,
    updateExportZone,
    setIsDrawingExportMode,
    showSnackbar,
    setBackground,
    editingImageElementId,
    setEditingImageElementId,
    setActivePanel,
    loadedBundle
  } = useEditor();

  const {
    background,
    elements,
    selectedElementIds = [],
    activePanel,
    isDrawingExportMode,
    zoom,
    pan,
    canvasWidth = 800,
    canvasHeight = 600
  } = state;

  const displayBgUrl =
    (background.imageUrl ? assetManager.getDisplayUrl(background.imageUrl) : undefined) ||
    (background.imageUrl && loadedBundle?.assets ? resolveAsset(background.imageUrl, undefined, loadedBundle.assets) : undefined) ||
    background.imageUrl;

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
      let bgSize = 'cover';
      if (background.imageFit === 'contain') {
        bgSize = 'contain';
      } else if (background.imageFit === 'auto') {
        bgSize = 'auto';
      } else if (background.imageFit === 'cover') {
        bgSize = 'cover';
      } else if ((background.imageFit as any) === 'stretch' || (background.imageFit as any) === 'fill') {
        bgSize = '100% 100%';
      }

      return {
        backgroundImage: `url('${displayBgUrl}')`,
        backgroundSize: bgSize,
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
      e.stopPropagation();
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

    // Le clic sur l'arrière-plan du canevas propage vers CanvasViewport pour autoriser le glisser / pan direct de la scène
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (background.type === 'image' && background.imageUrl) {
      e.stopPropagation();
      setEditingImageElementId('background');
      setActivePanel('bg');
    }
  };

  return (
    <div
      ref={artboardContainerRef}
      id="artboard-container"
      className="absolute shadow-m3-3 rounded-2xl overflow-visible touch-none flex-shrink-0"
      style={{
        left: `${pan.x}px`,
        top: `${pan.y}px`,
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        minWidth: `${canvasWidth}px`,
        minHeight: `${canvasHeight}px`,
        maxWidth: `${canvasWidth}px`,
        maxHeight: `${canvasHeight}px`,
        transform: `scale(${zoom})`,
        transformOrigin: '0 0'
      }}
    >
      <div
        ref={artboardRef}
        id="artboard"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        className="w-full h-full rounded-2xl relative overflow-hidden bg-white"
      >
        {/* Fond dynamique */}
        {background.type === 'image' && background.imageUrl ? (
          <div id="artboard-bg" className="absolute inset-0 w-full h-full">
            <InPlaceImageCropper
              containerWidth={canvasWidth}
              containerHeight={canvasHeight}
              imageUrl={displayBgUrl}
              imageFit={background.imageFit || 'cover'}
              imageScale={background.imageScale || 1.0}
              imageOffsetX={background.imageOffsetX || 0}
              imageOffsetY={background.imageOffsetY || 0}
              imageNaturalWidth={background.imageNaturalWidth}
              imageNaturalHeight={background.imageNaturalHeight}
              isEditing={editingImageElementId === 'background'}
              onUpdate={updates => setBackground(updates)}
              onClose={() => setEditingImageElementId(null)}
              canvasZoom={zoom || 1.0}
              title="Recadrer l'arrière-plan"
            />
          </div>
        ) : (
          <div
            id="artboard-bg"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={getBackgroundStyle()}
          />
        )}

        {/* Objets (Textes & Formes) */}
        <div id="artboard-elements" className="absolute inset-0 w-full h-full">
          {elements.map(el => {
            const isSelected = selectedElementIds.includes(el.id);
            const selectionIndex = isSelected ? selectedElementIds.indexOf(el.id) + 1 : undefined;
            const isMultiSelected = selectedElementIds.length > 1;

            if (el.type === 'text') {
              return (
                <TextElement
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  selectionIndex={selectionIndex}
                  isMultiSelected={isMultiSelected}
                />
              );
            }
            if (el.type === 'device') {
              return (
                <DeviceElement
                  key={el.id}
                  element={el}
                  isSelected={isSelected}
                  selectionIndex={selectionIndex}
                  isMultiSelected={isMultiSelected}
                />
              );
            }
            return (
              <ShapeElement
                key={el.id}
                element={el}
                isSelected={isSelected}
                selectionIndex={selectionIndex}
                isMultiSelected={isMultiSelected}
              />
            );
          })}
        </div>
      </div>

      {/* Masque et boîte de sélection pour l'exportation */}
      <ExportOverlay />
    </div>
  );
};
