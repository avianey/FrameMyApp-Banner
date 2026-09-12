import React, { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-m3-sys-surfaceContainerHigh text-m3-sys-onSurface rounded-3xl p-6 max-w-md w-full shadow-m3-4 border border-m3-sys-outlineVariant/40 animate-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête avec icône d'avertissement */}
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-m3-sys-error/15 text-m3-sys-error flex items-center justify-center flex-shrink-0 shadow-inner">
            <span className="material-symbols-rounded text-2xl leading-none">delete_sweep</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-m3-sys-onSurface leading-snug">
              Réinitialiser le projet ?
            </h3>
            <p className="text-xs text-m3-sys-onSurfaceVariant">
              Nettoyage complet de la scène
            </p>
          </div>
        </div>

        {/* Message explicatif */}
        <div className="text-sm text-m3-sys-onSurfaceVariant leading-relaxed mb-6 space-y-2">
          <p>
            Tous les textes et toutes les formes seront supprimés de la composition. L'arrière-plan sera réinitialisé à son état d'origine.
          </p>
          <p className="text-xs text-m3-sys-primary font-medium flex items-center space-x-1">
            <span className="material-symbols-rounded text-sm leading-none">undo</span>
            <span>Cette action reste annulable grâce au bouton Retour arrière.</span>
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-m3-sys-outlineVariant/50 text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-95 transition-all text-sm font-medium cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-full bg-m3-sys-error text-m3-sys-onError hover:brightness-110 active:scale-95 shadow-sm transition-all text-sm font-semibold flex items-center space-x-2 cursor-pointer"
          >
            <span className="material-symbols-rounded text-base leading-none">delete_forever</span>
            <span>Tout effacer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
