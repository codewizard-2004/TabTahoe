import { createCanvasAdapter } from './canvas/adapter.js';
import { createWidgetRuntime } from './widgets/runtime.js';
import { registerDashboardWidgets } from './widgets/dashboard.js';
import { createBrowserStorage } from './storage/browser.js';
import { createContentStore } from './storage/content.js';
import { createWorkspaceStore, WORKSPACE_KEY, LayoutConflictError, validateWorkspace, validateCanvas } from './storage/workspace.js';
import { initialApps } from './storage/default-apps.js';
import { createAppearanceControls } from './ui/appearance.js';
import { getImageAsset, saveImageAsset, getSoundAsset, saveSoundAsset } from './storage/assets.js';

const $ = selector => document.querySelector(selector);
let toastTimer;
function toast(message) {
  const dialogs = [...document.querySelectorAll('dialog[open]')];
  (dialogs.at(-1) || document.body).append($('#toast'));
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 5000);
}
function announce(message) { $('#canvas-announcement').textContent = message; }
const dialogOpeners = new WeakMap();
function showDialog(id) { const dialog = $(id); if (!dialog.open) { dialogOpeners.set(dialog, document.activeElement); dialog.showModal(); } }
for (const dialog of document.querySelectorAll('dialog')) {
  for (const button of dialog.querySelectorAll('.close-dialog')) button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialog.contains($('#toast'))) document.body.append($('#toast'));
    const opener = dialogOpeners.get(dialog); dialogOpeners.delete(dialog);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}

const backend = createBrowserStorage();
const content = createContentStore(backend, toast);
let workspace, canvas, adapter, runtime, editing = false, saving = false, addingWidget = false, conflict = false, externalPending = false;
let settingsWidgetId, renameLayoutId = null, pendingDraft = null, draftIsOutdated = false, settingsImageAssets = [], settingsImageAssetsLoaded = false;
const handles = new Map();
const history = { past: [], future: [], current: null, timer: null, announceTimer: null, applying: false };
const draftKey = 'tabtahoe:canvas-edit-draft';
const services = { ...content, toast, updateWidget, getImage: getImageAsset, saveImage: saveImageAsset, getSound: getSoundAsset };
const registry = registerDashboardWidgets(services);
const store = createWorkspaceStore(backend, registry);
const appearance = createAppearanceControls({ toast, showDialog, onSave: async preferences => {
  if (!workspace) throw new Error('Saved layouts are unavailable. Your original data is retained.');
  canvas.preferences = preferences; content.setPreferences(preferences);
  if (editing) recordHistory();
  else await saveCurrent();
} });
const activeLayout = () => workspace.layouts.find(layout => layout.id === workspace.activeLayoutId);
const metadataFor = type => registry.list().find(definition => definition.type === type);

function captureCanvas() {
  return validateCanvas({ ...canvas, layout: adapter.serialize(), preferences: appearance.get() }, registry);
}
function snapshotKey(value) { return JSON.stringify(value); }
function updateHistoryControls() {
  $('#undo-layout').disabled = !editing || saving || !history.past.length;
  $('#redo-layout').disabled = !editing || saving || !history.future.length;
}
function persistEditDraft() {
  if (!editing || !workspace || history.applying || !adapter) return;
  try { sessionStorage.setItem(draftKey, JSON.stringify({ revision: workspace.revision, canvas: captureCanvas() })); }
  catch { announce('This browser could not keep a recovery copy of the current edit. Save your layout before closing the tab.'); }
}
function recordHistory() {
  clearTimeout(history.timer); history.timer = null;
  if (!editing || history.applying || !adapter) return;
  try {
    const next = captureCanvas();
    if (!history.current) history.current = next;
    if (snapshotKey(next) === snapshotKey(history.current)) return;
    history.past.push(history.current);
    if (history.past.length > 100) history.past.shift();
    history.current = next; history.future = [];
    updateHistoryControls(); persistEditDraft();
  } catch (error) { announce(error.message); }
}
function scheduleHistory() {
  if (!editing || history.applying) return;
  clearTimeout(history.timer); history.timer = setTimeout(recordHistory, 220);
}
function scheduleGeometryAnnouncement(id, geometry) {
  if (!editing) return;
  clearTimeout(history.announceTimer);
  history.announceTimer = setTimeout(() => {
    const node = [...$('#dashboard-canvas').children].find(item => item.dataset.instanceId === id);
    if (node && geometry) announce(`${node.getAttribute('aria-label')}: column ${geometry.x + 1}, row ${geometry.y + 1}, ${geometry.w} by ${geometry.h} cells.`);
  }, 300);
}
function resetHistory(snapshot = null) {
  clearTimeout(history.timer); history.timer = null;
  clearTimeout(history.announceTimer); history.announceTimer = null;
  history.past = []; history.future = []; history.current = snapshot ? structuredClone(snapshot) : null;
  updateHistoryControls();
}
async function travelHistory(direction) {
  if (!editing || saving) return;
  const focusedWidget = document.activeElement?.closest?.('[data-instance-id]');
  const widgetId = focusedWidget?.dataset.instanceId;
  const focusedClass = focusedWidget && [...document.activeElement.classList].find(name => name.startsWith('widget-'));
  clearTimeout(history.timer); recordHistory();
  const source = direction === 'undo' ? history.past : history.future;
  const destination = direction === 'undo' ? history.future : history.past;
  const next = source.pop();
  if (!next) return;
  destination.push(history.current); history.current = structuredClone(next);
  history.applying = true;
  try {
    canvas = structuredClone(next); await renderCanvas();
    history.applying = false;
    if (widgetId) {
      const restored = [...$('#dashboard-canvas').children].find(node => node.dataset.instanceId === widgetId);
      const control = restored && (focusedClass ? restored.querySelector(`.${focusedClass}`) : null);
      (control || $('#dashboard-canvas').querySelector('.canvas-move-handle') || $('#add-widget')).focus();
    }
    updateHistoryControls(); persistEditDraft(); announce(direction === 'undo' ? 'Last canvas change undone.' : 'Canvas change redone.');
  } finally { history.applying = false; }
}
function updateControls() {
  $('#canvas-edit-actions').hidden = !editing;
  $('#canvas-instructions').hidden = !editing;
  $('#canvas-mode').textContent = editing ? (draftIsOutdated ? 'Recovered draft · save as a new layout' : 'Editing · Save layout to keep your work') : 'Your space, your way.';
  $('#save-layout').textContent = draftIsOutdated ? 'Save recovered copy' : 'Save layout';
  $('#canvas-toolbar').hidden = !editing;
  $('#customize').hidden = editing;
  $('#change-layout').hidden = editing;
  $('#canvas-empty').hidden = !canvas || canvas.widgets.length > 0;
  $('#active-layout-name').textContent = workspace ? activeLayout().name : 'Saved layouts unavailable';
  adapter?.setEditing(editing && !saving);
  $('#layouts-draft-notice').hidden = !editing;
  const recoveryPending = Boolean(pendingDraft);
  for (const selector of ['#save-layout', '#cancel-layout', '#add-widget', '#undo-layout', '#redo-layout', '#general-settings', '#layout-name-submit', '#conflict-copy', '#conflict-reload']) if ($(selector)) $(selector).disabled = saving || !workspace || recoveryPending;
  for (const selector of ['#empty-add', '#customize', '#change-layout', '#wallpaper-next']) if ($(selector)) $(selector).disabled = saving || !workspace || recoveryPending;
  $('#dashboard-canvas').classList.toggle('canvas-is-editing', editing);
  updateHistoryControls();
}
function beginEditing() {
  if (pendingDraft) { announce('Resume or discard the recovered draft before starting another edit.'); return; }
  if (!workspace || saving || editing) return;
  editing = true; resetHistory(captureCanvas()); updateControls(); persistEditDraft();
  if (!document.querySelector('dialog[open]')) ($('#dashboard-canvas').querySelector('.canvas-move-handle') || $('#add-widget')).focus();
  announce('Editing canvas. Save layout to commit, or Cancel to restore your saved arrangement.');
}

