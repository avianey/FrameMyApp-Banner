import React, { useState, useEffect, useRef } from 'react';
import { useEditor, slugifyFilename } from '../../context/EditorContext';
import { downloadDataUrl } from '../../utils/export';

const formatRatio = (r: number): string => {
  if (Math.abs(r - 16 / 9) < 0.03) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.03) return '9:16';
  if (Math.abs(r - 1) < 0.03) return '1:1';
  if (Math.abs(r - 4 / 3) < 0.03) return '4:3';
  if (Math.abs(r - 3 / 2) < 0.03) return '3:2';
  if (Math.abs(r - 3) < 0.05) return '3:1';
  if (Math.abs(r - 1200 / 630) < 0.04) return '1.91:1';
  return `${Math.round(r * 100) / 100}:1`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
};

export const ExportPreviewModal: React.FC = () => {
  const {
    isExportPreviewOpen,
    setIsExportPreviewOpen,
    exportPreviewData,
    isGeneratingPreview,
    openExportPreview,
    projectName,
    showSnackbar
  } = useEditor();

  const [zoomMode, setZoomMode] = useState<'fit' | 'actual' | 'custom'>('fit');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture par touche Échap
  useEffect(() => {
    if (!isExportPreviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportPreviewOpen, setIsExportPreviewOpen]);

  // Réinitialiser le mode d'affichage à l'ouverture
  useEffect(() => {
    if (isExportPreviewOpen) {
      setZoomMode('fit');
      setZoomScale(1);
    }
  }, [isExportPreviewOpen]);

  if (!isExportPreviewOpen) return null;

  const handleDownload = () => {
    if (!exportPreviewData) return;
    const baseName = slugifyFilename(projectName) || 'banner';
    const filename = `${baseName}-${exportPreviewData.targetWidth}x${exportPreviewData.targetHeight}.png`;
    downloadDataUrl(exportPreviewData.dataUrl, filename);
    showSnackbar(`Image téléchargée : ${filename}`, 'file_download_done');
  };

  const handleCopy = async () => {
    if (!exportPreviewData || isCopying) return;
    setIsCopying(true);
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': exportPreviewData.blob })
        ]);
        showSnackbar('Image copiée dans le presse-papiers !', 'content_copy');
      } else {
        throw new Error('API Presse-papiers non disponible');
      }
    } catch (err: any) {
      console.warn('Clipboard write error:', err);
      showSnackbar('Copie directe non supportée par le navigateur', 'warning');
    } finally {
      setIsCopying(false);
    }
  };

  const handleZoomIn = () => {
    setZoomMode('custom');
    setZoomScale(prev => Math.min(3, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setZoomScale(prev => Math.max(0.25, +(prev - 0.25).toFixed(2)));
  };

  const handleFitMode = () => {
    setZoomMode('fit');
    setZoomScale(1);
  };

  const handleActualSize = () => {
    setZoomMode('actual');
    setZoomScale(1);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      setIsExportPreviewOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md select-none transition-all animate-fadeIn"
    >
      {/* 1. Barre d'outils supérieure (Header) */}
      <header className="h-16 px-4 sm:px-6 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-white flex-shrink-0 z-10 shadow-lg">
        {/* Titre et badges d'informations */}
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-rounded text-xl">visibility</span>
          </div>
          <div className="min-w-0">
            <h2 id="preview-modal-title" className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>Aperçu du rendu exporté</span>
              {exportPreviewData && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-white/10 text-neutral-300">
                  {exportPreviewData.targetWidth} × {exportPreviewData.targetHeight} px
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono">
              {exportPreviewData && (
                <>
                  <span>Ratio {formatRatio(exportPreviewData.ratio)}</span>
                  <span>•</span>
                  <span>{formatFileSize(exportPreviewData.blob.size)}</span>
                  {exportPreviewData.preset && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{exportPreviewData.preset}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles de Zoom & Actions rapides */}
        <div className="flex items-center space-x-2">
          {/* Sélecteur de mode zoom */}
          <div className="hidden md:flex items-center bg-neutral-800/80 rounded-full p-1 border border-neutral-700/60">
            <button
              onClick={handleFitMode}
              title="Adapter à l'écran"
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                zoomMode === 'fit'
                  ? 'bg-m3-sys-primary text-white shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <span className="material-symbols-rounded text-sm">fit_screen</span>
              <span>Adapter</span>
            </button>
            <button
              onClick={handleActualSize}
              title="Taille réelle (100% pixel-perfect)"
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                zoomMode === 'actual'
                  ? 'bg-m3-sys-primary text-white shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <span className="material-symbols-rounded text-sm">zoom_in</span>
              <span>100%</span>
            </button>
            <div className="w-px h-4 bg-neutral-700 mx-1" />
            <button
              onClick={handleZoomOut}
              title="Dézoomer"
              disabled={zoomMode === 'custom' && zoomScale <= 0.25}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 disabled:opacity-30 cursor-pointer"
            >
              <span className="material-symbols-rounded text-sm">remove</span>
            </button>
            <span className="text-[11px] font-mono px-1 min-w-[38px] text-center text-neutral-300">
              {zoomMode === 'fit' ? 'Auto' : `${Math.round(zoomScale * 100)}%`}
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoomer"
              disabled={zoomMode === 'custom' && zoomScale >= 3}
              className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700/60 disabled:opacity-30 cursor-pointer"
            >
              <span className="material-symbols-rounded text-sm">add</span>
            </button>
          </div>

          {/* Bouton Copier */}
          <button
            onClick={handleCopy}
            disabled={!exportPreviewData || isGeneratingPreview || isCopying}
            title="Copier l'image dans le presse-papiers"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-rounded text-base">content_copy</span>
            <span>Copier</span>
          </button>

          {/* Bouton Télécharger */}
          <button
            onClick={handleDownload}
            disabled={!exportPreviewData || isGeneratingPreview}
            title="Télécharger le fichier PNG haute définition"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-m3-sys-primary hover:brightness-110 text-m3-sys-onPrimary text-xs font-bold shadow-m3-1 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-rounded text-base">download</span>
            <span className="hidden sm:inline">Télécharger</span>
          </button>

          {/* Bouton Rafraîchir */}
          <button
            onClick={openExportPreview}
            disabled={isGeneratingPreview}
            title="Régénérer l'aperçu à partir de la composition actuelle"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition-all cursor-pointer disabled:opacity-40"
          >
            <span className={`material-symbols-rounded text-lg ${isGeneratingPreview ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>

          {/* Bouton Fermer */}
          <button
            onClick={() => setIsExportPreviewOpen(false)}
            title="Fermer (Échap)"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
      </header>

      {/* 2. Zone d'affichage de l'image (Lightbox Body) */}
      <main
        ref={containerRef}
        onClick={handleBackdropClick}
        className="flex-1 w-full overflow-auto flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
      >
        {isGeneratingPreview ? (
          <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-neutral-900/90 rounded-3xl border border-neutral-800 shadow-2xl text-white">
            <span className="material-symbols-rounded text-4xl text-m3-sys-primary animate-spin">
              progress_activity
            </span>
            <div className="text-center space-y-1">
              <div className="text-sm font-bold text-white">Génération du rendu HD...</div>
              <div className="text-xs text-neutral-400">Capture pixel-perfect de la zone d'exportation</div>
            </div>
          </div>
        ) : exportPreviewData ? (
          <div
            onClick={e => e.stopPropagation()}
            className="relative cursor-default max-w-full flex items-center justify-center transition-transform"
            style={{
              transform: zoomMode === 'custom' ? `scale(${zoomScale})` : undefined,
              transformOrigin: 'center center'
            }}
          >
            {/* Conteneur avec damier de transparence pour afficher fidèlement le canal alpha */}
            <div className="checkerboard-pattern rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/15">
              <img
                src={exportPreviewData.dataUrl}
                alt="Rendu de l'export"
                className={`block transition-all ${
                  zoomMode === 'fit'
                    ? 'max-h-[calc(100vh-140px)] max-w-[calc(100vw-48px)] object-contain w-auto h-auto'
                    : zoomMode === 'actual'
                    ? 'w-auto h-auto'
                    : 'w-auto h-auto'
                }`}
                style={
                  zoomMode === 'actual'
                    ? { width: `${exportPreviewData.targetWidth}px`, height: `${exportPreviewData.targetHeight}px` }
                    : undefined
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 text-neutral-400 bg-neutral-900/90 p-8 rounded-2xl border border-neutral-800">
            <span className="material-symbols-rounded text-4xl text-neutral-500">image_not_supported</span>
            <div className="text-sm">Aucun rendu disponible</div>
            <button
              onClick={openExportPreview}
              className="px-4 py-2 rounded-full bg-m3-sys-primary text-white text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
            >
              Générer l'aperçu
            </button>
          </div>
        )}
      </main>

      {/* 3. Pied de page discret d'information */}
      <footer className="h-10 px-4 bg-neutral-950/80 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 flex-shrink-0">
        <span className="truncate">
          Fidélité garantie : capture haute résolution avec typographie, ombres et transparence alpha intégrale.
        </span>
        <span className="hidden sm:inline font-mono text-neutral-500">
          Touche Échap ou clic extérieur pour fermer
        </span>
      </footer>
    </div>
  );
};
