import { ColorRgba } from '../types';

export const ColorUtil = {
  parse(colorStr: string): ColorRgba {
    if (!colorStr) return { r: 0, g: 0, b: 0, a: 1, hex: '#000000' };
    colorStr = colorStr.trim();

    if (colorStr.startsWith('#')) {
      let h = colorStr.slice(1);
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      if (h.length === 6) {
        const r = parseInt(h.slice(0, 2), 16) || 0;
        const g = parseInt(h.slice(2, 4), 16) || 0;
        const b = parseInt(h.slice(4, 6), 16) || 0;
        return { r, g, b, a: 1, hex: '#' + h.slice(0, 6) };
      }
      if (h.length === 8) {
        const r = parseInt(h.slice(0, 2), 16) || 0;
        const g = parseInt(h.slice(2, 4), 16) || 0;
        const b = parseInt(h.slice(4, 6), 16) || 0;
        const a = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100;
        return { r, g, b, a, hex: '#' + h.slice(0, 6) };
      }
    }

    const match = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10) || 0);
      const g = Math.min(255, parseInt(match[2], 10) || 0);
      const b = Math.min(255, parseInt(match[3], 10) || 0);
      const a = match[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(match[4]))) : 1;
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      return { r, g, b, a, hex };
    }

    return { r: 0, g: 0, b: 0, a: 1, hex: '#000000' };
  },

  toRgbaString(r: number, g: number, b: number, a: number): string {
    const cleanA = Math.round(a * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${cleanA})`;
  },

  fromHexAndAlpha(hex: string, alpha: number): string {
    const { r, g, b } = this.parse(hex);
    return this.toRgbaString(r, g, b, alpha);
  }
};
