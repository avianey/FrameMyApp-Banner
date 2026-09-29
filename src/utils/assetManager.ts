import { writeBlobToDirectory } from './bundleIo';

export function sanitizeAssetFilename(name: string, fallback = 'image.png'): string {
  const parts = name.split('/');
  const base = parts.pop() || fallback;
  const dotIndex = base.lastIndexOf('.');
  const ext = dotIndex !== -1 ? base.substring(dotIndex).toLowerCase() : '.png';
  const rawName = dotIndex !== -1 ? base.substring(0, dotIndex) : base;
  const cleanName =
    rawName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'image';
  return `${cleanName}${ext}`;
}

export function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  try {
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const base64Data = dataUrl.split(',')[1] || '';
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return { blob: new Blob([ab], { type: mime }), ext };
  } catch {
    return { blob: new Blob([]), ext: 'png' };
  }
}

export interface AssetEntry {
  assetPath: string; // e.g. "assets/screenshot.png"
  blob: Blob | File;
  url: string; // displayable URL (blob: or data:)
}

class AssetManager {
  private assets = new Map<string, AssetEntry>();
  private urlToPath = new Map<string, string>();

  /**
   * Registers a binary file or blob as an asset.
   * Returns its clean relative path ("assets/filename.ext") and display URL.
   */
  registerAsset(filename: string, blobOrFile: Blob | File): { assetPath: string; displayUrl: string } {
    const cleanFilename = sanitizeAssetFilename(filename);
    const assetPath = `assets/${cleanFilename}`;
    const displayUrl = URL.createObjectURL(blobOrFile);

    const entry: AssetEntry = {
      assetPath,
      blob: blobOrFile,
      url: displayUrl
    };

    this.assets.set(assetPath, entry);
    this.assets.set(cleanFilename, entry);
    this.urlToPath.set(displayUrl, assetPath);

    return { assetPath, displayUrl };
  }

  /**
   * Registers an already existing asset from disk or bundle (with existing objectUrl).
   */
  registerExistingAsset(assetPath: string, blob: Blob | File, objectUrl: string) {
    const cleanPath = assetPath.startsWith('assets/') ? assetPath : `assets/${assetPath}`;
    const filename = cleanPath.split('/').pop() || cleanPath;

    const entry: AssetEntry = {
      assetPath: cleanPath,
      blob,
      url: objectUrl
    };

    this.assets.set(cleanPath, entry);
    this.assets.set(filename, entry);
    this.urlToPath.set(objectUrl, cleanPath);
  }

  /**
   * Associates an existing URL (e.g. data URL or external URL) to a relative asset path.
   */
  registerUrlMapping(url: string, assetPath: string) {
    const cleanPath = assetPath.startsWith('assets/') ? assetPath : `assets/${assetPath}`;
    this.urlToPath.set(url, cleanPath);
  }

  getAssetPathFromUrl(url: string | undefined): string | undefined {
    if (!url) return undefined;
    return this.urlToPath.get(url);
  }

  getDisplayUrl(assetPath: string | undefined): string | undefined {
    if (!assetPath) return undefined;
    const cleanPath = assetPath.startsWith('assets/') ? assetPath : `assets/${assetPath}`;
    const filename = cleanPath.split('/').pop() || cleanPath;
    const entry = this.assets.get(cleanPath) || this.assets.get(filename);
    if (entry) return entry.url;
    return undefined;
  }

  getAllAssets(): Map<string, AssetEntry> {
    return this.assets;
  }

  /**
   * Writes all tracked assets into the given FileSystemDirectoryHandle under assets/...
   */
  async saveAllToDirectory(dirHandle: any): Promise<void> {
    if (!dirHandle) return;
    for (const [key, entry] of this.assets.entries()) {
      if (key.startsWith('assets/')) {
        try {
          await writeBlobToDirectory(dirHandle, entry.assetPath, entry.blob);
        } catch (e) {
          console.warn(`Could not save asset ${entry.assetPath} to directory:`, e);
        }
      }
    }
  }
}

export const assetManager = new AssetManager();

/**
 * Replaces live object URLs and Base64 data URLs with clean relative paths (assets/...)
 * before serializing to YAML. If a base64 string is found, it is automatically converted
 * to a Blob and registered in assetManager so it can be written to disk.
 * Guarantees that no raw blob: URLs leak into the saved YAML.
 */
