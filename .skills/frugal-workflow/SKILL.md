---
name: frugal-workflow
description: Politique de travail orientée coût adaptée au projet FrameMyApp-Banner pour réduire drastiquement la consommation de tokens et le bruit de contexte dans l'IDE. Privilégie le contexte minimal suffisant, l'isolation des builds/tests et refactorings via sous-agent (task), les modifications chirurgicales et l'alignement avec les sous-systèmes du projet (React/TypeScript, Vite, Template Engine, Canvas Artboard, .aiexclude).
metadata:
  author: FrameMyApp
  last-updated: '2026-09-01'
  keywords:
  - FrameMyApp
  - Banner Studio
  - Token Optimization
  - Context Isolation
  - Cost Aware
  - SubAgent
  - Task
  - Vite Build
  - TypeScript Check
  - Template Engine
  - Surgical Edits
  - Frugal Mode
---

# Frugal Workflow & Context Isolation (FrameMyApp-Banner)

Cette skill définit la stratégie d'ingénierie orientée **coût total par tâche réussie** appliquée au projet **FrameMyApp-Banner (Banner Studio)**.

L'objectif est d'utiliser **le minimum de contexte, d'appels d'outils et d'itérations nécessaires pour obtenir un résultat fiable, typé et sans régression**.

Une économie de tokens apparente qui provoque une erreur de compilation TypeScript, une rupture de la cascade YAML ou une itération de correction supplémentaire est considérée comme contre-productive.

---

## 1. Contexte Architectural Spécifique à FrameMyApp-Banner

L'architecture de FrameMyApp-Banner (SPA React 18 / TypeScript / Vite / Tailwind CSS) impose des frontières strictes d'isolation pour éviter l'explosion de tokens :

| Composant / Zone | Particularité | Directive Frugale |
|---|---|---|
| **Fichier `index.original.html`** | Sauvegarde historique monolithique de l'application (~85 KB / 25k tokens). | **Ne JAMAIS tenter d'analyser, de lire ou de chercher** dans ce fichier. Utiliser exclusivement les modules découpés dans `src/`. |
| **Dossiers `node_modules/` & `dist/`** | Dépendances NPM et artefacts de build de production. Listés dans `.aiexclude`. | **Ne JAMAIS scanner ni lire ces dossiers**. Ne pas utiliser d'outils de recherche globale non ciblés à la racine. |
| **Moteur de Templates & Cascade (`src/utils/templateEngine.ts`, `bundleIo.ts`)** | Système en cascade Master (`master.yml`) -> Overrides (`overrides/*.yml`) -> Variants (`variants/<lang>/*.yml`), `deepMerge`, `customId` et assets. | Se référer systématiquement à la skill dédiée **`banner-template-architecture`**. Respecter rigoureusement les 5 étapes de synchronisation (Types -> Engine -> Controls UI -> LeftSidebar/Context -> Tests). |
| **Store Global (`src/context/EditorContext.tsx`)** | Fichier volumineux (>700 lignes) centralisant l'état du canvas, les outils d'édition, l'historique Undo/Redo et la gestion des templates. | **Ne jamais relire le fichier en entier**. Utiliser `view_file_outline` pour localiser les méthodes cibles et `read_file` avec `startLine` et `endLine` sur la tranche stricte. |
| **Canvas & Rendu SVG/HTML (`src/components/canvas/`)** | Plan de travail interactif (`Artboard.tsx`, `CanvasViewport.tsx`, `TextElement.tsx`, `ShapeElement.tsx`, `SelectionHandles.tsx`, `ExportOverlay.tsx`). | Événements complexes (drag & drop, molette, poignées). Cibler précisément le composant d'élément concerné plutôt que l'ensemble du dossier `canvas/`. |
| **Pipeline d'Export & Alpha (`src/utils/export.ts`, `color.ts`, `batchExportRenderer.ts`)** | Rendu `html2canvas`, génération de ZIP (`jszip`), File System Access API, hex8 (`#RRGGBBAA`) et conversion RGBA. | Tester la logique algorithmique unitaire avant de toucher au pipeline de rendu lourd. |

---

## 2. Hiérarchie des Priorités

Respecter impérativement cet ordre :

1. **Exactitude et typage strict** (zéro erreur TypeScript, préservation de la cascade YAML et du cycle de vie React)
2. **Réduction du nombre d'itérations** (viser juste dès le premier coup)
3. **Minimisation du contexte injecté** (ne charger que les zones et tranches nécessaires)
4. **Minimisation des sorties d'outils** (filtrer, résumer, isoler les logs verbeux)
5. **Concision des réponses fournies** (synthèses plutôt que listings complets de code)
6. **Vitesse brute d'exécution**

