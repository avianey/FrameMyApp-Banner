import React, { useState, useEffect, useRef } from 'react';
import { computeImageCropGeometry, clampImageOffset, applyRubberBandOffset } from '../../utils/imageCropHelper';

export interface InPlaceImageCropperProps {
  containerWidth: number;
  containerHeight: number;
  imageUrl: string;
  imageFit?: 'cover' | 'contain' | 'auto';
  imageScale?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  isEditing: boolean;
  onUpdate: (updates: {
    imageScale?: number;
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageNaturalWidth?: number;
    imageNaturalHeight?: number;
  }) => void;
  canvasZoom: number;
  borderRadius?: string | number;
  clipPath?: string;
  imageBlur?: number;
}

export const InPlaceImageCropper: React.FC<InPlaceImageCropperProps> = ({
  containerWidth,
  containerHeight,
  imageUrl,
  imageFit = 'cover',
  imageScale = 1.0,
  imageOffsetX = 0,
  imageOffsetY = 0,
  imageNaturalWidth,
  imageNaturalHeight,
  isEditing,
  onUpdate,
  canvasZoom = 1.0,
  borderRadius = 0,
  clipPath = 'none',
  imageBlur
}) => {
  const [natWidth, setNatWidth] = useState<number>(imageNaturalWidth || 0);
  const [natHeight, setNatHeight] = useState<number>(imageNaturalHeight || 0);

  // Local drag and spring state for smooth elastic feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isSpringing, setIsSpringing] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: imageOffsetX, y: imageOffsetY });
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Sync natural dimensions if prop changes or on image load
  useEffect(() => {
    if (imageNaturalWidth && imageNaturalHeight) {
      setNatWidth(imageNaturalWidth);
      setNatHeight(imageNaturalHeight);
    }
  }, [imageNaturalWidth, imageNaturalHeight]);

  // Synchronise le dragOffset lorsque imageOffsetX/Y change depuis l'extérieur (hors drag)
  useEffect(() => {
    if (!isDragging) {
      setDragOffset({ x: imageOffsetX, y: imageOffsetY });
    }
  }, [imageOffsetX, imageOffsetY, isDragging]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const nw = e.currentTarget.naturalWidth;
    const nh = e.currentTarget.naturalHeight;
    if (nw && nh && (nw !== natWidth || nh !== natHeight)) {
      setNatWidth(nw);
      setNatHeight(nh);
      if (!imageNaturalWidth || !imageNaturalHeight) {
        onUpdate({ imageNaturalWidth: nw, imageNaturalHeight: nh });
      }
    }
  };

  const currentScale = Math.max(imageFit === 'cover' ? 1.0 : 0.1, imageScale);

  // Calcul géométrique
  const geom = computeImageCropGeometry(
    containerWidth,
    containerHeight,
    natWidth,
    natHeight,
    currentScale,
    dragOffset.x,
    dragOffset.y,
    imageFit
  );

  // Pointer down : démarre le déplacement de l'image
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setIsSpringing(false);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: dragOffset.x,
      initY: dragOffset.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Pointer move : applique la résistance élastique si l'utilisateur tire au-delà des limites
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.startX) / canvasZoom;
    const dy = (e.clientY - dragStartRef.current.startY) / canvasZoom;

    const rawX = dragStartRef.current.initX + dx;
    const rawY = dragStartRef.current.initY + dy;

    // Déformation élastique en direct
    const { displayOffsetX, displayOffsetY } = applyRubberBandOffset(
      rawX,
      rawY,
      geom.maxOffsetX,
      geom.maxOffsetY,
      0.25
    );

    setDragOffset({ x: displayOffsetX, y: displayOffsetY });
  };

  // Pointer up : déclenche le retour élastique vers le bord strict et sauvegarde
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    const dx = (e.clientX - dragStartRef.current.startX) / canvasZoom;
    const dy = (e.clientY - dragStartRef.current.startY) / canvasZoom;
    const rawX = dragStartRef.current.initX + dx;
    const rawY = dragStartRef.current.initY + dy;

    // Bornage strict sur les bords du conteneur
    const clamped = clampImageOffset(rawX, rawY, geom.maxOffsetX, geom.maxOffsetY);

    // Déclenche l'animation de retour élastique si l'image dépassait
    if (dragOffset.x !== clamped.offsetX || dragOffset.y !== clamped.offsetY) {
      setIsSpringing(true);
      setDragOffset(clamped);
      setTimeout(() => setIsSpringing(false), 300);
    } else {
      setDragOffset(clamped);
    }

    dragStartRef.current = null;
    onUpdate({ imageOffsetX: clamped.offsetX, imageOffsetY: clamped.offsetY });
  };

  const cropperRef = useRef<HTMLDivElement>(null);

  // Écouteur molette natif non-passif pour interdire le zoom de la scène et zoomer avec le curseur comme point fixe invariant
  useEffect(() => {
    if (!isEditing) return;
    const el = cropperRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const localCursorX = (e.clientX - rect.left) / canvasZoom;
      const localCursorY = (e.clientY - rect.top) / canvasZoom;

      const safeNatW = natWidth > 0 ? natWidth : containerWidth;
      const safeNatH = natHeight > 0 ? natHeight : containerHeight;

      let baseScale: number;
      if (imageFit === 'contain') {
        baseScale = Math.min(containerWidth / safeNatW, containerHeight / safeNatH);
      } else {
        baseScale = Math.max(containerWidth / safeNatW, containerHeight / safeNatH);
      }
      const baseW = safeNatW * baseScale;
      const baseH = safeNatH * baseScale;

      const currentEffectiveScale = Math.max(imageFit === 'cover' ? 1.0 : 0.1, imageScale);
      const currentRenderW = baseW * currentEffectiveScale;
      const currentRenderH = baseH * currentEffectiveScale;
      const currentCenterLeft = (containerWidth - currentRenderW) / 2;
      const currentCenterTop = (containerHeight - currentRenderH) / 2;
      const currentImgLeft = currentCenterLeft + dragOffset.x;
      const currentImgTop = currentCenterTop + dragOffset.y;

      // Fraction de position du curseur sur l'image courante (point fixe)
      const fractionX = currentRenderW > 0 ? (localCursorX - currentImgLeft) / currentRenderW : 0.5;
      const fractionY = currentRenderH > 0 ? (localCursorY - currentImgTop) / currentRenderH : 0.5;

      // Facteur de zoom
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const minScale = imageFit === 'cover' ? 1.0 : 0.1;
      const nextScale = Math.round(Math.max(minScale, Math.min(5.0, currentEffectiveScale * zoomFactor)) * 100) / 100;

      // Nouvelle taille de rendu
      const newRenderW = baseW * nextScale;
      const newRenderH = baseH * nextScale;
      const newCenterLeft = (containerWidth - newRenderW) / 2;
      const newCenterTop = (containerHeight - newRenderH) / 2;

      // Pour que le point sous la souris reste invariant :
      const targetImgLeft = localCursorX - fractionX * newRenderW;
      const targetImgTop = localCursorY - fractionY * newRenderH;

      const targetOffsetX = targetImgLeft - newCenterLeft;
      const targetOffsetY = targetImgTop - newCenterTop;

      // Bornage strict pour que l'image recouvre toujours intégralement le conteneur
      const maxOffsetX = imageFit === 'cover' ? Math.max(0, (newRenderW - containerWidth) / 2) : Infinity;
      const maxOffsetY = imageFit === 'cover' ? Math.max(0, (newRenderH - containerHeight) / 2) : Infinity;

      const clamped = clampImageOffset(targetOffsetX, targetOffsetY, maxOffsetX, maxOffsetY);

      // Si le bord a été réajusté pour éviter un trou, retour élastique fluide
      if (clamped.offsetX !== targetOffsetX || clamped.offsetY !== targetOffsetY || nextScale === minScale) {
        setIsSpringing(true);
        setDragOffset(clamped);
        setTimeout(() => setIsSpringing(false), 250);
      } else {
        setDragOffset(clamped);
      }

      onUpdate({
        imageScale: nextScale,
        imageOffsetX: clamped.offsetX,
        imageOffsetY: clamped.offsetY
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [isEditing, canvasZoom, containerWidth, containerHeight, natWidth, natHeight, imageFit, imageScale, dragOffset, onUpdate]);

  const imgLeft = geom.centerLeft + dragOffset.x;
  const imgTop = geom.centerTop + dragOffset.y;

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        clipPath
      }}
    >
      {/* Élément d'image rendu avec positionnement absolu pixel-perfect (compatible html2canvas) */}
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        onLoad={handleImageLoad}
        data-image-blur={imageBlur && imageBlur > 0 ? imageBlur : undefined}
        className="absolute max-w-none max-h-none select-none pointer-events-none"
        style={{
          width: `${geom.renderW}px`,
          height: `${geom.renderH}px`,
          left: `${imgLeft}px`,
          top: `${imgTop}px`,
          filter: imageBlur && imageBlur > 0 ? `blur(${imageBlur}px)` : undefined,
          transform: imageBlur && imageBlur > 0 ? 'scale(1.04)' : undefined,
          transition: isSpringing ? 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
        }}
      />

      {/* Mode interactif d'ajustement */}
      {isEditing && (
        <div
          ref={cropperRef}
          className={`absolute inset-0 z-30 touch-none select-none transition-colors border-2 border-indigo-500/80 ${
            isDragging ? 'cursor-grabbing bg-indigo-500/10' : 'cursor-grab bg-indigo-500/5 hover:bg-indigo-500/10'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      )}
    </div>
  );
};
