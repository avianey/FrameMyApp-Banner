import assert from 'assert';
import { parseYaml, stringifyYaml } from './src/utils/yamlHelper.ts';
import {
  serializeCanvasToMaster,
  serializeCanvasToVariant,
  serializeCanvasToOverride,
  resolveComposition,
  resolveAsset
} from './src/utils/templateEngine.ts';
import { alignElements, distributeElements } from './src/utils/alignment.ts';
import { assetManager, convertUrlsToRelativeAssetPaths } from './src/utils/assetManager.ts';

console.log('Testing Template Engine & YAML round-tripping...');

// 1. Fixture test bundle
const testMasterConfig = {
  name: 'Test Master Banner',
  version: '1.0',
  exportZone: {
    preset: 'banner',
    x: 50,
    y: 40,
    width: 700,
    height: 520,
    targetWidth: 1200,
    targetHeight: 900,
    ratio: 700 / 520,
    lockRatio: true
  },
  background: {
    type: 'linear',
    solidColor: 'rgba(79, 70, 229, 1)',
    color1: 'rgba(30, 27, 75, 1)',
    color2: 'rgba(79, 70, 229, 0.95)',
    angle: 135
  },
  elements: [
    {
      id: 'txt-title',
      customId: 'main_title',
      type: 'text',
      text: 'Original Master Title',
      x: 100,
      y: 170,
      width: 580,
      height: 120,
      rotation: 0,
      fontFamily: 'Space Grotesk',
      fontWeight: 700,
      fontSize: 46,
      color: 'rgba(255, 255, 255, 1)'
    },
    {
      id: 'shape-badge',
      customId: 'promo_badge',
      type: 'shape',
      shapeType: 'pill',
      x: 100,
      y: 100,
      width: 170,
      height: 44,
      fillType: 'linear',
      color1: 'rgba(244, 63, 94, 1)',
      color2: 'rgba(236, 72, 153, 1)'
    }
  ]
};

// 2. YAML parsing and dumping
const rawMasterYaml = stringifyYaml(testMasterConfig);
const parsedMaster = parseYaml(rawMasterYaml);
assert.strictEqual(parsedMaster.name, 'Test Master Banner');
assert.ok(Array.isArray(parsedMaster.elements), 'Elements should be an array');
assert.strictEqual(parsedMaster.elements.length, 2);
console.log('✔ YAML parsing & dumping verified');

// 3. Cascade resolution: Master only
const baseComp = resolveComposition(parsedMaster);
assert.strictEqual(baseComp.elements.length, 2);
const mainTitle = baseComp.elements.find(e => e.customId === 'main_title');
assert.ok(mainTitle, 'main_title should exist');
assert.strictEqual(mainTitle.text, 'Original Master Title');
assert.strictEqual(mainTitle.fontWeight, 700, 'main_title fontWeight should be preserved');
assert.strictEqual(baseComp.exportZone.lockRatio, true, 'exportZone lockRatio should be preserved');
console.log('✔ Master composition resolved');

// 4. Cascade resolution: Master + Override (01_flash_sale)
const testOverride = {
  name: 'Flash Sale Override',
  background: {
    color1: 'rgba(67, 20, 7, 1)'
  },
  elements: {
    main_title: {
      fontWeight: 300
    },
    promo_badge: {
      color1: 'rgba(239, 68, 68, 1)'
    }
  }
};
const overrideComp = resolveComposition(parsedMaster, testOverride);
assert.strictEqual(overrideComp.background.color1, 'rgba(67, 20, 7, 1)', 'Background should be overridden');
assert.strictEqual(overrideComp.elements.find(e => e.customId === 'main_title').fontWeight, 300, 'main_title fontWeight should be overridden');
const overriddenBadge = overrideComp.elements.find(e => e.customId === 'promo_badge');
assert.strictEqual(overriddenBadge.color1, 'rgba(239, 68, 68, 1)');
console.log('✔ Override merged into Master');

