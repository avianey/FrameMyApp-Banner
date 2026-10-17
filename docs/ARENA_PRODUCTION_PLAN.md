# Plan de Mise en Production — Arena des 10 Agents

Ce document consigne le plan concerté issu de l'audit croisé des 10 agents spécialisés pour finaliser la mise en production de **FrameMyApp-Banner**.

---

## Arbitrages Retenus

1. **Modèle d'interaction Canvas (Standard Figma)** :
   - **Simple clic sur un élément (y compris Texte)** : Sélection + déplacement immédiat au glisser (`pointerDown` → drag).
   - **Double-clic sur un Texte** : Passage en mode édition `contentEditable` (avec nettoyage `text/plain` au copier-coller et sortie via `Escape` ou perte de focus).
   - **Clic-glisser sur le fond / Artboard** : Rectangle de sélection multiple (*Marquee Selection*).
   - **Pan du Viewport** : `Espace + Clic-glisser` (prioritaire même au-dessus des éléments), clic molette (`button === 1`) ou défilement à deux doigts sur trackpad (`wheel` sans `ctrlKey`), tandis que `Ctrl + wheel` (ou pinch) gère le zoom focal.
   - **Contrôle de Zoom** : Ajout du bouton *Ajuster à l'écran (Fit)*.
2. **Sérialisation YAML & Intégrité du Moteur** :
   - Diff automatique par rapport au parent (`Master` ou `Master + Override`) dans `serializeCanvasToOverride` et `serializeCanvasToVariant` pour persister toutes les propriétés modifiées sur le canvas.
   - Durcissement de `parseYaml` contre les entrées invalides ou scalaires.
3. **Navigation & Architecture UI** :
   - **Header** : Suppression du doublon « Fond », ajout de l'accès à l'aide des raccourcis clavier (`?`).
   - **BottomBar** : Clarification du bouton « Zones » (icône `aspect_ratio`).
   - **LeftSidebar** : Déblocage permanent du bouton `+ Décliner` (même à 0 variante), suppression du bouton de sauvegarde Master redondant, renommage de l'onglet « Custom IDs » en **« Calques & IDs »** avec ordre visuel standard (1er plan en haut), actions rapides d'empilement et validation des `customId`.
   - **SideDrawer** : En-tête fixe avec action *Supprimer*, bloc **Géométrie (`X`, `Y`, `L`, `H`, `Rotation 0°`)** sur tous les éléments, scrollbar fine visible, et correction de la saisie numérique libre dans `DeviceControls`.

---

## Étapes d'Exécution & Commits Séquentiels

- **Étape 0** : Création de la branche dédiée et commit initial du plan (`docs/ARENA_PRODUCTION_PLAN.md`).
- **Étape 1 (P0.1)** : Moteur de Templates & Sérialisation YAML par Diff (`templateEngine.ts`, `yamlHelper.ts` + validation `npm test`).
- **Étape 2 (P0.2)** : Volet Gauche — Déblocage `+ Décliner`, ordre des calques (1er plan en haut), actions rapides et validation `customId` (`LeftSidebar.tsx`).
- **Étape 3 (P0.3)** : Édition Texte Standard Figma (Simple clic = Drag, Double-clic = Édition, `onPaste` plain-text) (`TextElement.tsx`, `Artboard.tsx`).
- **Étape 4 (P0.4)** : Corrections Géométriques, Cropper orienté, Dynamic Island scalable & Saisie `DeviceControls` (`DeviceElement.tsx`, `InPlaceImageCropper.tsx`, `ExportOverlay.tsx`, `DeviceControls.tsx`).
- **Étape 5 (P0.5)** : Stabilité Prod — `ErrorBoundary`, `beforeunload`, Verrou de sync disque `isSyncingRef` & Révocation `ObjectURL` (`main.tsx`, `ErrorBoundary.tsx`, `useDiskSync.ts`, `assetManager.ts`).
- **Étape 6 (P1.1)** : Hygiène Undo/Redo (`structuredClone`, transactions sliders/handles), Mémoïsation `EditorContext` & Aperçu sans saut de zoom (`EditorContext.tsx`, `useCanvasHistory.ts`, `SelectionHandles.tsx`, `SideDrawer.tsx`).
- **Étape 7 (P1.2)** : Refonte Navigation (`Header.tsx`, `BottomBar.tsx`, `Snackbar.tsx`, `ConfirmModal.tsx`) & Bloc Géométrie `X/Y/L/H` dans l'inspecteur droit (`SideDrawer.tsx`, `TextControls.tsx`, `ShapeControls.tsx`).
- **Étape 8 (P1.3)** : Interactions Canvas Standard Figma (Marquee Selection, `Espace+Clic` Pan, Trackpad Pan/Zoom, Bouton *Fit-to-Screen*, Raccourcis `Ctrl+D`, `Ctrl+C/V`, `Ctrl+A`, `Ctrl+S`) (`CanvasViewport.tsx`, `Artboard.tsx`, `useCanvasHistory.ts`, `EditorContext.tsx`).
- **Étape 9 (P2.1)** : Smart Guides (Magnétisme dynamique centres/bords + Snap rotation `Shift` 15°) & Alignement AABB orienté (`SelectionHandles.tsx`, `Artboard.tsx`, `alignment.ts`).
- **Étape 10 (P2.2 & P2.3)** : Batch Export Haute Capacité (Miniatures légères, formats PNG/JPEG/WebP, `neededScale` 4x, Retry) & Modale Raccourcis Clavier (`BatchExportModal.tsx`, `batchExportRenderer.ts`, `ShortcutsModal.tsx`, `Header.tsx`).
