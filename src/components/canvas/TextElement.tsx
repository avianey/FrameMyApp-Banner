import React, { useRef, useEffect } from 'react';
import { TextElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';
import { getCombinedTextShadow } from '../../utils/effectsHelper';

interface TextElementProps {
  element: TextElementModel;
  isSelected: boolean;
  selectionIndex?: number;
  isMultiSelected?: boolean;
}

export const TextElement: React.FC<TextElementProps> = ({
  element,
  isSelected,
  selectionIndex,
  isMultiSelected
}) => {
  const { selectElement, updateElement, state, recordHistory } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);
  const textInnerRef = useRef<HTMLDivElement>(null);
  const currentZoom = state.zoom || 1;

  // Synchronize innerText when element.text updates externally (e.g. from drawer)
  useEffect(() => {
    if (textInnerRef.current && document.activeElement !== textInnerRef.current) {
      if (textInnerRef.current.innerText !== element.text) {
        textInnerRef.current.innerText = element.text;
      }
    }
  }, [element.text]);

  const combinedShadow = getCombinedTextShadow(element.glow, element.shadow);

  const minHeightPx = (element.minLines || 1) * element.fontSize * (element.lineHeight || 1.2);

  const handleFocus = () => {
    if (isMultiSelected) return;
    recordHistory();
    selectElement(element.id);
  };

  const handleInput = () => {
    if (textInnerRef.current) {
      updateElement(element.id, { text: textInnerRef.current.innerText });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.handle-resize') || target.closest('.handle-rotate-anchor') || target.closest('.drag-pill-handle')) {
      return;
    }

    e.stopPropagation();
    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl) {
      e.preventDefault();
      selectElement(element.id, true);
      return;
    }

    if (!isSelected) {
      selectElement(element.id, false);
      return;
    }

    // Si sélection multiple, permettre de glisser-déplacer toute la sélection
    if (isMultiSelected) {
      e.preventDefault();
      recordHistory();
      const startX = e.clientX;
      const startY = e.clientY;

      const idsToMove = state.selectedElementIds;
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
    >
      <div
        ref={textInnerRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="editable-text-content w-full h-full p-2 outline-none break-words cursor-text rounded focus:ring-2 focus:ring-m3-sys-primary"
        style={{
          fontFamily: `'${element.fontFamily}', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif`,
          fontWeight: element.fontWeight || 400,
          fontSize: `${element.fontSize}px`,
          color: element.color,
          letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 'normal',
          lineHeight: element.lineHeight || 1.3,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          textShadow: combinedShadow,
          minHeight: `${minHeightPx}px`
        }}
        onInput={handleInput}
        onFocus={handleFocus}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            textInnerRef.current?.blur();
          }
        }}
      >
        {element.text}
      </div>

      {isSelected && !isMultiSelected && (
        <SelectionHandles element={element} elementRef={nodeRef} />
      )}
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
