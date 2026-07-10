export const bodyPartColors = {
  head: '#ff9000',      // Orange-Gold
  chest: '#00f2fe',     // Cyan-Teal
  left_arm: '#ba55d3',  // Purple
  right_arm: '#ff8c00', // Pink/Orange
  left_leg: '#1e90ff',  // Electric Blue
  right_leg: '#8a2be2'  // Royal Violet
};

export const bodyPartGroups = {
  head: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  chest: [11, 12, 23, 24],
  left_arm: [11, 13, 15, 17, 19, 21],
  right_arm: [12, 14, 16, 18, 20, 22],
  left_leg: [23, 25, 27, 29, 31],
  right_leg: [24, 26, 28, 30, 32]
};

export function mapLandmarksToCoordinates(landmarks, width, height, visibilityThreshold = 0.5) {
  if (!landmarks) return {};

  const currentCoordinates = {};

  for (const [part, indices] of Object.entries(bodyPartGroups)) {
    const partLms = [];
    for (const idx of indices) {
      const lm = landmarks[idx];
      if (lm && lm.visibility >= visibilityThreshold) {
        const xPx = Math.round(lm.x * width);
        const yPx = Math.round(lm.y * height);
        partLms.push({ x: xPx, y: yPx });
      }
    }

    const minRequired = (part === 'head') ? 3 : 2;
    if (partLms.length < minRequired) {
      continue; // Body part not detected
    }

    const xs = partLms.map(pt => pt.x);
    const ys = partLms.map(pt => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boxW = maxX - minX;
    const boxH = maxY - minY;

    let x1, y1, x2, y2;

    // Apply specific anatomical padding offsets identical to the PulseVision backend
    if (part === 'head') {
      x1 = Math.round(minX - 0.2 * boxW);
      x2 = Math.round(maxX + 0.2 * boxW);
      y1 = Math.round(minY - 0.65 * boxH);
      y2 = Math.round(maxY + 0.25 * boxH);
    } else if (part === 'chest') {
      x1 = Math.round(minX - 0.15 * boxW);
      x2 = Math.round(maxX + 0.15 * boxW);
      y1 = Math.round(minY - 0.05 * boxH);
      y2 = Math.round(maxY + 0.05 * boxH);
    } else {
      const pad = Math.round(0.12 * Math.max(boxW, boxH));
      x1 = minX - pad;
      x2 = maxX + pad;
      y1 = minY - pad;
      y2 = maxY - pad;
    }

    // Clamp bounding box to frame size boundaries
    x1 = Math.max(0, Math.min(x1, width - 1));
    y1 = Math.max(0, Math.min(y1, height - 1));
    x2 = Math.max(0, Math.min(x2, width - 1));
    y2 = Math.max(0, Math.min(y2, height - 1));

    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);

    if (xMax > xMin && yMax > yMin) {
      currentCoordinates[part] = [xMin, yMin, xMax, yMax];
    }
  }

  return currentCoordinates;
}
