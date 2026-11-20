import { BackgroundConfig, CanvasElement, ExportZone } from './index';

export interface BannerMasterConfig {
  name?: string;
  /**
   * Version de FrameMy.App Studio (issue de package.json / tag Git) utilisée pour construire ce master.
   * Permet d'invoquer la CLI headless CI/CD sur le tag exact correspondant.
   */
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
  /** Identifiants (customId ou id) des éléments du Master supprimés par cet override */
  removedElements?: string[];
  /** Ordre personnalisé des plans (du fond vers le 1er plan), par customId ou id, lorsqu'il diffère du Master */
  elementOrder?: string[];
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
  /** Identifiants (customId ou id) des éléments du parent (Master / Override) supprimés par cette variante */
  removedElements?: string[];
  /** Ordre personnalisé des plans (du fond vers le 1er plan), par customId ou id, lorsqu'il diffère du parent */
  elementOrder?: string[];
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
