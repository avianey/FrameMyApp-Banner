# Guide Complet d'Utilisation & Système de Templates - FrameMy.App Studio

Bienvenue dans la documentation officielle de **FrameMy.App Studio**. Cette documentation détaille l'ensemble des fonctionnalités de création visuelle, la manipulation du canevas interactif, la gestion de la transparence Alpha, le moteur de templates en cascade (Master, Overrides, Variants), les identifiants personnalisés (`customId`), la synchronisation disque locale et le Batch Export.

---

## Sommaire

1. [Vue d'Ensemble & Architecture de l'Interface](#1-vue-densemble--architecture-de-linterface)
2. [Manipulation du Canevas & des Éléments](#2-manipulation-du-canevas--des-éléments)
3. [Gestion des Couleurs, de la Transparence Alpha & des Fonds](#3-gestion-des-couleurs-de-la-transparence-alpha--des-fonds)
4. [Édition Typographique & Textes](#4-édition-typographique--textes)
5. [Formes Géométriques & Textures Graphiques](#5-formes-géométriques--textures-graphiques)
6. [Cadrage & Zone d'Exportation](#6-cadrage--zone-dexportation)
7. [Raccourcis Clavier & Interactions Souris](#7-raccourcis-clavier--interactions-souris)
8. [Sauvegarde, Synchronisation Disque & Exports](#8-sauvegarde-synchronisation-disque--exports)
9. [Système de Templates & Déclinaisons en Cascade](#9-système-de-templates--déclinaisons-en-cascade)
10. [Identifiants Personnalisés (customId)](#10-identifiants-personnalisés-customid)
11. [Spécification & Syntaxe des Fichiers YAML](#11-spécification--syntaxe-des-fichiers-yaml)
12. [Gestion des Assets Graphiques & Résolution](#12-gestion-des-assets-graphiques--résolution)
13. [Batch Export (Export par Lot) & Archives ZIP](#13-batch-export-export-par-lot--archives-zip)
14. [Guide de Maintenance & Évolution du Code](#14-guide-de-maintenance--évolution-du-code)

---

## 1. Vue d'Ensemble & Architecture de l'Interface

FrameMy.App Studio adopte les principes de design **Material 3 (M3)** avec support dynamique des thèmes Clair et Sombre, calculs d'élévation d'ombres et palettes de couleurs adaptatives.

### 1.1 Composants de l'Écran

- **En-tête (`Header`)** :
  - **Identité de l'application & Sous-titre de projet** : Logo, titre **FrameMy.App Studio**, sous-titre affichant le nom du projet courant (par défaut `Projet sans nom`, modifiable à tout moment), et badge du bundle actif.
  - **Bouton de synchronisation disque** : Situé directement à droite du titre, il affiche le statut de synchronisation en temps réel (icône `cloud_done` verte si à jour, icône `sync` orange si des modifications sont en attente, ou animation de rotation lors de l'écriture sur le disque). Un clic déclenche la synchronisation immédiate ou ouvre le panneau de configuration.
  - **Batch Export** : Déclenchement direct du rendu de toutes les déclinaisons (visible si un bundle est actif).
  - **Historique** : Boutons *Annuler* (`undo`) et *Rétablir* (`redo`). L'historique est conservé dans le cache local du navigateur et n'est pas persisté sur disque.
  - **Nettoyage** : Bouton *Tout effacer* ouvrant un dialogue de confirmation M3 sécurisé.
  - **Contrôles de zoom** : Zoom arrière, affichage du pourcentage (cliquable pour 100%), zoom avant et bouton de recentrage (zoom centré sur le milieu de la composition).
  - **Volet Ouvrir Templates & Bundles (`folder_open`)** : Ouverture/fermeture du volet gauche dédié aux presets, à l'arborescence de bundle et aux identifiants.
  - **Panneau de Sauvegarde & Synchronisation (`save`)** : Accès direct au dialogue de gestion du projet (nom, synchronisation sur dossier ou fichier local, sauvegarde automatique, exports Template YML et Bundle ZIP).
  - **Volet Fond (`wallpaper`)** : Accès instantané aux paramètres d'arrière-plan du canevas.
  - **Documentation (`menu_book`)** : Accès direct au présent guide interactif.
  - **Bascule Thème (`light_mode` / `dark_mode`)** : Alternance instantanée entre mode clair et mode sombre.

- **Plan de Travail Central (`CanvasViewport` & `Artboard`)** :
  - Grille millimétrée réactive.
  - Canevas de 800 × 600 px (base de composition).
  - Visualisation de la transparence via motif en damier (*checkerboard pattern*).
  - Masque SVG de zone d'exportation avec assombrissement hors-champ.

- **Volet Latéral Droit (`SideDrawer`)** :
  - Affiche contextuellement les contrôles du fond, du texte sélectionné, de la forme sélectionnée, de l'appareil (device) sélectionné ou de la zone d'export.

- **Volet Latéral Gauche (`LeftSidebar`)** :
  - Onglet **Templates & Bundles** : Arborescence Master, Overrides, Variants et importation/exportation de bundles.
  - Onglet **Custom IDs** : Tableau centralisé de tous les identifiants sémantiques (textes, formes, appareils) avec attribution automatique.

- **Barre d'Actions Flottante Inférieure (`BottomBar`)** :
  - Boutons d'ajout rapide (FAB M3) : *Fond*, *+ Texte*, *+ Forme*, *+ Appareil* (avec menu de sélection immédiate parmi Pixel 10, iPhone Pro Max, Samsung Galaxy, Pixel Tab), *Export*.

---

## 2. Manipulation du Canevas & des Éléments

### 2.1 Sélection, Multi-Sélection & Déplacement
- **Sélection unique** : Cliquez simplement sur un élément (texte ou forme) pour faire apparaître le cadre de sélection avec poignées complètes. Pour désélectionner, cliquez dans une zone vide du plan de travail.
- **Multi-Sélection (`Ctrl + Clic` ou `Cmd + Clic`)** :
  - Maintenez la touche `Ctrl` (ou `Cmd` sur macOS) et cliquez sur plusieurs éléments pour les sélectionner ensemble.
  - L'ordre de sélection est mémorisé et affiché via un badge numérique (1, 2, 3...) dans le coin de chaque élément.
  - La sélection de plusieurs éléments ouvre instantanément le **volet d'Alignement & Distribution**.
  - **Déplacement groupé** : Glissez n'importe quel élément de la multi-sélection pour déplacer l'ensemble des éléments sélectionnés de concert avec le même vecteur de déplacement.
- **Déplacement individuel & groupé** :
  - Pour les formes : glissez-déposez directement la forme avec le bouton gauche de la souris.
  - Pour les textes : utilisez la poignée supérieure dédiée (*« drag-pill »*) portant l'icône de déplacement afin de ne pas interférer avec l'édition du texte.
  - Pour les appareils (mockups) : glissez-déposez directement l'appareil avec le bouton gauche de la souris.
  - **Déplacement de précision au clavier (touches fléchées)** : lorsqu'un ou plusieurs éléments sont sélectionnés (texte, forme ou appareil), utilisez les flèches directionnelles (`←`, `→`, `↑`, `↓`) pour les déplacer de **1 px** par impulsion (ou en continu). Utilisez la combinaison `Shift + Flèches directionnelles` pour les déplacer par pas de **10 px**. L'historique d'annulation (`Ctrl + Z`) regroupe les déplacements continus pour une annulation propre en un seul cran.

### 2.2 Hiérarchie & Ordre des Calques (Z-Index)
Lorsqu'un élément est sélectionné seul, son panneau de propriétés (Texte, Forme ou Appareil) intègre la section **Hiérarchie & Calques** :
- **Indicateur de niveau** : Affiche la position de l'élément dans la pile (ex: *Niveau 3 / 5*).
- **1er plan (`vertical_align_top`)** : Place l'élément au sommet absolu de la pile (au-dessus de tous les autres éléments).
- **Monter (`keyboard_arrow_up`)** : Monte l'élément d'un cran au-dessus de son voisin direct.
- **Descendre (`keyboard_arrow_down`)** : Descend l'élément d'un cran sous son voisin direct.
- **Arrière-plan (`vertical_align_bottom`)** : Place l'élément à la base de la pile (sous tous les autres éléments).
- Les boutons se désactivent automatiquement lorsque l'élément a déjà atteint le sommet ou la base.

### 2.3 Alignement & Collage sur la Scène (Élément Unique)
Présent directement sous les contrôles de changement de plan dans le volet d'options lorsqu'un élément individuel (Texte, Forme ou Appareil) est sélectionné seul :
- **Raccourci « Centrer tout » (`filter_center_focus`)** : Positionne instantanément l'élément au centre absolu de la scène (horizontalement et verticalement).
- **Alignement Horizontal** :
  - *À gauche* (`align_horizontal_left`) : Colle l'élément contre la bordure gauche de la composition (`x = 0`).
  - *Centrer H* (`align_horizontal_center`) : Centre l'élément horizontalement par rapport à la largeur de la scène.
  - *À droite* (`align_horizontal_right`) : Colle l'élément contre la bordure droite de la composition (`x = canvasWidth - width`).
- **Alignement Vertical** :
  - *En haut* (`align_vertical_top`) : Colle l'élément contre la bordure supérieure de la composition (`y = 0`).
  - *Centrer V* (`align_vertical_center`) : Centre l'élément verticalement par rapport à la hauteur de la scène.
  - *En bas* (`align_vertical_bottom`) : Colle l'élément contre la bordure inférieure de la composition (`y = canvasHeight - height`).
- Chaque action est conservée dans l'historique d'annulation (`Ctrl+Z` / `Ctrl+Y`) et affiche une notification contextuelle (Snackbar).

### 2.4 Volet d'Alignement & Espacement Uniforme (Multi-sélection)
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

### 2.5 Redimensionnement, Rotation & Contrôles Indépendants du Zoom
- **Redimensionnement à 8 poignées (4 coins + 4 côtés)** :
  - L'élément sélectionné (texte, forme ou appareil) présente 8 poignées circulaires interactives parfaitement centrées sur les 4 angles (`NW`, `NE`, `SE`, `SW`) et sur les milieux des 4 segments (`N`, `E`, `S`, `W`) de la boîte de sélection.
  - Le curseur de redimensionnement s'oriente dynamiquement selon l'angle de rotation de l'élément pour une manipulation intuitive sous tous les angles.
  - **Glisser simple** : redimensionnement libre depuis le coin ou le bord opposé (qui reste ancré comme point fixe).
  - **`Ctrl` + Glisser** (ou `Cmd` + Glisser) : conserve strictement le ratio d'aspect initial (proportions verrouillées).
  - **`Shift` + Glisser** : redimensionnement symétrique ancré au centre (le centre géométrique de l'élément reste invariant).
  - **`Ctrl` + `Shift` + Glisser** (ou `Cmd` + `Shift` + Glisser) : conserve le ratio d'aspect **et** ancre le centre géométrique de l'élément.
  - *Cas particulier des appareils avec capture d'écran* : le ratio d'aspect est automatiquement verrouillé sur le ratio exact de la capture pour garantir une fidélité parfaite sans déformation.
- **Taille Fixe et Épaisseur Indépendantes du Zoom de la Scène** :
  - Quel que soit le facteur de zoom (de 20% à 350%), tous les contrôles d'interaction (poignées circulaires de 13 px, ancre de rotation de 22 px, tige verticale, rectangle « Déplacer » des blocs de texte, badges numériques et cadre de sélection de 2 px) conservent une **taille et une netteté visuelle strictement constantes à l'écran**, évitant qu'ils ne deviennent microscopiques en dézoomant ou géants en zoomant.
- **Rotation & Espacement Visuel Confortable** :
  - Une poignée circulaire supérieure reliée par une tige permet d'effectuer une rotation libre à 360°.
  - L'ancre de rotation est espacée d'une distance de sécurité généreuse au-dessus du bord supérieur et de l'ancre `N` pour éviter tout chevauchement ou confusion lors de la manipulation.
  - Glissez la poignée circulaire pour pivoter l'élément. L'angle exact en degrés est calculé et mémorisé.

### 2.6 Édition de Texte en Ligne
- Cliquez directement sur un bloc de texte pour éditer son contenu sur place.
- La modification est immédiatement synchronisée avec le store de l'application et conservée dans l'historique d'annulation.

### 2.7 Drag & Drop d'Images Externes & Feedback Visuel
- Vous pouvez glisser-déposer une image (`.png`, `.jpg`, `.webp`, `.svg`) directement depuis votre gestionnaire de fichiers :
  - **Directement sur un appareil (Device survolé au premier plan)** : un halo visuel dynamique et un badge contextuel *« Déposer la capture d'écran »* s'affichent au survol. Au lâcher, l'image devient la capture d'écran du mockup, l'élément est sélectionné et sa hauteur s'adapte automatiquement au ratio d'aspect exact de l'image (sans déformation).
  - **Directement sur une forme (Shape survolée au premier plan)** : un halo visuel et un badge *« Déposer la texture »* apparaissent. Au lâcher, l'image devient la texture de remplissage de cette forme et le volet de propriétés s'ouvre automatiquement.
  - **Sur le fond du canevas** : l'image est automatiquement définie comme arrière-plan. La **composition adopte instantanément les dimensions réelles** de l'image (`naturalWidth` × `naturalHeight`) et la **zone de cadrage/crop est initialisée sur ces mêmes dimensions**. L'utilisateur reste ensuite entièrement libre de déplacer, redimensionner ou modifier la zone de cadrage à sa guise.
- **Uniformisation des Volets Latéraux (Arrière-plan, Appareil, Formes)** :
  - Tous les sélecteurs d'images partagent un composant standardisé : un champ pointillé cliquable et droppable avec icône `cloud_upload`, basculant automatiquement vers un aperçu élégant dès le chargement de l'image, équipé d'un bouton de suppression rapide en coin supérieur droit et acceptant le glisser-déposer pour un remplacement instantané.

---

## 3. Dimensions de la Scène & Gestion de l'Arrière-Plan

### 3.1 Paramétrage des Dimensions de la Scène (Canvas)
En tête du panneau de réglage de fond, une section dédiée permet de configurer les dimensions natives du canevas (`canvasWidth` et `canvasHeight`) :
- **Saisie manuelle en pixels** : Largeur et Hauteur personnalisables (de 100 à 8000 px).
- **Recentrage et zoom dynamique** : La scène se recentre automatiquement dans le viewport avec adaptation intelligente du facteur de zoom.
- **Bouton « Adapter le cadre d'export à la scène »** : Recouvre instantanément l'intégralité du canevas pour l'exportation.
- **Presets Cards populaires** :
  - *Google Play Screenshot (9:16)* (1080 × 1920 px)
  - *Google Play Bannière* (1024 × 500 px)
  - *YouTube / Écran HD 16:9* (1920 × 1080 px)
  - *Bannière Web / OpenGraph* (1200 × 630 px)
  - *Format Carré 1:1 Instagram* (1080 × 1080 px)
  - *Story / Reels / TikTok 9:16* (1080 × 1920 px)
  - *En-tête Twitter / X 3:1* (1500 × 500 px)
  - *Standard Studio* (800 × 600 px)

### 3.2 Gestion Intégrale de l'Alpha (Canal Opacité)
FrameMy.App Studio gère la composante de transparence dans toutes les teintes :
- **Format RGBA** : `rgba(r, g, b, a)` où l'alpha est normalisé entre 0 et 1.
- **Format HEX8** : format hexadécimal à 8 caractères `#RRGGBBAA` (ex: `#6750A4FF` pour 100% opaque, `#00000080` pour 50% de noir).
- **Composant `ColorAlphaPicker`** :
  - Sélecteur de teinte visuel.
  - Curseur d'opacité de 0 % à 100 %.
  - Champ de saisie direct acceptant aussi bien `#RRGGBB` que `#RRGGBBAA`.
  - Aperçu bicolore avec damier en arrière-plan pour voir immédiatement le niveau de transparence.

### 3.3 Types d'Arrière-Plan Disponibles
Le panneau de fond propose 4 modes :
1. **Couleur Unie (`solid`)** : Teinte unique avec transparence configurable.
2. **Dégradé Linéaire (`linear`)** : Deux couleurs (avec alpha indépendant) orientées selon un angle réglable (0° à 360°).
3. **Dégradé Radial (`radial`)** : Deux couleurs rayonnant depuis le centre vers les bordures.
4. **Image d'arrière-plan (`image`)** :
   - Importation d'une image locale (clic ou drag & drop) ou saisie d'une URL. Les dimensions de la scène restent **strictement fixes** et ne sont pas écrasées lors du chargement.
   - **Ouverture directe du panneau** : Un simple clic sur l'arrière-plan ou la scène ouvre instantanément le volet de configuration de fond (`bg`) et désélectionne les éléments actifs.
   - **Mode Ajustement & Recadrage interactif (Double-clic)** :
     - En double-cliquant sur la scène (ou en cliquant sur *« Ajuster / Déplacer l'image »* dans le panneau), l'utilisateur entre en mode manipulation d'image in-place.
     - **Déplacement au curseur** : Glisser l'image pour la repositionner librement dans le cadre.
     - **Zoom / Échelle** : Molette de la souris ou boutons flottants pour zoomer (de 100% à 500%). En mode *Remplir (Cover)*, l'image ne peut pas être réduite en dessous de 100% pour garantir qu'elle recouvre toujours intégralement la scène.
     - **Retour élastique sur les bords (Rubber-Band)** : Si l'utilisateur tire l'image au-delà des limites (par exemple le bord droit plus à gauche que le bord droit de la scène), une résistance élastique s'applique et l'image rebondit automatiquement sur le bord strict au relâchement.
     - **Persistance YAML** : Les coordonnées de décalage (`imageOffsetX`, `imageOffsetY`) et le facteur d'échelle (`imageScale`) sont automatiquement sauvegardés et persistés dans les templates YAML.
     - **Formes avec texture image** : Le même comportement s'applique aux formes géométriques (`ShapeElement`) remplies avec une image (double-clic pour ajuster l'image dans la forme).
   - Mode de redimensionnement : *Remplir (Cover)* ou *Ajuster (Contenir)*.
   - **Floutage de l'image (`imageBlurEnable` & `imageBlur`)** :
     - Case à cocher pour activer/désactiver le flou artistique sur l'image d'arrière-plan.
     - Curseur d'intensité de flou (1 à 50 px, valeur par défaut de 1 px) avec prévisualisation en direct et rendu fidèle lors des exports batch et haute résolution.
   - **Voile de couleur de premier plan (`imageOverlayEnable` & `imageOverlayColor`)** :
     - Case à cocher pour appliquer un voile coloré (foreground scrim) superposé entre l'image d'arrière-plan et les éléments graphiques/textuels (désactivé par défaut).
     - Couleur par défaut avec canal alpha : `#FFFFFF11` (`rgba(255, 255, 255, 0.07)`).
     - Sélecteur complet avec pipette et canal alpha (`ColorAlphaPicker`) permettant d'ajuster précisément la teinte et l'intensité du filtre (ex: obscurcir ou éclaircir l'image pour optimiser la lisibilité des titres).
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

### 5.1 Formes Géométriques
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
- **Effets Visuels Mutualisés (`glow` & `shadow`)** :
  - *Effet de Lueur (Glow)* : activation, couleur avec canal Alpha, rayon de lueur, décalages X et Y (supporté sur toutes les géométries, y compris les formes découpées `clip-path` comme l'étoile et l'hexagone).
  - *Ombre Portée (Shadow)* : activation, couleur d’ombre avec canal Alpha, rayon de flou, décalages horizontaux (X) et verticaux (Y).
- **Ordre d'empilement (Z-Index)** :
  - Passer au premier plan, monter d'un niveau, descendre d'un niveau, passer à l'arrière-plan.

### 5.2 Mockups d'Appareils Réalistes (Devices)
FrameMy.App Studio intègre un type d'élément dédié aux mockups de terminaux mobiles et tablettes avec un skin CSS ultra-réaliste :

- **4 Modèles Disponibles** :
  - **Pixel 10** : Flagship Google avec poinçon caméra centré, coins arrondis à 36 px, écouteur supérieur discret et boutons physiques sur le côté droit (Power + Volume).
  - **iPhone Pro Max** : Modèle Apple avec Dynamic Island interactive (double capteur FaceID et optique), coins arrondis à 44 px, boutons Action et Volume à gauche, bouton latéral Power à droite.
  - **Samsung Galaxy** : Écran Infinity avec discret poinçon central, bordures d'écran ultra-fines (8 px), coins à 22 px et boutons latéraux droits.
  - **Pixel Tab** : Tablette Google format 16:10 paysage avec bordures symétriques larges de préhension (16 px), caméra discrète sur la lunette supérieure et boutons sur la tranche supérieure.
  - **Changement de modèle sans rupture** : Lors du passage d'un modèle à un autre (ex: Pixel vers iPhone), les attributs de taille (largeur et hauteur) et la **position du centre géométrique sur la scène sont rigoureusement préservés**. Si une capture d'écran est présente, la hauteur est ajustée automatiquement pour respecter l'exact ratio de l'image selon la géométrie du nouveau châssis, tout en conservant le centre fixe sur le canevas.

- **Skin CSS Réaliste Haut de Gamme & Dimensions Proportionnelles** :
  - **Châssis & Biseau Métallique** : Rendu multi-couches en pur CSS combinant biseau de lumière interne (`inset 0 0 0 1px rgba(255,255,255,0.2)`), contour sombre d'ajustage et ombre portée extérieure.
  - **Finition Métal Brossé Réaliste (`brushedMetal`)** : Texture de traits verticaux en dégradé continu le long de la hauteur (2 à 6 points blancs aléatoires par strie, opacité entre 0% et 5% par défaut, configurable de 1% à 20% via `brushedMetalOpacity`), simulant fidèlement le brossage métallique sans quadrillage ni répétition artificielle.
  - **Dimensions & Géométrie Proportionnelles à la Taille du Terminal** :
    - L'arrondi du boîtier (`borderRadius`), l'épaisseur du châssis (`bodyThickness`) et la bordure d'écran (`screenBorderWidth`) sont exprimés en **pourcentage de la taille de l'appareil** (largeur) plutôt qu'en pixels fixes figés.
    - Quel que soit le facteur d'échelle appliqué au device ou la résolution du canevas (du petit format web au 4K Ultra HD), les proportions visuelles, l'arrondi des angles, les boutons physiques, l'encoche/caméra et l'écouteur restent parfaitement homogènes et fidèles sans jamais paraître disproportionnés.
    - Les curseurs du panneau latéral affichent simultanément le pourcentage et la valeur effective calculée en pixels : Épaisseur de châssis (0.5% à 15%), Bordure d'écran (0% à 10%) et Arrondi des coins (0% à 25%).
  - **Bordure d'Écran Distincte (Bezel Intérieur)** : Épaisseur réglable en pourcentage avec couleur dédiée (`screenBorderColor`, par défaut noire `#000000`). La capture d'écran est logée à 100% à l'intérieur de la bordure d'écran, elle-même emboîtée à l'intérieur du boîtier, évitant tout masquage accidentel.
  - **Reflet d'Écran Paramétrable (Flare)** : Interrupteur (`showFlare`), sélecteur de couleur et d'opacité (`flareColor`), curseur d'angle d'orientation (0° à 360°, `flareAngle`) et curseur d'étendue (10% à 100%, `flareSpread`).
  - **Barre de Navigation Système (*Home Indicator*)** : Interrupteur de présence (`showHomeIndicator`) et sélecteur de couleur avec canal Alpha (`homeIndicatorColor`, par défaut `rgba(255, 255, 255, 0.45)`), dimensionnés proportionnellement à l'échelle de l'appareil.
  - **Notch & Caméra Frontale Épurés** : Silhouette noire pure et nette proportionnelle (Dynamic Island, punch-hole, poinçon ou caméra tablette) sans reflet ni lentille pour un rendu mockup vectoriel moderne.

- **Configuration de la Capture d'Écran & Préservation Stricte du Ratio d'Image** :
  - Chargement par fichier local, saisie d'URL ou Drag & Drop direct depuis l'explorateur de fichiers sur l'appareil.
  - **Verrouillage Automatique du Ratio d'Image au Redimensionnement** :
    - Dès qu'un appareil possède une image de fond / capture d'écran, le ratio d'aspect de l'image est **strictement préservé** lors du redimensionnement via les poignées de manipulation du canevas.
    - Toute modification de la largeur ou de la hauteur (que ce soit via la souris ou les champs de saisie manuelle) recalcule instantanément l'autre dimension pour que la zone active d'affichage respecte exactement le ratio naturel (`naturalWidth / naturalHeight`), interdisant tout étirement, écrasement ou rognage indésirable.
  - Mode d'ajustement : *Remplir (Cover)* ou *Ajuster (Contain)*.
  - Couleur de fond de l'écran configurable en cas de format spécifique.

- **Personnalisation Complète** :
  - **Couleur de la Coque (`bodyColor`)** : Sélecteur de couleur Alpha complet avec nuancier de teintes constructeurs (Obsidienne, Titane Naturel, Gris Sidéral, Argent Porcelaine, Or Titane, Vert Forêt, Bleu Minuit) et bascule métal brossé.
  - **Boutons Physiques** : Interrupteur d'activation (`showButtons`) et personnalisation de la couleur des boutons (`buttonColor`).
  - **Caméra Frontale / Notch** : Interrupteur de visibilité (`showCamera`) pour afficher ou masquer la Dynamic Island ou le punch hole noir épuré.
  - **Bordures de l'Écran (`screenPadding`, `screenBorderColor`)** : Réglage indépendant de la couleur et de l'épaisseur du bezel d'écran.
  - **Arrondi du Boîtier (`borderRadius`)** : Curseur de rayon de courbure (0 à 60 px).
  - **Effets Visuels Mutualisés (`glow` & `shadow`)** :
    - *Effet de Lueur (Glow)* : halo lumineux néon/ambient autour du châssis (couleur avec Alpha, rayon de flou, décalages).
    - *Ombre Portée Réaliste (`shadow`)* : couleur avec canal Alpha, rayon de flou, décalages horizontaux (X) et verticaux (Y).
  - **Manipulation & Hiérarchie** : Déplacement à la souris, redimensionnement via poignées de coin, rotation (-180° à +180°), ordre des calques (Z-Index) et sélection multiple avec alignement automatique.
  - **Templates YAML & Identifiant Personnalisé (`customId`)** : Remplacement automatique de la capture d'écran selon les variantes linguistiques via `images.<customId>: "assets/screen_fr.png"` et surcharge des finitions matérielles via `elements.<customId>`.

---

## 6. Cadrage & Zone d'Exportation

FrameMy.App Studio permet d'isoler une région précise de la composition lors du rendu final et de définir librement les dimensions de sortie :

### 6.1 Résolution Cible Réelle & Dimensions Souhaitées Custom
- **Saisie Libre des Dimensions** : Vous pouvez indiquer librement la largeur (`targetWidth`) et la hauteur (`targetHeight`) en pixels de votre rendu (de 50 px à 10 000 px, jusqu'en 4K Ultra HD ou 8K).
- **Verrouillage du Ratio (*« Conserver les proportions »*)** :
  - **Option cochée (🔒 Proportions verrouillées)** : Ajuster la largeur ou la hauteur recalcule automatiquement la seconde dimension pour préserver rigoureusement le ratio d'aspect (`ratio = targetWidth / targetHeight`).
  - **Option décochée (🔓 Dimensions libres)** : Vous pouvez saisir n'importe quelle largeur et hauteur de manière indépendante. Le ratio de cadrage est immédiatement recalculé et le cadre de sélection sur le canevas s'adapte automatiquement à ce nouveau ratio.
- **Permutation d'Orientation** : Le bouton *« Permuter »* inverse instantanément la largeur et la hauteur pour basculer la composition entre mode Paysage et mode Portrait.

### 6.2 Préréglages de Formats Sociaux & HD
Des presets prédéfinis permettent d'appliquer instantanément les standards graphiques courants :
- *Google Play Screenshot (9:16)* : 1080 × 1920 px (fiche Play Store smartphone)
- *Google Play Bannière* : 1024 × 500 px (graphique de promotion officiel)
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
| `Flèches directionnelles` (`←`, `→`, `↑`, `↓`) | Déplacer le ou les élément(s) sélectionné(s) (texte, forme, appareil) de 1 pixel |
| `Shift + Flèches directionnelles` | Déplacer le ou les élément(s) sélectionné(s) (texte, forme, appareil) de 10 pixels |
| `Molette de la souris` (sur le canevas) | Zoomer et dézoomer interactivement (20% à 350%) en conservant le point sous le curseur comme point fixe (style Inkscape) |
| `Loupes de zoom / boutons +/-` | Zoomer et dézoomer centré sur le milieu de la composition |
| `Glisser sur l'arrière-plan / Clic molette / Espace + Glisser` | Panoramique interactif (glisser-déplacer la scène et le canevas) |
| `Double-clic sur l'arrière-plan ou une forme avec image` | Activer le mode d'ajustement in-place (déplacer, zoomer l'image avec retour élastique) |
| `Échap / Clic Terminer` | Valider et quitter le mode d'ajustement d'image |
| `Glisser une poignée de redimensionnement (4 coins ou 4 côtés)` | Redimensionner librement largeur et/ou hauteur depuis le coin ou côté opposé |
| `Ctrl + Glisser une poignée` / `Cmd + Glisser` | Conserver le ratio d'aspect de l'élément |
| `Shift + Glisser une poignée` | Conserver et ancrer le centre de l'élément (expansion symétrique) |
| `Ctrl + Shift + Glisser une poignée` / `Cmd + Shift + Glisser` | Conserver le ratio d'aspect **et** ancrer le centre de l'élément |
| `Glisser-déposer de fichier` | Assigner une image de fond ou une texture de forme |

---

## 8. Sauvegarde, Synchronisation Disque & Exports

FrameMy.App Studio intègre un système moderne de synchronisation directe avec le système de fichiers local (File System Access API) pour travailler de manière fluide et sécurisée entre votre navigateur et vos dossiers de projet.

### 8.1 Panneau de Sauvegarde & Synchronisation (`save`)
Accessible depuis l'icône de disquette (`save`) dans l'en-tête :
- **Nom du Projet (Sous-titre)** : Permet de définir le titre du projet affiché en sous-titre de l'en-tête (par défaut `Projet sans nom`). Ce nom est également utilisé pour nommer les exports de fichiers.
- **Sélection du Répertoire ou Fichier de Synchronisation** :
  - **Choisir un dossier local** : Connecte un répertoire sur votre disque via le sélecteur natif du navigateur. Tous les changements sur le canevas peuvent être écrits directement dans ce dossier (`master.yml` ou `${nom}.yml`).
  - **Choisir un fichier YAML existant** : Ouvre un fichier template individuel et initialise la synchronisation directe vers ce fichier.
- **Sauvegarde Automatique sur le Disque & Gestion des Assets (`assets/`)** :
  - Un commutateur permet d'activer la synchronisation automatique en continu. Dès qu'une modification survient sur le canevas (déplacement d'un texte, changement de couleur, redimensionnement d'une forme), l'écriture est déclenchée sur votre disque avec temporisation debounced.
  - **Stockage Physique des Images & Chemins Relatifs** : Lorsqu'un dossier local est connecté, les images ajoutées (captures d'écran de devices, textures de formes, fond) sont automatiquement écrites sous forme de fichiers réels dans le sous-dossier `assets/` du projet (ex: `assets/screenshot.png`). Les fichiers YAML (`master.yml`, overrides, variants) enregistrent uniquement le chemin relatif propre (`imageUrl: "assets/screenshot.png"`), éliminant tout Base64 lourd des fichiers YAML.
- **Restauration de Session & Dialogue de Réautorisation de Dossier (`DiskPermissionModal`)** :
  - Lorsqu'un projet local était connecté dans une session précédente et que la page est rechargée (ou une nouvelle session de navigateur lancée), le navigateur révoque nativement les permissions d'accès aux fichiers locaux par mesure de sécurité.
  - Au lieu de charger des chemins d'images non accessibles ou de tenter des requêtes non autorisées en arrière-plan, une boîte de dialogue M3 **« Reprendre le projet local ? »** s'affiche immédiatement au démarrage proposant deux choix clairs :
    1. **« Autoriser l'accès »** : Déclenche l'autorisation native du navigateur sur clic direct de l'utilisateur, réactive les droits d'accès sur le dossier et son sous-dossier `assets/`, lit le fichier YAML et recharge instantanément toutes les images physiques du projet.
    2. **« Nouveau document »** : Réinitialise la connexion disque locale, détache le dossier et ouvre une scène vierge propre.
- **Synchronisation Manuelle** :
  - Un bouton d'enregistrement immédiat permet de forcer l'écriture immédiate sur le disque et indique l'heure de la dernière écriture réussie.

### 8.2 Bouton de Synchronisation dans l'En-tête
Placé directement à droite du titre **FrameMy.App Studio** :
- **Icône dynamique** :
  - `cloud_done` (vert) : Le canevas est à jour et synchronisé avec le fichier sur disque.
  - `sync` (orange / alerte) : Des modifications sont en attente d'enregistrement sur disque.
  - `sync` (animation en rotation) : Écriture en cours sur le disque.
- **Interaction rapide** : Un clic sur ce bouton enregistre immédiatement le projet si un dossier ou fichier est connecté, ou ouvre le panneau de configuration de sauvegarde si aucun emplacement n'est encore configuré.

### 8.3 Gestion de l'Historique (Undo / Redo)
> [!NOTE]
> **Règle stricte sur l'historique :** Les retours arrière (`Ctrl+Z`) et avant (`Ctrl+Y`) ne sont pas enregistrés sur le disque. Ils sont maintenus exclusivement dans le cache mémoire local de votre navigateur pendant votre session de travail, garantissant des fichiers YAML propres et sans surcharge d'historique.

### 8.4 Exports du Canvas Actuel
Les options d'export ont été centralisées dans le panneau de sauvegarde :
- **Template YML** : Exporte le canevas actuel sous forme d'un fichier YAML autonome de template maître.
- **Bundle ZIP** : Génère une archive ZIP complète comprenant le `master.yml`, les `overrides/`, les `variants/` et le dossier `assets/`.

---

## 9. Système de Templates & Déclinaisons en Cascade

Le moteur de templates permet d'automatiser la création de bannières déclinées en plusieurs langues, thèmes ou formats publicitaires sans dupliquer les fichiers volumineux.

### 9.1 La Hiérarchie en Cascade

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

### 8.3 Édition Live & Sauvegarde Directe sur le File System
- **Sélection d'une déclinaison** : Cliquez sur n'importe quelle variante, surcharge ou master dans le volet de gauche pour charger sa composition. Le style de l'élément (bordure et fond colorés) signale visuellement l'élément actif.
- **Bouton Disquette de Sauvegarde** :
  - Chaque variante, override et master dispose d'un bouton disquette à droite de sa ligne.
  - **Détection des modifications en cours (Dirty State)** : dès qu'une modification est apportée sur le canvas (texte modifié, élément déplacé, couleur changée...), l'icône disquette s'active en **rouge vif** pour avertir des modifications non enregistrées.
  - **Persistance en un clic** : cliquer sur la disquette écrit immédiatement le YAML mis à jour dans le fichier correspondant sur le disque (`.yml`) via la File System Access API.
- **Création de Variantes (+ Décliner)** :
  - Le bouton **« + Décliner »** ouvre la boîte de dialogue de création.
  - Champ **« Chemin (ex: feature/fr) »** : permet de définir une langue simple (`fr`, `ja`) ou une arborescence complète (`feature/fr`, `marketing/de`).
  - À la validation, le fichier YAML est immédiatement créé et persisté sur le disque dans le sous-répertoire spécifié.

---

## 10. Identifiants Personnalisés (customId)

Pour que les fichiers YAML puissent cibler les textes et formes indépendamment de leur identifiant technique interne (ex: `txt-1718900`), chaque élément possède un **`customId`**.

### 10.1 Attribution des Identifiants
- **Dans TextControls / ShapeControls** : Champ de texte *« ID Personnalisé (customId) »*.
- **Dans le volet gauche (Onglet « Custom IDs »)** :
  - Tableau de synthèse affichant chaque élément, son type, son aperçu et son `customId`.
  - Bouton **« Auto-ID »** : Attribue instantanément des identifiants parlants (`title`, `subtitle`, `badge`, `cta_button`, etc.).

---

## 11. Spécification & Syntaxe des Fichiers YAML

### 11.1 Exemple de `master.yml`
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

### 11.2 Exemple d'Override (`overrides/01_flash_sale.yml`)
```yaml
background:
  type: "linear"
  color1: "rgba(220, 38, 38, 1)"
  color2: "rgba(127, 29, 29, 1)"
elements:
  cta_btn:
    solidColor: "rgba(251, 191, 36, 1)"
```

### 11.3 Exemple de Variante (`variants/fr/01_flash_sale.yml`)
```yaml
content:
  main_title: "Vente Flash Exceptionnelle !"
  cta_text: "Découvrir les offres"
images:
  background: "banner_fr.jpg"
```

### 11.4 Exemple de Variante (`variants/en/01_flash_sale.yml`)
```yaml
content:
  main_title: "Limited Time Flash Sale!"
  cta_text: "Shop Now"
images:
  background: "banner_en.jpg"
```

---

## 12. Gestion des Assets Graphiques & Résolution

- **Extraction & Stockage Automatique sur Disque (`assets/`)** :
  - Dès qu'un dossier de projet est connecté via la *File System Access API*, chaque image chargée ou glissée sur un élément ou sur la scène est enregistrée directement en tant que fichier physique dans le sous-répertoire `assets/` du projet (avec nom normalisé, ex: `assets/screen_device_1.png` ou `assets/background.png`).
  - **Invite automatique de connexion de dossier** : Si l'utilisateur importe une image sur un appareil, un fond ou une forme alors qu'aucun dossier n'est connecté, l'application sollicite immédiatement la sélection du dossier du projet (`showDirectoryPicker`) afin d'écrire physiquement le fichier dans `assets/` et de garantir sa réouverture dans les sessions ultérieures.
  - **Demande d'autorisation lors de l'import YAML** : Lors du chargement d'un fichier YAML (via import de fichier ou glisser-déposer), l'application demande l'accès au dossier parent du projet afin de monter et charger tous les fichiers graphiques du dossier `assets/`.
  - Dans les fichiers YAML (`master.yml`, overrides, déclinaisons), les images sont sérialisées sous forme de **chemins relatifs propres** (`assets/nom_image.png`), bannissant tout Base64 volumineux du code source YAML.
  - En mémoire vive, des URLs optimisées (`URL.createObjectURL(blob)`) assurent un affichage instantané et fluide dans le canevas sans perte de performance.
  - Lors de l'export en **Bundle ZIP**, tous les assets du projet sont automatiquement rassemblés et intégrés physiquement dans le dossier `assets/` de l'archive.
- **Résolution en Cascade des Assets** :
  - Lorsque vous utilisez des images relatives dans vos fichiers YAML (`images: { background: "mon_fond.jpg" }`) :
  - Le moteur cherche d'abord dans le dossier spécifique de la langue : `assets/<lang>/mon_fond.jpg`.
  - S'il n'y figure pas, il remonte à la racine partagée des ressources : `assets/mon_fond.jpg`.
  - Cette règle permet de partager un logo global tout en ayant des captures d'écran traduites selon la langue.

---

## 13. Batch Export (Export par Lot) & Archives ZIP

La boîte de dialogue **Batch Export** automatise la génération de l'intégralité des visuels :

### 13.1 Organisation en Groupes Repliables & Sélection Intelligente
- Les éléments à générer sont structurés en 3 sections avec caret repliable :
  - **Master (Canevas de référence)** : replié et non sélectionné par défaut.
  - **Overrides (Surcharges thématiques)** : replié et non sélectionnées par défaut.
  - **Variantes (Déclinaisons multilingues)** : déplié et sélectionnées par défaut pour un export ciblé immédiat des déclinaisons finales.
- Chaque groupe dispose de sa propre case à cocher d'en-tête (avec gestion de l'état indéterminé) et d'un compteur dédié (*ex: 0 / 6* ou *42 / 42*).
- Des raccourcis globaux *« Tout cocher »* et *« Tout décocher »* permettent d'ajuster l'ensemble de la liste en un clic.

### 13.2 Export direct sur Dossier Disque (File System Access API)
- Cliquez sur **« Sélectionner un dossier de destination »**.
- L'application crée un sous-répertoire horodaté reproduisant fidèlement l'arborescence :
  - `master.png`
  - `overrides/01_flash_sale.png`
  - `variants/fr/01_flash_sale.png`
  - `variants/en/01_flash_sale.png`
- La progression est affichée en direct avec barre de pourcentage et nom de chaque déclinaison en cours de capture.

### 13.3 Fallback Archive ZIP
- Si votre navigateur ne supporte pas la sélection directe de répertoire ou si vous préférez une archive unique, cliquez sur **« Télécharger en archive ZIP »**. L'archive contiendra l'arborescence complète générée.

### 13.4 Fidélité Typographique CJK & Rendu Pixel-Perfect
- Lors de l'export PNG, le moteur extrait préalablement les lignes visuelles natives calculées par le navigateur (`Range.getClientRects()`) et injecte la police japonaise `Noto Sans JP` ainsi que des hauteurs de ligne en pixels absolus (`line-height`).
- Cela neutralise les dérives de césure et de sous-pixels propres à `html2canvas` sur les textes asiatiques sans espaces (japonais, chinois, coréen) et garantit que les retours à la ligne et les espacements dans le fichier PNG final sont 100% identiques à ceux affichés dans l'éditeur interactif.

---

## 14. Guide de Maintenance & Évolution du Code

Toute évolution de FrameMy.App Studio doit respecter la politique de synchronisation stricte :

### Règle des 6 Étapes de Synchronisation :
1. **Types TypeScript (`src/types/`)** : Déclarer le nouvel attribut dans `index.ts` et `template.ts`.
2. **Moteur Cascade (`src/utils/templateEngine.ts`)** : Prise en charge dans `deepMerge`, `resolveComposition` et `serializeCanvasToMaster`.
3. **Contrôles UI (`src/components/drawer/`)** : Contrôleur interactif dans le panneau correspondant.
4. **Volet Gauche & Contexte (`LeftSidebar.tsx`, `EditorContext.tsx`)** : Prise en compte dans l'état et dans la liste des Custom IDs.
5. **Tests Automatisés (`test-template-engine.mjs`)** : Assertion validant la sérialisation et la fusion en cascade (`npm test`).
6. **Documentation & Skill (`docs/DOCUMENTATION.md` & `.skills/`)** : Mise à jour synchrone et impérative de la documentation et de la skill associée.
