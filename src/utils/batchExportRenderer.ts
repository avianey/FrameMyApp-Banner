import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { ExportZone } from '../types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Accurately extracts the visual lines as rendered by the browser's native text engine.
 * This guarantees that CJK (Japanese, Chinese) and Western text wrapping in the export
 * matches 1:1 with the interactive canvas without line break drift or overlaps.
 */
function extractVisualLines(element: HTMLElement): string[] {
  const fullText = element.innerText || element.textContent || '';
  if (!fullText.trim()) return fullText ? [fullText] : [];

  const textNodes: Text[] = [];
  function collectTextNodes(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      textNodes.push(node as Text);
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        collectTextNodes(node.childNodes[i]);
      }
    }
  }
  collectTextNodes(element);

  if (textNodes.length === 0) {
    return fullText.split('\n');
  }

  const range = document.createRange();
  const visualLines: string[] = [];
  let currentLine = '';
  let lastTop: number | null = null;

  for (const tNode of textNodes) {
    const val = tNode.nodeValue || '';
    for (let i = 0; i < val.length; i++) {
      const char = val[i];
      if (char === '\n') {
        if (currentLine) visualLines.push(currentLine);
        currentLine = '';
        lastTop = null;
        continue;
      }

      try {
        range.setStart(tNode, i);
        range.setEnd(tNode, i + 1);
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const top = Math.round(rects[0].top);
          if (lastTop === null) {
            lastTop = top;
            currentLine += char;
          } else if (Math.abs(top - lastTop) > 6) {
            visualLines.push(currentLine);
            currentLine = char;
            lastTop = top;
          } else {
            currentLine += char;
          }
        } else {
          currentLine += char;
        }
      } catch {
        currentLine += char;
      }
    }
  }

  if (currentLine) {
    visualLines.push(currentLine);
  }

  return visualLines.length > 0 ? visualLines : fullText.split('\n');
}

/**
 * Renders a CSS linear or radial gradient to an offscreen canvas element.
 * Used during html2canvas export to bypass html2canvas's buggy `createPattern(canvas, 'repeat')`
 * which causes unwanted sub-pixel edge lines (e.g. at the bottom of transparent gradients).
 */
