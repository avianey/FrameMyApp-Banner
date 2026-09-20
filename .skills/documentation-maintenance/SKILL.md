---
name: documentation-maintenance
description: Règle impérative et protocole opérationnel pour maintenir la documentation officielle (docs/DOCUMENTATION.md) et la page de documentation intégrée synchronisées avec chaque évolution de code, nouvelle fonctionnalité, modification de template, contrôles d'interface ou raccourcis dans FrameMyApp-Banner.
metadata:
  author: FrameMyApp
  version: 1.0.0
  category: Documentation
  last-updated: '2026-09-01'
  keywords:
    - FrameMyApp
    - Banner Studio
    - Documentation
    - Maintenance Impérative
    - Markdown
    - Templates
    - Usages
    - Canvas
    - UI Controls
    - CustomId
    - Batch Export
---

# Protocole Impératif de Maintenance de la Documentation (FrameMyApp-Banner)

Ce document formalise la **politique impérative absolue de documentation** pour le projet **FrameMyApp-Banner (Banner Studio)**.

Il s'applique à tout développeur et à tout agent IA intervenant sur le code source de l'application.

---

## 1. Règle d'Or d'Impérativité

> **RÈGLE ABSOLUE :**
> **Aucune tâche ou fonctionnalité touchant aux usages, aux outils, aux contrôles UI, au canevas, aux templates YAML ou aux raccourcis ne peut être considérée comme terminée sans la mise à jour immédiate, synchrone et exacte du fichier de documentation officielle [docs/DOCUMENTATION.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/DOCUMENTATION.md).**

L'application embarque une page de documentation interactive (accessible via le bouton `menu_book` dans l'en-tête et via le raccourci d'aide dans le volet latéral gauche) qui charge directement le fichier markdown `docs/DOCUMENTATION.md`. Toute désynchronisation entre le code et la documentation nuit directement à l'expérience utilisateur finale.

---

## 2. Matrice des Déclencheurs & Sections Cibles dans `docs/DOCUMENTATION.md`

Dès qu'un fichier de code source est modifié, appliquez systématiquement la grille de mise à jour suivante :

| Fichier / Composant Modifié | Nature du Changement | Section Cible dans `docs/DOCUMENTATION.md` | Action Requise |
|---|---|---|---|
| `src/components/Header.tsx`, `BottomBar.tsx` | Ajout/modification d'un bouton d'action, navigation, thème, zoom | **Section 1 : Vue d'Ensemble & Architecture de l'Interface** | Documenter le nouveau bouton, son icône, son rôle et son comportement. |
| `src/components/canvas/*` (`CanvasViewport`, `Artboard`, `SelectionHandles`) | Interactions souris, zoom, drag & drop, rotation, déplacement, redimensionnement | **Section 2 : Manipulation du Canevas & des Éléments** | Mettre à jour les explications de manipulation, les poignées et le comportement interactif. |
| `src/utils/color.ts`, `BackgroundControls.tsx`, `ColorAlphaPicker.tsx` | Transparence Alpha, formats HEX/HEX8/RGBA, dégradés, modes de fond | **Section 3 : Gestion des Couleurs, de la Transparence Alpha & des Fonds** | Mettre à jour les spécifications de couleur, le curseur d'opacité et les options d'arrière-plan. |
| `src/components/drawer/TextControls.tsx`, `TextElement.tsx` | Typographie, polices Google Fonts, glow, shadow, stroke, espacements | **Section 4 : Édition Typographique & Textes** | Documenter les nouveaux champs de texte, effets visuels et curseurs. |
| `src/components/drawer/ShapeControls.tsx`, `ShapeElement.tsx` | Nouveaux types de formes, arrondis, contours, textures d'image, ombres | **Section 5 : Formes Géométriques & Textures Graphiques** | Décrire la nouvelle forme ou propriété de forme, ses valeurs min/max et son rendu. |
| `src/components/drawer/ExportControls.tsx`, `ExportOverlay.tsx` | Zone d'export, presets sociaux, calcul de ratio, résolution cible | **Section 6 : Cadrage & Zone d'Exportation** | Actualiser la liste des presets, le comportement du tracé libre et les dimensions cibles. |
| `App.tsx`, raccourcis globaux `useEffect` | Nouveaux raccourcis clavier, combinaisons de touches ou gestes tactiles | **Section 7 : Raccourcis Clavier & Interactions Souris** | Ajouter la ligne correspondante dans le tableau récapitulatif avec balises `<kbd>`. |
| `src/utils/templateEngine.ts`, `src/types/template.ts` | Évolution de la cascade Master / Overrides / Variants, règles de fusion | **Section 8 : Système de Templates & Déclinaisons en Cascade** | Actualiser l'arborescence, l'ordre d'application de `resolveComposition` et les règles. |
| `src/context/EditorContext.tsx`, `LeftSidebar.tsx` (Tab Custom IDs) | Identifiants sémantiques, fonction Auto-ID, règles d'attribution | **Section 9 : Identifiants Personnalisés (customId)** | Expliquer l'attribution du nouvel identifiant, son rôle dans le mapping. |
| `master.yml`, `overrides/*.yml`, `variants/**/*.yml` | Nouveaux blocs, syntaxes `elements.*`, `content.*` ou `images.*` | **Section 10 : Spécification & Syntaxe des Fichiers YAML** | Mettre à jour les exemples annotés de `master.yml`, overrides et variantes. |
| `src/utils/bundleIo.ts`, gestion des assets | Résolution des images, arborescence sous `assets/` | **Section 11 : Gestion des Assets Graphiques & Résolution** | Préciser les règles de remontée d'arborescence et les formats d'images supportés. |
| `src/components/modal/BatchExportModal.tsx`, `src/utils/export.ts` | File System Access API, sous-dossier horodaté, archive ZIP | **Section 12 : Batch Export (Export par Lot) & Archives ZIP** | Documenter les formats de sortie, l'arborescence générée et le fallback ZIP. |
| Architecture globale, nouvelles étapes | Procédure d'extension en 6 étapes | **Section 13 : Guide de Maintenance & Évolution du Code** | Synchroniser les consignes d'architecture. |

