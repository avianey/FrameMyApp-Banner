import { GlowConfig, ShadowConfig } from '../types';

/**
 * Normalise une chaîne de couleur CSS (ex: supprime les espaces internes dans rgba(...)
 * pour éviter les bugs de découpe de chaînes des moteurs de rendu tiers comme html2canvas).
 */
export function normalizeColorForCss(color?: string): string {
  if (!color) return '';
  return color.replace(/\s*,\s*/g, ',');
}

/**
 * Construit la propriété CSS box-shadow combinant lueur (glow) et ombre portée.
 */
export function getCombinedBoxShadow(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable && glow.color) {
    parts.push(`${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${glow.color}`);
  }
  if (shadow?.enable && shadow.color) {
    parts.push(`${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'none';
}

/**
 * Construit la propriété CSS text-shadow combinant lueur (glow) et ombre portée.
 */
export function getCombinedTextShadow(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable && glow.color) {
    parts.push(`${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${normalizeColorForCss(glow.color)}`);
  }
  if (shadow?.enable && shadow.color) {
    parts.push(`${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${normalizeColorForCss(shadow.color)}`);
  }
  return parts.join(', ');
}

/**
 * Construit la propriété CSS filter drop-shadow combinant lueur et ombre
 * (utilisé notamment pour les formes avec découpe clip-path comme l'étoile et l'hexagone).
 */
export function getCombinedDropShadowFilter(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable && glow.color) {
    parts.push(`drop-shadow(${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${normalizeColorForCss(glow.color)})`);
  }
  if (shadow?.enable && shadow.color) {
    parts.push(`drop-shadow(${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${normalizeColorForCss(shadow.color)})`);
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function drawRoundRectFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Trace le contour géométrique vectoriel d'un élément selon son type de forme ou son rayon de courbure.
 */
export function drawGeometryPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number = 0,
  shapeType: string = 'rounded-rect'
): void {
  ctx.beginPath();
  if (shapeType === 'circle') {
    const rx = width / 2;
    const ry = height / 2;
    ctx.ellipse(x + rx, y + ry, rx, ry, 0, 0, Math.PI * 2);
  } else if (shapeType === 'pill') {
    const r = Math.min(width, height) / 2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, r);
    } else {
      drawRoundRectFallback(ctx, x, y, width, height, r);
    }
  } else if (shapeType === 'star') {
    const points = [
      [0.5, 0], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57],
      [0.79, 0.91], [0.5, 0.70], [0.21, 0.91], [0.32, 0.57],
      [0.02, 0.35], [0.39, 0.35]
    ];
    points.forEach(([px, py], i) => {
      const ptX = x + px * width;
      const ptY = y + py * height;
      if (i === 0) ctx.moveTo(ptX, ptY);
      else ctx.lineTo(ptX, ptY);
    });
    ctx.closePath();
  } else if (shapeType === 'hexagon') {
    const points = [
      [0.25, 0], [0.75, 0], [1.0, 0.5],
      [0.75, 1.0], [0.25, 1.0], [0, 0.5]
    ];
    points.forEach(([px, py], i) => {
      const ptX = x + px * width;
      const ptY = y + py * height;
      if (i === 0) ctx.moveTo(ptX, ptY);
      else ctx.lineTo(ptX, ptY);
    });
    ctx.closePath();
  } else {
    // rounded-rect ou rectangle
    const r = Math.min(borderRadius, Math.min(width, height) / 2);
    if (r > 0) {
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, width, height, r);
      } else {
        drawRoundRectFallback(ctx, x, y, width, height, r);
      }
    } else {
      ctx.rect(x, y, width, height);
    }
  }
}

/**
 * Génère un Canvas contenant les effets visuels de lueur (glow) et d'ombre portée (shadow)
 * avec le centre découpé de manière transparente. Ce calque remplace avantageusement
 * les box-shadow CSS lors des exports html2canvas pour éliminer les bugs de troncature et d'alpha.
 */
export function renderEffectsBackdropCanvas({
  ownerDoc,
  width,
  height,
  borderRadius = 0,
  shapeType = 'rounded-rect',
  glow,
  shadow
}: {
  ownerDoc?: Document;
  width: number;
  height: number;
  borderRadius?: number;
  shapeType?: string;
  glow?: GlowConfig;
  shadow?: ShadowConfig;
}): { canvas: HTMLCanvasElement; pad: number } | null {
  const hasGlow = Boolean(glow?.enable && glow.color && (glow.blur || glow.x || glow.y));
  const hasShadow = Boolean(shadow?.enable && shadow.color && (shadow.blur || shadow.x || shadow.y));

  if (!hasGlow && !hasShadow) {
    return null;
  }

  const maxBlur = Math.max(
    hasGlow ? (glow?.blur || 0) : 0,
    hasShadow ? (shadow?.blur || 0) : 0
  );
  const maxOffset = Math.max(
    hasGlow ? Math.max(Math.abs(glow?.x || 0), Math.abs(glow?.y || 0)) : 0,
    hasShadow ? Math.max(Math.abs(shadow?.x || 0), Math.abs(shadow?.y || 0)) : 0
  );

  // Marge suffisante pour que les flous dégradés ne soient pas tronqués aux bords du canvas
  const pad = Math.ceil(maxBlur * 2.5 + maxOffset + 12);
  const canvasW = Math.round(width + pad * 2);
  const canvasH = Math.round(height + pad * 2);

  const doc = ownerDoc || (typeof document !== 'undefined' ? document : null);
  if (!doc) return null;

  const canvas = doc.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Rendu de l'ombre portée (shadow)
  if (hasShadow && shadow) {
    ctx.save();
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur || 0;
    ctx.shadowOffsetX = shadow.x || 0;
    ctx.shadowOffsetY = shadow.y || 0;
    ctx.fillStyle = '#000000';
    drawGeometryPath(ctx, pad, pad, width, height, borderRadius, shapeType);
    ctx.fill();
    ctx.restore();
  }

  // 2. Rendu de la lueur externe (glow)
  if (hasGlow && glow) {
    ctx.save();
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur || 0;
    ctx.shadowOffsetX = glow.x || 0;
    ctx.shadowOffsetY = glow.y || 0;
    ctx.fillStyle = '#000000';
    drawGeometryPath(ctx, pad, pad, width, height, borderRadius, shapeType);
    ctx.fill();
    ctx.restore();
  }

  // 3. Découpage du centre pour rendre l'intérieur parfaitement transparent
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#000000';
  drawGeometryPath(ctx, pad, pad, width, height, borderRadius, shapeType);
  ctx.fill();
  ctx.restore();

  return { canvas, pad };
}
