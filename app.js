import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from './core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const uid = () => crypto.randomUUID();
const app = (title, url, color, icon) => ({ id: uid(), title, url, color, icon });
const group = (title, children) => ({ id: uid(), title, children });
const initialApps = () => [
  group('AI Tools', [app('ChatGPT', 'https://chatgpt.com', '#17a884', '✳'), app('Claude', 'https://claude.ai', '#c88866', '✺'), app('Perplexity', 'https://perplexity.ai', '#318a9a', '⌘'), app('Gemini', 'https://gemini.google.com', '#7777d8', '✦')]),
  group('Dev Stack', [app('GitHub', 'https://github.com', '#24292e', 'github'), app('VS Code', 'https://vscode.dev', '#178ac3', '⌘'), app('AWS', 'https://aws.amazon.com', '#ee992e', 'aws'), app('Docker', 'https://hub.docker.com', '#268deb', '▰')]),
  app('YouTube', 'https://youtube.com', '#ed354a', 'youtube'),
  app('Notion', 'https://notion.so', '#f6f6f3', 'notion'),
  app('Spotify', 'https://open.spotify.com', '#25bc66', 'spotify'),
  app('Figma', 'https://figma.com', '#292b30', 'figma'),
  app('X / Twitter', 'https://x.com', '#101114', '𝕏'),
  app('Reddit', 'https://reddit.com', '#f47735', 'reddit'),
  app('Gmail', 'https://mail.google.com', '#f7f7f4', 'mail'),
  app('GitHub', 'https://github.com', '#20272b', 'github'),
  app('Linear', 'https://linear.app', '#7881d5', 'linear'),
  group('Entertainment', [app('Netflix', 'https://netflix.com', '#d82d3f', 'N'), app('Twitch', 'https://twitch.tv', '#8a55d3', '▣'), app('Discord', 'https://discord.com/app', '#6674ce', '☷'), app('Apple TV', 'https://tv.apple.com', '#283a4a', 'tv')]),
];
let settings = structuredClone(DEFAULT_SETTINGS);
let apps = [], pinned = [], bookmarks = [];
let activeGroup = null, editingApp = null, nameAction = null;
let calendarDate = new Date();
let calendarTasks = {}, activeTaskDate = null;
const TASK_STORAGE_PREFIX = 'calendarTasks:';
let toastTimer, weatherRequest;
let pageSize = 12;
const GROUP_PAGE_SIZE = 8;
let customBackgroundUrl = null, backgroundLoadId = 0, wallpaperRenderKey = '';
let nativePlaceholder;
const faviconCache = new Map();
let currentPage = 0, groupPage = 0, draggedId = null, pageHoverTimer;
let soundTabs = [], selectedTabId = null, mediaFrameId = null, soundBusy = false;
const soundCommands = [];

function toast(message) {
  const dialogs = $$('dialog[open]');
  (dialogs.at(-1) || document.body).append($('#toast'));
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

async function readState() {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.get(['settings', 'apps', 'pinned']);
  try { return JSON.parse(localStorage.getItem('tabtahoe') || '{}'); }
  catch { return {}; }
}

// Queue writes to preserve the order of rapid edits.
let saveChain = Promise.resolve();
function saveState() {
  const data = structuredClone({ settings, apps, pinned });
  saveChain = saveChain.catch(() => {}).then(async () => {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set(data);
    else localStorage.setItem('tabtahoe', JSON.stringify(data));
  }).catch(() => toast('Changes could not be saved. Browser storage may be full.'));
  return saveChain;
}

function showDialog(id) { if (!$(id).open) $(id).showModal(); }
$$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('close', () => {
  if (dialog.contains($('#toast'))) document.body.append($('#toast'));
}));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));

function renderSettings() {
  const shortcutStyle = getShortcutStyle(settings);
  document.documentElement.classList.toggle('icons-only', shortcutStyle === 'icons-only');
  document.documentElement.classList.toggle('glass-shortcuts', shortcutStyle === 'glass');
  document.documentElement.classList.toggle('clear-glass-shortcuts', shortcutStyle === 'clear-glass');
  document.documentElement.style.setProperty('--glass-opacity', settings.opacity / 100);
  $$('[data-widget]').forEach(el => el.hidden = !settings.widgets[el.dataset.widget]);
  const pair = $('.widget-pair');
  pair.hidden = !settings.widgets.clock && !settings.widgets.weather;
  pair.style.gridTemplateColumns = settings.widgets.clock && settings.widgets.weather ? '' : '1fr';
  const widgets = $('.widgets');
  widgets.hidden = !Object.values(settings.widgets).some(Boolean);
  const tracks = []; let row = 1;
  if (!pair.hidden) { pair.style.gridRow = row++; tracks.push('minmax(100px,.8fr)'); }
  if (settings.widgets.music || settings.widgets.calendar) {
    for (const key of ['music', 'calendar']) {
      const card = $(`[data-widget="${key}"]`); card.style.gridRow = row;
      card.style.gridColumn = settings.widgets.music && settings.widgets.calendar ? '' : '1 / -1';
    }
    row++; tracks.push('minmax(226px,1.65fr)');
  }
  if (settings.widgets.bookmarks) { $('[data-widget="bookmarks"]').style.gridRow = row; tracks.push('minmax(80px,.85fr)'); }
  widgets.style.gridTemplateRows = tracks.join(' ');
  $('.workspace').style.gridTemplateColumns = Object.values(settings.widgets).some(Boolean) ? '' : '1fr';
  const hour = new Date().getHours();
  $('#greeting').textContent = settings.name ? `GOOD ${hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING'}, ${settings.name.toUpperCase()}` : 'MAKE YOURSELF AT HOME';
  $('#weather-location').textContent = settings.location ? `${settings.location.name} ↗` : 'Set city ↗';
  renderWallpaper(); updateClock();
}

