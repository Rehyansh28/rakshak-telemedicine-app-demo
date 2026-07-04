export const organColors = {
  brain: '#ff5e97',     // Pinkish Red
  heart: '#ff3838',     // Crimson Red
  left_lung: '#00d2ff', // Cyan/electric blue
  right_lung: '#00d2ff',
  liver: '#c54a4a',     // Brownish red
  stomach: '#ffd32a'    // Amber gold
};

export const organRelativeBoxes = {
  brain: { parent: 'head', rx: 0.25, ry: 0.15, rw: 0.5, rh: 0.55 },
  heart: { parent: 'chest', rx: 0.43, ry: 0.22, rw: 0.14, rh: 0.16 },
  left_lung: { parent: 'chest', rx: 0.53, ry: 0.15, rw: 0.22, rh: 0.35 },
  right_lung: { parent: 'chest', rx: 0.25, ry: 0.15, rw: 0.22, rh: 0.35 },
  liver: { parent: 'chest', rx: 0.25, ry: 0.52, rw: 0.23, rh: 0.15 },
  stomach: { parent: 'chest', rx: 0.48, ry: 0.52, rw: 0.25, rh: 0.18 }
};

export function getOrganCoordinates(parentCoordinates) {
  if (!parentCoordinates) return {};
  const organCoords = {};
  for (const [organId, config] of Object.entries(organRelativeBoxes)) {
    const parentBox = parentCoordinates[config.parent];
    if (parentBox) {
      const [px1, py1, px2, py2] = parentBox;
      const p_w = px2 - px1;
      const p_h = py2 - py1;
      const x1 = Math.round(px1 + config.rx * p_w);
      const y1 = Math.round(py1 + config.ry * p_h);
      const x2 = Math.round(x1 + config.rw * p_w);
      const y2 = Math.round(y1 + config.rh * p_h);
      organCoords[organId] = [x1, y1, x2, y2];
    }
  }
  return organCoords;
}
