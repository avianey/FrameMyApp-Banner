import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { TextElementModel, ShapeElementModel, DeviceElementModel } from '../../types';
import { BackgroundControls } from './BackgroundControls';
import { TextControls } from './TextControls';
import { ShapeControls } from './ShapeControls';
import { DeviceControls } from './DeviceControls';
import { ExportControls } from './ExportControls';
import { AlignmentControls } from './AlignmentControls';

export const SideDrawer: React.FC = () => {
  const { state, setActivePanel, updateElement, deleteElement, recordHistory } = useEditor();
  const { activePanel, selectedElementId, elements } = state;

  const selectedElement = elements.find(e => e.id === selectedElementId);
  const isElementPanel =
    Boolean(selectedElement) &&
    (activePanel === 'text' || activePanel === 'shape' || activePanel === 'device');

  let drawerTitle = 'Paramètres';
  let drawerIcon = 'tune';

  if (activePanel === 'bg') {
    drawerTitle = 'Arrière-plan';
    drawerIcon = 'wallpaper';
  } else if (activePanel === 'text') {
    drawerTitle = 'Propriétés du Texte';
    drawerIcon = 'text_fields';
  } else if (activePanel === 'shape') {
    drawerTitle = 'Propriétés de la Forme';
    drawerIcon = 'shapes';
  } else if (activePanel === 'device') {
    drawerTitle = 'Propriétés de l’Appareil';
    drawerIcon = 'smartphone';
  } else if (activePanel === 'export') {
    drawerTitle = 'Zone d’Exportation';
    drawerIcon = 'aspect_ratio';
  } else if (activePanel === 'align') {
    drawerTitle = 'Alignement & Distribution';
    drawerIcon = 'format_align_center';
  }

  const isOpen = activePanel !== null;

  return (
    <aside
      id="side-drawer"
      className={`w-80 md:w-96 bg-m3-sys-surfaceContainerLow border-l border-m3-sys-outlineVariant/40 h-full flex flex-col z-40 transition-transform duration-300 ease-in-out absolute right-0 top-0 shadow-m3-3 select-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Titre du volet avec actions rapides */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-m3-sys-outlineVariant/30 flex-shrink-0 bg-m3-sys-surfaceContainer">
        <div className="flex items-center space-x-2.5 truncate">
          <span id="drawer-icon" className="material-symbols-rounded text-m3-sys-primary">
            {drawerIcon}
          </span>
          <h2 id="drawer-title" className="font-medium text-base text-m3-sys-onSurface truncate">
            {drawerTitle}
          </h2>
        </div>
        <div className="flex items-center space-x-1">
          {isElementPanel && selectedElement && (
            <button
              onClick={() => deleteElement(selectedElement.id)}
              title="Supprimer cet élément (Suppr)"
              aria-label="Supprimer cet élément"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-m3-sys-error/15 text-m3-sys-onSurfaceVariant hover:text-m3-sys-error active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-rounded text-lg leading-none">delete</span>
            </button>
          )}
          <button
            onClick={() => setActivePanel(null)}
            title="Fermer le panneau"
            aria-label="Fermer le panneau"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
          >
            <span className="material-symbols-rounded text-xl leading-none">close</span>
          </button>
        </div>
      </div>

      {/* Contenu dynamique du volet */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Barre géométrique compacte X / Y / L / H / Rotation 0° */}
        {isElementPanel && selectedElement && (
          <div className="bg-m3-sys-surfaceContainer rounded-2xl p-3 border border-m3-sys-outlineVariant/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1">
                <span className="material-symbols-rounded text-xs text-m3-sys-primary">straighten</span>
                <span>Géométrie & Position</span>
              </span>
              {(selectedElement.rotation || 0) !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    recordHistory();
                    updateElement(selectedElement.id, { rotation: 0 });
                  }}
                  title="Réinitialiser la rotation à 0°"
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-m3-sys-primary/15 text-m3-sys-primary hover:bg-m3-sys-primary/25 transition-all cursor-pointer"
                >
                  {selectedElement.rotation}° → 0°
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <label className="flex items-center bg-m3-sys-surfaceContainerHighest rounded-lg px-2 py-1 border border-m3-sys-outlineVariant/40 focus-within:border-m3-sys-primary">
                <span className="text-[10px] font-mono text-m3-sys-onSurfaceVariant mr-1">X</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.x)}
                  onFocus={recordHistory}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) updateElement(selectedElement.id, { x: v });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-m3-sys-onSurface focus:outline-none"
                />
              </label>
              <label className="flex items-center bg-m3-sys-surfaceContainerHighest rounded-lg px-2 py-1 border border-m3-sys-outlineVariant/40 focus-within:border-m3-sys-primary">
                <span className="text-[10px] font-mono text-m3-sys-onSurfaceVariant mr-1">Y</span>
                <input
                  type="number"
                  value={Math.round(selectedElement.y)}
                  onFocus={recordHistory}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) updateElement(selectedElement.id, { y: v });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-m3-sys-onSurface focus:outline-none"
                />
              </label>
              <label className="flex items-center bg-m3-sys-surfaceContainerHighest rounded-lg px-2 py-1 border border-m3-sys-outlineVariant/40 focus-within:border-m3-sys-primary">
                <span className="text-[10px] font-mono text-m3-sys-onSurfaceVariant mr-1">L</span>
                <input
                  type="number"
                  min={20}
                  value={Math.round(selectedElement.width)}
                  onFocus={recordHistory}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 20) updateElement(selectedElement.id, { width: v });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-m3-sys-onSurface focus:outline-none"
                />
              </label>
              <label className="flex items-center bg-m3-sys-surfaceContainerHighest rounded-lg px-2 py-1 border border-m3-sys-outlineVariant/40 focus-within:border-m3-sys-primary">
                <span className="text-[10px] font-mono text-m3-sys-onSurfaceVariant mr-1">H</span>
                <input
                  type="number"
                  min={20}
                  value={Math.round(selectedElement.height || 0)}
                  onFocus={recordHistory}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 20) updateElement(selectedElement.id, { height: v });
                  }}
                  className="w-full bg-transparent text-xs font-mono text-m3-sys-onSurface focus:outline-none"
                />
              </label>
            </div>
          </div>
        )}

        {activePanel === 'bg' && <BackgroundControls />}
        {activePanel === 'text' && selectedElement?.type === 'text' && (
          <TextControls element={selectedElement as TextElementModel} />
        )}
        {activePanel === 'shape' && selectedElement?.type === 'shape' && (
          <ShapeControls element={selectedElement as ShapeElementModel} />
        )}
        {activePanel === 'device' && selectedElement?.type === 'device' && (
          <DeviceControls element={selectedElement as DeviceElementModel} />
        )}
        {activePanel === 'export' && <ExportControls />}
        {activePanel === 'align' && <AlignmentControls />}
      </div>
    </aside>
  );
};
