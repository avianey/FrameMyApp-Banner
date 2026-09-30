import { ExportZone } from '../types';
import { captureZoneToBlob } from './batchExportRenderer';

export interface ExportPreviewData {
  blob: Blob;
  dataUrl: string;
  targetWidth: number;
  targetHeight: number;
  ratio: number;
  preset?: string;
}

export function downloadDataUrl(dataUrl: string, filename?: string): void {
  const downloadLink = document.createElement('a');
  downloadLink.download = filename || `banner-${Date.now()}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

export async function captureExportPreview(
  artboardElement: HTMLElement,
  zone: ExportZone
): Promise<{ blob: Blob; dataUrl: string }> {
  return await captureZoneToBlob(artboardElement, zone);
}

export async function exportComposition(
  artboardElement: HTMLElement,
  zone: ExportZone,
  filename?: string
): Promise<void> {
  const { dataUrl } = await captureZoneToBlob(artboardElement, zone);
  downloadDataUrl(dataUrl, filename);
}

