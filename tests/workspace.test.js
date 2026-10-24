import test from 'node:test';
import assert from 'node:assert/strict';
import { registerDashboardWidgets } from '../widgets/dashboard.js';
import { BACKUP_KEY, WORKSPACE_KEY, COLLECTION_PREFIX, DEFAULT_COLLECTION, createWorkspaceStore, createMigratedWorkspace, validateWorkspace, validateCollection, LayoutConflictError } from '../storage/workspace.js';

const registry = registerDashboardWidgets({});
const shortcuts = [{ id: 'root-group', title: 'Work', children: [{ id: 'nested-group', title: 'Deep', children: [{ id: 'saved-link', title: 'Project', url: 'https://example.com/project', color: '#123456' }] }] }];
function memoryBackend(data = {}) {
  const values = new Map(), writes = [];
  let chain = Promise.resolve(), failKey;
  return {
    values, writes,
    setFailure(key) { failKey = key; },
    async get(key) { return structuredClone(values.get(key)); },
    async set(items) {
      if (Object.hasOwn(items, failKey)) throw new Error('Storage full');
      for (const [key, value] of Object.entries(items)) { values.set(key, structuredClone(value)); writes.push(key); }
    },
    async legacy() { return { data: structuredClone(data), original: { ...structuredClone(data), 'calendarTasks:2026-10-24': [{ id: 'task', title: 'Keep me', completed: true }] } }; },
    lock(_name, operation) {
      const next = chain.catch(() => {}).then(operation); chain = next; return next;
    },
  };
}

test('clean install creates a versioned familiar layout once, with content stored separately', async () => {
  const backend = memoryBackend(), store = createWorkspaceStore(backend, registry);
  const first = await store.open(shortcuts);
  assert.equal(first.schemaVersion, 2);
  assert.equal(first.layouts[0].canvas.widgets.length, 9);
  assert.equal(first.layouts[0].canvas.widgets[0].type, 'topbar');
  assert.equal(first.layouts[0].canvas.preferences.fillWindow, false);
  assert.equal(first.layouts[0].name, 'My layout');
  assert.deepEqual(await backend.get(COLLECTION_PREFIX + DEFAULT_COLLECTION), validateCollection(shortcuts));
  const writes = backend.writes.length;
  assert.deepEqual(await store.open([]), first);
  assert.equal(backend.writes.length, writes, 'A second load never reruns migration');
});

test('version 1 migration preserves enabled features, nested IDs, preferences, task keys, pins, and background references', async () => {
  const legacy = { settings: { name: 'Amal', hour24: true, opacity: 29, wallpaper: 2, backgroundSource: 'custom', widgets: { weather: false, calendar: true }, engine: 'brave' }, apps: shortcuts, pinned: ['bookmark-17'] };
  const backend = memoryBackend(legacy), store = createWorkspaceStore(backend, registry);
  const document = await store.open([]), canvas = document.layouts[0].canvas;
  assert.equal(canvas.widgets.some(widget => widget.type === 'weather'), false);
  assert.equal(canvas.widgets.find(widget => widget.type === 'greeting').settings.name, 'Amal');
  assert.equal(canvas.widgets.find(widget => widget.type === 'clock').settings.hour24, true);
  assert.equal(canvas.widgets.find(widget => widget.type === 'search').settings.engine, 'brave');
  assert.equal(canvas.preferences.backgroundAssetId, 'custom');
  assert.equal(canvas.preferences.backgroundSource, 'custom');
  assert.equal(canvas.preferences.opacity, 29);
  const backup = await backend.get(BACKUP_KEY);
  assert.deepEqual(backup.original.apps, shortcuts);
  assert.deepEqual(backup.original.pinned, ['bookmark-17']);
  assert.equal(backup.original['calendarTasks:2026-10-24'][0].completed, true);
  const content = await backend.get(COLLECTION_PREFIX + DEFAULT_COLLECTION);
  assert.equal(content[0].children[0].children[0].id, 'saved-link');
  assert.deepEqual(backend.writes, [BACKUP_KEY, COLLECTION_PREFIX + DEFAULT_COLLECTION, WORKSPACE_KEY]);
});

test('an interrupted final write has no completion marker; retry preserves backup and already written content', async () => {
  const backend = memoryBackend({ apps: shortcuts }), store = createWorkspaceStore(backend, registry);
  backend.setFailure(WORKSPACE_KEY);
  await assert.rejects(store.open([]), /Storage full/);
  assert.equal(await backend.get(WORKSPACE_KEY), undefined);
  const backup = await backend.get(BACKUP_KEY);
  const content = [{ id: 'post-interruption', title: 'Kept content', url: 'https://example.com/', color: '#123456' }];
  await backend.set({ [COLLECTION_PREFIX + DEFAULT_COLLECTION]: content });
  backend.setFailure(undefined);
  await store.open([]);
  assert.deepEqual(await backend.get(BACKUP_KEY), backup);
  assert.deepEqual(await backend.get(COLLECTION_PREFIX + DEFAULT_COLLECTION), content);
});

