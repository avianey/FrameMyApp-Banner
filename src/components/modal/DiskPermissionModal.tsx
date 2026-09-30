import React, { useEffect, useState } from 'react';

export interface DiskPermissionModalProps {
  isOpen: boolean;
  targetName: string;
  detectedAssets?: string[];
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onAuthorize: () => Promise<void>;
  onNewDocument: () => void;
}

export const DiskPermissionModal: React.FC<DiskPermissionModalProps> = ({
  isOpen,
  targetName,
  detectedAssets = [],
  title,
  description,
  cancelLabel = 'Nouveau document',
  confirmLabel = 'Autoriser l’accès',
  onAuthorize,
  onNewDocument
}) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAuthorizing) {
        onNewDocument();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAuthorizing, onNewDocument]);

  if (!isOpen) return null;

  const handleAuthorizeClick = async () => {
    setIsAuthorizing(true);
    try {
      await onAuthorize();
    } finally {
      setIsAuthorizing(false);
    }
  };

  const modalTitle = title || (detectedAssets.length > 0 ? 'Charger les images du template ?' : 'Reprendre le projet local ?');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        className="bg-m3-sys-surfaceContainerHigh text-m3-sys-onSurface rounded-3xl p-6 max-w-lg w-full shadow-m3-4 border border-m3-sys-outlineVariant/40 animate-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-m3-sys-primary/15 text-m3-sys-primary flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="material-symbols-rounded text-2xl leading-none">folder_shared</span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-lg font-bold text-m3-sys-onSurface leading-snug">
              {modalTitle}
            </h3>
            <p className="text-xs text-m3-sys-onSurfaceVariant truncate max-w-[340px]">
              {targetName || 'Projet local détecté'}
            </p>
          </div>
        </div>

        {/* Message explicatif */}
        <div className="text-sm text-m3-sys-onSurfaceVariant leading-relaxed mb-4 space-y-2.5">
          <p>
            {description || (
              detectedAssets.length > 0
                ? "Ce template YAML utilise des images physiques situées dans le dossier assets/. Pour les charger et permettre leur synchronisation automatique, veuillez autoriser l'accès au dossier parent du projet."
                : "Un projet enregistré sur votre disque a été détecté. Votre navigateur nécessite une autorisation pour charger ses fichiers et ses images (assets/)."
            )}
          </p>

          {/* Liste des assets détectés */}
          {detectedAssets.length > 0 && (
            <div className="bg-m3-sys-surfaceContainerHighest/70 rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5 border border-m3-sys-outlineVariant/30">
              <span className="text-[11px] font-bold text-m3-sys-onSurfaceVariant uppercase tracking-wider block">
                Images requises ({detectedAssets.length}) :
              </span>
              {detectedAssets.map(asset => (
                <div key={asset} className="flex items-center space-x-2 text-xs font-mono text-m3-sys-primary truncate">
                  <span className="material-symbols-rounded text-sm flex-shrink-0">image</span>
                  <span className="truncate">{asset}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-m3-sys-outline">
            {detectedAssets.length > 0
              ? "Si vous continuez sans le dossier, le template s'ouvrira sans les visuels locaux."
              : "Vous pouvez autoriser l'accès au dossier pour continuer votre travail, ou repartir sur un document vierge."}
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onNewDocument}
            disabled={isAuthorizing}
            className="px-5 py-2.5 rounded-full border border-m3-sys-outlineVariant/50 text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-95 transition-all text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleAuthorizeClick}
            disabled={isAuthorizing}
            className="px-5 py-2.5 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary hover:opacity-95 active:scale-95 transition-all text-sm font-bold shadow-m3-1 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-rounded text-base">
              {isAuthorizing ? 'sync' : 'folder_open'}
            </span>
            <span>{isAuthorizing ? 'Sélection...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
