import React, { useRef, useEffect, useState } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const currentZoom = state.zoom || 1;

  // Exit editing mode when deselected or multi-selected
  useEffect(() => {
    if (!isSelected || isMultiSelected) {
      setIsEditing(false);
    }
  }, [isSelected, isMultiSelected]);

  // Synchronize innerText when element.text updates externally (e.g. from drawer)
  const setRef = (node: HTMLDivElement | null) => {
    textInnerRef.current = node;
    if (node && document.activeElement !== node) {
      if (node.innerText !== element.text) {
        node.innerText = element.text;
      }
    }
  };

  useEffect(() => {
    if (textInnerRef.current && document.activeElement !== textInnerRef.current) {
      if (textInnerRef.current.innerText !== element.text) {
        textInnerRef.current.innerText = element.text;
      }
    }
  }, [element.text]);

  const combinedShadow = getCombinedTextShadow(element.glow, element.shadow);

  const minHeightPx = (element.minLines || 1) * element.fontSize * (element.lineHeight || 1.2);
  const effectiveHeight = Math.max(element.height || 0, minHeightPx);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMultiSelected) return;
    recordHistory();
    selectElement(element.id, false);
    setIsEditing(true);
    requestAnimationFrame(() => {
      if (textInnerRef.current) {
        textInnerRef.current.focus();
      }
    });
  };

  const handleInput = () => {
    if (textInnerRef.current) {
      updateElement(element.id, { text: textInnerRef.current.innerText });
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    if (!plainText) return;
    if (typeof document.execCommand === 'function') {
      document.execCommand('insertText', false, plainText);
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(plainText));
        range.collapse(false);
      }
      handleInput();
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.handle-resize') || target.closest('.handle-rotate-anchor') || target.closest('.drag-pill-handle')) {
      return;
    }

    // In editing mode, let the user move the text cursor / select characters naturally
    if (isEditing) {
      e.stopPropagation();
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
    }

    e.preventDefault();
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

  return (
    <div
      ref={nodeRef}
      id={`el-${element.id}`}
      className="absolute touch-none"
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${effectiveHeight}px`,
        transform: `rotate(${element.rotation || 0}deg)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent:
          element.verticalAlign === 'bottom'
            ? 'flex-end'
            : element.verticalAlign === 'middle'
            ? 'center'
            : 'flex-start',
        boxSizing: 'border-box'
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        ref={setRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        className={`editable-text-content w-full outline-none break-words rounded ${
          isEditing ? 'cursor-text ring-2 ring-m3-sys-primary select-text' : 'cursor-move select-none'
        }`}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
          fontFamily: `'${element.fontFamily}', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif`,
          fontWeight: element.fontWeight || 400,
          fontSize: `${element.fontSize}px`,
          color: element.color,
          letterSpacing: element.letterSpacing ? `${element.letterSpacing}px` : 'normal',
          lineHeight: element.lineHeight || 1.3,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          textShadow: combinedShadow,
          textAlign: element.textAlign || 'left'
        }}
        onInput={handleInput}
        onPaste={handlePaste}
        onBlur={() => {
          if (textInnerRef.current) {
            updateElement(element.id, { text: textInnerRef.current.innerText });
          }
          setIsEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            textInnerRef.current?.blur();
            setIsEditing(false);
          }
        }}
      />

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
