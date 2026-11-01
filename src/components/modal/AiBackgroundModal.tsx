import React, { useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';

function formatAspectRatio(w: number, h: number): string {
  const r = w / h;
  if (Math.abs(r - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(r - 1) < 0.03) return '1:1';
  if (Math.abs(r - 4 / 3) < 0.03) return '4:3';
  if (Math.abs(r - 3 / 4) < 0.03) return '3:4';
  if (Math.abs(r - 3 / 2) < 0.03) return '3:2';
  if (Math.abs(r - 3) < 0.05) return '3:1';
  if (Math.abs(r - 1200 / 630) < 0.04) return '1.91:1';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(Math.round(w), Math.round(h)) || 1;
  return `${Math.round(w / d)}:${Math.round(h / d)}`;
}

export const AiBackgroundModal: React.FC = () => {
  const {
    state,
    isAiModalOpen,
    setIsAiModalOpen,
    isGeneratingAiBg,
    aiModels,
    selectedAiModel,
    setSelectedAiModel,
    aiPrompt,
    setAiPrompt,
    aiError,
    setAiError,
    generateAiBackground
  } = useEditor();

  const { canvasWidth = 800, canvasHeight = 600 } = state;
  const ratioLabel = formatAspectRatio(canvasWidth, canvasHeight);

  useEffect(() => {
    if (!isAiModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiModalOpen, setIsAiModalOpen]);

  if (!isAiModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGeneratingAiBg && aiPrompt.trim()) {
      generateAiBackground();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-bg-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={() => setIsAiModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl shadow-m3-4 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="material-symbols-rounded text-xl leading-none">auto_awesome</span>
            </div>
            <div className="truncate">
              <h2 id="ai-bg-modal-title" className="text-base sm:text-lg font-bold text-m3-sys-onSurface truncate">
                Générer l'arrière-plan par IA
              </h2>
              <p className="text-xs text-m3-sys-onSurfaceVariant truncate">
                Génération via Google Gemini & sauvegarde automatique dans assets/
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAiModalOpen(false)}
            title="Fermer (la génération continue en arrière-plan)"
            className="w-8 h-8 rounded-full flex items-center justify-center text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest active:scale-90 transition-all cursor-pointer flex-shrink-0 ml-2"
          >
            <span className="material-symbols-rounded text-xl leading-none">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Format Constraints Info Banner */}
          <div className="p-3 rounded-2xl bg-m3-sys-surfaceContainer border border-m3-sys-outlineVariant/40 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="material-symbols-rounded text-lg text-m3-sys-primary">aspect_ratio</span>
              <div>
                <div className="text-xs font-semibold text-m3-sys-onSurface">
                  Contraintes de format transmises à Gemini
                </div>
                <div className="text-[11px] text-m3-sys-onSurfaceVariant">
                  Guidage automatique selon les dimensions de la scène
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer text-[11px] font-mono font-bold">
                {ratioLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface text-[11px] font-mono font-semibold">
                {canvasWidth}×{canvasHeight}
              </span>
            </div>
          </div>

          {/* Sélection du modèle (config.ia.yaml) */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-model-select"
              className="text-xs font-semibold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center justify-between"
            >
              <span>Modèle IA (config.ia.yaml)</span>
              <span className="text-[10px] font-mono text-m3-sys-outline normal-case">Google Gemini</span>
            </label>
            <select
              id="ai-model-select"
              value={selectedAiModel}
              disabled={isGeneratingAiBg}
              onChange={e => setSelectedAiModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-xs font-medium text-m3-sys-onSurface focus:ring-2 focus:ring-m3-sys-primary focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              {aiModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name ? `${m.name} (${m.id})` : m.id}
                </option>
              ))}
            </select>
            {(() => {
              const current = aiModels.find(m => m.id === selectedAiModel);
              return current?.description ? (
                <p className="text-[11px] text-m3-sys-onSurfaceVariant px-1">{current.description}</p>
              ) : null;
            })()}
          </div>

          {/* Saisie du prompt */}
          <div className="space-y-1.5">
            <label
              htmlFor="ai-prompt-input"
              className="text-xs font-semibold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center justify-between"
            >
              <span>Prompt de génération</span>
              <span className="text-[10px] text-m3-sys-outline normal-case">Décrivez l'ambiance, le style et les couleurs</span>
            </label>
            <textarea
              id="ai-prompt-input"
              rows={4}
              value={aiPrompt}
              disabled={isGeneratingAiBg}
              onChange={e => {
                setAiPrompt(e.target.value);
                if (aiError) setAiError(null);
              }}
              placeholder="Ex: Fond abstrait minimaliste aux couleurs dégradées bleu nuit et violet néon, style géométrique fluide Material 3, éclairage doux..."
              className="w-full p-3.5 bg-m3-sys-surfaceContainerHighest rounded-2xl border border-m3-sys-outlineVariant/50 text-xs text-m3-sys-onSurface placeholder:text-m3-sys-onSurfaceVariant/50 focus:ring-2 focus:ring-m3-sys-primary focus:outline-none resize-none disabled:opacity-60 select-text"
            />
          </div>

          {/* Barre de progression indéterminée pendant la génération */}
          {isGeneratingAiBg && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-rounded text-base animate-spin">progress_activity</span>
                  <span>Génération de l'image en cours via {selectedAiModel}...</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">
                  {ratioLabel} ({canvasWidth}×{canvasHeight})
                </span>
              </div>
              <div className="w-full h-1.5 bg-indigo-950/40 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-[11px] text-m3-sys-onSurfaceVariant">
                Vous pouvez fermer cette fenêtre et poursuivre votre édition : l'image sera automatiquement enregistrée et appliquée dès qu'elle sera prête.
              </p>
            </div>
          )}

          {/* Message d'erreur éventuel */}
          {aiError && !isGeneratingAiBg && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start space-x-2 text-xs text-red-400">
              <span className="material-symbols-rounded text-base flex-shrink-0 mt-0.5">error</span>
              <span className="flex-1 break-words">{aiError}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-m3-sys-outlineVariant/30">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-m3-sys-surfaceContainerHighest hover:bg-m3-sys-surfaceContainerHigh text-m3-sys-onSurface text-xs font-semibold transition-all cursor-pointer"
            >
              {isGeneratingAiBg ? 'Réduire en arrière-plan' : 'Fermer'}
            </button>

            <button
              type="submit"
              disabled={isGeneratingAiBg || !aiPrompt.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className={`material-symbols-rounded text-base leading-none ${isGeneratingAiBg ? 'animate-spin' : ''}`}>
                {isGeneratingAiBg ? 'progress_activity' : 'auto_awesome'}
              </span>
              <span>{isGeneratingAiBg ? 'Génération en cours...' : 'Générer l’image'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