function renderWallpaper() {
  const bundled = WALLPAPERS[settings.wallpaper] || WALLPAPERS[0];
  const online = UNSPLASH_WALLPAPERS.find(item => item.id === settings.unsplashId);
  const source = settings.backgroundSource;
  $('#background-remove').hidden = !customBackgroundUrl;
  $('#background-use').hidden = !customBackgroundUrl || settings.backgroundSource === 'custom';
  const key = `${source}:${settings.wallpaper}:${settings.unsplashId}:${customBackgroundUrl}`;
  if (wallpaperRenderKey === key) return;
  wallpaperRenderKey = key;
  const path = source === 'custom' && customBackgroundUrl ? customBackgroundUrl : bundled.path;
  const credit = $('#wallpaper-credit'); credit.hidden = true;
  $('#wallpaper').style.backgroundImage = `url("${path}")`;
  $('#wallpaper-name').textContent = source === 'custom' && customBackgroundUrl ? 'Your background' : bundled.name;
  const loadId = ++backgroundLoadId;
  if (source === 'unsplash' && online) {
    const img = new Image(); img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      if (loadId !== backgroundLoadId) return;
      $('#wallpaper').style.backgroundImage = `url("${img.src}")`;
      $('#wallpaper-name').textContent = online.name;
      credit.textContent = `Photo by ${online.credit} on Unsplash ↗`;
      credit.href = `https://unsplash.com/@${online.profile}?utm_source=tabtahoe&utm_medium=referral`; credit.hidden = false;
    };
    img.onerror = () => { if (loadId === backgroundLoadId) toast('Unsplash is unavailable. Showing a bundled wallpaper.'); };
    img.src = unsplashImageUrl(online);
  }
  $('#background-remove').hidden = !customBackgroundUrl;
  $('#background-use').hidden = !customBackgroundUrl || settings.backgroundSource === 'custom';
}

function unsplashImageUrl(item, width = 2400) {
  return `https://images.unsplash.com/${item.photo}?auto=format&fit=crop&w=${width}&q=85`;
}

// Store image blobs separately from small preference writes.
function backgroundStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tabtahoe-backgrounds', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('images', mode);
      let operation;
      try { operation = action(tx.objectStore('images')); }
      catch (error) { db.close(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(operation.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('Background storage failed')); };
    };
  });
}

async function loadCustomBackground() {
  const blob = await backgroundStore('readonly', store => store.get('custom'));
  if (customBackgroundUrl) URL.revokeObjectURL(customBackgroundUrl);
  customBackgroundUrl = blob ? URL.createObjectURL(blob) : null;
}

$('#background-upload').addEventListener('click', () => $('#background-file').click());
$('#background-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = ''; if (!file) return;
  const status = $('#background-status');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 25 * 1024 * 1024) {
    status.textContent = 'Choose a JPG, PNG, WebP or AVIF image smaller than 25 MB.'; return;
  }
  $('#background-upload').disabled = true; status.textContent = 'Preparing your background…';
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    if (!blob) throw new Error('Image could not be prepared');
    await backgroundStore('readwrite', store => store.put(blob, 'custom'));
    await loadCustomBackground();
    settings.backgroundSource = 'custom'; settings.backgroundUpdatedAt = Date.now(); renderWallpaper(); await saveState();
    refreshBackgroundOptions(); status.textContent = 'Background saved on this device.';
  } catch { status.textContent = 'This image could not be saved. Try a different file or free some browser storage.'; }
  finally { bitmap?.close(); $('#background-upload').disabled = false; }
});
$('#background-use').addEventListener('click', () => {
  if (!customBackgroundUrl) return;
  settings.backgroundSource = 'custom'; saveState(); renderWallpaper(); refreshBackgroundOptions();
});
$('#background-remove').addEventListener('click', async () => {
  try {
    await backgroundStore('readwrite', store => store.delete('custom'));
    await loadCustomBackground();
    if (settings.backgroundSource === 'custom') settings.backgroundSource = 'bundled';
    settings.backgroundUpdatedAt = Date.now();
    saveState(); renderWallpaper(); refreshBackgroundOptions(); $('#background-status').textContent = 'Uploaded background removed.';
  } catch { toast('The uploaded background could not be removed.'); }
});
function renderUnsplashOptions() {
  $('#unsplash-options').replaceChildren(...UNSPLASH_WALLPAPERS.map(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'wallpaper-option';
    const selected = settings.backgroundSource === 'unsplash' && settings.unsplashId === item.id;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); button.textContent = item.name;
    button.style.backgroundImage = `url("${unsplashImageUrl(item, 400)}")`;
    button.addEventListener('click', () => {
      settings.backgroundSource = 'unsplash'; settings.unsplashId = item.id; settings.wallpaperAt = Date.now();
      saveState(); renderWallpaper(); refreshBackgroundOptions();
    }); return button;
  }));
}
$('#unsplash-load').addEventListener('click', () => { renderUnsplashOptions(); $('#unsplash-load').hidden = true; });

function rotateWallpaper(newTab = false, force = false) {
  if (settings.backgroundSource !== 'bundled') {
    if (!force) return;
    if (settings.backgroundSource === 'unsplash') {
      const index = UNSPLASH_WALLPAPERS.findIndex(item => item.id === settings.unsplashId);
      settings.unsplashId = UNSPLASH_WALLPAPERS[(index + 1) % UNSPLASH_WALLPAPERS.length].id;
      renderWallpaper(); saveState(); return;
    }
    settings.backgroundSource = 'bundled';
  }
  const now = Date.now();
  const next = force ? (settings.wallpaper + 1) % WALLPAPERS.length : nextWallpaper(settings, now, newTab);
  if (next !== settings.wallpaper || !settings.wallpaperAt) {
    settings.wallpaper = next; settings.wallpaperAt = now;
    renderWallpaper(); saveState();
  }
}
$('#wallpaper-next').addEventListener('click', () => rotateWallpaper(false, true));

function updateClock() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: !settings.hour24 }).formatToParts(now);
  const time = parts.filter(x => ['hour', 'minute', 'literal'].includes(x.type)).map(x => x.value).join('').trim();
  const period = parts.find(x => x.type === 'dayPeriod')?.value;
  $('#clock').replaceChildren(document.createTextNode(time));
  if (period) { const small = document.createElement('small'); small.textContent = period; $('#clock').append(small); }
  $('#date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('#menu-date').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  $('#timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop().replaceAll('_', ' ');
}

