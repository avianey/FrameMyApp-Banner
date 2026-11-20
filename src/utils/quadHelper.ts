import { QuadPoint, QuadPoints } from '../types';

export const DEFAULT_QUAD_POINTS: QuadPoints = {
  tl: { x: 0, y: 0 },
  tr: { x: 1, y: 0 },
  br: { x: 1, y: 1 },
  bl: { x: 0, y: 1 }
};

export const INITIAL_QUAD_PERSPECTIVE_POINTS: QuadPoints = {
  tl: { x: 0.1, y: 0.06 },
  tr: { x: 0.9, y: 0.06 },
  br: { x: 1, y: 0.94 },
  bl: { x: 0, y: 0.94 }
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundCoord(value: number): number {
  return Math.round(clamp01(value) * 10000) / 10000;
}

export function getEffectiveQuadPoints(quadPoints?: Partial<QuadPoints>): QuadPoints {
  return {
    tl: {
      x: quadPoints?.tl?.x !== undefined ? roundCoord(quadPoints.tl.x) : DEFAULT_QUAD_POINTS.tl.x,
      y: quadPoints?.tl?.y !== undefined ? roundCoord(quadPoints.tl.y) : DEFAULT_QUAD_POINTS.tl.y
    },
    tr: {
      x: quadPoints?.tr?.x !== undefined ? roundCoord(quadPoints.tr.x) : DEFAULT_QUAD_POINTS.tr.x,
      y: quadPoints?.tr?.y !== undefined ? roundCoord(quadPoints.tr.y) : DEFAULT_QUAD_POINTS.tr.y
    },
    br: {
      x: quadPoints?.br?.x !== undefined ? roundCoord(quadPoints.br.x) : DEFAULT_QUAD_POINTS.br.x,
      y: quadPoints?.br?.y !== undefined ? roundCoord(quadPoints.br.y) : DEFAULT_QUAD_POINTS.br.y
    },
    bl: {
      x: quadPoints?.bl?.x !== undefined ? roundCoord(quadPoints.bl.x) : DEFAULT_QUAD_POINTS.bl.x,
      y: quadPoints?.bl?.y !== undefined ? roundCoord(quadPoints.bl.y) : DEFAULT_QUAD_POINTS.bl.y
    }
  };
}

export function quadPointsToClipPath(quadPoints: QuadPoints): string {
  const { tl, tr, br, bl } = quadPoints;
  const pct = (v: number) => `${Math.round(v * 10000) / 100}%`;
  return `polygon(${pct(tl.x)} ${pct(tl.y)}, ${pct(tr.x)} ${pct(tr.y)}, ${pct(br.x)} ${pct(br.y)}, ${pct(bl.x)} ${pct(bl.y)})`;
}

export function quadPointsToSvgPoints(quadPoints: QuadPoints, width: number, height: number): string {
  const { tl, tr, br, bl } = quadPoints;
  const pts: QuadPoint[] = [tl, tr, br, bl];
  return pts.map(p => `${p.x * width},${p.y * height}`).join(' ');
}

/**
 * Vérifie que les 4 sommets (tl -> tr -> br -> bl en repère écran Y vers le bas)
 * forment un quadrilatère strictement convexe non replié.
 */
export function isConvexQuad(quadPoints: QuadPoints, minArea: number = 1e-4): boolean {
  const pts = [quadPoints.tl, quadPoints.tr, quadPoints.br, quadPoints.bl];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const c = pts[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross <= minArea) {
      return false;
    }
  }
  return true;
}

/**
 * Résout un système linéaire A * x = b (8x8) par élimination de Gauss avec pivot partiel.
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = row;
      }
    }

    if (maxVal < 1e-12) {
      return null;
    }

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (factor === 0) continue;
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map(row => row[n]);
}

/**
 * Calcule la matrice d'homographie projective 3x3 mappant les 4 coins du rectangle
 * (0,0), (width,0), (width,height), (0,height) vers (tl, tr, br, bl) en pixels.
 * Retourne les 9 coefficients [h11, h12, h13, h21, h22, h23, h31, h32, 1] ou null si dégénéré.
 */
export function computeHomographyMatrix(
  width: number,
  height: number,
  quadPoints: QuadPoints
): number[] | null {
  if (width <= 0 || height <= 0) return null;

  const src: [number, number][] = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ];
  const dst: [number, number][] = [
    [quadPoints.tl.x * width, quadPoints.tl.y * height],
    [quadPoints.tr.x * width, quadPoints.tr.y * height],
    [quadPoints.br.x * width, quadPoints.br.y * height],
    [quadPoints.bl.x * width, quadPoints.bl.y * height]
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinearSystem8x8(A, b);
  if (!h || h.some(val => !Number.isFinite(val))) {
    return null;
  }

  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * Retourne une chaîne CSS `matrix3d(...)` (à utiliser avec `transform-origin: 0 0`)
 * qui projette les 4 coins d'un élément width x height dans les 4 angles du quadrilatère.
 */
export function computePerspectiveMatrix3d(
  width: number,
  height: number,
  quadPoints: QuadPoints
): string | null {
  const h = computeHomographyMatrix(width, height, quadPoints);
  if (!h) return null;

  const [h11, h12, h13, h21, h22, h23, h31, h32] = h;
  const fmt = (val: number) => {
    if (Math.abs(val) < 1e-12) return '0';
    return Number(val.toFixed(10)).toString();
  };

  // CSS matrix3d est en ordre colonne-majeur (column-major)
  const values = [
    h11, h21, 0, h31,
    h12, h22, 0, h32,
    0,   0,   1, 0,
    h13, h23, 0, 1
  ];

  return `matrix3d(${values.map(fmt).join(', ')})`;
}