// 5. Cascade resolution: Master + Override + Variant (FR)
const testVariantFr = {
  name: '01 — Vente Flash (FR)',
  content: {
    main_title: 'Jusqu’à -50% ce week-end'
  }
};
const fullCompFr = resolveComposition(parsedMaster, testOverride, testVariantFr);
const frTitle = fullCompFr.elements.find(e => e.customId === 'main_title');
assert.strictEqual(frTitle.text, 'Jusqu’à -50% ce week-end', 'French variant text applied');
assert.strictEqual(fullCompFr.background.color1, 'rgba(67, 20, 7, 1)', 'Inherited override background');
console.log('✔ French Variant correctly cascaded (Master + Override + Variant)');

// 6. Cascade resolution: Master + Override + Variant (EN)
const testVariantEn = {
  name: '01 — Flash Sale (EN)',
  content: {
    main_title: 'Up to 50% off this weekend'
  }
};
const fullCompEn = resolveComposition(parsedMaster, testOverride, testVariantEn);
const enTitle = fullCompEn.elements.find(e => e.customId === 'main_title');
assert.strictEqual(enTitle.text, 'Up to 50% off this weekend', 'English variant text applied');
console.log('✔ English Variant correctly cascaded (Master + Override + Variant)');

// 7. Asset Resolution
const assetsMap = {
  'assets/fr/banner.png': 'blob:fr-banner',
  'assets/banner.png': 'blob:root-banner'
};
const resolvedSub = resolveAsset('banner.png', 'variants/fr/01_promo.yml', assetsMap);
assert.strictEqual(resolvedSub, 'blob:fr-banner', 'Should resolve subpath first');
const resolvedRoot = resolveAsset('banner.png', 'variants/es/01_promo.yml', assetsMap);
assert.strictEqual(resolvedRoot, 'blob:root-banner', 'Should fallback to root assets');
console.log('✔ Asset resolution rules compliant with BUNDLE_BLUEPRINT.md');

// 8. Alignment and Uniform Distribution tests
const testElements = [
  { id: 'el-1', type: 'text', x: 100, y: 50, width: 150, height: 40, rotation: 0 },
  { id: 'el-2', type: 'shape', x: 300, y: 120, width: 200, height: 80, rotation: 0 },
  { id: 'el-3', type: 'shape', x: 550, y: 250, width: 100, height: 60, rotation: 0 }
];

// Test Align Left to First
const alignedLeftFirst = alignElements(testElements, ['el-1', 'el-2'], 'left', 'first', { width: 800, height: 600 });
assert.strictEqual(alignedLeftFirst.find(e => e.id === 'el-1').x, 100);
assert.strictEqual(alignedLeftFirst.find(e => e.id === 'el-2').x, 100, 'el-2 should align left to first (100)');

// Test Align Center to Canvas
const alignedCenterCanvas = alignElements(testElements, ['el-1'], 'center-h', 'canvas', { width: 800, height: 600 });
assert.strictEqual(alignedCenterCanvas.find(e => e.id === 'el-1').x, 325, 'el-1 (w:150) centered in 800px should be 325');

// Test Uniform Distribution (Automatic)
const distAuto = distributeElements(
  [
    { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 50, rotation: 0 },
    { id: 'b', type: 'text', x: 120, y: 0, width: 100, height: 50, rotation: 0 },
    { id: 'c', type: 'text', x: 500, y: 0, width: 100, height: 50, rotation: 0 }
  ],
  ['a', 'b', 'c'],
  'horizontal',
  'first',
  { width: 800, height: 600 }
);
assert.strictEqual(distAuto.find(e => e.id === 'a').x, 0);
assert.strictEqual(distAuto.find(e => e.id === 'b').x, 250, 'Middle element b should have uniform gap of 150px (x=250)');
assert.strictEqual(distAuto.find(e => e.id === 'c').x, 500);

// Test Custom Fixed Gap
const distCustom = distributeElements(
  [
    { id: 'a', type: 'text', x: 50, y: 0, width: 100, height: 50, rotation: 0 },
    { id: 'b', type: 'text', x: 400, y: 0, width: 80, height: 50, rotation: 0 }
  ],
  ['a', 'b'],
  'horizontal',
  'first',
  { width: 800, height: 600 },
  25
);
assert.strictEqual(distCustom.find(e => e.id === 'a').x, 50);
assert.strictEqual(distCustom.find(e => e.id === 'b').x, 175, 'Element b should be at x = 50 + 100 + 25 = 175');
console.log('✔ Alignment & Uniform Distribution logic verified');

