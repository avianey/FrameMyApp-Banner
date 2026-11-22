---
name: release-versioning
description: Protocole maintenu à jour pour gérer les sauts de version (SemVer), les tags Git, le CHANGELOG.md, le couplage de version avec master.yml (CI/CD headless reproductible), les migrations/breaking changes et la synchronisation des skills et de la documentation dans FrameMyApp-Banner.
metadata:
  author: FrameMyApp
  version: 1.2.0
  category: Release
  last-updated: '2026-11-22'
  keywords:
    - FrameMyApp
    - Versioning
    - SemVer
    - Release
    - Changelog
    - Git Tag
    - Master Version
    - Headless CI
    - Migration
---

# Protocole de Sauts de Version, Releases & Changelog (FrameMyApp-Banner)

Cette skill définit les règles et la procédure exacte à exécuter lors de chaque **saut de version** (release) et pour la **maintenance continue du `CHANGELOG.md`** dans **FrameMyApp-Banner**.

> **IMPORTANT — Skill vivante** : À chaque saut de version impliquant un nouveau comportement de rendu, un changement de contrat YAML ou une rupture CLI, mettre à jour la **Section 5 (Matrice de Compatibilité & Migrations)** de cette skill afin de conserver une mémoire fiable des sauts de version.

---

## 1. Conventions de Versionnage (Source Unique de Vérité)

Le projet suit **Semantic Versioning (`MAJOR.MINOR.PATCH`)** et utilise une **chaîne de version unique** partagée entre 4 artefacts :

```text
package.json ("version": "X.Y.Z")
   ├──► src/utils/templateEngine.ts (export const APP_VERSION = packageJson.version)
   │       └──► master.yml (version: "X.Y.Z" sérialisé automatiquement)
   ├──► scripts/generate-batch-cli.mjs (vérifie master.yml version == package.json version)
   ├──► CHANGELOG.md (section ## [X.Y.Z] - YYYY-MM-DD)
   └──► Tag Git annoté : X.Y.Z (sans préfixe "v", identique à master.yml pour checkout CI direct)
```

### Critères de choix du saut de version

| Type | Format | Quand l'utiliser ? |
|---|---|---|
| **PATCH** | `X.Y.(Z+1)` | Correctifs de bugs (UI, export, cascade, cropper, CLI), améliorations de doc/skills, optimisations internes sans changement de contrat. |
| **MINOR** | `X.(Y+1).0` | Nouvelles fonctionnalités rétro-compatibles : nouvel attribut YAML optionnel, nouveau type de forme/mockup, nouvelle option CLI, nouvelle fonctionnalité éditeur. |
| **MAJOR** | `(X+1).0.0` | Rupture de compatibilité : changement incompatible du schéma YAML (`master.yml`/overrides/variants), modification cassante des flags de `generateBatchForBundle.sh`, ou changement de moteur de rendu modifiant visiblement le layout des bundles existants. |

---

## 2. Maintenance Continue (Entre Deux Releases)

