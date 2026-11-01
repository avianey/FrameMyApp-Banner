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
}

export interface HeadlessBatchResult {
  exported: {
    outputPath: string;
    name: string;
    type: 'master' | 'override' | 'variant';
    dataUrl: string;
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

            if (typeof document !== 'undefined' && document.fonts) {
              await document.fonts.ready;
            }
            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => setTimeout(r, 120));

            const { dataUrl } = await captureZoneToBlob(artboardRef.current, resolved.exportZone);

            exported.push({
              outputPath,
              name: item.name,
              type: item.type,
              dataUrl
            });
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
