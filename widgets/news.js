import { safeUrl } from '../core.js';

export const NEWS_SOURCES = [
  { id: 'bbc-world', label: 'BBC News · World', agency: 'BBC News', mark: 'BBC', feed: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'bbc-technology', label: 'BBC News · Technology', agency: 'BBC News', mark: 'BBC', feed: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'bbc-business', label: 'BBC News · Business', agency: 'BBC News', mark: 'BBC', feed: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'guardian-world', label: 'The Guardian · World', agency: 'The Guardian', mark: 'G', feed: 'https://www.theguardian.com/world/rss' },
  { id: 'guardian-technology', label: 'The Guardian · Technology', agency: 'The Guardian', mark: 'G', feed: 'https://www.theguardian.com/technology/rss' },
  { id: 'guardian-business', label: 'The Guardian · Business', agency: 'The Guardian', mark: 'G', feed: 'https://www.theguardian.com/business/rss' },
  { id: 'cnn-latest', label: 'CNN · Latest', agency: 'CNN', mark: 'CNN', feed: 'https://rss.cnn.com/rss/cnn_latest.rss' },
  { id: 'cnn-world', label: 'CNN · World', agency: 'CNN', mark: 'CNN', feed: 'https://rss.cnn.com/rss/cnn_world.rss' },
  { id: 'fox-latest', label: 'Fox News · Latest', agency: 'Fox News', mark: 'FOX', feed: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
  { id: 'fox-world', label: 'Fox News · World', agency: 'Fox News', mark: 'FOX', feed: 'https://moxie.foxnews.com/google-publisher/world.xml' },
  { id: 'fox-us', label: 'Fox News · U.S.', agency: 'Fox News', mark: 'FOX', feed: 'https://moxie.foxnews.com/google-publisher/us.xml' },
  { id: 'fox-politics', label: 'Fox News · Politics', agency: 'Fox News', mark: 'FOX', feed: 'https://moxie.foxnews.com/google-publisher/politics.xml' },
  { id: 'fox-technology', label: 'Fox News · Technology', agency: 'Fox News', mark: 'FOX', feed: 'https://moxie.foxnews.com/google-publisher/tech.xml' },
  { id: 'nypost-latest', label: 'New York Post · Latest', agency: 'New York Post', mark: 'NY', feed: 'https://nypost.com/feed/' },
  { id: 'hindu-latest', label: 'The Hindu · Latest', agency: 'The Hindu', mark: 'H', feed: 'https://www.thehindu.com/feeder/default.rss' },
  { id: 'hindu-india', label: 'The Hindu · India', agency: 'The Hindu', mark: 'H', feed: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { id: 'hindu-world', label: 'The Hindu · World', agency: 'The Hindu', mark: 'H', feed: 'https://www.thehindu.com/news/international/feeder/default.rss' },
];

const MAX_FEED_BYTES = 1024 * 1024;
const MAX_ITEMS_PER_FEED = 20;
const sourceById = new Map(NEWS_SOURCES.map(source => [source.id, source]));
const getSelectedSources = settings => String(settings.sources || 'bbc-world,guardian-world')
  .split(',').map(id => sourceById.get(id.trim())).filter(Boolean);

function childText(element, names) {
  const child = [...element.children].find(item => names.includes(item.localName.toLowerCase()));
  return child?.textContent?.trim() || '';
}

function articleLink(element) {
  const link = [...element.children].find(item => item.localName.toLowerCase() === 'link');
  return link?.getAttribute('href') || link?.textContent?.trim() || '';
}

function parseFeed(xmlText) {
  if (xmlText.length > MAX_FEED_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xmlText)) throw new Error('Feed is too large or contains unsupported XML declarations.');
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Feed XML could not be parsed.');
  const channel = xml.documentElement.localName.toLowerCase() === 'rss'
    ? [...xml.documentElement.children].find(item => item.localName.toLowerCase() === 'channel')
    : xml.documentElement;
  const image = channel && [...channel.children].find(item => item.localName.toLowerCase() === 'image');
  const rawLogo = (channel && childText(channel, ['logo'])) || (image && childText(image, ['url'])) || '';
  const candidateLogo = safeUrl(rawLogo);
  const logoHost = candidateLogo ? new URL(candidateLogo).hostname : '';
  const logo = candidateLogo && new URL(candidateLogo).protocol === 'https:' && (logoHost === 'bbci.co.uk' || logoHost.endsWith('.bbci.co.uk') || logoHost === 'theguardian.com' || logoHost.endsWith('.theguardian.com') || logoHost.endsWith('.guim.co.uk') || logoHost === 'cnn.com' || logoHost.endsWith('.cnn.com') || logoHost === 'foxnews.com' || logoHost.endsWith('.foxnews.com') || logoHost === 'nypost.com' || logoHost.endsWith('.nypost.com') || logoHost === 'thehindu.com' || logoHost.endsWith('.thehindu.com')) ? candidateLogo : '';
  const entries = [...xml.querySelectorAll('item, entry')];
  const items = entries.slice(0, MAX_ITEMS_PER_FEED).flatMap(entry => {
    const title = childText(entry, ['title']);
    const rawLink = articleLink(entry);
    const href = safeUrl(rawLink);
    if (!title || !href || new URL(href).protocol !== 'https:') return [];
    const rawDate = childText(entry, ['pubdate', 'published', 'updated', 'date']);
    const parsedDate = rawDate ? Date.parse(rawDate) : 0;
    return [{ title: title.slice(0, 500), href, publishedAt: Number.isFinite(parsedDate) ? parsedDate : 0 }];
  });
  return { items, logo };
}

function relativeTime(timestamp) {
  if (!timestamp) return 'Recent';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function mountNews(context, services) {
  const { scope, element, instance } = context;
  element.classList.add('news-widget');
  const heading = document.createElement('h2');
  heading.className = 'offline-widget-title';
  heading.textContent = instance.settings.title;
  const status = document.createElement('p');
  status.className = 'news-status';
  status.setAttribute('role', 'status');
  const list = document.createElement('div');
  list.className = 'news-list';
  list.setAttribute('aria-label', 'Latest news headlines');
  element.append(heading, list, status);

  const feedCache = new Map();
  let requestSequence = 0, refreshTimer;
  const cacheKey = source => `news-feed:${source.id}`;

  const render = () => {
    const selected = getSelectedSources(context.instance.settings);
    const seen = new Set(), stories = [];
    for (const source of selected) {
      const cached = feedCache.get(source.id);
      for (const story of cached?.items || []) {
        if (seen.has(story.href)) continue;
        seen.add(story.href);
        stories.push({ ...story, source });
      }
    }
    stories.sort((a, b) => b.publishedAt - a.publishedAt);
    list.replaceChildren(...stories.slice(0, 30).map(story => {
      const row = document.createElement('a');
      row.className = 'news-row';
      row.href = story.href;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      const icon = document.createElement('span');
      icon.className = 'news-source-icon';
      icon.setAttribute('aria-hidden', 'true');
      const logo = feedCache.get(story.source.id)?.logo;
      if (logo) {
        const image = document.createElement('img'); image.src = logo; image.alt = ''; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => { icon.textContent = story.source.mark; }, { once: true });
        icon.append(image);
      } else icon.textContent = story.source.mark;
      const copy = document.createElement('span');
      copy.className = 'news-copy';
      const source = document.createElement('span');
      source.className = 'news-agency';
      source.textContent = story.source.agency;
      const title = document.createElement('span');
      title.className = 'news-headline';
      title.textContent = story.title;
      const time = document.createElement('time');
      time.className = 'news-time';
      if (story.publishedAt) time.dateTime = new Date(story.publishedAt).toISOString();
      time.textContent = relativeTime(story.publishedAt);
      copy.append(source, title, time);
      row.append(icon, copy);
      row.setAttribute('aria-label', `${story.source.agency}: ${story.title}, ${time.textContent}`);
      return row;
    }));
    if (!selected.length) status.textContent = 'Choose at least one news source in widget settings.';
    else if (!stories.length && !status.dataset.loading) status.textContent = 'No headlines yet. Check feed access in widget settings.';
  };

  const fetchFeed = async (source, maxAge) => {
    const load = async () => {
      const cached = await services.getWidgetContent(cacheKey(source));
      if (Array.isArray(cached?.items) && Number.isFinite(cached.fetchedAt) && Date.now() - cached.fetchedAt < maxAge) return cached;
      const response = await fetch(source.feed, { cache: 'no-store', signal: scope.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error(`Feed returned ${response.status}.`);
      const text = await response.text();
      const { items, logo } = parseFeed(text);
      if (!items.length) throw new Error('Feed did not contain usable headlines.');
      const result = { items, logo, fetchedAt: Date.now() };
      await services.saveWidgetContent(cacheKey(source), result);
      return result;
    };
    if (navigator.locks) return navigator.locks.request(`tabtahoe:news-feed:${source.id}`, load);
    return load();
  };

  const refresh = async () => {
    const sequence = ++requestSequence;
    const selected = getSelectedSources(context.instance.settings);
    if (!selected.length) { render(); return; }
    const failedSources = new Set();
    status.dataset.loading = 'true';
    status.textContent = 'Refreshing headlines…';
    await Promise.all(selected.map(async source => {
      try {
        const cached = await services.getWidgetContent(cacheKey(source));
        if (Array.isArray(cached?.items)) { feedCache.set(source.id, cached); render(); }
        const fresh = await fetchFeed(source, Number(context.instance.settings.refreshMinutes) * 60000);
        if (!scope.signal.aborted) { feedCache.set(source.id, fresh); render(); }
      } catch {
        if (!scope.signal.aborted) {
          failedSources.add(source.id);
          const cached = await services.getWidgetContent(cacheKey(source)).catch(() => null);
          if (Array.isArray(cached?.items)) feedCache.set(source.id, cached);
        }
      }
    }));
    if (scope.signal.aborted || sequence !== requestSequence) return;
    delete status.dataset.loading;
    const failed = selected.some(source => failedSources.has(source.id) || !feedCache.has(source.id));
    if (feedCache.size) {
      const latest = Math.max(...selected.map(source => feedCache.get(source.id)?.fetchedAt || 0));
      status.textContent = failed ? `Some feeds unavailable · showing saved headlines · updated ${relativeTime(latest)}` : `Updated ${relativeTime(latest)}`;
    } else status.textContent = 'News feeds are unavailable. Check your connection and source access.';
    render();
  };

  const schedule = () => {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(refresh, Number(context.instance.settings.refreshMinutes) * 60000);
  };
  const unsubscribe = services.subscribeWidgetContent((key, value) => {
    const source = NEWS_SOURCES.find(item => key === cacheKey(item));
    if (!source || !Array.isArray(value?.items)) return;
    feedCache.set(source.id, value);
    render();
  });
  scope.cleanup(unsubscribe);
  scope.cleanup(() => clearInterval(refreshTimer));
  scope.listen(document, 'visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh().catch(() => { status.textContent = 'News feeds are unavailable.'; });
  schedule();
  return {
    update() {
      heading.textContent = context.instance.settings.title;
      for (const source of [...feedCache.keys()]) if (!getSelectedSources(context.instance.settings).some(item => item.id === source)) feedCache.delete(source);
      render();
      refresh().catch(() => { status.textContent = 'News feeds are unavailable.'; });
      schedule();
    },
  };
}