function renderCalendar() {
  const focusedDate = document.activeElement?.dataset.date;
  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  $('#calendar-heading').textContent = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const today = calendarDateKey(new Date());
  const nodes = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => {
    const el = document.createElement('span'); el.className = 'weekday'; el.textContent = day; return el;
  });
  for (const { date, current } of calendarDays(year, month)) {
    const key = calendarDateKey(date), tasks = calendarTasks[key] || [];
    const el = document.createElement('button'); el.type = 'button'; el.dataset.date = key;
    el.textContent = date.getDate();
    el.className = `calendar-day${key === today ? ' today' : current ? '' : ' other'}`;
    const label = date.toLocaleDateString('en-US', { dateStyle: 'full' });
    el.setAttribute('aria-label', `${label}${tasks.length ? `, ${tasks.filter(task => !task.completed).length} of ${tasks.length} tasks remaining` : ''}`);
    el.setAttribute('aria-haspopup', 'dialog');
    el.title = `${label} · Double-click for tasks`;
    if (key === today) el.setAttribute('aria-current', 'date');
    if (tasks.length) {
      el.classList.add('has-tasks');
      el.classList.toggle('tasks-complete', tasks.every(task => task.completed));
    }
    el.addEventListener('dblclick', () => openTasks(date));
    // Native button activation keeps the same panel accessible by keyboard.
    el.addEventListener('click', event => { if (event.detail === 0) openTasks(date); });
    nodes.push(el);
  }
  $('#calendar').replaceChildren(...nodes);
  if (focusedDate) $('#calendar').querySelector(`[data-date="${focusedDate}"]`)?.focus({ preventScroll: true });
}
$('#month-prev').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); });
$('#month-next').addEventListener('click', () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); });
$('#month-today').addEventListener('click', () => { calendarDate = new Date(); renderCalendar(); });

function normalizeSavedTasks(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(task => task && typeof task.id === 'string' && typeof task.title === 'string' && task.title.trim())
    .map(task => ({ id: task.id, title: task.title.replace(/\s+/g, ' ').trim().slice(0, TASK_TITLE_LIMIT), completed: task.completed === true }));
}

