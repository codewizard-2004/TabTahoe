import { createCanvasAdapter } from '../../canvas/adapter.js';
import { validatePlacement } from '../../canvas/geometry.js';
import { createWidgetRegistry } from '../../widgets/registry.js';
import { createWidgetRuntime } from '../../widgets/runtime.js';

const registry = createWidgetRegistry();
const stats = { ticks: {}, destroyed: [], errors: [], resizes: {} };
registry.register({
  type: 'fixture-clock', version: 1, title: 'Local clock', description: 'Independent clock settings and lifecycle.',
  defaultSize: { w: 3, h: 3 }, minimumSize: { w: 2, h: 3 },
  capabilities: { duplicate: true, settings: true },
  settings: { title: { type: 'string', default: 'Local time', maxLength: 40 }, hour24: { type: 'boolean', default: false } },
  mount(context) {
    const { element, scope, instance, state } = context;
    const time = document.createElement('p');
    time.className = 'fixture-time';
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = instance.settings.hour24;
    label.append(input, document.createTextNode('24-hour clock'));
    element.append(time, label);
    state.render = () => {
      time.textContent = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !context.instance.settings.hour24 }).format(new Date());
      stats.ticks[instance.id] = (stats.ticks[instance.id] || 0) + 1;
    };
    scope.listen(input, 'change', () => {
      const current = instances.get(instance.id);
      current.settings.hour24 = input.checked;
      handles.get(instance.id).update(current.settings);
    });
    state.render();
    scope.interval(state.render, 1000);
  },
  update({ state }) { state.render(); },
  resize({ instance }, size) { stats.resizes[instance.id] = size; },
  destroy({ instance }) { stats.destroyed.push(instance.id); },
});
registry.register({
  type: 'fixture-interaction', version: 1, title: 'Interaction check',
  defaultSize: { w: 5, h: 5 }, minimumSize: { w: 4, h: 4 }, capabilities: {}, settings: {},
  mount({ element, scope }) {
    const label = document.createElement('label'); label.textContent = 'Select or edit text';
    const input = document.createElement('textarea'); input.setAttribute('aria-label', 'Interaction test text'); input.value = 'Text selection and editing stay inside the widget.';
    const shortcut = document.createElement('div'); shortcut.className = 'fixture-shortcut'; shortcut.draggable = true; shortcut.textContent = 'Drag this shortcut into the group';
    const group = document.createElement('div'); group.className = 'fixture-group'; group.textContent = 'Shortcut group';
    scope.listen(shortcut, 'dragstart', event => { event.dataTransfer.setData('text/plain', 'fixture-shortcut'); });
    scope.listen(group, 'dragover', event => { event.preventDefault(); group.classList.add('drop-target'); });
    scope.listen(group, 'dragleave', () => group.classList.remove('drop-target'));
    scope.listen(group, 'drop', event => {
      event.preventDefault(); group.classList.remove('drop-target');
      if (event.dataTransfer.getData('text/plain') === 'fixture-shortcut') group.append(shortcut);
    });
    element.append(label, input, shortcut, group);
  },
});
registry.register({
  type: 'fixture-failure', version: 1, title: 'Failure check',
  defaultSize: { w: 3, h: 3 }, minimumSize: { w: 2, h: 2 }, capabilities: {}, settings: {},
  mount({ scope, instance }) {
    scope.interval(() => { stats.ticks[instance.id] = (stats.ticks[instance.id] || 0) + 1; }, 50);
    throw new Error('Intentional fixture mount failure.');
  },
});

const instances = new Map(), handles = new Map();
const status = document.querySelector('#canvas-status');
const runtime = createWidgetRuntime(registry, { onError: (error, id) => stats.errors.push({ id, message: error.message }) });
const canvasElement = document.querySelector('#canvas');
const adapter = createCanvasAdapter(canvasElement, { onChange: () => { status.textContent = 'Layout changed. Save layout to keep it.'; } });
let editing = false;
const storageKey = 'tabtahoe:canvas-prototype:1';
const narrow = matchMedia('(max-width:740px)');

function applyEditing() { adapter.setEditing(editing && !narrow.matches); }
narrow.addEventListener('change', applyEditing);

function remove(id) {
  handles.get(id)?.destroy(); handles.delete(id); instances.delete(id); adapter.remove(id);
  document.querySelector('#add-clock').focus();
}

