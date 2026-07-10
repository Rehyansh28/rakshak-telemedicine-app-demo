import { bodyPartColors } from './CoordinateMapper';

// Helper: Convert HEX color to RGBA string for canvas overlay
function hexToRgba(hex, alpha) {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return `rgba(0, 242, 254, ${alpha})`;
}

export function drawPose(ctx, coordinates, selectedBodyPart) {
  if (!ctx || !coordinates) return;

  for (const [part, bbox] of Object.entries(coordinates)) {
    const xMin = bbox[0];
    const yMin = bbox[1];
    const xMax = bbox[2];
    const yMax = bbox[3];
    const color = bodyPartColors[part] || '#00f2fe';

    const isSelected = part === selectedBodyPart;

    // 1. Draw Translucent Fill overlay (higher opacity if selected)
    ctx.fillStyle = hexToRgba(color, isSelected ? 0.28 : 0.12);
    ctx.fillRect(xMin, yMin, xMax - xMin, yMax - yMin);

    // 2. Draw Bounding Box Border line
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 4 : 2;
    ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);

    // If selected, draw glowing outer overlay
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
      ctx.restore();
    }

    // 3. Draw Label badge header
    const labelText = part.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    ctx.font = 'bold 10px sans-serif';

    const textMetrics = ctx.measureText(labelText);
    const textW = textMetrics.width;
    const textH = 10;

    let bgY1, textY;
    if (yMin - textH - 10 > 0) {
      bgY1 = yMin - textH - 10;
      textY = yMin - 6;
    } else {
      bgY1 = yMin;
      textY = yMin + textH + 4;
    }

    ctx.fillStyle = color;
    ctx.fillRect(xMin, bgY1, textW + 10, textH + 8);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, xMin + 5, textY);
  }
}
