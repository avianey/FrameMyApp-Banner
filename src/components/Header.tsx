import React from 'react';
import { useEditor } from '../context/EditorContext';

export const Header: React.FC = () => {
  const {
    state,
    setActivePanel,
    resetZoom,
    zoomIn,
    zoomOut,
    toggleTheme,
    undo,
    redo,
    setIsConfirmModalOpen,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    loadedBundle,
    setIsBatchExportModalOpen
  } = useEditor();
  const { theme, zoom, canUndo, canRedo } = state;

  return (
    <header className="h-16 bg-m3-sys-surfaceContainer flex items-center justify-between px-4 sm:px-6 shadow-m3-1 z-30 flex-shrink-0 border-b border-m3-sys-outlineVariant/30 select-none transition-colors">
      {/* Marque et titre */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-m3-sys-primaryContainer flex items-center justify-center text-m3-sys-onPrimaryContainer shadow-sm flex-shrink-0">
          <span className="material-symbols-rounded text-xl leading-none">palette</span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold leading-none tracking-tight text-m3-sys-onSurface">
              Banner Studio
            </h1>
            {loadedBundle && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer font-bold hidden sm:inline-block">
                {loadedBundle.name}
              </span>
            )}
          </div>
          <p className="text-xs text-m3-sys-onSurfaceVariant mt-1 hidden sm:block">
            Presets maîtres, déclinaisons & batch export
          </p>
        </div>
      </div>

      {/* Toolbar actions rapides */}
      <div className="flex items-center space-x-2">
        {/* Bouton Batch Export direct si bundle actif */}
        {loadedBundle && (
          <button
            onClick={() => setIsBatchExportModalOpen(true)}
            title="Lancer l'export par lot de toutes les déclinaisons"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-m3-sys-primary to-indigo-600 text-white text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer mr-1"
          >
            <span className="material-symbols-rounded text-base leading-none">bolt</span>
            <span className="hidden md:inline">Batch Export</span>
          </button>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/40 rounded-full p-0.5 shadow-sm">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Annuler (Ctrl+Z)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="material-symbols-rounded text-lg leading-none">undo</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Rétablir (Ctrl+Y)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span className="material-symbols-rounded text-lg leading-none">redo</span>
          </button>
        </div>

        {/* Tout effacer / Nettoyage complet */}
        <button
          onClick={() => setIsConfirmModalOpen(true)}
          title="Réinitialiser tout le projet"
          className="w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-error/15 hover:border-m3-sys-error text-m3-sys-onSurface hover:text-m3-sys-error active:scale-95 shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-xl leading-none">delete_sweep</span>
        </button>

        {/* Séparateur */}
        <div className="w-px h-6 bg-m3-sys-outlineVariant/50 mx-0.5" />

        {/* Zoom controls */}
        <div className="flex items-center bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/40 rounded-full p-0.5 shadow-sm">
          <button
            onClick={zoomOut}
            title="Dézoomer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-lg leading-none">zoom_out</span>
          </button>
          <span
            onClick={resetZoom}
            title="Cliquer pour réinitialiser le zoom (100%)"
            className="px-2 font-mono text-xs font-semibold text-m3-sys-onSurface cursor-pointer hover:text-m3-sys-primary select-none"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            title="Zoomer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-lg leading-none">zoom_in</span>
          </button>
        </div>

        {/* Recentrer la vue */}
        <button
          onClick={resetZoom}
          title="Recentrer la vue (100%)"
          className="w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-surfaceContainerHighest hover:border-m3-sys-primary text-m3-sys-onSurface active:scale-95 shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-xl leading-none">filter_center_focus</span>
        </button>

        {/* Volet Templates & Bundles */}
        <button
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          title={isLeftSidebarOpen ? 'Fermer le volet Templates & Bundles' : 'Ouvrir les Templates & Bundles'}
          className={`w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-surfaceContainerHighest hover:border-m3-sys-primary text-m3-sys-onSurface active:scale-95 shadow-sm transition-all cursor-pointer ${
            isLeftSidebarOpen ? 'ring-2 ring-m3-sys-primary bg-m3-sys-primaryContainer/20 text-m3-sys-primary' : ''
          }`}
        >
          <span className="material-symbols-rounded text-xl leading-none">auto_stories</span>
        </button>

        {/* Modifier le fond */}
        <button
          onClick={() => setActivePanel('bg')}
          title="Modifier le fond"
          className={`w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-surfaceContainerHighest hover:border-m3-sys-primary text-m3-sys-onSurface active:scale-95 shadow-sm transition-all cursor-pointer ${
            state.activePanel === 'bg' ? 'ring-2 ring-m3-sys-primary bg-m3-sys-primaryContainer/20 text-m3-sys-primary' : ''
          }`}
        >
          <span className="material-symbols-rounded text-xl leading-none">wallpaper</span>
        </button>

        {/* Séparateur */}
        <div className="w-px h-6 bg-m3-sys-outlineVariant/50 mx-0.5" />

        {/* Toggle Dark / Light mode */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-surfaceContainerHighest hover:border-m3-sys-primary text-m3-sys-onSurface active:scale-95 shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-rounded text-xl leading-none">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  );
};
