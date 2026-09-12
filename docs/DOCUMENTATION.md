# Guide Complet d'Utilisation & Système de Templates - Banner Studio

Bienvenue dans la documentation officielle de **Banner Studio (FrameMyApp)**. Cette documentation détaille l'ensemble des fonctionnalités de création visuelle, la manipulation du canevas interactif, la gestion de la transparence Alpha, le moteur de templates en cascade (Master, Overrides, Variants), les identifiants personnalisés (`customId`) et le Batch Export.

---

## Sommaire

1. [Vue d'Ensemble & Architecture de l'Interface](#1-vue-densemble--architecture-de-linterface)
2. [Manipulation du Canevas & des Éléments](#2-manipulation-du-canevas--des-éléments)
3. [Gestion des Couleurs, de la Transparence Alpha & des Fonds](#3-gestion-des-couleurs-de-la-transparence-alpha--des-fonds)
4. [Édition Typographique & Textes](#4-édition-typographique--textes)
5. [Formes Géométriques & Textures Graphiques](#5-formes-géométriques--textures-graphiques)
6. [Cadrage & Zone d'Exportation](#6-cadrage--zone-dexportation)
7. [Raccourcis Clavier & Interactions Souris](#7-raccourcis-clavier--interactions-souris)
8. [Système de Templates & Déclinaisons en Cascade](#8-système-de-templates--déclinaisons-en-cascade)
9. [Identifiants Personnalisés (customId)](#9-identifiants-personnalisés-customid)
10. [Spécification & Syntaxe des Fichiers YAML](#10-spécification--syntaxe-des-fichiers-yaml)
11. [Gestion des Assets Graphiques & Résolution](#11-gestion-des-assets-graphiques--résolution)
12. [Batch Export (Export par Lot) & Archives ZIP](#12-batch-export-export-par-lot--archives-zip)
13. [Guide de Maintenance & Évolution du Code](#13-guide-de-maintenance--évolution-du-code)

---

## 1. Vue d'Ensemble & Architecture de l'Interface

Banner Studio adopte les principes de design **Material 3 (M3)** avec support dynamique des thèmes Clair et Sombre, calculs d'élévation d'ombres et palettes de couleurs adaptatives.

### 1.1 Composants de l'Écran

- **En-tête (`Header`)** :
  - **Identité de l'application** : Logo, titre et badge du bundle chargé.
  - **Batch Export** : Déclenchement direct du rendu de toutes les déclinaisons (visible si un bundle est actif).
  - **Historique** : Boutons *Annuler* (`undo`) et *Rétablir* (`redo`).
  - **Nettoyage** : Bouton *Tout effacer* ouvrant un dialogue de confirmation M3 sécurisé.
  - **Contrôles de zoom** : Zoom arrière, affichage du pourcentage (cliquable pour 100%), zoom avant et bouton de recentrage (zoom centré sur le milieu de la composition).
  - **Volet Templates (`auto_stories`)** : Ouverture/fermeture du volet gauche dédié aux presets et identifiants.
  - **Volet Fond (`wallpaper`)** : Accès instantané aux paramètres d'arrière-plan du canevas.
  - **Documentation (`menu_book`)** : Accès direct au présent guide interactif.
  - **Bascule Thème (`light_mode` / `dark_mode`)** : Alternance instantanée entre mode clair et mode sombre.

- **Plan de Travail Central (`CanvasViewport` & `Artboard`)** :
  - Grille millimétrée réactive.
  - Canevas de 800 × 600 px (base de composition).
  - Visualisation de la transparence via motif en damier (*checkerboard pattern*).
  - Masque SVG de zone d'exportation avec assombrissement hors-champ.

- **Volet Latéral Droit (`SideDrawer`)** :
  - Affiche contextuellement les contrôles du fond, du texte sélectionné, de la forme sélectionnée ou de la zone d'export.

- **Volet Latéral Gauche (`LeftSidebar`)** :
  - Onglet **Templates & Bundles** : Arborescence Master, Overrides, Variants et importation/exportation de bundles.
  - Onglet **Custom IDs** : Tableau centralisé de tous les identifiants sémantiques avec attribution automatique.

- **Barre d'Actions Flottante Inférieure (`BottomBar`)** :
  - Boutons d'ajout rapide (FAB M3) : *Ajouter un texte*, *Ajouter une forme*, *Définir la zone d'export*, *Exporter en PNG*.

---

## 2. Manipulation du Canevas & des Éléments

### 2.1 Sélection, Multi-Sélection & Déplacement
- **Sélection unique** : Cliquez simplement sur un élément (texte ou forme) pour faire apparaître le cadre de sélection avec poignées complètes. Pour désélectionner, cliquez dans une zone vide du plan de travail.
- **Multi-Sélection (`Ctrl + Clic` ou `Cmd + Clic`)** :
  - Maintenez la touche `Ctrl` (ou `Cmd` sur macOS) et cliquez sur plusieurs éléments pour les sélectionner ensemble.
  - L'ordre de sélection est mémorisé et affiché via un badge numérique (1, 2, 3...) dans le coin de chaque élément.
  - La sélection de plusieurs éléments ouvre instantanément le **volet d'Alignement & Distribution**.
  - **Déplacement groupé** : Glissez n'importe quel élément de la multi-sélection pour déplacer l'ensemble des éléments sélectionnés de concert avec le même vecteur de déplacement.
- **Déplacement individuel** :
  - Pour les formes : glissez-déposez directement la forme avec le bouton gauche de la souris.
  - Pour les textes : utilisez la poignée supérieure dédiée (*« drag-pill »*) portant l'icône de déplacement afin de ne pas interférer avec l'édition du texte.
  - Déplacement au clavier : touches fléchées pour déplacer d'un pixel (ou `Shift + Flèches` pour des incréments de 10 pixels).

### 2.2 Hiérarchie & Ordre des Calques (Z-Index)
Lorsqu'un élément est sélectionné seul, son panneau de propriétés (Texte ou Forme) intègre la section **Hiérarchie & Calques** :
- **Indicateur de niveau** : Affiche la position de l'élément dans la pile (ex: *Niveau 3 / 5*).
- **1er plan (`vertical_align_top`)** : Place l'élément au sommet absolu de la pile (au-dessus de tous les autres éléments).
- **Monter (`keyboard_arrow_up`)** : Monte l'élément d'un cran au-dessus de son voisin direct.
- **Descendre (`keyboard_arrow_down`)** : Descend l'élément d'un cran sous son voisin direct.
- **Arrière-plan (`vertical_align_bottom`)** : Place l'élément à la base de la pile (sous tous les autres éléments).
- Les boutons se désactivent automatiquement lorsque l'élément a déjà atteint le sommet ou la base.

### 2.3 Volet d'Alignement & Espacement Uniforme (Distribution)
Accessible automatiquement lors de la sélection de 2 éléments ou plus via `Ctrl + Clic` :
- **Cible de référence** :
  1. **1er sélectionné** : Utilise le premier élément cliqué comme ancre de référence fixe.
  2. **Dernier sélectionné** : Utilise le dernier élément cliqué comme ancre de référence fixe.
  3. **Composition** : Aligne par rapport aux dimensions et limites de la composition globale (`canvasWidth` × `canvasHeight`).
- **Alignement Horizontal** :
  - *À gauche* (`align_horizontal_left`) : Aligne les bords gauches.
  - *Centrer H* (`align_horizontal_center`) : Centre horizontalement sur l'axe de référence.
  - *À droite* (`align_horizontal_right`) : Aligne les bords droits.
- **Alignement Vertical** :
  - *En haut* (`align_vertical_top`) : Aligne les bords supérieurs.
  - *Centrer V* (`align_vertical_center`) : Centre verticalement sur l'axe de référence.
  - *En bas* (`align_vertical_bottom`) : Aligne les bords inférieurs.
- **Espacement Uniforme (Distribution)** :
  - *Horizontal* (`horizontal_distribute`) : Égalise les intervalles horizontaux entre chaque élément ou sur la largeur de la composition.
  - *Vertical* (`vertical_distribute`) : Égalise les intervalles verticaux entre chaque élément ou sur la hauteur de la composition.
  - *Espacement fixe personnalisé* : Option permettant de définir un espacement précis en pixels (curseur ou saisie numérique).
- **Suppression groupée** : Permet de supprimer d'un coup tous les éléments de la multi-sélection (via le bouton dédié ou la touche `Suppr`).

### 2.4 Redimensionnement & Rotation
- **Redimensionnement** :
  - 8 poignées circulaires entourent l'élément sélectionné (4 coins et 4 centres de bordure).
  - Glissez une poignée pour ajuster la largeur ou la hauteur.
  - Maintenez la touche `Shift` enfoncée pendant le redimensionnement pour conserver le ratio d'aspect.
- **Rotation** :
  - Une poignée circulaire supérieure reliée par une tige permet d'effectuer une rotation libre à 360°.
  - Glissez la poignée circulaire pour pivoter l'élément. L'angle exact en degrés est calculé et mémorisé.

### 2.3 Édition de Texte en Ligne
- Cliquez directement sur un bloc de texte pour éditer son contenu sur place.
- La modification est immédiatement synchronisée avec le store de l'application et conservée dans l'historique d'annulation.

### 2.4 Drag & Drop d'Images Externes & Adaptation de la Composition
- Vous pouvez glisser-déposer une image (`.png`, `.jpg`, `.webp`, `.svg`) depuis votre gestionnaire de fichiers :
  - **Sur une forme** : l'image devient la texture de remplissage de cette forme.
  - **Sur le fond du canevas** : l'image est automatiquement définie comme arrière-plan. La **composition adopte instantanément les dimensions réelles** de l'image (`naturalWidth` × `naturalHeight`) et la **zone de cadrage/crop est initialisée sur ces mêmes dimensions**. L'utilisateur reste ensuite entièrement libre de déplacer, redimensionner ou modifier la zone de cadrage à sa guise.

---

## 3. Gestion des Couleurs, de la Transparence Alpha & des Fonds

### 3.1 Gestion Intégrale de l'Alpha (Canal Opacité)
Banner Studio gère la composante de transparence dans toutes les teintes :
- **Format RGBA** : `rgba(r, g, b, a)` où l'alpha est normalisé entre 0 et 1.
- **Format HEX8** : format hexadécimal à 8 caractères `#RRGGBBAA` (ex: `#6750A4FF` pour 100% opaque, `#00000080` pour 50% de noir).
- **Composant `ColorAlphaPicker`** :
  - Sélecteur de teinte visuel.
  - Curseur d'opacité de 0 % à 100 %.
  - Champ de saisie direct acceptant aussi bien `#RRGGBB` que `#RRGGBBAA`.
  - Aperçu bicolore avec damier en arrière-plan pour voir immédiatement le niveau de transparence.

### 3.2 Types d'Arrière-Plan Disponibles
Le panneau de fond propose 4 modes :
1. **Couleur Unie (`solid`)** : Teinte unique avec transparence configurable.
2. **Dégradé Linéaire (`linear`)** : Deux couleurs (avec alpha indépendant) orientées selon un angle réglable (0° à 360°).
3. **Dégradé Radial (`radial`)** : Deux couleurs rayonnant depuis le centre vers les bordures.
4. **Image d'arrière-plan (`image`)** :
   - Importation d'une image locale (clic ou drag & drop) ou saisie d'une URL.
   - **Adaptation automatique** : la composition et la zone de crop s'ajustent instantanément à la taille native de l'image téléchargée, avec ajustement automatique du zoom pour un confort optimal.
   - Mode de redimensionnement : *Couvrir (Cover)*, *Contenir (Contain)*, ou *Étirer (Stretch)*.
   - Opacité globale de l'image (0 à 100%).

---

## 4. Édition Typographique & Textes

Lorsqu'un élément de texte est sélectionné, le panneau **TextControls** offre :

- **Identifiant Personnalisé (`customId`)** : Clé unique utilisée pour la traduction et la surcharge YAML (ex: `main_title`, `badge_caption`).
- **Contenu du texte** : Zone de saisie multi-lignes.
- **Famille de police** : Choix parmi une sélection de polices Google Fonts embarquées (Roboto, Inter, Poppins, Montserrat, Playfair Display, DM Serif Display, Space Grotesk, Oswald, Pacifico, Lobster, Dancing Script, Caveat, Cinzel).
- **Taille de police** : De 10 px à 180 px.
- **Graisse (Font Weight)** : De 100 (Thin) à 900 (Black).
- **Espacements** :
  - *Interligne (Line Height)* : Hauteur de ligne relative.
  - *Espacement des lettres (Letter Spacing)* : Suivi typographique en pixels.
- **Alignement horizontal** : Gauche, Centré, Droite, Justifié.
- **Styles rapides** : Gras (`B`), Italique (`I`), Souligné (`U`), Majuscules (`TT`).
- **Couleur du texte** : Sélecteur complet avec gestion de l'alpha.
- **Effet de Lueur (Glow) / Halo** :
  - Activation, couleur de lueur (avec alpha), intensité du flou et décalage horizontal / vertical.
- **Ombre Portée (Shadow)** :
  - Activation, couleur d'ombre, flou, distance X et Y.
- **Contour de texte (Stroke)** :
  - Activation, épaisseur en pixels et couleur du contour.

---

## 5. Formes Géométriques & Textures Graphiques

Lorsqu'une forme est sélectionnée, le panneau **ShapeControls** offre :

- **Identifiant Personnalisé (`customId`)** : Clé pour surcharges YAML (ex: `cta_btn`, `card_container`).
- **Formes disponibles** :
  - *Rectangle*
  - *Rectangle Arrondi* (rayon de courbure configurable de 0 à 150 px)
  - *Cercle / Ovale*
  - *Étoile à 5 branches*
  - *Hexagone*
  - *Badge Promotionnel*
- **Remplissage** :
  - *Couleur Unie* (avec transparence Alpha).
  - *Dégradé Linéaire & Radial Multi-Étapes* :
    - Gestion complète des stops/étapes intermédiaires avec bouton **« Ajouter une étape »**.
    - Sélecteur de couleur indépendant avec canal Alpha pour chaque point du dégradé.
    - Curseur de positionnement sur l'axe (0% à 100%).
    - Suppression individuelle des étapes intermédiaires (avec maintien d'un minimum de 2 étapes).
    - Barre de prévisualisation live du nuancier sur fond damier.
    - Curseur d'angle d'orientation (0° à 360° pour le linéaire) ou rayon concentrique (pour le radial).
  - *Image / Texture* (avec ajustement et opacité).
- **Bordure / Contour** :
  - Épaisseur de bordure (0 à 20 px).
  - Couleur de bordure (avec alpha).
  - Style de bordure : Plein (`solid`), Tirets (`dashed`), Pointillés (`dotted`).
- **Ombre Portée** :
  - Couleur, flou, décalage X et décalage Y.
- **Ordre d'empilement (Z-Index)** :
  - Passer au premier plan, monter d'un niveau, descendre d'un niveau, passer à l'arrière-plan.

---

## 6. Cadrage & Zone d'Exportation

Banner Studio permet d'isoler une région précise de la composition lors du rendu final et de définir librement les dimensions de sortie :

### 6.1 Résolution Cible Réelle & Dimensions Souhaitées Custom
- **Saisie Libre des Dimensions** : Vous pouvez indiquer librement la largeur (`targetWidth`) et la hauteur (`targetHeight`) en pixels de votre rendu (de 50 px à 10 000 px, jusqu'en 4K Ultra HD ou 8K).
- **Verrouillage du Ratio (*« Conserver les proportions »*)** :
  - **Option cochée (🔒 Proportions verrouillées)** : Ajuster la largeur ou la hauteur recalcule automatiquement la seconde dimension pour préserver rigoureusement le ratio d'aspect (`ratio = targetWidth / targetHeight`).
  - **Option décochée (🔓 Dimensions libres)** : Vous pouvez saisir n'importe quelle largeur et hauteur de manière indépendante. Le ratio de cadrage est immédiatement recalculé et le cadre de sélection sur le canevas s'adapte automatiquement à ce nouveau ratio.
- **Permutation d'Orientation** : Le bouton *« Permuter »* inverse instantanément la largeur et la hauteur pour basculer la composition entre mode Paysage et mode Portrait.

### 6.2 Préréglages de Formats Sociaux & HD
Des presets prédéfinis permettent d'appliquer instantanément les standards graphiques courants :
- *Instagram Carré (1:1)* : 1080 × 1080 px
- *Story / TikTok / Reels (9:16)* : 1080 × 1920 px (format vertical)
- *YouTube / Écran HD (16:9)* : 1920 × 1080 px (vignettes & présentations)
- *Bannière Web / OpenGraph (1.91:1)* : 1200 × 630 px (partage Facebook, LinkedIn & Twitter card)
- *En-tête Twitter / X (3:1)* : 1500 × 500 px
- *Format 4K Ultra HD (16:9)* : 3840 × 2160 px

### 6.3 Cadrage & Manipulation sur le Plan de Travail
- **Tracé au Curseur** : Activez *« Tracer un cadre au curseur »* et glissez sur le canevas pour délimiter interactivement la zone d'exportation.
- **Poignées de Redimensionnement de Coin** : 4 poignées interactives permettent d'ajuster la taille du cadre directement sur le canevas. Si le verrouillage de ratio est actif, les proportions sont scrupuleusement conservées lors de l'étirement.
- **Déplacement du Cadre** : Glissez le cadre sur le canevas pour repositionner la zone de prise de vue.
- **Centrage Automatique** : Bouton *« Centrer le cadre »* pour caler instantanément le cadrage au centre du plan de travail.
- **Plein Canevas** : Bouton *« Plein canevas »* pour étendre la zone d'export à l'intégralité du plan de travail (800 × 600 px).

---

## 7. Raccourcis Clavier & Interactions Souris

| Raccourci / Geste | Action correspondante |
|:---|:---|
| `Ctrl + Clic` / `Cmd + Clic` | Ajouter ou retirer un élément de la sélection multiple (ouvre le volet d'Alignement & Distribution) |
| `Ctrl + Z` / `Cmd + Z` | Annuler la dernière action |
| `Ctrl + Y` / `Cmd + Shift + Z` | Rétablir la dernière action annulée |
| `Suppr` / `Delete` / `Backspace` | Supprimer l'élément sélectionné ou l'ensemble des éléments multi-sélectionnés |
| `Échap` / `Escape` | Fermer la modale active ou fermer la documentation |
| `Flèches directionnelles` | Déplacer l'élément sélectionné de 1 pixel |
| `Shift + Flèches directionnelles` | Déplacer l'élément sélectionné de 10 pixels |
| `Molette de la souris` (sur le canevas) | Zoomer et dézoomer interactivement (20% à 350%) en conservant le point sous le curseur comme point fixe (style Inkscape) |
| `Loupes de zoom / boutons +/-` | Zoomer et dézoomer centré sur le milieu de la composition |
| `Clic molette / Espace + Glisser` | Panoramique interactif du canevas |
| `Shift + Redimensionnement` | Conserver le ratio hauteur/largeur d'un élément |
| `Glisser-déposer de fichier` | Assigner une image de fond ou une texture de forme |

---

## 8. Système de Templates & Déclinaisons en Cascade

Le moteur de templates permet d'automatiser la création de bannières déclinées en plusieurs langues, thèmes ou formats publicitaires sans dupliquer les fichiers volumineux.

### 8.1 La Hiérarchie en Cascade

```text
📁 bundle/ (ou archive .zip)
│
├── 📄 master.yml                  # 1. Base globale : fond, zone d'export, styles de textes et formes
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

### 8.2 Ordre de Fusion en Cascade (`resolveComposition`)
Lorsqu'une déclinaison (`variant`) est sélectionnée ou exportée :
1. **Master (`master.yml`)** : Charge l'intégralité des éléments, positions, dimensions et styles initiaux.
2. **Override (`overrides/<slug>.yml`)** : Si un override portant le même identifiant existe, ses propriétés écrasent celles du master.
3. **Variant (`variants/<lang>/<slug>.yml`)** : Les traductions textuelles et les surcharges spécifiques à la langue écrasent les propriétés précédentes.
4. **Résolution d'assets** : Les images référencées sont résolues prioritairement dans `assets/<lang>/` puis dans `assets/`.

---

## 9. Identifiants Personnalisés (customId)

Pour que les fichiers YAML puissent cibler les textes et formes indépendamment de leur identifiant technique interne (ex: `txt-1718900`), chaque élément possède un **`customId`**.

### 9.1 Attribution des Identifiants
- **Dans TextControls / ShapeControls** : Champ de texte *« ID Personnalisé (customId) »*.
- **Dans le volet gauche (Onglet « Custom IDs »)** :
  - Tableau de synthèse affichant chaque élément, son type, son aperçu et son `customId`.
  - Bouton **« Auto-ID »** : Attribue instantanément des identifiants parlants (`title`, `subtitle`, `badge`, `cta_button`, etc.).

---

## 10. Spécification & Syntaxe des Fichiers YAML

### 10.1 Exemple de `master.yml`
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
```

### 10.2 Exemple d'Override (`overrides/01_flash_sale.yml`)
```yaml
background:
  type: "linear"
  color1: "rgba(220, 38, 38, 1)"
  color2: "rgba(127, 29, 29, 1)"
elements:
  cta_btn:
    solidColor: "rgba(251, 191, 36, 1)"
```

### 10.3 Exemple de Variante (`variants/fr/01_flash_sale.yml`)
```yaml
content:
  main_title: "Vente Flash Exceptionnelle !"
  cta_text: "Découvrir les offres"
images:
  background: "banner_fr.jpg"
```

### 10.4 Exemple de Variante (`variants/en/01_flash_sale.yml`)
```yaml
content:
  main_title: "Limited Time Flash Sale!"
  cta_text: "Shop Now"
images:
  background: "banner_en.jpg"
```

---

## 11. Gestion des Assets Graphiques & Résolution

Lorsque vous utilisez des images relatives dans vos fichiers YAML (`images: { background: "mon_fond.jpg" }`) :
- Le moteur cherche d'abord dans le dossier spécifique de la langue : `assets/<lang>/mon_fond.jpg`.
- S'il n'y figure pas, il remonte à la racine partagée des ressources : `assets/mon_fond.jpg`.
- Cette règle permet de partager un logo global tout en ayant des captures d'écran traduites selon la langue.

---

## 12. Batch Export (Export par Lot) & Archives ZIP

La boîte de dialogue **Batch Export** automatise la génération de l'intégralité des visuels :

### 12.1 Organisation en Groupes Repliables & Sélection Intelligente
- Les éléments à générer sont structurés en 3 sections avec caret repliable :
  - **Master (Canevas de référence)** : replié et non sélectionné par défaut.
  - **Overrides (Surcharges thématiques)** : replié et non sélectionnées par défaut.
  - **Variantes (Déclinaisons multilingues)** : déplié et sélectionnées par défaut pour un export ciblé immédiat des déclinaisons finales.
- Chaque groupe dispose de sa propre case à cocher d'en-tête (avec gestion de l'état indéterminé) et d'un compteur dédié (*ex: 0 / 6* ou *42 / 42*).
- Des raccourcis globaux *« Tout cocher »* et *« Tout décocher »* permettent d'ajuster l'ensemble de la liste en un clic.

### 12.2 Export direct sur Dossier Disque (File System Access API)
- Cliquez sur **« Sélectionner un dossier de destination »**.
- L'application crée un sous-répertoire horodaté reproduisant fidèlement l'arborescence :
  - `master.png`
  - `overrides/01_flash_sale.png`
  - `variants/fr/01_flash_sale.png`
  - `variants/en/01_flash_sale.png`
- La progression est affichée en direct avec barre de pourcentage et nom de chaque déclinaison en cours de capture.

### 12.3 Fallback Archive ZIP
- Si votre navigateur ne supporte pas la sélection directe de répertoire ou si vous préférez une archive unique, cliquez sur **« Télécharger en archive ZIP »**. L'archive contiendra l'arborescence complète générée.

---

## 13. Guide de Maintenance & Évolution du Code

Toute évolution de FrameMyApp-Banner doit respecter la politique de synchronisation stricte :

### Règle des 6 Étapes de Synchronisation :
1. **Types TypeScript (`src/types/`)** : Déclarer le nouvel attribut dans `index.ts` et `template.ts`.
2. **Moteur Cascade (`src/utils/templateEngine.ts`)** : Prise en charge dans `deepMerge`, `resolveComposition` et `serializeCanvasToMaster`.
3. **Contrôles UI (`src/components/drawer/`)** : Contrôleur interactif dans le panneau correspondant.
4. **Volet Gauche & Contexte (`LeftSidebar.tsx`, `EditorContext.tsx`)** : Prise en compte dans l'état et dans la liste des Custom IDs.
5. **Tests Automatisés (`test-template-engine.mjs`)** : Assertion validant la sérialisation et la fusion en cascade (`npm test`).
6. **Documentation & Skill (`docs/DOCUMENTATION.md` & `.skills/`)** : Mise à jour synchrone et impérative de la documentation et de la skill associée.
