import { DEFAULT_SETTINGS, WALLPAPERS, safeUrl, getShortcutStyle } from '../core.js';
import { validatePlacement } from '../canvas/geometry.js';

export const WORKSPACE_KEY = 'canvasWorkspace';
export const BACKUP_KEY = 'canvasV1Backup';
export const COLLECTION_PREFIX = 'canvasCollection:';
export const DEFAULT_COLLECTION = 'migrated-favourites';
export const isStableId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value);

export function normalizePreferences(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid preferences.');
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.backgroundAssetId = 'custom'; // Original IndexedDB key; never rewritten during migration.
  for (const key of ['name', 'rotation', 'unit', 'engine', 'backgroundSource', 'backgroundAssetId', 'unsplashId']) {
    if (typeof raw[key] === 'string') settings[key] = raw[key].slice(0, 100);
  }
  if (!['0', 'tab', '5', '15', '60', '1440'].includes(settings.rotation)) settings.rotation = '60';
  if (!['celsius', 'fahrenheit'].includes(settings.unit)) settings.unit = 'celsius';
  if (!['google', 'brave', 'duckduckgo'].includes(settings.engine)) settings.engine = 'google';
  if (!['bundled', 'custom', 'unsplash'].includes(settings.backgroundSource)) settings.backgroundSource = 'bundled';
  settings.opacity = Number.isFinite(raw.opacity) ? Math.max(8, Math.min(42, raw.opacity)) : 16;
  settings.fillWindow = raw.fillWindow === true;
  settings.wallpaper = Number.isInteger(raw.wallpaper) ? Math.max(0, Math.min(WALLPAPERS.length - 1, raw.wallpaper)) : 0;
  for (const key of ['wallpaperAt', 'backgroundUpdatedAt']) if (Number.isFinite(raw[key]) && raw[key] >= 0) settings[key] = raw[key];
  settings.hour24 = raw.hour24 === true;
  settings.shortcutStyle = getShortcutStyle(raw);
  settings.iconsOnly = settings.shortcutStyle === 'icons-only';
  if (raw.location && typeof raw.location.name === 'string' && Number.isFinite(raw.location.latitude) && Math.abs(raw.location.latitude) <= 90 && Number.isFinite(raw.location.longitude) && Math.abs(raw.location.longitude) <= 180) {
    settings.location = { name: raw.location.name.slice(0, 100), latitude: raw.location.latitude, longitude: raw.location.longitude };
  }
  for (const key of Object.keys(settings.widgets)) if (typeof raw.widgets?.[key] === 'boolean') settings.widgets[key] = raw.widgets[key];
  return settings;
}