> **Règle d'or** : Ne jamais économiser des tokens au prix d'une baisse de typage, d'une régression dans la cascade de templates ou d'une itération de correction supplémentaire.

---

## 3. Matrice de Validation Économique pour FrameMyApp-Banner

Toujours privilégier l'outil le plus léger capable de confirmer la modification avant d'escalader :

| Niveau | Action | Coût en Tokens | Quand l'utiliser ? |
|---|---|---|---|
| **1. Analyse statique IDE** | `analyze_file(absolutePath = "...")` | **~0 token de sortie** (instantané) | Immédiatement après modification d'un fichier `.ts` ou `.tsx` pour vérifier la syntaxe, les imports et les types sans exécuter de commande shell. |
| **2. Tests unitaires du moteur de template** | `run_shell_command("npm test")` | **Très faible** (~15 lignes de log) | Pour valider la sérialisation YAML, le round-tripping, le `deepMerge` de cascade Master/Override/Variant uniquement si le moteur est modifié (`vite-node test-template-engine.mjs`). |
| **3. Proscrit en dev continu** | *Ne pas lancer `npx tsc` ni `npm run build`* | **Inutile / Redondant** | Vite recompile et vérifie en temps réel (HMR). L'analyseur IDE `analyze_file` suffit amplement. |

---

## 4. Isolation des Opérations Lourdes via `task` (Sous-Agent)

