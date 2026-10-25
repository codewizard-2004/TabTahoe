const PREFIX = 'widgetContent:timer:';
const alarmName = id => `tabtahoe-${id}`;

async function syncTimer(id, state, title = 'Timer') {
  const name = alarmName(id);
  await chrome.alarms.clear(name);
  if (!state?.running || !Number.isFinite(state.endsAt)) return;
  const threshold = Number(state.notifyAtPercent);
  const elapsedSeconds = (Number(state.elapsedSeconds) || 0) + Math.max(0, (Date.now() - (state.startedAt || Date.now())) / 1000);
  const progressAt = threshold > 0 && threshold < 100 && !state.progressNotified && Number.isFinite(state.durationSeconds)
    ? Date.now() + Math.max(0, state.durationSeconds * threshold / 100 - elapsedSeconds) * 1000
    : state.endsAt;
  const scheduledTime = Math.max(Date.now(), progressAt);
  await chrome.alarms.create(name, { when: scheduledTime });
}

async function reconcile() {
  const all = await chrome.storage.local.get(null);
  const timers = Object.entries(all).filter(([key, value]) => key.startsWith(PREFIX) && value?.running && Number.isFinite(value.endsAt));
  const wanted = new Set(timers.map(([key]) => alarmName(key.slice(PREFIX.length))));
  for (const alarm of await chrome.alarms.getAll()) if (alarm.name.startsWith('tabtahoe-') && !wanted.has(alarm.name)) await chrome.alarms.clear(alarm.name);
  for (const [key, state] of timers) await syncTimer(key.slice(PREFIX.length), state);
}

chrome.runtime.onInstalled.addListener(() => { reconcile(); });
chrome.runtime.onStartup.addListener(() => { reconcile(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, change] of Object.entries(changes)) if (key.startsWith(PREFIX)) syncTimer(key.slice(PREFIX.length), change.newValue);
});
chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'timer-state' && typeof message.id === 'string') syncTimer(message.id, message.state, message.title);
});
chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm.name.startsWith('tabtahoe-')) return;
  const id = alarm.name.slice('tabtahoe-'.length), key = PREFIX + id;
  const saved = await chrome.storage.local.get(key), state = saved[key];
  if (!state?.running || !Number.isFinite(state.endsAt)) return;
  const permission = state.desktopNotifications && await chrome.permissions.contains({ permissions: ['notifications'] });
  const threshold = Number(state.notifyAtPercent);
  if (Date.now() < state.endsAt) {
    const nextState = { ...state, progressNotified: true };
    await chrome.storage.local.set({ [key]: nextState });
    if (permission && threshold > 0 && !state.progressNotified) await chrome.notifications.create(`timer-progress-${id}`, { type: 'basic', iconUrl: 'assets/icon.svg', title: 'Timer progress', message: `Your timer is ${threshold}% complete.` });
    await syncTimer(id, nextState); return;
  }
  await chrome.storage.local.set({ [key]: { ...state, running: false, completed: true, remaining: 0, completedAt: Date.now() } });
  if (permission) {
    await chrome.notifications.create(`timer-${id}`, { type: 'basic', iconUrl: 'assets/icon.svg', title: 'Timer complete', message: 'Your countdown has finished.' });
  }
});
