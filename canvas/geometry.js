// Desktop coordinates are integer cells: 12 columns and 72px rows.
export const CANVAS_COLUMNS = 12;
export const CANVAS_ROW_HEIGHT = 72;
export const CANVAS_MAX_ROWS = 1000;

export function validateLayout(items) {
  if (!Array.isArray(items) || items.length > 100) throw new Error('A canvas supports up to 100 widgets.');
  const ids = new Set();
  return items.map(item => {
    if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 128 || ids.has(item.id)) {
      throw new Error('Widget IDs must be unique, non-empty strings.');
    }
    ids.add(item.id);
    const { x, y, w, h } = item;
    if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > CANVAS_COLUMNS || y + h > CANVAS_MAX_ROWS) {
      throw new Error(`Invalid geometry for ${item.id}.`);
    }
    const minW = item.minW ?? 1, minH = item.minH ?? 1;
    if (item.locked !== undefined && typeof item.locked !== 'boolean') throw new Error(`Invalid lock state for ${item.id}.`);
    if (![minW, minH].every(Number.isInteger) || minW < 1 || minH < 1 || w < minW || h < minH) {
      throw new Error(`Invalid minimum size for ${item.id}.`);
    }
    return { id: item.id, x, y, w, h, minW, minH, ...(item.locked === true ? { locked: true } : {}) };
  });
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function validatePlacement(items) {
  const layout = validateLayout(items);
  for (let i = 0; i < layout.length; i++) {
    if (layout.slice(i + 1).some(item => overlaps(layout[i], item))) throw new Error('Widgets cannot overlap.');
  }
  return layout;
}
