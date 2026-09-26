import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { DeviceModelType } from '../types';

const devicePresets: { id: DeviceModelType; label: string; icon: string }[] = [
  { id: 'pixel-10', label: 'Pixel 10', icon: 'smartphone' },
  { id: 'iphone-pro-max', label: 'iPhone Pro Max', icon: 'smartphone' },
  { id: 'samsung-galaxy', label: 'Samsung Galaxy', icon: 'smartphone' },
  { id: 'pixel-tab', label: 'Pixel Tab', icon: 'tablet_android' }
];

export const BottomBar: React.FC = () => {
  const { state, setActivePanel, addText, addShape, addDevice } = useEditor();
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const deviceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target as Node)) {
        setShowDeviceMenu(false);
      }
    };
    if (showDeviceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeviceMenu]);

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

      {/* Bouton + Device avec menu déroulant */}
      <div ref={deviceMenuRef} className="relative flex items-center">
        <div className="flex items-center bg-m3-sys-tertiaryContainer text-m3-sys-onTertiaryContainer rounded-full border border-m3-sys-tertiary/30 shadow-sm overflow-hidden">
          <button
            onClick={() => addDevice('pixel-10')}
            title="Ajouter un appareil (smartphone / tablette)"
            className="flex items-center space-x-1.5 pl-3.5 pr-2 py-2.5 hover:brightness-110 active:scale-95 transition-all text-sm font-semibold cursor-pointer"
          >
            <span className="material-symbols-rounded text-lg leading-none flex items-center justify-center">
              smartphone
            </span>
            <span>+ Appareil</span>
          </button>
          <button
            onClick={() => setShowDeviceMenu(!showDeviceMenu)}
            title="Choisir le modèle d'appareil"
            className="pr-2.5 pl-1 py-2.5 hover:brightness-110 active:scale-90 transition-all cursor-pointer text-m3-sys-onTertiaryContainer/80 hover:text-m3-sys-onTertiaryContainer"
          >
            <span className="material-symbols-rounded text-base leading-none">
              {showDeviceMenu ? 'expand_more' : 'arrow_drop_down'}
            </span>
          </button>
        </div>

        {/* Menu flottant des 4 modèles */}
        {showDeviceMenu && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 bg-m3-sys-surfaceContainerHigh rounded-2xl p-2 shadow-m3-4 border border-m3-sys-outlineVariant z-50 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold text-m3-sys-onSurfaceVariant uppercase tracking-wider">
              Modèles de mockups
            </div>
            {devicePresets.map(device => (
              <button
                key={device.id}
                onClick={() => {
                  addDevice(device.id);
                  setShowDeviceMenu(false);
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest hover:text-m3-sys-primary transition-all text-left cursor-pointer active:scale-98"
              >
                <span className="material-symbols-rounded text-base text-m3-sys-primary">
                  {device.icon}
                </span>
                <span>{device.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
