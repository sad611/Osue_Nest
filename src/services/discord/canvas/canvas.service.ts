import { Injectable } from '@nestjs/common';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { ColorService } from '../color/color.service';

@Injectable()
export class CanvasService {
  constructor(private readonly colorService: ColorService) {
    registerFont('./src/assets/OpenSans-Regular.ttf', { family: 'OpenSans' });
  }

  async createColorNamesImage(roles: any) {
    const colorRoles = roles.map(({ role }) => ({ name: role.name, hex: role.hex }));
    const canvasWidth = 1600;
    const canvasHeight = 600;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const background = await loadImage('./src/assets/canvas.png');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const fontSize = 48;
    const lineHeight = 28;
    const marginLateral = 64;
    const marginVertical = 28;
    ctx.font = `${fontSize}px OpenSans`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const colorsPerColumn = 10;
    const columns = 3;

    const columnWidth = canvasWidth / columns;

    for (let i = 0; i < colorRoles.length; i++) {
      const color = colorRoles[i];
      const columnIndex = i % columns; // Calculate the column index based on the current color index

      // Calculate the row index within the column
      const rowIndex = Math.floor(i / columns) % colorsPerColumn;

      const x = marginLateral + columnIndex * columnWidth; // Adjust the x-coordinate based on the column index
      const y = marginVertical + rowIndex * 2 * lineHeight; // Adjust the y-coordinate based on the row index
      const [r, g, b] = this.colorService.hexToRGB(color.hex);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillText(`${i + 1}. ${color.name}`, x, y);
    }

    const file = canvas.toBuffer();
    return file;
  }
}
