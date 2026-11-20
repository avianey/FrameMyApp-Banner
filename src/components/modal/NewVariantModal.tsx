import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import {
  BundleItem,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig,
  TextElementModel
} from '../../types';
import { resolveComposition } from '../../utils/templateEngine';
import { convertUrlsToRelativeAssetPaths } from '../../utils/assetManager';
import { stringifyYaml } from '../../utils/yamlHelper';
import {
  writeTextToDirectory,
  verifyDirectoryPermission,
  downloadFile,
  getDirectoryHandleFromIdb,
  saveDirectoryHandleToIdb
} from '../../utils/bundleIo';

interface NewVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Slug d'override pré-sélectionné (ex: bouton "Décliner" sur un override) */
  initialOverrideSlug?: string | null;
  /** Variante source à dupliquer (ex: bouton "Dupliquer" sur une variante) */
  duplicateFromVariant?: BundleItem | null;
}

function normalizeSubPath(raw: string): string {
  return raw
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^variants\//i, '')
    .replace(/\/+/g, '/');
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_');
}

export const NewVariantModal: React.FC<NewVariantModalProps> = ({
  isOpen,
  onClose,
  initialOverrideSlug = null,
  duplicateFromVariant = null
}) => {
  const { loadedBundle, setLoadedBundle, state, showSnackbar, applyBundleItem } = useEditor();

  const isDuplicateMode = Boolean(duplicateFromVariant);
  const subPathInputRef = useRef<HTMLInputElement>(null);
  const manuallyEditedContentKeysRef = useRef<Set<string>>(new Set());
  const initialDuplicateContentRef = useRef<Record<string, string>>({});

  const [selectedOverrideSlug, setSelectedOverrideSlug] = useState('');
  const [subPath, setSubPath] = useState('fr');
  const [slug, setSlug] = useState('01_promo');
  const [name, setName] = useState('Nouvelle Variante');
  const [contentValues, setContentValues] = useState<Record<string, string>>({});

  const overridesList = useMemo<BundleItem[]>(() => {
    if (!loadedBundle?.overrides) return [];
    return Object.values(loadedBundle.overrides);
  }, [loadedBundle]);

  // Résout les éléments texte de référence selon le contexte (Master + Override éventuel + Variante source éventuelle)
  const resolveTextElementsForContext = (
    overrideSlug?: string | null,
    variantItem?: BundleItem | null
  ): TextElementModel[] => {
    const masterConfig = loadedBundle?.master?.config as BannerMasterConfig | undefined;
    if (masterConfig) {
      const overrideItem = overrideSlug ? loadedBundle?.overrides?.[overrideSlug] : undefined;
      const resolved = resolveComposition(
        masterConfig,
        overrideItem?.config as BannerOverrideConfig | undefined,
        variantItem?.config as BannerVariantConfig | undefined,
        loadedBundle?.assets || {},
        variantItem?.path || overrideItem?.path || loadedBundle?.master?.path
      );
      return resolved.elements.filter((el): el is TextElementModel => el.type === 'text');
    }
    return state.elements.filter((el): el is TextElementModel => el.type === 'text');
  };

  const baseTextElements = useMemo<TextElementModel[]>(() => {
    if (!isOpen || !loadedBundle) return [];
    return resolveTextElementsForContext(
      selectedOverrideSlug || null,
      duplicateFromVariant || null
    );
  }, [isOpen, loadedBundle, selectedOverrideSlug, duplicateFromVariant, state.elements]);

  // Initialisation à chaque ouverture de la modale
  useEffect(() => {
    if (!isOpen || !loadedBundle) return;

    manuallyEditedContentKeysRef.current = new Set();
    const overridesMap = loadedBundle.overrides || {};

    if (duplicateFromVariant) {
      const sourceSlug = duplicateFromVariant.slug;
      const matchingOverrideSlug = overridesMap[sourceSlug] ? sourceSlug : '';
      const sourceLang = normalizeSubPath(duplicateFromVariant.lang || '');

      setSelectedOverrideSlug(matchingOverrideSlug);
      setSlug(sourceSlug);
      setName(duplicateFromVariant.name || sourceSlug);
      setSubPath(sourceLang);

      const resolvedTexts = resolveTextElementsForContext(
        matchingOverrideSlug || null,
        duplicateFromVariant
      );
      const initContent: Record<string, string> = {};
      for (const el of resolvedTexts) {
        const key = el.customId || el.id;
        initContent[key] = el.text;
      }
      initialDuplicateContentRef.current = { ...initContent };
      setContentValues(initContent);

      // Focus sur le champ chemin pour encourager le choix du nouveau chemin
      setTimeout(() => {
        subPathInputRef.current?.focus();
        subPathInputRef.current?.select();
      }, 0);
      return;
    }

    initialDuplicateContentRef.current = {};

    const validInitialOverride =
      initialOverrideSlug && overridesMap[initialOverrideSlug]
        ? overridesMap[initialOverrideSlug]
        : null;

    if (validInitialOverride) {
      setSelectedOverrideSlug(validInitialOverride.slug);
      setSlug(validInitialOverride.slug);
      setName(validInitialOverride.name);

      // Proposer un chemin existant disponible pour ce slug, sinon 'fr'
      const existingSubPaths = Array.from(
        new Set(
          loadedBundle.variants
            .map(v => normalizeSubPath(v.lang || ''))
            .filter(Boolean)
        )
      );
      const isSlugUsedInPath = (candidatePath: string) =>
        loadedBundle.variants.some(
          v =>
            normalizeSubPath(v.lang || '').toLowerCase() === candidatePath.toLowerCase() &&
            v.slug.toLowerCase() === validInitialOverride.slug.toLowerCase()
        );
      const suggestedPath =
        !isSlugUsedInPath('fr')
          ? 'fr'
          : existingSubPaths.find(p => !isSlugUsedInPath(p)) || 'fr';
      setSubPath(suggestedPath);

      const resolvedTexts = resolveTextElementsForContext(validInitialOverride.slug, null);
      const initContent: Record<string, string> = {};
      for (const el of resolvedTexts) {
        const key = el.customId || el.id;
        initContent[key] = el.text;
      }
      setContentValues(initContent);
    } else {
      setSelectedOverrideSlug('');
      setSubPath('fr');
      setSlug('01_promo');
      setName('Nouvelle Variante');

      const resolvedTexts = resolveTextElementsForContext(null, null);
      const initContent: Record<string, string> = {};
      for (const el of resolvedTexts) {
        const key = el.customId || el.id;
        initContent[key] = el.text;
      }
      setContentValues(initContent);
    }
  }, [isOpen, loadedBundle, initialOverrideSlug, duplicateFromVariant]);

  const cleanSubPath = normalizeSubPath(subPath);
  const cleanSlug = isDuplicateMode
    ? duplicateFromVariant?.slug || ''
    : normalizeSlug(slug);

  const relativePath =
    cleanSubPath && cleanSlug ? `variants/${cleanSubPath}/${cleanSlug}.yml` : '';

  const isPathTaken = useMemo(() => {
    if (!loadedBundle || !cleanSubPath || !cleanSlug) return false;
    const targetLower = `variants/${cleanSubPath}/${cleanSlug}.yml`.toLowerCase();
    return loadedBundle.variants.some(v => {
      const existingPath = v.path.replace(/\\/g, '/').toLowerCase();
      const existingLang = normalizeSubPath(v.lang || '').toLowerCase();
      return (
        existingPath === targetLower ||
        (existingLang === cleanSubPath.toLowerCase() &&
          v.slug.toLowerCase() === cleanSlug.toLowerCase())
      );
    });
  }, [loadedBundle, cleanSubPath, cleanSlug]);

  // Suggestions rapides de chemins déjà présents dans le bundle mais libres pour ce slug
  const availableBundleSubPaths = useMemo(() => {
    if (!loadedBundle || !cleanSlug) return [];
    const uniquePaths = Array.from(
      new Set(
        loadedBundle.variants
          .map(v => normalizeSubPath(v.lang || ''))
          .filter(Boolean)
      )
    );
    return uniquePaths.filter(candidate => {
      const targetLower = `variants/${candidate}/${cleanSlug}.yml`.toLowerCase();
      return !loadedBundle.variants.some(v => {
        const existingPath = v.path.replace(/\\/g, '/').toLowerCase();
        const existingLang = normalizeSubPath(v.lang || '').toLowerCase();
        return (
          existingPath === targetLower ||
          (existingLang === candidate.toLowerCase() &&
            v.slug.toLowerCase() === cleanSlug.toLowerCase())
        );
      });
    });
  }, [loadedBundle, cleanSlug]);

  // Résumé des propriétés non textuelles qui seront dupliquées
  const duplicatedExtraProps = useMemo(() => {
    if (!duplicateFromVariant?.config) return [];
    const cfg = duplicateFromVariant.config as BannerVariantConfig;
    const summary: string[] = [];
    if (cfg.background && Object.keys(cfg.background).length > 0) summary.push('background');
    if (cfg.elements) {
      const count = Array.isArray(cfg.elements)
        ? cfg.elements.length
        : Object.keys(cfg.elements).length;
      if (count > 0) summary.push(`elements (${count})`);
    }
    if (cfg.removedElements && cfg.removedElements.length > 0) {
      summary.push(`removedElements (${cfg.removedElements.length})`);
    }
    if (cfg.elementOrder && cfg.elementOrder.length > 0) {
      summary.push('elementOrder');
    }
    if (cfg.images && Object.keys(cfg.images).length > 0) {
      summary.push(`images (${Object.keys(cfg.images).length})`);
    }
    if (cfg.exportZone && Object.keys(cfg.exportZone).length > 0) summary.push('exportZone');
    if (cfg.canvasWidth || cfg.canvasHeight || cfg.width || cfg.height) summary.push('dimensions');
    if (cfg.metadata && Object.keys(cfg.metadata).length > 0) summary.push('metadata');
    return summary;
  }, [duplicateFromVariant]);

  if (!isOpen || !loadedBundle) return null;

  const canSubmit = Boolean(cleanSubPath && cleanSlug && !isPathTaken);

  const handleOverrideChange = (newOverrideSlug: string) => {
    setSelectedOverrideSlug(newOverrideSlug);
    const overrideItem = newOverrideSlug ? loadedBundle.overrides?.[newOverrideSlug] : undefined;

    if (overrideItem) {
      setSlug(overrideItem.slug);
      setName(overrideItem.name);
    }

    // Mettre à jour les champs texte non édités manuellement avec le contexte du nouvel override
    const nextTexts = resolveTextElementsForContext(newOverrideSlug || null, null);
    setContentValues(prev => {
      const next = { ...prev };
      for (const el of nextTexts) {
        const key = el.customId || el.id;
        if (!manuallyEditedContentKeysRef.current.has(key)) {
          next[key] = el.text;
        }
      }
      return next;
    });
  };

  const handleSlugInputChange = (val: string) => {
    setSlug(val);
    const normalized = normalizeSlug(val);
    if (normalized && loadedBundle.overrides?.[normalized]) {
      setSelectedOverrideSlug(normalized);
    } else {
      setSelectedOverrideSlug('');
    }
  };

  const handleContentChange = (key: string, val: string) => {
    manuallyEditedContentKeysRef.current.add(key);
    setContentValues(prev => ({ ...prev, [key]: val }));
  };

  const handleCreate = async () => {
    if (!canSubmit) return;

    let variantConfig: BannerVariantConfig;

    if (isDuplicateMode && duplicateFromVariant) {
      // Cloner intégralement toutes les propriétés de la variante source
      const clonedConfig: BannerVariantConfig = JSON.parse(
        JSON.stringify(duplicateFromVariant.config || {})
      );
      clonedConfig.name = name.trim() || clonedConfig.name || `${cleanSubPath} - ${cleanSlug}`;

      // Appliquer les éventuelles modifications de textes faites dans la modale
      // tout en préservant exactement le content source si non modifié
      const nextContent: Record<string, string> = { ...(clonedConfig.content || {}) };
      let hasEditedContent = false;
      for (const [key, val] of Object.entries(contentValues)) {
        if (val !== initialDuplicateContentRef.current[key]) {
          nextContent[key] = val;
          hasEditedContent = true;
        }
      }
      if (hasEditedContent || clonedConfig.content) {
        if (Object.keys(nextContent).length > 0) {
          clonedConfig.content = nextContent;
        } else {
          delete clonedConfig.content;
        }
      }

      variantConfig = convertUrlsToRelativeAssetPaths(clonedConfig, loadedBundle.assets);
    } else {
      variantConfig = {
        name: name.trim() || `${cleanSubPath} - ${cleanSlug}`,
        content: { ...contentValues }
      };
    }

    const yamlContent = stringifyYaml(variantConfig);

    // Persist directly to filesystem if directoryHandle is available
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
        console.error('Erreur lors de la création du fichier sur le FS:', err);
      }
    } else {
      downloadFile(`${cleanSlug}.yml`, yamlContent, 'text/yaml');
    }

    const newVariantItem: BundleItem = {
      id: `variant_${cleanSubPath.replace(/[^a-z0-9]/gi, '_')}_${cleanSlug}_${Date.now()}`,
      type: 'variant',
      path: relativePath,
      slug: cleanSlug,
      lang: cleanSubPath,
      name: variantConfig.name || cleanSlug,
      rawContent: yamlContent,
      config: variantConfig
    };

    const updatedVariants = [...loadedBundle.variants, newVariantItem].sort((a, b) => {
      if (a.lang && b.lang && a.lang !== b.lang) {
        return a.lang.localeCompare(b.lang);
      }
      return a.slug.localeCompare(b.slug);
    });

    const updatedBundle = {
      ...loadedBundle,
      variants: updatedVariants
    };

    setLoadedBundle(updatedBundle);
    applyBundleItem(newVariantItem, updatedBundle);

    if (isDuplicateMode) {
      showSnackbar(
        savedOnDisk
          ? `Variante dupliquée et enregistrée dans ${relativePath}`
          : `Variante dupliquée : ${newVariantItem.name}`,
        'content_copy'
      );
    } else if (savedOnDisk) {
      showSnackbar(`Variante créée et enregistrée dans ${relativePath}`, 'check_circle');
    } else {
      showSnackbar(`Variante créée : ${newVariantItem.name}`, 'add_circle');
    }
    onClose();
  };

  const inheritedOverride = selectedOverrideSlug
    ? loadedBundle.overrides?.[selectedOverrideSlug]
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-m3-3 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-rounded text-xl leading-none">
                {isDuplicateMode ? 'content_copy' : 'add_circle'}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-m3-sys-onSurface">
                {isDuplicateMode ? 'Dupliquer la Variante' : 'Créer une Nouvelle Variante'}
              </h3>
              <p className="text-xs text-m3-sys-onSurfaceVariant truncate">
                {isDuplicateMode && duplicateFromVariant
                  ? `Copie de ${duplicateFromVariant.path} vers un nouveau chemin`
                  : 'Déclinez vos textes dans une nouvelle langue ou cible'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant cursor-pointer flex-shrink-0"
          >
            <span className="material-symbols-rounded text-base leading-none">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
          {/* Dropdown Override hérité (affichée s'il existe au moins un override) */}
          {overridesList.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant flex items-center space-x-1.5">
                <span className="material-symbols-rounded text-sm text-amber-400">tune</span>
                <span>Override hérité</span>
              </label>
              <select
                value={selectedOverrideSlug}
                onChange={e => handleOverrideChange(e.target.value)}
                disabled={isDuplicateMode}
                className={`w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm text-m3-sys-onSurface focus:ring-2 focus:ring-m3-sys-primary focus:outline-none ${
                  isDuplicateMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <option value="">Sans override hérité</option>
                {overridesList.map(ov => (
                  <option key={ov.id} value={ov.slug}>
                    {ov.name} ({ov.slug}.yml)
                  </option>
                ))}
              </select>
              {inheritedOverride && (
                <p className="text-[11px] text-amber-400/90 flex items-center space-x-1">
                  <span className="material-symbols-rounded text-xs">link</span>
                  <span>
                    Hérite de <span className="font-mono font-semibold">overrides/{inheritedOverride.slug}.yml</span> via le même identifiant.
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Chemin & Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
                Chemin (ex: feature/fr)
              </label>
              <input
                ref={subPathInputRef}
                type="text"
                value={subPath}
                onChange={e => setSubPath(e.target.value)}
                placeholder="feature/fr"
                className={`w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border text-sm font-mono focus:ring-2 focus:outline-none ${
                  isPathTaken || !cleanSubPath
                    ? 'border-rose-500/70 focus:ring-rose-500'
                    : 'border-m3-sys-outlineVariant/50 focus:ring-m3-sys-primary'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant flex items-center justify-between">
                <span>Identifiant / Slug</span>
                {isDuplicateMode && (
                  <span className="text-[10px] font-normal text-m3-sys-onSurfaceVariant/70">
                    Repris
                  </span>
                )}
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugInputChange(e.target.value)}
                disabled={isDuplicateMode}
                placeholder="01_promo"
                className={`w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono focus:ring-2 focus:ring-m3-sys-primary focus:outline-none ${
                  isDuplicateMode ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Feedback chemin cible / erreur de collision / suggestions */}
          <div className="space-y-1.5 -mt-1">
            {!cleanSubPath ? (
              <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                <span className="material-symbols-rounded text-xs">error</span>
                <span>Veuillez renseigner un chemin cible (ex: en, de, feature/en).</span>
              </p>
            ) : !cleanSlug ? (
              <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                <span className="material-symbols-rounded text-xs">error</span>
                <span>Veuillez renseigner un identifiant (slug) valide.</span>
              </p>
            ) : isPathTaken ? (
              <p className="text-[11px] text-rose-400 flex items-center space-x-1">
                <span className="material-symbols-rounded text-xs">error</span>
                <span>
                  Ce chemin est déjà pris : <span className="font-mono font-semibold">{relativePath}</span>
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-m3-sys-onSurfaceVariant flex items-center space-x-1">
                <span className="material-symbols-rounded text-xs text-emerald-400">description</span>
                <span>
                  Fichier cible : <span className="font-mono text-m3-sys-onSurface">{relativePath}</span>
                </span>
              </p>
            )}

            {availableBundleSubPaths.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-m3-sys-onSurfaceVariant">
                  Chemins libres :
                </span>
                {availableBundleSubPaths.map(candidate => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setSubPath(candidate)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                      cleanSubPath === candidate
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold'
                        : 'bg-m3-sys-surfaceContainer border-m3-sys-outlineVariant/40 text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface hover:bg-m3-sys-surfaceContainerHighest'
                    }`}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nom lisible */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
              Titre / Nom de la variante
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="01 — Promo Allemand (DE)"
              className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
            />
          </div>

          {/* Récapitulatif des propriétés dupliquées en mode duplication */}
          {isDuplicateMode && duplicatedExtraProps.length > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-2 text-[11px] text-emerald-300">
              <span className="material-symbols-rounded text-sm flex-shrink-0 mt-0.5">
                inventory_2
              </span>
              <span>
                Toutes les propriétés de la variante source seront dupliquées :{' '}
                <span className="font-mono font-semibold">
                  {duplicatedExtraProps.join(', ')}
                </span>
                .
              </span>
            </div>
          )}

          {/* Text Overrides based on customIds */}
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant">
                Surcharge des Textes (par customId)
              </label>
              <span className="text-[10px] text-m3-sys-onSurfaceVariant font-mono">
                {baseTextElements.length} champs
              </span>
            </div>

            {baseTextElements.map(el => {
              const key = el.customId || el.id;
              return (
                <div
                  key={el.id}
                  className="space-y-1 bg-m3-sys-surfaceContainer p-3 rounded-2xl border border-m3-sys-outlineVariant/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-m3-sys-primary">
                      {key}
                    </span>
                    <span className="text-[10px] text-m3-sys-onSurfaceVariant">
                      {isDuplicateMode ? 'Source : ' : 'Original : '}
                      {el.text.substring(0, 20)}
                      {el.text.length > 20 ? '...' : ''}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={contentValues[key] ?? ''}
                    onChange={e => handleContentChange(key, e.target.value)}
                    className="w-full p-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/40 text-xs focus:ring-1 focus:ring-m3-sys-primary focus:outline-none resize-none"
                    placeholder={`Nouveau texte pour ${key}...`}
                  />
                </div>
              );
            })}
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
            disabled={!canSubmit}
            className={`px-5 py-2.5 rounded-full text-xs font-bold shadow-m3-1 transition-all flex items-center space-x-1.5 ${
              canSubmit
                ? 'bg-m3-sys-primary text-white hover:brightness-110 active:scale-95 cursor-pointer'
                : 'bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurfaceVariant/50 cursor-not-allowed shadow-none'
            }`}
          >
            <span className="material-symbols-rounded text-sm">
              {isDuplicateMode ? 'content_copy' : 'add'}
            </span>
            <span>{isDuplicateMode ? 'Dupliquer la variante' : 'Créer la variante'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
