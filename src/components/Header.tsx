import React from 'react';
import { useEditor } from '../context/EditorContext';

export const Header: React.FC = () => {
  const { setActivePanel, resetZoom } = useEditor();

  return (
    <header className="h-16 bg-m3-sys-surfaceContainer flex items-center justify-between px-4 sm:px-6 shadow-m3-1 z-30 flex-shrink-0 border-b border-m3-sys-outlineVariant/30 select-none">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-m3-sys-primaryContainer flex items-center justify-center text-m3-sys-onPrimaryContainer">
          <span className="material-symbols-rounded">palette</span>
        </div>
        <div>
          <h1 className="text-lg font-medium leading-none tracking-tight">Studio Flux M3</h1>
          <p className="text-xs text-m3-sys-onSurfaceVariant mt-1">
            Conception vectorielle, alpha complet & export précis
          </p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setActivePanel('bg')}
          title="Modifier le fond"
          className="p-2.5 rounded-full hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant transition-colors"
        >
          <span className="material-symbols-rounded">wallpaper</span>
        </button>
        <button
          onClick={resetZoom}
          title="Recentrer la vue"
          className="p-2.5 rounded-full hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant transition-colors"
        >
          <span className="material-symbols-rounded">filter_center_focus</span>
        </button>
      </div>
    </header>
  );
};
