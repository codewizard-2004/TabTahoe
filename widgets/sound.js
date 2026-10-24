import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from '../core.js';
import { createWidgetView } from '../ui/widget-view.js';


export function mountSound(context, services) {
  const { scope } = context;
  const { $ } = createWidgetView(context, 'music');
  const toast = services.toast;
  let soundTabs = [], selectedTabId = null, mediaFrameId = null, soundBusy = false;
  const soundCommands = [];
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
  if (scope.signal.aborted) return;
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
  if (scope.signal.aborted) return;
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
    if (scope.signal.aborted || tab.id !== selectedTabId) return;
    if (!hasAccess) { mediaFrameId = null; renderSound(tab); return; }
    try {
      if (action !== 'read' && mediaFrameId === null) return;
      const target = action !== 'read' && mediaFrameId !== null ? { tabId: tab.id, frameIds: [mediaFrameId] } : { tabId: tab.id, allFrames: true };
      const results = await chrome.scripting.executeScript({ target, func: websiteMedia, args: [action, value] });
      if (scope.signal.aborted || tab.id !== selectedTabId) return;
      const found = results.find(result => result.result && !result.result.paused) || results.find(result => result.result);
      mediaFrameId = found?.frameId ?? null;
      renderSound(tab, found?.result, true);
    } catch {
      if (scope.signal.aborted || tab.id !== selectedTabId) return;
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


  scope.interval(refreshSound, 1500);
  scope.listen(document, 'visibilitychange', () => { if (!document.hidden) refreshSound(); });
  refreshSound();
  return {};
}