async function loadCalendarTasks() {
  let saved;
  if (globalThis.chrome?.storage?.local) {
    const data = await chrome.storage.local.get(null);
    saved = Object.fromEntries(Object.entries(data).filter(([key]) => key.startsWith(TASK_STORAGE_PREFIX))
      .map(([key, value]) => [key.slice(TASK_STORAGE_PREFIX.length), value]));
  } else saved = JSON.parse(localStorage.getItem('tabtahoe-calendar-tasks') || '{}');
  calendarTasks = Object.fromEntries(Object.entries(saved || {}).filter(([key]) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .map(([key, value]) => [key, normalizeSavedTasks(value)]));
}

let taskSaveChain = Promise.resolve();
function saveCalendarTasks(dateKey) {
  const day = structuredClone(calendarTasks[dateKey] || []);
  const snapshot = structuredClone(calendarTasks);
  taskSaveChain = taskSaveChain.catch(() => {}).then(async () => {
    if (globalThis.chrome?.storage?.local) await chrome.storage.local.set({ [`${TASK_STORAGE_PREFIX}${dateKey}`]: day });
    else localStorage.setItem('tabtahoe-calendar-tasks', JSON.stringify(snapshot));
  }).catch(() => toast('Tasks could not be saved. Browser storage may be full.'));
}

function updateTaskCount() {
  $('#task-count').textContent = `${$('#task-title').value.length} / ${TASK_TITLE_LIMIT}`;
  $('#task-error').hidden = true;
}

function openTasks(date) {
  activeTaskDate = calendarDateKey(date);
  $('#tasks-heading').textContent = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  $('#task-form').reset(); updateTaskCount(); renderTasks(); showDialog('#tasks-dialog'); $('#task-title').focus();
}

function renderTasks() {
  const tasks = calendarTasks[activeTaskDate] || [];
  const focusedTask = document.activeElement?.dataset.taskId;
  const focusedAction = document.activeElement?.dataset.taskAction;
  $('#task-list').replaceChildren(...tasks.map(task => {
    const row = document.createElement('li'); row.className = 'task-row'; row.classList.toggle('completed', task.completed);
    const label = document.createElement('label'); label.className = 'task-label';
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.className = 'task-toggle'; toggle.checked = task.completed;
    toggle.dataset.taskId = task.id; toggle.dataset.taskAction = 'toggle';
    toggle.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Complete'} task: ${task.title}`);
    const title = document.createElement('span'); title.className = 'task-text'; title.textContent = task.title;
    toggle.addEventListener('change', () => {
      task.completed = toggle.checked; row.classList.toggle('completed', task.completed);
      toggle.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Complete'} task: ${task.title}`);
      saveCalendarTasks(activeTaskDate); renderCalendar(); updateTaskSummary();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button task-remove'; remove.textContent = '×';
    remove.dataset.taskId = task.id; remove.dataset.taskAction = 'remove'; remove.setAttribute('aria-label', `Delete task: ${task.title}`);
    remove.addEventListener('click', () => {
      calendarTasks[activeTaskDate] = (calendarTasks[activeTaskDate] || []).filter(item => item.id !== task.id);
      saveCalendarTasks(activeTaskDate); renderTasks(); renderCalendar(); $('#task-title').focus();
    });
    label.append(toggle, title); row.append(label, remove); return row;
  }));
  $('#tasks-empty').hidden = tasks.length > 0;
  updateTaskSummary();
  if (focusedTask) {
    const target = [...$('#task-list').querySelectorAll('[data-task-id]')].find(el => el.dataset.taskId === focusedTask && el.dataset.taskAction === focusedAction);
    target?.focus({ preventScroll: true });
  }
}

function updateTaskSummary() {
  const tasks = calendarTasks[activeTaskDate] || [];
  const remaining = tasks.filter(task => !task.completed).length;
  $('#tasks-summary').textContent = tasks.length ? `${remaining} remaining · ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : '';
}

$('#tasks-dialog').addEventListener('close', () => {
  $('#calendar').querySelector(`[data-date="${activeTaskDate}"]`)?.focus({ preventScroll: true });
});
$('#task-title').maxLength = TASK_TITLE_LIMIT;
$('#task-title').addEventListener('input', updateTaskCount);
$('#task-form').addEventListener('submit', event => {
  event.preventDefault(); if (!activeTaskDate) return;
  const title = $('#task-title').value.replace(/\s+/g, ' ').trim();
  if (!title || title.length > TASK_TITLE_LIMIT) {
    $('#task-error').textContent = `Enter a task title of 1–${TASK_TITLE_LIMIT} characters.`; $('#task-error').hidden = false; return;
  }
  calendarTasks[activeTaskDate] ||= [];
  calendarTasks[activeTaskDate].push({ id: uid(), title, completed: false });
  saveCalendarTasks(activeTaskDate); $('#task-form').reset(); updateTaskCount(); renderTasks(); renderCalendar(); $('#task-title').focus();
});
window.addEventListener('storage', event => {
  if (event.key !== 'tabtahoe-calendar-tasks') return;
  loadCalendarTasks().then(() => { renderCalendar(); if ($('#tasks-dialog').open) renderTasks(); }).catch(() => toast('Tasks could not be refreshed.'));
});

function faviconFingerprint(img) {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  canvas.getContext('2d').drawImage(img, 0, 0, 64, 64);
  return canvas.toDataURL();
}

function defaultFaviconFingerprint() {
  if (!nativePlaceholder) nativePlaceholder = new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => { clearTimeout(timer); try { resolve(faviconFingerprint(img)); } catch { resolve(null); } };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', 'about:blank'); url.searchParams.set('size', '64'); img.src = url.href;
  });
  return nativePlaceholder;
}

function websiteIcon(item) {
  const holder = document.createElement('span'); holder.className = 'website-icon';
  const url = safeUrl(item.url), domain = url ? new URL(url).hostname.replace(/^www\./, '') : '';
  holder.textContent = domain.slice(0, 1).toUpperCase() || '?';
  if (!url) return holder;
  const candidates = [];
  if (faviconCache.has(url)) candidates.push(faviconCache.get(url));
  // The browser knows icons declared at nonstandard paths, including SVGs.
  if (globalThis.chrome?.runtime?.id) {
    const cached = new URL(chrome.runtime.getURL('/_favicon/'));
    cached.searchParams.set('pageUrl', url); cached.searchParams.set('size', '64'); candidates.push(cached.href);
  }
  const origin = new URL(url).origin;
  candidates.push(`${origin}/favicon.ico`, `${origin}/favicon.svg`, `${origin}/apple-touch-icon.png`);
  if (domain !== new URL(url).hostname || domain.split('.').length === 2) {
    candidates.push(`https://${domain}/favicon.ico`, `https://www.${domain}/favicon.ico`);
  }
  const sources = [...new Set(candidates)];
  const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.referrerPolicy = 'no-referrer';
  let index = 0;
  img.onload = async () => {
    if (img.src.startsWith('chrome-extension:')) {
      const placeholder = await defaultFaviconFingerprint();
      try { if (placeholder && faviconFingerprint(img) === placeholder) { img.onerror(); return; } } catch {}
    }
    faviconCache.set(url, img.src); holder.replaceChildren(img);
  };
  img.onerror = () => { if (index < sources.length) img.src = sources[index++]; };
  img.onerror();
  return holder;
}

function finishDrag() {
  draggedId = null; clearTimeout(pageHoverTimer);
  document.body.classList.remove('is-dragging');
  $$('[data-trash]').forEach(target => target.hidden = true);

  $$('.drag-source').forEach(el => el.remove());
  $$('.drop-target, .dragging').forEach(el => el.classList.remove('drop-target', 'dragging'));
}

function refreshFavourites() {
  renderApps();
  if ($('#group-dialog').open) renderGroup();
}

function deleteApp(id) {
  const found = findApp(apps, id); if (!found) return;
  const removed = structuredClone(found.item), parentId = found.parent?.id, oldIndex = found.items.indexOf(found.item);
  const title = found.item.title;
  found.items.splice(oldIndex, 1);
  finishDrag(); saveState(); refreshFavourites();
  toast(`Removed ${title}${found.item.children ? ' and its contents' : ''}.`);
  const undo = document.createElement('button'); undo.className = 'text-button'; undo.textContent = 'Undo';
  undo.addEventListener('click', () => {
    if (!findApp(apps, removed.id)) {
      const target = findApp(apps, parentId)?.item.children || apps;
      target.splice(Math.min(oldIndex, target.length), 0, removed);
    }
    saveState(); refreshFavourites(); toast('Restored.');
  });
  $('#toast').append(undo);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 10000);
}

function dropApp(destinationId = null, beforeId = null) {
  if (draggedId && moveApp(apps, draggedId, destinationId, beforeId)) {
    finishDrag(); saveState(); refreshFavourites();
  } else finishDrag();
}

function appTile(item) {
  const wrapper = document.createElement('div'); wrapper.className = 'app-item'; wrapper.dataset.id = item.id;
  const launch = document.createElement(item.children ? 'button' : 'a');
  launch.className = 'app-item';
  if (item.children) launch.addEventListener('click', () => openGroup(item.id));
  else {
    const url = safeUrl(item.url);
    if (url) { launch.href = url; launch.target = '_blank'; launch.rel = 'noopener noreferrer'; }
    launch.addEventListener('contextmenu', event => { event.preventDefault(); openShortcut(item); });
  }
  const tile = document.createElement('span'); tile.className = `app-tile${item.children ? ' folder-tile' : ''}`;
  if (item.children) {
    for (const child of item.children.slice(0, 4)) {
      const mini = document.createElement('span'); mini.className = 'mini-tile'; mini.style.setProperty('--tile', child.color);
      mini.append(child.children ? document.createTextNode('▦') : websiteIcon(child)); tile.append(mini);
    }
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = item.children.length; tile.append(badge);
  } else { tile.style.setProperty('--tile', item.color); tile.append(websiteIcon(item)); }
  const label = document.createElement('span'); label.className = 'app-label'; label.textContent = `${item.title}${item.children ? ' ▾' : ''}`;
  launch.append(tile, label); wrapper.append(launch);
  wrapper.draggable = true;
  launch.draggable = false;
  wrapper.addEventListener('dragstart', event => {
    event.stopPropagation(); draggedId = item.id;
    event.dataTransfer.setData('text/plain', item.id); event.dataTransfer.effectAllowed = 'move';
    wrapper.classList.add('dragging');
    document.body.classList.add('is-dragging');
    requestAnimationFrame(() => {
      if (draggedId !== item.id) return;
      const dialog = $('#group-dialog');
      $$('[data-trash]').forEach(target => target.hidden = dialog.open && !dialog.contains(target));
    });
  });
  wrapper.addEventListener('dragend', finishDrag);
  wrapper.addEventListener('dragover', event => {
    if (!draggedId || draggedId === item.id) return;
    event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; wrapper.classList.add('drop-target');
  });
  wrapper.addEventListener('dragleave', event => { if (!wrapper.contains(event.relatedTarget)) wrapper.classList.remove('drop-target'); });
  wrapper.addEventListener('drop', event => {
    if (!draggedId) return;
    event.preventDefault(); event.stopPropagation();
    const parentId = findApp(apps, item.id)?.parent?.id || null;
    // Drop on a folder to enter it; drop on a shortcut to reorder before it.
    dropApp(item.children ? item.id : parentId, item.children ? null : item.id);
  });
  return wrapper;
}
function preserveDragSource(container) {
  const source = container.querySelector(':scope > .dragging');
  if (!source) return;
  source.classList.add('drag-source'); document.body.append(source);
}

function renderApps() {
  if (draggedId) preserveDragSource($('#app-grid'));
  const pages = Math.max(1, Math.ceil(apps.length / pageSize));
  currentPage = Math.max(0, Math.min(currentPage, pages - 1));
  $('#app-grid').replaceChildren(...apps.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(item => appTile(item)));
  $('#layout-hint').textContent = 'Drag to arrange · Right-click to edit';
  $('#page-prev').disabled = currentPage === 0; $('#page-next').disabled = currentPage === pages - 1;
  $('#page-status').textContent = `${currentPage + 1} / ${pages}`;
  $('#page-dots').replaceChildren(...Array.from({ length: pages }, (_, index) => {
    const dot = document.createElement('button'); dot.className = 'page-dot';
    dot.setAttribute('aria-label', `Favourites page ${index + 1}`); dot.setAttribute('aria-current', index === currentPage ? 'page' : 'false');
    dot.addEventListener('click', () => { currentPage = index; renderApps(); }); return dot;
  }));
}
function changePage(delta, inGroup = false) {
  if (inGroup) { groupPage += delta; renderGroup(); }
  else { currentPage += delta; renderApps(); }
}
for (const [selector, delta, inGroup] of [['#page-prev', -1, false], ['#page-next', 1, false], ['#group-page-prev', -1, true], ['#group-page-next', 1, true]]) {
  const button = $(selector);
  button.addEventListener('click', () => changePage(delta, inGroup));
  button.addEventListener('dragenter', () => {
    clearTimeout(pageHoverTimer);
    if (draggedId && !button.disabled) pageHoverTimer = setTimeout(() => changePage(delta, inGroup), 650);
  });
  button.addEventListener('dragover', event => { if (draggedId) event.preventDefault(); });
  button.addEventListener('dragleave', () => clearTimeout(pageHoverTimer));
  button.addEventListener('drop', event => { event.preventDefault(); clearTimeout(pageHoverTimer); });
}
$('#app-grid').addEventListener('keydown', event => {
  if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); changePage(event.key === 'ArrowLeft' ? -1 : 1);
});
let swipeStart = null;
$('#app-grid').addEventListener('touchstart', event => { swipeStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
$('#app-grid').addEventListener('touchend', event => {
  if (!swipeStart) return;
  const dx = event.changedTouches[0].clientX - swipeStart.x, dy = event.changedTouches[0].clientY - swipeStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) changePage(dx < 0 ? 1 : -1);
  swipeStart = null;
}, { passive: true });
for (const zone of [...$$('[data-trash]'), $('#move-to-root'), $('#app-grid'), $('#group-apps')]) {
  zone.addEventListener('dragover', event => { if (draggedId) { event.preventDefault(); zone.classList.add('drop-target'); } });
  zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('drop-target'); });
  zone.addEventListener('drop', event => {
    if (!draggedId) return;
    event.preventDefault(); event.stopPropagation();
    if (zone.hasAttribute('data-trash')) deleteApp(draggedId);
    else dropApp(zone.id === 'group-apps' ? activeGroup : null);
  });
}

