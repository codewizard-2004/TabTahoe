import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

export async function checkDashboard({ send, evaluate, waitFor, click, fill, submit, screenshot, origin, installed = false, wallpaperFile, previewOrigin }) {
  const label = installed ? 'extension' : 'preview';
  const workspaceExpression = installed ? '(async () => (await chrome.storage.local.get("canvasWorkspace")).canvasWorkspace)()' : 'JSON.parse(localStorage.getItem("tabtahoe-v2:canvasWorkspace"))';
  const readWorkspace = () => evaluate(workspaceExpression);
  const geometry = () => evaluate('[...document.querySelectorAll("#dashboard-canvas > section")].map(node => { const { id, x, y, w, h } = node.gridstackNode; return { id, x, y, w, h }; })');
  const widget = type => `[data-widget-type="${type}"]`;
  const role = name => `[data-role="${name}"]`;
  async function enterEdit() {
    if (await evaluate('document.querySelector("#canvas-toolbar").hidden')) {
      await click('#customize'); await waitFor('!document.querySelector("#canvas-toolbar").hidden', 'canvas editor opens');
    }
  }
  async function openGeneralSettings() { await enterEdit(); await click('#general-settings'); await waitFor('document.querySelector("#settings-dialog").open'); }
  async function openLayouts() { await click('#change-layout'); }
  async function ready() {
    await waitFor('Boolean(document.documentElement.dataset.canvasReady)', 'dashboard startup');
    const state = await evaluate('document.documentElement.dataset.canvasReady');
    if (state !== 'true') throw new Error(await evaluate('document.querySelector("#recovery-message").textContent'));
  }
  async function reload() {
    await evaluate('delete document.documentElement.dataset.canvasReady');
    await send('Page.reload'); await ready();
  }
  async function save() { await click('#save-layout'); await waitFor('!document.querySelector(".canvas-is-editing")', 'layout saved'); }
  async function loadNamed(name) {
    await openLayouts();
    await evaluate(`[...document.querySelectorAll('.saved-layout-row')].find(row => row.querySelector('strong').textContent === ${JSON.stringify(name)}).querySelector('button').click()`);
    await waitFor(`document.querySelector('#active-layout-name').textContent === ${JSON.stringify(name)} && !document.querySelector('#layouts-dialog').open`, `load ${name}`);
  }
  async function saveAs(name) {
    await openLayouts(); await fill('#layout-name', name); await submit('#layout-name-form');
    await waitFor(`document.querySelector('#active-layout-name').textContent === ${JSON.stringify(name)}`);
    await click('#layouts-dialog .close-dialog');
  }
  async function key(key, modifiers = 0) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, modifiers });
  }
  async function add(type) {
    const count = await evaluate(`document.querySelectorAll(${JSON.stringify(widget(type))}).length`);
    if (!await evaluate('document.querySelector("#widget-gallery-dialog").open')) await click('#add-widget');
    await click(`#widget-gallery [data-gallery-type="${type}"] button`);
    await waitFor(`document.querySelectorAll(${JSON.stringify(widget(type))}).length === ${count + 1}`);
  }
  async function setWorkspace(document) {
    await evaluate(installed ? `chrome.storage.local.set({ canvasWorkspace: ${JSON.stringify(document)} })` : `localStorage.setItem('tabtahoe-v2:canvasWorkspace', ${JSON.stringify(JSON.stringify(document))})`);
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: origin + '/index.html' }); await ready();
  assert.equal(await evaluate('document.querySelectorAll("#dashboard-canvas > section").length'), 9);
  assert.equal(await evaluate('document.querySelectorAll("[data-role=calendar] > button").length'), 42);
  assert.equal(await evaluate('document.querySelectorAll(".widget-error").length'), 0);
  await screenshot(`dashboard-${label}-default.png`);

  if (installed) {
    const mediaTabId = await evaluate(`(async () => (await chrome.tabs.create({ url: ${JSON.stringify(`${previewOrigin}/tests/fixtures/media.html`)} })).id)()`);
    try {
      await evaluate('(async () => { const tab = (await chrome.tabs.query({ url: "chrome://newtab/" }))[0]; if (tab) await chrome.tabs.update(tab.id, { active: true }); })()');
      await waitFor(`([...document.querySelector("[data-role=sound-source]").options].some(option => option.textContent.includes("TabTahoe media fixture")))`, 'sound widget discovers a browser media tab');
      await evaluate(`(() => { const select = document.querySelector("[data-role=sound-source]"); select.value = ${JSON.stringify(String(mediaTabId))}; select.dispatchEvent(new Event("change", { bubbles: true })); })()`);
      await waitFor('document.querySelector("[data-role=sound-mute]").disabled === false');
      await click('[data-role="sound-mute"]');
      await waitFor(`(async () => (await chrome.tabs.get(${mediaTabId})).mutedInfo.muted)()` , 'sound widget mutes selected browser tab');
      await click('[data-role="sound-mute"]');
      await waitFor(`(async () => !(await chrome.tabs.get(${mediaTabId})).mutedInfo.muted)()`, 'sound widget unmutes selected browser tab');
      console.log('PASS: extension sound widget discovers media tab and mutes/unmutes it without optional site access');
    } finally {
      await evaluate(`chrome.tabs.remove(${mediaTabId})`);
    }
  }

  const bookmarkId = installed ? await evaluate('(async () => (await chrome.bookmarks.create({ parentId: "1", title: "Saved canvas bookmark", url: "https://example.com/bookmark" })).id)()') : 'preview-pin';
  const date = await evaluate('document.querySelector(".calendar-day.today").dataset.date');
  const legacy = {
    settings: { name: 'Amal', hour24: true, opacity: 24, wallpaper: 1, rotation: '0', engine: 'brave', backgroundSource: 'custom', widgets: { clock: true, weather: true, music: true, calendar: true, bookmarks: true } },
    apps: [{ id: 'legacy-group', title: 'Work', children: [{ id: 'nested-group', title: 'Deep', children: [{ id: 'nested-link', title: 'Nested project', url: 'https://example.com/deep', color: '#345678' }] }] }, { id: 'legacy-link', title: 'Read later', url: 'https://example.com/read', color: '#567890' }],
    pinned: [bookmarkId],
  };
  const tasks = { [date]: [{ id: 'legacy-task', title: 'Keep this task', completed: true }] };
  await evaluate(`(async () => {
    const legacy = ${JSON.stringify(legacy)}, tasks = ${JSON.stringify(tasks)};
    if (globalThis.chrome?.storage?.local) {
      const all = await chrome.storage.local.get(null);
      await chrome.storage.local.remove(Object.keys(all).filter(key => key.startsWith('canvas')));
      await chrome.storage.local.set({ ...legacy, ['calendarTasks:' + ${JSON.stringify(date)}]: tasks[${JSON.stringify(date)}] });
    } else {
      for (const key of Object.keys(localStorage)) if (key.startsWith('tabtahoe-v2:')) localStorage.removeItem(key);
      localStorage.setItem('tabtahoe', JSON.stringify(legacy)); localStorage.setItem('tabtahoe-calendar-tasks', JSON.stringify(tasks));
    }
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('tabtahoe-backgrounds', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('images', 'readwrite');
        tx.objectStore('images').put(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#274950"/></svg>'], { type: 'image/svg+xml' }), 'custom');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
      };
    });
  })()`);
  await reload();
  await waitFor('document.querySelector("[data-role=greeting]").textContent.includes("AMAL")');
  assert.equal(await evaluate('document.querySelector("#wallpaper-name").textContent'), 'Your background');
  const migrated = await readWorkspace();
  assert.equal(migrated.layouts[0].canvas.widgets.find(item => item.type === 'clock').settings.hour24, true);
  assert.equal(migrated.layouts[0].canvas.widgets.find(item => item.type === 'search').settings.engine, 'brave');
  assert.equal(migrated.layouts[0].canvas.preferences.backgroundAssetId, 'custom');
  assert.equal(await evaluate(installed ? '(async () => (await chrome.storage.local.get("canvasV1Backup")).canvasV1Backup.original.apps[0].children[0].children[0].id)()' : 'JSON.parse(JSON.parse(localStorage.getItem("tabtahoe-v2:canvasV1Backup")).original.preferences).apps[0].children[0].children[0].id'), 'nested-link');
  console.log(`PASS: ${label} migration preserves nested shortcuts, preferences, task/pin keys, and uploaded wallpaper`);

  // Per-instance dialogs, safe links/text, nested groups, and independently persisted live content.
  await click(role('shortcut-add')); await fill('dialog[open] [name=title]', '<script>Literal title</script>');
  await fill('dialog[open] [name=url]', 'javascript:alert(1)'); await submit('dialog[open] form');
  assert.equal(await evaluate('Boolean(document.querySelector("dialog[open] [data-role=shortcut-error]").textContent)'), true);
  await fill('dialog[open] [name=url]', 'https://example.com/new'); await submit('dialog[open] form');
  await waitFor('document.querySelector("[data-role=app-grid]").textContent.includes("<script>Literal title</script>")');
  await evaluate('document.querySelector("[data-id=legacy-link] a").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))');
  await fill('dialog[open] [name=title]', 'Renamed link'); await submit('dialog[open] form');
  assert.equal(await evaluate('document.querySelector("[data-id=legacy-link]").textContent.includes("Renamed link")'), true);
  await click('[data-id=legacy-group] button'); await click('[data-id=nested-group] button');
  assert.equal(await evaluate('document.querySelector("dialog[open] [data-role=group-title]").textContent'), 'Deep');
  await screenshot(`dashboard-${label}-nested-group.png`);
  await click('dialog[open] .close-dialog');

  const revisionBeforeContent = (await readWorkspace()).revision;
  await click('.calendar-day.today');
  await waitFor('Boolean(document.querySelector("[data-role=tasks-dialog][open]"))');
  assert.equal(await evaluate('document.querySelector(".task-toggle").checked'), true);
  await click('.task-toggle');
  await fill('dialog[open] [name=title]', 'New shared task'); await submit('dialog[open] form');
  await waitFor('document.querySelectorAll(".task-row").length === 2');
  await screenshot(`dashboard-${label}-tasks.png`); await click('dialog[open] .close-dialog');
  assert.equal((await readWorkspace()).revision, revisionBeforeContent, 'Live task edits do not write canvas geometry');

  await click(role('weather-location')); await fill('dialog[open] [data-role=city-search]', 'Bengaluru'); await submit('dialog[open] form');
  await waitFor('Boolean(document.querySelector(".city-result"))'); await screenshot(`dashboard-${label}-weather-search.png`); await click('.city-result');
  await waitFor('document.querySelector("[data-role=temperature]").textContent === "24°"');
  assert.equal((await readWorkspace()).layouts[0].canvas.widgets.find(item => item.type === 'weather').settings.city, 'Bengaluru');
  if (installed) await waitFor('document.querySelector("[data-role=pinned-bookmarks]").textContent.includes("Saved canvas bookmark")');
  await click(role('bookmarks-open')); await screenshot(`dashboard-${label}-bookmarks.png`); await click('dialog[open] .close-dialog');

  // Save by name, replace the current uploaded image, and restore the earlier image reference.
  await saveAs('Amal’s layout');
  const amalId = (await readWorkspace()).activeLayoutId;
  await openGeneralSettings();
  await fill('#settings-form [name=opacity]', '32'); await submit('#settings-form');
  await waitFor('!document.querySelector("#settings-dialog").open');
  if (wallpaperFile) {
    await openGeneralSettings();
    const doc = await send('DOM.getDocument');
    const input = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#background-file' });
    await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [wallpaperFile] });
    await waitFor('document.querySelector("#background-status").textContent === "Background saved on this device."');
    await screenshot(`dashboard-${label}-customize.png`); await click('#settings-dialog .close-dialog');
    const changed = (await readWorkspace()).layouts.find(layout => layout.id === amalId).canvas.preferences.backgroundAssetId;
    assert.notEqual(changed, 'custom');
  }
  await saveAs('Sandra’s style');
  await loadNamed('My layout');
  assert.equal((await readWorkspace()).layouts.find(layout => layout.id === 'layout-classic').canvas.preferences.backgroundAssetId, 'custom');
  assert.equal(await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--glass-opacity").trim()'), '0.24');
  await loadNamed('Amal’s layout');
  assert.equal(await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--glass-opacity").trim()'), '0.32');
  await openLayouts();
  await evaluate('[...document.querySelectorAll(".saved-layout-row")].find(row => row.querySelector("strong").textContent === "Sandra’s style").querySelector(".layout-rename-button").click()');
  await fill('#layout-rename-name', 'Sandra’s calm space'); await submit('#layout-rename-form');
  await waitFor('document.querySelector("#saved-layouts").textContent.includes("Sandra’s calm space")');
  await screenshot(`dashboard-${label}-named-layouts.png`); await click('#layouts-dialog .close-dialog');
  console.log(`PASS: ${label} named save/load/rename, independent appearance snapshots, and retained image assets`);

  // Independent clocks and shortcut collections; Cancel changes layout only.
  const original = await geometry();
  await enterEdit(); await add('clock');
  await evaluate('[...document.querySelectorAll("[data-widget-type=clock] .widget-configure")].at(-1).click()');
  await fill('#widget-settings-form [name=title]', 'Second clock');
  await evaluate('document.querySelector("#widget-settings-form [name=hour24]").checked = false'); await submit('#widget-settings-form');
  const firstClockSettings = (await readWorkspace()).layouts.find(layout => layout.id === amalId).canvas.widgets.find(item => item.type === 'clock').settings;
  assert.equal(firstClockSettings.hour24, true);
  await evaluate('document.querySelector("[data-widget-type=favourites] .widget-duplicate").click()');
  await waitFor('document.querySelectorAll("[data-widget-type=favourites]").length === 2');
  await evaluate('[...document.querySelectorAll("[data-widget-type=favourites] [data-role=shortcut-add]")].at(-1).click()');
  await fill('dialog[open] [name=title]', 'Only in the second collection'); await fill('dialog[open] [name=url]', 'https://example.com/second'); await submit('dialog[open] form');
  await waitFor('[...document.querySelectorAll("[data-widget-type=favourites]")].at(-1).textContent.includes("Only in the second collection")');
  assert.equal(await evaluate('[...document.querySelectorAll("[data-widget-type=favourites]")][0].textContent.includes("Only in the second collection")'), false);
  await click('#cancel-layout');
  await waitFor('document.querySelectorAll("[data-widget-type=favourites]").length === 1');
  assert.deepEqual(await geometry(), original);
  assert.equal(await evaluate('document.querySelector("[data-role=app-grid]").textContent.includes("<script>Literal title</script>")'), true);

  await enterEdit(); await add('clock');
  await evaluate('[...document.querySelectorAll("[data-widget-type=clock] .widget-configure")].at(-1).click()');
  await fill('#widget-settings-form [name=title]', 'Saved independent clock');
  await evaluate('document.querySelector("#widget-settings-form [name=hour24]").checked = false'); await submit('#widget-settings-form');
  await evaluate('document.querySelector("[data-widget-type=search] .canvas-move-handle").focus()');
  await key('ArrowLeft'); await key('ArrowRight', 8);
  await save(); const savedGeometry = await geometry(); await reload();
  assert.deepEqual(await geometry(), savedGeometry, 'All converted geometry survives save and reload');
  assert.equal(await evaluate('document.querySelectorAll("[data-widget-type=clock]").length'), 2);
  assert.equal(await evaluate('new Set([...document.querySelectorAll("[id]")].map(node => node.id)).size === document.querySelectorAll("[id]").length'), true);
  const clocks = (await readWorkspace()).layouts.find(layout => layout.id === amalId).canvas.widgets.filter(item => item.type === 'clock');
  assert.equal(clocks[0].settings.hour24, true); assert.equal(clocks[1].settings.hour24, false);

  // Resize a desktop window and use browser-scale emulation without changing stored geometry.
  const stable = await geometry();
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 650, deviceScaleFactor: 1, mobile: false });
  await delay(100); assert.deepEqual(await geometry(), stable); await screenshot(`dashboard-${label}-desktop-short.png`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await delay(100); assert.deepEqual(await geometry(), stable);
  console.log(`PASS: ${label} scoped dialogs, shared task content, weather selection, independent duplicates, Cancel, geometry persistence, desktop resizing`);

  // Actual concurrent dashboard: keep the local draft, reject stale saves, recover as a new layout.
  await enterEdit();
  await evaluate('document.querySelector("[data-widget-type=search] .canvas-move-handle").focus()'); await key('ArrowLeft');
  const draft = await geometry();
  const target = await send('Target.createTarget', { url: origin + '/index.html' }, null);
  const otherSession = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  const otherEval = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, otherSession);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value;
  };
  await send('Page.enable', {}, otherSession); await send('Runtime.enable', {}, otherSession);
  await send('Page.navigate', { url: origin + '/index.html' }, otherSession);
  for (let i = 0; i < 100; i++) { if (await otherEval('document.documentElement.dataset.canvasReady === "true"')) break; await delay(100); }
  await otherEval(`(async () => {
    const { createBrowserStorage } = await import('./storage/browser.js');
    const { createWorkspaceStore } = await import('./storage/workspace.js');
    const { registerDashboardWidgets } = await import('./widgets/dashboard.js');
    const store = createWorkspaceStore(createBrowserStorage(), registerDashboardWidgets({}));
    const current = await store.read(); current.layouts.find(item => item.id === current.activeLayoutId).name = 'Changed in another tab';
    await store.commit(current, current.revision);
  })()`);
  await waitFor('!document.querySelector("#canvas-conflict").hidden');
  assert.deepEqual(await geometry(), draft, 'External save cannot discard an active draft');
  await click('#save-layout'); await delay(100);
  assert.equal(await evaluate('document.querySelector("#canvas-conflict").hidden'), false);
  await click('#conflict-copy');
  await waitFor('document.querySelector("#active-layout-name").textContent.includes("recovered copy")');
  assert.deepEqual(await geometry(), draft);
  assert.ok((await readWorkspace()).layouts.some(layout => layout.name === 'Changed in another tab'));
  await send('Target.closeTarget', { targetId: target.targetId }, null);
  console.log(`PASS: ${label} real two-tab conflict protection and save-as-copy recovery`);

  // Unknown widgets are localized; unsupported workspace documents are preserved untouched.
  let valid = await readWorkspace();
  const active = valid.layouts.find(item => item.id === valid.activeLayoutId);
  active.canvas.widgets.push({ id: 'future-widget', type: 'future-tool', version: 7, settings: { keep: 'original' } });
  active.canvas.layout.push({ id: 'future-widget', x: 0, y: 50, w: 3, h: 3 });
  await setWorkspace(valid); await reload();
  assert.equal(await evaluate('document.querySelectorAll(".widget-error").length'), 1);
  assert.equal((await readWorkspace()).layouts.find(item => item.id === valid.activeLayoutId).canvas.widgets.at(-1).settings.keep, 'original');
  const broken = { ...valid, schemaVersion: 999 }; await setWorkspace(broken);
  await evaluate('delete document.documentElement.dataset.canvasReady'); await send('Page.reload');
  await waitFor('document.documentElement.dataset.canvasReady === "recovery"');
  assert.deepEqual(await readWorkspace(), broken);
  await screenshot(`dashboard-${label}-recovery.png`);
  await setWorkspace(valid); await reload();

  // Emptying a saved layout never deletes shared tasks/bookmarks, and Add remains reachable.
  await enterEdit();
  await evaluate('for (const button of [...document.querySelectorAll(".widget-remove")]) button.click()');
  assert.equal(await evaluate('document.querySelector("#canvas-empty").hidden'), false);
  await save(); await reload();
  assert.equal(await evaluate('document.querySelectorAll("#dashboard-canvas > section").length'), 0);
  await click('#empty-add'); await add('calendar'); await save();
  await click('.calendar-day.today');
  await waitFor('document.querySelectorAll(".task-row").length === 2'); await click('dialog[open] .close-dialog');
  if (installed) {
    assert.equal(await evaluate(`(async () => (await chrome.bookmarks.get(${JSON.stringify(bookmarkId)}))[0].title)()`), 'Saved canvas bookmark');
    await evaluate(`chrome.bookmarks.remove(${JSON.stringify(bookmarkId)})`);
  }
  console.log(`PASS: ${label} unknown-widget isolation, untouched invalid workspace, empty canvas, and shared-data retention`);
}
