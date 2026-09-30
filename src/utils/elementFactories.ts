import {
  TextElementModel,
  ShapeElementModel,
  ShapeType,
  DeviceElementModel,
  DeviceModelType
} from '../types';

export function createTextElement(count: number, offset: number): TextElementModel {
  const id = 'txt-' + Date.now();
  const customId = count === 1 ? 'title' : count === 2 ? 'subtitle' : `text_${count}`;
  return {
    id,
    customId,
    type: 'text',
    text: 'Nouveau Texte',
    x: 120 + offset,
    y: 120 + offset,
    width: 280,
    height: 60,
    rotation: 0,
    fontFamily: 'Roboto',
    fontWeight: 400,
    fontSize: 32,
    color: 'rgba(30, 27, 75, 1)',
    letterSpacing: 0,
    lineHeight: 1.3,
    minLines: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    glow: { enable: false, color: 'rgba(56, 189, 248, 0.75)', blur: 10, x: 0, y: 0 },
    shadow: { enable: false, color: 'rgba(0, 0, 0, 0.3)', blur: 4, x: 2, y: 2 }
  };
}

export function createShapeElement(shapeType: ShapeType = 'rounded-rect', count: number, offset: number): ShapeElementModel {
  const id = 'shape-' + Date.now();
  const customId = count === 1 ? 'hero_badge' : `shape_${count}`;
  return {
    id,
    customId,
    type: 'shape',
    shapeType,
    x: 140 + offset,
    y: 140 + offset,
    width: 190,
    height: 190,
    rotation: 0,
    fillType: 'solid',
    solidColor: 'rgba(103, 80, 164, 0.9)',
    color1: 'rgba(139, 92, 246, 0.9)',
    color2: 'rgba(236, 72, 153, 0.9)',
    angle: 90,
    radialColor1: 'rgba(251, 191, 36, 1)',
    radialColor2: 'rgba(185, 28, 28, 0.9)',
    imageUrl: '',
    opacity: 1,
    borderRadius: 16,
    stroke: {
      enable: false,
      width: 2,
      color: 'rgba(255, 255, 255, 1)'
    },
    glow: {
      enable: false,
      color: 'rgba(56, 189, 248, 0.75)',
      blur: 16,
      x: 0,
      y: 0
    },
    shadow: {
      enable: true,
      color: 'rgba(0, 0, 0, 0.25)',
      blur: 14,
      x: 0,
      y: 6
    }
  };
}

export function createDeviceElement(deviceType: DeviceModelType = 'pixel-10', count: number, offset: number): DeviceElementModel {
  const id = 'device-' + Date.now();
  const customId = count === 1 ? 'app_screen' : `device_${count}`;

  let width = 260;
  let height = 565;
  let borderRadius = 36;
  let screenPadding = 10;
  let bodyColor = '#1e2022';
  let buttonColor = '#3a3f45';

  if (deviceType === 'iphone-pro-max') {
    width = 265;
    height = 570;
    borderRadius = 44;
    screenPadding = 10;
    bodyColor = '#1d1d1f';
    buttonColor = '#3a3835';
  } else if (deviceType === 'samsung-galaxy') {
    width = 260;
    height = 575;
    borderRadius = 22;
    screenPadding = 8;
    bodyColor = '#1a1c1e';
    buttonColor = '#33373b';
  } else if (deviceType === 'pixel-tab') {
    width = 500;
    height = 325;
    borderRadius = 26;
    screenPadding = 16;
    bodyColor = '#2b2c2e';
    buttonColor = '#424448';
  }

  return {
    id,
    customId,
    type: 'device',
    deviceType,
    x: 160 + offset,
    y: 90 + offset,
    width,
    height,
    rotation: 0,
    bodyColor,
    brushedMetal: true,
    brushedMetalOpacity: 8,
    bodyThickness: 10,
    screenBorderColor: '#000000',
    screenBorderWidth: 4,
    screenImageUrl: '',
    screenColor: '#05070a',
    screenFit: 'cover',
    showButtons: true,
    buttonColor,
    showCamera: true,
    showHomeIndicator: true,
    homeIndicatorColor: 'rgba(255, 255, 255, 0.45)',
    showFlare: true,
    flareColor: 'rgba(255, 255, 255, 0.15)',
    flareAngle: 135,
    flareSpread: 50,
    screenPadding: 4,
    borderRadius,
    glow: {
      enable: false,
      color: 'rgba(56, 189, 248, 0.75)',
      blur: 20,
      x: 0,
      y: 0
    },
    shadow: {
      enable: true,
      color: 'rgba(0, 0, 0, 0.35)',
      blur: 20,
      x: 0,
      y: 10
    }
  };
}
