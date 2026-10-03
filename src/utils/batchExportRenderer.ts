import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { ExportZone } from '../types';

/**
 * Captures an HTML element, crops to the exportZone, scales to target dimensions, and returns a PNG Blob.
 * Uses html-to-image (SVG foreignObject) to ensure pixel-perfect rendering, exact font metrics,
 * crisp background resolution and 1:1 text layout matching the interactive canvas.
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

  // Hide UI handles, in-place cropper overlays and export overlay
  const hiddenElements: { el: HTMLElement; prevDisplay: string }[] = [];
  document.querySelectorAll('.selection-ui-handle, #export-overlay, [class*="border-indigo-500"]').forEach((el: any) => {
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

  try {
    const artboardW = artboardElement.offsetWidth || artboardElement.clientWidth || 800;
    const artboardH = artboardElement.offsetHeight || artboardElement.clientHeight || 600;
    const targetW = zone.targetWidth || 1200;
    const targetH = zone.targetHeight || 900;

    // Calculate an optimal capture scale (avoid extreme downscaling that causes blur)
    const idealScale = (targetW / (zone.width || artboardW)) * 1.5;
    const neededScale = Math.max(1.2, Math.min(2.0, idealScale));

    const capturedCanvas = await htmlToImage.toCanvas(artboardElement, {
      width: artboardW,
      height: artboardH,
      pixelRatio: neededScale,
      skipFonts: false,
      filter: (node: HTMLElement) => {
        if (node?.classList?.contains) {
          if (
            node.classList.contains('selection-ui-handle') ||
            node.classList.contains('drag-pill-handle') ||
            node.classList.contains('handle-resize') ||
            node.classList.contains('handle-rotate-anchor')
          ) {
            return false;
          }
        }
        if (node?.id === 'export-overlay') return false;
        return true;
      }
    });

    const isFullCanvas =
      zone.preset === 'full' ||
      (zone.x === 0 &&
        zone.y === 0 &&
        Math.abs(zone.width - artboardW) < 2 &&
        Math.abs(zone.height - artboardH) < 2);

    const scaleRatioX = capturedCanvas.width / artboardW;
    const scaleRatioY = capturedCanvas.height / artboardH;
    const cropX = isFullCanvas ? 0 : Math.max(0, Math.min(capturedCanvas.width - 1, Math.round(zone.x * scaleRatioX)));
    const cropY = isFullCanvas ? 0 : Math.max(0, Math.min(capturedCanvas.height - 1, Math.round(zone.y * scaleRatioY)));
    const cropW = isFullCanvas ? capturedCanvas.width : Math.max(1, Math.min(capturedCanvas.width - cropX, Math.round(zone.width * scaleRatioX)));
    const cropH = isFullCanvas ? capturedCanvas.height : Math.max(1, Math.min(capturedCanvas.height - cropY, Math.round(zone.height * scaleRatioY)));

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
