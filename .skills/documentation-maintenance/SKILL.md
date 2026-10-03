---
name: documentation-maintenance
description: Protocole opérationnel pour maintenir la documentation du système de templates (docs/DOCUMENTATION.md) synchronisée avec chaque évolution touchant aux templates, à la cascade Master/Overrides/Variants, aux identifiants personnalisés (customId), à la syntaxe YAML, aux assets ou au Batch Export dans FrameMyApp-Banner.
metadata:
  author: FrameMyApp
  version: 2.0.0
  category: Documentation
  last-updated: '2026-09-01'
  keywords:
    - FrameMyApp
    - Banner Studio
    - Documentation
    - Templates
    - YAML
    - CustomId
    - Cascade
    - Assets
    - Batch Export
---

# Protocole de Maintenance de la Documentation du Système de Templates (FrameMyApp-Banner)

Ce document formalise la politique de maintenance documentaire pour le **système de templates, cascade, YAML, identifiants (`customId`), résolution d'assets et Batch Export** de **FrameMyApp-Banner**.

---

## 1. Périmètre & Règle d'Application

> **RÈGLE :**
> **Toute modification ou évolution impactant le système de templates (moteur en cascade, syntaxe des fichiers YAML, identifiants `customId`, arborescence de bundle, résolution d'assets ou Batch Export) doit être immédiatement et fidèlement reflétée dans le fichier [docs/DOCUMENTATION.md](file:///home/avianey/workspace/FrameMyApp-Banner/docs/DOCUMENTATION.md).**
>
> Les modifications d'interface générale (boutons, thèmes, canevas, contrôles UI, raccourcis clavier) ne font plus l'objet d'une documentation obligatoire dans ce fichier.

---

## 2. Matrice des Déclencheurs & Sections Cibles dans `docs/DOCUMENTATION.md`

| Fichier / Composant Modifié | Nature du Changement | Section Cible dans `docs/DOCUMENTATION.md` | Action Requise |
|---|---|---|---|
| `src/utils/templateEngine.ts`, `src/types/template.ts` | Évolution de la cascade Master / Overrides / Variants, règles de fusion `resolveComposition` | **Section 1 : Système de Templates & Déclinaisons en Cascade** | Actualiser l'arborescence, l'ordre d'application de la cascade et les règles de fusion. |
| `src/context/EditorContext.tsx`, `LeftSidebar.tsx` (Mapping customId) | Identifiants sémantiques, fonction Auto-ID, règles de mapping | **Section 2 : Identifiants Personnalisés (customId)** | Expliquer l'attribution du nouvel identifiant et son utilisation dans les templates. |
| `master.yml`, `overrides/*.yml`, `variants/**/*.yml` | Nouveaux blocs, syntaxes `elements.*`, `content.*`, `images.*` ou `background.*` | **Section 3 : Spécification & Syntaxe des Fichiers YAML** | Mettre à jour les exemples annotés de `master.yml`, surcharges et variantes. |
| `src/utils/bundleIo.ts`, `assetManager.ts` | Résolution des images, arborescence sous `assets/` | **Section 4 : Gestion des Assets Graphiques & Résolution en Cascade** | Préciser les règles de remontée d'arborescence et les chemins relatifs supportés. |
| `src/components/modal/BatchExportModal.tsx`, `src/utils/batchExportRenderer.ts` | File System Access API, sous-dossier horodaté, archive ZIP, CJK | **Section 5 : Batch Export (Export par Lot) & Archives ZIP** | Documenter les options d'export par lot, formats de sortie et arborescence générée. |
| `src/types/index.ts`, `test-template-engine.mjs` | Nouveaux attributs d'éléments, correspondances TypeScript / YAML | **Section 6 : Architecture, Types & Tests du Moteur de Templates** | Synchroniser la matrice de correspondance et les procédures de tests. |

---

## 3. Protocole Opérationnel

Chaque fois que vous modifiez le système de templates de FrameMyApp-Banner :

### Action 1 : Localiser la section cible
- Consulter le sommaire de `docs/DOCUMENTATION.md`.
- Repérer le numéro de section (`## X. ...`) et le sous-titre (`### X.Y ...`).

### Action 2 : Édition chirurgicale
- Utiliser impérativement les outils d'édition ciblée : `replace_file_content` ou `multi_replace_file_content`.

### Action 3 : Validation des Exemples YAML
- Tout exemple YAML fourni dans la documentation doit être syntaxiquement valide et directement utilisable par le moteur `templateEngine.ts`.

### Action 4 : Validation des Tests
- Exécuter les tests du moteur de template :
  ```bash
  npm test
  ```
