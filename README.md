# FrameMy.App Studio

Application web de conception de bannières et captures marketing Material 3 : éditeur interactif standard Figma, gestion complète de l'Alpha (RGBA / HEX8), mockups d'appareils, génération d'arrière-plans par IA (Google Gemini), système de templates YAML en cascade (`master` / `overrides` / `variants`), synchronisation disque locale et Batch Export haute fidélité (interface navigateur & CLI headless CI/CD).

Développé avec **React 18**, **TypeScript**, **Vite** et **Tailwind CSS**.

---

## 🚀 Démarrage rapide

### Prérequis
- [Node.js](https://nodejs.org/) 18+ (20 recommandé pour le runner CI headless)
- npm

### Installation & lancement en développement
```bash
npm install
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

### Activer la génération d'arrière-plan par IA (Google Gemini)
Démarrez le serveur avec la variable d'environnement `GEMINI_API_KEY` (modèles configurables dans [config.ia.yaml](config.ia.yaml)) :
```bash
GEMINI_API_KEY="..." npm run dev
```

### Scripts disponibles
| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur Vite avec HMR |
| `npm run build` | Typecheck TypeScript + build de production dans `dist/` |
| `npm run preview` | Prévisualise le build de production |
| `npm test` | Exécute les tests unitaires du moteur de templates (`test-template-engine.mjs`) |
| `npm run test:headless` | Exécute les tests de layout headless Playwright (`test-headless-layout.mjs`) |
| `./generateBatchForBundle.sh --in <bundle> --out <dir>` | Exporte un bundle en mode headless Playwright (CI/CD) |

---

## 🤖 Batch Export Headless en CI/CD

Pour générer automatiquement les bannières d'un bundle depuis un pipeline CI/CD sur la **version exacte** du moteur ayant produit `master.yml` :

```bash
# 1. Lire le tag de version inscrit dans master.yml (ex: 1.0.1)
# 2. Cloner/checkout FrameMyApp-Banner sur ce tag exact
./generateBatchForBundle.sh --in <bundleDirPath> --out <outputDirPath> [--all | --include-master | --include-overrides | --no-variants]
```

Voir la section 8 de [docs/TEMPLATE_SYSTEM.md](docs/TEMPLATE_SYSTEM.md) pour le workflow GitHub Actions complet avec résolution automatique du tag depuis `master.yml`.

---

## ✨ Fonctionnalités principales

- **Éditeur Canvas standard Figma** : simple clic pour déplacer, double-clic sur texte pour éditer, sélection multiple (*marquee*), pan (`Espace+clic`, clic molette, trackpad), zoom focal (`Ctrl+molette`) et bouton *Fit*, *Smart Guides* magnétiques, alignement AABB orienté, cropper d'image in-place, Undo/Redo et raccourcis clavier (`?`).
- **Calques riches** : textes Google Fonts (glow, ombre, alignement H/V, fidélité typographique CJK), formes vectorielles et textures image (dégradés multi-stops), mockups d'appareils (`pixel-10`, `iphone-pro-max`, `samsung-galaxy`, `pixel-tab` avec métal brossé, Dynamic Island et reflets).
- **Arrière-plans avancés** : couleur unie, dégradés linéaire/radial, image (flou, voile, Zoom Blur cinétique) et génération IA Gemini.
- **Templates & Bundles YAML en cascade** : `master.yml` (taggé avec la version de l'application) → `overrides/<slug>.yml` → `variants/<lang>/<slug>.yml`, sérialisation par diff minimal, résolution d'assets localisés, édition live avec sauvegarde disque (File System Access API) et import/export ZIP.
- **Batch Export HD** : export PNG, JPEG ou WebP jusqu'à 4× vers un dossier disque horodaté, une archive ZIP ou via la CLI headless Playwright.

---

## 🗂️ Architecture haut niveau

```text
├── src/
│   ├── types/          # Contrats TypeScript (éléments canvas, background, templates, bundles)
│   ├── context/        # Store global React (EditorContext)
│   ├── hooks/          # Sync disque, gestion bundles, historique Undo/Redo, hiérarchie, viewport
│   ├── utils/          # Moteur de cascade & diff YAML, APP_VERSION, assets, alignement, rendu export
│   └── components/     # Canvas, inspecteur droit (drawer), volet gauche (leftDrawer), modales, bridge headless
├── scripts/            # CLI headless Node/Playwright (generate-batch-cli.mjs)
├── docs/               # Spécification technique de référence (TEMPLATE_SYSTEM.md)
├── .skills/            # Compétences IA du projet (workflow, architecture, documentation, releases)
├── generateBatchForBundle.sh
├── config.ia.yaml
├── CHANGELOG.md
└── AGENTS.md
```

---

## 📚 Documentation & Gouvernance

- **[Spécification du Système de Templates & CI/CD](docs/TEMPLATE_SYSTEM.md)** : référence unique pour les bundles, le schéma YAML, le champ `version` de `master.yml`, les `customId`, les assets, le Batch Export et l'intégration GitHub Actions.
- **[Changelog](CHANGELOG.md)** : historique des versions (SemVer / Keep a Changelog).
- **[Directives Agents IA](AGENTS.md)** & **[.skills/](.skills/)** : protocoles de développement frugal (`frugal-workflow`), d'extension du moteur (`banner-template-architecture`), de maintenance documentaire (`documentation-maintenance`) et de sauts de version (`release-versioning`).
