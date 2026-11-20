---
name: frugal-workflow
description: Politique de travail orientée coût adaptée au projet FrameMyApp-Banner pour réduire drastiquement la consommation de tokens et le bruit de contexte dans l'IDE. Privilégie le contexte minimal suffisant, l'isolation des refactorings transverses via sous-agent (task), les modifications chirurgicales et l'alignement avec les sous-systèmes du projet (React/TypeScript, Vite, Template Engine, Canvas Artboard, .aiexclude).
metadata:
  author: FrameMyApp
  version: 2.0.0
  last-updated: '2026-11-19'
  keywords:
  - FrameMyApp
  - Banner Studio
  - Token Optimization
  - Context Isolation
  - Cost Aware
  - SubAgent
  - Task
  - Vite
  - Template Engine
  - Surgical Edits
  - Frugal Mode
---

# Frugal Workflow & Context Isolation (FrameMyApp-Banner)

Cette skill définit la stratégie d'ingénierie orientée **coût total par tâche réussie** appliquée au projet **FrameMyApp-Banner (Banner Studio)**.

L'objectif est d'utiliser **le minimum de contexte, d'appels d'outils et d'itérations nécessaires pour obtenir un résultat fiable, typé et sans régression**.

---

## 1. Contexte Architectural Spécifique à FrameMyApp-Banner

| Composant / Zone | Particularité | Directive Frugale |
|---|---|---|
| **Dossiers `node_modules/` & `dist/`** | Dépendances NPM et artefacts de build listés dans `.aiexclude`. | **Ne JAMAIS scanner ni lire ces dossiers**. Toujours cibler `src/`, `scripts/`, `docs/` ou `.skills/`. |
| **Moteur de Templates & Cascade (`src/utils/templateEngine.ts`, `bundleIo.ts`)** | Cascade Master (`master.yml` avec `version = APP_VERSION`) → Overrides (`overrides/*.yml`) → Variants (`variants/<lang>/*.yml`), diff auto, `customId` et assets. | Se référer à **`banner-template-architecture`**. Respecter les 6 étapes de synchronisation (Types → Engine → Controls UI → Mapping/Factories → Tests → Doc/Changelog). |
| **Store & Hooks Volumineux (`EditorContext.tsx`, `useDiskSync.ts`, `LeftSidebar.tsx`)** | Fichiers >1000 lignes. | **Ne jamais relire le fichier en entier**. Utiliser `view_file_outline` ou `grep` ciblé, puis `read_file` avec `startLine`/`endLine` sur la tranche stricte. |
| **Canvas & Rendu (`src/components/canvas/`)** | `Artboard.tsx`, `CanvasViewport.tsx`, `TextElement.tsx`, `ShapeElement.tsx`, `DeviceElement.tsx`, `SelectionHandles.tsx`, `MultiSelectionHandles.tsx`, `InPlaceImageCropper.tsx`, `ExportOverlay.tsx`. | Cibler précisément le composant concerné plutôt que tout le dossier `canvas/`. |
| **Pipeline d'Export & Headless CLI (`src/utils/batchExportRenderer.ts`, `HeadlessExportBridge.tsx`, `scripts/generate-batch-cli.mjs`)** | Capture haute résolution (`html-to-image` / `html2canvas`), ZIP (`jszip`), File System Access API, Playwright headless CI. | Tester la logique algorithmique via `npm test` avant toute intervention lourde. |

---

## 2. Hiérarchie des Priorités

1. **Exactitude et typage strict** (zéro erreur TypeScript, préservation de la cascade YAML et du cycle de vie React)
2. **Réduction du nombre d'itérations** (viser juste dès le premier coup)
3. **Minimisation du contexte injecté** (ne charger que les tranches nécessaires)
4. **Minimisation des sorties d'outils** (filtrer, résumer, isoler les logs verbeux)
5. **Concision des réponses fournies** (synthèses + liens IDE, sans recopier le code modifié)

---

## 3. Matrice de Validation Économique

| Niveau | Action | Coût | Quand l'utiliser ? |
|---|---|---|---|
| **1. Analyse statique IDE** | `analyze_file(absolutePath = "...")` | **~0 token** (instantané) | Systématiquement après chaque modification de fichier `.ts` / `.tsx`. |
| **2. Tests unitaires du moteur** | `run_shell_command("npm test")` | **Très faible** (~20 lignes) | Uniquement si la sérialisation YAML, le diff, la cascade, l'alignement ou le versionnage `master.yml` est touché (`vite-node test-template-engine.mjs`). |
| **3. Proscrit en dev continu** | *Ne pas lancer `npx tsc` ni `npm run build`* | **Redondant** | Vite HMR vérifie en temps réel. **Seule exception** : demande explicite de l'utilisateur ou procédure de release (`release-versioning`). |

