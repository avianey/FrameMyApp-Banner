import React, { useEffect, useState } from 'react';
import { useEditor, slugifyFilename } from '../../context/EditorContext';

export const SaveModal: React.FC = () => {
  const {
    isSavePanelOpen,
    setIsSavePanelOpen,
    projectName,
    setProjectName,
    syncStatus,
    lastSyncTime,
    isAutoSyncEnabled,
    setIsAutoSyncEnabled,
    syncDirectoryName,
    syncFilePath,
    syncDirectoryHandle,
    syncFileHandle,
    syncToDisk,
    selectSyncDirectory,
    selectSyncFile,
    exportCanvasAsTemplateYaml,
    exportCanvasAsBundleZip,
    loadedBundle,
    setIsBatchExportModalOpen
  } = useEditor();

  const [localName, setLocalName] = useState(projectName);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronise le nom local lorsque projectName change depuis l'extérieur
  useEffect(() => {
    setLocalName(projectName);
  }, [projectName]);

  // Fermeture par la touche Échap
  useEffect(() => {
    if (!isSavePanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSavePanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSavePanelOpen, setIsSavePanelOpen]);

  if (!isSavePanelOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalName(val);
    setProjectName(val);
  };

  const handleManualSync = async () => {
    setIsSaving(true);
    try {
      await syncToDisk();
    } finally {
      setIsSaving(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const isConnected = Boolean(syncDirectoryHandle || syncFileHandle || syncDirectoryName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={() => setIsSavePanelOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl shadow-m3-4 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="p-4 sm:p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="material-symbols-rounded text-xl leading-none">save</span>
            </div>
            <div className="truncate">
              <h2 id="save-modal-title" className="text-base sm:text-lg font-bold text-m3-sys-onSurface truncate">
                Sauvegarde & Synchronisation Disque
              </h2>
              <p className="text-xs text-m3-sys-onSurfaceVariant truncate">
                Nom du projet, synchronisation locale et exports
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSavePanelOpen(false)}
            title="Fermer (Échap)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer flex-shrink-0 ml-2"
          >
            <span className="material-symbols-rounded text-xl leading-none">close</span>
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto no-scrollbar flex-1">
          {/* SECTION 1: Nom du projet */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant px-1 flex items-center space-x-1.5">
              <span className="material-symbols-rounded text-sm text-m3-sys-primary">edit</span>
              <span>Nom du projet (Sous-titre)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={localName}
                onChange={handleNameChange}
                placeholder="Projet sans nom"
                className="w-full px-4 py-2.5 rounded-2xl bg-m3-sys-surfaceContainer border border-m3-sys-outlineVariant/40 text-sm font-semibold text-m3-sys-onSurface focus:outline-none focus:ring-2 focus:ring-m3-sys-primary focus:border-transparent transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-m3-sys-onSurfaceVariant/60 font-mono pointer-events-none">
                {localName ? `${localName.length} car.` : 'défaut'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-m3-sys-onSurfaceVariant px-1 gap-1">
              <span>Fichier disque cible : <strong className="font-mono text-m3-sys-primary">{syncFilePath || `${slugifyFilename(localName || 'Projet sans nom')}.yml`}</strong></span>
              <span>Nom dans le YAML : <strong className="font-mono text-m3-sys-primary">&quot;{localName || 'Projet sans nom'}&quot;</strong></span>
            </div>
            <p className="text-[11px] text-m3-sys-onSurfaceVariant/80 px-1">
              Renommer le projet met à jour le sous-titre de l'en-tête, actualise le champ <code>name</code> dans le fichier YAML et synchronise le fichier sous ce nouveau nom dans votre répertoire de sauvegarde.
            </p>
          </div>

          {/* SECTION 2: Synchronisation locale sur disque */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center space-x-1.5">
                <span className="material-symbols-rounded text-sm text-m3-sys-primary">sync</span>
                <span>Synchronisation Disque (YAML)</span>
              </span>
              {isConnected && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Connecté</span>
                </span>
              )}
            </div>

            {/* Carte état de connexion */}
            <div className="p-3.5 rounded-2xl bg-m3-sys-surfaceContainer border border-m3-sys-outlineVariant/30 space-y-3">
              {isConnected ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-rounded text-xl">folder_open</span>
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-m3-sys-onSurface truncate">
                        {syncDirectoryName || (syncFileHandle ? syncFileHandle.name : 'Dossier local actif')}
                      </p>
                      <p className="text-[11px] font-mono text-m3-sys-onSurfaceVariant truncate">
                        Fichier cible : {syncFilePath || 'master.yml'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => selectSyncDirectory()}
                    title="Changer le dossier de synchronisation"
                    className="px-2.5 py-1.5 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primary/10 hover:text-m3-sys-primary text-xs font-semibold text-m3-sys-onSurfaceVariant transition-all cursor-pointer flex-shrink-0 flex items-center space-x-1"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span>
                    <span>Modifier</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5 text-xs text-m3-sys-onSurfaceVariant">
                    <span className="material-symbols-rounded text-lg text-m3-sys-primary">folder_off</span>
                    <span>Aucun dossier ou fichier local actuellement connecté.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => selectSyncDirectory()}
                      disabled={!hasFsSupport}
                      className="p-2.5 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primary/15 text-m3-sys-onSurface hover:text-m3-sys-primary text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <span className="material-symbols-rounded text-base text-m3-sys-primary">folder_open</span>
                      <span>Choisir un dossier...</span>
                    </button>
                    <button
                      onClick={() => selectSyncFile()}
                      disabled={!hasFsSupport}
                      className="p-2.5 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-primary/15 text-m3-sys-onSurface hover:text-m3-sys-primary text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <span className="material-symbols-rounded text-base text-m3-sys-primary">file_open</span>
                      <span>Choisir un fichier YAML...</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Option Auto-Sync Switch */}
              <div className="pt-2 border-t border-m3-sys-outlineVariant/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-m3-sys-onSurface block">
                    Sauvegarde automatique sur le disque
                  </span>
                  <span className="text-[11px] text-m3-sys-onSurfaceVariant">
                    Met à jour le YAML en temps réel à chaque modification
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isAutoSyncEnabled}
                    onChange={e => setIsAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-m3-sys-surfaceContainerHighest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-m3-sys-primary"></div>
                </label>
              </div>

              {/* Bouton Synchro Immédiate */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSaving || syncStatus === 'syncing'}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    syncStatus === 'dirty'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:brightness-110 active:scale-98 animate-pulse'
                      : 'bg-m3-sys-primary text-white hover:brightness-110 active:scale-98'
                  }`}
                >
                  <span
                    className={`material-symbols-rounded text-base leading-none ${
                      isSaving || syncStatus === 'syncing' ? 'animate-spin' : ''
                    }`}
                  >
                    {isSaving || syncStatus === 'syncing'
                      ? 'sync'
                      : syncStatus === 'dirty'
                      ? 'save'
                      : 'cloud_done'}
                  </span>
                  <span>
                    {isSaving || syncStatus === 'syncing'
                      ? 'Synchronisation en cours...'
                      : syncStatus === 'dirty'
                      ? 'Enregistrer les modifications sur le disque'
                      : 'Synchroniser maintenant'}
                  </span>
                </button>
              </div>

              {/* Timestamp dernière synchro */}
              {lastSyncTime && (
                <p className="text-[10px] text-center text-m3-sys-onSurfaceVariant font-mono">
                  Dernière synchronisation réussie à {formatLastSync(lastSyncTime)}
                </p>
              )}
            </div>

            {/* Note d'information sur les retours arrière (Undo/Redo) */}
            <div className="p-3 rounded-2xl bg-m3-sys-surfaceContainer/50 border border-m3-sys-outlineVariant/20 flex items-start space-x-2.5 text-[11px] text-m3-sys-onSurfaceVariant">
              <span className="material-symbols-rounded text-base text-m3-sys-primary flex-shrink-0 mt-0.5">
                history
              </span>
              <p className="leading-relaxed">
                <strong>Gestion de l'historique :</strong> Les retours arrière et avant (Ctrl+Z / Ctrl+Y)
                ne sont pas sauvegardés sur le disque. Ils restent exclusivement dans le cache mémoire
                local de votre navigateur pour cette session de travail.
              </p>
            </div>
          </div>

          {/* SECTION 3: Exports du canvas actuel (transférés depuis le panneau d'ouverture) */}
          <div className="space-y-2 pt-2 border-t border-m3-sys-outlineVariant/30">
            <span className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant px-1 flex items-center space-x-1.5">
              <span className="material-symbols-rounded text-sm text-m3-sys-primary">download</span>
              <span>Exports du canvas actuel</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => exportCanvasAsTemplateYaml(projectName)}
                title="Télécharger le canvas actuel sous forme de fichier YAML autonome"
                className="p-3 rounded-2xl bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/30 text-left transition-all active:scale-95 cursor-pointer shadow-sm group"
              >
                <div className="flex items-center space-x-2 text-m3-sys-primary mb-1">
                  <span className="material-symbols-rounded text-lg group-hover:scale-110 transition-transform">
                    code
                  </span>
                  <span className="text-xs font-bold text-m3-sys-onSurface">Template YML</span>
                </div>
                <p className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Fichier unique autonome ({projectName ? `${projectName}.yml` : 'template.yml'})
                </p>
              </button>

              <button
                onClick={exportCanvasAsBundleZip}
                title="Télécharger une archive ZIP complète avec master, overrides et variants"
                className="p-3 rounded-2xl bg-m3-sys-surfaceContainer hover:bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/30 text-left transition-all active:scale-95 cursor-pointer shadow-sm group"
              >
                <div className="flex items-center space-x-2 text-m3-sys-primary mb-1">
                  <span className="material-symbols-rounded text-lg group-hover:scale-110 transition-transform">
                    folder_zip
                  </span>
                  <span className="text-xs font-bold text-m3-sys-onSurface">Bundle ZIP</span>
                </div>
                <p className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Arborescence complète (Master, Overrides, Variantes)
                </p>
              </button>
            </div>

            {/* Accès rapide au Batch Export si un bundle est actif */}
            {loadedBundle && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsSavePanelOpen(false);
                    setIsBatchExportModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-m3-sys-primary/10 to-indigo-500/10 hover:from-m3-sys-primary/20 hover:to-indigo-500/20 text-m3-sys-primary text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-m3-sys-primary/20 cursor-pointer"
                >
                  <span className="material-symbols-rounded text-base leading-none">bolt</span>
                  <span>Ouvrir le Batch Export ({loadedBundle.variants.length + 1} déclinaisons)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="p-3 sm:p-4 bg-m3-sys-surfaceContainer border-t border-m3-sys-outlineVariant/30 flex justify-end">
          <button
            onClick={() => setIsSavePanelOpen(false)}
            className="px-4 py-2 rounded-full bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-outlineVariant/30 text-xs font-bold text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
