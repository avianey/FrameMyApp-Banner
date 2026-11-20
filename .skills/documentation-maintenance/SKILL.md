---
name: documentation-maintenance
description: Protocole opérationnel pour maintenir l'ensemble de la documentation du projet FrameMyApp-Banner synchronisée (docs/TEMPLATE_SYSTEM.md, CHANGELOG.md, README.md et .skills/) avec chaque évolution du code, des templates YAML, de la CLI headless ou de l'architecture.
metadata:
  author: FrameMyApp
  version: 3.0.0
  category: Documentation
  last-updated: '2026-11-19'
  keywords:
    - FrameMyApp
    - Banner Studio
    - Documentation
    - Template System
    - Changelog
    - Skills Maintenance
    - YAML
    - CustomId
    - Cascade
    - Assets
    - Batch Export
    - Headless CLI
---

# Protocole de Maintenance Documentaire, Changelog & Skills (FrameMyApp-Banner)

Ce document formalise la politique de synchronisation entre le **code source**, la **documentation de référence**, le **CHANGELOG** et les **skills IA** de **FrameMyApp-Banner**.

---

## 1. Sources de Vérité du Projet

| Fichier | Rôle (Source Unique de Vérité) |
|---|---|
| [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) | Spécification normative complète du système de templates, schéma YAML (`master.yml`, `overrides/`, `variants/`), `version` de construction, `customId`, résolution d'assets, Batch Export UI et CLI Headless CI/CD. |
| [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md) | Historique chronologique des évolutions (`## [Unreleased]` en continu + releases SemVer taggées). |
| [README.md](file:///home/avianey/workspace/FrameMyApp-Banner/README.md) | Présentation synthétique, démarrage rapide (dev, mode IA Gemini, CLI headless), architecture haut niveau et liens vers les docs. |
| [AGENTS.md](file:///home/avianey/workspace/FrameMyApp-Banner/AGENTS.md) | Règles d'exécution obligatoires pour les agents IA (outillage, interdictions, registre des skills et devoirs de maintenance). |
| `.skills/*/SKILL.md` | Protocoles spécialisés (`frugal-workflow`, `banner-template-architecture`, `documentation-maintenance`, `release-versioning`). |

> **RÈGLE** : Ne jamais créer de doublon documentaire (ex. recréer un second guide templates). Toute spécification de template, YAML, asset ou Batch/CLI vit exclusivement dans [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md).

---

## 2. Matrice des Déclencheurs & Actions Obligatoires

| Zone / Fichier Modifié | Nature du Changement | Cible(s) à Mettre à Jour | Action Requise |
|---|---|---|---|
| Toute feature, changement notable ou bugfix utilisateur | Évolution fonctionnelle ou correctif | [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md) | Ajouter une entrée concise sous `## [Unreleased]` (`Added`, `Changed`, `Fixed`, `Removed`). |
| `src/types/index.ts`, `src/types/template.ts`, `src/utils/templateEngine.ts` | Nouveau paramètre YAML, évolution cascade, `APP_VERSION`, diff auto | [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) + [.skills/banner-template-architecture/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/banner-template-architecture/SKILL.md) | Mettre à jour le schéma YAML, la matrice YAML ↔ TypeScript et les exemples. |
| `src/utils/bundleIo.ts`, `src/utils/assetManager.ts` | Résolution d'assets, chemins relatifs, export ZIP | [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) | Mettre à jour la section 4 (Cascade & Assets). |
| `src/components/modal/BatchExportModal.tsx`, `src/utils/batchExportRenderer.ts` | Options Batch Export UI, formats, CJK | [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) | Mettre à jour la section 4.3 (Batch Export Interactif & CJK). |
| `generateBatchForBundle.sh`, `scripts/generate-batch-cli.mjs`, `src/components/HeadlessExportBridge.tsx` | Nouveaux arguments CLI, contrôle de version, comportement CI/CD | [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) + [README.md](file:///home/avianey/workspace/FrameMyApp-Banner/README.md) | Mettre à jour la section 8 (CLI CI/CD & workflow GitHub Actions) et le Quickstart. |
| `config.ia.yaml`, `vite.config.ts`, `package.json` (scripts) | Nouveau script NPM, nouvelle variable d'env, évolution IA | [README.md](file:///home/avianey/workspace/FrameMyApp-Banner/README.md) + `.skills/frugal-workflow/SKILL.md` | Mettre à jour les instructions de démarrage et la cartographie. |
| Nouvelle couche architecturale, nouveau hook/dossier majeur, changement de convention | Évolution structurante du dépôt | `.skills/<skill>/SKILL.md` + [AGENTS.md](file:///home/avianey/workspace/FrameMyApp-Banner/AGENTS.md) | Mettre à jour la skill concernée (`last-updated` + contenu) et `AGENTS.md` si une règle globale évolue. |
| Saut de version / Tag Git | Release `X.Y.Z` | Suivre [.skills/release-versioning/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/release-versioning/SKILL.md) | Promouvoir `[Unreleased]`, tagger `X.Y.Z`, mettre à jour la matrice de compatibilité et préparer l'itération suivante. |

---

## 3. Protocole Opérationnel

1. **Localiser la section cible** : Repérer le numéro de section (`## X. ...`) dans le document cible sans le réécrire intégralement.
2. **Édition chirurgicale** : Utiliser `replace_file_content` ou `multi_replace_file_content`.
3. **Vérifier la validité des exemples YAML** : Les types énumérés (`shapeType`, `deviceType`, `fillType`, `zoomBlurOrigin`, etc.) doivent correspondre littéralement aux unions TypeScript de [src/types/index.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/types/index.ts).
4. **Synchroniser les métadonnées des skills** : Lors de toute modification substantielle d'une skill, actualiser `metadata.last-updated` (et `metadata.version` si le protocole change).
5. **Valider les tests si le moteur a changé** : Exécuter `npm test`.
