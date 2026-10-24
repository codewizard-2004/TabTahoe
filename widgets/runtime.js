// Resources belong to one mount, including resources allocated before a hook fails.
function createScope() {
  const controller = new AbortController();
  const disposers = [];
  let disposed = false;
  const cleanup = dispose => {
    if (typeof dispose !== 'function') throw new Error('Cleanup must be a function.');
    if (disposed) dispose();
    else disposers.push(dispose);
    return dispose;
  };
  return {
    signal: controller.signal,
    cleanup,
    listen(target, event, listener, options) {
      target.addEventListener(event, listener, options);
      cleanup(() => target.removeEventListener(event, listener, options));
    },
    interval(callback, milliseconds) {
      const timer = setInterval(callback, milliseconds);
      cleanup(() => clearInterval(timer));
      return timer;
    },
    observe(observer, target) { cleanup(() => observer.disconnect()); observer.observe(target); },
    objectUrl(blob) {
      const url = URL.createObjectURL(blob);
      cleanup(() => URL.revokeObjectURL(url));
      return url;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const dispose of disposers.reverse()) {
        try { dispose(); } catch { /* One faulty disposer must not leak the rest. */ }
      }
      disposers.length = 0;
    },
  };
}

export function createWidgetRuntime(registry, { onError = () => {} } = {}) {
  const mounted = new Map();
  return {
    mount(rawInstance, element) {
      const instance = registry.validate(rawInstance);
      if (mounted.has(instance.id)) throw new Error('This widget is already mounted.');
      const scope = createScope();
      const context = { instance, element, scope, state: {} };
      let destroyed = false, failed = false;
      const report = (error, showState = true) => {
        try { onError(error, instance.id); } catch { /* Reporting cannot break another widget. */ }
        if (showState) {
          failed = true;
          scope.dispose();
          const message = element.ownerDocument.createElement('p');
          message.className = 'widget-error';
          message.setAttribute('role', 'status');
          message.textContent = 'This widget could not load. Remove it and add it again to retry.';
          element.replaceChildren(message);
        }
      };
      const invoke = (hook, value) => {
        try {
          const result = registry.invoke(instance.type, hook, context, value);
          // Hooks are synchronous; asynchronous work must use scope.signal and handle
          // rejection itself. Catch rejected hook promises as a localized failure.
          if (result?.then) result.catch(error => { if (!destroyed) report(error); });
        } catch (error) { report(error); }
      };
      const handle = {
        update(settings) {
          if (destroyed || failed) return;
          const next = registry.validate({ ...instance, settings });
          context.instance = next;
          invoke('update', next.settings);
        },
        resize(size) { if (!destroyed && !failed) invoke('resize', size); },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          try { registry.invoke(instance.type, 'destroy', context); }
          catch (error) { report(error, false); }
          finally {
            scope.dispose();
            element.replaceChildren();
            mounted.delete(instance.id);
          }
        },
      };
      mounted.set(instance.id, handle);
      invoke('mount');
      if (!failed && globalThis.ResizeObserver) {
        scope.observe(new ResizeObserver(entries => handle.resize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height })), element);
      }
      return handle;
    },
    destroy() { for (const handle of mounted.values()) handle.destroy(); },
  };
}