function openGroup(id) {
  activeGroup = id; groupPage = 0; $('#group-filter').value = ''; renderGroup(); showDialog('#group-dialog');
}
function renderGroup() {
  const found = findApp(apps, activeGroup);
  if (!found?.item.children) { $('#group-dialog').close(); return; }
  const item = found.item;
  $('#group-title').textContent = item.title;
  $('#group-back').hidden = !found.parent;
  const children = item.children.filter(x => x.title.toLowerCase().includes($('#group-filter').value.toLowerCase()));
  const pages = Math.max(1, Math.ceil(children.length / GROUP_PAGE_SIZE));
  groupPage = Math.max(0, Math.min(groupPage, pages - 1));
  if (draggedId) preserveDragSource($('#group-apps'));
  $('#group-apps').replaceChildren(...children.slice(groupPage * GROUP_PAGE_SIZE, (groupPage + 1) * GROUP_PAGE_SIZE).map(child => appTile(child)));
  $('#group-page-prev').disabled = groupPage === 0; $('#group-page-next').disabled = groupPage === pages - 1;
  $('#group-page-status').textContent = `${groupPage + 1} / ${pages}`;
  if (!children.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'A little room for something new. Add a shortcut below.'; $('#group-apps').append(empty); }
}
$('#group-filter').addEventListener('input', () => { groupPage = 0; renderGroup(); });
$('#group-back').addEventListener('click', () => { const parent = findApp(apps, activeGroup)?.parent; if (parent) openGroup(parent.id); });
$('#group-dialog').addEventListener('close', finishDrag);

