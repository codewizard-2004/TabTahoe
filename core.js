export const UNSPLASH_WALLPAPERS = [
  { id: 'forest', name: 'Forest light', photo: 'photo-1448375240586-882707db888b', credit: 'Sebastian Unrau', profile: 'sebastian_unrau' },
  { id: 'coast', name: 'Quiet coast', photo: 'photo-1507525428034-b723cf961d3e', credit: 'Sean Oulashin', profile: 'oulashin' },
];

export const WALLPAPERS = [
  { id: 'alpine', name: 'Alpine stillness', path: 'assets/alpine.jpg' },
  { id: 'forest', name: 'Into the green', path: 'assets/forest.jpg' },
  { id: 'coast', name: 'Coastal daydream', path: 'assets/coast.jpg' },
];

export const DEFAULT_SETTINGS = {
  name: '', rotation: '60', wallpaper: 0, wallpaperAt: 0,
  opacity: 16, fillWindow: false, unit: 'celsius', engine: 'google', hour24: false, iconsOnly: false, shortcutStyle: null,
  widgets: { clock: true, weather: true, music: true, calendar: true, bookmarks: true },
  location: null, backgroundSource: 'bundled', unsplashId: null,
};

export function safeUrl(value) {
  const raw = String(value).trim();
  // Only web links can be launched from saved shortcuts and bookmarks.
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') ? url.href : null;
  } catch { return null; }
}

export function searchDestination(value, engine) {
  const raw = value.trim();
  if (!raw) return null;
  if (!/\s/.test(raw) && (/^https?:\/\//i.test(raw) || /^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/.test(raw))) {
    const url = safeUrl(raw);
    if (url) return url;
  }
  const engines = { google: 'https://www.google.com/search?q=', brave: 'https://search.brave.com/search?q=', duckduckgo: 'https://duckduckgo.com/?q=' };
  return (engines[engine] || engines.google) + encodeURIComponent(raw);
}

export function flattenBookmarks(nodes, parent = '') {
  return nodes.flatMap(node => {
    if (node.url) return [{ id: node.id, title: node.title || node.url, url: node.url, folder: parent }];
    return flattenBookmarks(node.children || [], [parent, node.title].filter(Boolean).join(' / '));
  });
}

export function calendarDays(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - (first.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, current: date.getMonth() === month };
  });
}

export function nextWallpaper(settings, now, newTab = false) {
  const interval = Number(settings.rotation);
  const due = settings.rotation === 'tab' ? newTab : interval > 0 && now - settings.wallpaperAt >= interval * 60000;
  return due && settings.wallpaperAt > 0 ? (settings.wallpaper + 1) % WALLPAPERS.length : settings.wallpaper;
}

export function weatherDescription(code) {
  if (code === 0) return ['Clear skies', '☀'];
  if (code <= 2) return ['Partly cloudy', '⛅'];
  if (code === 3) return ['Overcast', '☁'];
  if (code <= 48) return ['Misty skies', '☁'];
  if (code <= 67) return ['Rainy', '☂'];
  if (code <= 77) return ['Snowfall', '❄'];
  if (code <= 82) return ['Rain showers', '☂'];
  if (code <= 86) return ['Snow showers', '❄'];
  return ['Thunderstorms', 'ϟ'];
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// Return the containing list as well as the item so nested edits preserve order.
export function findApp(items, id, parent = null) {
  for (const item of items) {
    if (item.id === id) return { item, items, parent };
    const found = item.children && findApp(item.children, id, item);
    if (found) return found;
  }
  return null;
}

export function listGroups(items, prefix = '') {
  return items.flatMap(item => item.children ? [
    { id: item.id, title: `${prefix}${item.title}` },
    ...listGroups(item.children, `${prefix}${item.title} / `),
  ] : []);
}

export function moveApp(items, id, destinationId = null, beforeId = null) {
  const source = findApp(items, id);
  const destination = destinationId ? findApp(items, destinationId)?.item : null;
  if (!source || (destinationId && !destination?.children)) return false;
  if (destination && (id === destination.id || (source.item.children && findApp(source.item.children, destination.id)))) return false;
  if (beforeId === id) return false;
  source.items.splice(source.items.indexOf(source.item), 1);
  const target = destination?.children || items;
  const index = beforeId ? target.findIndex(item => item.id === beforeId) : -1;
  target.splice(index < 0 ? target.length : index, 0, source.item);
  return true;
}

// Older saved preferences only distinguished boxes from bare icons.
export function getShortcutStyle(settings) {
  return ['coloured', 'glass', 'clear-glass', 'icons-only'].includes(settings.shortcutStyle)
    ? settings.shortcutStyle : settings.iconsOnly ? 'icons-only' : 'coloured';
}

export const TASK_TITLE_LIMIT = 80;

// Task dates follow the local calendar, without converting through UTC.
export function calendarDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
