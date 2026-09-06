import { ColorRgba } from '../types';

export const ColorUtil = {
  parse(colorStr: string): ColorRgba {
    if (!colorStr) return { r: 0, g: 0, b: 0, a: 1, hex: '#000000' };
    colorStr = colorStr.trim();

    // Check if hex with or without leading '#'
    let hexClean = colorStr.startsWith('#') ? colorStr.slice(1) : (colorStr.match(/^[0-9a-fA-F]{3,8}$/) ? colorStr : null);

    if (hexClean) {
      if (hexClean.length === 3) {
        hexClean = hexClean.split('').map(c => c + c).join('') + 'ff';
      } else if (hexClean.length === 4) {
        hexClean = hexClean.split('').map(c => c + c).join('');
      } else if (hexClean.length === 6) {
        hexClean = hexClean + 'ff';
      }

      if (hexClean.length === 8) {
        const r = parseInt(hexClean.slice(0, 2), 16) || 0;
        const g = parseInt(hexClean.slice(2, 4), 16) || 0;
        const b = parseInt(hexClean.slice(4, 6), 16) || 0;
        const a = Math.round((parseInt(hexClean.slice(6, 8), 16) / 255) * 100) / 100;
        const baseHex = '#' + hexClean.slice(0, 6).toUpperCase();
        return { r, g, b, a, hex: baseHex };
      }
    }

    const match = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10) || 0);
      const g = Math.min(255, parseInt(match[2], 10) || 0);
      const b = Math.min(255, parseInt(match[3], 10) || 0);
      const a = match[4] !== undefined ? Math.max(0, Math.min(1, parseFloat(match[4]))) : 1;
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      return { r, g, b, a, hex };
    }

    return { r: 0, g: 0, b: 0, a: 1, hex: '#000000' };
  },

  toRgbaString(r: number, g: number, b: number, a: number): string {
    const cleanA = Math.round(a * 100) / 100;
    return `rgba(${r}, ${g}, ${b}, ${cleanA})`;
  },

  toHex8String(r: number, g: number, b: number, a: number): string {
    const rHex = Math.min(255, Math.max(0, Math.round(r))).toString(16).padStart(2, '0');
    const gHex = Math.min(255, Math.max(0, Math.round(g))).toString(16).padStart(2, '0');
    const bHex = Math.min(255, Math.max(0, Math.round(b))).toString(16).padStart(2, '0');
    const aHex = Math.min(255, Math.max(0, Math.round(a * 255))).toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}${aHex}`.toUpperCase();
  },

  colorToHex8(colorStr: string): string {
    const { r, g, b, a } = this.parse(colorStr);
    return this.toHex8String(r, g, b, a);
  },

  fromHexAndAlpha(hex: string, alpha: number): string {
    const { r, g, b } = this.parse(hex);
    return this.toRgbaString(r, g, b, alpha);
  },

  isValidHex(str: string): boolean {
    const s = str.trim().replace(/^#/, '');
    return /^[0-9a-fA-F]{3,8}$/.test(s) && [3, 4, 6, 8].includes(s.length);
  }
};
