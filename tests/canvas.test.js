import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveObjectURL } from 'node:buffer';
import { validatePlacement } from '../canvas/geometry.js';
import { createWidgetRegistry } from '../widgets/registry.js';
import { createWidgetRuntime } from '../widgets/runtime.js';

const cell = (id, overrides = {}) => ({ id, x: 0, y: 0, w: 3, h: 3, ...overrides });
const definition = (overrides = {}) => ({
  type: 'clock', version: 1, title: 'Clock',
  defaultSize: { w: 3, h: 3 }, minimumSize: { w: 2, h: 2 },
  settings: { title: { type: 'string', default: 'Time', maxLength: 40 }, hour24: { type: 'boolean', default: false } },
  mount() {}, ...overrides,
});
const element = () => ({
  children: [],
  ownerDocument: { createElement: () => ({ setAttribute() {} }) },
  replaceChildren(...children) { this.children = children; },
});

test('canvas geometry preserves intentional empty cells and strips engine content', () => {
  const layout = validatePlacement([cell('first'), cell('second', { x: 7, y: 8, content: '<script>bad</script>' })]);
  assert.equal(layout[1].y, 8);
  assert.equal(layout[1].x, 7);
  assert.equal(Object.hasOwn(layout[1], 'content'), false);
});

test('canvas validates bounds, integer cells, minimum sizes, overlap, and stable IDs', () => {
  for (const invalid of [{ x: -1 }, { y: -1 }, { x: 11 }, { h: 0 }, { y: 999 }, { w: 2.5 }, { minW: 4 }, { minH: 0 }, { id: '' }]) {
    assert.throws(() => validatePlacement([cell('bad', invalid)]));
  }
  assert.throws(() => validatePlacement([cell('same'), cell('same', { y: 5 })]), /unique/);
  assert.throws(() => validatePlacement([cell('one'), cell('two', { x: 2 })]), /overlap/);
  assert.doesNotThrow(() => validatePlacement([cell('one'), cell('two', { x: 3 })]));
  assert.throws(() => validatePlacement(Array.from({ length: 101 }, (_, i) => cell(String(i), { y: i * 3 }))), /100 widgets/);
});

test('registry creates independent instances and detached gallery metadata', () => {
  const registry = createWidgetRegistry();
  const source = definition(); registry.register(source);
  const first = registry.create('clock'), second = registry.create('clock', { hour24: true });
  assert.notEqual(first.id, second.id);
  first.settings.title = 'Only one';
  assert.equal(second.settings.title, 'Time');
  const gallery = registry.list(); gallery[0].settings.title.default = 'Changed'; gallery[0].minimumSize.w = 10;
  source.settings.title.default = 'Also changed';
  assert.equal(registry.create('clock').settings.title, 'Time');
  assert.equal(registry.list()[0].minimumSize.w, 2);
});

test('registry rejects unsupported versions, types, fields, and malformed settings', () => {
  const registry = createWidgetRegistry(); registry.register(definition());
  assert.throws(() => registry.register(definition()), /unique/);
  assert.throws(() => registry.create('unknown'), /Unsupported/);
  assert.throws(() => registry.create('clock', { hour24: 'yes' }), /hour24/);
  assert.throws(() => registry.create('clock', { title: 'x'.repeat(41) }), /title/);
  assert.throws(() => registry.create('clock', { timezone: 'UTC' }), /Unknown/);
  assert.throws(() => registry.validate({ ...registry.create('clock'), version: 2 }), /version/);
  assert.throws(() => registry.register(definition({ type: 'bad-default', settings: { enabled: { type: 'boolean', default: 'yes' } } })), /enabled/);
});

test('runtime keeps duplicate widget state and updates independent', () => {
  const registry = createWidgetRegistry();
  registry.register(definition({
    mount({ state, instance }) { state.label = instance.settings.title; },
    update({ element, instance }) { element.label = instance.settings.title; },
  }));
  const runtime = createWidgetRuntime(registry), first = element(), second = element();
  const one = registry.create('clock'), two = registry.create('clock');
  const a = runtime.mount(one, first), b = runtime.mount(two, second);
  a.update({ title: 'First' }); b.update({ title: 'Second' });
  assert.equal(first.label, 'First'); assert.equal(second.label, 'Second');
  assert.throws(() => runtime.mount(one, element()), /already mounted/);
  assert.throws(() => a.update({ hour24: 'invalid' }), /hour24/);
  runtime.destroy();
});

test('runtime destruction releases intervals, listeners, requests, observers, and URLs', context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  const registry = createWidgetRegistry(), target = new EventTarget();
  let ticks = 0, events = 0, disconnected = 0, destroyed = 0, signal, url;
  registry.register(definition({
    mount({ scope }) {
      signal = scope.signal;
      scope.interval(() => ticks++, 100);
      scope.listen(target, 'ping', () => events++);
      scope.observe({ observe() {}, disconnect() { disconnected++; } }, {});
      url = scope.objectUrl(new Blob(['local']));
    },
    destroy() { destroyed++; },
  }));
  const runtime = createWidgetRuntime(registry), instance = registry.create('clock');
  const handle = runtime.mount(instance, element());
  context.mock.timers.tick(100); target.dispatchEvent(new Event('ping'));
  assert.equal(ticks, 1); assert.equal(events, 1); assert.equal(signal.aborted, false);
  assert.ok(resolveObjectURL(url));
  handle.destroy(); handle.destroy();
  context.mock.timers.tick(500); target.dispatchEvent(new Event('ping'));
  assert.equal(ticks, 1); assert.equal(events, 1); assert.equal(disconnected, 1); assert.equal(destroyed, 1);
  assert.equal(signal.aborted, true); assert.equal(resolveObjectURL(url), undefined);
  // Destroying an instance releases its ID for later undo/remount.
  runtime.mount(instance, element()).destroy();
});

test('a failed widget cleans partial mount resources and leaves other widgets alive', context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  const registry = createWidgetRegistry(); let ticks = 0, cleaned = 0;
  registry.register(definition({ type: 'broken', mount({ scope }) {
    scope.interval(() => ticks++, 100);
    scope.cleanup(() => cleaned++);
    throw new Error('mount failed');
  } }));
  registry.register(definition({ mount({ element }) { element.healthy = true; } }));
  const errors = [], runtime = createWidgetRuntime(registry, { onError: error => errors.push(error.message) });
  const broken = element(), healthy = element();
  runtime.mount(registry.create('broken'), broken); runtime.mount(registry.create('clock'), healthy);
  context.mock.timers.tick(500);
  assert.equal(ticks, 0); assert.equal(cleaned, 1); assert.equal(healthy.healthy, true);
  assert.match(broken.children[0].textContent, /could not load/);
  assert.deepEqual(errors, ['mount failed']);
  runtime.destroy();
});

test('update/resize failures and throwing destruction cannot leak other resources', () => {
  const registry = createWidgetRegistry(); let cleaned = 0;
  registry.register(definition({
    mount({ scope }) {
      scope.cleanup(() => cleaned++);
      scope.cleanup(() => { throw new Error('bad cleanup'); });
    },
    resize() { throw new Error('resize failed'); },
    destroy() { throw new Error('destroy failed'); },
  }));
  const errors = [], runtime = createWidgetRuntime(registry, { onError: error => errors.push(error.message) });
  const handle = runtime.mount(registry.create('clock'), element());
  handle.resize({ width: 300, height: 200 });
  assert.equal(cleaned, 1);
  assert.doesNotThrow(() => runtime.destroy());
  assert.deepEqual(errors, ['resize failed', 'destroy failed']);
});
