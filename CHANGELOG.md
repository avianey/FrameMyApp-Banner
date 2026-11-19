# Changelog

Toutes les évolutions notables de **FrameMy.App Studio (FrameMyApp-Banner)** sont consignées dans ce fichier.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet suit [Semantic Versioning](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`).

Les tags Git suivent strictement le numéro de version de `package.json` sans préfixe (ex. `1.0.0`, `1.0.1`). Ce même numéro est écrit dans `master.yml` afin de permettre l'invocation reproductible du moteur headless CI/CD sur le tag correspondant.

---

## [Unreleased]

---

## [1.0.0] - 2026-11-03

### Added
- **Initial release** de FrameMy.App Studio (React 18, TypeScript, Vite, Tailwind CSS Material 3, Light/Dark mode).
- **Éditeur Canvas interactif (standard Figma)** : textes riches (Google Fonts, glow, ombre, alignement horizontal/vertical), formes vectorielles et textures image, mockups d'appareils (`pixel-10`, `iphone-pro-max`, `samsung-galaxy`, `pixel-tab` avec métal brossé, Dynamic Island, reflets), sélection multiple (*marquee*), pan (`Espace+clic`, molette, trackpad), *Smart Guides* magnétiques, alignement AABB orienté, cropper d'image in-place, raccourcis clavier (`?`, `Ctrl+Z/Y`, `Ctrl+C/V/D/A/S`).
- **Arrière-plans avancés** : couleur unie, dégradé linéaire/radial, image (flou, voile, Zoom Blur), et génération d'arrière-plan par IA (Google Gemini via `config.ia.yaml`).
- **Système de Templates & Bundles YAML** : cascade `master.yml` → `overrides/<slug>.yml` → `variants/<lang>/<slug>.yml`, identifiants sémantiques (`customId`), sérialisation par diff automatique, résolution d'assets en cascade, synchronisation disque (File System Access API) et import/export d'archives ZIP.
- **Batch Export HD & CI/CD Headless** : export PNG/JPEG/WebP jusqu'à 4× avec fidélité typographique CJK, et exécution automatisée headless Playwright via `generateBatchForBundle.sh` (`scripts/generate-batch-cli.mjs`) avec streaming des PNG générés.
- **Résilience & Qualité** : `ErrorBoundary` avec sauvegarde de brouillon, garde `beforeunload`, verrou de synchronisation disque, suite de tests unitaires du moteur (`npm test`).
