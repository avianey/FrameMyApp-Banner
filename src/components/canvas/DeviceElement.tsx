import React, { useRef, useState } from 'react';
import { DeviceElementModel } from '../../types';
import { useEditor } from '../../context/EditorContext';
import { SelectionHandles } from './SelectionHandles';
import { getDeviceEffectiveDimensions, computeDeviceHeightFromWidth } from '../../utils/deviceHelper';
import { assetManager } from '../../utils/assetManager';
import { resolveAsset } from '../../utils/templateEngine';
import { getCombinedBoxShadow } from '../../utils/effectsHelper';

interface DeviceElementProps {
  element: DeviceElementModel;
  isSelected: boolean;
  selectionIndex?: number;
  isMultiSelected?: boolean;
}

// Cache mémoïsé de la texture SVG de métal brossé selon l'opacité
const brushedMetalCache = new Map<number, string>();

// Génère une texture SVG de métal brossé : chaque trait vertical a son propre dégradé
// avec entre 2 et 6 points aléatoires (stops blancs/ombrés), opacité aléatoire entre 0% et maxOpacity% (5% par défaut)
function getBrushedMetalBackground(maxOpacityPercent = 5): string {
  const rounded = Math.round(maxOpacityPercent * 10) / 10;
  if (brushedMetalCache.has(rounded)) {
    return brushedMetalCache.get(rounded)!;
  }

  const maxAlpha = Math.max(0.01, rounded / 100);
  const width = 80;
  const height = 120;

  // Générateur pseudo-aléatoire déterministe pour rendu stable
  let seed = 98765;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const defs: string[] = [];
  const rects: string[] = [];

  for (let x = 0; x < width; x++) {
    // Entre 2 et 6 points (stops) le long du trait vertical
    const numStops = Math.floor(2 + rand() * 5); // 2 à 6 stops
    const offsets: number[] = [];
    for (let i = 0; i < numStops; i++) {
      if (i === 0) offsets.push(0);
      else if (i === numStops - 1) offsets.push(100);
      else offsets.push(Math.round(rand() * 100));
    }
    offsets.sort((a, b) => a - b);

    // Alternance de reflets de lumière et de sillons sombres pour faire ressortir le brossage
    const isHighlight = rand() > 0.35;
    const color = isHighlight ? '#ffffff' : '#000000';
    const factor = isHighlight ? 1 : 0.8;

    const stops = offsets.map(offset => {
      const alpha = (rand() * maxAlpha * factor).toFixed(4);
      return `<stop offset="${offset}%" stop-color="${color}" stop-opacity="${alpha}"/>`;
    });

    defs.push(`<linearGradient id="bm${x}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${height}">${stops.join('')}</linearGradient>`);
    rects.push(`<rect x="${x}" y="0" width="1" height="${height}" fill="url(#bm${x})"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs.join('')}${rects.join('')}</svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  brushedMetalCache.set(rounded, url);
  return url;
}

export const DeviceElement: React.FC<DeviceElementProps> = ({
  element,
  isSelected,
  selectionIndex,
  isMultiSelected
}) => {
  const { selectElement, updateElement, state, recordHistory, showSnackbar, setActivePanel, persistAsset, loadedBundle } = useEditor();
  const nodeRef = useRef<HTMLDivElement>(null);
  const currentZoom = state.zoom || 1;
  const [isDropTarget, setIsDropTarget] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDropTarget(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDropTarget) setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDropTarget(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      recordHistory();
      const file = files[0];
      persistAsset(file).then(({ displayUrl }) => {
        const img = new Image();
        img.onload = () => {
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const newTotalH = computeDeviceHeightFromWidth(element.width, imgRatio, element);
          updateElement(element.id, {
            screenImageUrl: displayUrl,
            imageAspectRatio: imgRatio,
            height: newTotalH
          });
          selectElement(element.id);
          setActivePanel('device');
          showSnackbar('Capture d’écran enregistrée et appliquée', 'smartphone');
        };
        img.src = displayUrl;
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.handle-resize') || target.closest('.handle-rotate-anchor')) {
      return;
    }

    e.stopPropagation();

    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl) {
      selectElement(element.id, true);
      return;
    }

    if (!isSelected) {
      selectElement(element.id, false);
    }

    recordHistory();

    const startX = e.clientX;
    const startY = e.clientY;

    const idsToMove = isSelected && isMultiSelected
      ? state.selectedElementIds
      : [element.id];

    const initPositions = idsToMove.map(id => {
      const el = state.elements.find(item => item.id === id);
      return { id, x: el?.x || 0, y: el?.y || 0 };
    });

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / currentZoom;
      const dy = (moveEvent.clientY - startY) / currentZoom;

      initPositions.forEach(pos => {
        updateElement(pos.id, {
          x: Math.round(pos.x + dx),
          y: Math.round(pos.y + dy)
        });
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Dimensions & Rayons proportionnels à la taille du device (Boîtier -> Bordure -> Écran)
  const {
    effectiveBorderRadius: borderRadius,
    effectiveBodyThickness: bodyThickness,
    effectiveScreenBorderWidth: screenBorderWidth,
    effectiveBezelBorderRadius: bezelBorderRadius,
    effectiveInnerBorderRadius: innerBorderRadius,
    scale
  } = getDeviceEffectiveDimensions(element);

  // Effets d'ombre portée extérieure et de lueur (glow)
  const chassisBoxShadow = getCombinedBoxShadow(element.glow, element.shadow);

  // Texture métal brossé réaliste (traits verticaux en dégradé multi-points)
  const isBrushedMetal = element.brushedMetal ?? true;
  const brushedMetalOpacity = element.brushedMetalOpacity ?? 8;
  const brushedMetalPattern = getBrushedMetalBackground(brushedMetalOpacity);
  const brushedMetalStyle: React.CSSProperties = isBrushedMetal
    ? {
        backgroundImage: brushedMetalPattern,
        backgroundRepeat: 'repeat',
        backgroundSize: '80px 140px'
      }
    : {};

  const deviceType = element.deviceType || 'pixel-10';
  const showButtons = element.showButtons ?? true;
  const buttonColor = element.buttonColor || '#3a3f45';
  const showCamera = element.showCamera ?? true;
  const showHomeIndicator = element.showHomeIndicator ?? true;
  const homeIndicatorColor = element.homeIndicatorColor || 'rgba(255, 255, 255, 0.45)';
  const showFlare = element.showFlare ?? true;
  const flareColor = element.flareColor || 'rgba(255, 255, 255, 0.15)';
  const flareAngle = element.flareAngle ?? 135;
  const flareSpread = element.flareSpread ?? 50;
  const screenBorderColor = element.screenBorderColor || '#000000';

  const displayScreenUrl =
    (element.screenImageUrl ? assetManager.getDisplayUrl(element.screenImageUrl) : undefined) ||
    (element.screenImageUrl && loadedBundle?.assets ? resolveAsset(element.screenImageUrl, undefined, loadedBundle.assets) : undefined) ||
    element.screenImageUrl;

  // Dimensions de l'écran interne actif (sans le châssis ni le bezel)
  const totalScreenInset = bodyThickness + screenBorderWidth;
  const activeScreenWidth = Math.max(10, element.width - 2 * totalScreenInset);
  const activeScreenHeight = Math.max(10, element.height - 2 * totalScreenInset);

  // État local des dimensions naturelles pour un dimensionnement instantané dès le chargement
  const [screenNatDims, setScreenNatDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const effectiveImgRatio =
    screenNatDims.w && screenNatDims.h
      ? screenNatDims.w / screenNatDims.h
      : element.imageAspectRatio || 9 / 16;

  const screenFit = element.screenFit || 'cover';

  let imgRenderW = activeScreenWidth;
  let imgRenderH = activeScreenHeight;
  let imgRenderLeft = 0;
  let imgRenderTop = 0;

  if (screenFit === 'contain') {
    const screenRatio = activeScreenWidth / activeScreenHeight;
    if (effectiveImgRatio > screenRatio) {
      imgRenderW = activeScreenWidth;
      imgRenderH = Math.round(activeScreenWidth / effectiveImgRatio);
      imgRenderLeft = 0;
      imgRenderTop = Math.round((activeScreenHeight - imgRenderH) / 2);
    } else {
      imgRenderH = activeScreenHeight;
      imgRenderW = Math.round(activeScreenHeight * effectiveImgRatio);
      imgRenderTop = 0;
      imgRenderLeft = Math.round((activeScreenWidth - imgRenderW) / 2);
    }
  } else {
    // 'cover' avec centrage horizontal et alignement en haut (center top)
    const screenRatio = activeScreenWidth / activeScreenHeight;
    if (effectiveImgRatio > screenRatio) {
      imgRenderH = activeScreenHeight;
      imgRenderW = Math.round(activeScreenHeight * effectiveImgRatio);
      imgRenderTop = 0;
      imgRenderLeft = Math.round((activeScreenWidth - imgRenderW) / 2);
    } else {
      imgRenderW = activeScreenWidth;
      imgRenderH = Math.round(activeScreenWidth / effectiveImgRatio);
      imgRenderLeft = 0;
      imgRenderTop = 0;
    }
  }

  return (
    <div
      ref={nodeRef}
      id={`el-${element.id}`}
      className="absolute touch-none select-none"
      style={{
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation || 0}deg)`
      }}
      onPointerDown={handlePointerDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Conteneur global du device avec ses boutons physiques */}
      <div className="relative w-full h-full cursor-move">
        {/* ================= BOUTONS PHYSIQUES REALISTES PROPORTIONNELS ================= */}
        {showButtons && (() => {
          const btnThick = Math.max(2, 3.5 * scale);
          const btnInset = -Math.max(2, Math.round(3 * scale));
          return (
            <>
              {/* --- iPhone Pro Max : Boutons gauche (Action + Volume) & droite (Power) --- */}
              {deviceType === 'iphone-pro-max' && (
                <>
                  {/* Bouton Action (gauche) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${btnInset}px`,
                      top: '16%',
                      width: `${btnThick}px`,
                      height: `${Math.round(24 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `${Math.round(2 * scale)}px 0 0 ${Math.round(2 * scale)}px`,
                      boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.3), -1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Volume + (gauche) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${btnInset}px`,
                      top: '24%',
                      width: `${btnThick}px`,
                      height: `${Math.round(42 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `${Math.round(2 * scale)}px 0 0 ${Math.round(2 * scale)}px`,
                      boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.3), -1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Volume - (gauche) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${btnInset}px`,
                      top: '34%',
                      width: `${btnThick}px`,
                      height: `${Math.round(42 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `${Math.round(2 * scale)}px 0 0 ${Math.round(2 * scale)}px`,
                      boxShadow: 'inset 1px 0 1px rgba(255,255,255,0.3), -1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Bouton Power / Latéral (droite) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      right: `${btnInset}px`,
                      top: '25%',
                      width: `${btnThick}px`,
                      height: `${Math.round(66 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `0 ${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0`,
                      boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                </>
              )}

              {/* --- Pixel 10 : Boutons droite (Power en haut, Volume en bas) --- */}
              {deviceType === 'pixel-10' && (
                <>
                  {/* Bouton Power (droite haut) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      right: `${btnInset}px`,
                      top: '18%',
                      width: `${btnThick}px`,
                      height: `${Math.round(38 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `0 ${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0`,
                      boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Bouton Volume (droite bas) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      right: `${btnInset}px`,
                      top: '28%',
                      width: `${btnThick}px`,
                      height: `${Math.round(68 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `0 ${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0`,
                      boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                </>
              )}

              {/* --- Samsung Galaxy : Boutons droite (Volume en haut, Power en bas) --- */}
              {deviceType === 'samsung-galaxy' && (
                <>
                  {/* Bouton Volume (droite haut) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      right: `${btnInset}px`,
                      top: '19%',
                      width: `${btnThick}px`,
                      height: `${Math.round(64 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `0 ${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0`,
                      boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Bouton Power (droite bas) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      right: `${btnInset}px`,
                      top: '33%',
                      width: `${btnThick}px`,
                      height: `${Math.round(40 * scale)}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `0 ${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0`,
                      boxShadow: 'inset -1px 0 1px rgba(255,255,255,0.3), 1px 0 2px rgba(0,0,0,0.4)'
                    }}
                  />
                </>
              )}

              {/* --- Pixel Tab : Boutons sur la tranche supérieure --- */}
              {deviceType === 'pixel-tab' && (
                <>
                  {/* Bouton Power / Empreinte (haut gauche) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: `${btnInset}px`,
                      left: `${Math.round(38 * scale)}px`,
                      width: `${Math.round(36 * scale)}px`,
                      height: `${btnThick}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0 0`,
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 -1px 2px rgba(0,0,0,0.4)'
                    }}
                  />
                  {/* Boutons Volume (haut) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: `${btnInset}px`,
                      left: `${Math.round(84 * scale)}px`,
                      width: `${Math.round(58 * scale)}px`,
                      height: `${btnThick}px`,
                      backgroundColor: buttonColor,
                      borderRadius: `${Math.round(2 * scale)}px ${Math.round(2 * scale)}px 0 0`,
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 -1px 2px rgba(0,0,0,0.4)'
                    }}
                  />
                </>
              )}
            </>
          );
        })()}

        {/* ================= CHÂSSIS / COQUE EXTERNE (BODY COLOR + MÉTAL BROSSÉ) ================= */}
        <div
          className="device-chassis w-full h-full relative overflow-hidden"
          data-element-type="device"
          data-glow-enable={element.glow?.enable ? 'true' : 'false'}
          data-glow-color={element.glow?.color || ''}
          data-glow-blur={element.glow?.blur ?? 0}
          data-glow-x={element.glow?.x ?? 0}
          data-glow-y={element.glow?.y ?? 0}
          data-shadow-enable={element.shadow?.enable ? 'true' : 'false'}
          data-shadow-color={element.shadow?.color || ''}
          data-shadow-blur={element.shadow?.blur ?? 0}
          data-shadow-x={element.shadow?.x ?? 0}
          data-shadow-y={element.shadow?.y ?? 0}
          data-border-radius={borderRadius}
          data-shape-type="rounded-rect"
          data-width={element.width}
          data-height={element.height}
          style={{
            backgroundColor: element.bodyColor || '#1e2022',
            borderRadius: `${borderRadius}px`,
            padding: `${bodyThickness}px`,
            boxShadow: chassisBoxShadow,
            boxSizing: 'border-box'
          }}
        >
          {/* Calque de texture métal brossé (stries verticales dégradées multi-points) */}
          {isBrushedMetal && (
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: brushedMetalPattern,
                backgroundRepeat: 'repeat',
                backgroundSize: '80px 120px'
              }}
            />
          )}
          {/* Écouteur / Fente haut-parleur proportionnelle (Pixel & iPhone) */}
          {deviceType === 'pixel-10' && bodyThickness >= 3 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none z-20"
              style={{
                top: `${Math.max(1, Math.floor(bodyThickness / 2) - 1)}px`,
                width: `${Math.round(42 * scale)}px`,
                height: `${Math.max(1.5, Math.round(2 * scale))}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.25)'
              }}
            />
          )}

          {/* ================= BORDURE DE L'ÉCRAN / BEZEL (COULEUR DISTINCTE, DÉFAUT NOIRE) ================= */}
          <div
            className="w-full h-full relative z-10 overflow-hidden flex items-center justify-center"
            style={{
              borderRadius: `${bezelBorderRadius}px`,
              backgroundColor: screenBorderColor,
              padding: `${screenBorderWidth}px`,
              boxSizing: 'border-box'
            }}
          >
            {/* ================= ÉCRAN INTERNE ACTIF (IMAGE / DALLE) ================= */}
            <div
              className="w-full h-full relative overflow-hidden flex items-center justify-center"
              style={{
                borderRadius: `${innerBorderRadius}px`,
                backgroundColor: element.screenColor || '#05070a'
              }}
            >
              {/* Image de l'écran si présente (positionnement absolu pixel-perfect compatible html2canvas) */}
              {element.screenImageUrl ? (
                <img
                  src={displayScreenUrl}
                  alt="Capture d'écran"
                  className="absolute max-w-none max-h-none select-none pointer-events-none"
                  style={{
                    width: `${imgRenderW}px`,
                    height: `${imgRenderH}px`,
                    left: `${imgRenderLeft}px`,
                    top: `${imgRenderTop}px`
                  }}
                  draggable={false}
                  onLoad={e => {
                    const nw = e.currentTarget.naturalWidth;
                    const nh = e.currentTarget.naturalHeight;
                    if (nw && nh) {
                      setScreenNatDims({ w: nw, h: nh });
                      const imgRatio = nw / nh;
                      if (!element.imageAspectRatio || Math.abs(element.imageAspectRatio - imgRatio) > 0.001) {
                        updateElement(element.id, { imageAspectRatio: imgRatio });
                      }
                    }
                  }}
                />
              ) : (
                /* Fond d'attente stylisé si aucune capture n'est chargée */
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white/50 select-none">
                  <span className="material-symbols-rounded text-3xl mb-1 text-white/40">
                    {deviceType === 'pixel-tab' ? 'tablet_android' : 'smartphone'}
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide text-white/70">
                    {deviceType === 'pixel-10' && 'Pixel 10'}
                    {deviceType === 'iphone-pro-max' && 'iPhone Pro Max'}
                    {deviceType === 'samsung-galaxy' && 'Samsung Galaxy'}
                    {deviceType === 'pixel-tab' && 'Pixel Tab'}
                  </span>
                  <span className="text-[9px] text-white/40 mt-1">Glissez ou chargez une capture</span>
                </div>
              )}

              {/* ================= NOTCH / CAMERA FRONTALE (SANS REFLET NI LENTILLE) ================= */}
              {showCamera && (
                <>
                  {/* --- iPhone Pro Max : Dynamic Island pure noire sans reflet ni lentille --- */}
                  {deviceType === 'iphone-pro-max' && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                      style={{
                        top: '8px',
                        width: '74px',
                        height: '21px',
                        backgroundColor: '#000000',
                        borderRadius: '16px'
                      }}
                    />
                  )}

                  {/* --- Pixel 10 : Punch Hole pur noir sans reflet --- */}
                  {deviceType === 'pixel-10' && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-20 rounded-full pointer-events-none"
                      style={{
                        top: `${Math.round(10 * scale)}px`,
                        width: `${Math.round(11 * scale)}px`,
                        height: `${Math.round(11 * scale)}px`,
                        backgroundColor: '#000000'
                      }}
                    />
                  )}

                  {/* --- Samsung Galaxy : Fin poinçon pur noir sans reflet --- */}
                  {deviceType === 'samsung-galaxy' && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-20 rounded-full pointer-events-none"
                      style={{
                        top: `${Math.round(8 * scale)}px`,
                        width: `${Math.round(9 * scale)}px`,
                        height: `${Math.round(9 * scale)}px`,
                        backgroundColor: '#000000'
                      }}
                    />
                  )}

                  {/* --- Pixel Tab : Caméra discrète pure noire sans reflet --- */}
                  {deviceType === 'pixel-tab' && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-20 rounded-full pointer-events-none"
                      style={{
                        top: `${Math.round(5 * scale)}px`,
                        width: `${Math.round(7.5 * scale)}px`,
                        height: `${Math.round(7.5 * scale)}px`,
                        backgroundColor: '#000000'
                      }}
                    />
                  )}
                </>
              )}

              {/* ================= BARRE DE NAVIGATION (HOME INDICATOR) PARAMÉTRABLE ================= */}
              {showHomeIndicator && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10 rounded-full"
                  style={{
                    bottom: `${Math.round((deviceType === 'pixel-tab' ? 8 : 7) * scale)}px`,
                    width: `${Math.round((deviceType === 'pixel-tab' ? 120 : deviceType === 'iphone-pro-max' ? 92 : 78) * scale)}px`,
                    height: `${Math.max(2, Math.round(3 * scale))}px`,
                    backgroundColor: homeIndicatorColor
                  }}
                />
              )}

              {/* ================= FLARE (REFLET D'ÉCRAN PARAMÉTRABLE : COULEUR, ANGLE, ÉTENDUE) ================= */}
              {showFlare && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    background: `linear-gradient(${flareAngle}deg, ${flareColor} 0%, transparent ${flareSpread}%)`
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback visuel lors du survol par un fichier glissé */}
      {isDropTarget && (
        <div
          className="absolute -inset-2 rounded-[inherit] border-4 border-dashed border-m3-sys-primary bg-m3-sys-primary/25 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-3 text-center pointer-events-none shadow-2xl animate-pulse"
          style={{
            borderRadius: `${borderRadius + 8}px`
          }}
        >
          <span className="material-symbols-rounded text-4xl text-white mb-1 drop-shadow">
            add_photo_alternate
          </span>
          <span className="text-xs font-bold text-white bg-black/75 px-3 py-1 rounded-full shadow-lg">
            Déposer la capture d'écran
          </span>
        </div>
      )}

      {/* Poignées de redimensionnement et rotation */}
      {isSelected && !isMultiSelected && (
        <SelectionHandles element={element} elementRef={nodeRef} />
      )}
      {isSelected && isMultiSelected && (() => {
        const s = 1 / currentZoom;
        const offset = 4 * s;
        return (
          <>
            <div
              className="selection-ui-handle absolute border-dashed border-m3-sys-primary rounded-lg pointer-events-none z-30"
              style={{
                inset: `${-offset}px`,
                borderWidth: `${2 * s}px`,
                borderRadius: `${8 * s}px`
              }}
            />
            {selectionIndex !== undefined && (
              <div
                className="absolute z-40 bg-m3-sys-primary text-m3-sys-onPrimary text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm pointer-events-none"
                style={{
                  top: `${-offset}px`,
                  left: `${-offset}px`,
                  transform: `translate(-50%, -50%) scale(${s})`
                }}
              >
                {selectionIndex}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