function openShortcut(item = null, preferredGroup = '') {
  editingApp = item?.id || null;
  const form = $('#shortcut-form'); form.reset(); $('#shortcut-error').textContent = '';
  $('#shortcut-heading').textContent = item ? 'Edit shortcut' : 'Add a shortcut';
  const options = [new Option('Favourites (no group)', ''), ...listGroups(apps).map(x => new Option(x.title, x.id))];
  $('#shortcut-group').replaceChildren(...options);
  if (item) {
    form.elements.title.value = item.title; form.elements.url.value = item.url; form.elements.color.value = item.color;
    $('#shortcut-group').value = findApp(apps, item.id)?.parent?.id || '';
  } else $('#shortcut-group').value = preferredGroup;
  showDialog('#shortcut-dialog');
}
$('#shortcut-add').addEventListener('click', () => openShortcut());
$('#group-shortcut-add').addEventListener('click', () => openShortcut(null, activeGroup));
$('#shortcut-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget; const title = form.elements.title.value.trim(); const url = safeUrl(form.elements.url.value);
  if (!title || !url) { $('#shortcut-error').textContent = 'Enter a name and a valid HTTP or HTTPS website.'; return; }
  const found = findApp(apps, editingApp);
  const item = found?.item || { id: uid() };
  Object.assign(item, { title, url, color: form.elements.color.value });
  if (!found) apps.push(item);
  const destinationId = form.elements.group.value || null;
  if ((found?.parent?.id || null) !== destinationId) moveApp(apps, item.id, destinationId);
  if (!destinationId) currentPage = Math.floor(apps.findIndex(x => x.id === item.id) / pageSize);
  saveState(); renderApps(); if ($('#group-dialog').open) renderGroup(); $('#shortcut-dialog').close();
});

function requestGroupName(rename = false) {
  nameAction = rename ? activeGroup : null;
  $('#name-heading').textContent = rename ? 'Rename group' : 'New group';
  $('#new-group-name').value = rename ? findApp(apps, activeGroup).item.title : '';
  showDialog('#name-dialog');
}
$('#group-add').addEventListener('click', () => requestGroupName());
$('#group-rename').addEventListener('click', () => requestGroupName(true));
$('#name-form').addEventListener('submit', event => {
  event.preventDefault(); const title = $('#new-group-name').value.trim(); if (!title) return;
  if (nameAction) findApp(apps, nameAction).item.title = title;
  else { apps.push(group(title, [])); currentPage = Math.floor((apps.length - 1) / pageSize); }
  saveState(); renderApps(); if (nameAction) renderGroup(); $('#name-dialog').close();
});

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
    pin.addEventListener('click', () => { pinned = isPinned ? pinned.filter(id => id !== bookmark.id) : [...pinned, bookmark.id]; saveState(); renderBookmarks(); });
    row.append(bookmarkCard(bookmark), pin); return row;
  }));
  $('#bookmark-status').textContent = globalThis.chrome?.bookmarks ? `${filtered.length} of ${bookmarks.length} bookmarks · Pin the ones you reach for most.` : 'Browser preview · Load TabTahoe as an extension in Brave to access your bookmarks.';
}
async function loadBookmarks() {
  try {
    if (globalThis.chrome?.bookmarks) bookmarks = flattenBookmarks(await chrome.bookmarks.getTree());
    renderBookmarks();
  } catch { $('#bookmark-status').textContent = 'Bookmarks could not be loaded. Check the extension’s bookmarks permission.'; }
}
$('#bookmarks-open').addEventListener('click', () => { renderBookmarks(); showDialog('#bookmarks-dialog'); });
$('#bookmark-search').addEventListener('input', renderBookmarks);

function openSettings() {
  const form = $('#settings-form');
  for (const key of ['name', 'rotation', 'opacity', 'unit', 'engine']) form.elements[key].value = settings[key];
  form.elements.hour24.checked = settings.hour24;
  form.elements.shortcutStyle.value = getShortcutStyle(settings);
  refreshBackgroundOptions();
  $('#widget-options').replaceChildren(...Object.entries(settings.widgets).map(([key, enabled]) => {
    const label = document.createElement('label'); label.className = 'check-label';
    const input = document.createElement('input'); input.type = 'checkbox'; input.name = `widget-${key}`; input.checked = enabled;
    label.append(input, document.createTextNode(key === 'music' ? 'Sound control' : key[0].toUpperCase() + key.slice(1))); return label;
  }));
  showDialog('#settings-dialog');
}
function refreshBackgroundOptions() {
  $('#wallpaper-options').replaceChildren(...WALLPAPERS.map((wallpaper, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `wallpaper-option${settings.backgroundSource === 'bundled' && index === settings.wallpaper ? ' selected' : ''}`;
    button.style.backgroundImage = `url("${wallpaper.path}")`; button.textContent = wallpaper.name;
    button.setAttribute('aria-pressed', settings.backgroundSource === 'bundled' && index === settings.wallpaper);
    button.addEventListener('click', () => {
      settings.backgroundSource = 'bundled'; settings.wallpaper = index; settings.wallpaperAt = Date.now(); renderWallpaper(); saveState();
      refreshBackgroundOptions();
    }); return button;
  }));
  $('#background-remove').hidden = !customBackgroundUrl;
  $('#background-use').hidden = !customBackgroundUrl || settings.backgroundSource === 'custom';
  if ($('#unsplash-options').childElementCount) renderUnsplashOptions();
}
$('#settings-open').addEventListener('click', openSettings);
$('#customize').addEventListener('click', openSettings);
$('#settings-form').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget;
  for (const key of ['name', 'rotation', 'unit', 'engine']) settings[key] = form.elements[key].value.trim();
  settings.opacity = Number(form.elements.opacity.value); settings.hour24 = form.elements.hour24.checked;
  settings.shortcutStyle = form.elements.shortcutStyle.value;
  settings.iconsOnly = settings.shortcutStyle === 'icons-only';
  Object.keys(settings.widgets).forEach(key => settings.widgets[key] = form.elements[`widget-${key}`].checked);
  settings.wallpaperAt = Date.now();
  saveState(); renderSettings(); loadWeather(); $('#settings-dialog').close(); toast('A little more you. Settings saved.');
});

