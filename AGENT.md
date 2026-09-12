# Consignes & Directives pour Agents IA (FrameMyApp-Banner)

Ce document formalise les règles obligatoires d'exécution et de comportement pour tout agent IA intervenant sur le dépôt **FrameMyApp-Banner**.

---

## 1. Interdiction des Commandes Terminal Inutiles & Redondantes

> ⚠️ **RÈGLE STRICTE : NE JAMAIS LANCER `npx tsc`, `npm run build` OU DES VÉRIFICATIONS LOURDES.**

- **Recompilation Vite en temps réel** : L'environnement de développement exécute déjà le serveur Vite avec HMR (Hot Module Replacement) et recompilation automatique.
- **Interdiction de `npx tsc` / `npx tsc --noEmit`** : Ne jamais exécuter de typecheck global en ligne de commande.
- **Interdiction de `npm run build`** : Ne pas lancer de build complet de production sauf demande explicite de l'utilisateur.
- **Vérification statique légère** : Pour valider la syntaxe et l'absence d'erreurs TypeScript lors de modifications de code, utiliser **uniquement** l'outil interne IDE `analyze_file(absolutePath = "...")` (coût nul, résultat instantané).
- **Tests unitaires du moteur de template** : `npm test` (`vite-node test-template-engine.mjs`) n'est à lancer que lors de modifications impactant la sérialisation YAML ou le système de cascade Master/Overrides/Variants.

---

## 2. Respect des Skills du Projet

L'agent doit impérativement respecter les compétences locales définies dans `.skills/` :

1. **`frugal-workflow` (`.skills/frugal-workflow/SKILL.md`)** :
   - Économie maximale de tokens et d'itérations.
   - Ne jamais ouvrir, chercher ni lire `index.original.html` (fichier historique obsolète de 85 KB).
   - Ne jamais scanner `node_modules/` ni `dist/`.
   - Utiliser des modifications chirurgicales (`replace_file_content`, `multi_replace_file_content`).

2. **`banner-template-architecture` (`.skills/banner-template-architecture/SKILL.md`)** :
   - Lors de l'ajout d'une propriété ou d'un paramètre, synchroniser systématiquement les couches nécessaires :
     1. Types TypeScript (`src/types/index.ts`, `src/types/template.ts`)
     2. Moteur en cascade (`src/utils/templateEngine.ts`)
     3. Contrôles UI du volet droit (`src/components/drawer/`)
     4. Valeurs par défaut et `customId` (`src/context/EditorContext.tsx`)
     5. Tests du moteur (`test-template-engine.mjs`)
     6. Documentation (`docs/DOCUMENTATION.md`)

3. **`documentation-maintenance` (`.skills/documentation-maintenance/SKILL.md`)** :
   - Maintenir systématiquement `docs/DOCUMENTATION.md` synchronisé avec chaque évolution de fonctionnalités, polices, contrôles UI ou templates.

---

## 3. Style & Format des Réponses

- Être concis, sobre et factuel.
- Fournir des liens clairs vers les fichiers modifiés (`[Fichier.tsx](file:///...)`).
- Ne jamais réafficher des blocs complets de code déjà modifiés dans le projet.
