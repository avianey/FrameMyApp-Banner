import {
  BackgroundConfig,
  CanvasElement,
  ExportZone,
  TextElementModel,
  ShapeElementModel,
  DeviceElementModel,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig,
  BundleItem
} from '../types';
import { assetManager } from './assetManager';

function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback for non-cloneable references
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

function normalizeAssetUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const fromBlob = assetManager.getAssetPathFromUrl(url);
  if (fromBlob) return fromBlob;
  const displayUrl = assetManager.getDisplayUrl(url);
  if (displayUrl) {
    const canonical = assetManager.getAssetPathFromUrl(displayUrl);
    if (canonical) return canonical;
  }
  return url;
}

function isSameAsset(rawPathInYaml: string | undefined, normalizedCanvasPath: string | undefined, itemPath?: string): boolean {
  if (!rawPathInYaml || !normalizedCanvasPath) return false;
  const normRaw = normalizeAssetUrl(rawPathInYaml);
  if (normRaw === normalizedCanvasPath) return true;

  const cleanRaw = rawPathInYaml.replace(/^\/+/, '');
  const cleanNorm = normalizedCanvasPath.replace(/^\/+/, '');
  if (cleanNorm === cleanRaw || cleanNorm === `assets/${cleanRaw}`) return true;

  if (itemPath) {
    const segments = itemPath.replace(/^variants\//, '').split('/');
    segments.pop();
    while (segments.length > 0) {
      if (cleanNorm === `assets/${segments.join('/')}/${cleanRaw}`) return true;
      segments.pop();
    }
  }
  return false;
}

function normalizeElementForDiff(el: CanvasElement): CanvasElement {
  const copy = deepClone(el) as any;
  delete copy.imageNaturalWidth;
  delete copy.imageNaturalHeight;
  if (copy.type === 'device' && copy.screenImageUrl) {
    copy.screenImageUrl = normalizeAssetUrl(copy.screenImageUrl);
  }
  if (copy.type === 'shape' && copy.imageUrl) {
    copy.imageUrl = normalizeAssetUrl(copy.imageUrl);
  }
  return copy;
}

function normalizeBackgroundForDiff(bg: BackgroundConfig): BackgroundConfig {
  const copy = deepClone(bg) as any;
  delete copy.imageNaturalWidth;
  delete copy.imageNaturalHeight;
  if (copy.imageUrl) {
    copy.imageUrl = normalizeAssetUrl(copy.imageUrl);
  }
  return copy;
}

function computeBackgroundDiff(
  baseBg: BackgroundConfig,
  currentBg: BackgroundConfig
): Partial<BackgroundConfig> {
  const normBase = normalizeBackgroundForDiff(baseBg);
  const normCurrent = normalizeBackgroundForDiff(currentBg);
  const diff: Partial<BackgroundConfig> = {};

  const relevantKeys = new Set<keyof BackgroundConfig>(['type']);
  if (normCurrent.type === 'solid') {
    relevantKeys.add('solidColor');
  } else if (normCurrent.type === 'linear') {
    relevantKeys.add('color1');
    relevantKeys.add('color2');
    relevantKeys.add('angle');
  } else if (normCurrent.type === 'radial') {
    relevantKeys.add('radialShape');
    relevantKeys.add('radialColor1');
    relevantKeys.add('radialColor2');
  } else if (normCurrent.type === 'image') {
    relevantKeys.add('imageUrl');
    relevantKeys.add('imageFit');
    relevantKeys.add('imageOffsetX');
    relevantKeys.add('imageOffsetY');
    relevantKeys.add('imageScale');
    relevantKeys.add('imageBlurEnable');
    if (normCurrent.imageBlurEnable || normBase.imageBlurEnable) {
      relevantKeys.add('imageBlur');
    }
    relevantKeys.add('imageOverlayEnable');
    if (normCurrent.imageOverlayEnable || normBase.imageOverlayEnable) {
      relevantKeys.add('imageOverlayColor');
    }
    relevantKeys.add('zoomBlurEnable');
    if (normCurrent.zoomBlurEnable || normBase.zoomBlurEnable) {
      relevantKeys.add('zoomBlurIntensity');
      relevantKeys.add('zoomBlurOrigin');
      if (normCurrent.zoomBlurOrigin === 'custom' || normBase.zoomBlurOrigin === 'custom') {
        relevantKeys.add('zoomBlurOriginX');
        relevantKeys.add('zoomBlurOriginY');
      }
    }
  }

  for (const key of relevantKeys) {
    const curVal = normCurrent[key];
    const baseVal = normBase[key];
    if (key === 'imageOffsetX' && (curVal === 0 || curVal === undefined) && (baseVal === 0 || baseVal === undefined)) continue;
    if (key === 'imageOffsetY' && (curVal === 0 || curVal === undefined) && (baseVal === 0 || baseVal === undefined)) continue;
    if (key === 'imageScale' && (curVal === 1 || curVal === undefined) && (baseVal === 1 || baseVal === undefined)) continue;
    if (key === 'imageBlurEnable' && !curVal && !baseVal) continue;
    if (key === 'imageOverlayEnable' && !curVal && !baseVal) continue;
    if (key === 'zoomBlurEnable' && !curVal && !baseVal) continue;

    if (JSON.stringify(curVal) !== JSON.stringify(baseVal)) {
      (diff as any)[key] = deepClone(curVal);
    }
  }

  return diff;
}

function computeExportZoneDiff(
  baseZone: ExportZone,
  currentZone: ExportZone
): Partial<ExportZone> {
  const diff: Partial<ExportZone> = {};
  for (const [k, val] of Object.entries(currentZone)) {
    const baseVal = (baseZone as any)[k];
    if (k === 'ratio' && typeof val === 'number' && typeof baseVal === 'number' && Math.abs(val - baseVal) < 0.0001) {
      continue;
    }
    if (JSON.stringify(val) !== JSON.stringify(baseVal)) {
      (diff as any)[k] = deepClone(val);
    }
  }
  return diff;
}

function computeElementDiff(
  baseEl: CanvasElement,
  currentEl: CanvasElement,
  ignoreText: boolean
): Record<string, any> {
  const normBase = normalizeElementForDiff(baseEl);
  const normCurrent = normalizeElementForDiff(currentEl);
  const diff: Record<string, any> = {};
  const ignoredKeys = new Set(['id', 'customId', 'type', 'imageNaturalWidth', 'imageNaturalHeight']);
  if (ignoreText) ignoredKeys.add('text');

  for (const [k, val] of Object.entries(normCurrent)) {
    if (ignoredKeys.has(k)) continue;
    const baseVal = (normBase as any)[k];

    if (k === 'imageOffsetX' && (val === 0 || val === undefined) && (baseVal === 0 || baseVal === undefined)) continue;
    if (k === 'imageOffsetY' && (val === 0 || val === undefined) && (baseVal === 0 || baseVal === undefined)) continue;
    if (k === 'imageScale' && (val === 1 || val === undefined) && (baseVal === 1 || baseVal === undefined)) continue;
    if ((k === 'shadow' || k === 'glow') && val && typeof val === 'object' && !val.enable && (!baseVal || !baseVal.enable)) {
      continue;
    }

    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      baseVal !== null &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      const subDiff: Record<string, any> = {};
      for (const [subK, subVal] of Object.entries(val)) {
        if (JSON.stringify(subVal) !== JSON.stringify(baseVal[subK])) {
          subDiff[subK] = deepClone(subVal);
        }
      }
      if (Object.keys(subDiff).length > 0) {
        diff[k] = subDiff;
      }
      continue;
    }

    if (JSON.stringify(val) !== JSON.stringify(baseVal)) {
      diff[k] = deepClone(val);
    }
  }
  return diff;
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal !== undefined &&
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== undefined &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      result[key] = srcVal as any;
    }
  }
  return result;
}

