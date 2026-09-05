import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Artboard } from './Artboard';

export const CanvasViewport: React.FC = () => {
  const { viewportRef, state, updateElement, setBackground, setActivePanel, showSnackbar } =
    useEditor();
  const [isDragOver, setIsDragOver] = useState(false);

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

        setBackground({ type: 'image', imageUrl: result });
        setActivePanel('bg');
        showSnackbar('Image de fond mise à jour', 'image');
      };
      reader.readAsDataURL(files[0]);
    }
  };

  return (
    <main
      ref={viewportRef}
      id="canvas-viewport"
      className={`flex-1 h-full overflow-auto canvas-grid relative flex items-center justify-center p-4 sm:p-8 transition-all ${
        isDragOver ? 'ring-4 ring-inset ring-m3-sys-primary' : ''
      }`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Artboard />
    </main>
  );
};
