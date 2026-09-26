import { DeviceElementModel, DeviceModelType } from '../types';

export interface DeviceEffectiveDimensions {
  radiusPercent: number;
  bodyPercent: number;
  borderPercent: number;
  effectiveBorderRadius: number;
  effectiveBodyThickness: number;
  effectiveScreenBorderWidth: number;
  effectiveBezelBorderRadius: number;
  effectiveInnerBorderRadius: number;
  scale: number;
}

/**
 * Calcule les dimensions et rayons effectifs du boîtier et des bordures
 * en proportion de la taille du device (largeur), évitant la limitation en pixels fixes.
 */
export function getDeviceEffectiveDimensions(element: {
  width: number;
  height?: number;
  deviceType?: DeviceModelType;
  borderRadius?: number;
  borderRadiusPercent?: number;
  bodyThickness?: number;
  bodyThicknessPercent?: number;
  screenBorderWidth?: number;
  screenBorderWidthPercent?: number;
}): DeviceEffectiveDimensions {
  const baseWidth = element.deviceType === 'pixel-tab' ? 500 : 260;
  const currentWidth = Math.max(30, element.width || baseWidth);

  // 1. Rayon d'arrondi du boîtier (% de la largeur)
  let radiusPercent: number;
  if (element.borderRadiusPercent !== undefined) {
    radiusPercent = element.borderRadiusPercent;
  } else if (element.borderRadius !== undefined) {
    // Si la valeur est > 25, il s'agit d'une ancienne valeur en pixels calibrée sur baseWidth
    radiusPercent = element.borderRadius > 25
      ? (element.borderRadius / baseWidth) * 100
      : element.borderRadius;
  } else {
    radiusPercent = element.deviceType === 'iphone-pro-max' ? 16.6
      : element.deviceType === 'samsung-galaxy' ? 8.5
      : element.deviceType === 'pixel-tab' ? 5.2
      : 13.85; // pixel-10 (~36px sur 260px)
  }

  // 2. Épaisseur du châssis extérieur (% de la largeur)
  let bodyPercent: number;
  if (element.bodyThicknessPercent !== undefined) {
    bodyPercent = element.bodyThicknessPercent;
  } else if (element.bodyThickness !== undefined) {
    // Si la valeur est exprimée à l'échelle de base (ex: 10px -> 3.85%)
    bodyPercent = (element.bodyThickness / baseWidth) * 100;
  } else {
    bodyPercent = element.deviceType === 'pixel-tab' ? 2.8 : 3.85; // ~10px sur 260px
  }

  // 3. Bordure d'écran / Bezel intérieur (% de la largeur)
  let borderPercent: number;
  if (element.screenBorderWidthPercent !== undefined) {
    borderPercent = element.screenBorderWidthPercent;
  } else if (element.screenBorderWidth !== undefined) {
    borderPercent = (element.screenBorderWidth / baseWidth) * 100;
  } else {
    borderPercent = element.deviceType === 'pixel-tab' ? 1.2 : 1.54; // ~4px sur 260px
  }

  // Dimensions effectives en pixels proportionnelles à la largeur actuelle
  const effectiveBorderRadius = Math.max(0, Math.round((radiusPercent / 100) * currentWidth));
  const effectiveBodyThickness = Math.max(1, Math.round((bodyPercent / 100) * currentWidth));
  const effectiveScreenBorderWidth = Math.max(0, Math.round((borderPercent / 100) * currentWidth));
  const effectiveBezelBorderRadius = Math.max(0, effectiveBorderRadius - effectiveBodyThickness);
  const effectiveInnerBorderRadius = Math.max(0, effectiveBorderRadius - effectiveBodyThickness - effectiveScreenBorderWidth);

  // Facteur d'échelle par rapport à la taille de référence pour les boutons, encoche et icônes
  const scale = currentWidth / baseWidth;

  return {
    radiusPercent,
    bodyPercent,
    borderPercent,
    effectiveBorderRadius,
    effectiveBodyThickness,
    effectiveScreenBorderWidth,
    effectiveBezelBorderRadius,
    effectiveInnerBorderRadius,
    scale
  };
}

/**
 * Calcule la hauteur totale du téléphone pour que la zone d'écran interne
 * respecte exactement le ratio d'aspect de l'image (img.naturalWidth / img.naturalHeight).
 */
export function computeDeviceHeightFromWidth(
  width: number,
  imageRatio: number,
  element: Partial<DeviceElementModel>
): number {
  if (!imageRatio || imageRatio <= 0) {
    return element.height || 565;
  }

  const dims = getDeviceEffectiveDimensions({
    ...element,
    width
  });
  const totalInset = dims.effectiveBodyThickness + dims.effectiveScreenBorderWidth;
  const screenWidth = Math.max(20, width - 2 * totalInset);
  const screenHeight = Math.round(screenWidth / imageRatio);
  return screenHeight + 2 * totalInset;
}

/**
 * Calcule la largeur totale du téléphone pour que la zone d'écran interne
 * respecte exactement le ratio d'aspect de l'image (img.naturalWidth / img.naturalHeight).
 */
export function computeDeviceWidthFromHeight(
  height: number,
  imageRatio: number,
  element: Partial<DeviceElementModel>
): number {
  if (!imageRatio || imageRatio <= 0) {
    return element.width || 260;
  }

  const baseWidth = element.deviceType === 'pixel-tab' ? 500 : 260;
  const dims = getDeviceEffectiveDimensions({
    ...element,
    width: baseWidth
  });

  const k = (dims.bodyPercent + dims.borderPercent) / 100;
  const denom = (1 - 2 * k) / imageRatio + 2 * k;
  if (denom <= 0) {
    return Math.round(height * imageRatio);
  }

  const estimatedWidth = Math.max(40, Math.round(height / denom));
  const refinedDims = getDeviceEffectiveDimensions({
    ...element,
    width: estimatedWidth
  });
  const totalInset = refinedDims.effectiveBodyThickness + refinedDims.effectiveScreenBorderWidth;
  const screenHeight = Math.max(20, height - 2 * totalInset);
  const screenWidth = Math.round(screenHeight * imageRatio);
  return screenWidth + 2 * totalInset;
}
