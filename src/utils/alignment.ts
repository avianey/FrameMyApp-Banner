import { CanvasElement } from '../types';

export type AlignReference = 'first' | 'last' | 'canvas';
export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type DistributeType = 'horizontal' | 'vertical';

export interface CanvasBounds {
  width: number;
  height: number;
}

export interface ElementAABB {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function getElementAABB(el: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}): ElementAABB {
  const w = el.width || 0;
  const h = el.height || 0;
  const centerX = el.x + w / 2;
  const centerY = el.y + h / 2;
  const rot = el.rotation || 0;
  if (!rot) {
    return {
      left: el.x,
      right: el.x + w,
      top: el.y,
      bottom: el.y + h,
      width: w,
      height: h,
      centerX,
      centerY
    };
  }
  const rad = (rot * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const aabbW = w * cos + h * sin;
  const aabbH = w * sin + h * cos;
  return {
    left: centerX - aabbW / 2,
    right: centerX + aabbW / 2,
    top: centerY - aabbH / 2,
    bottom: centerY + aabbH / 2,
    width: aabbW,
    height: aabbH,
    centerX,
    centerY
  };
}

export interface SnapGuides {
  x?: number;
  y?: number;
}

export function emitSnapGuides(guides: SnapGuides | null) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('framemyapp:snap-guides', { detail: guides }));
  }
}

export function computeSnapPosition(
  target: { id: string; x: number; y: number; width: number; height: number; rotation?: number },
  allElements: CanvasElement[],
  canvasBounds: CanvasBounds,
  threshold = 6
): { x: number; y: number; guides: SnapGuides } {
  const aabb = getElementAABB(target);
  const offsetLeft = aabb.left - target.x;
  const offsetRight = aabb.right - target.x;
  const offsetCenterX = aabb.centerX - target.x;
  const offsetTop = aabb.top - target.y;
  const offsetBottom = aabb.bottom - target.y;
  const offsetCenterY = aabb.centerY - target.y;

  const xTargets: number[] = [0, canvasBounds.width / 2, canvasBounds.width];
  const yTargets: number[] = [0, canvasBounds.height / 2, canvasBounds.height];

  for (const other of allElements) {
    if (other.id === target.id) continue;
    const ob = getElementAABB(other);
    xTargets.push(ob.left, ob.centerX, ob.right);
    yTargets.push(ob.top, ob.centerY, ob.bottom);
  }

  let bestDx = Infinity;
  let guideX: number | undefined;
  const candidateXs = [
    { val: aabb.left, offset: offsetLeft },
    { val: aabb.centerX, offset: offsetCenterX },
    { val: aabb.right, offset: offsetRight }
  ];

  for (const c of candidateXs) {
    for (const tx of xTargets) {
      const dist = Math.abs(c.val - tx);
      if (dist <= threshold && dist < Math.abs(bestDx)) {
        bestDx = tx - c.val;
        guideX = Math.round(tx);
      }
    }
  }

  let bestDy = Infinity;
  let guideY: number | undefined;
  const candidateYs = [
    { val: aabb.top, offset: offsetTop },
    { val: aabb.centerY, offset: offsetCenterY },
    { val: aabb.bottom, offset: offsetBottom }
  ];

  for (const c of candidateYs) {
    for (const ty of yTargets) {
      const dist = Math.abs(c.val - ty);
      if (dist <= threshold && dist < Math.abs(bestDy)) {
        bestDy = ty - c.val;
        guideY = Math.round(ty);
      }
    }
  }

  return {
    x: Math.round(target.x + (bestDx !== Infinity ? bestDx : 0)),
    y: Math.round(target.y + (bestDy !== Infinity ? bestDy : 0)),
    guides: { x: guideX, y: guideY }
  };
}

/**
 * Aligne les éléments sélectionnés selon le type d'alignement et la cible de référence,
 * en prenant en compte la boîte englobante orientée (AABB) si rotation !== 0.
 */
