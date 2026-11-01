#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`
FrameMyApp Headless Batch Generator
===================================

Usage:
  ./generateBatchForBundle.sh --in <bundleDirPath> --out <outputDirPath> [options]

Required arguments:
  --in, -i <dir>          Path to the input FrameMyApp bundle directory
  --out, -o <dir>         Path to the output directory where generated PNGs will be written

Optional arguments:
  --all, -a               Export everything (master.png, overrides/*.png, variants/**/*.png)
  --include-master        Include master.png in the export
  --include-overrides     Include overrides/*.png in the export
  --no-variants           Exclude variants/**/*.png from the export
  --help, -h              Show this help message
`);
}

function parseArgs(argv) {
  const args = {
    inDir: null,
    outDir: null,
    includeMaster: false,
    includeOverrides: false,
    includeVariants: true,
    help: false
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

function readBundleFromDisk(bundleDir) {
  const entries = [];

  function walk(currentDir, relPrefix) {
    const list = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const dirent of list) {
      if (dirent.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, dirent.name);
      const relPath = relPrefix ? `${relPrefix}/${dirent.name}` : dirent.name;

      if (dirent.isDirectory()) {
        walk(fullPath, relPath);
      } else if (dirent.isFile()) {
        if (isAssetFile(relPath)) {
          const buffer = fs.readFileSync(fullPath);
          entries.push({
            path: relPath,
            base64: buffer.toString('base64'),
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
  return entries;
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

  const bundleName = path.basename(inDirAbs);
  console.log(`📦 Lecture du bundle FrameMyApp : ${inDirAbs}`);
  const entries = readBundleFromDisk(inDirAbs);

  if (entries.length === 0) {
    console.error(`❌ Erreur : Aucun fichier YAML/JSON ou asset trouvé dans ${inDirAbs}`);
    process.exit(1);
  }

  console.log(`   → ${entries.length} fichier(s) chargé(s) depuis le bundle.`);

  // Start Vite server programmatically on an ephemeral port
  console.log('🚀 Démarrage du serveur de rendu FrameMyApp...');
  const viteServer = await createServer({
    root: PROJECT_ROOT,
    configFile: path.join(PROJECT_ROOT, 'vite.config.ts'),
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

    await page.exposeFunction('__onFrameMyAppCliProgress', info => {
      console.log(`   [${info.current}/${info.total}] Rendu de ${info.outputPath} (${info.name})...`);
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
          }
        });
      },
      {
        bundleName,
        entries,
        includeMaster: args.includeMaster,
        includeOverrides: args.includeOverrides,
        includeVariants: args.includeVariants
      }
    );

    // Write generated PNGs to output directory
    fs.mkdirSync(outDirAbs, { recursive: true });

    let writtenCount = 0;
    for (const item of result.exported || []) {
      const targetFile = path.join(outDirAbs, item.outputPath);
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      const base64Data = item.dataUrl.replace(/^data:image\/\w+;base64,/, '');
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
