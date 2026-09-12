import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { ExportZone } from '../types';

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

  // Temporarily reset to 1:1 scale without pan, and square corners for clean banner export
  if (container) {
    container.style.transform = 'none';
    container.style.left = '0px';
    container.style.top = '0px';
  }
  artboardElement.style.borderRadius = '0px';
  artboardElement.style.boxShadow = 'none';

  // Wait for fonts and browser layout to settle at scale 1:1
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }
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
      y: 0
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
    artboardElement.style.borderRadius = prevRadius;
    artboardElement.style.boxShadow = prevShadow;

    hiddenElements.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay;
    });
    editableElements.forEach(({ el, prevVal }) => {
      if (prevVal !== null) el.setAttribute('contenteditable', prevVal);
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
