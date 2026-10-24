import { CANVAS_COLUMNS, CANVAS_ROW_HEIGHT, CANVAS_MAX_ROWS, validatePlacement } from './geometry.js';

// Only this module knows GridStack. Widget content remains ordinary DOM.
export function createCanvasAdapter(element, { engine = globalThis.GridStack, onChange = () => {} } = {}) {
  if (!engine) throw new Error('The packaged canvas engine is unavailable.');
  const grid = engine.init({
    column: CANVAS_COLUMNS,
    cellHeight: CANVAS_ROW_HEIGHT,
    margin: 6,
    maxRow: CANVAS_MAX_ROWS,
    mode: 'float',
    animate: false,
    handle: '.canvas-move-handle',
    resizable: { handles: 'se' },
    disableDrag: true,
    disableResize: true,
  }, element);
  const elements = new Map();
  let restoring = false, destroyed = false;

  function assertAlive() {
    if (destroyed) throw new Error('This canvas has been destroyed.');
  }

  function serialize() {
    assertAlive();
    // GridStack omits sizes equal to one or the declared minimum in saved data.
    return validatePlacement(grid.save(false).map(({ id, x = 0, y = 0, w, h, minW, minH, locked }) => ({ id, x, y, w: w ?? minW ?? 1, h: h ?? minH ?? 1, minW, minH, ...(locked ? { locked: true } : {}) })));
  }

  grid.on('change', () => { if (!restoring) onChange(serialize()); });

  return {
    mount(node, geometry) {
      assertAlive();
      const layout = validatePlacement([...serialize(), geometry]);
      const item = layout.at(-1);
      restoring = true;
      try {
        node.classList.add('grid-stack-item');
        element.append(node);
        grid.makeWidget(node, item);
        elements.set(item.id, node);
      } finally { restoring = false; }
    },
    remove(id) {
      assertAlive();
      const node = elements.get(id);
      if (!node) return;
      restoring = true;
      try { grid.removeWidget(node); elements.delete(id); }
      finally { restoring = false; }
    },
    serialize,
    restore(items) {
      assertAlive();
      const layout = validatePlacement(items);
      if (layout.length !== elements.size || layout.some(item => !elements.has(item.id))) {
        throw new Error('Mount the matching widget instances before restoring geometry.');
      }
      restoring = true;
      try { grid.load(layout, false); }
      finally { restoring = false; }
    },
    update(id, geometry) {
      assertAlive();
      const node = elements.get(id);
      if (!node) throw new Error('Widget not found.');
      const current = serialize().find(item => item.id === id);
      if (current.locked) throw new Error('Unlock this widget before moving or resizing it.');
      // Only geometry is accepted; never pass content or arbitrary options to the engine.
      const next = { ...current, x: geometry.x ?? current.x, y: geometry.y ?? current.y, w: geometry.w ?? current.w, h: geometry.h ?? current.h };
      // GridStack resolves collisions by pushing neighbours downward without packing gaps.
      validatePlacement([next]);
      grid.update(node, { ...next, locked: current.locked === true });
    },
    setLocked(id, locked) {
      assertAlive();
      const node = elements.get(id);
      if (!node) throw new Error('Widget not found.');
      grid.update(node, { locked: Boolean(locked) });
    },
    setEditing(enabled) {
      assertAlive();
      grid.enableMove(Boolean(enabled));
      grid.enableResize(Boolean(enabled));
      element.classList.toggle('canvas-editing', Boolean(enabled));
    },
    destroy() {
      if (destroyed) return;
      grid.off('change');
      grid.destroy(false);
      elements.clear();
      destroyed = true;
    },
  };
}