$('#search-form').addEventListener('submit', event => {
  event.preventDefault(); const destination = searchDestination($('#search').value, settings.engine);
  if (destination) location.assign(destination);
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); if (!$$('dialog').some(x => x.open)) $('#search').focus();
  }
});

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal: signal || AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}
$('#weather-location').addEventListener('click', () => showDialog('#location-dialog'));
$('#location-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  $('#location-status').textContent = 'Looking for your corner of the world…'; $('#city-results').replaceChildren();
  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent($('#city-search').value.trim())}&count=6&language=en&format=json`);
    $('#location-status').textContent = data.results?.length ? 'Choose your city:' : 'No cities found. Try a nearby city or another spelling.';
    $('#city-results').replaceChildren(...(data.results || []).map(city => {
      const button = document.createElement('button'); button.className = 'city-result';
      button.textContent = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
      button.addEventListener('click', () => {
        settings.location = { name: city.name, latitude: city.latitude, longitude: city.longitude };
        saveState(); renderSettings(); loadWeather(); $('#location-dialog').close();
      }); return button;
    }));
  } catch { $('#location-status').textContent = 'City search is unavailable. Check your connection and try again.'; }
  finally { button.disabled = false; }
});
async function loadWeather() {
  if (!settings.location || !settings.widgets.weather) return;
  weatherRequest?.abort(); weatherRequest = new AbortController();
  const request = weatherRequest;
  $('#weather-summary').textContent = 'Updating…';
  const { latitude, longitude } = settings.location;
  try {
    const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${settings.unit}&timezone=auto&forecast_days=1`, AbortSignal.any([request.signal, AbortSignal.timeout(12000)]));
    if (request !== weatherRequest) return;
    if (!data.current || !data.daily) throw new Error('Incomplete forecast');
    $('#temperature').textContent = `${Math.round(data.current.temperature_2m)}°`;
    const [summary, symbol] = weatherDescription(data.current.weather_code);
    $('#weather-summary').textContent = summary; $('#weather-symbol').textContent = symbol;
    $('#weather-range').textContent = `H: ${Math.round(data.daily.temperature_2m_max[0])}°  L: ${Math.round(data.daily.temperature_2m_min[0])}°`;
    $('#humidity').textContent = `${data.current.relative_humidity_2m}% humidity`;
  } catch {
    if (request !== weatherRequest) return;
    $('#temperature').textContent = '—°'; $('#weather-summary').textContent = 'Forecast unavailable';
    $('#weather-range').textContent = 'Will retry automatically'; $('#humidity').textContent = '';
  }
}

// This function runs locally inside the selected website, without remote scripts.
async function websiteMedia(action = 'read', value = null) {
  const elements = [...document.querySelectorAll('video, audio')];
  const media = elements.find(el => !el.paused && !el.ended) || elements.find(el => el.readyState > 0) || elements[0];
  if (!media) return null;
  if (action === 'toggle') { if (media.paused) await media.play(); else media.pause(); }
  if (action === 'volume') { media.volume = value; media.muted = value === 0; }
  if (action === 'seek' && Number.isFinite(media.duration) && media.seekable.length) {
    const time = media.duration * value / 100;
    for (let i = 0; i < media.seekable.length; i++) {
      if (time >= media.seekable.start(i) && time <= media.seekable.end(i)) { media.currentTime = time; break; }
    }
  }
  return { paused: media.paused, muted: media.muted, volume: media.volume, current: media.currentTime,
    duration: Number.isFinite(media.duration) ? media.duration : null, seekable: media.seekable.length > 0 };
}

function renderSound(tab, media = null, hasAccess = false) {
  $('#track-title').textContent = tab?.title || 'Your browser, in harmony';
  $('#track-subtitle').textContent = tab ? new URL(tab.url).hostname : 'Sound from your open websites.';
  $('#sound-open').disabled = !tab; $('#sound-mute').disabled = !tab;
  const muted = Boolean(tab?.mutedInfo?.muted);
  $('#sound-mute').textContent = muted ? 'Unmute tab' : 'Mute tab';
  $('#sound-mute').setAttribute('aria-pressed', muted);
  $('#sound-connect').hidden = !tab || hasAccess;
  $('#sound-status').textContent = !globalThis.chrome?.tabs ? 'Load the extension in Brave to control website sound.'
    : !tab ? 'Open a website such as YouTube to get started.'
    : !hasAccess ? 'Mute this tab, or enable playback and volume controls.'
    : !media ? 'No accessible audio or video. Start playback on the website. Tab mute is available.'
    : muted ? 'This tab is muted.' : media.muted ? 'This website’s player is muted. Adjust volume to unmute.' : media.paused ? 'Paused on this website.' : 'Playing on this website.';
  $('#play').disabled = !media; $('#volume').disabled = !media;
  $('#seek').disabled = !media?.duration || !media.seekable;
  $('#play').textContent = media && !media.paused ? 'Ⅱ' : '▶';
  $('#play').setAttribute('aria-label', media && !media.paused ? 'Pause website media' : 'Play website media');
  if (document.activeElement !== $('#volume')) $('#volume').value = media ? (media.muted ? 0 : media.volume) : .7;
  if (document.activeElement !== $('#seek')) $('#seek').value = media?.duration ? media.current / media.duration * 100 : 0;
  $('#audio-current').textContent = formatDuration(media?.current);
  $('#audio-duration').textContent = media && !media.duration ? 'Live' : formatDuration(media?.duration);
}

function sitePermission(tab) {
  const url = new URL(tab.url);
  return `${url.protocol}//${url.hostname}/*`;
}