// 9. Canvas Dimensions Inference & Stability with Variants
const largeExportMaster = {
  name: 'Wide Banner',
  exportZone: {
    x: 13,
    y: 0,
    width: 1475,
    height: 720
  }
};
const resolvedWide = resolveComposition(largeExportMaster);
assert.strictEqual(resolvedWide.canvasWidth, 1475, `canvasWidth should be 1475px (got ${resolvedWide.canvasWidth})`);
assert.strictEqual(resolvedWide.canvasHeight, 720, `canvasHeight should be 720px (got ${resolvedWide.canvasHeight})`);

// With variant adding image without redefining width/height
const variantWithImage = {
  name: 'Variant with Image',
  images: {
    background: 'bg_giant.jpeg'
  }
};
const resolvedVariant = resolveComposition(largeExportMaster, undefined, variantWithImage);
assert.strictEqual(resolvedVariant.canvasWidth, 1475, 'Canvas width must remain 1475 even with image variant');
assert.strictEqual(resolvedVariant.canvasHeight, 720, 'Canvas height must remain 720 even with image variant');
console.log('✔ Canvas Dimensions Inference & Stability verified');

// 10. Test serializeCanvasToVariant and serializeCanvasToOverride
const mockVariantItem = {
  id: 'variant_ja_06',
  type: 'variant',
  path: 'variants/ja/06_one_more_grid.yml',
  slug: '06_one_more_grid',
  lang: 'ja',
  name: '06 — あと1問だけ (JA)',
  rawContent: '',
  config: {
    name: '06 — あと1問だけ (JA)',
    content: {
      main_title: 'Ancien titre'
    }
  }
};

const editedCanvasElements = [
  {
    id: 'txt-title',
    customId: 'main_title',
    type: 'text',
    text: '「あと1問だけ…」',
    x: 100,
    y: 170,
    fontSize: 46
  }
];

const serializedVariant = serializeCanvasToVariant(mockVariantItem, editedCanvasElements);
assert.strictEqual(serializedVariant.content.main_title, '「あと1問だけ…」', 'Variant content should update text from canvas element');
assert.strictEqual(serializedVariant.name, '06 — あと1問だけ (JA)');

const mockOverrideItem = {
  id: 'override_promo',
  type: 'override',
  path: 'overrides/promo.yml',
  slug: 'promo',
  name: 'Promo Override',
  rawContent: '',
  config: {
    name: 'Promo Override',
    background: { color1: '#000000' }
  }
};

const serializedOverride = serializeCanvasToOverride(
  mockOverrideItem,
  { type: 'solid', solidColor: '#ff0000', color1: '#ff0000', color2: '#000000', angle: 90, radialShape: 'circle', radialColor1: '#ff0000', radialColor2: '#000000', imageUrl: '', imageFit: 'cover' },
  editedCanvasElements,
  { x: 10, y: 10, width: 600, height: 400, targetWidth: 1200, targetHeight: 800, ratio: 1.5, lockRatio: true }
);
assert.strictEqual(serializedOverride.background.solidColor, '#ff0000', 'Override background should be updated');
console.log('✔ serializeCanvasToVariant & serializeCanvasToOverride verified');

// 9. Device element serialization & cascade verification
const deviceMasterConfig = {
  name: 'Device Master Test',
  background: { type: 'solid', solidColor: '#ffffff' },
  elements: [
    {
      id: 'dev-1',
      customId: 'hero_phone',
      type: 'device',
      deviceType: 'iphone-pro-max',
      x: 100,
      y: 100,
      width: 265,
      height: 570,
      rotation: 0,
      bodyColor: '#1d1d1f',
      brushedMetal: true,
      brushedMetalOpacity: 5,
      bodyThickness: 10,
      screenBorderWidth: 4,
      screenBorderColor: '#000000',
      buttonColor: '#3a3835',
      screenImageUrl: 'assets/screen_en.png',
      showButtons: true,
      showCamera: true,
      showHomeIndicator: true,
      homeIndicatorColor: 'rgba(255, 255, 255, 0.5)',
      showFlare: true,
      flareColor: 'rgba(255, 255, 255, 0.2)',
      flareAngle: 120,
      flareSpread: 60,
      screenPadding: 10,
      borderRadius: 44,
      shadow: { enable: true, color: 'rgba(0,0,0,0.3)', blur: 15, x: 0, y: 5 }
    }
  ]
};

