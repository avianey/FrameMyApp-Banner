import React from 'react';
import { useEditor } from '../context/EditorContext';

export const BottomBar: React.FC = () => {
  const { state, setActivePanel, addText, addShape } = useEditor();

  const handleToggleExport = () => {
    setActivePanel(state.activePanel === 'export' ? null : 'export');
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-3 z-30 p-1.5 bg-m3-sys-surfaceContainerHigh/90 backdrop-blur-md rounded-full shadow-m3-3 border border-m3-sys-outlineVariant/40 select-none">
      <button
        onClick={() => setActivePanel('bg')}
        className={`flex items-center space-x-2 px-4 py-3 rounded-full hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface active:scale-95 transition-all text-sm font-medium ${
          state.activePanel === 'bg' ? 'bg-m3-sys-surfaceContainerHighest' : ''
        }`}
      >
        <span className="material-symbols-rounded text-m3-sys-primary">wallpaper</span>
        <span className="hidden sm:inline">Fond</span>
      </button>

      <button
        onClick={addText}
        className="flex items-center space-x-2 px-4 py-3 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer hover:brightness-105 active:scale-95 transition-all shadow-sm text-sm font-medium"
      >
        <span className="material-symbols-rounded">title</span>
        <span>+ Texte</span>
      </button>

      <button
        onClick={() => addShape('rounded-rect')}
        className="flex items-center space-x-2 px-4 py-3 rounded-full bg-m3-sys-secondaryContainer text-m3-sys-onSecondaryContainer hover:brightness-105 active:scale-95 transition-all shadow-sm text-sm font-medium"
      >
        <span className="material-symbols-rounded">category</span>
        <span>+ Forme</span>
      </button>

      <div className="w-px h-6 bg-m3-sys-outlineVariant/60 mx-1" />

      <button
        onClick={handleToggleExport}
        className={`flex items-center space-x-2 px-4 py-3 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary hover:opacity-90 active:scale-95 transition-all shadow-m3-2 text-sm font-medium ${
          state.activePanel === 'export' ? 'ring-2 ring-white' : ''
        }`}
      >
        <span className="material-symbols-rounded">crop</span>
        <span className="hidden sm:inline">Export</span>
      </button>
    </div>
  );
};
