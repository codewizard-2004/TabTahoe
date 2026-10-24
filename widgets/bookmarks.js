import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from '../core.js';
import { createWidgetView } from '../ui/widget-view.js';

import { createIconRenderer } from '../ui/icons.js';

export function mountBookmarks(context, services) {
  const { scope } = context;
  const { $, showDialog } = createWidgetView(context, 'bookmarks', ['bookmarks-dialog']);
  const websiteIcon = createIconRenderer(scope);
  let pinned = services.getPinned(), bookmarks = [];
function bookmarkCard(bookmark) {
  const link = document.createElement('a'); link.className = 'bookmark-card';
  const url = safeUrl(bookmark.url);
  if (url) { link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  else { link.addEventListener('click', () => toast('This bookmark uses a URL that must be opened from Brave’s bookmark manager.')); }
  const icon = document.createElement('span'); icon.className = 'bookmark-icon'; icon.append(websiteIcon(bookmark));
  const copy = document.createElement('span'); copy.className = 'bookmark-copy';
  const title = document.createElement('strong'); title.textContent = bookmark.title;
  const subtitle = document.createElement('small');
  subtitle.textContent = bookmark.folder || (url ? new URL(url).hostname : bookmark.url);
  copy.append(title, subtitle); link.append(icon, copy); return link;
}
function renderBookmarks() {
  const selected = bookmarks.filter(x => pinned.includes(x.id));
  $('#pinned-bookmarks').replaceChildren(...selected.slice(0, 6).map(bookmarkCard));
  if (!selected.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    empty.textContent = 'Your best finds, close at hand. Open “View all” and pin a few favourites.';
    $('#pinned-bookmarks').append(empty);
  }
  const query = $('#bookmark-search').value.toLowerCase();
  const filtered = bookmarks.filter(x => `${x.title} ${x.url} ${x.folder}`.toLowerCase().includes(query));
  $('#all-bookmarks').replaceChildren(...filtered.map(bookmark => {
    const row = document.createElement('div'); row.className = 'bookmark-row';
    const pin = document.createElement('button'); const isPinned = pinned.includes(bookmark.id);
    pin.className = `icon-button pin-button${isPinned ? ' pinned' : ''}`; pin.textContent = isPinned ? '◆' : '◇';
    pin.setAttribute('aria-label', `${isPinned ? 'Unpin' : 'Pin'} ${bookmark.title}`); pin.setAttribute('aria-pressed', isPinned);
    pin.addEventListener('click', () => { pinned = isPinned ? pinned.filter(id => id !== bookmark.id) : [...pinned, bookmark.id]; services.savePinned(pinned).catch(() => services.toast('Pins could not be saved.')); renderBookmarks(); });
    row.append(bookmarkCard(bookmark), pin); return row;
  }));
  $('#bookmark-status').textContent = globalThis.chrome?.bookmarks ? `${filtered.length} of ${bookmarks.length} bookmarks · Pin the ones you reach for most.` : 'Browser preview · Load TabTahoe as an extension in Brave to access your bookmarks.';
}
async function loadBookmarks() {
  try {
    if (globalThis.chrome?.bookmarks) bookmarks = flattenBookmarks(await chrome.bookmarks.getTree());
    if (!scope.signal.aborted) renderBookmarks();
  } catch { $('#bookmark-status').textContent = 'Bookmarks could not be loaded. Check the extension’s bookmarks permission.'; }
}
$('#bookmarks-open').addEventListener('click', () => { renderBookmarks(); showDialog('#bookmarks-dialog'); });
$('#bookmark-search').addEventListener('input', renderBookmarks);


  scope.cleanup(services.subscribe(kind => { if (kind === 'bookmarks') { pinned = services.getPinned(); renderBookmarks(); } }));
  if (globalThis.chrome?.bookmarks) {
    for (const name of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered', 'onImportEnded']) {
      const event = chrome.bookmarks[name]; event?.addListener(loadBookmarks); scope.cleanup(() => event?.removeListener(loadBookmarks));
    }
  }
  loadBookmarks();
  return {};
}
