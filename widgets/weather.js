import { WALLPAPERS, UNSPLASH_WALLPAPERS, DEFAULT_SETTINGS, safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, weatherDescription, formatDuration, findApp, listGroups, moveApp, getShortcutStyle, calendarDateKey, TASK_TITLE_LIMIT } from '../core.js';
import { createWidgetView } from '../ui/widget-view.js';


export function mountWeather(context, services) {
  const { scope } = context;
  const { $, showDialog } = createWidgetView(context, 'weather', ['location-dialog']);
  let settings, weatherRequest;
  function update() {
    const values = context.instance.settings;
    settings = { unit: values.unit, location: values.city ? { name: values.city, latitude: values.latitude, longitude: values.longitude } : null };
    $('#weather-location').textContent = values.city ? `${values.city} ↗` : 'Set city ↗';
    loadWeather();
  }
  async function fetchJson(url, signal) {
    const response = await fetch(url, { signal: signal || AbortSignal.any([scope.signal, AbortSignal.timeout(12000)]) });
    if (!response.ok) throw new Error('Weather request failed');
    return response.json();
  }
$('#weather-location').addEventListener('click', () => showDialog('#location-dialog'));
$('#location-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  $('#location-status').textContent = 'Looking for your corner of the world…'; $('#city-results').replaceChildren();
  try {
    const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent($('#city-search').value.trim())}&count=6&language=en&format=json`);
    $('#location-status').textContent = data.results?.length ? 'Choose your city:' : 'No cities found. Try a nearby city or another spelling.';
    if (scope.signal.aborted) return;
    $('#city-results').replaceChildren(...(data.results || []).map(city => {
      const button = document.createElement('button'); button.className = 'city-result';
      button.textContent = [city.name, city.admin1, city.country].filter(Boolean).join(', ');
      button.addEventListener('click', () => {
        settings.location = { name: city.name, latitude: city.latitude, longitude: city.longitude };
        services.updateWidget(context.instance.id, { city: city.name, latitude: city.latitude, longitude: city.longitude }); $('#location-dialog').close();
      }); return button;
    }));
  } catch { if (scope.signal.aborted) return; $('#location-status').textContent = 'City search is unavailable. Check your connection and try again.'; }
  finally { button.disabled = false; }
});
async function loadWeather() {
  if (scope.signal.aborted || !settings.location) return;
  weatherRequest?.abort(); weatherRequest = new AbortController();
  const request = weatherRequest;
  $('#weather-summary').textContent = 'Updating…';
  const { latitude, longitude } = settings.location;
  try {
    const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=${settings.unit}&timezone=auto&forecast_days=1`, AbortSignal.any([request.signal, AbortSignal.timeout(12000)]));
    if (scope.signal.aborted || request !== weatherRequest) return;
    if (!data.current || !data.daily) throw new Error('Incomplete forecast');
    $('#temperature').textContent = `${Math.round(data.current.temperature_2m)}°`;
    const [summary, symbol] = weatherDescription(data.current.weather_code);
    $('#weather-summary').textContent = summary; $('#weather-symbol').textContent = symbol;
    $('#weather-range').textContent = `H: ${Math.round(data.daily.temperature_2m_max[0])}°  L: ${Math.round(data.daily.temperature_2m_min[0])}°`;
    $('#humidity').textContent = `${data.current.relative_humidity_2m}% humidity`;
  } catch {
    if (scope.signal.aborted || request !== weatherRequest) return;
    $('#temperature').textContent = '—°'; $('#weather-summary').textContent = 'Forecast unavailable';
    $('#weather-range').textContent = 'Will retry automatically'; $('#humidity').textContent = '';
  }
}


  scope.cleanup(() => weatherRequest?.abort());
  scope.interval(loadWeather, 15 * 60 * 1000);
  update();
  return { update };
}
