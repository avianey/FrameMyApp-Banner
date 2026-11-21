#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import { load as yamlLoad } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUNDLE_ASSETS_PREFIX = '/__bundle_assets__/';

function getEngineVersion() {
  try {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function stripBundlePrefix(entryPath, bundleName) {
  let clean = entryPath.replace(/^\/+/, '');
  const firstSlash = clean.indexOf('/');
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
  return clean;
}

function findMasterEntry(entries, bundleName) {
  const configEntries = entries
    .filter(e => typeof e.content === 'string')
    .map(e => ({ entry: e, cleanPath: stripBundlePrefix(e.path, bundleName) }));

  // 1. Standard master.yml / master.yaml / master.json
  const standardMaster = configEntries.find(({ cleanPath }) => {
    const lower = cleanPath.toLowerCase();
    return (
      lower === 'master.yml' ||
      lower === 'master.yaml' ||
      lower === 'master.json'
    );
  });
  if (standardMaster) return standardMaster.entry;

  // 2. Legacy banner_template.yml / banner_template.yaml
  const legacyMaster = configEntries.find(({ cleanPath }) => {
    const lower = cleanPath.toLowerCase();
    return lower === 'banner_template.yml' || lower === 'banner_template.yaml';
  });
  if (legacyMaster) return legacyMaster.entry;

  // 3. Fallback: root YAML/JSON file (e.g. sunrise.yml, yatzy.yml), mirroring bundleIo.ts
  const rootCandidates = configEntries.filter(({ cleanPath }) => !cleanPath.includes('/'));
  if (rootCandidates.length > 0) {
    const preferred = rootCandidates.find(({ cleanPath }) =>
      cleanPath.toLowerCase().startsWith(bundleName.toLowerCase())
    );
    return (preferred || rootCandidates[0]).entry;
  }

  return null;
}

function detectMasterVersion(entries, bundleName) {
  const masterEntry = findMasterEntry(entries, bundleName);
  if (!masterEntry || !masterEntry.content) {
    return { version: null, masterPath: null };
  }
  try {
    const parsed = yamlLoad(masterEntry.content);
    if (parsed && typeof parsed === 'object' && parsed.version !== undefined && parsed.version !== null) {
      return { version: String(parsed.version).trim(), masterPath: masterEntry.path };
    }
  } catch {
    // Ignore YAML parsing errors here; the browser engine will report them
  }
  return { version: null, masterPath: masterEntry.path };
}

function printHelp() {
  console.log(`
FrameMyApp Headless Batch Generator
===================================

Usage:
  ./generateBatchForBundle.sh --in <bundleDirPath> --out <outputDirPath> [options]

Required arguments:
  --in, -i <dir>            Path to the input FrameMyApp bundle directory
  --out, -o <dir>           Path to the output directory where generated images will be written

Optional arguments:
  --all, -a                 Export everything (master.<ext>, overrides/*.<ext>, variants/**/*.<ext>)
  --include-master          Include master.<ext> in the export
  --include-overrides       Include overrides/*.<ext> in the export
  --no-variants             Exclude variants/**/*.<ext> from the export
  --lang, -l <lang>         Filter exported variants by language (repeatable or comma-separated)
  --format, -f <fmt>        Output image format: png (default), jpg (alias jpeg), webp
  --q, --quality, -q <1-100> Image compression quality for jpg/webp (default: 92)
  --help, -h                Show this help message
`);
}

function normalizeFormat(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'png' || value === 'webp') return value;
  if (value === 'jpg' || value === 'jpeg') return 'jpg';
  return null;
}

function parseQuality(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1 || num > 100) return null;
  return Math.round(num);
}

