/**
 * Helper de calcul géométrique et d'amortissement élastique pour l'ajustement (Crop / Pan & Zoom)
 * d'images en mode "Remplir" (Cover) ou "Ajuster" (Contain) dans un conteneur (Arrière-plan de scène ou Forme).
 */

export interface ImageCropGeometry {
  baseW: number;
  baseH: number;
  renderW: number;
  renderH: number;
  centerLeft: number;
  centerTop: number;
  maxOffsetX: number;
  maxOffsetY: number;
  currentLeft: number;
  currentTop: number;
}

/**
 * Calcule la géométrie d'affichage de l'image dans un conteneur donné.
 */
export function computeImageCropGeometry(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
  imageScale: number = 1.0,
  imageOffsetX: number = 0,
  imageOffsetY: number = 0,
  imageFit: 'cover' | 'contain' | 'auto' = 'cover'
): ImageCropGeometry {
  const safeNatW = naturalW > 0 ? naturalW : containerW;
  const safeNatH = naturalH > 0 ? naturalH : containerH;

  let baseScale: number;
  if (imageFit === 'contain') {
    baseScale = Math.min(containerW / safeNatW, containerH / safeNatH);
  } else {
    // Mode 'cover' (Remplir 100%)
    baseScale = Math.max(containerW / safeNatW, containerH / safeNatH);
  }

  // En mode cover, le zoom ne peut jamais descendre sous 1.0 (doit toujours recouvrir le conteneur)
  const effectiveZoom = imageFit === 'cover' ? Math.max(1.0, imageScale) : Math.max(0.1, imageScale);

  const baseW = safeNatW * baseScale;
  const baseH = safeNatH * baseScale;

  const renderW = Math.round(baseW * effectiveZoom);
  const renderH = Math.round(baseH * effectiveZoom);

  // Position centrée par défaut
  const centerLeft = (containerW - renderW) / 2;
  const centerTop = (containerH - renderH) / 2;

  // En mode cover, les limites de décalage strictes pour qu'aucun bord ne découvre le conteneur :
  // actualLeft doit être entre [containerW - renderW, 0].
  // Comme actualLeft = centerLeft + offsetX, et centerLeft = (containerW - renderW)/2,
  // offsetX doit être entre [-(renderW - containerW)/2, (renderW - containerW)/2].
  const maxOffsetX = imageFit === 'cover' ? Math.max(0, (renderW - containerW) / 2) : Infinity;
  const maxOffsetY = imageFit === 'cover' ? Math.max(0, (renderH - containerH) / 2) : Infinity;

  const currentLeft = centerLeft + imageOffsetX;
  const currentTop = centerTop + imageOffsetY;

  return {
    baseW,
    baseH,
    renderW,
    renderH,
    centerLeft,
    centerTop,
    maxOffsetX,
    maxOffsetY,
    currentLeft,
    currentTop
  };
}

/**
 * Borne strictement le décalage (offset) pour que l'image recouvre toujours intégralement le conteneur.
 */
export function clampImageOffset(
  offsetX: number,
  offsetY: number,
  maxOffsetX: number,
  maxOffsetY: number
): { offsetX: number; offsetY: number } {
  if (!isFinite(maxOffsetX) || !isFinite(maxOffsetY)) {
    return { offsetX, offsetY };
  }

  return {
    offsetX: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
    offsetY: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY))
  };
}

/**
 * Calcule l'amortissement élastique (rubber-band) lors du glisser si l'utilisateur tire au-delà du bord.
 */
export function applyRubberBandOffset(
  rawOffsetX: number,
  rawOffsetY: number,
  maxOffsetX: number,
  maxOffsetY: number,
  resistance: number = 0.25
): { displayOffsetX: number; displayOffsetY: number; isOut: boolean } {
  if (!isFinite(maxOffsetX) || !isFinite(maxOffsetY)) {
    return { displayOffsetX: rawOffsetX, displayOffsetY: rawOffsetY, isOut: false };
  }

  let displayOffsetX = rawOffsetX;
  let displayOffsetY = rawOffsetY;
  let isOut = false;

  if (rawOffsetX > maxOffsetX) {
    displayOffsetX = maxOffsetX + (rawOffsetX - maxOffsetX) * resistance;
    isOut = true;
  } else if (rawOffsetX < -maxOffsetX) {
    displayOffsetX = -maxOffsetX + (rawOffsetX - (-maxOffsetX)) * resistance;
    isOut = true;
  }

  if (rawOffsetY > maxOffsetY) {
    displayOffsetY = maxOffsetY + (rawOffsetY - maxOffsetY) * resistance;
    isOut = true;
  } else if (rawOffsetY < -maxOffsetY) {
    displayOffsetY = -maxOffsetY + (rawOffsetY - (-maxOffsetY)) * resistance;
    isOut = true;
  }

  return { displayOffsetX, displayOffsetY, isOut };
}
