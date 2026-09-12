import { BackgroundConfig, CanvasElement, ExportZone } from './index';

export interface BannerMasterConfig {
  name?: string;
  version?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  width?: number;
  height?: number;
  exportZone?: Partial<ExportZone>;
  background?: Partial<BackgroundConfig>;
  elements?: CanvasElement[];
  content?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface BannerOverrideConfig {
  name?: string;
  version?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  width?: number;
  height?: number;
  exportZone?: Partial<ExportZone>;
  background?: Partial<BackgroundConfig>;
  elements?: (Partial<CanvasElement> & { customId?: string; id?: string })[] | Record<string, Partial<CanvasElement>>;
  content?: Record<string, string>;
  images?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface BannerVariantConfig {
  name?: string;
  version?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  width?: number;
  height?: number;
  exportZone?: Partial<ExportZone>;
  background?: Partial<BackgroundConfig>;
  elements?: (Partial<CanvasElement> & { customId?: string; id?: string })[] | Record<string, Partial<CanvasElement>>;
  content?: Record<string, string>;
  images?: Record<string, string>;
  metadata?: Record<string, any>;
}

export type BundleItemType = 'master' | 'override' | 'variant';

export interface BundleItem {
  id: string;
  type: BundleItemType;
  path: string;
  slug: string;
  lang?: string;
  name: string;
  rawContent: string;
  config: BannerMasterConfig | BannerOverrideConfig | BannerVariantConfig;
}

export interface LoadedBundle {
  name: string;
  master: BundleItem | null;
  overrides: Record<string, BundleItem>;
  variants: BundleItem[];
  assets: Record<string, string>;
  directoryHandle?: any;
}

export interface BatchExportItem {
  item: BundleItem;
  outputPath: string;
  selected: boolean;
  status: 'pending' | 'rendering' | 'done' | 'error';
  errorMessage?: string;
  previewDataUrl?: string;
}
