import { Injectable } from '@nestjs/common';

@Injectable()
export class ColorService {
  hexToRGB(hex: string): [number, number, number] {
    if (!this.isValidHex(hex)) return undefined;
    hex = hex.replace(/^#/, '');

    // Parse the hex values to separate R, G, and B values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
  }

  isValidHex(hex: string): boolean {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    return hexRegex.test(hex);
  }
}