export function alignElements(
  elements: CanvasElement[],
  selectedIds: string[],
  alignType: AlignType,
  reference: AlignReference,
  canvasBounds: CanvasBounds
): CanvasElement[] {
  if (selectedIds.length === 0) return elements;

  const selectedSet = new Set(selectedIds);
  const selectedElements = selectedIds
    .map(id => elements.find(e => e.id === id))
    .filter((e): e is CanvasElement => e !== undefined);

  if (selectedElements.length === 0) return elements;

  const firstBox = getElementAABB(selectedElements[0]);
  const lastBox = getElementAABB(selectedElements[selectedElements.length - 1]);

  let targetX = 0;
  let targetCenterX = 0;
  let targetRight = 0;

  let targetY = 0;
  let targetCenterY = 0;
  let targetBottom = 0;

  if (reference === 'canvas') {
    targetX = 0;
    targetCenterX = canvasBounds.width / 2;
    targetRight = canvasBounds.width;

    targetY = 0;
    targetCenterY = canvasBounds.height / 2;
    targetBottom = canvasBounds.height;
  } else if (reference === 'first') {
    targetX = firstBox.left;
    targetCenterX = firstBox.centerX;
    targetRight = firstBox.right;

    targetY = firstBox.top;
    targetCenterY = firstBox.centerY;
    targetBottom = firstBox.bottom;
  } else {
    // 'last'
    targetX = lastBox.left;
    targetCenterX = lastBox.centerX;
    targetRight = lastBox.right;

    targetY = lastBox.top;
    targetCenterY = lastBox.centerY;
    targetBottom = lastBox.bottom;
  }

  return elements.map(el => {
    if (!selectedSet.has(el.id)) return el;

    const box = getElementAABB(el);
    let newX = el.x;
    let newY = el.y;

    switch (alignType) {
      case 'left':
        newX = Math.round(el.x + (targetX - box.left));
        break;
      case 'center-h':
        newX = Math.round(el.x + (targetCenterX - box.centerX));
        break;
      case 'right':
        newX = Math.round(el.x + (targetRight - box.right));
        break;
      case 'top':
        newY = Math.round(el.y + (targetY - box.top));
        break;
      case 'center-v':
        newY = Math.round(el.y + (targetCenterY - box.centerY));
        break;
      case 'bottom':
        newY = Math.round(el.y + (targetBottom - box.bottom));
        break;
    }

    return { ...el, x: newX, y: newY } as CanvasElement;
  });
}

/**
 * Répartit uniformément les éléments sélectionnés horizontalement ou verticalement.
 */