Pendant le développement courant sur `main` (en version d'itération courante `X.Y.Z`) :

1. **Ne pas incrémenter `package.json`** à chaque commit ; la version dans `package.json` représente déjà la prochaine release en préparation (ex. `1.0.1` après le tag `1.0.0`).
2. **Alimenter systématiquement `CHANGELOG.md` sous `## [Unreleased]`** pour toute évolution notable, classée sous :
   - `### Added` (nouvelles fonctionnalités)
   - `### Changed` (modifications de comportement existant)
   - `### Fixed` (correctifs de bugs)
   - `### Removed` (suppressions)
   - `### Breaking Changes` (en tête de section si rupture)
3. **Maintenir les docs et skills synchronisées** conformément à `documentation-maintenance` et `AGENTS.md`.

---

## 3. Procédure Pas-à-Pas d'un Saut de Version (Release)

Lorsqu'une release `X.Y.Z` est demandée par l'utilisateur :

### Étape 1 : Audit des changements depuis le dernier tag
```bash
git describe --tags --abbrev=0
git log <dernier-tag>..HEAD --oneline
```
- Vérifier que chaque commit fonctionnel ou correctif est bien résumé dans `CHANGELOG.md` sous `## [Unreleased]`.
- Vérifier si le type de bump initialement prévu (`package.json`) correspond toujours aux changements réels (ex. passer de `1.0.1` à `1.1.0` si une nouvelle fonctionnalité a été ajoutée, ou `2.0.0` en cas de breaking change).

### Étape 2 : Alignement de `package.json` & `CHANGELOG.md`
1. Mettre à jour `"version": "X.Y.Z"` dans [package.json](file:///home/avianey/workspace/FrameMyApp-Banner/package.json) si le numéro cible a évolué (`MINOR`/`MAJOR`).
2. Dans [CHANGELOG.md](file:///home/avianey/workspace/FrameMyApp-Banner/CHANGELOG.md) :
   - Promouvoir `## [Unreleased]` en `## [X.Y.Z] - YYYY-MM-DD` (date du jour réelle).
   - Recréer un bloc `## [Unreleased]` vide en haut du fichier.

### Étape 3 : Audit Documentation & Skills
- Vérifier que [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md) reflète fidèlement tous les paramètres YAML, exemples de `version` et options CLI de la release `X.Y.Z`.
- Vérifier [README.md](file:///home/avianey/workspace/FrameMyApp-Banner/README.md) et [AGENTS.md](file:///home/avianey/workspace/FrameMyApp-Banner/AGENTS.md).
- Mettre à jour la **Section 5** ci-dessous (et le champ `last-updated` des `.skills/*/SKILL.md` modifiées).

### Étape 4 : Validation de Release (Exception Contrôlée à `AGENTS.md`)
> En contexte de release explicite uniquement, les vérifications complètes sont autorisées et requises :
1. Exécuter `npm test` (valide `APP_VERSION === package.json.version`, la sérialisation `master.yml` et toute la cascade).
2. Exécuter `npm run build` (valide le typecheck TypeScript complet et le bundle Vite de production).
3. Si le moteur de rendu ou la CLI headless a été modifié, exécuter `npm run test:headless` (ou un export test via `generateBatchForBundle.sh`).

### Étape 5 : Commit de Release & Tag Git Annoté
```bash
git add package.json CHANGELOG.md docs/ .skills/ README.md AGENTS.md
git commit -m "chore(release): release X.Y.Z"
git tag -a X.Y.Z -m "Release X.Y.Z"
```
> **Règle absolue** : Le tag Git **ne comporte pas de préfixe `v`** (`1.0.0`, `1.0.1`, `1.1.0`) afin de correspondre littéralement au champ `version` de `master.yml` lu par les pipelines CI/CD headless.

### Étape 6 : Préparation de l'Itération Suivante (*Prepare for Next Iteration*)
Immédiatement après le tag `X.Y.Z` :
1. Incrémenter `package.json` vers la prochaine version patch de développement (`X.Y.(Z+1)`).
2. Vérifier que `CHANGELOG.md` possède une section `## [Unreleased]` prête à recevoir les prochains ajouts.
3. Commiter :
   ```bash
   git add package.json
   git commit -m "chore(release): prepare next iteration (X.Y.(Z+1))"
   ```

---

## 4. Règle Spécifique au Couplage Headless CI/CD

- `src/utils/templateEngine.ts` exporte `APP_VERSION` directement depuis `package.json` et l'écrit dans `master.yml` (`version: APP_VERSION`).
- `scripts/generate-batch-cli.mjs` lit la `version` de `master.yml` au démarrage et émet un avertissement si elle diffère de la version du checkout courant.
- Les dépôts consommateurs (CI/CD GitHub Actions) extraient `version:` depuis `master.yml` pour faire un `actions/checkout` de `FrameMyApp-Banner` sur le tag Git exact (voir [docs/TEMPLATE_SYSTEM.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/TEMPLATE_SYSTEM.md#L560)).

---

## 5. Matrice de Compatibilité & Historique des Sauts de Version

| Version (Tag) | Date | Compatibilité YAML `master.yml` | Notes de Migration / Breaking Changes |
|---|---|---|---|
| `1.0.0` | `2026-11-03` | `version: "1.0"` (statique legacy) | Initial release complète : éditeur Figma, Devices, Smart Guides, IA Gemini, Batch Export UI & CLI headless. |
| `1.1.0` | `2026-11-20` | `version: "1.1.0"` (dynamique depuis `package.json`) | Versionnage automatique de `master.yml` (`APP_VERSION`) et contrôle CLI headless ; forme `quadrilateral` (`quadPoints`, `quadImageFit` par homographie `matrix3d`) ; persistance `removedElements` & `elementOrder` sur overrides/variantes ; copier/coller intra- et inter-cibles (`CopyElementToModal`) ; héritage d'override / Décliner / Dupliquer variantes ; recadrage stroke en calque superposé et cadrage viewport hors `BottomBar`. Rétro-compatible avec `version: "1.0"` et `shapeType: "pill"`. |
| `1.2.0` | `2026-11-22` | `version: "1.2.0"` (dynamique depuis `package.json`) | Options CLI headless `--format` (`png`/`jpg`/`webp`), `--q` et `--lang` ; diffusion HTTP locale des assets (`/__bundle_assets__/`) évitant le crash Playwright sur gros bundles ; prise en charge des symlinks et compatibilité ESM `js-yaml` v5 ; isolation des contrôles du volet droit par élément/vue et Undo/Redo inter-vues en mode Bundle. 100 % rétro-compatible avec les bundles `1.0` et `1.1.0`. |
| `1.2.1` *(en cours)* | *Unreleased* | `version: "1.2.1"` | Prochaine itération de maintenance / évolutions. |
