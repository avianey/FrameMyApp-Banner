import {
  BackgroundConfig,
  CanvasElement,
  ExportZone,
  TextElementModel,
  ShapeElementModel,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig
} from '../types';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
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
    assetPath.startsWith('blob:') ||
    assetPath.startsWith('http://') ||
    assetPath.startsWith('https://')
  ) {
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

  // Resolve shape images inside elements
  for (const el of composition.elements) {
    if (el.type === 'shape' && (el as ShapeElementModel).imageUrl) {
      const resolved = resolveAsset((el as ShapeElementModel).imageUrl, variantPath, assetsMap);
      if (resolved) (el as ShapeElementModel).imageUrl = resolved;
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
    imageFit: 'cover'
  };

  const defaultZone: ExportZone = {
    x: 50,
    y: 40,
    width: 700,
    height: 525,
    preset: 'custom',
    ratio: 700 / 525,
    targetWidth: 1200,
    targetHeight: 900,
    lockRatio: true
  };

  // Base canvas dimensions from master or inferred from exportZone / default 800x600
  const initialExportZone = deepClone(master.exportZone ? { ...defaultZone, ...master.exportZone } : defaultZone);

  const initialCanvasW = master.canvasWidth || master.width || master.exportZone?.width || 800;
  const initialCanvasH = master.canvasHeight || master.height || master.exportZone?.height || 600;

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
