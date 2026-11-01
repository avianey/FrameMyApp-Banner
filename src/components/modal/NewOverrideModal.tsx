import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BundleItem, BannerOverrideConfig, BannerMasterConfig } from '../../types';
import { serializeCanvasToOverride } from '../../utils/templateEngine';
import { convertUrlsToRelativeAssetPaths } from '../../utils/assetManager';
import { stringifyYaml } from '../../utils/yamlHelper';
import {
  writeTextToDirectory,
  verifyDirectoryPermission,
  downloadFile,
  getDirectoryHandleFromIdb,
  saveDirectoryHandleToIdb
} from '../../utils/bundleIo';

interface NewOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOverrideModal: React.FC<NewOverrideModalProps> = ({ isOpen, onClose }) => {
  const { loadedBundle, setLoadedBundle, state, showSnackbar, applyBundleItem } = useEditor();

  const [slug, setSlug] = useState('01_hero');
  const [name, setName] = useState('Surcharge Visuelle');
  const [includeCurrentDiff, setIncludeCurrentDiff] = useState(true);

  useEffect(() => {
    if (!isOpen || !loadedBundle) return;
    // Pré-remplir avec un slug pertinent si des variantes existent déjà sans override
    const existingSlugs = new Set(Object.keys(loadedBundle.overrides || {}));
    const unmatchedVariant = loadedBundle.variants.find(v => !existingSlugs.has(v.slug));
    if (unmatchedVariant) {
      setSlug(unmatchedVariant.slug);
      setName(`Override — ${unmatchedVariant.slug}`);
    } else {
      const nextIdx = existingSlugs.size + 1;
      const padded = String(nextIdx).padStart(2, '0');
      setSlug(`${padded}_override`);
      setName(`Override ${padded}`);
    }
  }, [isOpen, loadedBundle]);

  if (!isOpen || !loadedBundle) return null;

  const existingVariantSlugs = Array.from(new Set(loadedBundle.variants.map(v => v.slug)));

  const handleCreate = async () => {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_') || 'override';
    const relativePath = `overrides/${cleanSlug}.yml`;

    const tempItem: BundleItem = {
      id: `override_${cleanSlug}`,
      type: 'override',
      path: relativePath,
      slug: cleanSlug,
      name: name.trim() || cleanSlug,
      rawContent: '',
      config: { name: name.trim() || cleanSlug }
    };

    let overrideConfig: BannerOverrideConfig = {
      name: tempItem.name
    };

    if (includeCurrentDiff && loadedBundle.master?.config) {
      overrideConfig = convertUrlsToRelativeAssetPaths(
        serializeCanvasToOverride(
          tempItem,
          state.background,
          state.elements,
          state.exportZone,
          loadedBundle.master.config as BannerMasterConfig,
          state.canvasWidth,
          state.canvasHeight
        ),
        loadedBundle.assets
      );
    }

    const yamlContent = stringifyYaml(overrideConfig);

    let dirHandle = loadedBundle.directoryHandle;
    if (!dirHandle) {
      dirHandle = await getDirectoryHandleFromIdb();
      if (dirHandle) {
        loadedBundle.directoryHandle = dirHandle;
      }
    }

    const hasFsSupport = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    if (!dirHandle && hasFsSupport) {
      try {
        dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'desktop'
        });
        if (dirHandle) {
          loadedBundle.directoryHandle = dirHandle;
          saveDirectoryHandleToIdb(dirHandle);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.warn('showDirectoryPicker failed:', e);
        }
      }
    }

    let savedOnDisk = false;
    if (dirHandle) {
      try {
        await verifyDirectoryPermission(dirHandle, true);
        await writeTextToDirectory(dirHandle, relativePath, yamlContent);
        savedOnDisk = true;
      } catch (err: any) {
        console.error('Erreur lors de la création de l’override sur le FS:', err);
      }
    } else {
      downloadFile(`${cleanSlug}.yml`, yamlContent, 'text/yaml');
    }

    const newOverrideItem: BundleItem = {
      ...tempItem,
      rawContent: yamlContent,
      config: overrideConfig
    };

    const updatedBundle = {
      ...loadedBundle,
      overrides: {
        ...(loadedBundle.overrides || {}),
        [cleanSlug]: newOverrideItem
      }
    };

    setLoadedBundle(updatedBundle);
    applyBundleItem(newOverrideItem, updatedBundle);

    if (savedOnDisk) {
      showSnackbar(`Override créé et enregistré dans ${relativePath}`, 'check_circle');
    } else {
      showSnackbar(`Override créé : ${newOverrideItem.name}`, 'tune');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-m3-3 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl leading-none">tune</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-m3-sys-onSurface">
                Créer un Nouvel Override
              </h3>
              <p className="text-xs text-m3-sys-onSurfaceVariant">
                Surchargez la mise en page, le fond ou les images pour un slug donné
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant cursor-pointer"
          >
            <span className="material-symbols-rounded text-base leading-none">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant flex items-center justify-between">
              <span>Identifiant / Slug (ex: 01_hero, dark_mode)</span>
              <span className="font-mono text-[10px] text-amber-400">
                overrides/{slug.trim().toLowerCase().replace(/[^a-z0-9_-]/gi, '_') || 'override'}.yml
              </span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="01_hero"
              className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            {existingVariantSlugs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-m3-sys-onSurfaceVariant">Slugs de variantes existants :</span>
                {existingVariantSlugs.map(vSlug => (
                  <button
                    key={vSlug}
                    type="button"
                    onClick={() => {
                      setSlug(vSlug);
                      if (!name || name.startsWith('Override')) {
                        setName(`Override — ${vSlug}`);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition-all cursor-pointer border ${
                      slug === vSlug
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                        : 'bg-m3-sys-surfaceContainer text-m3-sys-onSurfaceVariant border-m3-sys-outlineVariant/40 hover:border-amber-500/40'
                    }`}
                  >
                    {vSlug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nom lisible */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
              Titre / Nom de l'override
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mise en page Hero / Thème Sombre"
              className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Option d'initialisation depuis le canvas actuel */}
          <label className="flex items-start space-x-3 p-3.5 rounded-2xl bg-m3-sys-surfaceContainer border border-m3-sys-outlineVariant/30 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCurrentDiff}
              onChange={e => setIncludeCurrentDiff(e.target.checked)}
              className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-m3-sys-onSurface block">
                Initialiser avec les différences actuelles du canvas
              </span>
              <span className="text-[11px] text-m3-sys-onSurfaceVariant">
                Si vous avez déjà modifié le canvas par rapport au Master, ces différences seront enregistrées dans l'override. Vous pourrez aussi les modifier directement après création.
              </span>
            </div>
          </label>

          {/* Explication cascade */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-m3-sys-onSurfaceVariant flex items-start space-x-2">
            <span className="material-symbols-rounded text-base text-amber-400 flex-shrink-0 mt-0.5">
              info
            </span>
            <p className="leading-relaxed">
              Dans la cascade <strong>Master → Override → Variante</strong>, un fichier <code>overrides/&lt;slug&gt;.yml</code> s'applique automatiquement à toutes les variantes portant le même <code>&lt;slug&gt;</code> (ex: <code>variants/fr/&lt;slug&gt;.yml</code>, <code>variants/en/&lt;slug&gt;.yml</code>).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-m3-sys-outlineVariant/50 text-xs font-semibold hover:bg-m3-sys-surfaceContainerHighest cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-m3-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span className="material-symbols-rounded text-sm">add</span>
            <span>Créer l'override</span>
          </button>
        </div>
      </div>
    </div>
  );
};
