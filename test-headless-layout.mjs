import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function readBundleFromDisk(bundleDir) {
  const entries = [];
  function walk(currentDir, relPrefix) {
    for (const dirent of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (dirent.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, dirent.name);
      const relPath = relPrefix ? `${relPrefix}/${dirent.name}` : dirent.name;
      if (dirent.isDirectory()) {
        walk(fullPath, relPath);
      } else if (dirent.isFile()) {
        if (/\.(png|jpe?g|webp|svg|gif)$/i.test(relPath)) {
          const buffer = fs.readFileSync(fullPath);
          entries.push({
            path: relPath,
            base64: buffer.toString('base64'),
            mimeType: getMimeType(relPath)
          });
        } else if (/\.(ya?ml|json)$/i.test(relPath)) {
          entries.push({
            path: relPath,
            content: fs.readFileSync(fullPath, 'utf-8')
          });
        }
      }
    }
  }
  walk(bundleDir, '');
  return entries;
}

function readPngDimensions(base64DataUrl) {
  const rawBase64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(rawBase64, 'base64');
  // PNG signature is 8 bytes, followed by IHDR chunk (4 bytes length, 4 bytes 'IHDR', 4 bytes width, 4 bytes height)
  assert.strictEqual(buf.toString('ascii', 1, 4), 'PNG', 'Output must be a valid PNG buffer');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

async function runHeadlessTest() {
  console.log('Testing Headless Browser Rendering & DOM Layout Geometry...');

  // Simulate calling from an external directory (/tmp) to guard against process.cwd() Tailwind/PostCSS bugs
  const originalCwd = process.cwd();
  process.chdir(os.tmpdir());

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

  const pw = await import('playwright');
  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(serverUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Boolean(window.__FRAMEMYAPP_CLI__ && window.__FRAMEMYAPP_CLI__.isReady()),
      { timeout: 30000 }
    );

    // 1. Test fixture bundle (1024x500 banner with 6 dice shapes + title + subtitle)
    const fixtureDir = path.join(PROJECT_ROOT, 'tests', 'fixtures', 'layout-bundle');
    const fixtureEntries = readBundleFromDisk(fixtureDir);

    const result = await page.evaluate(
      async payload => window.__FRAMEMYAPP_CLI__.runBatchExport(payload),
      {
        bundleName: 'layout-bundle',
        entries: fixtureEntries,
        includeMaster: true,
        includeOverrides: false,
        includeVariants: true
      }
    );

    assert.strictEqual(result.errors.length, 0, `Expected 0 errors, got: ${JSON.stringify(result.errors)}`);
    assert.strictEqual(result.exported.length, 2, 'Should export master.png and variants/da/00_blue.png');

    for (const item of result.exported) {
      const pngDims = readPngDimensions(item.dataUrl);
      assert.strictEqual(pngDims.width, 1024, `${item.outputPath} PNG width must be 1024`);
      assert.strictEqual(pngDims.height, 500, `${item.outputPath} PNG height must be 500`);

      const { layout } = item;
      assert.strictEqual(layout.artboardWidth, 1024, `${item.outputPath} artboard DOM width must be 1024`);
      assert.strictEqual(layout.artboardHeight, 500, `${item.outputPath} artboard DOM height must be 500`);

      for (const el of layout.elements) {
        assert.strictEqual(
          el.computedPosition,
          'absolute',
          `Element ${el.customId || el.id} must have computed position: absolute in DOM`
        );
        assert.strictEqual(el.domLeft, el.x, `Element ${el.customId} DOM left (${el.domLeft}) must equal x (${el.x})`);
        assert.strictEqual(el.domTop, el.y, `Element ${el.customId} DOM top (${el.domTop}) must equal y (${el.y})`);
        assert.strictEqual(el.domWidth, el.width, `Element ${el.customId} DOM width (${el.domWidth}) must equal width (${el.width})`);
        if (el.type === 'shape' || el.type === 'device') {
          assert.strictEqual(el.domHeight, el.height, `Element ${el.customId} DOM height (${el.domHeight}) must equal height (${el.height})`);
        } else {
          assert.ok(el.domHeight >= el.height, `Text element ${el.customId} DOM height (${el.domHeight}) must be >= ${el.height}`);
        }
      }

      // Check DOM pairwise distances for the dice row
      const diceIds = ['hero_badge', 'shape_3', 'shape_4', 'shape_5', 'shape_2', 'shape_6'];
      const expectedGaps = [4, 5, 5, 5, 4];
      const domDice = diceIds.map(cid => layout.elements.find(e => e.customId === cid));
      for (let i = 0; i < domDice.length - 1; i++) {
        const gap = domDice[i + 1].domLeft - (domDice[i].domLeft + domDice[i].domWidth);
        assert.strictEqual(gap, expectedGaps[i], `DOM gap between dice ${i} and ${i + 1} must be ${expectedGaps[i]}px`);
        assert.strictEqual(domDice[i].domTop, 219, `DOM top of die ${i} must be 219px`);
      }
    }
    console.log('✔ Fixture bundle (1024x500) DOM positions, distances, widths/heights & PNG dimensions verified');

    // 2. If Yatzy bundles exist on disk, verify them in headless browser as well
    const yatzyScreensDir = '/home/avianey/workspace/Yatzy/Yatzy/framemyapp/screens';
    if (fs.existsSync(yatzyScreensDir)) {
      const screenEntries = readBundleFromDisk(yatzyScreensDir);
      // Filter to master + 1 variant to keep test fast
      const filteredEntries = screenEntries.filter(
        e =>
          e.path === 'yatzy.yml' ||
          e.path === 'assets/bg_blue.jpeg' ||
          e.path === 'variants/da/01_high_scores.yml' ||
          e.path === 'assets/da-DK/01_high_scores_da-DK.png'
      );
      const screenRes = await page.evaluate(
        async payload => window.__FRAMEMYAPP_CLI__.runBatchExport(payload),
        {
          bundleName: 'screens',
          entries: filteredEntries,
          includeMaster: false,
          includeOverrides: false,
          includeVariants: true
        }
      );
      assert.strictEqual(screenRes.errors.length, 0, 'Yatzy screens export should have 0 errors');
      assert.strictEqual(screenRes.exported.length, 1);
      const exportedScreen = screenRes.exported[0];
      const pngDims = readPngDimensions(exportedScreen.dataUrl);
      assert.strictEqual(pngDims.width, 1408, 'Yatzy screen PNG width must be 1408');
      assert.strictEqual(pngDims.height, 2952, 'Yatzy screen PNG height must be 2952');
      assert.strictEqual(exportedScreen.layout.artboardWidth, 1408, 'Yatzy screen artboard DOM width must be 1408');
      assert.strictEqual(exportedScreen.layout.artboardHeight, 2952, 'Yatzy screen artboard DOM height must be 2952 (not 600!)');

      const devMetric = exportedScreen.layout.elements.find(e => e.customId === 'app_screen');
      assert.ok(devMetric, 'Device app_screen must be present');
      assert.strictEqual(devMetric.computedPosition, 'absolute');
      assert.strictEqual(devMetric.domLeft, 204);
      assert.strictEqual(devMetric.domTop, 731);
      assert.strictEqual(devMetric.domWidth, 1001);
      assert.strictEqual(devMetric.domHeight, 2122);
      console.log('✔ Yatzy screens bundle (1408x2952) DOM layout & PNG dimensions verified');
    }

    const yatzyBannersDir = '/home/avianey/workspace/Yatzy/Yatzy/framemyapp/banners';
    if (fs.existsSync(yatzyBannersDir)) {
      const bannerEntries = readBundleFromDisk(yatzyBannersDir).filter(
        e =>
          e.path === 'yatzy.yml' ||
          e.path.startsWith('assets/') ||
          e.path === 'variants/da/00_blue.yml'
      );
      const bannerRes = await page.evaluate(
        async payload => window.__FRAMEMYAPP_CLI__.runBatchExport(payload),
        {
          bundleName: 'banners',
          entries: bannerEntries,
          includeMaster: false,
          includeOverrides: false,
          includeVariants: true
        }
      );
      assert.strictEqual(bannerRes.errors.length, 0, 'Yatzy banners export should have 0 errors');
      assert.strictEqual(bannerRes.exported.length, 1);
      const exportedBanner = bannerRes.exported[0];
      const pngDims = readPngDimensions(exportedBanner.dataUrl);
      assert.strictEqual(pngDims.width, 1024, 'Yatzy banner PNG width must be 1024');
      assert.strictEqual(pngDims.height, 500, 'Yatzy banner PNG height must be 500');
      assert.strictEqual(exportedBanner.layout.artboardWidth, 1024);
      assert.strictEqual(exportedBanner.layout.artboardHeight, 500);
      for (const el of exportedBanner.layout.elements) {
        assert.strictEqual(el.computedPosition, 'absolute');
        assert.strictEqual(el.domLeft, el.x);
        assert.strictEqual(el.domTop, el.y);
      }
      console.log('✔ Yatzy banners bundle (1024x500) DOM layout & PNG dimensions verified');
    }

    console.log('\nAll Headless Layout & Export tests passed successfully!');
  } finally {
    process.chdir(originalCwd);
    await browser.close().catch(() => {});
    await viteServer.close().catch(() => {});
  }
}

runHeadlessTest().catch(err => {
  console.error('❌ Headless layout test failed:', err);
  process.exit(1);
});
