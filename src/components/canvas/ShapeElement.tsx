import React, { useRef } from 'react';
import { ShapeElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';
import { InPlaceImageCropper } from './InPlaceImageCropper';

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
  const { selectElement, updateElement, state, recordHistory, editingImageElementId, setEditingImageElementId, setActivePanel } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);
  const currentZoom = state.zoom || 1;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Si on est en mode édition de l'image de cette forme, laisser le cropper gérer l'image
    if (editingImageElementId === element.id) {
      return;
    }

    // If click on resize or rotate handle, let those handle it
    const target = e.target as HTMLElement;
    if (target.closest('.handle-resize') || target.closest('.handle-rotate-anchor')) {
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

    recordHistory();

    const startX = e.clientX;
    const startY = e.clientY;

    // Déterminer les éléments à déplacer ensemble
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

      initPositions.forEach(pos => {
        updateElement(pos.id, {
          x: Math.round(pos.x + dx),
          y: Math.round(pos.y + dy)
        });
      });
    };

    const onUp = () => {
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

  // Stroke
  if (element.stroke?.enable && element.stroke.width > 0) {
    shapeStyle.border = `${element.stroke.width}px solid ${element.stroke.color}`;
  } else {
    shapeStyle.border = 'none';
  }

  // Shadow
  if (element.shadow?.enable) {
    shapeStyle.boxShadow = `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`;
  } else {
    shapeStyle.boxShadow = 'none';
  }

  // Shape geometry clip path / border radius
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
  } else if (element.shapeType === 'star') {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
  } else if (element.shapeType === 'hexagon') {
    shapeStyle.borderRadius = '0px';
    shapeStyle.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (element.fillType === 'image' && element.imageUrl) {
      e.stopPropagation();
      setEditingImageElementId(element.id);
      setActivePanel('shape');
    }
  };

  return (
    <div
      ref={nodeRef}
      id={`el-${element.id}`}
      className="absolute touch-none"
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation || 0}deg)`
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`shape-render-content w-full h-full relative overflow-hidden ${
          editingImageElementId === element.id ? 'cursor-default' : 'cursor-move'
        }`}
        style={shapeStyle}
      >
        {element.fillType === 'image' && element.imageUrl && (
          <InPlaceImageCropper
            containerWidth={element.width}
            containerHeight={element.height}
            imageUrl={element.imageUrl}
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
            borderRadius={shapeStyle.borderRadius}
            clipPath={shapeStyle.clipPath}
            title="Recadrer l'image"
          />
        )}
      </div>

      {isSelected && !isMultiSelected && editingImageElementId !== element.id && (
        <SelectionHandles element={element} elementRef={nodeRef} />
      )}
      {isSelected && isMultiSelected && (
        <>
          <div className="selection-ui-handle absolute -inset-1 border-2 border-dashed border-m3-sys-primary rounded-lg pointer-events-none z-30" />
          {selectionIndex !== undefined && (
            <div className="absolute -top-3 -left-3 z-40 bg-m3-sys-primary text-m3-sys-onPrimary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm pointer-events-none">
              {selectionIndex}
            </div>
          )}
        </>
      )}
    </div>
  );
};
