import { GlowConfig, ShadowConfig } from '../types';

/**
 * Construit la propriété CSS box-shadow combinant lueur (glow) et ombre portée.
 */
export function getCombinedBoxShadow(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable) {
    parts.push(`${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${glow.color}`);
  }
  if (shadow?.enable) {
    parts.push(`${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'none';
}

/**
 * Construit la propriété CSS text-shadow combinant lueur (glow) et ombre portée.
 */
export function getCombinedTextShadow(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable) {
    parts.push(`${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${glow.color}`);
  }
  if (shadow?.enable) {
    parts.push(`${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color}`);
  }
  return parts.join(', ');
}

/**
 * Construit la propriété CSS filter drop-shadow combinant lueur et ombre
 * (utilisé notamment pour les formes avec découpe clip-path comme l'étoile et l'hexagone).
 */
export function getCombinedDropShadowFilter(glow?: GlowConfig, shadow?: ShadowConfig): string {
  const parts: string[] = [];
  if (glow?.enable) {
    parts.push(`drop-shadow(${glow.x ?? 0}px ${glow.y ?? 0}px ${glow.blur ?? 0}px ${glow.color})`);
  }
  if (shadow?.enable) {
    parts.push(`drop-shadow(${shadow.x ?? 0}px ${shadow.y ?? 0}px ${shadow.blur ?? 0}px ${shadow.color})`);
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}
