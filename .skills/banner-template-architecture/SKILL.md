---
name: banner-template-architecture
description: Instructions and guidelines for maintaining and extending the Template, Master, Override, Variant, and Batch Export architecture in FrameMyApp-Banner. Use this skill whenever adding new properties, canvas element types, background options, or export parameters to ensure full synchronisation across types, UI controls, YAML serialization, cascade engine, tests, documentation, and changelog.
metadata:
  author: FrameMyApp
  version: 1.3.0
  category: Architecture
  last-updated: '2026-11-20'
---

# Guide d'Extension & Maintenance du Système de Templates & Bundles

Ce document sert d'instruction de référence pour faire évoluer le moteur de composition, les templates YAML, les surcharges (`overrides/`), les déclinaisons (`variants/`), les identifiants personnalisés (`customId`), le versionnage de `master.yml` et le Batch Export (UI & CLI headless).

---

## 1. Vue d'Ensemble du Flux de Données

```text
[Canvas / UI] (BackgroundConfig, CanvasElement, ExportZone)
       │
       ▼ (serializeCanvasToMaster -> injecte version = APP_VERSION depuis package.json)
  [master.yml] (Stocke TOUS les attributs de la scène + version de construction)
       │
       ├────► [overrides/<slug>.yml] (Diff automatique : thèmes / couleurs / styles)
       │
       └────► [variants/<lang>/<slug>.yml] (Diff automatique : textes / captures / ajustements)
                   │
                   ▼ (resolveComposition)
      [Composition Résolue Finale]
         ├── Canvas Viewport (Édition live)
         ├── Batch Export UI (Dossier disque ou ZIP — PNG / JPEG / WebP)
         └── Headless CLI (generateBatchForBundle.sh sur le tag Git == master.yml version)
```

---

## 2. Procédure Pas-à-Pas lors de l'Ajout d'un Nouveau Paramètre

Chaque fois qu'un attribut ou un paramètre est ajouté à l'application, **6 étapes clés** doivent être vérifiées et exécutées :

### Étape 1 : Définition des Types TypeScript
- Fichiers : [src/types/index.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/types/index.ts) et [src/types/template.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/types/template.ts)
- **Règle** :
  - Attribut commun à tous les éléments : `BaseElement` ou `VisualEffectsElement` (glow/shadow).
  - Attribut spécifique : `TextElementModel`, `ShapeElementModel` ou `DeviceElementModel`.
  - Paramètre de fond : `BackgroundConfig` (ex. `zoomBlur*`, `imageOverlay*`).
  - Paramètre de zone d'export : `ExportZone`.
- Vérifier la compatibilité avec `BannerMasterConfig`, `BannerOverrideConfig` et `BannerVariantConfig`.

### Étape 2 : Moteur de Résolution en Cascade & Sérialisation par Diff
- Fichier : [src/utils/templateEngine.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/utils/templateEngine.ts)
- **Règle 1 (Deep Merge)** : `deepMerge` fusionne récursivement les objets imbriqués (`glow`, `stroke`, `shadow`). Vérifier que les valeurs par défaut du Master sont préservées.
- **Règle 2 (Content & Images Mapping)** :
  - Textes : `content: { [customId]: "texte" }` met à jour `TextElementModel.text`.
  - Assets : `images: { [customId]: "fichier.png" }` résout via `resolveAsset` et met à jour `BackgroundConfig.imageUrl` (`background`/`bg`), `ShapeElementModel.imageUrl` ou `DeviceElementModel.screenImageUrl`.
- **Règle 3 (Sérialisation Master & Version)** : `serializeCanvasToMaster` doit préserver fidèlement le nouvel attribut (`deepClone`) et conserver `version: APP_VERSION` (issu de `package.json`).
- **Règle 4 (Sérialisation Diff)** : Vérifier que `serializeCanvasToOverride` et `serializeCanvasToVariant` (via `computeElementDiff` / `computeBackgroundDiff`) détectent et persistent correctement les modifications du nouveau paramètre.

### Étape 3 : Contrôles d'Édition UI (`src/components/drawer/`)
- Fichiers :
  - Textes : `TextControls.tsx`
  - Formes : `ShapeControls.tsx`
  - Mockups d'appareils : `DeviceControls.tsx`
  - Effets communs (glow/ombre) : `EffectsControls.tsx`
  - Fond : `BackgroundControls.tsx`
  - Export : `ExportControls.tsx`
- **Règle** : Chaque contrôle appelle `updateElement(element.id, { ... })` ou `setBackground({ ... })` en respectant le coalescing Undo/Redo des sliders.

