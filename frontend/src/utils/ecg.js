export function generateEcgPoints(length = 40, ecgBaseline = null) {
  const points = [];
  for (let i = 0; i < length; i++) {
    const base = ecgBaseline?.[i % (ecgBaseline?.length || 1)] ?? 50;
    const spike = i % 8 === 3 ? 90 : i % 8 === 4 ? 20 : base + Math.sin(i * 0.5) * 8;
    points.push({ x: i, y: spike + Math.random() * 5 });
  }
  return points;
}

export function ecgArrayToChartPoints(ecgPoints) {
  if (!ecgPoints?.length) return null;
  return ecgPoints.map((y, x) => ({ x, y }));
}