---

## 3. Protocole Opérationnel de Synchronisation (Les 5 Actions)

Chaque fois que vous modifiez le code de FrameMyApp-Banner :

### Action 1 : Localiser la section cible
- Consulter le sommaire de `docs/DOCUMENTATION.md`.
- Repérer le numéro de section (`## X. ...`) et le sous-titre (`### X.Y ...`).

### Action 2 : Édition chirurgicale
- Utiliser impérativement les outils d'édition ciblée : `replace_file_content` ou `multi_replace_file_content`.
- **Ne jamais écraser l'intégralité du fichier `docs/DOCUMENTATION.md`** avec `write_file` pour une simple retouche.

### Action 3 : Respect des conventions de formatage Markdown
- **Titres** : Respecter scrupuleusement la hiérarchie `## X. Titre` pour les sections majeures et `### X.Y Sous-titre` pour les sous-sections. Le composant `DocumentationModal.tsx` s'appuie sur ces expressions régulières pour générer automatiquement le sommaire interactif.
- **Raccourcis clavier** : Utiliser la balise HTML `<kbd>` (ex: `<kbd>Ctrl + Z</kbd>`).
- **Tableaux** : Utiliser le format de tableau GFM avec en-têtes et bordures soignées.
- **Blocs de code** : Toujours spécifier le langage pour la coloration et les badges (ex: ` ```yaml `, ` ```typescript `).

### Action 4 : Vérification du Sommaire & des Ancres
- Vérifier que les nouveaux titres H2 ou H3 apparaissent correctement dans le sommaire généré par `DocumentationModal.tsx`.
- S'assurer que les identifiants générés par `slugify` permettent un défilement fluide vers la section.

### Action 5 : Validation Globale
- Exécuter la validation sans régression :
  ```bash
  npx tsc --noEmit
  npm test
  ```
- Vérifier qu'aucune erreur TypeScript ou régression du moteur de templates n'a été introduite.

---

## 4. Intégration avec les Autres Skills du Projet

- **Complémentarité avec `banner-template-architecture`** : L'Étape 6 de la procédure d'ajout de paramètre invoque directement ce protocole de maintenance documentaire.
- **Complémentarité avec `frugal-workflow`** : L'édition de la documentation doit être chirurgicale, sans scans inutiles ni relectures de fichiers complets hors contexte.

---

## 5. Anti-Patterns Absolus

* ❌ **Oublier de documenter un nouveau contrôle ou une nouvelle propriété** : Tout paramètre absent de la documentation est invisible pour l'utilisateur et pour les futurs agents de maintenance.
* ❌ **Modifier la syntaxe YAML sans actualiser les exemples de la Section 10** : Tout template copié-collé depuis la documentation doit être 100% valide et fonctionnel.
* ❌ **Casser la structure des titres Markdown** : Omettre le préfixe `## X.` ou `### X.Y` casse la détection automatique du sommaire et les ancres de navigation du composant `DocumentationModal.tsx`.
* ❌ **Valider une Pull Request ou clore une tâche avec une documentation obsolète**.
