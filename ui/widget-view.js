// Static bundled templates get unique IDs; controllers query roles within their own view.
export function createWidgetView(context, template, dialogNames = []) {
  const { element, scope, instance } = context;
  const roots = [element], dialogs = [];
  function clone(name) {
    const source = document.querySelector(`template[data-widget-template="${name}"]`);
    if (!source) throw new Error('The widget template is unavailable.');
    const fragment = source.content.cloneNode(true);
    for (const node of fragment.querySelectorAll('[id]')) {
      const role = node.id;
      node.dataset.role = role; node.classList.add(`role-${role}`); node.id = `${instance.id}-${role}`;
    }
    for (const node of fragment.querySelectorAll('[for], [aria-labelledby], [aria-describedby]')) {
      for (const attribute of ['for', 'aria-labelledby', 'aria-describedby']) {
        if (node.hasAttribute(attribute)) node.setAttribute(attribute, node.getAttribute(attribute).split(' ').map(id => `${instance.id}-${id}`).join(' '));
      }
    }
    return fragment;
  }
  element.append(clone(template));
  for (const name of dialogNames) {
    const fragment = clone(name), dialog = fragment.querySelector('dialog');
    roots.push(dialog); dialogs.push(dialog); document.body.append(fragment);
  }
  const selectorFor = selector => selector.replace(/#([a-z][\w-]*)/gi, (match, role) => role === 'toast' ? match : `[data-role="${role}"]`);
  function $$(selector) {
    const query = selectorFor(selector);
    const portals = [...document.querySelectorAll(`[data-drag-owner="${instance.id}"]`)];
    return [...new Set([...roots, ...portals].flatMap(root => [...(root.matches(query) ? [root] : []), ...root.querySelectorAll(query)]))];
  }
  const $ = selector => selector === '#toast' ? document.querySelector('#toast') : $$(selector)[0];
  let opener;
  function showDialog(selector) {
    const dialog = $(selector);
    if (!dialog.open) { opener = document.activeElement; dialog.showModal(); }
  }
  for (const button of $$('.close-dialog')) scope.listen(button, 'click', () => button.closest('dialog').close());
  for (const dialog of dialogs) {
    scope.listen(dialog, 'close', () => {
      const toast = document.querySelector('#toast');
      if (dialog.contains(toast)) document.body.append(toast);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
    scope.listen(dialog, 'click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  }
  scope.cleanup(() => {
    for (const dialog of dialogs) {
      const toast = document.querySelector('#toast');
      if (dialog.contains(toast)) document.body.append(toast);
      dialog.close(); dialog.remove();
    }
    for (const node of document.querySelectorAll(`[data-drag-owner="${instance.id}"]`)) node.remove();
  });
  return { $, $$, showDialog };
}