function parseArgs(argv) {
  const args = {
    inDir: null,
    outDir: null,
    includeMaster: false,
    includeOverrides: false,
    includeVariants: true,
    langs: [],
    format: 'png',
    quality: 92,
    error: null,
    help: false
  };

  const addLangs = raw => {
    if (!raw) return;
    for (const part of String(raw).split(',')) {
      const trimmed = part.trim();
      if (trimmed) args.langs.push(trimmed);
    }
  };

  const setFormat = raw => {
    const normalized = normalizeFormat(raw);
    if (!normalized) {
      args.error = `Format invalide "${raw}". Valeurs acceptées : png, jpg, webp.`;
      return;
    }
    args.format = normalized;
  };

  const setQuality = raw => {
    const parsed = parseQuality(raw);
    if (parsed === null) {
      args.error = `Qualité invalide "${raw}". Valeur attendue : entier entre 1 et 100 (ex. --q 92).`;
      return;
    }
    args.quality = parsed;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--in' || arg === '-i') {
      args.inDir = argv[++i];
    } else if (arg.startsWith('--in=')) {
      args.inDir = arg.substring(5);
    } else if (arg === '--out' || arg === '-o') {
      args.outDir = argv[++i];
    } else if (arg.startsWith('--out=')) {
      args.outDir = arg.substring(6);
    } else if (arg === '--all' || arg === '-a') {
      args.includeMaster = true;
      args.includeOverrides = true;
      args.includeVariants = true;
    } else if (arg === '--include-master') {
      args.includeMaster = true;
    } else if (arg === '--include-overrides') {
      args.includeOverrides = true;
    } else if (arg === '--no-variants') {
      args.includeVariants = false;
    } else if (arg === '--lang' || arg === '-l') {
      addLangs(argv[++i]);
    } else if (arg.startsWith('--lang=')) {
      addLangs(arg.substring(7));
    } else if (arg === '--format' || arg === '-f') {
      setFormat(argv[++i]);
    } else if (arg.startsWith('--format=')) {
      setFormat(arg.substring(9));
    } else if (arg === '--q' || arg === '--quality' || arg === '-q') {
      setQuality(argv[++i]);
    } else if (arg.startsWith('--q=')) {
      setQuality(arg.substring(4));
    } else if (arg.startsWith('--quality=')) {
      setQuality(arg.substring(10));
    }
  }

  return args;
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function isAssetFile(filePath) {
  return /\.(png|jpe?g|webp|svg|gif)$/i.test(filePath);
}

function isConfigFile(filePath) {
  return /\.(ya?ml|json)$/i.test(filePath);
}

function encodeRelPathToUrl(relPath) {
  return BUNDLE_ASSETS_PREFIX + relPath.split('/').map(encodeURIComponent).join('/');
}

function readBundleFromDisk(bundleDir) {
  const entries = [];
  const assetFileMap = new Map();
  const activeAncestors = new Set();

  try {
    activeAncestors.add(fs.realpathSync(bundleDir));
  } catch {
    // Ignore realpath failure on root
  }

  function walk(currentDir, relPrefix) {
    const list = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const dirent of list) {
      if (dirent.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, dirent.name);
      const relPath = relPrefix ? `${relPrefix}/${dirent.name}` : dirent.name;

      let isDir = dirent.isDirectory();
      let isFile = dirent.isFile();

      if (dirent.isSymbolicLink()) {
        try {
          const stat = fs.statSync(fullPath);
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          // Broken symlink — skip gracefully
          continue;
        }
      }

      if (isDir) {
        let realDir = fullPath;
        try {
          realDir = fs.realpathSync(fullPath);
        } catch {
          continue;
        }
        if (activeAncestors.has(realDir)) continue;
        activeAncestors.add(realDir);
        try {
          walk(fullPath, relPath);
        } finally {
          activeAncestors.delete(realDir);
        }
      } else if (isFile) {
        if (isAssetFile(relPath)) {
          // Register on-demand HTTP path instead of reading binary data into base64
          assetFileMap.set(relPath, fullPath);
          entries.push({
            path: relPath,
            assetUrl: encodeRelPathToUrl(relPath),
            mimeType: getMimeType(relPath)
          });
        } else if (isConfigFile(relPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          entries.push({
            path: relPath,
            content
          });
        }
      }
    }
  }

  walk(bundleDir, '');
  return { entries, assetFileMap };
}

