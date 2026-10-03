import React, { useEffect, useState } from 'react';

export interface DiskPermissionModalProps {
  isOpen: boolean;
  targetName: string;
  detectedAssets?: string[];
  title?: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  errorMessage?: string | null;
  onAuthorize: () => Promise<void>;
  onNewDocument: () => void;
  onAbortImport?: () => void;
}

export const DiskPermissionModal: React.FC<DiskPermissionModalProps> = ({
  isOpen,
  targetName,
  detectedAssets = [],
  title,
  description,
  cancelLabel = 'Continuer sans les images',
  confirmLabel = 'Sélectionner le dossier du projet',
  errorMessage,
  onAuthorize,
  onNewDocument,
  onAbortImport
}) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  // Synchronisation avec l'état d'erreur externe ou local
  const effectiveError = errorMessage || localErrorMessage;

  // Réinitialiser les états locaux à la fermeture ou réouverture
  useEffect(() => {
    if (!isOpen) {
      setLocalErrorMessage(null);
      setIsAuthorizing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAuthorizing) {
        if (effectiveError && onAbortImport) {
          onAbortImport();
        } else {
          onNewDocument();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAuthorizing, effectiveError, onAbortImport, onNewDocument]);

  if (!isOpen) return null;

  const handleAuthorizeClick = async () => {
    if (isAuthorizing) return;
    setIsAuthorizing(true);
    setLocalErrorMessage(null);
    try {
      await onAuthorize();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setLocalErrorMessage(
          err.name === 'NotAllowedError'
            ? "L'autorisation d'accès aux dossiers a été refusée ou révoquée dans Chrome. Pour la réactiver, autorisez l'accès aux fichiers dans les paramètres de votre navigateur (icône 🔒 à gauche de la barre d'adresse) puis réessayez."
            : `Erreur d'accès au dossier : ${err.message || 'Non autorisé'}`
        );
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const modalTitle =
    title || (detectedAssets.length > 0 ? 'Charger les images du template ?' : 'Reprendre le projet local ?');

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        className="bg-m3-sys-surfaceContainerHigh text-m3-sys-onSurface rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-m3-4 border border-m3-sys-outlineVariant/40 animate-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center space-x-4 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
              effectiveError
                ? 'bg-m3-sys-errorContainer text-m3-sys-error'
                : 'bg-m3-sys-primary/15 text-m3-sys-primary'
            }`}
          >
            <span className="material-symbols-rounded text-2xl leading-none">
              {effectiveError ? 'lock' : 'folder_shared'}
            </span>
          </div>
          <div className="overflow-hidden">
            <h3 className="text-lg font-bold text-m3-sys-onSurface leading-snug">
              {modalTitle}
            </h3>
            <p className="text-xs text-m3-sys-onSurfaceVariant truncate max-w-[360px]">
              {targetName || 'Projet local détecté'}
            </p>
          </div>
        </div>

        {/* Message explicatif */}
        <div className="text-sm text-m3-sys-onSurfaceVariant leading-relaxed mb-4 space-y-3">
          <p>
            {description ||
              (detectedAssets.length > 0
                ? "Ce template YAML utilise des images physiques situées dans le dossier assets/ (ou ses sous-répertoires). Pour les charger et permettre leur synchronisation automatique, veuillez autoriser l'accès ou sélectionner le dossier racine du bundle/projet."
                : "Un projet enregistré sur votre disque a été détecté. Votre navigateur nécessite une autorisation pour charger ses fichiers et ses images (assets/).")}
          </p>

          {/* Alerte d'erreur de restriction système / navigateur */}
          {effectiveError && (
            <div className="bg-m3-sys-errorContainer/90 text-m3-sys-onErrorContainer rounded-2xl p-4 border border-m3-sys-error/40 flex items-start space-x-3 animate-fadeIn">
              <span className="material-symbols-rounded text-2xl text-m3-sys-error flex-shrink-0 mt-0.5">
                gpp_maybe
              </span>
              <div className="space-y-1.5 text-xs leading-relaxed">
                <p className="font-bold text-sm text-m3-sys-error">
                  Dossier protégé ou accès non autorisé
                </p>
                <p className="text-m3-sys-onErrorContainer font-medium">{effectiveError}</p>
                <p className="text-m3-sys-onErrorContainer/80">
                  Le navigateur bloque l'accès à ce répertoire. Vous pouvez réautoriser l'accès via les réglages de
                  votre navigateur, abandonner l'import ou continuer sans charger les images locales.
                </p>
              </div>
            </div>
          )}

          {/* Liste des assets détectés */}
          {detectedAssets.length > 0 && (
            <div className="bg-m3-sys-surfaceContainerHighest/70 rounded-2xl p-3 max-h-32 overflow-y-auto space-y-1.5 border border-m3-sys-outlineVariant/30">
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
              : 'Vous pouvez autoriser l’accès au dossier pour continuer votre travail, ou repartir sur un document vierge.'}
          </p>
        </div>

        {/* Actions : 1 gros bouton principal + 2 petits boutons en dessous */}
        <div className="pt-3 space-y-3">
          {/* Gros bouton : Sélectionner le dossier du projet */}
          <button
            type="button"
            onClick={handleAuthorizeClick}
            disabled={isAuthorizing}
            className="w-full py-3.5 px-5 rounded-2xl bg-m3-sys-primary text-m3-sys-onPrimary hover:opacity-95 active:scale-98 transition-all text-sm font-bold shadow-m3-1 flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-rounded text-xl">
              {isAuthorizing ? 'sync' : 'folder_open'}
            </span>
            <span>
              {isAuthorizing ? 'Sélection en cours...' : confirmLabel}
            </span>
          </button>

          {/* 2 petits boutons en dessous : Abandonner l'import & Continuer sans les images */}
          <div className="pt-2 border-t border-m3-sys-outlineVariant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Abandonner l'import */}
            <button
              type="button"
              onClick={onAbortImport || onNewDocument}
              disabled={isAuthorizing}
              className="w-full sm:w-auto px-4 py-2 rounded-full border border-m3-sys-error/40 text-m3-sys-error hover:bg-m3-sys-error/10 active:scale-98 transition-all text-xs font-semibold cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-rounded text-base">close</span>
              <span>Abandonner l'import</span>
            </button>

            {/* Continuer sans les images */}
            <button
              type="button"
              onClick={onNewDocument}
              disabled={isAuthorizing}
              className="w-full sm:w-auto px-4 py-2 rounded-full border border-m3-sys-outlineVariant/50 text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-98 transition-all text-xs font-medium cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-rounded text-base">visibility_off</span>
              <span>{cancelLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
