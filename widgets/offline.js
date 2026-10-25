const fallbackQuotes = [
  { content: 'Well done is better than well said.', author: 'Benjamin Franklin', category: 'success' },
  { content: 'Lost time is never found again.', author: 'Benjamin Franklin', category: 'life' },
  { content: 'Happiness depends upon ourselves.', author: 'Aristotle', category: 'happiness' },
  { content: 'The secret of getting ahead is getting started.', author: 'Mark Twain', category: 'success' },
  { content: 'Great things are done by a series of small things brought together.', author: 'Vincent van Gogh', category: 'inspiration' },
  { content: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt', category: 'courage' },
  { content: 'The only way to have a friend is to be one.', author: 'Ralph Waldo Emerson', category: 'love' },
  { content: 'Nothing will work unless you do.', author: 'Maya Angelou', category: 'success' },
  { content: 'The mind is everything. What you think you become.', author: 'Buddha', category: 'wisdom' },
  { content: 'It always seems impossible until it is done.', author: 'Nelson Mandela', category: 'courage' },
  { content: 'Keep your face always toward the sunshine.', author: 'Walt Whitman', category: 'happiness' },
  { content: 'Knowing yourself is the beginning of all wisdom.', author: 'Aristotle', category: 'wisdom' },
];

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function mountSpacer({ element }) {
  element.classList.add('widget-spacer');
  element.setAttribute('aria-hidden', 'true');
  return {};
}

function mountNotes(context, services) {
  const root = context.element, id = context.instance.id;
  root.classList.add('notes-widget');
  const heading = node('h2', context.instance.settings.title, 'offline-widget-title');
  const layout = node('div'); layout.className = 'notes-layout';
  const sidebar = node('section'); sidebar.className = 'notes-sidebar';
  const add = node('button', '+ New note', 'subtle-button'); add.type = 'button'; add.setAttribute('aria-label', 'Add note');
  const list = node('ul'); list.className = 'notes-list'; list.setAttribute('aria-label', 'Your notes');
  const editor = node('section'); editor.className = 'notes-editor'; editor.hidden = true;
  const back = node('button', '‹ Notes', 'text-button'); back.type = 'button'; back.className = 'notes-back'; back.setAttribute('aria-label', 'Back to notes list');
  const area = node('textarea'); area.setAttribute('aria-label', `${context.instance.settings.title} note`);
  area.maxLength = 10000; area.placeholder = 'Write a note…'; area.setAttribute('data-no-drag', '');
  const status = node('p', 'Loading note…', 'widget-save-status'); status.setAttribute('role', 'status');
  editor.append(back, area); sidebar.append(add, list); layout.append(sidebar, editor); root.append(heading, layout, status);
  let saveTimer, writing = false, notes = [], selectedId = '';
  const currentNote = () => notes.find(note => note.id === selectedId);
  const renderNotes = () => {
    list.replaceChildren(...notes.map(note => {
      const item = node('li'); item.className = 'notes-list-item';
      const select = node('button', note.title, 'note-select'); select.type = 'button'; select.setAttribute('aria-pressed', String(note.id === selectedId)); select.setAttribute('aria-label', `Open note: ${note.title}`);
      const rename = node('button', '✎', 'note-action'); rename.type = 'button'; rename.title = 'Rename note'; rename.setAttribute('aria-label', `Rename ${note.title}`);
      const remove = node('button', '×', 'note-action'); remove.type = 'button'; remove.title = 'Delete note'; remove.setAttribute('aria-label', `Delete ${note.title}`);
      const titleInput = node('input'); titleInput.value = note.title; titleInput.maxLength = 60; titleInput.setAttribute('aria-label', `New title for ${note.title}`); titleInput.setAttribute('data-no-drag', ''); titleInput.hidden = true;
      select.addEventListener('click', async () => {
        if (writing) { clearTimeout(saveTimer); await save(); }
        selectedId = note.id; renderNotes(); area.focus();
      });
      rename.addEventListener('click', () => {
        select.hidden = true; rename.hidden = true; titleInput.hidden = false; titleInput.focus(); titleInput.select();
      });
      let renameCommitted = false;
      const commitRename = async () => {
        if (renameCommitted) return; renameCommitted = true;
        const value = titleInput.value.trim();
        if (value) note.title = value;
        renderNotes(); await save();
      };
      titleInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
        if (event.key === 'Escape') { renameCommitted = true; renderNotes(); }
      });
      titleInput.addEventListener('blur', commitRename);
      remove.addEventListener('click', async () => {
        if (writing) { clearTimeout(saveTimer); await save(); }
        notes = notes.filter(value => value.id !== note.id);
        if (selectedId === note.id) selectedId = '';
        renderNotes(); await save();
      });
      item.append(select, titleInput, rename, remove);
      return item;
    }));
    const current = currentNote();
    area.value = current?.text || '';
    editor.hidden = !current;
    area.hidden = !current;
    layout.classList.toggle('notes-editing', Boolean(current));
    area.placeholder = 'Write a note…';
  };
  const save = async () => {
    await services.saveWidgetContent(id, { notes, updatedAt: Date.now() });
    writing = false; status.textContent = 'Saved on this device';
  };
  const load = async () => {
    const saved = await services.getWidgetContent(id);
    if (Array.isArray(saved?.notes)) notes = saved.notes.filter(note => typeof note?.id === 'string' && typeof note?.title === 'string' && typeof note?.text === 'string');
    else if (typeof saved?.text === 'string') notes = [{ id: crypto.randomUUID(), title: 'Note 1', text: saved.text }];
    else notes = [{ id: crypto.randomUUID(), title: 'Note 1', text: '' }];
    selectedId = ''; renderNotes();
    status.textContent = 'Saved on this device';
  };
  load().then(() => save()).catch(() => { status.textContent = 'Could not load notes. Your edits can still be saved.'; });
  context.scope.listen(area, 'input', () => {
    writing = true; const current = currentNote(); if (current) current.text = area.value;
    status.textContent = 'Saving…'; clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await save(); }
      catch { status.textContent = 'Save failed. Your text is still here; keep this tab open and try again.'; }
    }, 350);
  });
  add.addEventListener('click', async () => { if (notes.length >= 50) { status.textContent = 'This widget can hold up to 50 notes.'; return; } notes.push({ id: crypto.randomUUID(), title: `Note ${notes.length + 1}`, text: '' }); selectedId = ''; renderNotes(); await save(); });
  back.addEventListener('click', async () => { if (writing) { clearTimeout(saveTimer); await save(); } selectedId = ''; renderNotes(); });
  const unsubscribe = services.subscribeWidgetContent((key, value) => {
    if (key !== id || document.activeElement === area || !Array.isArray(value?.notes)) return;
    notes = value.notes; selectedId = notes.some(note => note.id === selectedId) ? selectedId : ''; renderNotes(); status.textContent = 'Updated from another tab';
  });
  context.scope.cleanup(unsubscribe);
  context.scope.cleanup(() => {
    clearTimeout(saveTimer);
    if (writing) { const current = currentNote(); if (current) current.text = area.value; services.saveWidgetContent(id, { notes, updatedAt: Date.now() }).catch(() => {}); }
  });
  return { update() { heading.textContent = context.instance.settings.title; area.setAttribute('aria-label', `${context.instance.settings.title} note`); } };
}

