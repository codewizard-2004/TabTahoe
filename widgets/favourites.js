import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from '../core.js';
import { createWidgetView } from '../ui/widget-view.js';

import { createIconRenderer } from '../ui/icons.js';

export function mountFavourites(context, services) {
  const { instance, scope } = context;
  const { $, $$, showDialog } = createWidgetView(context, 'favourites', ['shortcut-dialog', 'group-dialog', 'name-dialog']);
  const uid = () => crypto.randomUUID();
  const group = (title, children) => ({ id: uid(), title, children });
  const toast = services.toast;
  const websiteIcon = createIconRenderer(scope);
  let apps = services.getCollection(instance.settings.collectionId);
  let activeGroup = null, editingApp = null, nameAction = null;
  let currentPage = 0, groupPage = 0, pageSize = 12, draggedId = null, pageHoverTimer, toastTimer;
  const GROUP_PAGE_SIZE = 8;
  function applyShortcutStyle() {
    const root = $('#app-grid').closest('.grid-stack-item');
    const style = context.instance.settings.shortcutStyle || 'coloured';
    root.classList.toggle('icons-only', style === 'icons-only');
    root.classList.toggle('glass-shortcuts', style === 'glass');
    root.classList.toggle('clear-glass-shortcuts', style === 'clear-glass');
    const groupDialog = $('#group-dialog');
    groupDialog.classList.toggle('icons-only', style === 'icons-only');
    groupDialog.classList.toggle('glass-shortcuts', style === 'glass');
    groupDialog.classList.toggle('clear-glass-shortcuts', style === 'clear-glass');
  }
  function saveState() {
    services.saveCollection(instance.settings.collectionId, apps).catch(() => toast('Shortcuts could not be saved. Your layout has not been changed.'));
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
  scope.listen(undo, 'click', () => {
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
  source.classList.add('drag-source'); source.dataset.dragOwner = instance.id; document.body.append(source);
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
for (const zone of [...$$('[data-trash]'), $('#move-to-root'), $('#app-grid'), $('#group-apps')]) {
  zone.addEventListener('dragover', event => { if (draggedId) { event.preventDefault(); zone.classList.add('drop-target'); } });
  zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('drop-target'); });
  zone.addEventListener('drop', event => {
    if (!draggedId) return;
    event.preventDefault(); event.stopPropagation();
    if (zone.hasAttribute('data-trash')) deleteApp(draggedId);
    else dropApp(zone.dataset.role === 'group-apps' ? activeGroup : null);
  });
}

function openGroup(id) {
  activeGroup = id; groupPage = 0; $('#group-filter').value = '';
  renderGroup(); showDialog('#group-dialog');
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

function updateLauncherCapacity() {
  const grid = $('#app-grid');
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const rows = Math.max(1, Math.min(3, Math.floor(grid.clientHeight / 90)));
  const capacity = Math.max(columns, rows * columns);
  if (capacity === pageSize) return;
  const firstItem = currentPage * pageSize; pageSize = capacity;
  currentPage = Math.floor(firstItem / pageSize); grid.style.setProperty('--launcher-rows', rows); renderApps();
}

  function update() { $('.section-heading h2').textContent = context.instance.settings.title; applyShortcutStyle(); updateLauncherCapacity(); }
  scope.observe(new ResizeObserver(updateLauncherCapacity), $('#app-grid'));
  scope.cleanup(services.subscribe((kind, id) => {
    if (kind !== 'collection' || id !== instance.settings.collectionId) return;
    try { apps = services.getCollection(id); refreshFavourites(); }
    catch { toast('This shortcut collection could not be refreshed.'); }
  }));
  scope.cleanup(() => { finishDrag(); clearTimeout(pageHoverTimer); clearTimeout(toastTimer); });
  renderApps(); update();
  return { update, resize: updateLauncherCapacity };
}