export function distributeElements(
  elements: CanvasElement[],
  selectedIds: string[],
  distributeType: DistributeType,
  reference: AlignReference,
  canvasBounds: CanvasBounds,
  customGap?: number
): CanvasElement[] {
  if (selectedIds.length < 2) return elements;

  const selectedElements = selectedIds
    .map(id => elements.find(e => e.id === id))
    .filter((e): e is CanvasElement => e !== undefined);

  if (selectedElements.length < 2) return elements;

  const firstElement = selectedElements[0];
  const lastElement = selectedElements[selectedElements.length - 1];

  const updates: Record<string, { x?: number; y?: number }> = {};

  if (distributeType === 'horizontal') {
    if (reference === 'canvas') {
      // Tri de gauche à droite
      const sorted = [...selectedElements].sort((a, b) => a.x - b.x);
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const count = sorted.length;

      if (customGap !== undefined && customGap >= 0) {
        const totalSpan = totalWidth + customGap * (count - 1);
        let curX = Math.round((canvasBounds.width - totalSpan) / 2);
        sorted.forEach(el => {
          updates[el.id] = { x: Math.round(curX) };
          curX += el.width + customGap;
        });
      } else {
        const available = canvasBounds.width - totalWidth;
        const gap = available / (count + 1);
        let curX = gap;
        sorted.forEach(el => {
          updates[el.id] = { x: Math.round(curX) };
          curX += el.width + gap;
        });
      }
    } else if (reference === 'first' && customGap !== undefined && customGap >= 0) {
      // Distribuer à partir du premier sélectionné avec un espacement fixe
      // Ordonner les autres éléments par leur x initial
      const otherElements = selectedElements
        .filter(el => el.id !== firstElement.id)
        .sort((a, b) => a.x - b.x);

      let curX = firstElement.x + firstElement.width + customGap;
      otherElements.forEach(el => {
        updates[el.id] = { x: Math.round(curX) };
        curX += el.width + customGap;
      });
    } else if (reference === 'last' && customGap !== undefined && customGap >= 0) {
      // Distribuer à gauche du dernier sélectionné avec un espacement fixe
      const otherElements = selectedElements
        .filter(el => el.id !== lastElement.id)
        .sort((a, b) => b.x - a.x); // De droite à gauche

      let curRight = lastElement.x - customGap;
      otherElements.forEach(el => {
        updates[el.id] = { x: Math.round(curRight - el.width) };
        curRight = curRight - el.width - customGap;
      });
    } else {
      // Espacement uniforme automatique entre les éléments extérieurs
      const sorted = [...selectedElements].sort((a, b) => a.x - b.x);
      const count = sorted.length;
      const minX = sorted[0].x;
      const maxX = sorted[count - 1].x + sorted[count - 1].width;
      const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
      const span = maxX - minX;
      const gap = count > 1 ? (span - totalWidth) / (count - 1) : 0;

      let curX = minX;
      sorted.forEach((el, index) => {
        if (index === 0) {
          updates[el.id] = { x: Math.round(minX) };
          curX += el.width + gap;
        } else if (index === count - 1) {
          updates[el.id] = { x: Math.round(maxX - el.width) };
        } else {
          updates[el.id] = { x: Math.round(curX) };
          curX += el.width + gap;
        }
      });
    }
  } else {
    // Vertical
    if (reference === 'canvas') {
      const sorted = [...selectedElements].sort((a, b) => a.y - b.y);
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const count = sorted.length;

      if (customGap !== undefined && customGap >= 0) {
        const totalSpan = totalHeight + customGap * (count - 1);
        let curY = Math.round((canvasBounds.height - totalSpan) / 2);
        sorted.forEach(el => {
          updates[el.id] = { y: Math.round(curY) };
          curY += el.height + customGap;
        });
      } else {
        const available = canvasBounds.height - totalHeight;
        const gap = available / (count + 1);
        let curY = gap;
        sorted.forEach(el => {
          updates[el.id] = { y: Math.round(curY) };
          curY += el.height + gap;
        });
      }
    } else if (reference === 'first' && customGap !== undefined && customGap >= 0) {
      const otherElements = selectedElements
        .filter(el => el.id !== firstElement.id)
        .sort((a, b) => a.y - b.y);

      let curY = firstElement.y + firstElement.height + customGap;
      otherElements.forEach(el => {
        updates[el.id] = { y: Math.round(curY) };
        curY += el.height + customGap;
      });
    } else if (reference === 'last' && customGap !== undefined && customGap >= 0) {
      const otherElements = selectedElements
        .filter(el => el.id !== lastElement.id)
        .sort((a, b) => b.y - a.y);

      let curBottom = lastElement.y - customGap;
      otherElements.forEach(el => {
        updates[el.id] = { y: Math.round(curBottom - el.height) };
        curBottom = curBottom - el.height - customGap;
      });
    } else {
      const sorted = [...selectedElements].sort((a, b) => a.y - b.y);
      const count = sorted.length;
      const minY = sorted[0].y;
      const maxY = sorted[count - 1].y + sorted[count - 1].height;
      const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
      const span = maxY - minY;
      const gap = count > 1 ? (span - totalHeight) / (count - 1) : 0;

      let curY = minY;
      sorted.forEach((el, index) => {
        if (index === 0) {
          updates[el.id] = { y: Math.round(minY) };
          curY += el.height + gap;
        } else if (index === count - 1) {
          updates[el.id] = { y: Math.round(maxY - el.height) };
        } else {
          updates[el.id] = { y: Math.round(curY) };
          curY += el.height + gap;
        }
      });
    }
  }

  return elements.map(el => {
    if (updates[el.id]) {
      return { ...el, ...updates[el.id] } as CanvasElement;
    }
    return el;
  });
}
