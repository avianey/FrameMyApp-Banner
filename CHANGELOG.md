# Changelog

Toutes les évolutions notables de **FrameMy.App Studio (FrameMyApp-Banner)** sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet suit [Semantic Versioning](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`).

Les tags Git suivent strictement le numéro de version de `package.json` sans préfixe (ex. `1.0.0`, `1.0.1`). Ce même numéro est écrit dans `master.yml` afin de permettre l'invocation reproductible du moteur headless CI/CD sur le tag correspondant.

---

## [Unreleased]

---

## [1.1.0] - 2026-11-20

### Added
- **Copier / Coller d'éléments intra- et inter-Master/Override/Variante** : presse-papiers réactif (persistant via `localStorage` et accessible via `Ctrl+C`/`Ctrl+V`, le volet droit `LayerOrderControls`/`AlignmentControls`, l'onglet *Calques & IDs* et la `BottomBar`), conservant les coordonnées exactes `(x, y)` et le `customId` lors d'un collage vers un autre master/override/variante (avec suffixe unique `_copy`/`_copy_N` et décalage `+24px` dans le même document), ainsi qu'une modale **Copier vers…** (`CopyElementToModal`) permettant d'injecter directement un ou plusieurs éléments dans un ou plusieurs masters, overrides ou variantes au choix avec sérialisation YAML par diff et sauvegarde disque.
- **Forme *Quadrilatère* en perspective (`shapeType: "quadrilateral"`)** : remplace *Pilule* dans le sélecteur de formes (`ShapeControls`, tout en conservant la rétrocompatibilité YAML de `"pill"`). Permet de repositionner indépendamment les 4 angles (`quadPoints: { tl, tr, br, bl }`) directement via 4 poignées losanges ambre sur le canevas ou par coordonnées numériques dans le volet droit, avec contour vectoriel SVG et ombre portée fidèle à la silhouette.
- **Projection perspective d'image (*Adapter à la forme*)** : option activée par défaut (`quadImageFit: true`) lorsqu'une image est appliquée sur un quadrilatère, projetant les 4 coins de l'image dans les 4 sommets du quadrilatère par homographie projective 2D (`matrix3d` via `src/utils/quadHelper.ts`).
- **Héritage d'override à la création d'une variante** : ajout dans `NewVariantModal` d'une liste déroulante *Override hérité* (par défaut `Sans override hérité`, affichée dès qu'un override existe dans le bundle) qui positionne automatiquement l'identifiant (`slug`), le titre et les textes résolus de l'override choisi, avec détection de collision de chemin cible.
- **Bouton *Décliner* sur les overrides** : chaque override de l'onglet *Templates & Bundles* (`LeftSidebar`) propose un bouton **Décliner** ouvrant directement la modale de création de variante avec cet override pré-sélectionné.
- **Bouton *Dupliquer* sur les variantes** : chaque variante de l'onglet *Templates & Bundles* propose un bouton **Dupliquer** ouvrant la modale en mode duplication avec choix obligatoire d'un chemin disponible (non déjà pris), reprise de l'identifiant et de l'override éventuel, et clonage intégral de toutes les propriétés YAML de la variante source.
- **Versionnage automatique de `master.yml`** : `serializeCanvasToMaster` exporte désormais automatiquement la version exacte de FrameMy.App Studio (`APP_VERSION` issu de `package.json`, identique au tag Git) dans le champ `version` de `master.yml`.
- **Contrôle de version dans la CLI Headless** : `scripts/generate-batch-cli.mjs` lit la version référencée dans `master.yml`, l'affiche au démarrage et émet un avertissement explicite si elle diffère de la version du moteur exécuté afin de garantir un checkout CI/CD sur le bon tag.
- **Skill `release-versioning`** (`.skills/release-versioning/SKILL.md`) : protocole dédié aux sauts de version SemVer, tags Git sans préfixe, promotion du `CHANGELOG.md`, matrice de compatibilité et préparation de l'itération suivante.

### Changed
- **Recentrage et scaling adaptatif du viewport** : lors du chargement initial d'un template ou de la sélection d'un `master`, la vue est automatiquement scalée et centrée dans la zone libre au-dessus de la barre d'outils inférieure (`BottomBar`) et entre les panneaux latéraux ouverts ; lors du passage d'un override ou d'une variante à un(e) autre, le zoom et le centrage actuels sont conservés tant que `canvasWidth` et `canvasHeight` ne changent pas.
- **Unification de la documentation** : fusion de la spécification dans `docs/TEMPLATE_SYSTEM.md` (incluant `zoomBlur*`, `gradientStops`, `glow`, sauvegarde par diff, Batch Export UI/CJK et exemple GitHub Actions avec checkout automatique du tag issu de `master.yml`).
- **Mise à jour de `AGENTS.md`, `README.md` et des skills** (`documentation-maintenance`, `banner-template-architecture`, `frugal-workflow`) pour imposer le maintien continu du `CHANGELOG.md`, de la documentation et des skills sans contradiction d'outillage.

### Fixed
- **Persistance de l'ordre des plans (`elementOrder`) dans les overrides et variantes** : `serializeCanvasToOverride` et `serializeCanvasToVariant` enregistrent désormais `elementOrder` (du fond vers le 1er plan) dès que l'empilement des calques diffère du parent (`master` ou `master + override`) — par exemple après avoir descendu un élément sous un autre plan — et `applyLayer` réapplique cet ordre au chargement.
- **Persistance des éléments supprimés (`removedElements`) dans les overrides et variantes** : `serializeCanvasToOverride` et `serializeCanvasToVariant` enregistrent désormais dans `removedElements` les identifiants (`customId` ou `id`) des éléments (formes, textes, appareils) supprimés par rapport au parent (`master` ou `master + override`) tout en nettoyant leurs anciennes entrées `elements`/`content`/`images` ; `applyLayer` / `resolveComposition` les exclut lors du chargement de l'override et de ses variantes, et prend également en charge la sérialisation/chargement des nouveaux éléments ajoutés.
- **Centrage et couverture des images dans les formes avec bordure (`stroke`)** : la bordure de `ShapeElement` est désormais rendue dans un calque superposé (`pointer-events-none`) à l'intérieur du périmètre de la forme au lieu de réduire la *padding-box* de l'image, et `computeImageCropGeometry` arrondit par excès (`Math.ceil`) en mode `cover` ; l'image reste ainsi centrée au pixel près sans aucun décalage ni espace avant la bordure.

### Removed
- Suppression des documents redondants/obsolètes `docs/DOCUMENTATION.md` et `docs/ARENA_PRODUCTION_PLAN.md`.

---

## [1.0.0] - 2026-11-03

### Added
- **Initial release** de FrameMy.App Studio (React 18, TypeScript, Vite, Tailwind CSS Material 3, Light/Dark mode).
- **Éditeur Canvas interactif (standard Figma)** : textes riches (Google Fonts, glow, ombre, alignement horizontal/vertical), formes vectorielles et textures image, mockups d'appareils (`pixel-10`, `iphone-pro-max`, `samsung-galaxy`, `pixel-tab` avec métal brossé, Dynamic Island, reflets), sélection multiple (*marquee*), pan (`Espace+clic`, molette, trackpad), *Smart Guides* magnétiques, alignement AABB orienté, cropper d'image in-place, raccourcis clavier (`?`, `Ctrl+Z/Y`, `Ctrl+C/V/D/A/S`).
- **Arrière-plans avancés** : couleur unie, dégradé linéaire/radial, image (flou, voile, Zoom Blur), et génération d'arrière-plan par IA (Google Gemini via `config.ia.yaml`).
- **Système de Templates & Bundles YAML** : cascade `master.yml` → `overrides/<slug>.yml` → `variants/<lang>/<slug>.yml`, identifiants sémantiques (`customId`), sérialisation par diff automatique, résolution d'assets en cascade, synchronisation disque (File System Access API) et import/export d'archives ZIP.
- **Batch Export HD & CI/CD Headless** : export PNG/JPEG/WebP jusqu'à 4× avec fidélité typographique CJK, et exécution automatisée headless Playwright via `generateBatchForBundle.sh` (`scripts/generate-batch-cli.mjs`) avec streaming des PNG générés.
- **Résilience & Qualité** : `ErrorBoundary` avec sauvegarde de brouillon, garde `beforeunload`, verrou de synchronisation disque, suite de tests unitaires du moteur (`npm test`).