async function refreshSound(action = 'read', value = null) {
  if (soundBusy) {
    if (action !== 'read') soundCommands.push({ action, value, tabId: selectedTabId });
    return;
  }
  if (document.hidden && action === 'read') return;
  soundBusy = true;
  try {
    if (!globalThis.chrome?.tabs) { renderSound(null); return; }
    soundTabs = (await chrome.tabs.query({})).filter(tab => /^https?:\/\//.test(tab.url || ''));
    soundTabs.sort((a, b) => Number(Boolean(b.audible)) - Number(Boolean(a.audible)) || a.id - b.id);
    if (!soundTabs.some(tab => tab.id === selectedTabId)) {
      if (action !== 'read') return;
      selectedTabId = soundTabs[0]?.id ?? null;
    }
    const tab = soundTabs.find(tab => tab.id === selectedTabId);
    const source = $('#sound-source');
    // Preserve the focused selector while the user chooses another website.
    if (document.activeElement !== source) {
      source.replaceChildren(...(soundTabs.length ? soundTabs.map(item => new Option(`${item.audible ? '♪ ' : ''}${item.title || new URL(item.url).hostname}`, item.id)) : [new Option('No websites open', '')]));
      source.value = selectedTabId === null ? '' : String(selectedTabId);
    }
    source.disabled = !soundTabs.length;
    mediaFrameId = action === 'read' ? null : mediaFrameId;
    if (!tab) { renderSound(null); return; }
    const hasAccess = await chrome.permissions.contains({ origins: [sitePermission(tab)] });
    if (tab.id !== selectedTabId) return;
    if (!hasAccess) { mediaFrameId = null; renderSound(tab); return; }
    try {
      if (action !== 'read' && mediaFrameId === null) return;
      const target = action !== 'read' && mediaFrameId !== null ? { tabId: tab.id, frameIds: [mediaFrameId] } : { tabId: tab.id, allFrames: true };
      const results = await chrome.scripting.executeScript({ target, func: websiteMedia, args: [action, value] });
      if (tab.id !== selectedTabId) return;
      const found = results.find(result => result.result && !result.result.paused) || results.find(result => result.result);
      mediaFrameId = found?.frameId ?? null;
      renderSound(tab, found?.result, true);
    } catch {
      if (tab.id !== selectedTabId) return;
      mediaFrameId = null; renderSound(tab, null, true);
      if (action !== 'read') toast('This website could not apply the control. Open its tab to use the player.');
    }
  } catch { renderSound(null); $('#sound-status').textContent = 'Could not access tabs. Reload the extension and try again.'; }
  finally {
    soundBusy = false;
    const next = soundCommands.shift();
    if (next && next.tabId === selectedTabId) refreshSound(next.action, next.value);
  }
}
$('#sound-source').addEventListener('blur', () => refreshSound());
$('#sound-source').addEventListener('change', event => { selectedTabId = Number(event.target.value); mediaFrameId = null; refreshSound(); });
$('#sound-connect').addEventListener('click', async () => {
  const tab = soundTabs.find(tab => tab.id === selectedTabId); if (!tab) return;
  try {
    const granted = await chrome.permissions.request({ origins: [sitePermission(tab)] });
    if (granted) refreshSound(); else toast('Playback access was not enabled. Tab mute is still available.');
  } catch { toast('Website access could not be enabled. Reload the extension and try again.'); }
});
$('#sound-mute').addEventListener('click', async () => {
  const tab = soundTabs.find(tab => tab.id === selectedTabId); if (!tab) return;
  try { await chrome.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted }); refreshSound(); }
  catch { toast('That tab is no longer available.'); refreshSound(); }
});
$('#sound-open').addEventListener('click', async () => {
  const tab = soundTabs.find(tab => tab.id === selectedTabId); if (!tab) return;
  try { await chrome.tabs.update(tab.id, { active: true }); await chrome.windows.update(tab.windowId, { focused: true }); }
  catch { toast('That tab is no longer available.'); refreshSound(); }
});
$('#play').addEventListener('click', () => refreshSound('toggle'));
$('#volume').addEventListener('change', event => refreshSound('volume', Number(event.target.value)));
$('#seek').addEventListener('change', event => refreshSound('seek', Number(event.target.value)));

async function init() {
  try {
    const saved = await readState();
    settings = { ...structuredClone(DEFAULT_SETTINGS), ...saved.settings, widgets: { ...DEFAULT_SETTINGS.widgets, ...saved.settings?.widgets } };
    settings.wallpaper = Math.max(0, Math.min(WALLPAPERS.length - 1, Number(settings.wallpaper) || 0));
    apps = Array.isArray(saved.apps) ? saved.apps : initialApps();
    pinned = Array.isArray(saved.pinned) ? saved.pinned : [];
  } catch { apps = initialApps(); toast('Saved preferences could not be read. Using defaults.'); }
  try { await loadCalendarTasks(); } catch { toast('Saved tasks could not be read.'); }
  try { await loadCustomBackground(); } catch { if (settings.backgroundSource === 'custom') toast('Your uploaded background is unavailable. Showing a bundled wallpaper.'); }
  rotateWallpaper(true); renderSettings(); renderApps(); renderCalendar(); loadBookmarks(); loadWeather(); refreshSound();
  setInterval(() => { if (settings.widgets.music) refreshSound(); }, 1500);
  setInterval(() => { updateClock(); rotateWallpaper(); }, 10000);
  setInterval(loadWeather, 15 * 60 * 1000);
  setInterval(renderCalendar, 60 * 1000);
  if (globalThis.chrome?.bookmarks) {
    for (const name of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered', 'onImportEnded']) chrome.bookmarks[name]?.addListener(loadBookmarks);
  }
  if (globalThis.chrome?.storage?.onChanged) chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.settings?.newValue) {
      const previousLocation = JSON.stringify(settings.location), previousUnit = settings.unit;
      const previousBackground = settings.backgroundUpdatedAt;
      settings = { ...settings, ...changes.settings.newValue }; renderSettings();
      if (previousBackground !== settings.backgroundUpdatedAt) loadCustomBackground().then(renderWallpaper).catch(() => toast('The uploaded background could not be loaded.'));
      if (previousLocation !== JSON.stringify(settings.location) || previousUnit !== settings.unit) loadWeather();
    }
    for (const [key, change] of Object.entries(changes)) {
      if (!key.startsWith(TASK_STORAGE_PREFIX)) continue;
      const dateKey = key.slice(TASK_STORAGE_PREFIX.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
      const updated = normalizeSavedTasks(change.newValue);
      if (JSON.stringify(calendarTasks[dateKey] || []) === JSON.stringify(updated)) continue;
      calendarTasks[dateKey] = updated;
      renderCalendar(); if ($('#tasks-dialog').open && activeTaskDate === dateKey) renderTasks();
    }
    if (changes.apps?.newValue) { apps = changes.apps.newValue; renderApps(); if ($('#group-dialog').open) renderGroup(); }
    if (changes.pinned?.newValue) { pinned = changes.pinned.newValue; renderBookmarks(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateClock(); renderCalendar(); rotateWallpaper(); refreshSound(); } });
}
init();

// Match launcher capacity to the available height instead of extending the page.
function updateLauncherCapacity() {
  const grid = $('#app-grid');
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const rows = Math.max(1, Math.min(3, Math.floor(grid.clientHeight / 90)));
  const capacity = Math.max(columns, rows * columns);
  if (capacity === pageSize) return;
  const firstItem = currentPage * pageSize; pageSize = capacity;
  currentPage = Math.floor(firstItem / pageSize); grid.style.setProperty('--launcher-rows', rows); renderApps();
}
new ResizeObserver(updateLauncherCapacity).observe($('#app-grid'));
