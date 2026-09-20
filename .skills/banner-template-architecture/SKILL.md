---
name: banner-template-architecture
description: Instructions and guidelines for maintaining and extending the Template, Master, Override, Variant, and Batch Export architecture in FrameMyApp-Banner. Use this skill whenever adding new properties, canvas element types, background options, or export parameters to ensure full synchronisation across types, UI controls, YAML serialization, cascade engine, and tests.
metadata:
  version: 1.1.0
  category: Architecture
---
# Guide d'Extension & Maintenance du Système de Templates & Bundles

Ce document sert d'instruction de référence (Skill IA et Développeur) pour faire évoluer le moteur de composition, les templates YAML, les surcharges (`overrides/`), les déclinaisons (`variants/`), les identifiants personnalisés (`customId`) et le Batch Export.

---

## 1. Vue d'Ensemble du Flux de Données

```text
[Canvas / UI] (BackgroundConfig, CanvasElement, ExportZone)
       │
       ▼ (serializeCanvasToMaster)
  [master.yml] (Stocke TOUS les attributs de la scène)
       │
       ├────► [overrides/<slug>.yml] (Surcharges graphiques / angles / couleurs)
       │
       └────► [variants/<lang>/<slug>.yml] (Traductions de textes / captures)
                   │
                   ▼ (resolveComposition)
      [Composition Résolue Finale]
         ├── Canvas Viewport (Édition live)
         └── Batch Export (Capture HD -> Répertoire disque ou ZIP)
```

---

## 2. Procédure Pas-à-Pas lors de l'Ajout d'un Nouveau Paramètre

Chaque fois qu'un attribut ou un paramètre est ajouté à l'application, **5 étapes clés** doivent être vérifiées et exécutées :

### Étape 1 : Définition des Types TypeScript
- Fichier : `src/types/index.ts` et `src/types/template.ts`
- **Règle** : Si l'attribut appartient à un élément (ex: `opacity`, `blur`, `lineSpacing`, `letterSpacing`), l'ajouter dans `BaseElement`, `TextElementModel` ou `ShapeElementModel`.
- Si c'est un paramètre de fond : l'ajouter dans `BackgroundConfig`.
- Si c'est un paramètre de zone d'export : l'ajouter dans `ExportZone`.
- Vérifier que `BannerMasterConfig`, `BannerOverrideConfig` et `BannerVariantConfig` utilisent des types partiels ou compatibles.

### Étape 2 : Moteur de Résolution en Cascade (`resolveComposition`)
- Fichier : `src/utils/templateEngine.ts`
- **Règle 1 (Deep Merge)** : `deepMerge` fusionne récursivement les objets imbriqués (ex: `glow: { enable, color, blur, x, y }`, `stroke`, `shadow`). Si le nouveau paramètre est un objet imbriqué ou un tableau spécifique, s'assurer que la fusion récursive préserve les valeurs par défaut du Master.
- **Règle 2 (Content Mapping)** : Si le paramètre est lié au texte et peut être surchargé via `content: { [customId]: "texte" }`, la fonction `applyLayer` met à jour automatiquement la propriété `text`.
- **Règle 3 (Images Mapping)** : Si le paramètre référence un asset (ex: `images: { [customId]: "mon_image.png" }`), utiliser `resolveAsset(assetPath, variantPath, assetsMap)` pour résoudre le chemin relatif selon la spécification de BUNDLE_BLUEPRINT.
- **Règle 4 (Sérialisation)** : Vérifier que `serializeCanvasToMaster` copie fidèlement le nouveau paramètre (`deepClone`).

### Étape 3 : Contrôles d'Édition UI (SideDrawer)
- Fichiers :
  - Textes : `src/components/drawer/TextControls.tsx`
  - Formes : `src/components/drawer/ShapeControls.tsx`
  - Fond : `src/components/drawer/BackgroundControls.tsx`
  - Export : `src/components/drawer/ExportControls.tsx`