function mount(instance, geometry) {
  const definition = registry.list().find(item => item.type === instance.type);
  const node = document.createElement('section'); node.dataset.instanceId = instance.id; node.setAttribute('aria-label', definition.title);
  node.style.setProperty('--fixture-stacked-height', `${Math.max(geometry.h, 3) * 72}px`);
  const shell = document.createElement('div'); shell.className = 'grid-stack-item-content fixture-widget';
  const header = document.createElement('header'); header.className = 'fixture-widget-header';
  const move = document.createElement('button'); move.className = 'canvas-move-handle subtle-button'; move.textContent = '⠿'; move.setAttribute('aria-label', `Move or resize ${definition.title}`); move.setAttribute('aria-describedby', 'canvas-instructions');
  const title = document.createElement('h2'); title.textContent = instance.settings.title || definition.title;
  const close = document.createElement('button'); close.className = 'fixture-remove subtle-button'; close.textContent = '✕'; close.setAttribute('aria-label', `Remove ${definition.title}`);
  const content = document.createElement('div'); content.className = 'fixture-content';
  header.append(move, title, close); shell.append(header, content); node.append(shell);
  adapter.mount(node, { ...geometry, id: instance.id, minW: definition.minimumSize.w, minH: definition.minimumSize.h });
  instances.set(instance.id, instance);
  handles.set(instance.id, runtime.mount(instance, content));
  close.addEventListener('click', () => remove(instance.id));
  move.addEventListener('keydown', event => {
    if (!editing || !event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const item = adapter.serialize().find(item => item.id === instance.id);
    const dx = Number(event.key === 'ArrowRight') - Number(event.key === 'ArrowLeft');
    const dy = Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
    try {
      adapter.update(instance.id, event.shiftKey ? { w: item.w + dx, h: item.h + dy } : { x: item.x + dx, y: item.y + dy });
      const updated = adapter.serialize().find(item => item.id === instance.id);
      status.textContent = `${definition.title}: column ${updated.x + 1}, row ${updated.y + 1}, ${updated.w} by ${updated.h} cells.`;
    } catch (error) { status.textContent = error.message; }
  });
}

function snapshot() {
  const layout = adapter.serialize();
  return { version: 1, instances: layout.map(item => instances.get(item.id)), layout };
}
function restore(document) {
  if (!document || document.version !== 1 || !Array.isArray(document.instances)) throw new Error('Unsupported prototype document.');
  const layout = validatePlacement(document.layout);
  const next = document.instances.map(instance => registry.validate(instance));
  if (next.length !== layout.length || new Set(next.map(item => item.id)).size !== next.length || next.some(item => !layout.find(cell => cell.id === item.id))) throw new Error('Widget instances and layout must match.');
  for (const item of layout) {
    const definition = registry.list().find(type => type.type === next.find(instance => instance.id === item.id).type);
    if (item.w < definition.minimumSize.w || item.h < definition.minimumSize.h) throw new Error('Widget is below its minimum size.');
  }
  runtime.destroy(); handles.clear(); instances.clear();
  for (const item of adapter.serialize()) adapter.remove(item.id);
  for (const item of layout) mount(next.find(instance => instance.id === item.id), item);
  applyEditing();
}

function add(type) {
  const definition = registry.list().find(item => item.type === type);
  const y = Math.max(0, ...adapter.serialize().map(item => item.y + item.h));
  const instance = registry.create(type);
  mount(instance, { id: instance.id, x: 0, y, ...definition.defaultSize });
  applyEditing();
  canvasElement.lastElementChild.scrollIntoView({ block: 'nearest' });
}

document.querySelector('#edit-canvas').addEventListener('click', event => {
  editing = !editing; applyEditing();
  event.currentTarget.setAttribute('aria-pressed', String(editing));
  event.currentTarget.textContent = editing ? 'Stop editing' : 'Edit canvas';
});
document.querySelector('#save-canvas').addEventListener('click', () => {
  try { localStorage.setItem(storageKey, JSON.stringify(snapshot())); status.textContent = 'Prototype layout saved.'; }
  catch { status.textContent = 'Could not save. Storage may be unavailable or full.'; }
});
document.querySelector('#restore-canvas').addEventListener('click', () => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) throw new Error('No saved prototype layout yet.');
    restore(JSON.parse(saved)); status.textContent = 'Saved prototype restored.';
  } catch (error) { status.textContent = error.message; }
});
document.querySelector('#add-clock').addEventListener('click', () => add('fixture-clock'));
document.querySelector('#add-failure').addEventListener('click', () => add('fixture-failure'));

const initial = {
  version: 1,
  instances: [registry.create('fixture-clock', { title: 'Your time' }, 'clock-a'), registry.create('fixture-clock', { title: 'Another clock', hour24: true }, 'clock-b'), registry.create('fixture-interaction', {}, 'interaction')],
  layout: [{ id: 'clock-a', x: 0, y: 0, w: 3, h: 3 }, { id: 'clock-b', x: 4, y: 1, w: 3, h: 3 }, { id: 'interaction', x: 7, y: 0, w: 5, h: 5 }],
};
restore(initial);
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) restore(JSON.parse(saved));
} catch { status.textContent = 'Saved prototype could not load. Original data is retained; showing the fixture defaults.'; }

// Deliberate test surface, available only on this isolated fixture page.
globalThis.canvasFixture = { adapter, registry, runtime, instances, handles, stats, snapshot, restore, remove };
