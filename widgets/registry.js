function validateSettings(fields, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid widget settings.');
  if (Object.keys(values).some(key => !Object.hasOwn(fields, key))) throw new Error('Unknown widget setting.');
  const settings = {};
  for (const [key, field] of Object.entries(fields)) {
    const value = Object.hasOwn(values, key) ? values[key] : field.default;
    if (field.type === 'string' && (typeof value !== 'string' || value.length > (field.maxLength ?? 200))) throw new Error(`Invalid ${key}.`);
    if (field.type === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid ${key}.`);
    if (field.type === 'number' && (!Number.isFinite(value) || value < (field.min ?? -Infinity) || value > (field.max ?? Infinity))) throw new Error(`Invalid ${key}.`);
    if (field.choices && !field.choices.includes(value)) throw new Error(`Invalid ${key}.`);
    settings[key] = value;
  }
  return settings;
}

// Registry metadata is independent of the DOM and the layout engine.
export function createWidgetRegistry() {
  const definitions = new Map();
  function get(type) {
    const definition = definitions.get(type);
    if (!definition) throw new Error(`Unsupported widget type: ${type}.`);
    return definition;
  }
  function validate(instance) {
    if (!instance || typeof instance.id !== 'string' || !instance.id || instance.id.length > 128) throw new Error('Invalid widget ID.');
    const definition = get(instance.type);
    if (instance.version !== definition.version) throw new Error('Unsupported widget version.');
    return { id: instance.id, type: instance.type, version: instance.version, settings: validateSettings(definition.settings, instance.settings) };
  }
  return {
    register(definition) {
      if (!definition || !/^[a-z][a-z0-9-]*$/.test(definition.type) || definitions.has(definition.type)) throw new Error('Widget types must be unique kebab-case names.');
      if (!Number.isInteger(definition.version) || definition.version < 1 || typeof definition.title !== 'string' || !definition.title || typeof definition.mount !== 'function') throw new Error('Invalid widget definition.');
      const { defaultSize, minimumSize } = definition;
      if (![defaultSize?.w, defaultSize?.h, minimumSize?.w, minimumSize?.h].every(value => Number.isInteger(value) && value > 0) || defaultSize.w > 12 || defaultSize.h > 1000 || defaultSize.w < minimumSize.w || defaultSize.h < minimumSize.h) throw new Error('Invalid widget sizes.');
      const fields = structuredClone(definition.settings ?? {});
      for (const field of Object.values(fields)) {
        if (!['string', 'number', 'boolean'].includes(field.type)) throw new Error('Unsupported settings field.');
      }
      validateSettings(fields, {});
      for (const hook of ['update', 'resize', 'destroy']) {
        if (definition[hook] !== undefined && typeof definition[hook] !== 'function') throw new Error(`Invalid ${hook} hook.`);
      }
      definitions.set(definition.type, { ...definition, settings: fields, defaultSize: { ...defaultSize }, minimumSize: { ...minimumSize }, capabilities: { ...definition.capabilities } });
    },
    list() {
      return [...definitions.values()].map(({ type, version, title, description = '', settings, defaultSize, minimumSize, capabilities }) => structuredClone({ type, version, title, description, settings, defaultSize, minimumSize, capabilities }));
    },
    create(type, settings = {}, id = crypto.randomUUID()) {
      return validate({ id, type, version: get(type).version, settings });
    },
    validate,
    // Hooks stay private to the registry; callers cannot mutate its metadata.
    invoke(type, hook, context, value) { return get(type)[hook]?.(context, value); },
  };
}