async function renderCanvas() {
  clearTimeout(history.announceTimer); history.announceTimer = null;
  runtime?.destroy(); handles.clear(); adapter?.destroy();
  $('#dashboard-canvas').replaceChildren();
  await content.load(canvas);
  content.setPreferences(canvas.preferences);
  await appearance.apply(canvas.preferences);
  let previousLayout = structuredClone(canvas.layout);
  adapter = createCanvasAdapter($('#dashboard-canvas'), { onChange: layout => {
    const changed = layout.find(item => snapshotKey(item) !== snapshotKey(previousLayout.find(old => old.id === item.id))) || layout[0];
    previousLayout = structuredClone(layout); canvas.layout = layout; scheduleHistory();
    if (changed) scheduleGeometryAnnouncement(changed.id, changed);
  } });
  runtime = createWidgetRuntime(registry, { onError: (_error, id) => announce(`A widget could not load: ${id}. Other widgets remain available.`) });
  for (const geometry of canvas.layout) {
    const instance = canvas.widgets.find(item => item.id === geometry.id);
    const definition = metadataFor(instance.type);
    const supported = definition?.version === instance.version;
    const node = document.createElement('section'); node.dataset.instanceId = instance.id; node.dataset.widgetType = instance.type;
    node.setAttribute('aria-label', supported ? instance.settings.title || definition.title : 'Unavailable widget');
    const shell = document.createElement('div'); shell.className = `grid-stack-item-content widget-shell glass widget-${instance.type}`;
    const controls = document.createElement('div'); controls.className = 'widget-edit-controls';
    const move = document.createElement('button'); move.className = 'canvas-move-handle subtle-button'; move.textContent = '⠿'; move.setAttribute('aria-label', `Move or resize ${node.getAttribute('aria-label')}`); move.setAttribute('aria-describedby', 'canvas-instructions');
    const label = document.createElement('span'); label.className = 'widget-edit-title'; label.textContent = node.getAttribute('aria-label');
    const configure = document.createElement('button'); configure.className = 'widget-configure subtle-button'; configure.textContent = '⚙'; configure.setAttribute('aria-label', 'Widget settings'); configure.disabled = !supported;
    const duplicate = document.createElement('button'); duplicate.className = 'widget-duplicate subtle-button'; duplicate.textContent = '⧉'; duplicate.setAttribute('aria-label', 'Duplicate widget'); duplicate.disabled = !supported;
    const resize = document.createElement('button'); resize.className = 'widget-resize-keyboard subtle-button'; resize.textContent = '↘'; resize.setAttribute('aria-label', `Resize ${node.getAttribute('aria-label')} with arrow keys`); resize.title = 'Focus, then use arrow keys to resize';
    const lock = document.createElement('button'); lock.className = 'widget-lock subtle-button'; lock.textContent = geometry.locked ? '🔒' : '◇'; lock.setAttribute('aria-pressed', String(Boolean(geometry.locked))); lock.setAttribute('aria-label', geometry.locked ? 'Unlock widget' : 'Lock widget position and size');
    const remove = document.createElement('button'); remove.className = 'widget-remove subtle-button'; remove.textContent = '✕'; remove.setAttribute('aria-label', 'Remove widget');
    controls.append(move, label, configure, duplicate, resize, lock, remove);
    const body = document.createElement('div'); body.className = 'widget-content'; shell.append(controls, body); node.append(shell);
    adapter.mount(node, geometry);
    if (supported) handles.set(instance.id, runtime.mount(instance, body));
    else { const message = document.createElement('p'); message.className = 'widget-error'; message.textContent = 'This widget type or version is unavailable. Its configuration has been retained. You can keep it here or remove it in Edit canvas.'; body.append(message); }
    configure.addEventListener('click', () => openWidgetSettings(instance.id));
    duplicate.addEventListener('click', () => addWidget(instance.type, instance.id).catch(error => toast(error.message)));
    remove.addEventListener('click', () => {
      if (!editing || saving) return;
      handles.get(instance.id)?.destroy(); handles.delete(instance.id); adapter.remove(instance.id);
      canvas.widgets = canvas.widgets.filter(item => item.id !== instance.id); canvas.layout = adapter.serialize();
      recordHistory(); updateControls();
      const nextFocus = [...$('#dashboard-canvas').querySelectorAll('.canvas-move-handle')][0] || $('#add-widget'); nextFocus.focus(); announce('Widget removed from this draft. Its saved content is retained.');
    });
    lock.addEventListener('click', () => {
      if (!editing || saving) return;
      const nextLocked = !adapter.serialize().find(item => item.id === instance.id).locked;
      adapter.setLocked(instance.id, nextLocked); lock.textContent = nextLocked ? '🔒' : '◇';
      lock.setAttribute('aria-pressed', String(nextLocked)); lock.setAttribute('aria-label', nextLocked ? 'Unlock widget position and size' : 'Lock widget position and size');
      recordHistory(); announce(`${label.textContent} ${nextLocked ? 'locked' : 'unlocked'}.`);
    });
    resize.addEventListener('keydown', event => {
      if (!editing || saving || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const cell = adapter.serialize().find(item => item.id === instance.id);
      const dw = Number(event.key === 'ArrowRight') - Number(event.key === 'ArrowLeft');
      const dh = Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
      try { adapter.update(instance.id, { w: cell.w + dw, h: cell.h + dh }); recordHistory(); announce(`${label.textContent}: ${adapter.serialize().find(item => item.id === instance.id).w} by ${adapter.serialize().find(item => item.id === instance.id).h} cells.`); }
      catch (error) { announce(error.message); }
    });
    resize.addEventListener('focus', () => {
      if (!editing) return;
      scheduleGeometryAnnouncement(instance.id, adapter.serialize().find(item => item.id === instance.id));
    });
    move.addEventListener('keydown', event => {
      if (!editing || saving || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const cell = adapter.serialize().find(item => item.id === instance.id);
      const dx = Number(event.key === 'ArrowRight') - Number(event.key === 'ArrowLeft'), dy = Number(event.key === 'ArrowDown') - Number(event.key === 'ArrowUp');
      try {
        adapter.update(instance.id, event.shiftKey ? { w: cell.w + dx, h: cell.h + dy } : { x: cell.x + dx, y: cell.y + dy });
        const next = adapter.serialize().find(item => item.id === instance.id);
        scheduleHistory(); scheduleGeometryAnnouncement(instance.id, next);
      } catch (error) { announce(error.message); }
    });
    move.addEventListener('focus', () => {
      if (!editing) return;
      const cell = adapter.serialize().find(item => item.id === instance.id);
      scheduleGeometryAnnouncement(instance.id, cell);
    });
  }
  updateControls();
}

async function applyWorkspace(next, { preserveDraft = false } = {}) {
  workspace = next; canvas = structuredClone(activeLayout().canvas); editing = false; conflict = false;
  resetHistory(canvas); sessionStorage.removeItem(draftKey);
  if (!preserveDraft) { pendingDraft = null; draftIsOutdated = false; $('#draft-recovery').hidden = true; }
  $('#canvas-conflict').hidden = true;
  await renderCanvas();
}
function showConflict(message) {
  conflict = true; $('#canvas-conflict').hidden = false; $('#canvas-conflict-message').textContent = message;
  announce(message);
}
async function persist(candidate, after, expectedRevision = workspace.revision) {
  if (saving) throw new Error('A layout save is already in progress.');
  saving = true; updateControls();
  try {
    const next = await store.commit(candidate, expectedRevision);
    workspace = next;
    await after(next);
    conflict = false; $('#canvas-conflict').hidden = true;
    return next;
  } catch (error) {
    if (error instanceof LayoutConflictError) showConflict(error.message);
    throw error;
  } finally {
    saving = false; updateControls();
    if (externalPending) { externalPending = false; refreshExternal(); }
  }
}
async function saveCurrent() {
  recordHistory();
  const saved = captureCanvas();
  const candidate = structuredClone(workspace);
  let savedName;
  if (draftIsOutdated) {
    const id = crypto.randomUUID(); savedName = `Recovered ${activeLayout().name}`.slice(0, 60);
    candidate.layouts.push({ id, name: savedName, canvas: saved }); candidate.activeLayoutId = id;
  } else {
    candidate.layouts.find(layout => layout.id === candidate.activeLayoutId).canvas = saved; savedName = activeLayout().name;
  }
  await persist(candidate, async () => { canvas = saved; editing = false; draftIsOutdated = false; resetHistory(saved); sessionStorage.removeItem(draftKey); });
  $('#customize').focus(); toast(`Saved “${savedName}”.`);
}
async function updateWidget(id, values) {
  const instance = canvas.widgets.find(item => item.id === id);
  if (!instance) return;
  const next = registry.validate({ ...instance, settings: { ...instance.settings, ...values } });
  instance.settings = next.settings; handles.get(id)?.update(next.settings);
  const node = [...$('#dashboard-canvas').children].find(item => item.dataset.instanceId === id);
  if (node) { node.setAttribute('aria-label', next.settings.title); node.querySelector('.widget-edit-title').textContent = next.settings.title; }
  if (editing) recordHistory();
  if (!editing) {
    try { await saveCurrent(); }
    catch (error) { beginEditing(); toast(error.message); }
  }
}

async function addWidget(type, sourceId = null) {
  if (!editing || saving || addingWidget) return;
  addingWidget = true;
  try {
    const source = canvas.widgets.find(item => item.id === sourceId);
    const defaults = appearance.get();
    const settings = source ? structuredClone(source.settings) : type === 'clock' ? { hour24: defaults.hour24 } : type === 'greeting' ? { name: defaults.name } : type === 'search' ? { engine: defaults.engine } : type === 'weather' ? { unit: defaults.unit, city: defaults.location?.name || '', latitude: defaults.location?.latitude || 0, longitude: defaults.location?.longitude || 0 } : type === 'favourites' ? { shortcutStyle: defaults.shortcutStyle || 'coloured' } : {};
    if (type === 'favourites') {
      settings.collectionId = crypto.randomUUID();
      await content.saveCollection(settings.collectionId, source ? content.getCollection(source.settings.collectionId) : []);
    }
    const instance = registry.create(type, settings), definition = metadataFor(type);
    if (source && type === 'notes') {
      const savedNotes = await content.getWidgetContent(source.id);
      if (savedNotes !== undefined) await content.saveWidgetContent(instance.id, structuredClone(savedNotes));
    }
    if (source && type === 'image') {
      const savedImages = await content.getWidgetContent(`image-carousel:${source.id}`);
      if (savedImages !== undefined) await content.saveWidgetContent(`image-carousel:${instance.id}`, structuredClone(savedImages));
    }
    const layout = adapter.serialize(), y = Math.max(0, ...layout.map(item => item.y + item.h));
    const geometry = { id: instance.id, x: 0, y, ...definition.defaultSize, minW: definition.minimumSize.w, minH: definition.minimumSize.h };
    canvas = validateCanvas({ ...captureCanvas(), widgets: [...canvas.widgets, instance], layout: [...layout, geometry] }, registry);
    await renderCanvas();
    const node = [...$('#dashboard-canvas').children].find(node => node.dataset.instanceId === instance.id);
    $('#widget-gallery-dialog').close();
    node.scrollIntoView({ block: 'nearest' }); node.querySelector('.canvas-move-handle').focus();
    recordHistory(); announce(`${definition.title} added. Save layout to keep it.`);
  } finally { addingWidget = false; }
}

const galleryIcons = { topbar: '◭', search: '⌕', greeting: '✳', clock: '◷', weather: '☀', music: '◖', calendar: '▦', bookmarks: '⚑', favourites: '▦', timer: '◴', spacer: '⋯', notes: '▤', quote: '❝', image: '▧' };
function renderGallery() {
  const gallery = $('#widget-gallery');
  gallery.replaceChildren(...registry.list().map(definition => {
    const card = document.createElement('article'); card.className = 'widget-gallery-card glass'; card.dataset.galleryType = definition.type; card.setAttribute('role', 'listitem');
    const preview = document.createElement('div'); preview.className = `widget-gallery-preview widget-gallery-${definition.type}`;
    const icon = document.createElement('span'); icon.className = 'widget-gallery-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = galleryIcons[definition.type] || '◈';
    const previewLabel = document.createElement('span'); previewLabel.textContent = definition.title;
    preview.append(icon, previewLabel);
    const title = document.createElement('h3'); title.textContent = definition.title;
    const description = document.createElement('p'); description.textContent = definition.description;
    const size = document.createElement('p'); size.className = 'help'; size.textContent = `Starts at ${definition.defaultSize.w} × ${definition.defaultSize.h} cells · minimum ${definition.minimumSize.w} × ${definition.minimumSize.h}`;
    const add = document.createElement('button'); add.className = 'primary-button'; add.textContent = `Add ${definition.title}`;
    add.addEventListener('click', () => addWidget(definition.type).catch(error => toast(error.message)));
    card.append(preview, title, description, size, add); return card;
  }));
}
function openWidgetGallery() {
  if (!editing || saving) return;
  renderGallery(); showDialog('#widget-gallery-dialog');
}

function openWidgetSettings(id) {
  settingsWidgetId = id;
  const instance = canvas.widgets.find(item => item.id === id), definition = metadataFor(instance.type);
  $('#widget-settings-heading').textContent = `${definition.title} settings`;
  $('#widget-settings-error').textContent = '';
  const labels = { title: 'Title', name: 'Your name', tagline: 'Tagline', showDate: 'Show the date', hour24: 'Use a 24-hour clock', engine: 'Search engine', unit: 'Temperature unit', shortcutStyle: 'Shortcut appearance', city: 'City name', latitude: 'Latitude', longitude: 'Longitude', refreshMinutes: 'Refresh interval', category: 'Quote category', fontSize: 'Quote font size', soundType: 'Alarm sound', volume: 'Alarm volume', muted: 'Mute alarm sound', notifyAtPercent: 'Progress notification threshold', desktopNotifications: 'Send progress and completion notifications', intervalMinutes: 'Change image every' };
  $('#widget-settings-fields').replaceChildren(...Object.entries(definition.settings).filter(([name]) => name !== 'collectionId' && name !== 'soundAssetId' && !(instance.type === 'image' && ['assetId', 'caption', 'alt'].includes(name))).map(([name, field]) => {
    const label = document.createElement('label'); label.textContent = labels[name] || name;
    const choices = field.uiChoices || field.choices;
    const input = document.createElement(choices ? 'select' : 'input'); input.name = name;
    const choiceLabels = { refreshMinutes: { '0': '1 day', '30': '30 minutes', '60': '1 hour', '360': '6 hours', '1440': '1 day' }, intervalMinutes: { '1': '1 minute', '5': '5 minutes', '15': '15 minutes', '30': '30 minutes', '60': '1 hour', '360': '6 hours' }, fontSize: { '12': '12 px', '14': '14 px', '16': '16 px', '18': '18 px', '20': '20 px', '24': '24 px', '28': '28 px' }, notifyAtPercent: { off: 'Off', '90': 'At 90% complete', '95': 'At 95% complete' }, soundType: { soft: 'Soft chime', digital: 'Digital double beep', bell: 'Bell tones', uploaded: 'Uploaded sound' }, category: { all: 'All quotes', happiness: 'Happiness', life: 'Life', inspiration: 'Inspiration', wisdom: 'Wisdom', success: 'Success', love: 'Love', courage: 'Courage' }, fit: { contain: 'Contain', cover: 'Cover' } };
    if (choices) {
      for (const choice of choices) { const option = document.createElement('option'); option.value = choice; option.textContent = choiceLabels[name]?.[choice] || choice; input.append(option); }
      const currentValue = instance.settings[name];
      if (!choices.includes(currentValue)) { const option = document.createElement('option'); option.value = currentValue; option.textContent = `Current setting (${currentValue})`; input.append(option); }
    }
    else if (field.type === 'boolean') { input.type = 'checkbox'; label.className = 'check-label'; }
    else if (field.type === 'number') { input.type = name === 'volume' ? 'range' : 'number'; input.step = name === 'volume' ? '0.05' : 'any'; input.min = field.min; input.max = field.max; }
    else { input.type = 'text'; input.maxLength = field.maxLength || 200; }
    if (field.type === 'boolean') input.checked = instance.settings[name]; else input.value = instance.settings[name];
    label.append(input); return label;
  }));
  const extras = document.createElement('div'); extras.className = 'widget-settings-extras';
  const settingsForm = $('#widget-settings-form');
  if (instance.type === 'timer') {
    const notificationHelp = document.createElement('p'); notificationHelp.className = 'help'; notificationHelp.textContent = 'Request browser notification permission here, then enable progress and completion alerts and save.'; extras.append(notificationHelp);
    const notificationButton = document.createElement('button'); notificationButton.type = 'button'; notificationButton.className = 'subtle-button'; notificationButton.textContent = 'Request notification permission';
    const notificationStatus = document.createElement('p'); notificationStatus.className = 'help'; notificationStatus.setAttribute('role', 'status');
    notificationButton.addEventListener('click', async () => {
      try {
        if (!globalThis.chrome?.runtime?.id || !globalThis.chrome?.permissions) throw new Error('Open this dashboard from the installed extension to request notification permission.');
        const manifest = chrome.runtime.getManifest();
        const declared = manifest.optional_permissions?.includes('notifications') || manifest.permissions?.includes('notifications');
        if (!declared) throw new Error('Reload the unpacked extension so it loads the manifest’s optional notifications permission, then try again.');
        const granted = await chrome.permissions.request({ permissions: ['notifications'] });
        if (!granted) { notificationStatus.textContent = 'Permission was not granted. Timers will still run without desktop notifications.'; return; }
        const notificationsInput = settingsForm?.elements?.namedItem('desktopNotifications');
        if (!notificationsInput) throw new Error('The timer settings form is no longer available. Close and reopen timer settings, then try again.');
        notificationsInput.checked = true;
        notificationStatus.textContent = 'Permission granted. Save settings to enable progress and completion notifications.';
      } catch (error) { notificationStatus.textContent = error.message || 'Notification permission could not be requested.'; }
    });
    extras.append(notificationButton, notificationStatus);
    const label = document.createElement('label'); label.textContent = 'Upload alarm sound (MP3, WAV, or OGG · up to 2 MB)';
    const file = document.createElement('input'); file.type = 'file'; file.name = 'soundFile'; file.accept = 'audio/mpeg,audio/wav,audio/ogg,audio/mp4'; label.append(file); extras.append(label);
    file.addEventListener('change', () => { if (file.files?.length && settingsForm?.elements?.namedItem('soundType')) settingsForm.elements.namedItem('soundType').value = 'uploaded'; });
    const test = document.createElement('button'); test.type = 'button'; test.className = 'subtle-button'; test.textContent = 'Test selected alarm sound';
    test.addEventListener('click', async () => {
      try {
        const profile = settingsForm.elements.soundType.value;
        if (profile === 'uploaded') {
          const blob = file.files?.[0] || (instance.settings.soundAssetId ? await getSoundAsset(instance.settings.soundAssetId) : null);
          if (!blob) throw new Error('Upload an alarm sound before testing it.');
          const url = URL.createObjectURL(blob), player = new Audio(url);
          player.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
          player.addEventListener('error', () => { URL.revokeObjectURL(url); $('#widget-settings-error').textContent = 'This sound file could not be played.'; }, { once: true });
          await player.play();
        } else {
          const context = new AudioContext(), volume = Number(settingsForm.elements.volume.value);
        const tones = profile === 'bell' ? [660, 880, 1100] : profile === 'digital' ? [920, 620, 920] : [784, 988];
        tones.forEach((frequency, index) => {
          const oscillator = context.createOscillator(), gain = context.createGain(), startAt = context.currentTime + index * .35;
          oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, startAt); gain.gain.linearRampToValueAtTime(.28 * volume, startAt + .025); gain.gain.exponentialRampToValueAtTime(.001, startAt + .28); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(startAt); oscillator.stop(startAt + .3);
        });
        setTimeout(() => context.close(), 1600);
        }
      } catch (error) { $('#widget-settings-error').textContent = error.message || 'The selected sound could not be played.'; }
    }); extras.append(test);
  }
  if (instance.type === 'image') {
    settingsImageAssets = []; settingsImageAssetsLoaded = false;
    const list = document.createElement('div'); list.className = 'image-settings-list'; list.setAttribute('aria-label', 'Carousel images');
    const renderAssets = () => {
      list.replaceChildren(...settingsImageAssets.map((asset, index) => {
        const row = document.createElement('div'); row.className = 'image-settings-row';
        const name = document.createElement('span'); name.textContent = asset.name || `Image ${index + 1}`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${name.textContent}`); remove.title = 'Remove image';
        remove.addEventListener('click', () => { settingsImageAssets.splice(index, 1); renderAssets(); }); row.append(name, remove); return row;
      }));
    };
    const loading = document.createElement('p'); loading.className = 'help'; loading.textContent = 'Loading saved images…'; extras.append(loading, list);
    content.getWidgetContent(`image-carousel:${instance.id}`).then(saved => {
      if (settingsWidgetId !== id) return;
      settingsImageAssets = Array.isArray(saved) ? saved.filter(item => item && typeof item.assetId === 'string' && typeof item.name === 'string') : [];
      settingsImageAssetsLoaded = true;
      loading.remove(); renderAssets();
    }).catch(() => { loading.textContent = 'Saved image list could not be loaded.'; });
    const uploadLabel = document.createElement('label'); uploadLabel.textContent = 'Add images to carousel';
    const upload = document.createElement('input'); upload.type = 'file'; upload.name = 'imageFiles'; upload.multiple = true; upload.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif'; uploadLabel.append(upload); extras.append(uploadLabel);
  }
  if (extras.childElementCount) $('#widget-settings-fields').append(extras);
  showDialog('#widget-settings-dialog');
}
$('#widget-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const instance = canvas.widgets.find(item => item.id === settingsWidgetId), definition = metadataFor(instance.type), settings = { ...instance.settings };
    for (const [key, field] of Object.entries(definition.settings)) {
      const input = event.currentTarget.elements[key]; if (!input) continue;
      settings[key] = field.type === 'boolean' ? input.checked : field.type === 'number' ? Number(input.value) : input.value;
    }
    if (instance.type === 'timer' && settings.desktopNotifications) {
      if (!globalThis.chrome?.permissions || !await chrome.permissions.contains({ permissions: ['notifications'] })) {
        throw new Error('Use “Request notification permission” in these settings, then save again. If the button says to reload, reload the unpacked extension first.');
      }
    }
    const soundFile = event.currentTarget.elements.soundFile?.files?.[0];
    if (soundFile) {
      if (!/^audio\/(mpeg|wav|ogg|mp4|x-wav)$/.test(soundFile.type) || soundFile.size > 2 * 1024 * 1024) throw new Error('Choose an MP3, WAV, or OGG sound file under 2 MB.');
      if (instance.type !== 'timer' || settings.soundType === 'uploaded') {
        settings.soundAssetId = crypto.randomUUID(); await saveSoundAsset(settings.soundAssetId, soundFile);
      }
    }
    if (instance.type === 'timer' && settings.soundType === 'uploaded' && !settings.soundAssetId) throw new Error('Upload an alarm sound or choose a built-in sound.');
    if (instance.type === 'image') {
      if (!settingsImageAssetsLoaded) throw new Error('Wait for the saved carousel images to load before applying settings.');
      const files = [...(event.currentTarget.elements.imageFiles?.files || [])];
      for (const file of files) {
        if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is unsupported or exceeds 8 MB.`);
        const probe = new Image(), previewUrl = URL.createObjectURL(file);
        try {
          await new Promise((resolve, reject) => { probe.onload = resolve; probe.onerror = reject; probe.src = previewUrl; });
          if (probe.naturalWidth > 6000 || probe.naturalHeight > 6000) throw new Error(`${file.name} exceeds 6000 × 6000 pixels.`);
        } finally { URL.revokeObjectURL(previewUrl); }
        const assetId = crypto.randomUUID(); await saveImageAsset(assetId, file); settingsImageAssets.push({ assetId, name: file.name.slice(0, 120) });
      }
      await content.saveWidgetContent(`image-carousel:${instance.id}`, settingsImageAssets);
    }
    await updateWidget(instance.id, settings); $('#widget-settings-dialog').close(); announce('Widget settings applied.');
  } catch (error) { $('#widget-settings-error').textContent = error.message; }
});
document.addEventListener('tabtahoe-layout-save-failed', () => beginEditing());

function createLayoutPreview(layout) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('layout-preview'); svg.setAttribute('viewBox', '0 0 160 84'); svg.setAttribute('aria-hidden', 'true');
  const background = document.createElementNS(svg.namespaceURI, 'rect');
  background.setAttribute('width', '160'); background.setAttribute('height', '84'); background.setAttribute('rx', '9'); background.setAttribute('fill', '#10232c'); svg.append(background);
  const rows = Math.max(1, ...layout.canvas.layout.map(item => item.y + item.h));
  const colors = { topbar: '#c9e9d9', search: '#b7dfe8', greeting: '#d6e9d9', clock: '#a7d7e3', weather: '#efd59c', music: '#d7b3c9', calendar: '#d8bdcf', bookmarks: '#c3d7e8', favourites: '#b5dccb' };
  for (const item of layout.canvas.layout) {
    const widget = layout.canvas.widgets.find(value => value.id === item.id);
    const tile = document.createElementNS(svg.namespaceURI, 'rect');
    tile.setAttribute('x', String(item.x / 12 * 156 + 2)); tile.setAttribute('y', String(item.y / rows * 80 + 2));
    tile.setAttribute('width', String(Math.max(3, item.w / 12 * 156 - 2))); tile.setAttribute('height', String(Math.max(3, item.h / rows * 80 - 2)));
    tile.setAttribute('rx', '3'); tile.setAttribute('fill', colors[widget?.type] || '#c2dce5'); tile.setAttribute('fill-opacity', '.45'); tile.setAttribute('stroke', '#ffffff'); tile.setAttribute('stroke-opacity', '.55');
    svg.append(tile);
  }
  return svg;
}

