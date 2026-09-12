import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { BundleItem, BannerVariantConfig, TextElementModel } from '../../types';
import { stringifyYaml } from '../../utils/yamlHelper';

interface NewVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewVariantModal: React.FC<NewVariantModalProps> = ({ isOpen, onClose }) => {
  const { loadedBundle, setLoadedBundle, state, showSnackbar, applyBundleItem } = useEditor();

  const [lang, setLang] = useState('de');
  const [slug, setSlug] = useState('01_promo');
  const [name, setName] = useState('Nouvelle Variante');

  // Text inputs mapped by customId
  const textElements = state.elements.filter(el => el.type === 'text') as TextElementModel[];
  const [contentValues, setContentValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const el of textElements) {
      const key = el.customId || el.id;
      init[key] = el.text;
    }
    return init;
  });

  if (!isOpen || !loadedBundle) return null;

  const handleContentChange = (key: string, val: string) => {
    setContentValues(prev => ({ ...prev, [key]: val }));
  };

  const handleCreate = () => {
    const cleanLang = lang.trim().toLowerCase() || 'fr';
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_]/gi, '_') || 'variant';
    const path = `variants/${cleanLang}/${cleanSlug}.yml`;

    const variantConfig: BannerVariantConfig = {
      name: name || `${cleanLang.toUpperCase()} - ${cleanSlug}`,
      content: { ...contentValues }
    };

    const newVariantItem: BundleItem = {
      id: `variant_${cleanLang}_${cleanSlug}_${Date.now()}`,
      type: 'variant',
      path,
      slug: cleanSlug,
      lang: cleanLang,
      name: variantConfig.name || cleanSlug,
      rawContent: stringifyYaml(variantConfig),
      config: variantConfig
    };

    const updatedVariants = [...loadedBundle.variants, newVariantItem].sort((a, b) => {
      if (a.lang && b.lang && a.lang !== b.lang) {
        return a.lang.localeCompare(b.lang);
      }
      return a.slug.localeCompare(b.slug);
    });

    setLoadedBundle({
      ...loadedBundle,
      variants: updatedVariants
    });

    applyBundleItem(newVariantItem);
    showSnackbar(`Variante créée et appliquée : ${newVariantItem.name}`, 'add_circle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-m3-3 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-m3-sys-outlineVariant/30 flex items-center justify-between bg-m3-sys-surfaceContainer">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-rounded text-xl leading-none">add_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-m3-sys-onSurface">
                Créer une Nouvelle Variante
              </h3>
              <p className="text-xs text-m3-sys-onSurfaceVariant">
                Déclinez vos textes dans une nouvelle langue ou cible
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
          {/* Langue & Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
                Code Langue (ex: fr, en, de, es)
              </label>
              <input
                type="text"
                value={lang}
                onChange={e => setLang(e.target.value)}
                placeholder="de"
                className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-m3-sys-onSurfaceVariant">
                Identifiant / Slug (en anglais)
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="01_promo"
                className="w-full px-3 py-2 bg-m3-sys-surfaceContainerHighest rounded-xl border border-m3-sys-outlineVariant/50 text-sm font-mono focus:ring-2 focus:ring-m3-sys-primary focus:outline-none"
              />
            </div>
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

          {/* Text Overrides based on customIds */}
          <div className="space-y-3 pt-2 border-t border-m3-sys-outlineVariant/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant">
                Surcharge des Textes (par customId)
              </label>
              <span className="text-[10px] text-m3-sys-onSurfaceVariant font-mono">
                {textElements.length} champs
              </span>
            </div>

            {textElements.map(el => {
              const key = el.customId || el.id;
              return (
                <div key={el.id} className="space-y-1 bg-m3-sys-surfaceContainer p-3 rounded-2xl border border-m3-sys-outlineVariant/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-m3-sys-primary">
                      {key}
                    </span>
                    <span className="text-[10px] text-m3-sys-onSurfaceVariant">
                      Original : {el.text.substring(0, 20)}...
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
            className="px-5 py-2.5 rounded-full bg-m3-sys-primary text-white text-xs font-bold shadow-m3-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <span className="material-symbols-rounded text-sm">add</span>
            <span>Créer la variante</span>
          </button>
        </div>
      </div>
    </div>
  );
};