function mountQuote(context, services) {
  const root = context.element; root.classList.add('quote-widget');
  const heading = node('h2', context.instance.settings.title, 'offline-widget-title');
  const quote = node('blockquote', 'Loading a little inspiration…');
  quote.style.fontSize = `${context.instance.settings.fontSize}px`;
  const author = node('p', '', 'quote-author');
  const refresh = node('button', '↻ New quote', 'text-button'); refresh.type = 'button';
  const attribution = node('a', 'Quotes from Quotable', 'quote-attribution'); attribution.href = 'https://github.com/lukePeavey/quotable'; attribution.target = '_blank'; attribution.rel = 'noopener noreferrer';
  root.append(heading, quote, author, refresh, attribution);
  let refreshTimer, manualOffset = 0, requestController;
  const show = value => { quote.textContent = `“${value.content}”`; author.textContent = `— ${value.author || 'Unknown'}`; };
  const fallbackFor = category => fallbackQuotes.filter(item => category === 'all' || item.category === category);
  const hash = text => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const getRefreshMinutes = () => Number(context.instance.settings.refreshMinutes) || 1440;
  const fetchBatch = async () => {
    const { category } = context.instance.settings;
    const cacheKey = `quotes-api-cache:quotable:${category}`;
    const maxAge = getRefreshMinutes() * 60000;
    let cache = await services.getWidgetContent(cacheKey);
    if (Array.isArray(cache?.quotes) && Date.now() - cache.fetchedAt < maxAge) return cache.quotes;
    const load = async () => {
      cache = await services.getWidgetContent(cacheKey);
      if (Array.isArray(cache?.quotes) && Date.now() - cache.fetchedAt < maxAge) return cache.quotes;
      const url = new URL('https://api.quotable.io/quotes/random');
      url.searchParams.set('limit', '50');
      if (category !== 'all') url.searchParams.set('tags', category);
      requestController = new AbortController();
      const response = await fetch(url, {
        signal: AbortSignal.any([requestController.signal, AbortSignal.timeout(12000)]),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('Quote API unavailable');
      const body = await response.json();
      if (!Array.isArray(body) || body.some(item => typeof item?.content !== 'string' || typeof item?.author !== 'string')) throw new Error('Unexpected quote response');
      const result = body.map(item => ({ content: item.content.slice(0, 1200), author: item.author.slice(0, 100) }));
      if (!result.length) throw new Error('No quotes found for that category');
      await services.saveWidgetContent(cacheKey, { quotes: result, fetchedAt: Date.now() });
      return result;
    };
    if (navigator.locks) return navigator.locks.request('tabtahoe:quotes-api-fetch', load);
    return load();
  };
  const displayQuote = async () => {
    try {
      const selection = await services.getWidgetContent(`quote-selection:${context.instance.id}`);
      manualOffset = Number.isInteger(selection?.offset) ? selection.offset : 0;
      const batch = await fetchBatch();
      const list = batch.length ? batch : fallbackFor(context.instance.settings.category);
      const period = getRefreshMinutes() * 60000;
      const bucket = Math.floor(Date.now() / period) + manualOffset;
      show(list[hash(`${context.instance.id}:${context.instance.settings.category}:${bucket}`) % list.length]);
      attribution.hidden = false;
    } catch {
      const selection = await services.getWidgetContent(`quote-selection:${context.instance.id}`).catch(() => null);
      manualOffset = Number.isInteger(selection?.offset) ? selection.offset : 0;
      const list = fallbackFor(context.instance.settings.category);
      const bucket = Math.floor(Date.now() / (getRefreshMinutes() * 60000)) + manualOffset;
      show(list[hash(`${context.instance.id}:${bucket}`) % list.length] || fallbackQuotes[0]);
      attribution.hidden = true;
    }
  };
  refresh.addEventListener('click', async () => {
    const selection = await services.getWidgetContent(`quote-selection:${context.instance.id}`);
    manualOffset = (Number.isInteger(selection?.offset) ? selection.offset : 0) + 1;
    await services.saveWidgetContent(`quote-selection:${context.instance.id}`, { offset: manualOffset }); displayQuote();
  });
  const unsubscribeSelection = services.subscribeWidgetContent((key) => { if (key === `quote-selection:${context.instance.id}`) displayQuote(); });
  const schedule = () => {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(displayQuote, getRefreshMinutes() * 60000);
  };
  context.scope.cleanup(unsubscribeSelection); context.scope.cleanup(() => { clearInterval(refreshTimer); requestController?.abort(); });
  displayQuote(); schedule(); return { update() { heading.textContent = context.instance.settings.title; quote.style.fontSize = `${context.instance.settings.fontSize}px`; requestController?.abort(); displayQuote(); schedule(); } };
}

function mountImage(context, services) {
  const root = context.element; root.classList.add('image-widget');
  const image = node('img'); image.hidden = true;
  image.style.objectFit = context.instance.settings.fit;
  const status = node('p', 'Add local images in widget settings.', 'widget-save-status'); status.setAttribute('role', 'status');
  const dots = node('nav'); dots.className = 'image-dots'; dots.setAttribute('aria-label', 'Carousel image positions'); dots.hidden = true;
  root.append(image, dots, status);
  let objectUrl, images = [], index = 0, rotation;
  const renderDots = () => {
    dots.hidden = images.length < 2;
    dots.replaceChildren(...images.map((item, position) => {
      const dot = node('button'); dot.type = 'button'; dot.className = 'image-dot'; dot.setAttribute('aria-label', `Show image ${position + 1} of ${images.length}`); dot.setAttribute('aria-current', String(position === index));
      dot.addEventListener('click', () => { index = position; showImage(); }); return dot;
    }));
  };
  const showImage = async () => {
    if (!images.length) { image.hidden = true; dots.hidden = true; status.hidden = false; status.textContent = 'Add local images in widget settings.'; return; }
    index %= images.length;
    try {
      const asset = await services.getImage(images[index].assetId);
      if (!asset) throw new Error('Image file unavailable');
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(asset); image.src = objectUrl; image.alt = images[index].name || `Carousel image ${index + 1}`; image.hidden = false;
      status.hidden = true; renderDots();
    } catch { status.hidden = false; status.textContent = 'A saved image is unavailable. Review carousel images in settings.'; }
  };
  const reload = async () => {
    const saved = await services.getWidgetContent(`image-carousel:${context.instance.id}`);
    images = Array.isArray(saved) ? saved.filter(item => item && typeof item.assetId === 'string') : [];
    if (!images.length && context.instance.settings.assetId) {
      images = [{ assetId: context.instance.settings.assetId, name: context.instance.settings.caption || 'Local image' }];
      await services.saveWidgetContent(`image-carousel:${context.instance.id}`, images);
    }
    index = images.length ? index % images.length : 0; renderDots(); await showImage();
  };
  const schedule = () => {
    clearInterval(rotation);
    rotation = setInterval(() => { if (images.length > 1) { index = (index + 1) % images.length; showImage(); } }, Number(context.instance.settings.intervalMinutes) * 60000);
  };
  reload().catch(() => { status.textContent = 'Carousel could not be loaded.'; }); schedule();
  const unsubscribe = services.subscribeWidgetContent((key, value) => {
    if (key !== `image-carousel:${context.instance.id}`) return;
    images = Array.isArray(value) ? value.filter(item => item && typeof item.assetId === 'string') : []; index = 0; renderDots(); showImage();
  });
  context.scope.cleanup(unsubscribe); context.scope.cleanup(() => { clearInterval(rotation); if (objectUrl) URL.revokeObjectURL(objectUrl); });
  return { update() { image.style.objectFit = context.instance.settings.fit; schedule(); } };
}

function mountTimer(context, services) {
  const root = context.element; root.classList.add('timer-widget');
  const heading = node('h2', context.instance.settings.title, 'offline-widget-title');
  const display = node('output', '00:00:00', 'timer-display'); display.setAttribute('aria-live', 'off');
  const hours = node('input'); hours.type = 'number'; hours.min = '0'; hours.max = '99'; hours.value = '0'; hours.setAttribute('aria-label', 'Hours'); hours.setAttribute('data-no-drag', '');
  const minutes = node('input'); minutes.type = 'number'; minutes.min = '0'; minutes.max = '59'; minutes.value = '25'; minutes.setAttribute('aria-label', 'Minutes'); minutes.setAttribute('data-no-drag', '');
  const seconds = node('input'); seconds.type = 'number'; seconds.min = '0'; seconds.max = '59'; seconds.value = '0'; seconds.setAttribute('aria-label', 'Seconds'); seconds.setAttribute('data-no-drag', '');
  const entry = node('div'); entry.className = 'timer-entry'; entry.append(hours, node('span', ':'), minutes, node('span', ':'), seconds);
  const presets = node('div'); presets.className = 'timer-presets';
  for (const [label, value] of [['5 min', 300], ['25 min', 1500], ['1 hour', 3600]]) {
    const button = node('button', label, 'text-button'); button.type = 'button'; button.addEventListener('click', () => { hours.value = String(Math.floor(value / 3600)); minutes.value = String(value % 3600 / 60); seconds.value = '0'; }); presets.append(button);
  }
  const actions = node('div'); actions.className = 'timer-actions';
  const start = node('button', 'Start', 'primary-button'); start.type = 'button';
  const pause = node('button', 'Pause', 'subtle-button'); pause.type = 'button';
  const reset = node('button', 'Reset', 'subtle-button'); reset.type = 'button';
  const runAgain = node('button', 'Run again', 'subtle-button'); runAgain.type = 'button';
  const status = node('p', '', 'timer-status'); status.setAttribute('role', 'status');
  actions.append(start, pause, reset, runAgain); root.append(heading, display, entry, presets, actions, status);
  let state = null, interval, audio, completionPending = false;
  const dismiss = node('button', 'Dismiss', 'subtle-button'); dismiss.type = 'button';
  dismiss.addEventListener('click', async () => { state = null; await persist(); render(); });
  const duration = () => ((Number(hours.value) * 60 + Number(minutes.value)) * 60 + Number(seconds.value));
  const remaining = () => state?.running ? Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)) : state?.remaining || 0;
  const format = value => [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map(part => String(part).padStart(2, '0')).join(':');
  const persist = async () => {
    try {
      await services.saveWidgetContent(`timer:${context.instance.id}`, state);
      if (globalThis.chrome?.runtime?.sendMessage) chrome.runtime.sendMessage({ type: 'timer-state', id: context.instance.id, title: context.instance.settings.title, state }).catch(() => {});
    } catch { status.textContent = 'Timer state could not be saved.'; }
  };
  const sound = async () => {
    if (context.instance.settings.muted) return;
    try {
      const { soundType, soundAssetId, volume } = context.instance.settings;
      if (soundType === 'uploaded') {
        const blob = await services.getSound(soundAssetId);
        if (!blob) throw new Error('Uploaded alarm sound is missing. Reupload it in timer settings.');
        const url = URL.createObjectURL(blob), player = new Audio(url); player.volume = volume;
        player.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
        player.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
        await player.play(); return;
      }
      audio ||= new AudioContext(); await audio.resume();
      const tones = soundType === 'bell' ? [660, 880, 1100] : soundType === 'digital' ? [920, 620, 920] : [784, 988];
      tones.forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), startAt = audio.currentTime + index * .35;
        oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, startAt); gain.gain.linearRampToValueAtTime(.28 * volume, startAt + .025); gain.gain.exponentialRampToValueAtTime(.001, startAt + .28);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(startAt); oscillator.stop(startAt + .3);
      });
    } catch { services.toast('Alarm sound was blocked. Open timer settings and use Test sound after interacting with the page.'); }
  };
  const claimCompletion = async () => {
    if (completionPending) return;
    completionPending = true;
    const finish = async () => {
      const latest = await services.getWidgetContent(`timer:${context.instance.id}`);
      if (latest?.running && latest.endsAt <= Date.now()) {
        state = { ...latest, completed: true, remaining: 0, running: false, soundPlayed: true, completedAt: Date.now() };
        await persist(); sound();
      } else if (latest?.completed && !latest.soundPlayed) {
        state = { ...latest, soundPlayed: true }; await persist(); sound();
      } else state = latest || state;
      completionPending = false; render();
    };
    try {
      if (navigator.locks) await navigator.locks.request(`tabtahoe:timer-alarm:${context.instance.id}`, finish);
      else await finish();
    } catch { completionPending = false; status.textContent = 'Timer finished, but its alarm could not be claimed across tabs.'; }
  };
  const render = () => {
    const value = remaining(); display.textContent = format(value);
    const complete = state?.completed === true;
    if (state?.running && value === 0) claimCompletion();
    else if (complete && !state.soundPlayed) claimCompletion();
    entry.hidden = Boolean(state?.running || complete); presets.hidden = Boolean(state?.running || complete); pause.hidden = !state?.running; start.hidden = Boolean(state?.running);
    start.textContent = state?.remaining ? 'Resume' : 'Start';
    const elapsed = (Number(state?.elapsedSeconds) || 0) + (state?.running ? Math.max(0, (Date.now() - (state.startedAt || Date.now())) / 1000) : 0);
    const progress = state?.running && state.durationSeconds ? Math.floor(elapsed / state.durationSeconds * 100) : 0;
    const target = Number(state?.notifyAtPercent || 0);
    status.textContent = complete ? 'Timer complete.' : state?.running && target && progress >= target ? `${target}% complete · timer running` : state?.running ? 'Timer running' : state?.remaining ? 'Paused' : 'Ready';
    dismiss.hidden = !complete;
    if (complete && dismiss.parentElement !== actions) actions.prepend(dismiss);
    runAgain.hidden = !complete;
  };
  const refresh = async () => { const latest = await services.getWidgetContent(`timer:${context.instance.id}`); if (latest && JSON.stringify(latest) !== JSON.stringify(state)) state = latest; render(); };
  start.addEventListener('click', async () => {
    if (!state?.remaining) {
      const secondsValue = duration();
      if (![hours, minutes, seconds].every(input => /^\d+$/.test(input.value) && Number(input.value) <= Number(input.max)) || secondsValue <= 0 || secondsValue > 359999) { status.textContent = 'Enter a duration from 1 second to 99:59:59.'; return; }
      state = { remaining: secondsValue, durationSeconds: secondsValue, progressNotified: false, running: false, completed: false };
    }
    audio ||= globalThis.AudioContext ? new AudioContext() : null; await audio?.resume?.();
    state = { ...state, running: true, completed: false, soundPlayed: false, startedAt: Date.now(), endsAt: Date.now() + state.remaining * 1000, elapsedSeconds: Number(state.elapsedSeconds) || 0, durationSeconds: Number(state.durationSeconds) || state.remaining, notifyAtPercent: context.instance.settings.notifyAtPercent, desktopNotifications: context.instance.settings.desktopNotifications, progressNotified: state.progressNotified === true }; await persist(); render();
  });
  pause.addEventListener('click', async () => { state = { ...state, remaining: remaining(), elapsedSeconds: (Number(state.elapsedSeconds) || 0) + Math.max(0, (Date.now() - (state.startedAt || Date.now())) / 1000), startedAt: 0, running: false, completed: false }; await persist(); render(); });
  reset.addEventListener('click', async () => { state = null; await persist(); render(); });
  runAgain.addEventListener('click', () => start.click());
  const unsubscribe = services.subscribeWidgetContent((key, value) => { if (key === `timer:${context.instance.id}`) { state = value; render(); } });
  context.scope.cleanup(unsubscribe);
  refresh().catch(() => { status.textContent = 'Timer could not be restored.'; });
  interval = setInterval(render, 250); context.scope.cleanup(() => clearInterval(interval));
  return { update() { heading.textContent = context.instance.settings.title; if (state?.running) { state.notifyAtPercent = context.instance.settings.notifyAtPercent; state.desktopNotifications = context.instance.settings.desktopNotifications; persist(); } render(); } };
}

