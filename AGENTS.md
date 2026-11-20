# Consignes & Directives pour Agents IA (FrameMyApp-Banner)

Ce document formalise les règles obligatoires d'exécution, de maintenance documentaire et de versionnage pour tout agent IA intervenant sur le dépôt **FrameMyApp-Banner**.

---

## 1. Interdiction des Commandes Terminal Inutiles & Redondantes

> ⚠️ **RÈGLE STRICTE (DEV COURANT) : NE JAMAIS LANCER `npx tsc`, `npm run build` OU DES VÉRIFICATIONS LOURDES.**

- **Recompilation Vite en temps réel** : L'environnement de développement exécute déjà le serveur Vite avec HMR et recompilation automatique.
- **Interdiction de `npx tsc` / `npx tsc --noEmit`** : Ne jamais exécuter de typecheck global en ligne de commande.
- **Interdiction de `npm run build`** : Ne pas lancer de build complet de production, **sauf** :
  1. Demande explicite de l'utilisateur ;
  2. Exécution d'un **saut de version (release)** régi par la skill `release-versioning`.
- **Vérification statique légère** : Pour valider la syntaxe et les types TypeScript après modification, utiliser **uniquement** l'outil interne IDE `analyze_file(absolutePath = "...")` (coût nul, résultat instantané).
- **Tests unitaires du moteur de template** : `npm test` (`vite-node test-template-engine.mjs`) est à lancer lors de toute modification impactant la sérialisation YAML, `APP_VERSION` (`master.yml`), la cascade Master/Overrides/Variants, l'alignement ou la résolution d'assets.

---

## 2. Maintien Obligatoire : Changelog, Documentation & Skills

Toute intervention significative sur le dépôt doit maintenir synchronisées les 4 sources de vérité suivantes :

| Nature de la Modification | Fichier(s) à Maintenir Obligatoirement |
|---|---|
| **Toute feature, modification de comportement ou bugfix notable** | [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md) — ajouter une entrée concise sous `## [Unreleased]` (`Added`, `Changed`, `Fixed`, `Removed`). |
| **Système de templates, schéma YAML, `master.yml` `version`, cascade, `customId`, assets, Batch Export UI ou CLI Headless** | [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) *(source unique de vérité pour les templates et la CLI)*. |
| **Commandes NPM, démarrage rapide, variables d'env (`GEMINI_API_KEY`), CLI ou structure générale** | [README.md](file:///home/avianey/workspace/FrameMyApp-Banner/README.md). |
| **Nouvelle couche architecturale, nouveau hook/dossier, changement de workflow, outillage ou règle métier** | La skill correspondante dans `.skills/*/SKILL.md` (avec mise à jour de `metadata.last-updated`), et le présent `AGENTS.md` si une règle globale évolue. |
| **Saut de version / Tag Git (`X.Y.Z`)** | Appliquer intégralement [.skills/release-versioning/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/release-versioning/SKILL.md) (promotion `CHANGELOG.md`, `package.json`, tag Git sans préfixe `v`, matrice de compatibilité et *prepare next iteration*). |

---

## 3. Respect des Skills du Projet

L'agent doit impérativement consulter et respecter les 4 compétences locales définies dans `.skills/` :

1. **`frugal-workflow`** ([.skills/frugal-workflow/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/frugal-workflow/SKILL.md)) :
   - Économie maximale de tokens et d'itérations.
   - Ne jamais scanner `node_modules/` ni `dist/`.
   - Localiser avant de lire ; utiliser des modifications chirurgicales (`replace_file_content`, `multi_replace_file_content`).

2. **`banner-template-architecture`** ([.skills/banner-template-architecture/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/banner-template-architecture/SKILL.md)) :
   - Lors de l'ajout d'une propriété ou d'un paramètre, synchroniser les 6 couches :
     1. Types TypeScript (`src/types/index.ts`, `src/types/template.ts`)
     2. Moteur en cascade & diff (`src/utils/templateEngine.ts`, préservation de `version: APP_VERSION` dans `master.yml`)
     3. Contrôles UI du volet droit (`src/components/drawer/`)
     4. Fabriques, valeurs par défaut et `customId` (`src/utils/elementFactories.ts`, `src/context/EditorContext.tsx`, `LeftSidebar.tsx`)
     5. Tests du moteur (`test-template-engine.mjs` via `npm test`)
     6. Documentation (`docs/TEMPLATE_SYSTEM.md`) et `CHANGELOG.md` (`[Unreleased]`)

3. **`documentation-maintenance`** ([.skills/documentation-maintenance/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/documentation-maintenance/SKILL.md)) :
   - Protocole de synchronisation de `docs/TEMPLATE_SYSTEM.md`, `README.md`, `CHANGELOG.md` et `.skills/*/SKILL.md`.

4. **`release-versioning`** ([.skills/release-versioning/SKILL.md](file:///home/avianey/workspace/FrameMyApp-Banner/.skills/release-versioning/SKILL.md)) :
   - Protocole de saut de version SemVer, gestion des tags Git `X.Y.Z` couplés à `master.yml` (`APP_VERSION`), promotion du `CHANGELOG.md`, matrice de compatibilité/migrations et préparation de l'itération suivante.

---

## 4. Style & Format des Réponses

- Être concis, sobre et factuel.
- Fournir des liens clairs vers les fichiers modifiés (`[Fichier.tsx](file:///...)`).
- Ne jamais réafficher des blocs complets de code déjà modifiés dans le projet.