### Étape 4 : Mapping, Fabriques & Identifiants (`customId`)
- Fichiers : `src/utils/elementFactories.ts`, `src/context/EditorContext.tsx`, `src/components/leftDrawer/LeftSidebar.tsx`
- **Règle** : Tout nouvel élément créé (`addText`, `addShape`, `addDevice`) initialise un `customId` par défaut parlant et est pris en charge dans l'onglet *Calques & IDs* ainsi que dans `autoGenerateCustomIds()`.

### Étape 5 : Tests Automatisés & Vérification Statique
- Fichier : [test-template-engine.mjs](file:///home/avianey/workspace/FrameMyApp-Banner/test-template-engine.mjs)
- **Règle** : Ajouter une assertion vérifiant que le nouveau paramètre :
  1. Est sérialisé dans `master.yml` (avec `version === APP_VERSION`).
  2. Peut être surchargé dans un `override` et décliné dans une `variant` (incluant la sérialisation par diff).
  3. Conserve sa valeur par défaut s'il n'est pas spécifié.
- Valider les fichiers TypeScript modifiés avec `analyze_file(absolutePath = "...")` puis exécuter :
  ```bash
  npm test
  ```
  *(Ne pas lancer `npx tsc` ni `npm run build` en développement courant — voir [AGENTS.md](file:///home/avianey/workspace/FrameMyApp-Banner/AGENTS.md)).*

### Étape 6 : Documentation & Changelog Synchrones
- Mettre à jour [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) (schéma YAML, matrice de correspondance, exemples) conformément à la skill `documentation-maintenance`.
- Ajouter une ligne dans [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md) sous `## [Unreleased]`.

---

## 3. Matrice de Correspondance YAML ↔ Propriétés TypeScript

| Bloc YAML | Propriété TypeScript correspondante | Exemple YAML |
| :--- | :--- | :--- |
| `version` (`master.yml`) | `BannerMasterConfig.version` (`APP_VERSION`) | `version: "1.1.0"` |
| `background.type` | `BackgroundConfig.type` | `type: "linear"` |
| `background.color1` | `BackgroundConfig.color1` | `color1: "rgba(30, 27, 75, 1)"` |
| `background.imageUrl` | `BackgroundConfig.imageUrl` | `imageUrl: "assets/bg.jpg"` |
| `background.zoomBlur*` | `BackgroundConfig.zoomBlur*` | `zoomBlurEnable: true` |
| `exportZone.targetWidth` | `ExportZone.targetWidth` | `targetWidth: 1200` |
| `content.<customId>` | `TextElementModel.text` | `content.main_title: "Bonjour"` |
| `elements.<customId>.<prop>` | `CanvasElement.<prop>` | `elements.badge.solidColor: "#ff0000"` |
| `elements.<customId>.quadPoints` | `ShapeElementModel.quadPoints` | `quadPoints: { tl: { x: 0.1, y: 0.06 }, ... }` |
| `elements.<customId>.quadImageFit` | `ShapeElementModel.quadImageFit` | `quadImageFit: true` |
| `removedElements` | `BannerOverrideConfig.removedElements` \| `BannerVariantConfig.removedElements` | `removedElements: ["promo_badge"]` |
| `elementOrder` | `BannerOverrideConfig.elementOrder` \| `BannerVariantConfig.elementOrder` | `elementOrder: ["bg_card", "hero_device"]` |
| `images.<customId>` | `ShapeElementModel.imageUrl` \| `DeviceElementModel.screenImageUrl` | `images.hero_device: "screen_fr.png"` |
| `images.background` | `BackgroundConfig.imageUrl` | `images.background: "cover.jpg"` |

---

## 4. Ajout d'un Nouveau Type d'Élément (ex: Badge SVG, QR Code)

1. Déclarer l'interface dans `src/types/index.ts` héritant de `VisualEffectsElement` (ou `BaseElement`).
2. L'ajouter à l'union `export type CanvasElement = TextElementModel | ShapeElementModel | DeviceElementModel | NewElementModel;`.
3. Ajouter sa fabrique par défaut dans `src/utils/elementFactories.ts`.
4. Créer le composant canvas dans `src/components/canvas/NewElement.tsx` et l'intégrer dans `Artboard.tsx`.
5. Créer son volet de contrôles dans `src/components/drawer/NewElementControls.tsx` (avec champ `customId` et `EffectsControls` si applicable) et le raccorder à `SideDrawer.tsx`.
6. Ajouter la méthode d'ajout dans `EditorContext.tsx` et la prise en charge dans `LeftSidebar.tsx` (*Calques & IDs*).
7. Valider la cascade + sérialisation par diff dans `templateEngine.ts` et `test-template-engine.mjs` (`npm test`).
8. Documenter le nouveau type dans [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) et [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md).