export function validateCollection(raw) {
  let count = 0;
  const ids = new Set();
  function visit(items, depth = 0) {
    if (!Array.isArray(items) || depth > 20) throw new Error('Invalid shortcut collection.');
    return items.map(item => {
      if (++count > 2000 || !item || !isStableId(item.id) || ids.has(item.id) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 200) throw new Error('Invalid shortcut or group.');
      ids.add(item.id);
      if (Object.hasOwn(item, 'children')) return { id: item.id, title: item.title, children: visit(item.children, depth + 1) };
      const url = safeUrl(item.url);
      if (!url) throw new Error('A shortcut has an unsupported website URL.');
      return { id: item.id, title: item.title, url, color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#586d7d', icon: typeof item.icon === 'string' ? item.icon.slice(0, 30) : '' };
    });
  }
  return visit(raw);
}

export function validateCanvas(raw, registry) {
  if (!raw || !Array.isArray(raw.widgets) || raw.widgets.length > 100) throw new Error('Invalid canvas widgets.');
  const layout = validatePlacement(raw.layout);
  if (layout.length !== raw.widgets.length) throw new Error('Widget geometry is missing.');
  const ids = new Set();
  const metadata = registry.list();
  const widgets = raw.widgets.map(item => {
    if (!isStableId(item?.id) || ids.has(item.id)) throw new Error('Invalid or duplicate widget ID.');
    ids.add(item.id);
    if (!isStableId(item.type) || !Number.isInteger(item.version) || item.version < 1) throw new Error('Invalid widget type or version.');
    const cell = layout.find(cell => cell.id === item.id);
    if (!cell) throw new Error('Widget geometry is missing.');
    const known = metadata.find(definition => definition.type === item.type && definition.version === item.version);
    if (!known) {
      // Preserve future types/versions verbatim and show an isolated placeholder.
      if (JSON.stringify(item).length > 50000) throw new Error('Unsupported widget record is too large.');
      return structuredClone(item);
    }
    if (cell.w < known.minimumSize.w || cell.h < known.minimumSize.h) throw new Error('Widget is below its supported minimum size.');
    cell.minW = known.minimumSize.w; cell.minH = known.minimumSize.h;
    const source = item.type === 'favourites' && !Object.hasOwn(item.settings || {}, 'shortcutStyle')
      ? { ...item, settings: { ...item.settings, shortcutStyle: getShortcutStyle(raw.preferences || {}) } }
      : item;
    const validated = registry.validate(source);
    if (item.type === 'favourites' && !isStableId(validated.settings.collectionId)) throw new Error('Invalid shortcut collection reference.');
    return validated;
  });
  return { widgets, layout, preferences: normalizePreferences(raw.preferences) };
}

export function validateWorkspace(raw, registry) {
  if (!raw || raw.schemaVersion !== 2) throw new Error('This saved workspace uses an unsupported version. Its original data has been retained.');
  if (!isStableId(raw.revision) || !Array.isArray(raw.layouts) || !raw.layouts.length || raw.layouts.length > 50) throw new Error('Invalid saved layouts.');
  const ids = new Set();
  const layouts = raw.layouts.map(layout => {
    if (!isStableId(layout?.id) || ids.has(layout.id) || typeof layout.name !== 'string' || !layout.name.trim() || layout.name.length > 60) throw new Error('Invalid layout name or ID.');
    ids.add(layout.id);
    return { id: layout.id, name: layout.name.trim(), canvas: validateCanvas(layout.canvas, registry) };
  });
  if (!ids.has(raw.activeLayoutId)) throw new Error('The active layout is missing.');
  return { schemaVersion: 2, revision: raw.revision, migratedFrom: 1, activeLayoutId: raw.activeLayoutId, layouts };
}

export function createMigratedWorkspace(legacy, registry, initialApps, revision = crypto.randomUUID()) {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) throw new Error('Invalid version 1 preferences. Original data retained.');
  const preferences = normalizePreferences(legacy.settings);
  const widgets = [], layout = [];
  const specs = [
    ['topbar', 0, 0, 12, 1, {}],
    ['search', 3, 1, 6, 1, { engine: preferences.engine }],
    ['greeting', 0, 2, 12, 1, { name: preferences.name }],
    ['clock', 0, 3, 3, 3, { hour24: preferences.hour24 }],
    ['weather', 3, 3, 3, 3, { unit: preferences.unit, city: preferences.location?.name || '', latitude: preferences.location?.latitude || 0, longitude: preferences.location?.longitude || 0 }],
    ['music', 0, 6, 3, 4, {}],
    ['calendar', 3, 6, 3, 4, {}],
    ['bookmarks', 0, 10, 6, 2, {}],
    ['favourites', 6, 3, 6, 9, { collectionId: DEFAULT_COLLECTION, shortcutStyle: preferences.shortcutStyle }],
  ];
  for (const [type, x, y, w, h, settings] of specs) {
    if (Object.hasOwn(preferences.widgets, type) && !preferences.widgets[type]) continue;
    const instance = registry.create(type, settings, `initial-${type}`);
    widgets.push(instance); layout.push({ id: instance.id, x, y, w, h });
  }
  const collection = validateCollection(legacy.apps === undefined ? initialApps : legacy.apps);
  const workspace = validateWorkspace({ schemaVersion: 2, revision, activeLayoutId: 'layout-classic', layouts: [{ id: 'layout-classic', name: 'My layout', canvas: { widgets, layout, preferences } }] }, registry);
  return { workspace, collection };
}

export class LayoutConflictError extends Error {
  constructor() { super('Another tab saved a newer layout. Your work is still here. Save it as a new layout or load the latest version.'); this.name = 'LayoutConflictError'; }
}

export function createWorkspaceStore(backend, registry) {
  const validate = raw => validateWorkspace(raw, registry);
  return {
    async open(initialApps) {
      return backend.lock('workspace', async () => {
        const existing = await backend.get(WORKSPACE_KEY);
        if (existing !== undefined) return validate(existing);
        const legacy = await backend.legacy();
        const migrated = createMigratedWorkspace(legacy.data, registry, initialApps);
        if (await backend.get(BACKUP_KEY) === undefined) await backend.set({ [BACKUP_KEY]: { savedAt: Date.now(), original: legacy.original } });
        const key = COLLECTION_PREFIX + DEFAULT_COLLECTION;
        if (await backend.get(key) === undefined) await backend.set({ [key]: migrated.collection });
        // The document itself is the completion marker, written only after backup/content.
        await backend.set({ [WORKSPACE_KEY]: migrated.workspace });
        return migrated.workspace;
      });
    },
    async read() { return validate(await backend.get(WORKSPACE_KEY)); },
    async commit(candidate, expectedRevision) {
      return backend.lock('workspace', async () => {
        const latest = validate(await backend.get(WORKSPACE_KEY));
        if (latest.revision !== expectedRevision) throw new LayoutConflictError();
        const next = validate({ ...candidate, revision: crypto.randomUUID() });
        await backend.set({ [WORKSPACE_KEY]: next });
        return next;
      });
    },
  };
}
