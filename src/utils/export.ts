import html2canvas from 'html2canvas';
import { ExportZone } from '../types';

export async function exportComposition(
  artboardElement: HTMLElement,
  zone: ExportZone
): Promise<void> {
  // Capture canvas using html2canvas
  const capturedCanvas = await html2canvas(artboardElement, {
    scale: 2.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });

  const artboardW = artboardElement.clientWidth || 800;
  const artboardH = artboardElement.clientHeight || 600;
  const scaleRatioX = capturedCanvas.width / artboardW;
  const scaleRatioY = capturedCanvas.height / artboardH;
  const cropX = zone.x * scaleRatioX;
  const cropY = zone.y * scaleRatioY;
  const cropW = zone.width * scaleRatioX;
  const cropH = zone.height * scaleRatioY;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = zone.targetWidth || 1080;
  finalCanvas.height = zone.targetHeight || 1080;
  const ctx = finalCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas 2D context');
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

  const dataUrl = finalCanvas.toDataURL('image/png', 0.96);
  const downloadLink = document.createElement('a');
  downloadLink.download = `composition-m3-${Date.now()}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