export function registerOfflineWidgets(registry, services) {
  const definitions = [
    { type: 'timer', title: 'Countdown timer', description: 'A duration timer with an in-page alarm.', defaultSize: { w: 3, h: 3 }, minimumSize: { w: 2, h: 2 }, settings: { title: { type: 'string', default: 'Timer', maxLength: 60 }, soundType: { type: 'string', default: 'soft', choices: ['soft', 'digital', 'bell', 'uploaded'] }, soundAssetId: { type: 'string', default: '', maxLength: 128 }, volume: { type: 'number', default: 0.5, min: 0, max: 1 }, muted: { type: 'boolean', default: false }, notifyAtPercent: { type: 'string', default: '90', choices: ['off', '90', '95'] }, desktopNotifications: { type: 'boolean', default: false } }, mount: context => mountTimer(context, services) },
    { type: 'spacer', title: 'Spacer', description: 'Reserve blank canvas space.', defaultSize: { w: 2, h: 2 }, minimumSize: { w: 1, h: 1 }, settings: {}, mount: mountSpacer },
    { type: 'notes', title: 'Notes', description: 'A plain text note saved on this device.', defaultSize: { w: 4, h: 3 }, minimumSize: { w: 2, h: 2 }, settings: { title: { type: 'string', default: 'Notes', maxLength: 60 } }, mount: context => mountNotes(context, services) },
    { type: 'quote', title: 'Quotes', description: 'Inspirational quotes by category with a famous-people offline collection.', defaultSize: { w: 4, h: 3 }, minimumSize: { w: 2, h: 2 }, settings: { title: { type: 'string', default: 'A thought for today', maxLength: 60 }, category: { type: 'string', default: 'all', choices: ['all', 'happiness', 'life', 'inspiration', 'wisdom', 'success', 'love', 'courage'] }, refreshMinutes: { type: 'number', default: 0, min: 0, max: 1440, uiChoices: [0, 30, 60, 360] }, fontSize: { type: 'number', default: 18, min: 12, max: 28, uiChoices: [12, 14, 16, 18, 20, 24, 28] } }, mount: context => mountQuote(context, services) },
    { type: 'image', title: 'Image carousel', description: 'Cycle through local images on a schedule.', defaultSize: { w: 4, h: 4 }, minimumSize: { w: 2, h: 2 }, settings: { title: { type: 'string', default: 'My image', maxLength: 60 }, assetId: { type: 'string', default: '', maxLength: 128 }, caption: { type: 'string', default: '', maxLength: 120 }, alt: { type: 'string', default: '', maxLength: 200 }, intervalMinutes: { type: 'string', default: '5', choices: ['1', '5', '15', '30', '60', '360'] }, fit: { type: 'string', default: 'contain', choices: ['contain', 'cover'] } }, mount: context => mountImage(context, services) },
  ];
  for (const definition of definitions) registry.register({ ...definition, version: 1, capabilities: { settings: true, duplicate: true, remove: true }, update(context) { context.state.controller?.update?.(); }, resize(context, size) { context.state.controller?.resize?.(size); }, mount(context) { context.state.controller = definition.mount(context); } });
}
