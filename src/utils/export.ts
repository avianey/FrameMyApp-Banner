import { ExportZone } from '../types';
import { captureZoneToBlob } from './batchExportRenderer';

export async function exportComposition(
  artboardElement: HTMLElement,
  zone: ExportZone
): Promise<void> {
  const { dataUrl } = await captureZoneToBlob(artboardElement, zone);
  const downloadLink = document.createElement('a');
  downloadLink.download = `banner-${Date.now()}.png`;
  downloadLink.href = dataUrl;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