---

## 4. Isolation des Opérations Lourdes via `task` (Sous-Agent)

Déléguer à `task` lorsque :
- Un refactoring transversal touche simultanément les 6 couches (`src/types/`, `templateEngine.ts`, `src/components/drawer/`, `LeftSidebar.tsx`, `EditorContext.tsx`, `test-template-engine.mjs`).
- Un nouveau type d'élément canvas doit être implémenté de bout en bout.
- Une suite de tests automatisés complexe doit être rédigée et déboguée.

Exécuter directement dans le contexte principal lorsque :
- La modification est locale/chirurgicale (un composant, un helper, la doc, le changelog, une skill).
- La commande est courte et déterministe (`analyze_file`, `npm test`, `git status`).

---

## 5. Exploration Chirurgicale & Cartographie de `src/`

Toujours **localiser avant de lire** (`find_declaration` → `find_usages` → `view_file_outline` → `grep` ciblé → `read_file` par tranches).

- `src/types/` : `index.ts` (modèles canvas, background, devices, effets), `template.ts` (Master, Override, Variant, Bundle).
- `src/context/` : `EditorContext.tsx` (store global React).
- `src/hooks/` : `useDiskSync.ts`, `useBundleManager.ts`, `useCanvasHistory.ts`, `useElementHierarchy.ts`, `useViewportNavigation.ts`.
- `src/utils/` : `templateEngine.ts` (`APP_VERSION`, cascade, diff), `bundleIo.ts`, `assetManager.ts`, `alignment.ts`, `color.ts`, `deviceHelper.ts`, `effectsHelper.ts`, `elementFactories.ts`, `imageCropHelper.ts`, `zoomBlurHelper.ts`, `export.ts`, `batchExportRenderer.ts`, `yamlHelper.ts`.
- `src/components/canvas/` : `Artboard.tsx`, `CanvasViewport.tsx`, `TextElement.tsx`, `ShapeElement.tsx`, `DeviceElement.tsx`, `SelectionHandles.tsx`, `MultiSelectionHandles.tsx`, `InPlaceImageCropper.tsx`, `ExportOverlay.tsx`.
- `src/components/drawer/` : `SideDrawer.tsx`, `BackgroundControls.tsx`, `TextControls.tsx`, `ShapeControls.tsx`, `DeviceControls.tsx`, `EffectsControls.tsx`, `AlignmentControls.tsx`, `SceneAlignmentControls.tsx`, `LayerOrderControls.tsx`, `ExportControls.tsx`.
- `src/components/leftDrawer/` : `LeftSidebar.tsx` (Templates/Bundles & Calques/IDs).
- `src/components/modal/` : `BatchExportModal.tsx`, `AiBackgroundModal.tsx`, `SaveModal.tsx`, `NewVariantModal.tsx`, `NewOverrideModal.tsx`, `ExportPreviewModal.tsx`, `DiskPermissionModal.tsx`.
- `src/components/` : `Header.tsx`, `BottomBar.tsx`, `Snackbar.tsx`, `ConfirmModal.tsx`, `HeadlessExportBridge.tsx`, `common/ErrorBoundary.tsx`, `common/ColorAlphaPicker.tsx`, `common/ImageUploadField.tsx`.
- `scripts/` & racine : `generateBatchForBundle.sh`, `scripts/generate-batch-cli.mjs`, `config.ia.yaml`, `test-template-engine.mjs`, `test-headless-layout.mjs`.

---

## 6. Éditions Chirurgicales & Anti-Patterns

- Privilégier `replace_file_content` / `multi_replace_file_content` pour les fichiers existants ; réserver `write_file` aux créations ou réécritures complètes justifiées.
- Paralléliser les lectures/recherches indépendantes et les éditions sur des fichiers distincts.
- ❌ Ne jamais fouiller dans `node_modules/` ou `dist/`.
- ❌ Ne jamais lancer `npx tsc` ou `npm run build` hors release/demande explicite.
- ❌ Ne jamais relire intégralement `EditorContext.tsx` ou `useDiskSync.ts` après édition : utiliser `analyze_file`.
- ❌ Ne jamais oublier de synchroniser `docs/TEMPLATE_SYSTEM.md`, `CHANGELOG.md` (`[Unreleased]`) et les `.skills/` concernées.
