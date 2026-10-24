import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

export async function checkCanvasFixture({ send, evaluate, waitFor, click, screenshot, origin, installed = false }) {
  const fixtureUrl = `${origin}/tests/fixtures/canvas.html`;
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Page.navigate', { url: fixtureUrl });
  await waitFor('Boolean(globalThis.canvasFixture)', 'canvas fixture startup');
  const initial = await evaluate('canvasFixture.snapshot()');
  assert.equal(initial.layout.length, 3);
  assert.equal(initial.layout.find(item => item.id === 'clock-b').y, 1, 'Intentional leading gap survives mount');
  assert.equal(await evaluate('document.querySelectorAll("#canvas [id]").length'), 0, 'No global IDs inside widgets');

  // Engine-backed save/restore, collision resolution, and invalid bounds.
  await evaluate('canvasFixture.adapter.update("clock-a", { x: 4, y: 1 })');
  let moved = await evaluate('canvasFixture.adapter.serialize()');
  const a = moved.find(item => item.id === 'clock-a'), b = moved.find(item => item.id === 'clock-b');
  assert.equal(a.x, 4);
  assert.ok(a.y + a.h <= b.y || b.y + b.h <= a.y, 'Colliding cards cannot overlap');
  assert.equal(await evaluate('try { canvasFixture.adapter.update("clock-a", { w: 1 }); false; } catch { true; }'), true);
  await evaluate(`canvasFixture.adapter.restore(${JSON.stringify(initial.layout)})`);
  assert.deepEqual(await evaluate('canvasFixture.adapter.serialize()'), initial.layout, 'Adapter restores existing nodes without remounting');
  await evaluate(`canvasFixture.restore(${JSON.stringify(initial)})`);

  // Independent instances keep separate settings and DOM references.
  await click('[data-instance-id="clock-a"] input');
  assert.equal(await evaluate('canvasFixture.instances.get("clock-a").settings.hour24'), true);
  assert.equal(await evaluate('canvasFixture.instances.get("clock-b").settings.hour24'), true);
  await click('[data-instance-id="clock-a"] input');
  assert.equal(await evaluate('canvasFixture.instances.get("clock-b").settings.hour24'), true);

  // Selecting content and nested shortcut/group dragging leave canvas coordinates alone.
  await click('#edit-canvas');
  const contentLayout = await evaluate('canvasFixture.adapter.serialize()');
  await evaluate(`(() => {
    const input = document.querySelector('textarea'); input.focus(); input.select(); input.value = 'Edited inside a widget';
    const shortcut = document.querySelector('.fixture-shortcut'), group = document.querySelector('.fixture-group');
    const dataTransfer = new DataTransfer();
    shortcut.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    group.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    group.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  })()`);
  assert.equal(await evaluate('Boolean(document.querySelector(".fixture-group .fixture-shortcut"))'), true);
  assert.deepEqual(await evaluate('canvasFixture.adapter.serialize()'), contentLayout);

  await evaluate('document.querySelector("[data-instance-id=clock-a] .canvas-move-handle").focus()');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown' });
  assert.equal(await evaluate('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").y'), 1);
  await waitFor('!document.querySelector(".ui-draggable-dragging")', 'Pointer drag completes before resizing');
  await delay(100);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', modifiers: 8 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', modifiers: 8 });
  assert.equal(await evaluate('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").w'), 4);
  await evaluate(`canvasFixture.restore(${JSON.stringify(initial)})`);

  // Real pointer movement uses only the dedicated handle.
  const handle = await evaluate(`(() => {
    const rect = document.querySelector('[data-instance-id="clock-a"] .canvas-move-handle').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, step: document.querySelector('#canvas').clientWidth / 12 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x, y: handle.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 5; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x + handle.step * i / 5, y: handle.y + 72 * i / 5, buttons: 1 });
    await delay(30);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: handle.x + handle.step, y: handle.y + 72, button: 'left', clickCount: 1 });
  await waitFor('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").x === 1', 'Pointer drag snaps to a column');
  assert.equal(await evaluate('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").y'), 1);

  const resize = await evaluate(`(() => {
    const rect = document.querySelector('[data-instance-id="clock-a"] .ui-resizable-se').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...resize });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...resize, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 5; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: resize.x, y: resize.y + 72 * i / 5, buttons: 1 });
    await delay(30);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: resize.x, y: resize.y + 72, button: 'left', clickCount: 1 });
  await waitFor('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").h === 4', 'Pointer resize snaps to a row');
  await waitFor('canvasFixture.stats.resizes["clock-a"]?.height > 0', 'Content receives resize observation');

  // Touch uses the same dedicated handle while native content can still scroll.
  const touchHandle = await evaluate(`(() => {
    const rect = document.querySelector('[data-instance-id="clock-a"] .canvas-move-handle').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touchHandle, id: 1 }] });
  await delay(350); // GridStack deliberately requires a long press before touch dragging.
  for (let i = 1; i <= 5; i++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchHandle.x - handle.step * i / 5, y: touchHandle.y + 72 * i / 5, id: 1 }] });
    await delay(30);
  }
  await delay(150);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await waitFor('canvasFixture.adapter.serialize().find(item => item.id === "clock-a").x === 0', 'Touch drag snaps to a column');

  await click('#save-canvas');
  const saved = await evaluate('canvasFixture.snapshot()');
  await send('Page.reload');
  await waitFor('Boolean(globalThis.canvasFixture)');
  assert.deepEqual(await evaluate('canvasFixture.snapshot()'), saved, 'Geometry and settings survive reload');

  // Narrow CSS presentation never writes its temporary geometry back to the engine.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 640, deviceScaleFactor: 1, mobile: false });
  await delay(150);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'No horizontal page overflow');
  assert.deepEqual(await evaluate('canvasFixture.adapter.serialize()'), saved.layout);
  await screenshot(installed ? 'canvas-extension-narrow.png' : 'canvas-narrow.png');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
  await delay(150);
  assert.deepEqual(await evaluate('canvasFixture.adapter.serialize()'), saved.layout);

  // Mount failures are localized and release resources allocated before the throw.
  await click('#add-failure');
  const failedId = await evaluate('canvasFixture.stats.errors.at(-1).id');
  await delay(100);
  assert.equal(await evaluate(`canvasFixture.stats.ticks[${JSON.stringify(failedId)}] || 0`), 0);
  assert.equal(await evaluate('document.querySelectorAll(".widget-error").length'), 1);
  const tick = await evaluate('canvasFixture.stats.ticks["clock-a"]');
  await waitFor(`canvasFixture.stats.ticks["clock-a"] > ${tick}`, 'Healthy clocks keep updating');
  await evaluate('canvasFixture.remove("clock-b")');
  const stopped = await evaluate('canvasFixture.stats.ticks["clock-b"]');
  await delay(1100);
  assert.equal(await evaluate('canvasFixture.stats.ticks["clock-b"]'), stopped);
  await screenshot(installed ? 'canvas-extension-desktop.png' : 'canvas-desktop.png');
  await evaluate('for (const id of [...canvasFixture.instances.keys()]) canvasFixture.remove(id)');
  assert.equal(await evaluate('canvasFixture.adapter.serialize().length'), 0);
  await click('#add-clock');
  assert.equal(await evaluate('canvasFixture.adapter.serialize().length'), 1, 'Empty canvas retains a working Add entry point');
  console.log(`PASS: canvas ${installed ? 'MV3 CSP' : 'web preview'}, gaps, collisions, pointer drag/resize, touch, keyboard, persistence, narrow reflow, independent widgets, cleanup, failure isolation`);
}