async function activateLayout(layout, editAfterLoad = false) {
  try {
    const sameLayout = layout.id === workspace.activeLayoutId;
    if (editing && sameLayout && editAfterLoad) {
      $('#layouts-dialog').close(); return;
    }
    if (!sameLayout || editing) {
      if (sameLayout) await applyWorkspace(conflict ? await store.read() : workspace);
      else {
        const candidate = structuredClone(workspace); candidate.activeLayoutId = layout.id;
        await persist(candidate, applyWorkspace);
      }
    }
    $('#layouts-dialog').close();
    if (editAfterLoad) beginEditing();
    else toast(sameLayout ? `Restored “${layout.name}”.` : `Loaded “${layout.name}”.`);
  } catch (error) { $('#layout-error').textContent = error.message; }
}

function renderLayouts() {
  $('#layouts-draft-notice').hidden = !editing;
  $('#layouts-draft-notice').textContent = 'Loading a preview or deleting the active layout discards your unsaved edits. Rename and delete other saved layouts keep the current draft.';
  $('#saved-layouts').replaceChildren(...workspace.layouts.map(layout => {
    const card = document.createElement('article'); card.className = 'saved-layout-row';
    const preview = document.createElement('button'); preview.className = 'layout-preview-button'; preview.type = 'button';
    preview.setAttribute('aria-label', editing ? `Load ${layout.name} and discard unsaved edits` : `Load ${layout.name}`);
    preview.append(createLayoutPreview(layout));
    preview.addEventListener('click', () => activateLayout(layout));
    const heading = document.createElement('div'); heading.className = 'layout-card-heading';
    const title = document.createElement('strong'); title.textContent = layout.name;
    const current = document.createElement('span'); current.className = 'help'; current.textContent = layout.id === workspace.activeLayoutId ? 'Current' : `${layout.canvas.widgets.length} widgets`;
    heading.append(title, current);
    const actions = document.createElement('div'); actions.className = 'layout-card-actions';
    const edit = document.createElement('button'); edit.className = 'subtle-button layout-edit-button'; edit.type = 'button'; edit.textContent = editing && layout.id !== workspace.activeLayoutId ? 'Discard edits & edit' : 'Edit';
    edit.setAttribute('aria-label', editing && layout.id !== workspace.activeLayoutId ? `Discard unsaved edits and edit ${layout.name}` : `Edit ${layout.name}`);
    edit.disabled = saving; edit.addEventListener('click', () => activateLayout(layout, true));
    const rename = document.createElement('button'); rename.className = 'subtle-button layout-rename-button'; rename.type = 'button'; rename.textContent = 'Rename'; rename.setAttribute('aria-label', `Rename ${layout.name}`); rename.disabled = saving;
    rename.addEventListener('click', () => {
      renameLayoutId = layout.id; $('#layout-rename-name').value = layout.name; $('#layout-rename-error').textContent = ''; showDialog('#layout-rename-dialog');
    });
    const deletingActive = layout.id === workspace.activeLayoutId;
    const remove = document.createElement('button'); remove.className = 'icon-button layout-delete-button'; remove.type = 'button';
    remove.setAttribute('aria-label', editing && deletingActive ? `Delete ${layout.name} and discard unsaved edits` : `Delete ${layout.name}`); remove.title = 'Delete layout';
    remove.disabled = saving || workspace.layouts.length < 2;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.7'); icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'); icon.append(path); remove.append(icon);
    remove.addEventListener('click', async () => {
      try {
        const draft = editing && !deletingActive ? captureCanvas() : null, candidate = structuredClone(workspace);
        candidate.layouts = candidate.layouts.filter(item => item.id !== layout.id);
        if (candidate.activeLayoutId === layout.id) candidate.activeLayoutId = candidate.layouts[0].id;
        await backend.set({ canvasDeletedLayout: layout });
        await persist(candidate, async () => {
          if (draft) { canvas = draft; persistEditDraft(); }
          else await applyWorkspace(workspace);
        });
        renderLayouts(); toast(`Deleted “${layout.name}”.`);
      } catch (error) { $('#layout-error').textContent = error.message; }
    });
    actions.append(edit, rename, remove); card.append(preview, heading, actions); return card;
  }));
}