- **Règle** : Chaque contrôle doit appeler `updateElement(element.id, { [monNouveauParam]: valeur })` ou `setBackground({ ... })`.
- Veiller à ce que l'historique d'Undo/Redo soit déclenché si approprié.

### Étape 4 : Mapping & Vue des Identifiants (`customId`)
- Fichier : `src/components/leftDrawer/LeftSidebar.tsx` (Onglet *Custom IDs*)
- Fichier : `src/context/EditorContext.tsx`
- **Règle** : Tout nouvel élément créé (`addText`, `addShape`) doit initialiser un `customId` par défaut pertinent (ex: `text_1`, `title`, `shape_1`, `badge_card`).
- Dans la fonction `autoGenerateCustomIds()`, inclure la prise en charge des nouveaux types d'éléments si applicable.

### Étape 5 : Tests Automatisés
- Fichier : `test-template-engine.mjs`
- **Règle** : Ajouter une assertion vérifiant que le nouveau paramètre :
  1. Est sérialisé dans `master.yml`.
  2. Peut être surchargé dans un `override`.
  3. Peut être décliné dans une `variant`.
  4. Conserve sa valeur par défaut si non spécifié.
- Exécuter la commande :
  ```bash
  npm test
  npm run build
  ```

### Étape 6 : Documentation Synchrone & Impérative
- Fichier : `docs/DOCUMENTATION.md`
- **Règle** : Conformément à la skill `documentation-maintenance`, toute modification ou ajout de fonctionnalité, contrôle UI, attribut de template, syntaxe YAML ou raccourci DOIT être immédiatement et fidèlement documenté dans [docs/DOCUMENTATION.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/DOCUMENTATION.md). Vérifier le sommaire et le rendu dans la page de documentation intégrée (`DocumentationModal.tsx`).

---

## 3. Matrice de Correspondance YAML <-> Propriétés TypeScript

| Bloc YAML | Propriété TypeScript correspondante | Exemple YAML |
|:---|:---|:---|
| `background.type` | `BackgroundConfig.type` | `type: "linear"` |
| `background.color1` | `BackgroundConfig.color1` | `color1: "rgba(30, 27, 75, 1)"` |
| `background.imageUrl` | `BackgroundConfig.imageUrl` | `imageUrl: "bg.jpg"` |
| `exportZone.targetWidth` | `ExportZone.targetWidth` | `targetWidth: 1200` |
| `content.<customId>` | `(TextElementModel).text` | `content.main_title: "Bonjour"` |
| `elements.<customId>.<prop>` | `(CanvasElement).<prop>` | `elements.badge.solidColor: "#ff0000"` |
| `images.<customId>` | `(ShapeElementModel).imageUrl` | `images.logo: "logo.png"` |
| `images.background` | `BackgroundConfig.imageUrl` | `images.background: "cover.jpg"` |

---

## 4. Ajout d'un Nouveau Type d'Élément (ex: Image, Icône, Badge SVG)

Si un nouveau type d'élément est introduit dans le canvas (ex: `type: 'image'` ou `type: 'badge'`) :
1. Déclarer l'interface dans `src/types/index.ts` héritant de `BaseElement`.
2. L'ajouter à l'union `export type CanvasElement = TextElementModel | ShapeElementModel | NewElementModel;`.
3. Créer le composant canvas dans `src/components/canvas/NewElement.tsx`.
4. L'intégrer dans le rendu d'Artboard : `src/components/canvas/Artboard.tsx`.
5. Créer son volet de contrôles : `src/components/drawer/NewElementControls.tsx` avec champ `customId`.
6. Ajouter la méthode d'ajout dans `EditorContext.tsx` (`addNewElement()`) avec `customId` par défaut.
7. Ajouter l'icône et la ligne correspondante dans l'onglet *Custom IDs* de `LeftSidebar.tsx`.
8. Valider la cascade dans `templateEngine.ts` et `npm test`.
