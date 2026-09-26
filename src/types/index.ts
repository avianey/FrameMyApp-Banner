export interface ColorRgba {
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
}

export type BackgroundType = 'solid' | 'linear' | 'radial' | 'image';

export interface BackgroundConfig {
  type: BackgroundType;
  solidColor: string;
  color1: string;
  color2: string;
  angle: number;
  radialShape: 'circle';
  radialColor1: string;
  radialColor2: string;
  imageUrl: string;
  imageFit: 'cover' | 'contain' | 'auto';
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageScale?: number;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
}

export type ShapeType = 'rectangle' | 'rounded-rect' | 'circle' | 'pill' | 'star' | 'hexagon';
export type FillType = 'none' | 'solid' | 'linear' | 'radial' | 'image';

export interface GradientStop {
  color: string;
  offset: number; // 0 à 100%
}

export interface GlowConfig {
  enable: boolean;
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface ShadowConfig {
  enable: boolean;
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface StrokeConfig {
  enable: boolean;
  width: number;
  color: string;
}

export interface BaseElement {
  id: string;
  customId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextElementModel extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontWeight?: number | string;
  fontSize: number;
  color: string;
  letterSpacing: number;
  lineHeight: number;
  minLines: number;
  glow: GlowConfig;
  shadow: ShadowConfig;
}

export interface ShapeElementModel extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fillType: FillType;
  solidColor: string;
  color1: string;
  color2: string;
  angle: number;
  radialColor1: string;
  radialColor2: string;
  gradientStops?: GradientStop[];
  radialStops?: GradientStop[];
  imageUrl: string;
  imageFit?: 'cover' | 'contain' | 'auto';
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageScale?: number;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  opacity: number;
  borderRadius: number;
  stroke: StrokeConfig;
  shadow: ShadowConfig;
}

export type DeviceModelType = 'pixel-10' | 'iphone-pro-max' | 'samsung-galaxy' | 'pixel-tab';

export interface DeviceElementModel extends BaseElement {
  type: 'device';
  deviceType: DeviceModelType;
  bodyColor: string;
  brushedMetal?: boolean;
  brushedMetalOpacity?: number;
  bodyThickness?: number;
  bodyThicknessPercent?: number;
  screenBorderColor?: string;
  screenBorderWidth?: number;
  screenBorderWidthPercent?: number;
  screenImageUrl: string;
  imageAspectRatio?: number;
  screenColor?: string;
  screenFit?: 'cover' | 'contain' | 'fill';
  showButtons: boolean;
  buttonColor: string;
  showCamera: boolean;
  showHomeIndicator?: boolean;
  homeIndicatorColor?: string;
  showFlare?: boolean;
  flareColor?: string;
  flareAngle?: number;
  flareSpread?: number;
  screenPadding: number;
  borderRadius: number;
  borderRadiusPercent?: number;
  shadow: ShadowConfig;
}

export type CanvasElement = TextElementModel | ShapeElementModel | DeviceElementModel;

export interface ExportZone {
  x: number;
  y: number;
  width: number;
  height: number;
  preset: string;
  ratio: number;
  targetWidth: number;
  targetHeight: number;
  lockRatio?: boolean;
}

export type ActivePanel = 'bg' | 'text' | 'shape' | 'device' | 'export' | 'align' | null;

export type SyncStatus = 'idle' | 'synced' | 'dirty' | 'syncing' | 'error';

export interface EditorState {
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundConfig;
  elements: CanvasElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  activePanel: ActivePanel;
  exportZone: ExportZone;
  isDrawingExportMode: boolean;
  theme: 'light' | 'dark';
  zoom: number;
  pan: { x: number; y: number };
  canUndo: boolean;
  canRedo: boolean;
}

export * from './template';

