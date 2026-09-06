import React, { useRef, useEffect } from 'react';
import { TextElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';

interface TextElementProps {
  element: TextElementModel;
  isSelected: boolean;
}

export const TextElement: React.FC<TextElementProps> = ({ element, isSelected }) => {
  const { selectElement, updateElement, recordHistory } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);
  const textInnerRef = useRef<HTMLDivElement>(null);

  // Synchronize innerText when element.text updates externally (e.g. from drawer)
  useEffect(() => {
    if (textInnerRef.current && document.activeElement !== textInnerRef.current) {
      if (textInnerRef.current.innerText !== element.text) {
        textInnerRef.current.innerText = element.text;
      }
    }
  }, [element.text]);

  const glowCss = element.glow?.enable
    ? `${element.glow.x}px ${element.glow.y}px ${element.glow.blur}px ${element.glow.color}`
    : '';
  const shadowCss = element.shadow?.enable
    ? `${element.shadow.x}px ${element.shadow.y}px ${element.shadow.blur}px ${element.shadow.color}`
    : '';
  const combinedShadow = [glowCss, shadowCss].filter(Boolean).join(', ');

  const minHeightPx = (element.minLines || 1) * element.fontSize * (element.lineHeight || 1.2);

  const handleFocus = () => {
    recordHistory();
    selectElement(element.id);
  };

  const handleInput = () => {
    if (textInnerRef.current) {
      updateElement(element.id, { text: textInnerRef.current.innerText });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    selectElement(element.id);
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
          fontFamily: `'${element.fontFamily}', sans-serif`,
          fontSize: `${element.fontSize}px`,
          color: element.color,
          letterSpacing: `${element.letterSpacing}px`,
          lineHeight: element.lineHeight,
          textShadow: combinedShadow,
          minHeight: `${minHeightPx}px`
        }}
        onInput={handleInput}
        onFocus={handleFocus}
      >
        {element.text}
      </div>

      {isSelected && <SelectionHandles element={element} elementRef={nodeRef} />}
    </div>
  );
};