function openLayouts() {
  if (!workspace || pendingDraft) return;
  $('#layout-name-form').reset(); $('#layout-error').textContent = ''; renderLayouts(); showDialog('#layouts-dialog');
}
$('#change-layout').addEventListener('click', openLayouts);
$('#layout-name-form').addEventListener('submit', async event => {
  event.preventDefault();
  const name = $('#layout-name').value.trim(); if (!name) return;
  try {
    const candidate = structuredClone(workspace), id = crypto.randomUUID();
    candidate.layouts.push({ id, name, canvas: captureCanvas() }); candidate.activeLayoutId = id;
    await persist(candidate, async () => {
      editing = false; draftIsOutdated = false; canvas = structuredClone(activeLayout().canvas); resetHistory(canvas); sessionStorage.removeItem(draftKey);
    });
    renderLayouts(); toast(`Saved “${name}”.`);
  } catch (error) { $('#layout-error').textContent = error.message; }
});

$('#layout-rename-form').addEventListener('submit', async event => {
  event.preventDefault(); const name = $('#layout-rename-name').value.trim(); if (!name || !renameLayoutId) return;
  try {
    const draft = editing ? captureCanvas() : null, candidate = structuredClone(workspace);
    candidate.layouts.find(layout => layout.id === renameLayoutId).name = name;
    await persist(candidate, async () => { if (draft) { canvas = draft; persistEditDraft(); } });
    renameLayoutId = null; $('#layout-rename-dialog').close(); renderLayouts(); toast(`Renamed layout to “${name}”.`);
  } catch (error) { $('#layout-rename-error').textContent = error.message; }
});

