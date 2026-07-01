// Shape tools reuse the exact same sync protocol as freehand strokes
// (draw-start -> draw-end), just with pre-computed geometry instead of
// a hand-drawn point trail. Each shape becomes one or more "segments"
// (disconnected polylines) so an arrow's shaft and head can be drawn
// as one stroke object without a spurious connecting line.

export const SHAPE_TOOLS = ["line", "rect", "circle", "arrow"];

export function isShapeTool(tool) {
  return SHAPE_TOOLS.includes(tool);
}

export function shapeToSegments(tool, start, end) {
  if (tool === "rect") {
    const { x: x1, y: y1 } = start;
    const { x: x2, y: y2 } = end;
    return [[
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
      { x: x1, y: y1 },
    ]];
  }

  if (tool === "circle") {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2 || 1;
    const ry = Math.abs(end.y - start.y) / 2 || 1;
    const points = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      points.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
    }
    return [points];
  }

  if (tool === "arrow") {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = 16;
    const a1 = angle + Math.PI - Math.PI / 6.5;
    const a2 = angle + Math.PI + Math.PI / 6.5;
    const head1 = { x: end.x + headLen * Math.cos(a1), y: end.y + headLen * Math.sin(a1) };
    const head2 = { x: end.x + headLen * Math.cos(a2), y: end.y + headLen * Math.sin(a2) };
    return [[start, end], [end, head1], [end, head2]];
  }

  // "line" and fallback
  return [[start, end]];
}
