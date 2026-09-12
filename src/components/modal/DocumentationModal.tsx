import React, { useState, useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import docMarkdown from '../../../docs/DOCUMENTATION.md?raw';

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string | null;
}

const slugify = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&#39;/g, '')
    .replace(/&amp;/g, '')
    .replace(/&quot;/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  initialSectionId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fermeture par la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extraction automatique du sommaire depuis les titres H2 et H3
  const headings = useMemo<HeadingItem[]>(() => {
    const lines = docMarkdown.split('\n');
    const items: HeadingItem[] = [];
    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const text = h2Match[1].trim();
        const cleanText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        const id = slugify(cleanText);
        items.push({ id, text: cleanText, level: 2 });
      } else {
        const h3Match = line.match(/^###\s+(.+)$/);
        if (h3Match) {
          const text = h3Match[1].trim();
          const cleanText = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
          const id = slugify(cleanText);
          items.push({ id, text: cleanText, level: 3 });
        }
      }
    }
    return items;
  }, []);

  // Transformation Markdown vers HTML avec injection des identifiants d'ancrage
  const htmlContent = useMemo(() => {
    const rawHtml = marked.parse(docMarkdown, { async: false, gfm: true, breaks: true }) as string;

    // Injecter les IDs pour le scroll ciblé
    return rawHtml.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_, level, content) => {
      const id = slugify(content);
      return `<h${level} id="${id}">${content}</h${level}>`;
    });
  }, []);

  // Défilement fluide vers une section
  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const container = contentRef.current;
    const targetElement = document.getElementById(id);
    if (targetElement && container) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Défilement initial si spécifié
  useEffect(() => {
    if (isOpen && initialSectionId) {
      setTimeout(() => {
        scrollToSection(initialSectionId);
      }, 150);
    }
  }, [isOpen, initialSectionId]);

  // Filtrage du sommaire selon la recherche
  const filteredHeadings = useMemo(() => {
    if (!searchQuery.trim()) return headings;
    const query = searchQuery.toLowerCase();
    return headings.filter((h) => h.text.toLowerCase().includes(query));
  }, [headings, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 select-none animate-modal">
      <div className="bg-m3-sys-surface text-m3-sys-onSurface rounded-3xl w-full max-w-6xl h-[92vh] shadow-m3-4 border border-m3-sys-outlineVariant/40 flex flex-col overflow-hidden">
        {/* Barre d'en-tête de la documentation */}
        <header className="h-16 px-4 sm:px-6 bg-m3-sys-surfaceContainer flex items-center justify-between border-b border-m3-sys-outlineVariant/30 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Masquer le sommaire' : 'Afficher le sommaire'}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-m3-sys-outlineVariant/40 bg-m3-sys-surfaceContainerLow hover:bg-m3-sys-surfaceContainerHighest text-m3-sys-onSurface active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-rounded text-xl leading-none">
                {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <div className="w-9 h-9 rounded-full bg-m3-sys-primaryContainer flex items-center justify-center text-m3-sys-onPrimaryContainer flex-shrink-0">
              <span className="material-symbols-rounded text-xl leading-none">menu_book</span>
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-m3-sys-onSurface leading-tight truncate">
                Documentation & Guide d'Utilisation
              </h2>
              <p className="text-[11px] sm:text-xs text-m3-sys-onSurfaceVariant truncate hidden xs:block">
                Canevas, Transparence Alpha, Templates YAML, Overrides & Batch Export
              </p>
            </div>
          </div>

          {/* Recherche rapide et fermeture */}
          <div className="flex items-center space-x-3">
            <div className="relative hidden md:flex items-center">
              <span className="material-symbols-rounded absolute left-3 text-lg text-m3-sys-onSurfaceVariant pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Rechercher un terme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-1.5 text-xs rounded-full bg-m3-sys-surfaceContainerLow border border-m3-sys-outlineVariant/40 text-m3-sys-onSurface placeholder-m3-sys-onSurfaceVariant/60 focus:outline-none focus:ring-2 focus:ring-m3-sys-primary w-52 lg:w-64 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-m3-sys-onSurfaceVariant hover:text-m3-sys-onSurface text-xs"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              )}
            </div>

            {/* Bouton Retour au Studio */}
            <button
              onClick={onClose}
              title="Fermer la documentation et retourner au studio"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-m3-sys-primary text-m3-sys-onPrimary text-xs font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-rounded text-base leading-none">arrow_back</span>
              <span className="hidden sm:inline">Retour au Studio</span>
            </button>
          </div>
        </header>

        {/* Corps principal : Volet Sommaire + Contenu Markdown */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sommaire interactif à gauche */}
          {isSidebarOpen && (
            <aside className="w-72 bg-m3-sys-surfaceContainerLow border-r border-m3-sys-outlineVariant/30 flex flex-col flex-shrink-0 overflow-hidden transition-all">
              <div className="p-3 border-b border-m3-sys-outlineVariant/20 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-m3-sys-onSurfaceVariant flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-base">format_list_bulleted</span>
                  Sommaire ({filteredHeadings.length})
                </span>
                {searchQuery && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer font-medium">
                    Filtré
                  </span>
                )}
              </div>
              <nav className="flex-1 p-2 overflow-y-auto space-y-0.5 text-xs select-none no-scrollbar">
                {filteredHeadings.map((heading) => {
                  const isActive = activeSectionId === heading.id;
                  const isH3 = heading.level === 3;
                  return (
                    <button
                      key={heading.id}
                      onClick={() => scrollToSection(heading.id)}
                      className={`w-full text-left rounded-lg transition-all cursor-pointer py-1.5 px-2.5 flex items-center justify-between ${
                        isH3 ? 'pl-5 text-m3-sys-onSurfaceVariant' : 'font-semibold text-m3-sys-onSurface'
                      } ${
                        isActive
                          ? 'bg-m3-sys-primaryContainer text-m3-sys-onPrimaryContainer font-bold shadow-sm'
                          : 'hover:bg-m3-sys-surfaceContainerHigh'
                      }`}
                    >
                      <span className="truncate">{heading.text}</span>
                      {isActive && (
                        <span className="material-symbols-rounded text-sm flex-shrink-0">
                          chevron_right
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Raccourcis rapides en bas de sommaire */}
              <div className="p-3 border-t border-m3-sys-outlineVariant/20 bg-m3-sys-surfaceContainer">
                <p className="text-[11px] text-m3-sys-onSurfaceVariant leading-relaxed">
                  💡 <strong>Astuce :</strong> Appuyez sur <kbd className="px-1 py-0.5 rounded bg-m3-sys-surfaceContainerHighest border border-m3-sys-outlineVariant/40 font-mono font-bold">Échap</kbd> pour revenir instantanément au Studio.
                </p>
              </div>
            </aside>
          )}

          {/* Conteneur principal du texte Markdown */}
          <main
            ref={contentRef}
            className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto select-text text-m3-sys-onSurface bg-m3-sys-surface"
          >
            <div
              className="max-w-4xl mx-auto markdown-doc"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </main>
        </div>
      </div>
    </div>
  );
};