const deviceVariant = {
  name: 'French Device Variant',
  images: {
    hero_phone: 'assets/screen_fr.png'
  },
  elements: {
    hero_phone: {
      bodyColor: '#2b2c2e',
      screenBorderColor: '#111111',
      brushedMetal: false,
      brushedMetalOpacity: 8,
      bodyThickness: 6
    }
  }
};

const resolvedDeviceComp = resolveComposition(
  deviceMasterConfig,
  undefined,
  deviceVariant,
  { 'assets/screen_fr.png': 'blob:http://localhost/fr-screen-uuid' },
  'variants/fr/promo.yml'
);

const resolvedDevice = resolvedDeviceComp.elements.find(e => e.customId === 'hero_phone');
assert.ok(resolvedDevice, 'Device should exist in resolved composition');
assert.strictEqual(resolvedDevice.type, 'device');
assert.strictEqual(resolvedDevice.deviceType, 'iphone-pro-max');
assert.strictEqual(resolvedDevice.bodyColor, '#2b2c2e', 'Device bodyColor should be updated from variant');
assert.strictEqual(resolvedDevice.screenBorderColor, '#111111', 'Device screenBorderColor should be updated');
assert.strictEqual(resolvedDevice.brushedMetal, false, 'Device brushedMetal should be updated');
assert.strictEqual(resolvedDevice.brushedMetalOpacity, 8, 'Device brushedMetalOpacity should be updated');
assert.strictEqual(resolvedDevice.bodyThickness, 6, 'Device bodyThickness should be updated');
assert.strictEqual(resolvedDevice.showHomeIndicator, true);
assert.strictEqual(resolvedDevice.screenImageUrl, 'blob:http://localhost/fr-screen-uuid', 'Device screen image should be mapped and resolved');
console.log('✔ Device element cascade & asset mapping verified');

// 11. Background image blur & foreground overlay cascade verification
const bgImageMasterConfig = {
  name: 'Background Image Options Master',
  background: {
    type: 'image',
    imageUrl: 'assets/bg.jpg',
    imageFit: 'cover',
    imageBlurEnable: true,
    imageBlur: 8,
    imageOverlayEnable: true,
    imageOverlayColor: '#FFFFFF11'
  }
};

const resolvedBgComp = resolveComposition(bgImageMasterConfig);
assert.strictEqual(resolvedBgComp.background.imageBlurEnable, true);
assert.strictEqual(resolvedBgComp.background.imageBlur, 8);
assert.strictEqual(resolvedBgComp.background.imageOverlayEnable, true);
assert.strictEqual(resolvedBgComp.background.imageOverlayColor, '#FFFFFF11');

// With override modifying blur and overlay color
const bgImageOverride = {
  background: {
    imageBlur: 15,
    imageOverlayColor: 'rgba(0, 0, 0, 0.4)'
  }
};
const resolvedBgOverrideComp = resolveComposition(bgImageMasterConfig, bgImageOverride);
assert.strictEqual(resolvedBgOverrideComp.background.imageBlurEnable, true, 'imageBlurEnable should be preserved from master');
assert.strictEqual(resolvedBgOverrideComp.background.imageBlur, 15, 'imageBlur should be updated by override');
assert.strictEqual(resolvedBgOverrideComp.background.imageOverlayColor, 'rgba(0, 0, 0, 0.4)', 'imageOverlayColor should be updated by override');
console.log('✔ Background image blur & foreground overlay cascade verified');

// 12. Text alignment (horizontal & vertical) cascade verification
const textAlignMaster = {
  name: 'Text Alignment Master',
  elements: [
    {
      id: 'txt-align',
      customId: 'hero_title',
      type: 'text',
      text: 'Aligned Text',
      textAlign: 'center',
      verticalAlign: 'middle'
    }
  ]
};

