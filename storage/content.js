import { TASK_TITLE_LIMIT } from '../core.js';
import { COLLECTION_PREFIX, validateCollection } from './workspace.js';

const TASK_PREFIX = 'calendarTasks:';
const normalizeTasks = items => Array.isArray(items) ? items.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && item.title.trim())
  .map(item => ({ id: item.id, title: item.title.replace(/\s+/g, ' ').trim().slice(0, TASK_TITLE_LIMIT), completed: item.completed === true })) : [];

export function createContentStore(backend, notifyError) {
  const collections = new Map(), errors = new Map(), listeners = new Set();
  let tasks = {}, pinned = [], preferences = {};
  const emit = (kind, key) => { for (const listener of listeners) listener(kind, key); };
  const extension = globalThis.chrome?.storage?.local;
  const store = {
    async load(canvas) {
      const ids = [...new Set(canvas.widgets.filter(item => item.type === 'favourites').map(item => item.settings.collectionId))];
      await Promise.all(ids.map(async id => {
        try {
          const saved = await backend.get(COLLECTION_PREFIX + id);
          if (saved === undefined) throw new Error('This shortcut collection is missing. Its saved layout reference has been retained.');
          collections.set(id, validateCollection(saved)); errors.delete(id);
        } catch (error) { errors.set(id, error); }
      }));
    },
    async initialize() {
      if (extension) {
        const all = await extension.get(null);
        tasks = Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith(TASK_PREFIX) && /^\d{4}-\d{2}-\d{2}$/.test(key.slice(TASK_PREFIX.length))).map(([key, value]) => [key.slice(TASK_PREFIX.length), normalizeTasks(value)]));
        pinned = Array.isArray(all.pinned) ? all.pinned.filter(id => typeof id === 'string') : [];
      } else {
        try { tasks = JSON.parse(localStorage.getItem('tabtahoe-calendar-tasks') || '{}'); }
        catch { tasks = {}; notifyError('Saved calendar tasks could not be read. Their original data is retained.'); }
        tasks = Object.fromEntries(Object.entries(tasks || {}).filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key)).map(([key, value]) => [key, normalizeTasks(value)]));
        const saved = await backend.get('pinned');
        if (saved !== undefined) pinned = Array.isArray(saved) ? saved : [];
        else {
          try { pinned = JSON.parse(localStorage.getItem('tabtahoe') || '{}').pinned || []; }
          catch { pinned = []; }
        }
      }
      if (!Array.isArray(pinned)) pinned = [];
    },
    getCollection(id) {
      if (errors.has(id)) throw errors.get(id);
      if (!collections.has(id)) throw new Error('Shortcut collection unavailable.');
      return structuredClone(collections.get(id));
    },
    async saveCollection(id, items) {
      const valid = validateCollection(items);
      await backend.set({ [COLLECTION_PREFIX + id]: valid });
      collections.set(id, valid); errors.delete(id); emit('collection', id);
    },
    getTasks() { return structuredClone(tasks); },
    async saveTasks(date, items) {
      const day = normalizeTasks(items);
      if (extension) await extension.set({ [TASK_PREFIX + date]: day });
      else await backend.lock('calendar-tasks', async () => {
        const latest = JSON.parse(localStorage.getItem('tabtahoe-calendar-tasks') || '{}');
        latest[date] = day; localStorage.setItem('tabtahoe-calendar-tasks', JSON.stringify(latest));
      });
      tasks[date] = day; emit('tasks', date);
    },
    getPinned() { return [...pinned]; },
    async savePinned(ids) {
      if (extension) await extension.set({ pinned: ids });
      else await backend.set({ pinned: ids });
      pinned = [...ids]; emit('bookmarks');
    },
    getPreferences() { return preferences; },
    setPreferences(value) { preferences = value; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  backend.subscribe((key, value) => {
    if (key.startsWith(COLLECTION_PREFIX)) {
      const id = key.slice(COLLECTION_PREFIX.length);
      try { collections.set(id, validateCollection(value)); errors.delete(id); }
      catch (error) { errors.set(id, error); notifyError('A shortcut collection update could not be read. Original data retained.'); }
      emit('collection', id);
    }
    if (key === 'pinned' && Array.isArray(value)) { pinned = value; emit('bookmarks'); }
    if (key.startsWith(TASK_PREFIX)) { const date = key.slice(TASK_PREFIX.length); tasks[date] = normalizeTasks(value); emit('tasks', date); }
  });
  if (!extension) window.addEventListener('storage', event => {
    if (event.key !== 'tabtahoe-calendar-tasks') return;
    try {
      const saved = JSON.parse(event.newValue || '{}');
      tasks = Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, normalizeTasks(value)])); emit('tasks');
    } catch { notifyError('Calendar tasks could not be refreshed.'); }
  });
  return store;
}
