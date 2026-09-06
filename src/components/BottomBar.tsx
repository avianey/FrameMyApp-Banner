import React from 'react';
import { useEditor } from '../context/EditorContext';

export const BottomBar: React.FC = () => {
  const { state, setActivePanel, addText, addShape } = useEditor();

  const handleToggleExport = () => {
    setActivePanel(state.activePanel === 'export' ? null : 'export');
  };

  const isBgActive = state.activePanel === 'bg';
  const isExportActive = state.activePanel === 'export';

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-3 z-30 p-2 bg-m3-sys-surfaceContainerHigh/95 backdrop-blur-md rounded-full shadow-m3-3 border border-m3-sys-outlineVariant/50 select-none transition-all">
      {/* Bouton Fond */}
      <button
        onClick={() => setActivePanel(isBgActive ? null : 'bg')}
        title="Paramètres d'arrière-plan"
        className={`flex items-center space-x-2 px-4 py-2.5 rounded-full border transition-all cursor-pointer text-sm font-medium active:scale-95 ${
          isBgActive
            ? 'bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer border-m3-sys-primary shadow-sm'
            : 'border-transparent hover:bg-m3-sys-surfaceContainerHighest hover:border-m3-sys-outlineVariant/40 text-m3-sys-onSurface'
        }`}
      >
        <span className="material-symbols-rounded text-lg leading-none flex items-center justify-center text-m3-sys-primary">
          wallpaper
        </span>
        <span className="hidden sm:inline">Fond</span>
      </button>

      {/* Bouton + Texte */}
      <button
        onClick={addText}
        title="Ajouter un bloc de texte"
        className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer border border-m3-sys-primary/30 hover:brightness-110 hover:shadow-md active:scale-95 transition-all text-sm font-semibold cursor-pointer"
      >
        <span className="material-symbols-rounded text-lg leading-none flex items-center justify-center">
          title
        </span>
        <span>+ Texte</span>
      </button>

      {/* Bouton + Forme */}
      <button
        onClick={() => addShape('rounded-rect')}
        title="Ajouter une forme géométrique"
        className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-m3-sys-secondaryContainer text-m3-sys-onSecondaryContainer border border-m3-sys-secondary/30 hover:brightness-110 hover:shadow-md active:scale-95 transition-all text-sm font-semibold cursor-pointer"
      >
        <span className="material-symbols-rounded text-lg leading-none flex items-center justify-center">
          category
        </span>
        <span>+ Forme</span>
      </button>

      <div className="w-px h-6 bg-m3-sys-outlineVariant/60 mx-1" />

      {/* Bouton Export */}
      <button
        onClick={handleToggleExport}
        title="Ouvrir les options d'export"
        className={`flex items-center space-x-2 px-5 py-2.5 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary hover:brightness-110 active:scale-95 transition-all text-sm font-semibold cursor-pointer shadow-m3-2 ${
          isExportActive ? 'ring-2 ring-offset-2 ring-m3-sys-primary ring-offset-m3-sys-surface' : ''
        }`}
      >
        <span className="material-symbols-rounded text-lg leading-none flex items-center justify-center">
          crop
        </span>
        <span className="hidden sm:inline">Export</span>
      </button>
    </div>
  );
};
