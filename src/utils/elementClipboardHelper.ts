import { CanvasElement, DeviceElementModel, ShapeElementModel } from '../types';
import { assetManager } from './assetManager';
import { resolveAsset } from './templateEngine';

const CLIPBOARD_STORAGE_KEY = 'framemyapp_element_clipboard_v1';

export interface ElementClipboardPayload {
  elements: CanvasElement[];
  sourceItemId: string | null;
  copiedAt: number;
}

/**
 * Génère un customId unique dans un ensemble existant.
 * Si `preferOriginal` est true et que `baseId` n'est pas déjà pris, retourne `baseId` tel quel.
 */
export function generateUniqueCustomId(
  baseId: string | undefined,
  existingCustomIds: Set<string>,
  preferOriginal: boolean
): string | undefined {
  if (!baseId || !baseId.trim()) return baseId;
  const trimmed = baseId.trim();
  if (preferOriginal && !existingCustomIds.has(trimmed)) {
    return trimmed;
  }
  const cleanBase = trimmed.replace(/_copy(?:_\d+)?$/, '');
  let candidate = `${cleanBase}_copy`;
  let counter = 2;
  while (existingCustomIds.has(candidate)) {
    candidate = `${cleanBase}_copy_${counter}`;
    counter++;
  }
  return candidate;
}

/**
 * Prépare un tableau d'éléments pour stockage dans le presse-papiers (clone profond + chemins d'assets propres).
 */
export function prepareElementsForClipboard(elements: CanvasElement[]): CanvasElement[] {
  return elements.map(el => {
    const copy = JSON.parse(JSON.stringify(el)) as any;
    delete copy.imageNaturalWidth;
    delete copy.imageNaturalHeight;
    if (copy.type === 'shape' && copy.imageUrl) {
      const rel = assetManager.getAssetPathFromUrl(copy.imageUrl);
      if (rel) copy.imageUrl = rel;
    } else if (copy.type === 'device' && copy.screenImageUrl) {
      const rel = assetManager.getAssetPathFromUrl(copy.screenImageUrl);
      if (rel) copy.screenImageUrl = rel;
    }
    return copy as CanvasElement;
  });
}

/**
 * Clone des éléments sources pour les insérer dans une liste d'éléments cible (même document ou autre master/override/variant).
 */
export function cloneElementsForTarget(
  sourceElements: CanvasElement[],
  targetExistingElements: CanvasElement[],
  options: {
    offsetPx: number;
    preferOriginalCustomId: boolean;
    assetsMap?: Record<string, string>;
    targetItemPath?: string;
  }
): CanvasElement[] {
  const { offsetPx, preferOriginalCustomId, assetsMap = {}, targetItemPath } = options;
  const now = Date.now();
  const usedCustomIds = new Set<string>(
    targetExistingElements
      .map(el => (el.customId || '').trim())
      .filter(Boolean)
  );

  return sourceElements.map((el, idx) => {
    const copy: CanvasElement = JSON.parse(JSON.stringify(el));
    copy.id = `${el.type}-${now}-${idx}`;
    copy.x = Math.round(el.x + offsetPx);
    copy.y = Math.round(el.y + offsetPx);

    if (copy.customId) {
      const nextCustomId = generateUniqueCustomId(copy.customId, usedCustomIds, preferOriginalCustomId);
      if (nextCustomId) {
        copy.customId = nextCustomId;
        usedCustomIds.add(nextCustomId);
      }
    }

    // Résoudre l'URL d'affichage de l'asset si disponible dans le bundle courant
    if (copy.type === 'shape' && (copy as ShapeElementModel).imageUrl) {
      const shape = copy as ShapeElementModel;
      const display =
        assetManager.getDisplayUrl(shape.imageUrl) ||
        resolveAsset(shape.imageUrl, targetItemPath, assetsMap);
      if (display) shape.imageUrl = display;
    } else if (copy.type === 'device' && (copy as DeviceElementModel).screenImageUrl) {
      const device = copy as DeviceElementModel;
      const display =
        assetManager.getDisplayUrl(device.screenImageUrl) ||
        resolveAsset(device.screenImageUrl, targetItemPath, assetsMap);
      if (display) device.screenImageUrl = display;
    }

    return copy;
  });
}

export function saveClipboardToStorage(payload: ElementClipboardPayload): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export function loadClipboardFromStorage(): ElementClipboardPayload | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
      return parsed as ElementClipboardPayload;
    }
  } catch {
    // Ignore malformed data
  }
  return null;
}