const resolvedTextAlignComp = resolveComposition(textAlignMaster);
const resolvedTextEl = resolvedTextAlignComp.elements.find(e => e.customId === 'hero_title');
assert.strictEqual(resolvedTextEl.textAlign, 'center');
assert.strictEqual(resolvedTextEl.verticalAlign, 'middle');

const textAlignOverride = {
  elements: {
    hero_title: {
      textAlign: 'right',
      verticalAlign: 'bottom'
    }
  }
};
const resolvedTextAlignOverride = resolveComposition(textAlignMaster, textAlignOverride);
const resolvedOverriddenTextEl = resolvedTextAlignOverride.elements.find(e => e.customId === 'hero_title');
assert.strictEqual(resolvedOverriddenTextEl.textAlign, 'right');
assert.strictEqual(resolvedOverriddenTextEl.verticalAlign, 'bottom');
console.log('✔ Text horizontal & vertical alignment cascade verified');

// 13. Background kinetic zoom blur cascade verification
const bgZoomBlurMaster = {
  name: 'Background Zoom Blur Master',
  background: {
    type: 'image',
    imageUrl: 'assets/bg.jpg',
    imageFit: 'cover',
    zoomBlurEnable: true,
    zoomBlurIntensity: 35,
    zoomBlurOrigin: 'auto-device',
    zoomBlurOriginX: 50,
    zoomBlurOriginY: 50
  }
};

const resolvedZoomBlurComp = resolveComposition(bgZoomBlurMaster);
assert.strictEqual(resolvedZoomBlurComp.background.zoomBlurEnable, true);
assert.strictEqual(resolvedZoomBlurComp.background.zoomBlurIntensity, 35);
assert.strictEqual(resolvedZoomBlurComp.background.zoomBlurOrigin, 'auto-device');

// With override modifying zoom blur origin & intensity
const bgZoomBlurOverride = {
  background: {
    zoomBlurIntensity: 60,
    zoomBlurOrigin: 'custom',
    zoomBlurOriginX: 40,
    zoomBlurOriginY: 65
  }
};
const resolvedZoomBlurOverride = resolveComposition(bgZoomBlurMaster, bgZoomBlurOverride);
assert.strictEqual(resolvedZoomBlurOverride.background.zoomBlurEnable, true, 'zoomBlurEnable should be preserved from master');
assert.strictEqual(resolvedZoomBlurOverride.background.zoomBlurIntensity, 60, 'zoomBlurIntensity should be updated by override');
assert.strictEqual(resolvedZoomBlurOverride.background.zoomBlurOrigin, 'custom', 'zoomBlurOrigin should be updated by override');
assert.strictEqual(resolvedZoomBlurOverride.background.zoomBlurOriginX, 40, 'zoomBlurOriginX should be updated by override');
assert.strictEqual(resolvedZoomBlurOverride.background.zoomBlurOriginY, 65, 'zoomBlurOriginY should be updated by override');
console.log('✔ Background kinetic zoom blur cascade verified');

// 14. Asset Subdirectory Preservation & AssetManager isolation verification
assetManager.clear();
// Existing asset on disk with subfolder
assetManager.registerExistingAsset('assets/sub/screen.png', new Blob(['test']), 'blob:http://sub-screen');
// Uploaded asset from UI
assetManager.registerAsset('uploaded_photo.png', new Blob(['test2']));

assert.strictEqual(
  assetManager.getAssetPathFromUrl('blob:http://sub-screen'),
  'assets/sub/screen.png',
  'Subdirectory asset path must remain intact in assetManager'
);

const configWithSubAsset = {
  background: {
    imageUrl: 'blob:http://sub-screen'
  }
};
const convertedConfig = convertUrlsToRelativeAssetPaths(configWithSubAsset);
assert.strictEqual(
  convertedConfig.background.imageUrl,
  'assets/sub/screen.png',
  'Asset URL conversion must preserve subdirectory path without flattening to root assets/'
);
console.log('✔ Asset subdirectory preservation & selective disk tracking verified');

console.log('\nAll tests passed successfully!');