test('failed backup prevents migration writes and preserves the source', async () => {
  const backend = memoryBackend({ apps: shortcuts }), store = createWorkspaceStore(backend, registry);
  backend.setFailure(BACKUP_KEY);
  await assert.rejects(store.open([]), /Storage full/);
  assert.equal(backend.values.size, 0);
});

test('malformed and unknown workspace versions remain untouched instead of remigrating over them', async () => {
  for (const invalid of [null, {}, { schemaVersion: 999 }, { schemaVersion: 2, revision: 'revision', layouts: [] }]) {
    const backend = memoryBackend(); backend.values.set(WORKSPACE_KEY, invalid);
    await assert.rejects(createWorkspaceStore(backend, registry).open([]));
    assert.deepEqual(backend.values.get(WORKSPACE_KEY), invalid);
    assert.equal(backend.writes.length, 0);
  }
  assert.throws(() => createMigratedWorkspace({ apps: [{ id: 'bad', title: 'Executable', url: 'javascript:alert(1)' }] }, registry, []), /unsupported/);
});

test('validation rejects duplicate/missing geometry, unsafe content refs, bounds, and invalid instance settings', () => {
  const valid = createMigratedWorkspace({}, registry, []).workspace;
  const variants = [
    document => document.layouts[0].canvas.layout.pop(),
    document => { document.layouts[0].canvas.layout[0].x = -1; },
    document => { document.layouts[0].canvas.widgets[2].settings.hour24 = 'true'; },
    document => { document.layouts[0].canvas.widgets.find(item => item.type === 'favourites').settings.collectionId = '<script>'; },
    document => { document.layouts[0].name = ' '; },
    document => { document.layouts[0].canvas.widgets[1].id = document.layouts[0].canvas.widgets[0].id; },
  ];
  for (const mutate of variants) { const copy = structuredClone(valid); mutate(copy); assert.throws(() => validateWorkspace(copy, registry)); }
  assert.throws(() => validateCollection([{ id: 'a', title: 'Group', children: [{ id: 'a', title: 'Duplicate', url: 'https://example.com' }] }]), /Invalid/);
});

test('unknown widget types and future widget versions retain their exact recoverable records', () => {
  const valid = createMigratedWorkspace({}, registry, []).workspace;
  for (const record of [{ id: 'future-widget', type: 'future-weather', version: 1, settings: { custom: ['preserve', 'this'] } }, { id: 'future-widget', type: 'clock', version: 9, settings: { newer: true } }]) {
    const copy = structuredClone(valid), canvas = copy.layouts[0].canvas;
    canvas.widgets.push(record); canvas.layout.push({ id: record.id, x: 0, y: 20, w: 3, h: 3 });
    assert.deepEqual(validateWorkspace(copy, registry).layouts[0].canvas.widgets.at(-1), record);
  }
});

test('two dashboard tabs cannot both commit the same base revision', async () => {
  const backend = memoryBackend(), one = createWorkspaceStore(backend, registry), two = createWorkspaceStore(backend, registry);
  const base = await one.open([]), first = structuredClone(base), second = structuredClone(base);
  first.layouts[0].name = 'Amal’s layout'; second.layouts[0].name = 'Sandra’s style';
  const results = await Promise.allSettled([one.commit(first, base.revision), two.commit(second, base.revision)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.ok(results.find(result => result.status === 'rejected').reason instanceof LayoutConflictError);
  assert.equal((await one.read()).layouts[0].name, 'Amal’s layout');
  assert.equal(second.layouts[0].name, 'Sandra’s style', 'Rejected work is still available to save as a copy');
});

test('named arrangements can persist, rename, switch, and remove widgets without deleting content', async () => {
  const backend = memoryBackend({ apps: shortcuts }), store = createWorkspaceStore(backend, registry);
  const base = await store.open([]), candidate = structuredClone(base);
  const originalContent = await backend.get(COLLECTION_PREFIX + DEFAULT_COLLECTION);
  const named = structuredClone(candidate.layouts[0]); named.id = 'layout-sandra'; named.name = 'Sandra’s style';
  named.canvas.widgets = []; named.canvas.layout = []; named.canvas.preferences.opacity = 35;
  candidate.layouts.push(named); candidate.activeLayoutId = named.id;
  let saved = await store.commit(candidate, base.revision);
  assert.equal(saved.layouts.length, 2); assert.equal(saved.activeLayoutId, named.id);
  assert.equal(saved.layouts[0].canvas.widgets.length, 9);
  saved.layouts[1].name = 'Sandra’s calm space'; saved = await store.commit(saved, saved.revision);
  assert.equal((await store.read()).layouts[1].name, 'Sandra’s calm space');
  saved.layouts = [saved.layouts[1]]; saved = await store.commit(saved, saved.revision);
  assert.equal(saved.layouts.length, 1);
  assert.deepEqual(await backend.get(COLLECTION_PREFIX + DEFAULT_COLLECTION), originalContent);
  assert.equal((await backend.get(BACKUP_KEY)).original['calendarTasks:2026-10-24'][0].title, 'Keep me');
});
