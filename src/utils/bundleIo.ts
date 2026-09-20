import JSZip from 'jszip';
import {
  LoadedBundle,
  BundleItem,
  BannerMasterConfig,
  BannerOverrideConfig,
  BannerVariantConfig
} from '../types';
import { parseYaml, stringifyYaml } from './yamlHelper';

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isYamlOrJson(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext === 'yml' || ext === 'yaml' || ext === 'json';
}

function extractSlug(path: string): string {
  const filename = path.split('/').pop() || '';
  return filename.replace(/\.(yml|yaml|json)$/i, '');
}

function extractLang(path: string): string | undefined {
  // e.g. variants/fr/01_hero.yml -> fr
  // e.g. variants/feature/fr/01_promo.yml -> feature/fr
  const parts = path.split('/');
  if (parts.length >= 3 && (parts[0] === 'variants' || parts[0] === 'variant' || parts[0] === 'locales' || parts[0] === 'locale')) {
    return parts.slice(1, -1).join('/');
  }
  return undefined;
}

/**
 * Builds a LoadedBundle from an in-memory map of paths to File or string content.
 */
export async function buildBundleFromEntries(
  entries: { path: string; getContent: () => Promise<string>; getBlob?: () => Promise<Blob> }[],
  bundleName = 'frameyourapp'
): Promise<LoadedBundle> {
  let masterItem: BundleItem | null = null;
  const overrides: Record<string, BundleItem> = {};
  const variants: BundleItem[] = [];
  const assets: Record<string, string> = {};

  // Strip leading bundle folder if present (e.g. frameyourapp/master.yml -> master.yml)
  const normalizedEntries = entries.map(entry => {
    let clean = entry.path.replace(/^\/+/, '');
    const firstSlash = clean.indexOf('/');
    // If the top folder is the bundle name or frameyourapp, strip it
    if (firstSlash !== -1) {
      const topDir = clean.substring(0, firstSlash).toLowerCase();
      if (
        topDir === 'frameyourapp' ||
        topDir === bundleName.toLowerCase() ||
        topDir === 'bannerbundle'
      ) {
        clean = clean.substring(firstSlash + 1);
      }
    }
    return { ...entry, cleanPath: clean };
  });

  for (const entry of normalizedEntries) {
    const p = entry.cleanPath;
    const lower = p.toLowerCase();

    // 1. Assets
    if (
      lower.startsWith('assets/') ||
      lower.startsWith('asset/') ||
      lower.startsWith('banners/') ||
      /\.(png|jpe?g|webp|svg|gif)$/i.test(lower)
    ) {
      if (entry.getBlob) {
        const blob = await entry.getBlob();
        const objectUrl = URL.createObjectURL(blob);
        assets[p] = objectUrl;
        const filename = p.split('/').pop();
        if (filename) {
          assets[filename] = objectUrl;
        }
      }
      continue;
    }

    if (!isYamlOrJson(p)) continue;

    const raw = await entry.getContent();
    const config = parseYaml(raw);

    // 2. Master
    if (
      lower === 'master.yml' ||
      lower === 'master.yaml' ||
      lower === 'master.json' ||
      (!masterItem && (lower === 'banner_template.yml' || lower === 'banner_template.yaml'))
    ) {
      masterItem = {
        id: 'master',
        type: 'master',
        path: p,
        slug: 'master',
        name: config.name || 'Master',
        rawContent: raw,
        config: config as BannerMasterConfig
      };
      continue;
    }

    // 3. Overrides
    if (lower.startsWith('overrides/') || lower.startsWith('override/')) {
      const slug = extractSlug(p);
      overrides[slug] = {
        id: `override_${slug}`,
        type: 'override',
        path: p,
        slug,
        name: config.name || slug,
        rawContent: raw,
        config: config as BannerOverrideConfig
      };
      continue;
    }

    // 4. Variants
    if (
      lower.startsWith('variants/') ||
      lower.startsWith('variant/') ||
      lower.startsWith('locales/') ||
      lower.startsWith('locale/')
    ) {
      const slug = extractSlug(p);
      const lang = extractLang(p);
      variants.push({
        id: `variant_${lang ? lang + '_' : ''}${slug}`,
        type: 'variant',
        path: p,
        slug,
        lang,
        name: config.name || (lang ? `${lang.toUpperCase()} - ${slug}` : slug),
        rawContent: raw,
        config: config as BannerVariantConfig
      });
      continue;
    }
  }

  // Sort variants logically (by lang, then by slug)
  variants.sort((a, b) => {
    if (a.lang && b.lang && a.lang !== b.lang) {
      return a.lang.localeCompare(b.lang);
    }
    return a.slug.localeCompare(b.slug);
  });

  return {
    name: bundleName,
    master: masterItem,
    overrides,
    variants,
    assets
  };
}

/**
 * Loads a bundle from a ZIP file using JSZip.
 */
export async function readZipBundle(file: File): Promise<LoadedBundle> {
  const zip = await JSZip.loadAsync(file);
  const entries: { path: string; getContent: () => Promise<string>; getBlob: () => Promise<Blob> }[] = [];

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    entries.push({
      path: relativePath,
      getContent: () => zipEntry.async('string'),
      getBlob: () => zipEntry.async('blob')
    });
  });

  const bundleName = file.name.replace(/\.zip$/i, '');
  return buildBundleFromEntries(entries, bundleName);
}

/**
 * Loads a bundle from a FileList (e.g. from <input webkitdirectory> or Drag & Drop).
 */
