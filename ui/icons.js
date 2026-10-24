import { safeUrl } from '../core.js';

export function createIconRenderer(scope) {
  let nativePlaceholder;
  const faviconCache = new Map();
function faviconFingerprint(img) {
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  canvas.getContext('2d').drawImage(img, 0, 0, 64, 64);
  return canvas.toDataURL();
}

function defaultFaviconFingerprint() {
  if (!nativePlaceholder) nativePlaceholder = new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 3000);
    scope.cleanup(() => { clearTimeout(timer); img.onload = null; img.onerror = null; img.removeAttribute('src'); resolve(null); });
    img.onload = () => { clearTimeout(timer); try { resolve(faviconFingerprint(img)); } catch { resolve(null); } };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', 'about:blank'); url.searchParams.set('size', '64'); img.src = url.href;
  });
  return nativePlaceholder;
}

function websiteIcon(item) {
  const holder = document.createElement('span'); holder.className = 'website-icon';
  const url = safeUrl(item.url), domain = url ? new URL(url).hostname.replace(/^www\./, '') : '';
  holder.textContent = domain.slice(0, 1).toUpperCase() || '?';
  if (!url) return holder;
  const candidates = [];
  if (faviconCache.has(url)) candidates.push(faviconCache.get(url));
  // The browser knows icons declared at nonstandard paths, including SVGs.
  if (globalThis.chrome?.runtime?.id) {
    const cached = new URL(chrome.runtime.getURL('/_favicon/'));
    cached.searchParams.set('pageUrl', url); cached.searchParams.set('size', '64'); candidates.push(cached.href);
  }
  const origin = new URL(url).origin;
  candidates.push(`${origin}/favicon.ico`, `${origin}/favicon.svg`, `${origin}/apple-touch-icon.png`);
  if (domain !== new URL(url).hostname || domain.split('.').length === 2) {
    candidates.push(`https://${domain}/favicon.ico`, `https://www.${domain}/favicon.ico`);
  }
  const sources = [...new Set(candidates)];
  const img = document.createElement('img'); img.alt = ''; img.draggable = false; img.referrerPolicy = 'no-referrer';
  let index = 0;
  img.onload = async () => {
    if (scope.signal.aborted) return;
    if (img.src.startsWith('chrome-extension:')) {
      const placeholder = await defaultFaviconFingerprint();
      try { if (placeholder && faviconFingerprint(img) === placeholder) { img.onerror(); return; } } catch {}
    }
    faviconCache.set(url, img.src); holder.replaceChildren(img);
  };
  img.onerror = () => { if (index < sources.length) img.src = sources[index++]; };
  scope.cleanup(() => { img.onload = null; img.onerror = null; img.removeAttribute('src'); });
  img.onerror();
  return holder;
}


  return websiteIcon;
}
