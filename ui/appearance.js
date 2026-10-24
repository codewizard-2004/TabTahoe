import { WALLPAPERS, UNSPLASH_WALLPAPERS, nextWallpaper } from '../core.js';
import { normalizePreferences } from '../storage/workspace.js';

export function createAppearanceControls({ toast, onSave, showDialog }) {
  const $ = selector => document.querySelector(selector);
  let settings = normalizePreferences(), customBackgroundUrl = null, backgroundLoadId = 0, wallpaperRenderKey = '';
  const saveState = async () => {
    try { await onSave(structuredClone(settings)); }
    catch (error) { document.dispatchEvent(new CustomEvent('tabtahoe-layout-save-failed', { detail: error })); throw error; }
  };
  function renderSettings() {
    document.documentElement.style.setProperty('--glass-opacity', settings.opacity / 100);
    document.documentElement.classList.toggle('fill-canvas-window', Boolean(settings.fillWindow));
    renderWallpaper();
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
  const blob = settings.backgroundAssetId ? await backgroundStore('readonly', store => store.get(settings.backgroundAssetId)) : null;
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
    const assetId = crypto.randomUUID();
    await backgroundStore('readwrite', store => store.put(blob, assetId));
    settings.backgroundAssetId = assetId;
    await loadCustomBackground();
    settings.backgroundSource = 'custom'; settings.backgroundUpdatedAt = Date.now(); renderWallpaper(); await saveState();
    refreshBackgroundOptions(); status.textContent = 'Background saved on this device.';
  } catch { status.textContent = 'This image could not be saved. Try a different file or free some browser storage.'; }
  finally { bitmap?.close(); $('#background-upload').disabled = false; }
});
$('#background-use').addEventListener('click', () => {
  if (!customBackgroundUrl) return;
  settings.backgroundSource = 'custom'; saveState().catch(error => toast(error.message)); renderWallpaper(); refreshBackgroundOptions();
});
$('#background-remove').addEventListener('click', async () => {
  try {
    // Saved layouts/backups may still reference this image. Keep the blob until
    // reference-aware asset cleanup is introduced; remove only this reference.
    settings.backgroundAssetId = '';
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
      saveState().catch(error => toast(error.message)); renderWallpaper(); refreshBackgroundOptions();
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
    renderWallpaper(); if (force) saveState();
  }
}
$('#wallpaper-next').addEventListener('click', () => rotateWallpaper(false, true));

function openSettings() {
  const form = $('#settings-form');
  form.elements.rotation.value = settings.rotation;
  form.elements.opacity.value = settings.opacity;
  form.elements.fillWindow.checked = Boolean(settings.fillWindow);
  refreshBackgroundOptions();
  showDialog('#settings-dialog');
}
function refreshBackgroundOptions() {
  $('#wallpaper-options').replaceChildren(...WALLPAPERS.map((wallpaper, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `wallpaper-option${settings.backgroundSource === 'bundled' && index === settings.wallpaper ? ' selected' : ''}`;
    button.style.backgroundImage = `url("${wallpaper.path}")`; button.textContent = wallpaper.name;
    button.setAttribute('aria-pressed', settings.backgroundSource === 'bundled' && index === settings.wallpaper);
    button.addEventListener('click', () => {
      settings.backgroundSource = 'bundled'; settings.wallpaper = index; settings.wallpaperAt = Date.now(); renderWallpaper(); saveState().catch(error => toast(error.message));
      refreshBackgroundOptions();
    }); return button;
  }));
  $('#background-remove').hidden = !customBackgroundUrl;
  $('#background-use').hidden = !customBackgroundUrl || settings.backgroundSource === 'custom';
  if ($('#unsplash-options').childElementCount) renderUnsplashOptions();
}
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  settings.rotation = form.elements.rotation.value;
  settings.opacity = Number(form.elements.opacity.value);
  settings.fillWindow = form.elements.fillWindow.checked;
  settings.wallpaperAt = Date.now();
  renderSettings();
  try { await onSave(structuredClone(settings)); $('#settings-dialog').close(); toast('General settings saved.'); }
  catch (error) { toast(error.message); }
});


  return {
    get: () => structuredClone(settings),
    open: openSettings,
    async apply(values) {
      settings = normalizePreferences(values);
      try { await loadCustomBackground(); }
      catch { toast('The uploaded wallpaper is unavailable. Showing a bundled wallpaper.'); }
      if (settings.backgroundSource === 'custom' && !customBackgroundUrl) toast('The uploaded wallpaper is unavailable. Showing a bundled wallpaper.');
      renderSettings();
    },
    start() { rotateWallpaper(true); setInterval(rotateWallpaper, 60000); },
  };
}
