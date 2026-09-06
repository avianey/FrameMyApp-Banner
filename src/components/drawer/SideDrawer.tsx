import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { TextElementModel, ShapeElementModel } from '../../types';
import { BackgroundControls } from './BackgroundControls';
import { TextControls } from './TextControls';
import { ShapeControls } from './ShapeControls';
import { ExportControls } from './ExportControls';

export const SideDrawer: React.FC = () => {
  const { state, setActivePanel } = useEditor();
  const { activePanel, selectedElementId, elements } = state;

  const selectedElement = elements.find(e => e.id === selectedElementId);

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
  } else if (activePanel === 'export') {
    drawerTitle = 'Zone d’Exportation';
    drawerIcon = 'crop';
  }

  const isOpen = activePanel !== null;

  return (
    <aside
      id="side-drawer"
      className={`w-80 md:w-96 bg-m3-sys-surfaceContainerLow border-l border-m3-sys-outlineVariant/40 h-full flex flex-col z-40 transition-transform duration-300 ease-in-out absolute right-0 top-0 shadow-m3-3 select-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Titre du volet */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-m3-sys-outlineVariant/30 flex-shrink-0 bg-m3-sys-surfaceContainer">
        <div className="flex items-center space-x-2.5">
          <span id="drawer-icon" className="material-symbols-rounded text-m3-sys-primary">
            {drawerIcon}
          </span>
          <h2 id="drawer-title" className="font-medium text-base text-m3-sys-onSurface">
            {drawerTitle}
          </h2>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          title="Fermer le panneau"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer shadow-none"
        >
          <span className="material-symbols-rounded text-xl leading-none">close</span>
        </button>
      </div>

      {/* Contenu dynamique du volet */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
        {activePanel === 'bg' && <BackgroundControls />}
        {activePanel === 'text' && selectedElement?.type === 'text' && (
          <TextControls element={selectedElement as TextElementModel} />
        )}
        {activePanel === 'shape' && selectedElement?.type === 'shape' && (
          <ShapeControls element={selectedElement as ShapeElementModel} />
        )}
        {activePanel === 'export' && <ExportControls />}
      </div>
    </aside>
  );
};
