import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, extname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const profile = await mkdtemp(resolve(tmpdir(), 'tabtahoe-test-'));
const results = resolve(root, 'test-results');
await mkdir(results, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname)}`);
    if (!path.startsWith(`${root}/`)) throw new Error('Invalid path');
    const body = await readFile(path); response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }); response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser, socket;
const pending = new Map();
let sequence = 0, session;
const exceptions = [];
function send(method, params = {}, sessionId = session) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, message = expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Condition failed: ${message}`);
}
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const fill = (selector, value) => evaluate(`document.querySelector(${JSON.stringify(selector)}).value = ${JSON.stringify(value)}`);
const submit = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`);
async function screenshot(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(resolve(results, name), Buffer.from(shot.data, 'base64'));
}

try {
  browser = spawn(process.env.BRAVE_BIN || '/opt/brave.com/brave/brave', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--disable-extensions-except=${root}`, `--load-extension=${root}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Browser startup timed out: ${output.slice(-1500)}`)), 20000);
    browser.on('error', error => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', chunk => { output += chunk.toString(); const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
    browser.on('exit', code => { clearTimeout(timer); reject(new Error(`Browser exited (${code}): ${output.slice(-1500)}`)); });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = async event => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const item = pending.get(data.id); pending.delete(data.id); clearTimeout(item.timeout);
      if (data.error) item.reject(new Error(data.error.message)); else item.resolve(data.result);
    }
    if (data.method === 'Runtime.exceptionThrown') exceptions.push(data.params.exceptionDetails);
    if (data.method === 'Fetch.requestPaused') {
      const geocoding = data.params.request.url.includes('geocoding-api');
      const body = geocoding ? { results: [{ name: 'Bengaluru', admin1: 'Karnataka', country: 'India', latitude: 12.97, longitude: 77.59 }] } : { current: { temperature_2m: 24, relative_humidity_2m: 65, weather_code: 2 }, daily: { temperature_2m_max: [27], temperature_2m_min: [19] } };
      await send('Fetch.fulfillRequest', { requestId: data.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(JSON.stringify(body)).toString('base64') }, data.sessionId);
    }
  };
  const target = await send('Target.createTarget', { url: 'about:blank' }, null);
  session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*api.open-meteo.com/*' }, { urlPattern: '*geocoding-api.open-meteo.com/*' }] });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
  await waitFor('document.querySelectorAll("#app-grid > .app-item").length === 12');
  assert.equal(await evaluate('document.querySelectorAll("#calendar > span").length'), 49);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('desktop.png');
  console.log('PASS: dashboard renders, calendar dates, no desktop overflow');

  await click('#shortcut-add'); await fill('#shortcut-form [name=title]', '<script>Test</script>');
  await fill('#shortcut-form [name=url]', 'javascript:alert(1)'); await submit('#shortcut-form');
  assert.equal(await evaluate('document.querySelector("#shortcut-dialog").open'), true);
  await fill('#shortcut-form [name=url]', 'https://example.com'); await submit('#shortcut-form');
  assert.equal(await evaluate('document.querySelectorAll("#app-grid > .app-item").length'), 13);
  assert.equal(await evaluate('document.querySelector("#app-grid").textContent.includes("<script>Test</script>")'), true);
  await click('#edit-layout');
  await evaluate('document.querySelectorAll("#app-grid > .app-item")[2].querySelector("a").click()');
  await fill('#shortcut-form [name=title]', 'YouTube Music'); await submit('#shortcut-form');
  assert.equal(await evaluate('document.querySelectorAll("#app-grid > .app-item")[2].textContent.includes("YouTube Music")'), true);
  await click('#edit-layout');
  await click('#group-add'); await fill('#new-group-name', 'Reading'); await submit('#name-form');
  await evaluate('[...document.querySelectorAll("#app-grid > .app-item")].find(x => x.textContent.includes("Reading")).querySelector("button").click()');
  await click('#group-shortcut-add'); await fill('#shortcut-form [name=title]', 'Library'); await fill('#shortcut-form [name=url]', 'https://example.org'); await submit('#shortcut-form');
  assert.equal(await evaluate('document.querySelectorAll("#group-apps .app-tile").length'), 1);
  await click('#group-dialog .close-dialog');
  console.log('PASS: URL validation, safe user text, shortcut editing preserves order, custom groups');

  await click('#customize'); await fill('#settings-form [name=name]', 'Amal'); await fill('#settings-form [name=rotation]', '5');
  await evaluate('document.querySelector("#settings-form [name=hour24]").checked = true');
  await submit('#settings-form');
  assert.equal(await evaluate('document.querySelector("#greeting").textContent.includes("AMAL")'), true);
  await send('Page.reload');
  await waitFor('document.querySelector("#greeting")?.textContent.includes("AMAL")');
  assert.equal(await evaluate('document.querySelectorAll("#app-grid > .app-item").length'), 14);
  await click('#wallpaper-next');
  assert.equal(await evaluate('document.querySelector("#wallpaper-name").textContent'), 'Into the green');
  console.log('PASS: settings and app persistence, wallpaper switching');

  await click('#weather-location'); await fill('#city-search', 'Bengaluru'); await submit('#location-form');
  await waitFor('document.querySelector(".city-result")'); await click('.city-result');
  await waitFor('document.querySelector("#temperature").textContent === "24°"');
  assert.equal(await evaluate('document.querySelector("#weather-summary").textContent'), 'Partly cloudy');
  console.log('PASS: city selection and forecast rendering (mocked weather responses)');

  const wave = Buffer.alloc(44 + 16000 * 2 * 3);
  wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(16000, 24); wave.writeUInt32LE(32000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(wave.length - 44, 40);
  const musicFile = resolve(profile, 'Test track.wav'); await writeFile(musicFile, wave);
  const documentNode = await send('DOM.getDocument');
  const inputNode = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '#audio-files' });
  await send('DOM.setFileInputFiles', { nodeId: inputNode.nodeId, files: [musicFile] });
  await waitFor('document.querySelector("#audio").readyState >= 1');
  await click('#play'); await waitFor('!document.querySelector("#audio").paused');
  await click('#play'); assert.equal(await evaluate('document.querySelector("#audio").paused'), true);
  await click('#repeat'); assert.equal(await evaluate('document.querySelector("#audio").loop'), true);
  console.log('PASS: local audio loading, actual playback, pause and repeat');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await screenshot('mobile.png');
  console.log('PASS: narrow layout has no horizontal overflow');

  await send('Page.navigate', { url: 'chrome://newtab/' });
  await waitFor('location.protocol === "chrome-extension:" && document.querySelectorAll("#app-grid > .app-item").length === 12', 'installed extension new tab override');
  const bookmarkId = await evaluate('(async () => (await chrome.bookmarks.create({ parentId: "1", title: "TabTahoe test", url: "https://example.com/bookmark" })).id)()');
  await click('#bookmarks-open');
  await waitFor('document.querySelector("#all-bookmarks").textContent.includes("TabTahoe test")');
  await evaluate('[...document.querySelectorAll(".bookmark-row")].find(x => x.textContent.includes("TabTahoe test")).querySelector("button").click()');
  await click('#bookmarks-dialog .close-dialog');
  await waitFor('document.querySelector("#pinned-bookmarks").textContent.includes("TabTahoe test")');
  await send('Page.reload');
  await waitFor('document.querySelector("#pinned-bookmarks")?.textContent.includes("TabTahoe test")');
  await evaluate(`chrome.bookmarks.remove(${JSON.stringify(bookmarkId)})`);
  await waitFor('!document.querySelector("#pinned-bookmarks").textContent.includes("TabTahoe test")');
  console.log('PASS: installed MV3 new tab override, real bookmarks, pin persistence, live removal');
  assert.deepEqual(exceptions, [], 'No unhandled browser exceptions');
  console.log(`All browser checks passed. Screenshots: ${results}`);
} finally {
  for (const item of pending.values()) clearTimeout(item.timeout);
  socket?.close();
  if (browser && browser.exitCode === null) {
    browser.kill('SIGTERM');
    await Promise.race([new Promise(resolve => browser.once('exit', resolve)), delay(3000)]);
    if (browser.exitCode === null) { browser.kill('SIGKILL'); await new Promise(resolve => browser.once('exit', resolve)); }
  }
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