/**
 * Resolves an asset path according to the cascade resolution rules in BUNDLE_BLUEPRINT.md.
 */
export function resolveAsset(
  assetPath: string | undefined,
  variantPath: string | undefined,
  assetsMap: Record<string, string> = {}
): string | undefined {
  if (!assetPath) return assetPath;
  if (
    assetPath.startsWith('data:') ||
    assetPath.startsWith('http://') ||
    assetPath.startsWith('https://')
  ) {
    return assetPath;
  }

  // If it's a blob: URL, check if it's already an active URL in assetsMap values
  if (assetPath.startsWith('blob:')) {
    const isLive = Object.values(assetsMap).includes(assetPath);
    if (isLive) return assetPath;
    return assetPath;
  }

  // Normalize path without leading slash
  const cleanPath = assetPath.replace(/^\/+/, '');

  // 1. If there's a variant path, search deepest subpath first, then walk up
  if (variantPath) {
    const segments = variantPath.replace(/^variants\//, '').split('/');
    segments.pop(); // remove filename
    while (segments.length > 0) {
      const candidate = `assets/${segments.join('/')}/${cleanPath}`;
      if (assetsMap[candidate]) return assetsMap[candidate];
      segments.pop();
    }
  }

  // 2. Exact match at assets/ root or directly
  if (assetsMap[`assets/${cleanPath}`]) return assetsMap[`assets/${cleanPath}`];
  if (assetsMap[cleanPath]) return assetsMap[cleanPath];

  // 3. Direct basename lookup in assets
  const filename = cleanPath.split('/').pop();
  if (filename) {
    if (assetsMap[`assets/${filename}`]) return assetsMap[`assets/${filename}`];
    if (assetsMap[filename]) return assetsMap[filename];
    // Search in any assets path ending with /filename
    for (const [key, val] of Object.entries(assetsMap)) {
      if (key.endsWith(`/${filename}`) || key === filename) {
        return val;
      }
    }
  }

  return assetPath;
}

/**
 * Serializes current canvas state into a clean BannerMasterConfig.
 */
export function serializeCanvasToMaster(
  name: string,
  background: BackgroundConfig,
  elements: CanvasElement[],
  exportZone: ExportZone,
  canvasWidth?: number,
  canvasHeight?: number
): BannerMasterConfig {
  return {
    name: name || 'Bannière Master',
    version: '1.0',
    canvasWidth,
    canvasHeight,
    exportZone: deepClone(exportZone),
    background: deepClone(background),
    elements: deepClone(elements)
  };
}

/**
 * Applies a layer of overrides/variants to the in-progress composition.
 */
function applyLayer(
  composition: {
    background: BackgroundConfig;
    elements: CanvasElement[];
    exportZone: ExportZone;
  },
  layer: BannerOverrideConfig | BannerVariantConfig | undefined,
  assetsMap: Record<string, string> = {},
  variantPath?: string
) {
  if (!layer) return;

  // 1. ExportZone
  if (layer.exportZone) {
    composition.exportZone = deepMerge(composition.exportZone, layer.exportZone);
  }

  // 2. Background
  if (layer.background) {
    composition.background = deepMerge(composition.background, layer.background);
    if (composition.background.imageUrl) {
      const resolved = resolveAsset(composition.background.imageUrl, variantPath, assetsMap);
      if (resolved) composition.background.imageUrl = resolved;
    }
  }

  // 3. Images mapping (images.background or images.[customId])
  if (layer.images) {
    for (const [key, imgVal] of Object.entries(layer.images)) {
      if (key === 'background' || key === 'bg' || key === 'body') {
        const resolved = resolveAsset(imgVal, variantPath, assetsMap);
        if (resolved) composition.background.imageUrl = resolved;
      } else {
        const target = composition.elements.find(el => el.customId === key || el.id === key);
        if (target && target.type === 'shape') {
          const resolved = resolveAsset(imgVal, variantPath, assetsMap);
          if (resolved) (target as ShapeElementModel).imageUrl = resolved;
        } else if (target && target.type === 'device') {
          const resolved = resolveAsset(imgVal, variantPath, assetsMap);
          if (resolved) (target as DeviceElementModel).screenImageUrl = resolved;
        }
      }
    }
  }

  // 4. Content mapping (content.[customId] = string text)
  if (layer.content) {
    for (const [key, textVal] of Object.entries(layer.content)) {
      const target = composition.elements.find(el => el.customId === key || el.id === key);
      if (target && target.type === 'text') {
        (target as TextElementModel).text = String(textVal);
      }
    }
  }

  // 5. Elements overrides (array or dictionary)
  if (layer.elements) {
    if (Array.isArray(layer.elements)) {
      for (const overrideEl of layer.elements) {
        if (!overrideEl) continue;
        const targetIdx = composition.elements.findIndex(
          el => (overrideEl.customId && el.customId === overrideEl.customId) || (overrideEl.id && el.id === overrideEl.id)
        );
        if (targetIdx !== -1) {
          composition.elements[targetIdx] = deepMerge(
            composition.elements[targetIdx],
            overrideEl as any
          );
        }
      }
    } else if (typeof layer.elements === 'object') {
      for (const [key, overrideProps] of Object.entries(layer.elements)) {
        if (!overrideProps) continue;
        const targetIdx = composition.elements.findIndex(el => el.customId === key || el.id === key);
        if (targetIdx !== -1) {
          composition.elements[targetIdx] = deepMerge(
            composition.elements[targetIdx],
            overrideProps as any
          );
        }
      }
    }
  }

  // Resolve shape and device images inside elements
  for (const el of composition.elements) {
    if (el.type === 'shape' && (el as ShapeElementModel).imageUrl) {
      const resolved = resolveAsset((el as ShapeElementModel).imageUrl, variantPath, assetsMap);
      if (resolved) (el as ShapeElementModel).imageUrl = resolved;
    } else if (el.type === 'device' && (el as DeviceElementModel).screenImageUrl) {
      const resolved = resolveAsset((el as DeviceElementModel).screenImageUrl, variantPath, assetsMap);
      if (resolved) (el as DeviceElementModel).screenImageUrl = resolved;
    }
  }
}

/**
 * Cascades Master -> Override (optional) -> Variant (optional).
 */
export function resolveComposition(
  master: BannerMasterConfig,
  override?: BannerOverrideConfig,
  variant?: BannerVariantConfig,
  assetsMap: Record<string, string> = {},
  variantPath?: string
): { background: BackgroundConfig; elements: CanvasElement[]; exportZone: ExportZone; canvasWidth: number; canvasHeight: number } {
  // Base default state
  const defaultBg: BackgroundConfig = {
    type: 'solid',
    solidColor: '#ffffff',
    color1: '#6366f1',
    color2: '#ec4899',
    angle: 135,
    radialShape: 'circle',
    radialColor1: '#f43f5e',
    radialColor2: '#1e1b4b',
    imageUrl: '',
    imageFit: 'cover',
    imageBlurEnable: false,
    imageBlur: 1,
    imageOverlayEnable: false,
    imageOverlayColor: '#FFFFFF11',
    zoomBlurEnable: false,
    zoomBlurIntensity: 25,
    zoomBlurOrigin: 'auto-device',
    zoomBlurOriginX: 50,
    zoomBlurOriginY: 50
  };

  // Base canvas dimensions from master or inferred from exportZone / default 800x600
  const initialCanvasW = master.canvasWidth || master.width || master.exportZone?.width || 800;
  const initialCanvasH = master.canvasHeight || master.height || master.exportZone?.height || 600;

  const defaultZone: ExportZone = {
    x: 0,
    y: 0,
    width: initialCanvasW,
    height: initialCanvasH,
    preset: 'full',
    ratio: initialCanvasW / initialCanvasH,
    targetWidth: initialCanvasW,
    targetHeight: initialCanvasH,
    lockRatio: true
  };

  const initialExportZone = deepClone(master.exportZone ? { ...defaultZone, ...master.exportZone } : defaultZone);

  const composition = {
    background: deepClone(master.background ? { ...defaultBg, ...master.background } : defaultBg),
    elements: deepClone(Array.isArray(master.elements) ? master.elements : []),
    exportZone: initialExportZone,
    canvasWidth: initialCanvasW,
    canvasHeight: initialCanvasH
  };

  // 1. If master itself has content shortcuts
  if (master.content) {
    for (const [key, textVal] of Object.entries(master.content)) {
      const target = composition.elements.find(el => el.customId === key || el.id === key);
      if (target && target.type === 'text') {
        (target as TextElementModel).text = String(textVal);
      }
    }
  }

  // 1.5 Resolve assets in master (background and elements)
  if (composition.background.imageUrl) {
    const resolved = resolveAsset(composition.background.imageUrl, variantPath, assetsMap);
    if (resolved) composition.background.imageUrl = resolved;
  }
  for (const el of composition.elements) {
    if (el.type === 'shape' && (el as ShapeElementModel).imageUrl) {
      const resolved = resolveAsset((el as ShapeElementModel).imageUrl, variantPath, assetsMap);
      if (resolved) (el as ShapeElementModel).imageUrl = resolved;
    } else if (el.type === 'device' && (el as DeviceElementModel).screenImageUrl) {
      const resolved = resolveAsset((el as DeviceElementModel).screenImageUrl, variantPath, assetsMap);
      if (resolved) (el as DeviceElementModel).screenImageUrl = resolved;
    }
  }

  // 2. Apply Override
  if (override) {
    applyLayer(composition, override, assetsMap, variantPath);
    if (override.canvasWidth || override.width) {
      composition.canvasWidth = (override.canvasWidth || override.width)!;
    }
    if (override.canvasHeight || override.height) {
      composition.canvasHeight = (override.canvasHeight || override.height)!;
    }
  }

  // 3. Apply Variant
  if (variant) {
    applyLayer(composition, variant, assetsMap, variantPath);
    if (variant.canvasWidth || variant.width) {
      composition.canvasWidth = (variant.canvasWidth || variant.width)!;
    }
    if (variant.canvasHeight || variant.height) {
      composition.canvasHeight = (variant.canvasHeight || variant.height)!;
    }
  }

  return composition;
}

/**
 * Serializes current canvas state into an updated BannerVariantConfig.
 * Only serializes fields that differ from the parent composition (Master + Override).
 */
export function serializeCanvasToVariant(
  variantItem: BundleItem,
  currentElements: CanvasElement[],
  masterConfig?: BannerMasterConfig,
  overrideConfig?: BannerOverrideConfig,
  currentBackground?: BackgroundConfig,
  currentExportZone?: ExportZone,
  canvasWidth?: number,
  canvasHeight?: number
): BannerVariantConfig {
  const existingConfig = (variantItem.config || {}) as BannerVariantConfig;
  const newConfig: BannerVariantConfig = deepClone(existingConfig);

  if (!newConfig.name) {
    newConfig.name = variantItem.name;
  }

  const normalizedElements = currentElements.map(normalizeElementForDiff);
  const parentComposition = masterConfig
    ? resolveComposition(masterConfig, overrideConfig, undefined, {}, variantItem.path)
    : undefined;

  // 1. Content mapping: when parentComposition is available, only keep text that differs from parent (Master + Override)
  const newContent: Record<string, string> = { ...(newConfig.content || {}) };
  for (const el of currentElements) {
    if (el.type === 'text') {
      const key = el.customId || el.id;
      if (!key) continue;
      const textVal = (el as TextElementModel).text;
      if (parentComposition) {
        const baseEl = parentComposition.elements.find(e => (e.customId || e.id) === key || e.id === el.id);
        if (baseEl && baseEl.type === 'text' && (baseEl as TextElementModel).text === textVal) {
          delete newContent[key];
        } else {
          newContent[key] = textVal;
        }
      } else {
        newContent[key] = textVal;
      }
    }
  }
  if (Object.keys(newContent).length > 0) {
    newConfig.content = newContent;
  } else {
    delete newConfig.content;
  }

  // 2. Canvas dimensions diff against parent (Master + Override)
  if (parentComposition) {
    if (canvasWidth !== undefined) {
      if (canvasWidth !== parentComposition.canvasWidth) {
        newConfig.canvasWidth = canvasWidth;
      } else {
        delete newConfig.canvasWidth;
        delete newConfig.width;
      }
    }
    if (canvasHeight !== undefined) {
      if (canvasHeight !== parentComposition.canvasHeight) {
        newConfig.canvasHeight = canvasHeight;
      } else {
        delete newConfig.canvasHeight;
        delete newConfig.height;
      }
    }
  }

  // 3. Background diff against parent (Master + Override)
  if (parentComposition && currentBackground) {
    const bgDiff = computeBackgroundDiff(parentComposition.background, currentBackground);
    if (newConfig.images) {
      const bgImgKey = ['background', 'bg', 'body'].find(k => k in newConfig.images!);
      if (bgImgKey && bgDiff.imageUrl) {
        if (!isSameAsset(newConfig.images[bgImgKey], bgDiff.imageUrl, variantItem.path)) {
          newConfig.images[bgImgKey] = bgDiff.imageUrl;
        }
        delete bgDiff.imageUrl;
      }
    }
    if (Object.keys(bgDiff).length > 0) {
      newConfig.background = bgDiff;
    } else {
      delete newConfig.background;
    }
  }

  // 4. ExportZone diff against parent (Master + Override)
  if (parentComposition && currentExportZone) {
    const zoneDiff = computeExportZoneDiff(parentComposition.exportZone, currentExportZone);
    if (Object.keys(zoneDiff).length > 0) {
      newConfig.exportZone = zoneDiff;
    } else {
      delete newConfig.exportZone;
    }
  }

  // 5. Elements diff against parent (Master + Override)
  const updatedElements: Record<string, Partial<CanvasElement>> =
    newConfig.elements && typeof newConfig.elements === 'object' && !Array.isArray(newConfig.elements)
      ? { ...newConfig.elements }
      : {};

  if (!parentComposition) {
    for (const [key, props] of Object.entries(updatedElements)) {
      const matchingEl = normalizedElements.find(e => e.customId === key || e.id === key);
      if (matchingEl && props) {
        const newProps: Record<string, any> = { ...props };
        for (const propKey of Object.keys(props)) {
          if (propKey in matchingEl) {
            newProps[propKey] = deepClone((matchingEl as any)[propKey]);
          }
        }
        updatedElements[key] = newProps;
      }
    }
  } else if (!Array.isArray(newConfig.elements)) {
    for (const currentEl of normalizedElements) {
      const key = currentEl.customId || currentEl.id;
      const baseEl = parentComposition.elements.find(e => (e.customId || e.id) === key || e.id === currentEl.id);
      if (baseEl && key) {
        const diff = computeElementDiff(baseEl, currentEl, true);
        if (newConfig.images && key in newConfig.images) {
          if (diff.screenImageUrl) {
            if (!isSameAsset(newConfig.images[key], diff.screenImageUrl, variantItem.path)) {
              newConfig.images[key] = diff.screenImageUrl;
            }
            delete diff.screenImageUrl;
          }
          if (diff.imageUrl) {
            if (!isSameAsset(newConfig.images[key], diff.imageUrl, variantItem.path)) {
              newConfig.images[key] = diff.imageUrl;
            }
            delete diff.imageUrl;
          }
        }
        if (Object.keys(diff).length > 0) {
          updatedElements[key] = diff;
        } else {
          delete updatedElements[key];
        }
      }
    }
  }

  if (!Array.isArray(newConfig.elements)) {
    if (Object.keys(updatedElements).length > 0) {
      newConfig.elements = updatedElements;
    } else {
      delete newConfig.elements;
    }
  }

  return newConfig;
}

/**
 * Serializes current canvas state into an updated BannerOverrideConfig.
 * Only serializes fields that differ from the Master configuration.
 */
export function serializeCanvasToOverride(
  overrideItem: BundleItem,
  currentBackground: BackgroundConfig,
  currentElements: CanvasElement[],
  currentExportZone: ExportZone,
  masterConfig?: BannerMasterConfig,
  canvasWidth?: number,
  canvasHeight?: number
): BannerOverrideConfig {
  const existingConfig = (overrideItem.config || {}) as BannerOverrideConfig;
  const newConfig: BannerOverrideConfig = deepClone(existingConfig);

  if (!newConfig.name) {
    newConfig.name = overrideItem.name;
  }

  const normalizedBg = normalizeBackgroundForDiff(currentBackground);
  const normalizedElements = currentElements.map(normalizeElementForDiff);
  const parentComposition = masterConfig ? resolveComposition(masterConfig) : undefined;

  // 1. Canvas dimensions diff against master
  if (parentComposition) {
    if (canvasWidth !== undefined) {
      if (canvasWidth !== parentComposition.canvasWidth) {
        newConfig.canvasWidth = canvasWidth;
      } else {
        delete newConfig.canvasWidth;
        delete newConfig.width;
      }
    }
    if (canvasHeight !== undefined) {
      if (canvasHeight !== parentComposition.canvasHeight) {
        newConfig.canvasHeight = canvasHeight;
      } else {
        delete newConfig.canvasHeight;
        delete newConfig.height;
      }
    }
  }

  // 2. Background diff against master
  if (parentComposition) {
    const bgDiff = computeBackgroundDiff(parentComposition.background, normalizedBg);
    if (newConfig.images) {
      const bgImgKey = ['background', 'bg', 'body'].find(k => k in newConfig.images!);
      if (bgImgKey && bgDiff.imageUrl) {
        if (!isSameAsset(newConfig.images[bgImgKey], bgDiff.imageUrl, overrideItem.path)) {
          newConfig.images[bgImgKey] = bgDiff.imageUrl;
        }
        delete bgDiff.imageUrl;
      }
    }
    if (Object.keys(bgDiff).length > 0) {
      newConfig.background = bgDiff;
    } else {
      delete newConfig.background;
    }
  } else if (newConfig.background || existingConfig.background) {
    newConfig.background = deepClone(normalizedBg);
  }

  // 3. ExportZone diff against master
  if (parentComposition) {
    const zoneDiff = computeExportZoneDiff(parentComposition.exportZone, currentExportZone);
    if (Object.keys(zoneDiff).length > 0) {
      newConfig.exportZone = zoneDiff;
    } else {
      delete newConfig.exportZone;
    }
  } else if (newConfig.exportZone || existingConfig.exportZone) {
    newConfig.exportZone = deepClone(currentExportZone);
  }

  // 4. Content mapping if override had content
  if (newConfig.content) {
    const updatedContent: Record<string, string> = { ...newConfig.content };
    for (const el of currentElements) {
      if (el.type === 'text') {
        const key = el.customId || el.id;
        if (key && key in updatedContent) {
          const textVal = (el as TextElementModel).text;
          const baseEl = parentComposition?.elements.find(e => (e.customId || e.id) === key || e.id === el.id);
          if (baseEl && baseEl.type === 'text' && (baseEl as TextElementModel).text === textVal) {
            delete updatedContent[key];
          } else {
            updatedContent[key] = textVal;
          }
        }
      }
    }
    if (Object.keys(updatedContent).length > 0) {
      newConfig.content = updatedContent;
    } else {
      delete newConfig.content;
    }
  }

  // 5. Elements mapping (diff against master when masterConfig is provided)
  if (!Array.isArray(newConfig.elements)) {
    const updatedElements: Record<string, Partial<CanvasElement>> =
      newConfig.elements && typeof newConfig.elements === 'object' ? { ...newConfig.elements } : {};

    if (!parentComposition) {
      for (const [key, props] of Object.entries(updatedElements)) {
        const matchingEl = normalizedElements.find(e => e.customId === key || e.id === key);
        if (matchingEl && props) {
          const newProps: Record<string, any> = { ...props };
          for (const propKey of Object.keys(props)) {
            if (propKey in matchingEl) {
              newProps[propKey] = deepClone((matchingEl as any)[propKey]);
            }
          }
          updatedElements[key] = newProps;
        }
      }
    } else {
      for (const currentEl of normalizedElements) {
        const key = currentEl.customId || currentEl.id;
        const baseEl = parentComposition.elements.find(e => (e.customId || e.id) === key || e.id === currentEl.id);
        if (baseEl && key) {
          const ignoreText = Boolean(newConfig.content && key in newConfig.content);
          const diff = computeElementDiff(baseEl, currentEl, ignoreText);
          if (newConfig.images && key in newConfig.images) {
            if (diff.screenImageUrl) {
              if (!isSameAsset(newConfig.images[key], diff.screenImageUrl, overrideItem.path)) {
                newConfig.images[key] = diff.screenImageUrl;
              }
              delete diff.screenImageUrl;
            }
            if (diff.imageUrl) {
              if (!isSameAsset(newConfig.images[key], diff.imageUrl, overrideItem.path)) {
                newConfig.images[key] = diff.imageUrl;
              }
              delete diff.imageUrl;
            }
          }
          if (Object.keys(diff).length > 0) {
            updatedElements[key] = diff;
          } else {
            delete updatedElements[key];
          }
        }
      }
    }

    if (Object.keys(updatedElements).length > 0) {
      newConfig.elements = updatedElements;
    } else {
      delete newConfig.elements;
    }
  }

  return newConfig;
}
