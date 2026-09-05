import React, { useRef } from 'react';
import { ShapeElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';

interface ShapeElementProps {
  element: ShapeElementModel;
  isSelected: boolean;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({ element, isSelected }) => {
  const { selectElement, updateElement } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // If click on resize or rotate handle, let those handle it
    const target = e.target as HTMLElement;
    if (target.closest('.handle-resize') || target.closest('.handle-rotate-anchor')) {
      return;
    }

    e.stopPropagation();
    selectElement(element.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initX = element.x;
    const initY = element.y;

    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      updateElement(element.id, {
        x: Math.round(initX + dx),
        y: Math.round(initY + dy)
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
    shapeStyle.background = `linear-gradient(${element.angle}deg, ${element.color1}, ${element.color2})`;
  } else if (element.fillType === 'radial') {
    shapeStyle.background = `radial-gradient(circle at center, ${element.radialColor1}, ${element.radialColor2})`;
  } else if (element.fillType === 'image' && element.imageUrl) {
    shapeStyle.backgroundImage = `url('${element.imageUrl}')`;
    shapeStyle.backgroundSize = 'cover';
    shapeStyle.backgroundPosition = 'center';
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
    >
      <div className="shape-render-content w-full h-full cursor-move" style={shapeStyle} />
      {isSelected && <SelectionHandles element={element} elementRef={nodeRef} />}
    </div>
  );
};