export function convertUrlsToRelativeAssetPaths<T extends Record<string, any>>(
  obj: T,
  bundleAssets?: Record<string, string>
): T {
  const cloned = JSON.parse(JSON.stringify(obj)) as T;

  const sanitizeUrl = (url: string | undefined, defaultPrefix: string): string | undefined => {
    if (!url) return url;

    // 1. If already a clean relative path
    if (!url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('http://') && !url.startsWith('https://')) {
      return url.startsWith('assets/') ? url : `assets/${url}`;
    }

    // 2. Check if registered in assetManager
    const registeredPath = assetManager.getAssetPathFromUrl(url);
    if (registeredPath) {
      return registeredPath;
    }

    // 3. Check reverse lookup in bundleAssets
    if (bundleAssets) {
      for (const [assetKey, assetVal] of Object.entries(bundleAssets)) {
        if (assetVal === url) {
          const clean = assetKey.startsWith('assets/') ? assetKey : `assets/${assetKey}`;
          assetManager.registerUrlMapping(url, clean);
          return clean;
        }
      }
    }

    // 4. Check reverse lookup in assetManager.getAllAssets()
    for (const [assetKey, entry] of assetManager.getAllAssets().entries()) {
      if (entry.url === url) {
        const clean = assetKey.startsWith('assets/') ? assetKey : `assets/${assetKey}`;
        assetManager.registerUrlMapping(url, clean);
        return clean;
      }
    }

    // 5. If base64 data URL, convert to Blob and register
    if (url.startsWith('data:image/')) {
      const { blob, ext } = dataUrlToBlob(url);
      const filename = `${defaultPrefix}.${ext}`;
      const { assetPath } = assetManager.registerAsset(filename, blob);
      assetManager.registerUrlMapping(url, assetPath);
      return assetPath;
    }

    // 6. If it's a blob: URL that wasn't found in mappings:
    // Match against any existing asset in bundleAssets or assetManager matching prefix
    if (url.startsWith('blob:')) {
      if (bundleAssets) {
        for (const assetKey of Object.keys(bundleAssets)) {
          if (assetKey.toLowerCase().includes(defaultPrefix.toLowerCase()) || assetKey.toLowerCase().includes('bg') || assetKey.toLowerCase().includes('background')) {
            const clean = assetKey.startsWith('assets/') ? assetKey : `assets/${assetKey}`;
            assetManager.registerUrlMapping(url, clean);
            return clean;
          }
        }
      }

      for (const assetKey of assetManager.getAllAssets().keys()) {
        if (assetKey.toLowerCase().includes(defaultPrefix.toLowerCase()) || assetKey.toLowerCase().includes('bg') || assetKey.toLowerCase().includes('background')) {
          const clean = assetKey.startsWith('assets/') ? assetKey : `assets/${assetKey}`;
          assetManager.registerUrlMapping(url, clean);
          return clean;
        }
      }

      // Safe fallback to prevent raw blob: in YAML
      const fallbackPath = `assets/${defaultPrefix}.png`;
      assetManager.registerUrlMapping(url, fallbackPath);
      return fallbackPath;
    }

    return url;
  };

  // Convert background
  if (cloned.background && cloned.background.imageUrl) {
    cloned.background.imageUrl = sanitizeUrl(cloned.background.imageUrl, 'background');
  }

  // Convert images dictionary if present (in overrides/variants)
  if (cloned.images && typeof cloned.images === 'object') {
    for (const [key, val] of Object.entries(cloned.images)) {
      if (typeof val === 'string') {
        cloned.images[key] = sanitizeUrl(val, key);
      }
    }
  }

  // Convert elements
  if (Array.isArray(cloned.elements)) {
    cloned.elements = cloned.elements.map((el: any) => {
      const prefix = el.customId || `${el.type}_${el.id}`;
      if (el.type === 'device' && el.screenImageUrl) {
        return {
          ...el,
          screenImageUrl: sanitizeUrl(el.screenImageUrl, `screen_${prefix}`)
        };
      }
      if (el.type === 'shape' && el.imageUrl) {
        return {
          ...el,
          imageUrl: sanitizeUrl(el.imageUrl, `texture_${prefix}`)
        };
      }
      return el;
    });
  }

  return cloned;
}
