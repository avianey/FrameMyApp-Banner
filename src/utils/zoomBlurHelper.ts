/**
 * Utilitaire de rendu pour l'effet de flou cinétique radial (Zoom Motion Blur / Radial Rays).
 * Réalise une accumulation multi-passes pondérée par mise à l'échelle autour d'un point focal
 * (généralement le centre du device).
 */

export interface ZoomBlurRenderOptions {
  ctx: CanvasRenderingContext2D;
  source: CanvasImageSource;
  sourceX: number;
  sourceY: number;
  sourceW: number;
  sourceH: number;
  centerX: number;
  centerY: number;
  intensity?: number; // 1 à 100 (%)
  passes?: number; // Nombre de tranches d'échantillonnage (défaut: 24)
  gaussianBlur?: number; // Flou gaussien préalable éventuel
  targetWidth: number;
  targetHeight: number;
}

/**
 * Dessine un flou de zoom cinétique sur le canvas cible centré en (centerX, centerY).
 * Maintient le centre net et étire radialement les pixels vers l'extérieur.
 */
export function renderZoomBlur({
  ctx,
  source,
  sourceX,
  sourceY,
  sourceW,
  sourceH,
  centerX,
  centerY,
  intensity = 25,
  passes = 24,
  gaussianBlur = 0,
  targetWidth,
  targetHeight
}: ZoomBlurRenderOptions): void {
  if (
    !ctx ||
    !source ||
    (source instanceof HTMLImageElement && (!source.complete || source.naturalWidth === 0))
  ) {
    return;
  }

  // Borne l'intensité entre 1% et 100% (échelle maximale de dispersion jusqu'à +60%)
  const clampedIntensity = Math.max(1, Math.min(100, intensity));
  const maxExpansion = (clampedIntensity / 100) * 0.6;
  const numPasses = Math.max(2, Math.min(48, passes));

  ctx.save();
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // Application éventuelle d'un adoucissement gaussien combiné
  if (gaussianBlur > 0 && typeof ctx.filter === 'string') {
    ctx.filter = `blur(${gaussianBlur}px)`;
  } else {
    ctx.filter = 'none';
  }

  for (let i = 0; i < numPasses; i++) {
    const t = i / (numPasses - 1);
    const scale = 1 + t * maxExpansion;

    const xi = centerX + (sourceX - centerX) * scale;
    const yi = centerY + (sourceY - centerY) * scale;
    const wi = sourceW * scale;
    const hi = sourceH * scale;

    // Moyenne arithmétique progressive exacte : chaque passe aura un poids exact de 1/N
    ctx.globalAlpha = 1 / (i + 1);

    try {
      ctx.drawImage(source, xi, yi, wi, hi);
    } catch {
      // Ignorer si la source d'image n'est pas encore prête
      break;
    }
  }

  ctx.restore();
}