function createBundleAssetsVitePlugin(assetFileMap) {
  return {
    name: 'framemyapp-bundle-assets',
    configureServer(server) {
      server.middlewares.use('/__bundle_assets__', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const rawUrl = (req.url || '').split('?')[0];
        let relPath;
        try {
          relPath = decodeURIComponent(rawUrl).replace(/^\/+/, '');
        } catch {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }

        const diskPath = assetFileMap.get(relPath);
        if (!diskPath) {
          res.statusCode = 404;
          res.end('Asset not found');
          return;
        }

        try {
          const stat = fs.statSync(diskPath);
          res.statusCode = 200;
          res.setHeader('Content-Type', getMimeType(relPath));
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Cache-Control', 'private, max-age=300');
          if (req.method === 'HEAD') {
            res.end();
            return;
          }
          const stream = fs.createReadStream(diskPath);
          stream.on('error', () => {
            if (!res.headersSent) res.statusCode = 500;
            res.end();
          });
          stream.pipe(res);
        } catch {
          res.statusCode = 404;
          res.end('Asset not found');
        }
      });
    }
  };
}

async function launchBrowser() {
  // 1. Try Playwright (chromium)
  try {
    const pw = await import('playwright');
    const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    const browser = await pw.chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    });
    return { type: 'playwright', browser };
  } catch (err) {
    // Fallback to puppeteer if installed
    try {
      const pptr = await import('puppeteer');
      const executablePath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
      const browser = await pptr.default.launch({
        headless: 'new',
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
      });
      return { type: 'puppeteer', browser };
    } catch {
      throw new Error(
        `Impossible de démarrer un navigateur headless (Playwright).\n` +
        `Assurez-vous que 'playwright' est installé et que Chromium est disponible (npx playwright install chromium).\n` +
        `Détail : ${err?.message || err}`
      );
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.error) {
    console.error(`❌ Erreur : ${args.error}`);
    printHelp();
    process.exit(1);
  }

  if (!args.inDir || !args.outDir) {
    console.error('❌ Erreur : Les arguments --in <bundleDirPath> et --out <outputDirPath> sont obligatoires.');
    printHelp();
    process.exit(1);
  }

  const inDirAbs = path.resolve(process.cwd(), args.inDir);
  const outDirAbs = path.resolve(process.cwd(), args.outDir);

  if (!fs.existsSync(inDirAbs) || !fs.statSync(inDirAbs).isDirectory()) {
    console.error(`❌ Erreur : Le dossier d'entrée n'existe pas ou n'est pas un répertoire : ${inDirAbs}`);
    process.exit(1);
  }

  const engineVersion = getEngineVersion();
  const bundleName = path.basename(inDirAbs);
  console.log(`📦 Lecture du bundle FrameMyApp : ${inDirAbs} (moteur v${engineVersion})`);
  const { entries, assetFileMap } = readBundleFromDisk(inDirAbs);

  if (entries.length === 0) {
    console.error(`❌ Erreur : Aucun fichier YAML/JSON ou asset trouvé dans ${inDirAbs}`);
    process.exit(1);
  }

  const { version: masterVersion, masterPath } = detectMasterVersion(entries, bundleName);
  const masterLabel = masterPath || 'master.yml';
  if (masterVersion) {
    console.log(`   → Version référencée dans ${masterLabel} : ${masterVersion}`);
    if (engineVersion !== 'unknown' && masterVersion !== engineVersion) {
      console.warn(
        `⚠️  Avertissement de version : ${masterLabel} a été construit avec FrameMyApp ${masterVersion}, ` +
          `mais le moteur headless exécuté est en ${engineVersion}. ` +
          `Pour un rendu strictement identique, invoquez le moteur sur le tag Git "${masterVersion}".`
      );
    }
  } else {
    console.warn(
      `⚠️  Aucune version référencée dans ${masterLabel} (champ "version" absent). Exécution avec le moteur ${engineVersion}.`
    );
  }

  const configCount = entries.length - assetFileMap.size;
  console.log(
    `   → ${configCount} fichier(s) YAML/JSON chargé(s) + ${assetFileMap.size} asset(s) indexé(s) pour diffusion HTTP à la demande.`
  );
  console.log(
    args.format === 'png'
      ? `   → Format de sortie : PNG (sans perte)`
      : `   → Format de sortie : ${args.format.toUpperCase()} (qualité ${args.quality}%)`
  );
  if (args.langs.length > 0) {
    console.log(`   → Filtre de langue actif (--lang) : ${args.langs.join(', ')}`);
  }

  // Ensure working directory is PROJECT_ROOT so Vite, PostCSS and Tailwind resolve configs and sources accurately
  process.chdir(PROJECT_ROOT);

  // Start Vite server programmatically on an ephemeral port with local HTTP streaming for bundle assets
  console.log('🚀 Démarrage du serveur de rendu FrameMyApp...');
  const viteServer = await createServer({
    root: PROJECT_ROOT,
    configFile: path.join(PROJECT_ROOT, 'vite.config.ts'),
    plugins: [createBundleAssetsVitePlugin(assetFileMap)],
    logLevel: 'error',
    server: {
      port: 0,
      open: false,
      host: '127.0.0.1'
    }
  });

  await viteServer.listen();
  const address = viteServer.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 3000;
  const serverUrl = `http://127.0.0.1:${port}/?headless=1`;

  let browserInstance = null;

  try {
    console.log(`🌐 Ouverture du navigateur headless sur ${serverUrl}...`);
    const { browser } = await launchBrowser();
    browserInstance = browser;

    const page = await browser.newPage();
    await page.setViewportSize?.({ width: 1920, height: 1080 }) ||
      (await page.setViewport?.({ width: 1920, height: 1080 }));

    page.on('pageerror', err => {
      console.error('[Browser PageError]', err.message || err);
    });

    await page.goto(serverUrl, { waitUntil: 'networkidle' });

    // Wait for __FRAMEMYAPP_CLI__ bridge to be mounted and ready
    await page.waitForFunction(
      () => Boolean(window.__FRAMEMYAPP_CLI__ && window.__FRAMEMYAPP_CLI__.isReady()),
      { timeout: 30000 }
    );

    fs.mkdirSync(outDirAbs, { recursive: true });
    let writtenCount = 0;

    await page.exposeFunction('__onFrameMyAppCliProgress', info => {
      console.log(`   [${info.current}/${info.total}] Rendu de ${info.outputPath} (${info.name})...`);
    });

    await page.exposeFunction('__onFrameMyAppCliExportedItem', item => {
      const targetFile = path.join(outDirAbs, item.outputPath);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      const base64Data = item.dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
      fs.writeFileSync(targetFile, Buffer.from(base64Data, 'base64'));
      writtenCount++;
    });

    console.log('🎨 Exécution du rendu Batch Export...');
    const result = await page.evaluate(
      async payload => {
        return await window.__FRAMEMYAPP_CLI__.runBatchExport({
          ...payload,
          onProgress: info => {
            if (typeof window.__onFrameMyAppCliProgress === 'function') {
              window.__onFrameMyAppCliProgress(info);
            }
          },
          onExportedItem: async item => {
            if (typeof window.__onFrameMyAppCliExportedItem === 'function') {
              await window.__onFrameMyAppCliExportedItem(item);
            }
          }
        });
      },
      {
        bundleName,
        entries,
        includeMaster: args.includeMaster,
        includeOverrides: args.includeOverrides,
        includeVariants: args.includeVariants,
        langs: args.langs,
        format: args.format,
        quality: args.quality
      }
    );

    // Fallback if any item had dataUrl returned directly
    for (const item of result.exported || []) {
      if (!item.dataUrl) continue;
      const targetFile = path.join(outDirAbs, item.outputPath);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      const base64Data = item.dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
      fs.writeFileSync(targetFile, Buffer.from(base64Data, 'base64'));
      writtenCount++;
    }

    if (result.errors && result.errors.length > 0) {
      console.error(`⚠️ ${result.errors.length} erreur(s) lors du rendu :`);
      for (const err of result.errors) {
        console.error(`   - ${err.outputPath} (${err.name}) : ${err.error}`);
      }
      process.exitCode = 1;
    }

    console.log(`✅ Export terminé : ${writtenCount} asset(s) généré(s) dans ${outDirAbs}`);
  } finally {
    if (browserInstance) {
      await browserInstance.close().catch(() => {});
    }
    await viteServer.close().catch(() => {});
  }
}

main().catch(err => {
  console.error('❌ Échec critique du Batch Export CLI :', err.message || err);
  process.exit(1);
});