Le sous-agent sert de **frontière étanche de contexte**. Tout le bruit intermédiaire (sorties d'erreurs TypeScript en cascade, stacktraces Vite/Rollup, essais-erreurs de refactoring) reste confiné dans sa mémoire éphémère.

### Déléguer obligatoirement à `task` lorsque :

* Un refactoring transversal touche simultanément les 5 couches (`src/types/`, `templateEngine.ts`, `src/components/drawer/`, `LeftSidebar.tsx`, `EditorContext.tsx`, et `test-template-engine.mjs`).
* Un ensemble de contrôles UI d'un nouvel élément de canvas doit être implémenté de bout en bout.
* Un build global (`npm run build`) échoue avec de multiples erreurs TypeScript ou Rollup nécessitant une résolution itérative.
* Une suite de tests automatisés ou un nouveau script de validation complexe doit être rédigé et débogué.

### Exécuter directement dans le contexte principal lorsque :

* La commande est courte, déterministe et sa sortie prévisible (ex : `analyze_file`, `npm test` qui passe au vert).
* La modification est chirurgicale et locale à un composant ou une fonction utilitaire (ex : ajustement d'un helper dans `color.ts` ou d'un style Tailwind dans `Header.tsx`).

### Pattern Recommandé pour `task` dans FrameMyApp-Banner

```text
Objectif : Mettre à jour l'architecture de templates pour ajouter la propriété X dans FrameMyApp-Banner.

1. Applique les modifications chirurgicales selon la skill banner-template-architecture :
   - src/types/ (index.ts / template.ts)
   - src/utils/templateEngine.ts (deepMerge, sérialisation)
   - src/components/drawer/
   - test-template-engine.mjs

2. Valide l'absence d'erreurs :
   - Exécute npm test
   - Exécute npx tsc --noEmit
   - Si une erreur survient, corrige de manière chirurgicale via replace_file_content jusqu'à résolution.

3. Ne remonte au contexte parent que :
   - Statut : SUCCÈS ou ÉCHEC
   - Synthèse en 2-3 puces des fichiers modifiés
   - Points d'attention fonctionnels pour l'utilisateur

Ne retourne aucun log brut de build ou de console dans le compte-rendu final.
```

---

## 5. Exploration Chirurgicale du Code FrameMyApp-Banner

Toujours **localiser avant de lire**. Ne jamais charger des fichiers entiers par défaut.

### Ordre de préférence des outils d'exploration :

1. `find_declaration` : saut sémantique direct vers une interface, un type (`CanvasElement`, `BannerMasterConfig`), une fonction ou une constante.
2. `find_usages` : repérage exact des impacts d'une méthode de store ou d'un type avant modification de signature.
3. `view_file_outline` : structure d'un fichier volumineux (`EditorContext.tsx`, `LeftSidebar.tsx`, `SideDrawer.tsx`, `Artboard.tsx`).
4. `grep` ciblé avec `absolutePath = ".../src/<subpackage>"` : ne jamais scanner la racine du projet (évite les fichiers de config, backups et exclusions) !
5. `read_file` avec `startLine` et `endLine` sur la fenêtre stricte concernée.

### Cartographie des Répertoires Clés dans `src/`

Pour éviter de chercher à l'aveugle, cibler directement les répertoires :
- `types/` : `index.ts` (modèles canvas, styles, couleurs) et `template.ts` (contrats Master, Override, Variant, ExportZone).
- `context/` : `EditorContext.tsx` (contexte React, dispatchers d'état, historique Undo/Redo, sélection).
- `utils/` :
  - `templateEngine.ts` : Moteur de cascade, `deepMerge`, `resolveComposition`, `serializeCanvasToMaster`.
  - `bundleIo.ts` : Import/export d'archives ZIP, génération et parsing de manifests.
  - `color.ts` : Gestion des couleurs, RGBA, format HEX8 `#RRGGBBAA`.
  - `export.ts` & `batchExportRenderer.ts` : Capture `html2canvas` et batch export.
  - `yamlHelper.ts` : Sérialisation et parsing YAML via `js-yaml`.
- `components/canvas/` : Plan de travail `Artboard.tsx`, conteneur `CanvasViewport.tsx`, éléments `TextElement.tsx`, `ShapeElement.tsx`, `SelectionHandles.tsx`, `ExportOverlay.tsx`.
- `components/drawer/` : Volet droit de propriétés (`BackgroundControls.tsx`, `TextControls.tsx`, `ShapeControls.tsx`, `ExportControls.tsx`, `SideDrawer.tsx`).
- `components/leftDrawer/` : `LeftSidebar.tsx` (onglets Templates, Overrides, Variants, Custom IDs).
- `components/modal/` : `ConfirmModal.tsx` et dialogues modaux.
- `components/common/` : Composants réutilisables (`ColorAlphaPicker.tsx`).

---

## 6. Éditions Chirurgicales et Parallélisme

* **Privilégier `replace_file_content` et `multi_replace_file_content`** pour toute modification locale dans les fichiers existants.
* **Réserver `write_file`** exclusivement pour la création de nouveaux fichiers (nouveau composant de contrôle, nouveau modèle, nouveau test unitaire).
* **Paralléliser les opérations indépendantes** :
  - Appeler plusieurs outils de recherche ou de lecture dans un seul bloc d'outils.
  - Émettre les modifications chirurgicales sur plusieurs fichiers distincts dans le même tour.
  - Ne jamais paralléliser des opérations dépendantes (ex : modifier un fichier TypeScript puis lancer `npm test` dans le même tour).

---

## 7. Anti-Patterns Spécifiques à FrameMyApp-Banner

Éviter rigoureusement :

* ❌ **Lire ou analyser `index.original.html`** : Fichier monolithique obsolète de 85 KB. Gaspille inutilement ~25k tokens de contexte.
* ❌ **Fouiller dans `node_modules/` ou `dist/`** : Répertoires exclus via `.aiexclude`.
* ❌ **Modifier une propriété de template sans synchroniser les 5 couches** : Oublier la cascade `deepMerge` dans `templateEngine.ts` ou la sérialisation casse silencieusement les templates YAML.
* ❌ **Lancer `npm run build` pour une simple vérification de syntaxe** : Utiliser `analyze_file` d'abord, puis `npm test` ou `npx tsc --noEmit`.
* ❌ **Relire `EditorContext.tsx` (>700 lignes) après une modification** : Vérifier avec `analyze_file` sur le fichier plutôt que de le relire entièrement.
* ❌ **Recopier du code complet dans la réponse finale** : Fournir un résumé concis avec les hyperliens IDE vers les fichiers modifiés.

---

## 8. Format des Réponses Finales

Une réponse après une tâche réussie doit être sobre, précise et immédiatement actionnable :

```text
Statut : Succès

Modifications :
- [template.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/types/template.ts#L45-L52) : Ajout du champ optionnel X
- [templateEngine.ts](file:///home/avianey/workspace/FrameMyApp-Banner/src/utils/templateEngine.ts#L80-L95) : Prise en charge dans deepMerge et serializeCanvasToMaster
- [TextControls.tsx](file:///home/avianey/workspace/FrameMyApp-Banner/src/components/drawer/TextControls.tsx#L110-L125) : Ajout du curseur de contrôle UI

Validation :
- analyze_file : aucune erreur détectée
- npm test : 7/7 assertions validées (YAML round-trip & cascade)
```