function renderGradientToCanvas(
  ownerDoc: Document,
  width: number,
  height: number,
  fillType: 'linear' | 'radial',
  options: {
    angle?: number;
    stops: Array<{ color: string; offset: number }>;
  }
): HTMLCanvasElement | null {
  if (width <= 0 || height <= 0 || !options.stops || options.stops.length === 0) return null;
  const canvas = (ownerDoc || document).createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (fillType === 'linear') {
    const angle = options.angle ?? 0;
    const rad = (angle * Math.PI) / 180;
    const lineLength = Math.abs(canvas.width * Math.sin(rad)) + Math.abs(canvas.height * Math.cos(rad));
    const halfWidth = canvas.width / 2;
    const halfHeight = canvas.height / 2;
    const halfLineLength = lineLength / 2;
    const dx = Math.sin(rad) * halfLineLength;
    const dy = -Math.cos(rad) * halfLineLength;
    const x0 = halfWidth - dx;
    const y0 = halfHeight - dy;
    const x1 = halfWidth + dx;
    const y1 = halfHeight + dy;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const sortedStops = [...options.stops].sort((a, b) => a.offset - b.offset);
    sortedStops.forEach(s => {
      grad.addColorStop(Math.max(0, Math.min(1, s.offset / 100)), s.color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.sqrt(cx * cx + cy * cy);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const sortedStops = [...options.stops].sort((a, b) => a.offset - b.offset);
    sortedStops.forEach(s => {
      grad.addColorStop(Math.max(0, Math.min(1, s.offset / 100)), s.color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return canvas;
}

/**
 * Captures an HTML element, crops to the exportZone, scales to target dimensions, and returns a PNG Blob.
 * Neutralizes any CSS zoom/pan transforms on the artboard container during capture to ensure
 * pixel-perfect rendering, exact font metrics, crisp background resolution and sharp text.
 */
export async function captureZoneToBlob(
  artboardElement: HTMLElement,
  zone: ExportZone
): Promise<{ blob: Blob; dataUrl: string }> {
  // 1. Locate container and save display state
  const container = document.getElementById('artboard-container');
  const prevTransform = container?.style.transform ?? '';
  const prevLeft = container?.style.left ?? '';
  const prevTop = container?.style.top ?? '';
  const prevRadius = artboardElement.style.borderRadius ?? '';
  const prevShadow = artboardElement.style.boxShadow ?? '';
  const prevOverflow = artboardElement.style.overflow ?? '';

  // Hide UI handles and export overlay
  const hiddenElements: { el: HTMLElement; prevDisplay: string }[] = [];
  document.querySelectorAll('.selection-ui-handle, #export-overlay').forEach((el: any) => {
    hiddenElements.push({ el, prevDisplay: el.style.display });
    el.style.display = 'none';
  });

  // Temporarily disable contenteditable to prevent caret or edit frame artifacts
  const editableElements: { el: HTMLElement; prevVal: string | null }[] = [];
  document.querySelectorAll('[contenteditable]').forEach((el: any) => {
    editableElements.push({ el, prevVal: el.getAttribute('contenteditable') });
    el.removeAttribute('contenteditable');
  });

  // Temporarily reset to 1:1 scale without pan, and square corners for clean full-frame banner export
  if (container) {
    container.style.transform = 'none';
    container.style.left = '0px';
    container.style.top = '0px';
    container.style.borderRadius = '0px';
  }
  artboardElement.style.borderRadius = '0px';
  artboardElement.style.boxShadow = 'none';
  artboardElement.style.overflow = 'hidden';

  const bgEl = artboardElement.querySelector('#artboard-bg') as HTMLElement | null;
  const prevBgRadius = bgEl?.style.borderRadius ?? '';
  if (bgEl) {
    bgEl.style.borderRadius = '0px';
  }

  // Wait for fonts and browser layout to settle at scale 1:1
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // Wait for all images in the live artboard to be fully loaded and decoded before capture
  const liveImages = Array.from(artboardElement.querySelectorAll('img'));
  await Promise.all(
    liveImages.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const onDone = () => resolve();
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
        setTimeout(resolve, 500);
      });
    })
  );

  // Tag images with IDs so the cloned DOM can accurately reference live image data
  liveImages.forEach((img, idx) => {
    img.setAttribute('data-export-img-id', `img-${idx}`);
  });

  await new Promise(r => requestAnimationFrame(r));
  await new Promise(r => setTimeout(r, 60));

  // 2. Map exact visual lines and typography metrics for every text element in 1:1 layout
  interface ElementTextInfo {
    lines: string[];
    lineHeight: number;
    letterSpacing: string;
  }
  const textInfoMap = new Map<string, ElementTextInfo>();

  artboardElement.querySelectorAll('.editable-text-content').forEach((el: any, idx) => {
    const parentContainer = el.closest('[id^="el-"]');
    const key = parentContainer?.id || `text-elem-${idx}`;
    el.setAttribute('data-export-text-id', key);

    const computed = window.getComputedStyle(el);
    const fontSize = parseFloat(computed.fontSize) || 24;
    let lineHeight = parseFloat(computed.lineHeight);
    if (isNaN(lineHeight) || lineHeight <= 0) {
      lineHeight = Math.round(fontSize * 1.3);
    }

    const lines = extractVisualLines(el);
    const letterSpacing = computed.letterSpacing === '0px' ? 'normal' : computed.letterSpacing;

    textInfoMap.set(key, {
      lines,
      lineHeight,
      letterSpacing
    });
  });

  try {
    const artboardW = artboardElement.offsetWidth || artboardElement.clientWidth || 800;
    const artboardH = artboardElement.offsetHeight || artboardElement.clientHeight || 600;
    const targetW = zone.targetWidth || 1200;
    const targetH = zone.targetHeight || 900;

    // Calculate an optimal capture scale (avoid extreme downscaling that causes blur)
    const idealScale = (targetW / (zone.width || artboardW)) * 1.5;
    const neededScale = Math.max(1.2, Math.min(2.0, idealScale));

    const capturedCanvas = await html2canvas(artboardElement, {
      scale: neededScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      width: artboardW,
      height: artboardH,
      windowWidth: artboardW,
      windowHeight: artboardH,
      x: 0,
      y: 0,
      onclone: (clonedDoc) => {
        // 1. Force strict full-frame square corners (0px) on artboard and background containers
        clonedDoc.querySelectorAll('#artboard, #artboard-bg, #artboard-container').forEach((el: any) => {
          el.style.borderRadius = '0px';
          el.style.setProperty('border-radius', '0px', 'important');
          el.style.boxShadow = 'none';
          el.style.setProperty('box-shadow', 'none', 'important');
        });

        // Transfer all loaded font faces from the parent document into the cloned iframe
        if (document.fonts) {
          document.fonts.forEach((font) => {
            try {
              clonedDoc.fonts.add(font);
            } catch (e) {}
          });
        }

        // 2. Convert all linear/radial gradient shapes and backgrounds into native canvas elements
        // This neutralizes html2canvas's internal createPattern(canvas, 'repeat') sub-pixel looping bug
        // which caused unsightly lines at the boundary of transparent gradients.
        clonedDoc.querySelectorAll('.shape-render-content, #artboard-bg').forEach((clonedEl: any) => {
          const fillType = clonedEl.getAttribute('data-fill-type') || clonedEl.getAttribute('data-bg-type');
          if (fillType === 'linear' || fillType === 'radial') {
            const angle = parseFloat(clonedEl.getAttribute('data-gradient-angle') || '0');
            const stopsJson = fillType === 'linear'
              ? clonedEl.getAttribute('data-gradient-stops')
              : clonedEl.getAttribute('data-radial-stops');

            let stops: Array<{ color: string; offset: number }> = [];
            try {
              if (stopsJson) stops = JSON.parse(stopsJson);
            } catch (e) {}

            const width = parseFloat(clonedEl.getAttribute('data-shape-w') || String(clonedEl.offsetWidth || 100));
            const height = parseFloat(clonedEl.getAttribute('data-shape-h') || String(clonedEl.offsetHeight || 100));

            if (width > 0 && height > 0 && stops.length > 0) {
              const gradCanvas = renderGradientToCanvas(clonedDoc, width, height, fillType, {
                angle,
                stops
              });

              if (gradCanvas) {
                // Clear the container background so html2canvas doesn't invoke its pattern repeat
                clonedEl.style.background = 'transparent';
                clonedEl.style.backgroundImage = 'none';

                gradCanvas.style.position = 'absolute';
                gradCanvas.style.left = '0';
                gradCanvas.style.top = '0';
                gradCanvas.style.width = '100%';
                gradCanvas.style.height = '100%';
                gradCanvas.style.borderRadius = clonedEl.style.borderRadius || 'inherit';
                gradCanvas.style.pointerEvents = 'none';
                gradCanvas.style.zIndex = '0';

                clonedEl.insertBefore(gradCanvas, clonedEl.firstChild);
              }
            }
          }
        });

        // Convert all images to synchronous Data URLs using the already-loaded live images from the parent document
        clonedDoc.querySelectorAll('img').forEach((clonedImg: HTMLImageElement) => {
          const imgId = clonedImg.getAttribute('data-export-img-id');
          const liveImg = imgId ? (artboardElement.querySelector(`img[data-export-img-id="${imgId}"]`) as HTMLImageElement | null) : null;
          const sourceImg = liveImg || clonedImg;

          const blurVal = parseFloat(clonedImg.getAttribute('data-image-blur') || '0');
          const nw = sourceImg.naturalWidth || sourceImg.offsetWidth || 800;
          const nh = sourceImg.naturalHeight || sourceImg.offsetHeight || 600;

          if (nw > 0 && nh > 0) {
            try {
              const canvas = clonedDoc.createElement('canvas');
              canvas.width = nw;
              canvas.height = nh;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                if (blurVal > 0) {
                  ctx.filter = `blur(${blurVal}px)`;
                }
                ctx.drawImage(sourceImg, 0, 0, nw, nh);
                clonedImg.src = canvas.toDataURL('image/png');
                clonedImg.style.filter = 'none';
              }
            } catch (err) {
              console.warn('Could not serialize image to dataURL for export:', err);
            }
          }
        });

        // Apply native visual line blocks to prevent html2canvas CJK wrapping or collapse bugs
        clonedDoc.querySelectorAll('.editable-text-content').forEach((clonedEl: any) => {
          const key = clonedEl.getAttribute('data-export-text-id');
          const info = key ? textInfoMap.get(key) : null;
          if (info && info.lines.length > 0) {
            clonedEl.style.lineHeight = `${info.lineHeight}px`;
            clonedEl.style.letterSpacing = info.letterSpacing;
            clonedEl.style.whiteSpace = 'pre';
            clonedEl.style.wordBreak = 'break-all';
            clonedEl.style.overflowWrap = 'anywhere';
            clonedEl.innerHTML = info.lines
              .map(
                line =>
                  `<div style="line-height: ${info.lineHeight}px; white-space: pre; margin: 0; padding: 0; font-family: inherit; font-size: inherit; font-weight: inherit; color: inherit; text-shadow: inherit; text-align: inherit;">${escapeHtml(
                    line
                  )}</div>`
              )
              .join('');
          }
        });
      }
    });

    const scaleRatioX = capturedCanvas.width / artboardW;
    const scaleRatioY = capturedCanvas.height / artboardH;
    const cropX = Math.round(zone.x * scaleRatioX);
    const cropY = Math.round(zone.y * scaleRatioY);
    const cropW = Math.round(zone.width * scaleRatioX);
    const cropH = Math.round(zone.height * scaleRatioY);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const ctx = finalCanvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to create canvas 2D context for export');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      capturedCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      finalCanvas.width,
      finalCanvas.height
    );

    const dataUrl = finalCanvas.toDataURL('image/png', 0.98);

    const blob = await new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob(b => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      }, 'image/png', 0.98);
    });

    return { blob, dataUrl };
  } finally {
    // Restore UI state immediately
    if (container) {
      container.style.transform = prevTransform;
      container.style.left = prevLeft;
      container.style.top = prevTop;
    }
    if (bgEl) {
      bgEl.style.borderRadius = prevBgRadius;
    }
    artboardElement.style.borderRadius = prevRadius;
    artboardElement.style.boxShadow = prevShadow;
    artboardElement.style.overflow = prevOverflow;

    hiddenElements.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay;
    });
    editableElements.forEach(({ el, prevVal }) => {
      if (prevVal !== null) el.setAttribute('contenteditable', prevVal);
    });

    // Clean up tracking attributes
    artboardElement.querySelectorAll('.editable-text-content').forEach((el: any) => {
      el.removeAttribute('data-export-text-id');
    });
    artboardElement.querySelectorAll('img').forEach((el: any) => {
      el.removeAttribute('data-export-img-id');
    });
  }
}

/**
 * Recursively writes a blob to a file within a FileSystemDirectoryHandle.
 */
export async function writeBlobToDirectory(
  rootDirHandle: any,
  relativePath: string,
  blob: Blob
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
  await writable.write(blob);
  await writable.close();
}

/**
 * Packs multiple rendered files into a ZIP.
 */
export async function createBatchExportZip(
  files: { path: string; blob: Blob }[],
  folderName: string
): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(folderName) || zip;
  for (const file of files) {
    root.file(file.path, file.blob);
  }
  return zip.generateAsync({ type: 'blob' });
}