async function refreshExternal() {
  if (!workspace) return;
  if (saving) { externalPending = true; return; }
  try {
    const latest = await store.read();
    if (latest.revision === workspace.revision) return;
    if (editing || document.querySelector('dialog[open]')) showConflict(new LayoutConflictError().message);
    else { await applyWorkspace(latest); announce('Loaded the layout saved in another tab.'); }
  } catch (error) { showConflict(`Another tab changed saved layouts, but the data could not be read. Your current work is retained. ${error.message}`); }
}
backend.subscribe(key => { if (key === WORKSPACE_KEY) refreshExternal(); });
$('#conflict-reload').addEventListener('click', async () => {
  try { await applyWorkspace(await store.read()); for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); }
  catch (error) { toast(error.message); }
});
$('#conflict-copy').addEventListener('click', async () => {
  try {
    const saved = captureCanvas(), latest = await store.read();
    const candidate = structuredClone(latest), id = crypto.randomUUID();
    candidate.layouts.push({ id, name: `${activeLayout().name.slice(0, 45)} (recovered copy)`, canvas: saved }); candidate.activeLayoutId = id;
    // Preserve the local document on a second racing write; never overwrite another revision.
    await persist(candidate, applyWorkspace, latest.revision);
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); toast('Your work was saved as a new layout.');
  } catch (error) { toast(error.message); }
});