export async function readFilesBundle(files: FileList | File[]): Promise<LoadedBundle> {
  const fileArray = Array.from(files);
  const entries = fileArray.map(f => {
    const path = (f as any).webkitRelativePath || f.name;
    return {
      path,
      getContent: () => f.text(),
      getBlob: async () => f
    };
  });

  // Infer bundle name from root directory if available
  let bundleName = 'frameyourapp';
  if (fileArray.length > 0 && (fileArray[0] as any).webkitRelativePath) {
    const rootDir = (fileArray[0] as any).webkitRelativePath.split('/')[0];
    if (rootDir) bundleName = rootDir;
  }

  return buildBundleFromEntries(entries, bundleName);
}

/**
 * Loads a bundle from a directory using File System Access API.
 */
export async function readDirectoryBundle(dirHandle: any): Promise<LoadedBundle> {
  const entries: { path: string; getContent: () => Promise<string>; getBlob: () => Promise<Blob> }[] = [];

  async function scanDir(handle: any, currentPath: string) {
    for await (const [name, entry] of handle.entries()) {
      const fullPath = currentPath ? `${currentPath}/${name}` : name;
      if (entry.kind === 'directory') {
        await scanDir(entry, fullPath);
      } else if (entry.kind === 'file') {
        const file = await entry.getFile();
        entries.push({
          path: fullPath,
          getContent: () => file.text(),
          getBlob: async () => file
        });
      }
    }
  }

  await scanDir(dirHandle, '');
  const bundle = await buildBundleFromEntries(entries, dirHandle.name);
  bundle.directoryHandle = dirHandle;
  saveDirectoryHandleToIdb(dirHandle);
  return bundle;
}

/**
 * Loads a single standalone template YAML or JSON.
 */
export async function readSingleTemplate(file: File): Promise<{ name: string; config: BannerMasterConfig }> {
  const raw = await file.text();
  const config = parseYaml<BannerMasterConfig>(raw);
  const name = config.name || file.name.replace(/\.(yml|yaml|json)$/i, '');
  return { name, config };
}

/**
 * Creates a ZIP Blob representing the complete bundle folder structure.
 */
export async function createBundleZip(
  bundle: LoadedBundle,
  currentMasterConfig?: BannerMasterConfig
): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(bundle.name || 'frameyourapp') || zip;

  // 1. master.yml
  const masterContent = currentMasterConfig
    ? stringifyYaml(currentMasterConfig)
    : bundle.master?.rawContent || '# Master Banner\n';
  root.file('master.yml', masterContent);

  // 2. overrides/
  const overridesFolder = root.folder('overrides');
  if (overridesFolder) {
    for (const [slug, item] of Object.entries(bundle.overrides)) {
      overridesFolder.file(`${slug}.yml`, item.rawContent);
    }
  }

  // 3. variants/
  for (const variant of bundle.variants) {
    const vPath = variant.path.startsWith('variants/') ? variant.path.substring(9) : variant.path;
    root.file(`variants/${vPath}`, variant.rawContent);
  }

  // 4. assets/
  if (Object.keys(bundle.assets).length > 0) {
    const assetsFolder = root.folder('assets');
    if (assetsFolder) {
      for (const [assetPath, assetUrl] of Object.entries(bundle.assets)) {
        // Only save relative filenames in assets/
        if (!assetPath.includes('/')) {
          try {
            const resp = await fetch(assetUrl);
            const blob = await resp.blob();
            assetsFolder.file(assetPath, blob);
          } catch (e) {
            console.warn('Could not fetch asset blob for zip:', assetPath, e);
          }
        }
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Downloads a string content as a file.
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/yaml'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a blob as a file (for ZIP or images).
 */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Recursively writes a text string to a file inside a FileSystemDirectoryHandle.
 */
export async function writeTextToDirectory(
  rootDirHandle: any,
  relativePath: string,
  content: string
): Promise<void> {
  const parts = relativePath.split('/').filter(Boolean);
  const filename = parts.pop();
  if (!filename) return;

  let currentDir = rootDirHandle;
  for (const part of parts) {
    currentDir = await currentDir.getDirectoryHandle(part, { create: true });
  }

  const fileHandle = await currentDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Checks and requests readwrite permissions on a FileSystemDirectoryHandle if needed.
 */
export async function verifyDirectoryPermission(
  dirHandle: any,
  readWrite = true
): Promise<boolean> {
  if (!dirHandle) return false;
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    if (dirHandle.queryPermission && (await dirHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if (dirHandle.requestPermission && (await dirHandle.requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (e) {
    console.warn('Could not verify directory permission:', e);
  }
  return false;
}

/**
 * Persists a FileSystemDirectoryHandle to IndexedDB so it survives page reloads.
 */
export async function saveDirectoryHandleToIdb(handle: any): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB || !handle) return;
  try {
    const req = indexedDB.open('framemyapp_banner_fs', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'root_bundle_dir');
    };
  } catch (e) {
    console.warn('Could not save handle to IndexedDB:', e);
  }
}

/**
 * Retrieves the persisted FileSystemDirectoryHandle from IndexedDB if available.
 */
export async function getDirectoryHandleFromIdb(): Promise<any> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('framemyapp_banner_fs', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('handles');
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('handles')) {
          return resolve(null);
        }
        const tx = db.transaction('handles', 'readonly');
        const getReq = tx.objectStore('handles').get('root_bundle_dir');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

