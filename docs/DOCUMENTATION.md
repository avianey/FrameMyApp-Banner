# Spécification & Guide du Système de Templates - FrameMy.App Studio

Ce document constitue la spécification technique et la documentation de référence du **système de templates, surcharges (`overrides`), déclinaisons (`variants`), identifiants personnalisés (`customId`), résolution d'assets et Batch Export** de FrameMy.App Studio.

---

## Sommaire

1. [Système de Templates & Déclinaisons en Cascade](#1-système-de-templates--déclinaisons-en-cascade)
2. [Identifiants Personnalisés (customId)](#2-identifiants-personnalisés-customid)
3. [Spécification & Syntaxe des Fichiers YAML](#3-spécification--syntaxe-des-fichiers-yaml)
4. [Gestion des Assets Graphiques & Résolution en Cascade](#4-gestion-des-assets-graphiques--résolution-en-cascade)
5. [Batch Export (Export par Lot) & Archives ZIP](#5-batch-export-export-par-lot--archives-zip)
6. [Architecture, Types & Tests du Moteur de Templates](#6-architecture-types--tests-du-moteur-de-templates)

---

## 1. Système de Templates & Déclinaisons en Cascade

Le moteur de templates permet d'automatiser la création de bannières déclinées en plusieurs langues, thèmes ou formats publicitaires sans dupliquer les fichiers volumineux.

### 1.1 La Hiérarchie en Cascade

```text
📁 bundle/ (ou archive .zip)
│
├── 📄 master.yml                  # 1. Base globale : fond, zone d'export, styles de textes, formes et mockups
│
├── 📁 overrides/                  # 2. Surcharges partagées entre plusieurs variantes
│   ├── 01_flash_sale.yml          #    -> Modifie les couleurs du fond, du badge et du CTA
│   └── 02_minimal_dark.yml        #    -> Thème sombre épuré
│
├── 📁 variants/                   # 3. Déclinaisons ciblées (langue / format / persona)
│   ├── 📁 fr/
│   │   ├── 01_flash_sale.yml      #    -> Textes en Français (hérite de l'override 01)
│   │   └── 02_minimal_dark.yml
│   ├── 📁 en/
│   │   ├── 01_flash_sale.yml      #    -> Textes en Anglais (hérite de l'override 01)
│   │   └── 02_minimal_dark.yml
│   └── 📁 es/
│       └── 01_flash_sale.yml      #    -> Textes en Espagnol
│
└── 📁 assets/                     # 4. Ressources graphiques partagées ou localisées
    ├── logo.svg
    └── bg_promo.jpg
```

### 1.2 Ordre de Fusion en Cascade (`resolveComposition`)

Lorsqu'une déclinaison (`variant`) est sélectionnée ou exportée :
1. **Master (`master.yml`)** : Charge l'intégralité des éléments, positions, dimensions et styles initiaux.
2. **Override (`overrides/<slug>.yml`)** : Si un override portant le même identifiant existe, ses propriétés écrasent celles du master.
3. **Variant (`variants/<lang>/<slug>.yml`)** : Les traductions textuelles (`content.*`) et les surcharges spécifiques à la langue (`elements.*`, `images.*`, `background.*`) écrasent les propriétés précédentes.
4. **Résolution d'assets** : Les images référencées sont résolues prioritairement dans `assets/<lang>/` puis dans `assets/`.

### 1.3 Édition Live & Sauvegarde Directe sur le File System

- **Sélection d'une déclinaison** : Cliquez sur n'importe quelle variante, surcharge ou master dans le volet gauche pour charger sa composition. Le style de l'élément (bordure et fond colorés) signale visuellement l'élément actif.
- **Bouton Disquette de Sauvegarde** :
  - Chaque variante, override et master dispose d'un bouton disquette à droite de sa ligne.
  - **Détection des modifications en cours (Dirty State)** : dès qu'une modification est apportée sur le canvas (texte modifié, élément déplacé, couleur changée...), l'icône disquette s'active en **rouge vif** pour avertir des modifications non enregistrées.
  - **Persistance en un clic** : cliquer sur la disquette écrit immédiatement le YAML mis à jour dans le fichier correspondant sur le disque (`.yml`) via la File System Access API.
- **Création de Variantes (+ Décliner)** :
  - Le bouton **« + Décliner »** ouvre la boîte de dialogue de création.
  - Champ **« Chemin (ex: feature/fr) »** : permet de définir une langue simple (`fr`, `ja`) ou une arborescence complète (`feature/fr`, `marketing/de`).
  - À la validation, le fichier YAML est immédiatement créé et persisté sur le disque dans le sous-répertoire spécifié.

---

## 2. Identifiants Personnalisés (customId)

Pour que les fichiers YAML puissent cibler les textes, formes et appareils indépendamment de leur identifiant technique interne (ex: `txt-1718900`), chaque élément possède un **`customId`**.

### 2.1 Attribution des Identifiants
- **Dans les panneaux d'options (TextControls / ShapeControls / DeviceControls)** : Champ de saisie *« ID Personnalisé (customId) »*.
- **Dans le volet gauche (Onglet « Custom IDs »)** :
  - Tableau de synthèse affichant chaque élément, son type, son aperçu et son `customId`.
  - Bouton **« Auto-ID »** : Attribue instantanément des identifiants parlants (`title`, `subtitle`, `badge`, `cta_button`, `device_mockup`, etc.).

### 2.2 Rôle dans le Mapping YAML
- `content.<customId>` : Injecte la chaîne de caractères dans la propriété `text` de l'élément correspondant.
- `elements.<customId>.<propriété>` : Surcharge n'importe quelle propriété de style, dimension ou position de l'élément (`solidColor`, `x`, `y`, `width`, `height`, etc.).
- `images.<customId>` : Définit l'image ou capture d'écran associée à l'élément (texture d'une forme, capture d'écran d'un mockup).

---

## 3. Spécification & Syntaxe des Fichiers YAML

### 3.1 Exemple de `master.yml`
```yaml
version: "1.0"
background:
  type: "linear"
  color1: "rgba(30, 27, 75, 1)"
  color2: "rgba(15, 23, 42, 1)"
  angle: 135
exportZone:
  x: 50
  y: 50
  width: 700
  height: 500
  targetWidth: 1200
  targetHeight: 630
elements:
  - id: "elem_title"
    customId: "main_title"
    type: "text"
    text: "Titre de l'application"
    x: 100
    y: 120
    fontSize: 48
    fontFamily: "Space Grotesk"
    fontWeight: 700
    color: "rgba(255, 255, 255, 1)"
  - id: "elem_cta"
    customId: "cta_btn"
    type: "shape"
    shapeType: "rounded"
    x: 100
    y: 350
    width: 220
    height: 60
    solidColor: "rgba(99, 102, 241, 1)"
    borderRadius: 30
  - id: "elem_device"
    customId: "phone_mockup"
    type: "device"
    deviceType: "pixel_10"
    x: 450
    y: 80
    width: 280
    height: 560
    bodyColor: "#1a1a1a"
    showFlare: true
```

### 3.2 Exemple d'Override (`overrides/01_flash_sale.yml`)
```yaml
background:
  type: "linear"
  color1: "rgba(220, 38, 38, 1)"
  color2: "rgba(127, 29, 29, 1)"
elements:
  cta_btn:
    solidColor: "rgba(251, 191, 36, 1)"
```

### 3.3 Exemple de Variante (`variants/fr/01_flash_sale.yml`)
```yaml
content:
  main_title: "Vente Flash Exceptionnelle !"
  cta_text: "Découvrir les offres"
images:
  background: "banner_fr.jpg"
  phone_mockup: "screen_fr.png"
```

### 3.4 Exemple de Variante (`variants/en/01_flash_sale.yml`)
```yaml
content:
  main_title: "Limited Time Flash Sale!"
  cta_text: "Shop Now"
images:
  background: "banner_en.jpg"
  phone_mockup: "screen_en.png"
```

---

## 4. Gestion des Assets Graphiques & Résolution en Cascade

### 4.1 Stockage sur Disque & Chemins Relatifs (`assets/`)
- Dès qu'un dossier de projet est connecté via la *File System Access API*, chaque image importée ou glissée sur la scène ou un élément est enregistrée dans le sous-répertoire `assets/` du projet.
- Dans les fichiers YAML (`master.yml`, overrides, variantes), les images sont sérialisées sous forme de **chemins relatifs propres** (`assets/nom_image.png` ou `mon_image.png`), bannissant tout Base64 volumineux du code source YAML.
- Lors de l'export en **Bundle ZIP**, tous les assets du projet sont automatiquement rassemblés et intégrés physiquement dans le dossier `assets/` de l'archive.

### 4.2 Résolution en Cascade des Assets
Lorsque des images relatives sont référencées dans vos fichiers YAML (`images: { background: "bg.jpg", phone_mockup: "screen.png" }`) :
1. Le moteur cherche d'abord dans le dossier spécifique de la langue ou sous-dossier de la variante : `assets/<lang>/<nom_image>`.
2. S'il n'y figure pas, il remonte à la racine partagée des ressources : `assets/<nom_image>`.
3. Cette règle permet de partager un arrière-plan ou un logo global tout en ayant des captures d'écran traduites selon la langue.

---

## 5. Batch Export (Export par Lot) & Archives ZIP

La boîte de dialogue **Batch Export** automatise la génération de l'intégralité des visuels du bundle :

### 5.1 Organisation en Groupes Repliables & Sélection Intelligente
- Les éléments à générer sont structurés en 3 sections avec caret repliable :
  - **Master (Canevas de référence)** : replié et non sélectionné par défaut.
  - **Overrides (Surcharges thématiques)** : replié et non sélectionnées par défaut.
  - **Variantes (Déclinaisons multilingues)** : déplié et sélectionnées par défaut pour un export ciblé immédiat des déclinaisons finales.
- Chaque groupe dispose de sa propre case à cocher d'en-tête (avec gestion de l'état indéterminé) et d'un compteur dédié (*ex: 0 / 6* ou *42 / 42*).
- Des raccourcis globaux *« Tout cocher »* et *« Tout décocher »* permettent d'ajuster l'ensemble de la liste en un clic.

### 5.2 Export direct sur Dossier Disque (File System Access API)
- Cliquez sur **« Sélectionner un dossier de destination »**.
- L'application crée un sous-répertoire horodaté reproduisant fidèlement l'arborescence :
  - `master.png`
  - `overrides/01_flash_sale.png`
  - `variants/fr/01_flash_sale.png`
  - `variants/en/01_flash_sale.png`
- La progression est affichée en direct avec barre de pourcentage et nom de chaque déclinaison en cours de capture.

### 5.3 Fallback Archive ZIP
- Si votre navigateur ne supporte pas la sélection directe de répertoire ou si vous préférez une archive unique, cliquez sur **« Télécharger en archive ZIP »**. L'archive contiendra l'arborescence complète générée.

### 5.4 Fidélité Typographique CJK & Rendu Pixel-Perfect
- Lors de l'export PNG, le moteur extrait préalablement les lignes visuelles natives calculées par le navigateur (`Range.getClientRects()`) et injecte la police japonaise `Noto Sans JP` ainsi que des hauteurs de ligne en pixels absolus (`line-height`).
- Cela neutralise les dérives de césure et de sous-pixels sur les textes asiatiques sans espaces (japonais, chinois, coréen) et garantit que les retours à la ligne et les espacements dans le fichier PNG final sont 100% identiques à ceux affichés dans l'éditeur interactif.

---

## 6. Architecture, Types & Tests du Moteur de Templates

Toute évolution du système de templates doit maintenir une synchronisation stricte :

### 6.1 Matrice de Correspondance YAML <-> Propriétés TypeScript

| Bloc YAML | Propriété TypeScript correspondante | Exemple YAML |
|:---|:---|:---|
| `background.type` | `BackgroundConfig.type` | `type: "linear"` |
| `background.color1` | `BackgroundConfig.color1` | `color1: "rgba(30, 27, 75, 1)"` |
| `background.imageUrl` | `BackgroundConfig.imageUrl` | `imageUrl: "assets/bg.jpg"` |
| `exportZone.targetWidth` | `ExportZone.targetWidth` | `targetWidth: 1200` |
| `content.<customId>` | `(TextElementModel).text` | `content.main_title: "Bonjour"` |
| `elements.<customId>.<prop>` | `(CanvasElement).<prop>` | `elements.badge.solidColor: "#ff0000"` |
| `images.<customId>` | `(ShapeElementModel \| DeviceElementModel).imageUrl` | `images.logo: "assets/logo.png"` |
| `images.background` | `BackgroundConfig.imageUrl` | `images.background: "assets/cover.jpg"` |

### 6.2 Procédure de Synchronisation lors d'une Évolution
1. **Types TypeScript (`src/types/index.ts`, `src/types/template.ts`)** : Déclarer les nouveaux attributs ou modèles d'éléments.
2. **Moteur Cascade (`src/utils/templateEngine.ts`)** : Prise en charge dans `deepMerge`, `resolveComposition` et `serializeCanvasToMaster`.
3. **Résolution d'assets (`src/utils/bundleIo.ts`)** : Prise en charge des chemins relatifs et mappings d'assets.
4. **Tests Automatisés (`test-template-engine.mjs`)** : Assertion validant la sérialisation, la cascade et les surcharges (`npm test`).
5. **Documentation (`docs/DOCUMENTATION.md`)** : Mise à jour de la présente spécification YAML et des exemples.
