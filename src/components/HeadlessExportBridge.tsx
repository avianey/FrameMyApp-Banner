import React, { useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { buildBundleFromEntries } from '../utils/bundleIo';
import { resolveComposition } from '../utils/templateEngine';
import { captureZoneToBlob } from '../utils/batchExportRenderer';
import {
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig,
  BundleItem
} from '../types';

export interface HeadlessBundleEntry {
  path: string;
  content?: string;
  base64?: string;
  mimeType?: string;
}

export interface HeadlessBatchOptions {
  bundleName?: string;
  entries: HeadlessBundleEntry[];
  includeMaster?: boolean;
  includeOverrides?: boolean;
  includeVariants?: boolean;
  onProgress?: (info: { current: number; total: number; outputPath: string; name: string }) => void;
  onExportedItem?: (item: {
    outputPath: string;
    name: string;
    type: 'master' | 'override' | 'variant';
    dataUrl: string;
    layout: HeadlessLayoutSnapshot;
  }) => Promise<void> | void;
}

export interface HeadlessElementLayoutMetric {
  id: string;
  customId?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  computedPosition: string;
  domLeft: number;
  domTop: number;
  domWidth: number;
  domHeight: number;
}

export interface HeadlessLayoutSnapshot {
  artboardWidth: number;
  artboardHeight: number;
  targetWidth: number;
  targetHeight: number;
  elements: HeadlessElementLayoutMetric[];
}

export interface HeadlessBatchResult {
  exported: {
    outputPath: string;
    name: string;
    type: 'master' | 'override' | 'variant';
    dataUrl: string;
    layout: HeadlessLayoutSnapshot;
  }[];
  errors: {
    outputPath: string;
    name: string;
    error: string;
  }[];
}

function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function measureArtboardLayout(
  artboardEl: HTMLElement,
  resolved: {
    elements: any[];
    exportZone: { targetWidth?: number; targetHeight?: number; width?: number; height?: number };
    canvasWidth?: number;
    canvasHeight?: number;
  }
): HeadlessLayoutSnapshot {
  const artboardW = artboardEl.offsetWidth || resolved.canvasWidth || resolved.exportZone.width || 800;
  const artboardH = artboardEl.offsetHeight || resolved.canvasHeight || resolved.exportZone.height || 600;
  const elements: HeadlessElementLayoutMetric[] = resolved.elements.map(el => {
    const domNode = artboardEl.querySelector(`#el-${CSS.escape(el.id)}`) as HTMLElement | null;
    const cs = domNode ? window.getComputedStyle(domNode) : null;
    return {
      id: el.id,
      customId: el.customId,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      computedPosition: cs?.position || 'missing',
      domLeft: domNode ? parseFloat(cs?.left || '0') || domNode.offsetLeft : NaN,
      domTop: domNode ? parseFloat(cs?.top || '0') || domNode.offsetTop : NaN,
      domWidth: domNode ? domNode.offsetWidth : NaN,
      domHeight: domNode ? domNode.offsetHeight : NaN
    };
  });

  return {
    artboardWidth: artboardW,
    artboardHeight: artboardH,
    targetWidth: resolved.exportZone.targetWidth || artboardW,
    targetHeight: resolved.exportZone.targetHeight || artboardH,
    elements
  };
}

export const HeadlessExportBridge: React.FC = () => {
  const {
    artboardRef,
    applyCompositionDirectly,
    setLoadedBundle,
    pauseDiskSync
  } = useEditor();

  useEffect(() => {
    const api = {
      isReady: () => Boolean(artboardRef.current),
      runBatchExport: async (options: HeadlessBatchOptions): Promise<HeadlessBatchResult> => {
        if (!artboardRef.current) {
          throw new Error('Artboard DOM element is not ready');
        }

        pauseDiskSync();

        const bundleEntries = options.entries.map(entry => ({
          path: entry.path,
          getContent: async () => entry.content ?? '',
          getBlob: entry.base64
            ? async () => base64ToBlob(entry.base64!, entry.mimeType || 'image/png')
            : undefined
        }));

        const loadedBundle = await buildBundleFromEntries(
          bundleEntries,
          options.bundleName || 'bundle'
        );

        setLoadedBundle(loadedBundle);

        const includeMaster = Boolean(options.includeMaster);
        const includeOverrides = Boolean(options.includeOverrides);
        const includeVariants = options.includeVariants !== false;

        const queue: { item: BundleItem; outputPath: string }[] = [];

        if (includeMaster && loadedBundle.master) {
          queue.push({
            item: loadedBundle.master,
            outputPath: 'master.png'
          });
        }

        if (includeOverrides) {
          for (const [slug, item] of Object.entries(loadedBundle.overrides)) {
            queue.push({
              item,
              outputPath: `overrides/${slug}.png`
            });
          }
        }

        if (includeVariants) {
          for (const variant of loadedBundle.variants) {
            const vPath = variant.path.startsWith('variants/')
              ? variant.path.substring(9)
              : variant.path;
            const cleanVPath = vPath.replace(/\.(yml|yaml|json)$/i, '.png');
            queue.push({
              item: variant,
              outputPath: `variants/${cleanVPath}`
            });
          }
        }

        // Fallback: if variants were requested by default, but the bundle only has a master (standalone template)
        if (queue.length === 0 && loadedBundle.master) {
          queue.push({
            item: loadedBundle.master,
            outputPath: 'master.png'
          });
        }

        const exported: HeadlessBatchResult['exported'] = [];
        const errors: HeadlessBatchResult['errors'] = [];

        const masterConfig = (loadedBundle.master?.config as BannerMasterConfig) || {};

        for (let i = 0; i < queue.length; i++) {
          const { item, outputPath } = queue[i];
          if (options.onProgress) {
            options.onProgress({
              current: i + 1,
              total: queue.length,
              outputPath,
              name: item.name
            });
          }

          try {
            let resolved;
            if (item.type === 'master') {
              resolved = resolveComposition(
                item.config as BannerMasterConfig,
                undefined,
                undefined,
                loadedBundle.assets,
                item.path
              );
            } else if (item.type === 'override') {
              resolved = resolveComposition(
                masterConfig,
                item.config as BannerOverrideConfig,
                undefined,
                loadedBundle.assets,
                item.path
              );
            } else {
              const matchingOverride = loadedBundle.overrides?.[item.slug];
              resolved = resolveComposition(
                masterConfig,
                matchingOverride?.config as BannerOverrideConfig | undefined,
                item.config as BannerVariantConfig,
                loadedBundle.assets,
                item.path
              );
            }

            applyCompositionDirectly(resolved, false);

            // Wait for React to commit the new composition to DOM
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

            // Explicitly load fonts used by text elements
            if (typeof document !== 'undefined' && document.fonts) {
              const fontPromises = resolved.elements
                .filter(el => el.type === 'text' && (el as any).fontFamily)
                .map(el => {
                  const t = el as any;
                  const weight = t.fontWeight || 400;
                  const size = t.fontSize || 32;
                  return document.fonts.load(`${weight} ${size}px "${t.fontFamily}"`).catch(() => {});
                });
              await Promise.all(fontPromises);
              await document.fonts.ready;
            }

            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 120));

            const { dataUrl } = await captureZoneToBlob(artboardRef.current, resolved.exportZone);
            const layout = measureArtboardLayout(artboardRef.current, resolved);

            if (options.onExportedItem) {
              await options.onExportedItem({
                outputPath,
                name: item.name,
                type: item.type,
                dataUrl,
                layout
              });
              exported.push({
                outputPath,
                name: item.name,
                type: item.type,
                dataUrl: '',
                layout
              });
            } else {
              exported.push({
                outputPath,
                name: item.name,
                type: item.type,
                dataUrl,
                layout
              });
            }
          } catch (err: any) {
            errors.push({
              outputPath,
              name: item.name,
              error: err?.message || String(err)
            });
          }
        }

        return { exported, errors };
      }
    };

    (window as any).__FRAMEMYAPP_CLI__ = api;
    return () => {
      delete (window as any).__FRAMEMYAPP_CLI__;
    };
  }, [artboardRef, applyCompositionDirectly, setLoadedBundle, pauseDiskSync]);

  return null;
};