$('#customize').addEventListener('click', beginEditing);
$('#general-settings').addEventListener('click', () => appearance.open());
$('#save-layout').addEventListener('click', () => saveCurrent().catch(error => toast(error.message)));
$('#cancel-layout').addEventListener('click', async () => {
  try { await applyWorkspace(conflict ? await store.read() : workspace); $('#customize').focus(); announce('Saved arrangement restored. Live content is unchanged.'); }
  catch (error) { toast(error.message); }
});
$('#add-widget').addEventListener('click', openWidgetGallery);
$('#undo-layout').addEventListener('click', () => travelHistory('undo'));
$('#redo-layout').addEventListener('click', () => travelHistory('redo'));
$('#empty-add').addEventListener('click', () => { beginEditing(); openWidgetGallery(); });
$('#draft-resume').addEventListener('click', async () => {
  try {
    if (!pendingDraft) throw new Error('The saved draft is no longer available.');
    const recoveredDraft = pendingDraft;
    pendingDraft = null; draftIsOutdated = recoveredDraft.revision !== workspace.revision;
    canvas = validateCanvas(recoveredDraft.canvas, registry); editing = true; resetHistory(activeLayout().canvas);
    $('#draft-recovery').hidden = true; await renderCanvas(); recordHistory(); updateControls();
    ($('#dashboard-canvas').querySelector('.canvas-move-handle') || $('#add-widget')).focus();
    announce('Recovered your unsaved canvas draft. Save layout to keep it or Cancel to restore the saved version.');
  } catch (error) { toast(`The draft could not be recovered: ${error.message}`); }
});
$('#draft-discard').addEventListener('click', () => { pendingDraft = null; sessionStorage.removeItem(draftKey); $('#draft-recovery').hidden = true; updateControls(); announce('Unsaved draft discarded.'); });
window.addEventListener('beforeunload', event => { if (editing) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('keydown', event => {
  const target = event.target;
  const dialogOpen = Boolean(document.querySelector('dialog[open]'));
  const isTextEditor = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if (editing && !dialogOpen && !isTextEditor && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault(); travelHistory(event.shiftKey ? 'redo' : 'undo'); return;
  }
  if (editing && !dialogOpen && !isTextEditor && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault(); travelHistory('redo'); return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
    const search = $('#dashboard-canvas [data-role="search"]'); if (search) { event.preventDefault(); search.focus(); }
  }
});
$('#recovery-retry').addEventListener('click', () => location.reload());
$('#recovery-download').addEventListener('click', async () => {
  try {
    const original = globalThis.chrome?.storage?.local ? await chrome.storage.local.get(null) : Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith('tabtahoe')).map(key => [key, localStorage.getItem(key)]));
    const url = URL.createObjectURL(new Blob([JSON.stringify(original, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'tabtahoe-recovery.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { toast('Recovery data could not be downloaded.'); }
});

async function init() {
  try {
    const next = await store.open(initialApps());
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey));
      if (saved?.canvas) pendingDraft = { revision: saved.revision, canvas: validateCanvas(saved.canvas, registry) };
    } catch { sessionStorage.removeItem(draftKey); }
    await content.initialize(); await applyWorkspace(validateWorkspace(next, registry), { preserveDraft: true });
    if (pendingDraft) {
      $('#draft-recovery-copy').textContent = pendingDraft.revision === workspace.revision
        ? 'Continue editing the recovered draft, or discard it and reopen your saved layout.'
        : 'Another layout version was saved after this draft. You can still resume it; save as a recovered copy if the latest save conflicts.';
      $('#draft-recovery').hidden = false;
      updateControls();
    }
    $('#canvas-recovery').hidden = true; appearance.start();
    document.documentElement.dataset.canvasReady = 'true';
  } catch (error) {
    $('#canvas-recovery').hidden = false; $('#recovery-message').textContent = error.message;
    for (const id of ['change-layout', 'general-settings', 'empty-add', 'customize', 'wallpaper-next']) if ($(`#${id}`)) $(`#${id}`).disabled = true;
    document.documentElement.dataset.canvasReady = 'recovery';
  }
}
init();
