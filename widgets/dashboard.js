import { createWidgetRegistry } from './registry.js';
import { createWidgetView } from '../ui/widget-view.js';
import { searchDestination } from '../core.js';
import { mountCalendar } from './calendar.js';
import { mountFavourites } from './favourites.js';
import { mountBookmarks } from './bookmarks.js';
import { mountWeather } from './weather.js';
import { mountSound } from './sound.js';
import { registerOfflineWidgets } from './offline.js';
import { mountNews } from './news.js';
import { mountMarkets } from './markets.js';
import { mountWorldClock } from './world-clock.js';

function mountClock(context) {
  const { $ } = createWidgetView(context, 'clock');
  const update = () => {
    const now = new Date();
    $('#clock').textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: !context.instance.settings.hour24 }).format(now);
    $('#date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('#timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop().replaceAll('_', ' ');
    $('.card-label > span').textContent = context.instance.settings.title.toUpperCase();
  };
  context.scope.interval(update, 10000);
  context.scope.listen(document, 'visibilitychange', () => { if (!document.hidden) update(); });
  update(); return { update };
}

function mountGreeting(context) {
  const { $ } = createWidgetView(context, 'greeting');
  const update = () => {
    const hour = new Date().getHours(), { name, title } = context.instance.settings;
    $('#greeting').textContent = name ? `GOOD ${hour < 12 ? 'MORNING' : hour < 17 ? 'AFTERNOON' : 'EVENING'}, ${name.toUpperCase()}` : 'MAKE YOURSELF AT HOME';
    $('h1').textContent = title;
  };
  context.scope.interval(update, 60000); update(); return { update };
}

function mountTopbar(context) {
  const { $ } = createWidgetView(context, 'topbar');
  const update = () => {
    const { title, tagline, showDate } = context.instance.settings;
    $('[data-role="brand-title"]').textContent = title;
    $('[data-role="tagline"]').textContent = tagline;
    $('[data-role="date"]').textContent = showDate ? new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    $('[data-role="date"]').hidden = !showDate;
  };
  context.scope.interval(update, 60000); update(); return { update };
}

function mountSearch(context) {
  const { $ } = createWidgetView(context, 'search');
  context.scope.listen($('#search-form'), 'submit', event => {
    event.preventDefault();
    const destination = searchDestination($('#search').value, context.instance.settings.engine);
    if (destination) location.assign(destination);
  });
  return {};
}

export function registerDashboardWidgets(services) {
  const registry = createWidgetRegistry();
  const title = value => ({ type: 'string', default: value, maxLength: 60 });
  const specs = [
    ['topbar', 'Top bar', { w: 12, h: 1 }, { w: 4, h: 1 }, { title: title('TabTahoe'), tagline: { type: 'string', default: 'A little space to breathe.', maxLength: 80 }, showDate: { type: 'boolean', default: true } }, mountTopbar],
    ['search', 'Search', { w: 6, h: 1 }, { w: 3, h: 1 }, { title: title('Search'), engine: { type: 'string', default: 'google', choices: ['google', 'brave', 'duckduckgo'] } }, mountSearch],
    ['greeting', 'Greeting', { w: 12, h: 1 }, { w: 3, h: 1 }, { title: title('Your day, at your pace.'), name: { type: 'string', default: '', maxLength: 40 } }, mountGreeting],
    ['clock', 'Clock', { w: 3, h: 3 }, { w: 2, h: 3 }, { title: title('Local time'), hour24: { type: 'boolean', default: false } }, mountClock],
    ['world-clock', 'Global Clock', { w: 4, h: 4 }, { w: 3, h: 3 }, { title: title('Global Clock'), cities: { type: 'string', default: 'America/New_York,Europe/London,Asia/Tokyo', maxLength: 160 }, hour24: { type: 'boolean', default: false } }, mountWorldClock],
    ['weather', 'Weather', { w: 3, h: 3 }, { w: 2, h: 3 }, { title: title('Weather'), city: { type: 'string', default: '', maxLength: 100 }, latitude: { type: 'number', default: 0, min: -90, max: 90 }, longitude: { type: 'number', default: 0, min: -180, max: 180 }, unit: { type: 'string', default: 'celsius', choices: ['celsius', 'fahrenheit'] } }, mountWeather],
    ['music', 'Sound control', { w: 3, h: 4 }, { w: 3, h: 4 }, { title: title('Sound control') }, mountSound],
    ['calendar', 'Calendar', { w: 3, h: 4 }, { w: 3, h: 4 }, { title: title('Calendar') }, mountCalendar],
    ['bookmarks', 'Bookmarks', { w: 6, h: 2 }, { w: 3, h: 2 }, { title: title('Pinned bookmarks') }, mountBookmarks],
    ['news', 'News headlines', { w: 5, h: 5 }, { w: 3, h: 3 }, { title: title('Latest headlines'), sources: { type: 'string', default: 'bbc-world,guardian-world', maxLength: 500 }, refreshMinutes: { type: 'number', default: 30, min: 15, max: 360, uiChoices: [15, 30, 60, 360] } }, context => mountNews(context, services)],
    ['markets', 'Crypto prices', { w: 5, h: 5 }, { w: 3, h: 3 }, { title: title('Crypto watchlist'), coins: { type: 'string', default: 'btc-bitcoin,eth-ethereum,sol-solana', maxLength: 240 }, currency: { type: 'string', default: 'USD', choices: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'] }, refreshMinutes: { type: 'number', default: 60, min: 60, max: 1440, uiChoices: [60, 360, 1440] } }, context => mountMarkets(context, services)],
    ['favourites', 'Favourites', { w: 6, h: 6 }, { w: 3, h: 4 }, { title: title('Favourites'), collectionId: { type: 'string', default: 'migrated-favourites', maxLength: 128 }, shortcutStyle: { type: 'string', default: 'coloured', choices: ['coloured', 'glass', 'clear-glass', 'icons-only'] } }, mountFavourites],
  ];
  for (const [type, label, defaultSize, minimumSize, settings, mount] of specs) {
    registry.register({
      type, version: 1, title: label, defaultSize, minimumSize, settings,
      description: type === 'favourites' ? 'An independent shortcut collection with nested groups.' : type === 'calendar' ? 'Your calendar and shared daily tasks.' : type === 'music' ? 'Control sound from open websites.' : type === 'world-clock' ? 'Compare live local times across up to three cities and time zones.' : `${label} for your space.`,
      capabilities: { settings: true, duplicate: true, remove: true },
      mount(context) { context.state.controller = mount(context, services); },
      update(context) { context.state.controller?.update?.(); },
      resize(context, size) { context.state.controller?.resize?.(size); },
    });
  }
  registerOfflineWidgets(registry, services);
  return registry;
}
