# Banner Studio - FrameMyApp

Application de conception visuelle Material 3, gestion de transparence Alpha complète (RGBA / HEX8 `#FFFFFFFF`), mode sombre dynamique, zoom interactif et export haute fidélité.
Projet Node.js / React moderne développé avec Vite, TypeScript et Tailwind CSS.

## 🚀 Démarrage rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- npm (ou yarn / pnpm)

### Installation des dépendances
```bash
npm install
```

### Lancement en mode développement
```bash
npm run dev
```
L'application s'ouvre automatiquement sur `http://localhost:3000`.

### Build de production
```bash
npm run build
```
Les fichiers statiques optimisés sont générés dans le dossier `dist/`.

### Prévisualisation du build de production
```bash
npm run preview
```

---

## 📁 Architecture du projet

```
├── .aiexclude                 # Fichiers exclus des contextes d'IA
├── .gitignore                 # Exclusion Git (node_modules, dist, .idea, etc.)
├── index.html                 # Point d'entrée HTML Vite (Google Fonts & Material Symbols)
├── index.original.html        # Sauvegarde du fichier monolithique original
├── package.json               # Dépendances et scripts NPM
├── postcss.config.js          # Configuration PostCSS pour Tailwind
├── tailwind.config.js         # Configuration du thème Material 3 (palettes sys, ombres)
├── tsconfig.json              # Configuration TypeScript pour le projet
├── tsconfig.node.json         # Configuration TypeScript pour Vite
├── vite.config.ts             # Configuration du bundler Vite avec plugin React
└── src/
    ├── main.tsx               # Point d'entrée React 18
    ├── App.tsx                # Structure principale de l'interface
    ├── index.css              # Styles globaux, utilitaires Tailwind & classes personnalisées
    ├── types/
    │   └── index.ts           # Types TypeScript du store, des formes et éléments
    ├── utils/
    │   ├── color.ts           # Parser et formateur RGBA/HEX avec gestion de l'Alpha
    │   └── export.ts          # Pipeline d'export haute résolution via html2canvas
    ├── context/
    │   └── EditorContext.tsx  # Contexte React / Store d'état global
    └── components/
        ├── Header.tsx         # En-tête Material 3 (titre, actions rapides)
        ├── BottomBar.tsx      # Barre flottante inférieure (FABs M3)
        ├── Snackbar.tsx       # Notifications toast M3
        ├── common/
        │   └── ColorAlphaPicker.tsx # Sélecteur de couleur hex + curseur alpha (0-100%)
        ├── canvas/
        │   ├── CanvasViewport.tsx   # Conteneur avec grille canvas et drag & drop d'images
        │   ├── Artboard.tsx         # Plan de travail 800x600 px et fond dynamique
        │   ├── TextElement.tsx      # Composant texte éditable en ligne avec poignées
        │   ├── ShapeElement.tsx     # Formes géométriques (rectangle, arrondi, cercle, étoile, hexagone, etc.)
        │   ├── SelectionHandles.tsx # Poignées de redimensionnement, rotation et déplacement
        │   └── ExportOverlay.tsx    # Masque SVG et cadre de sélection d'export
        └── drawer/
            ├── SideDrawer.tsx       # Volet latéral interactif M3
            ├── BackgroundControls.tsx # Contrôles du fond (Uni, Linéaire, Radial, Image)
            ├── TextControls.tsx     # Propriétés du texte (polices, lueur, ombre, taille...)
            ├── ShapeControls.tsx    # Propriétés de forme (remplissage, contour, ombre, arrondi...)
            └── ExportControls.tsx   # Outils d'exportation (tracé libre, presets, téléchargement PNG)
```

---

## ✨ Fonctionnalités

- **Thème Material 3 complet & Dark Mode** : Palettes `m3-sys-*` adaptatives (Light & Dark), persistance du thème (localStorage), bascule rapide depuis l'en-tête et contrôles de formulaire assombris (`color-scheme: dark`).
- **Historique Retour avant / arrière (Undo / Redo)** : Boutons dédiés dans la toolbar et raccourcis clavier globaux (`Ctrl+Z` / `Ctrl+Y` ou `Cmd+Shift+Z`).
- **Réinitialisation complète avec modale de confirmation** : Bouton de nettoyage rapide ouvrant un dialogue de confirmation M3 sécurisé avec possibilité d'annuler.
- **Moteur Alpha intégral & format HEX8 (#FFFFFFFF)** : Couleurs de fond, de textes, de formes, de contours et d'ombres gérées avec opacité RGBA et champ de saisie direct au format hexadécimal à 8 caractères `#RRGGBBAA`.
- **Zoom & Dézoom à la roulette** : Navigation fluide avec la molette de la souris (20% à 350%), widget de zoom flottant et recentrage rapide (100%).
- **Typographies Google Fonts** : Nombreuses polices embarquées (Roboto, Space Grotesk, Inter, Montserrat, Pacifico, etc.).
- **Manipulation interactive** : Déplacement, rotation à la souris/au toucher, redimensionnement et édition directe du texte.
- **Drag & Drop d'images** : Glissez-déposez des images directement sur le canvas pour changer le fond ou la texture d'une forme.
- **Cadre d'export intelligent** : Tracé libre à la volée avec verrouillage du ratio, préréglages sociaux (Instagram, Story, YouTube, Bannière) et synchronisation automatique de la résolution finale.
- **Export haute fidélité** : Capture au format PNG avec mise à l'échelle via `html2canvas`.
