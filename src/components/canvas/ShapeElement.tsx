import React, { useRef, useState } from 'react';
import { QuadPoints, ShapeElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';
import { InPlaceImageCropper } from './InPlaceImageCropper';
import { assetManager, isSupportedImageFile, ensureBlobMimeType } from '../../utils/assetManager';
import { resolveAsset } from '../../utils/templateEngine';
import { getCombinedBoxShadow, getCombinedDropShadowFilter } from '../../utils/effectsHelper';
import { computeSnapPosition, emitSnapGuides } from '../../utils/alignment';
import {
  getEffectiveQuadPoints,
  quadPointsToClipPath,
  quadPointsToSvgPoints,
  isConvexQuad,
  computePerspectiveMatrix3d
} from '../../utils/quadHelper';

interface ShapeElementProps {
  element: ShapeElementModel;
  isSelected: boolean;
  selectionIndex?: number;
  isMultiSelected?: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({
  element,
  isSelected,
  selectionIndex,
  isMultiSelected
}) => {
  const {
    selectElement,
    updateElement,
    state,
    recordHistory,
    editingImageElementId,
    setEditingImageElementId,
    setActivePanel,
    showSnackbar,
    persistAsset,
    loadedBundle
  } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);
  const currentZoom = state.zoom || 1;
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDropTarget(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDropTarget) setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDropTarget(false);

    const files = e.dataTransfer.files;
    if (files && isSupportedImageFile(files[0])) {
      recordHistory();
      const file = ensureBlobMimeType(files[0], files[0].name) as File;
      persistAsset(file).then(({ displayUrl }) => {
        const img = new Image();
        img.onload = () => {
          updateElement(element.id, {
            fillType: 'image',
            imageUrl: displayUrl,
            imageNaturalWidth: img.naturalWidth,
            imageNaturalHeight: img.naturalHeight,
            imageScale: 1.0,
            imageOffsetX: 0,
            imageOffsetY: 0
          });
          selectElement(element.id);
          setActivePanel('shape');
          showSnackbar('Texture enregistrée et appliquée sur la forme', 'image');
        };
        img.src = displayUrl;
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Si on est en mode édition de l'image de cette forme, laisser le cropper gérer l'image
    if (editingImageElementId === element.id) {
      return;
    }

    // If click on resize, rotate or quad vertex handle, let those handle it
    const target = e.target as HTMLElement;
    if (
      target.closest('.handle-resize') ||
      target.closest('.handle-rotate-anchor') ||
      target.closest('.handle-quad-vertex')
    ) {
      return;
    }

    e.stopPropagation();

    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl) {
      selectElement(element.id, true);
      return;
    }

    if (!isSelected) {
      selectElement(element.id, false);
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const idsToMove = isSelected && isMultiSelected
      ? state.selectedElementIds
      : [element.id];

    const initPositions = idsToMove.map(id => {
      const el = state.elements.find(item => item.id === id);
      return { id, x: el?.x || 0, y: el?.y || 0 };
    });

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / currentZoom;
      const dy = (moveEvent.clientY - startY) / currentZoom;
      if (!hasMoved && Math.abs(moveEvent.clientX - startX) < 2 && Math.abs(moveEvent.clientY - startY) < 2) {
        return;
      }
      if (!hasMoved) {
        hasMoved = true;
        recordHistory();
      }

      if (idsToMove.length === 1 && !moveEvent.altKey) {
        const pos = initPositions[0];
        const snapped = computeSnapPosition(
          {
            id: element.id,
            x: Math.round(pos.x + dx),
            y: Math.round(pos.y + dy),
            width: element.width,
            height: element.height,
            rotation: element.rotation
          },
          state.elements,
          { width: state.canvasWidth || 800, height: state.canvasHeight || 600 }
        );
        emitSnapGuides(snapped.guides);
        updateElement(element.id, { x: snapped.x, y: snapped.y });
      } else {
        emitSnapGuides(null);
        initPositions.forEach(pos => {
          updateElement(pos.id, {
            x: Math.round(pos.x + dx),
            y: Math.round(pos.y + dy)
          });
        });
      }
    };

    const onUp = () => {
      emitSnapGuides(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Compute shape styles
  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: element.opacity,
    boxSizing: 'border-box'
  };

  // Background fill
  if (element.fillType === 'none') {
    shapeStyle.backgroundColor = 'transparent';
  } else if (element.fillType === 'solid') {
    shapeStyle.backgroundColor = element.solidColor;
  } else if (element.fillType === 'linear') {
    if (element.gradientStops && element.gradientStops.length > 0) {
      const sortedStops = [...element.gradientStops].sort((a, b) => a.offset - b.offset);
      const stopsCss = sortedStops.map(s => `${s.color} ${s.offset}%`).join(', ');
      shapeStyle.background = `linear-gradient(${element.angle}deg, ${stopsCss})`;
    } else {
      shapeStyle.background = `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})`;
    }
  } else if (element.fillType === 'radial') {
    if (element.radialStops && element.radialStops.length > 0) {
      const sortedStops = [...element.radialStops].sort((a, b) => a.offset - b.offset);
      const stopsCss = sortedStops.map(s => `${s.color} ${s.offset}%`).join(', ');
      shapeStyle.background = `radial-gradient(circle at center, ${stopsCss})`;
    } else {
      shapeStyle.background = `radial-gradient(circle at center, ${element.radialColor1}, ${element.radialColor2})`;
    }
  }

  // Stroke (rendue en calque superposé pour ne pas décaler ni rétrécir le cadrage de l'image)
  const strokeWidth = element.stroke?.enable && element.stroke.width > 0 ? element.stroke.width : 0;
  shapeStyle.border = 'none';

  // Shape geometry clip path / border radius
  const isQuad = element.shapeType === 'quadrilateral';
  const quadPoints = isQuad ? getEffectiveQuadPoints(element.quadPoints) : null;
  const isQuadImageFit = isQuad && element.quadImageFit !== false;
  const quadMatrix3d =
    isQuad && quadPoints && isQuadImageFit && element.fillType === 'image' && element.imageUrl
      ? computePerspectiveMatrix3d(element.width, element.height, quadPoints)
      : null;

  const isClippedShape = element.shapeType === 'star' || element.shapeType === 'hexagon' || isQuad;

  // Effects (Glow + Shadow)
  if (isClippedShape) {
    shapeStyle.boxShadow = 'none';
  } else {
    shapeStyle.boxShadow = getCombinedBoxShadow(element.glow, element.shadow);
  }

  if (element.shapeType === 'rectangle') {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = 'none';
  } else if (element.shapeType === 'rounded-rect') {
    shapeStyle.borderRadius = `${element.borderRadius ?? 16}px`;
    shapeStyle.clipPath = 'none';
  } else if (element.shapeType === 'circle') {
    shapeStyle.borderRadius = '9999px';
    shapeStyle.clipPath = 'none';
  } else if (element.shapeType === 'pill') {
    shapeStyle.borderRadius = '999px';
    shapeStyle.clipPath = 'none';
  } else if (isQuad && quadPoints) {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = quadPointsToClipPath(quadPoints);
  } else if (element.shapeType === 'star') {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
  } else if (element.shapeType === 'hexagon') {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  }

  const handleQuadVertexPointerDown = (
    corner: keyof QuadPoints,
    e: React.PointerEvent
  ) => {
    if (!quadPoints) return;
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initQuad: QuadPoints = {
      tl: { ...quadPoints.tl },
      tr: { ...quadPoints.tr },
      br: { ...quadPoints.br },
      bl: { ...quadPoints.bl }
    };
    const initPt = initQuad[corner];
    const rad = (-(element.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const w = Math.max(1, element.width);
    const h = Math.max(1, element.height);
    let hasMoved = false;

    const onMove = (moveEvent: PointerEvent) => {
      const screenDx = (moveEvent.clientX - startX) / currentZoom;
      const screenDy = (moveEvent.clientY - startY) / currentZoom;

      // Projection dans le repère local (prise en compte de la rotation de la forme)
      const localDx = screenDx * cos - screenDy * sin;
      const localDy = screenDx * sin + screenDy * cos;

      let nx = Math.max(0, Math.min(1, initPt.x + localDx / w));
      let ny = Math.max(0, Math.min(1, initPt.y + localDy / h));

      // Aimantation légère sur les bords 0% / 100% (sauf si Alt est maintenu)
      if (!moveEvent.altKey) {
        if (nx < 0.015) nx = 0;
        else if (nx > 0.985) nx = 1;
        if (ny < 0.015) ny = 0;
        else if (ny > 0.985) ny = 1;
      }

      nx = Math.round(nx * 10000) / 10000;
      ny = Math.round(ny * 10000) / 10000;

      const candidate: QuadPoints = {
        ...initQuad,
        [corner]: { x: nx, y: ny }
      };

      if (!isConvexQuad(candidate)) {
        return;
      }

      if (!hasMoved) {
        hasMoved = true;
        recordHistory();
      }

      updateElement(element.id, { quadPoints: candidate });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (element.fillType === 'image' && element.imageUrl && !isQuadImageFit) {
      e.stopPropagation();
      setEditingImageElementId(element.id);
      setActivePanel('shape');
    }
  };

  const displayImageUrl =
    (element.imageUrl ? assetManager.getDisplayUrl(element.imageUrl) : undefined) ||
    (element.imageUrl && loadedBundle?.assets ? resolveAsset(element.imageUrl, undefined, loadedBundle.assets) : undefined) ||
    element.imageUrl;

  return (
    <div
      ref={nodeRef}
      id={`el-${element.id}`}
      className="absolute touch-none"
      style={{
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation || 0}deg)`,
        filter: isClippedShape ? getCombinedDropShadowFilter(element.glow, element.shadow) : undefined
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`shape-render-content w-full h-full relative overflow-hidden ${
          editingImageElementId === element.id ? 'cursor-default' : 'cursor-move'
        }`}
        style={shapeStyle}
        data-element-type="shape"
        data-shape-id={element.id}
        data-shape-type={element.shapeType}
        data-glow-enable={element.glow?.enable ? 'true' : 'false'}
        data-glow-color={element.glow?.color || ''}
        data-glow-blur={element.glow?.blur ?? 0}
        data-glow-x={element.glow?.x ?? 0}
        data-glow-y={element.glow?.y ?? 0}
        data-shadow-enable={element.shadow?.enable ? 'true' : 'false'}
        data-shadow-color={element.shadow?.color || ''}
        data-shadow-blur={element.shadow?.blur ?? 0}
        data-shadow-x={element.shadow?.x ?? 0}
        data-shadow-y={element.shadow?.y ?? 0}
        data-border-radius={element.borderRadius ?? (element.shapeType === 'rounded-rect' ? 16 : 0)}
        data-width={element.width}
        data-height={element.height}
        data-fill-type={element.fillType}
        data-shape-w={element.width}
        data-shape-h={element.height}
        data-gradient-angle={element.angle ?? 0}
        data-gradient-stops={
          element.fillType === 'linear'
            ? JSON.stringify(
                element.gradientStops && element.gradientStops.length > 0
                  ? element.gradientStops
                  : [
                      { color: element.color1 || 'rgba(139, 92, 246, 0.9)', offset: 0 },
                      { color: element.color2 || 'rgba(236, 72, 153, 0.9)', offset: 100 }
                    ]
              )
            : undefined
        }
        data-radial-stops={
          element.fillType === 'radial'
            ? JSON.stringify(
                element.radialStops && element.radialStops.length > 0
                  ? element.radialStops
                  : [
                      { color: element.radialColor1 || 'rgba(251, 191, 36, 1)', offset: 0 },
                      { color: element.radialColor2 || 'rgba(185, 28, 28, 0.9)', offset: 100 }
                    ]
              )
            : undefined
        }
      >
        {element.fillType === 'image' && element.imageUrl && (
          isQuad && quadMatrix3d ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              <img
                src={displayImageUrl}
                alt=""
                draggable={false}
                crossOrigin="anonymous"
                className="absolute top-0 left-0 select-none pointer-events-none"
                style={{
                  width: `${element.width}px`,
                  height: `${element.height}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'fill',
                  transform: quadMatrix3d,
                  transformOrigin: '0 0'
                }}
              />
            </div>
          ) : (
            <InPlaceImageCropper
              containerWidth={element.width}
              containerHeight={element.height}
              imageUrl={displayImageUrl}
              imageFit={element.imageFit || 'cover'}
              imageScale={element.imageScale || 1.0}
              imageOffsetX={element.imageOffsetX || 0}
              imageOffsetY={element.imageOffsetY || 0}
              imageNaturalWidth={element.imageNaturalWidth}
              imageNaturalHeight={element.imageNaturalHeight}
              isEditing={editingImageElementId === element.id}
              onUpdate={updates => updateElement(element.id, updates)}
              onClose={() => setEditingImageElementId(null)}
              canvasZoom={currentZoom}
              rotation={element.rotation || 0}
              borderRadius={shapeStyle.borderRadius}
              clipPath={shapeStyle.clipPath}
              title="Recadrer l'image"
            />
          )
        )}

        {/* Calque de bordure (Stroke) superposé à l'intérieur du périmètre de la forme */}
        {strokeWidth > 0 && (
          isQuad && quadPoints ? (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${element.width} ${element.height}`}
              preserveAspectRatio="none"
              style={{ zIndex: 20, overflow: 'visible' }}
            >
              <polygon
                points={quadPointsToSvgPoints(quadPoints, element.width, element.height)}
                fill="none"
                stroke={element.stroke!.color}
                strokeWidth={strokeWidth * 2}
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                border: `${strokeWidth}px solid ${element.stroke!.color}`,
                borderRadius: shapeStyle.borderRadius,
                boxSizing: 'border-box',
                zIndex: 20
              }}
            />
          )
        )}
      </div>

      {/* Feedback visuel lors du survol par un fichier glissé */}
      {isDropTarget && (
        <div
          className="absolute -inset-2 rounded-[inherit] border-4 border-dashed border-m3-sys-primary bg-m3-sys-primary/25 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-3 text-center pointer-events-none shadow-2xl animate-pulse"
          style={{
            borderRadius: shapeStyle.borderRadius,
            clipPath: shapeStyle.clipPath
          }}
        >
          <span className="material-symbols-rounded text-4xl text-white mb-1 drop-shadow">
            image
          </span>
          <span className="text-xs font-bold text-white bg-black/75 px-3 py-1 rounded-full shadow-lg">
            Déposer la texture
          </span>
        </div>
      )}

      {isSelected && !isMultiSelected && editingImageElementId !== element.id && (
        <SelectionHandles element={element} elementRef={nodeRef} />
      )}

      {/* Poignées interactives des 4 sommets du quadrilatère */}
      {isSelected && !isMultiSelected && isQuad && quadPoints && editingImageElementId !== element.id && (() => {
        const s = 1 / currentZoom;
        const vertexLabels: Record<keyof QuadPoints, string> = {
          tl: 'Angle haut-gauche (glisser pour repositionner)',
          tr: 'Angle haut-droit (glisser pour repositionner)',
          br: 'Angle bas-droit (glisser pour repositionner)',
          bl: 'Angle bas-gauche (glisser pour repositionner)'
        };
        const corners: (keyof QuadPoints)[] = ['tl', 'tr', 'br', 'bl'];
        return (
          <>
            <svg
              className="selection-ui-handle absolute inset-0 w-full h-full pointer-events-none z-30"
              viewBox={`0 0 ${element.width} ${element.height}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              <polygon
                points={quadPointsToSvgPoints(quadPoints, element.width, element.height)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={1.75 * s}
                strokeDasharray={`${5 * s} ${4 * s}`}
              />
            </svg>
            {corners.map(corner => {
              const pt = quadPoints[corner];
              return (
                <div
                  key={corner}
                  title={vertexLabels[corner]}
                  onPointerDown={e => handleQuadVertexPointerDown(corner, e)}
                  className="selection-ui-handle handle-quad-vertex absolute z-40 bg-amber-400 hover:bg-amber-300 border-2 border-white shadow-md cursor-move transition-colors"
                  style={{
                    left: `${pt.x * 100}%`,
                    top: `${pt.y * 100}%`,
                    width: `${13 * s}px`,
                    height: `${13 * s}px`,
                    borderWidth: `${2 * s}px`,
                    borderRadius: `${3 * s}px`,
                    transform: 'translate(-50%, -50%) rotate(45deg)'
                  }}
                />
              );
            })}
          </>
        );
      })()}
      {isSelected && isMultiSelected && (() => {
        const s = 1 / currentZoom;
        const offset = 4 * s;
        return (
          <>
            <div
              className="selection-ui-handle absolute border-dashed border-m3-sys-primary rounded-lg pointer-events-none z-30"
              style={{
                inset: `${-offset}px`,
                borderWidth: `${2 * s}px`,
                borderRadius: `${8 * s}px`
              }}
            />
            {selectionIndex !== undefined && (
              <div
                className="absolute z-40 bg-m3-sys-primary text-m3-sys-onPrimary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm pointer-events-none"
                style={{
                  top: `${-offset}px`,
                  left: `${-offset}px`,
                  transform: `translate(-50%, -50%) scale(${s})`
                }}
              >
                {selectionIndex}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
