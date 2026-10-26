import { createWidgetView } from '../ui/widget-view.js';

const fallbackZones = [
  'Africa/Cairo', 'Africa/Johannesburg', 'America/Chicago', 'America/Los_Angeles',
  'America/New_York', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Asia/Kolkata', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Pacific/Auckland',
];

export const WORLD_CLOCK_ZONES = (() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return [...new Set(['UTC', ...zones])].sort((a, b) => a.localeCompare(b));
  } catch {
    return ['UTC', ...fallbackZones].sort((a, b) => a.localeCompare(b));
  }
})();

export function worldClockZoneLabel(zone) {
  if (zone === 'UTC') return 'UTC';
  const parts = zone.split('/').map(part => part.replaceAll('_', ' '));
  const city = parts.pop();
  return parts.length ? `${city} · ${parts.join(' / ')}` : city;
}

function getSelectedZones(value) {
  const zones = String(value || '').split(',').map(zone => zone.trim()).filter(zone => WORLD_CLOCK_ZONES.includes(zone));
  const selected = [...new Set(zones)].slice(0, 3);
  return selected.length ? selected : ['America/New_York', 'Europe/London', 'Asia/Tokyo'].filter(zone => WORLD_CLOCK_ZONES.includes(zone));
}

export function mountWorldClock(context) {
  const { $ } = createWidgetView(context, 'world-clock');
  const list = $('#world-clock-cities');
  const update = () => {
    const now = new Date();
    const zones = getSelectedZones(context.instance.settings.cities);
    $('#world-clock-title').textContent = context.instance.settings.title.toUpperCase();
    list.replaceChildren(...zones.map(zone => {
      const row = document.createElement('div'); row.className = 'world-clock-row';
      const place = document.createElement('div'); place.className = 'world-clock-place';
      const city = document.createElement('span'); city.className = 'world-clock-city'; city.textContent = worldClockZoneLabel(zone); city.title = zone;
      const date = document.createElement('span'); date.className = 'world-clock-date';
      const localDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: zone }).format(now);
      const zoneName = new Intl.DateTimeFormat(undefined, { timeZone: zone, timeZoneName: 'short' }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value;
      date.textContent = zoneName ? `${localDate} · ${zoneName}` : localDate;
      const time = document.createElement('time'); time.className = 'world-clock-time';
      time.dateTime = now.toISOString();
      time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: !context.instance.settings.hour24, timeZone: zone }).format(now);
      place.append(city, date); row.append(place, time); return row;
    }));
  };
  context.scope.interval(update, 1000);
  context.scope.listen(document, 'visibilitychange', () => { if (!document.hidden) update(); });
  update();
  return { update };
}
