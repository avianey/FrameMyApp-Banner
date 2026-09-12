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
  opacity: number;
  borderRadius: number;
  stroke: StrokeConfig;
  shadow: ShadowConfig;
}

export type CanvasElement = TextElementModel | ShapeElementModel;

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

export type ActivePanel = 'bg' | 'text' | 'shape' | 'export' | 'align' | null;

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

