import React from 'react';
import { useEditor } from '../context/EditorContext';

export const Snackbar: React.FC = () => {
  const { snackbar, isPermissionModalOpen } = useEditor();

  // La snackbar ne doit jamais s'afficher sous le fond flouté d'une modale
  const isVisible = snackbar.visible && !isPermissionModalOpen;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-m3-sys-onSurface text-m3-sys-surface px-5 py-3 rounded-full text-sm font-medium shadow-m3-3 flex items-center space-x-3 transition-all duration-300 z-40 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <span className="material-symbols-rounded text-m3-sys-primaryContainer">
        {snackbar.icon}
      </span>
      <span>{snackbar.message}</span>
    </div>
  );
};
