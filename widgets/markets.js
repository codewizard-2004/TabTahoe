import { safeUrl } from '../core.js';

export const MARKET_COINS = [
  { id: 'btc-bitcoin', name: 'Bitcoin', symbol: 'BTC', mark: '₿' },
  { id: 'eth-ethereum', name: 'Ethereum', symbol: 'ETH', mark: 'Ξ' },
  { id: 'usdt-tether', name: 'Tether', symbol: 'USDT', mark: '₮' },
  { id: 'sol-solana', name: 'Solana', symbol: 'SOL', mark: 'S' },
  { id: 'bnb-binance-coin', name: 'BNB', symbol: 'BNB', mark: 'B' },
  { id: 'xrp-xrp', name: 'XRP', symbol: 'XRP', mark: 'X' },
  { id: 'doge-dogecoin', name: 'Dogecoin', symbol: 'DOGE', mark: 'Ð' },
  { id: 'usdc-usd-coin', name: 'USDC', symbol: 'USDC', mark: '$' },
  { id: 'ada-cardano', name: 'Cardano', symbol: 'ADA', mark: 'A' },
  { id: 'trx-tron', name: 'TRON', symbol: 'TRX', mark: 'T' },
  { id: 'avax-avalanche', name: 'Avalanche', symbol: 'AVAX', mark: 'A' },
  { id: 'link-chainlink', name: 'Chainlink', symbol: 'LINK', mark: 'L' },
  { id: 'pi2-pi-network', name: 'Pi Network', symbol: 'PI', mark: 'π' },
];

export const MARKET_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];
const coinById = new Map(MARKET_COINS.map(coin => [coin.id, coin]));
const getCoins = settings => String(settings.coins || 'btc-bitcoin,eth-ethereum,sol-solana').split(',').map(id => coinById.get(id.trim())).filter(Boolean);
const boundedJson = async response => {
  if (!response.ok) throw new Error(`CoinPaprika returned ${response.status}.`);
  const text = await response.text();
  if (text.length > 100_000) throw new Error('Market response exceeded the size limit.');
  const value = JSON.parse(text);
  if (value?.error) throw new Error(String(value.error).slice(0, 160));
  return value;
};
const readCache = async (services, key, maxAge, load) => {
  const request = async () => {
    const cached = await services.getWidgetContent(key);
    if (cached && Number.isFinite(cached.fetchedAt) && Date.now() - cached.fetchedAt < maxAge) return cached;
    const value = await load();
    const result = { ...value, fetchedAt: Date.now() };
    await services.saveWidgetContent(key, result);
    return result;
  };
  return navigator.locks ? navigator.locks.request(`tabtahoe:${key}`, request) : request();
};

function formatPrice(value, currency) {
  if (!Number.isFinite(value)) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumSignificantDigits: 8 }).format(value); }
  catch { return `${currency} ${value.toLocaleString(undefined, { maximumSignificantDigits: 8 })}`; }
}

function ageLabel(timestamp) {
  if (!timestamp) return 'Saved quote';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `Updated ${hours}h ago` : `Updated ${Math.floor(hours / 24)}d ago`;
}

function makeRow(item) {
  const row = document.createElement('div'); row.className = 'market-row';
  const icon = document.createElement('span'); icon.className = 'market-logo'; icon.setAttribute('aria-hidden', 'true');
  const safeLogo = safeUrl(`https://static.coinpaprika.com/coin/${encodeURIComponent(item.id)}/logo.png`);
  if (safeLogo && new URL(safeLogo).protocol === 'https:') {
    const image = document.createElement('img'); image.src = safeLogo; image.alt = ''; image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => { icon.textContent = item.mark; }, { once: true }); icon.append(image);
  } else icon.textContent = item.mark;
  const identity = document.createElement('span'); identity.className = 'market-identity';
  const name = document.createElement('span'); name.className = 'market-name'; name.textContent = item.name;
  const symbol = document.createElement('span'); symbol.className = 'market-symbol'; symbol.textContent = `${item.symbol} · Crypto`;
  identity.append(name, symbol);
  const quote = document.createElement('span'); quote.className = 'market-quote';
  const price = document.createElement('span'); price.className = 'market-price'; price.textContent = formatPrice(item.price, item.currency);
  const change = document.createElement('span'); change.className = `market-change ${item.change >= 0 ? 'is-positive' : 'is-negative'}`;
  change.textContent = Number.isFinite(item.change) ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}% · 24h` : 'Change unavailable';
  quote.append(price, change); row.append(icon, identity, quote); return row;
}

export function mountMarkets(context, services) {
  const { scope, element } = context;
  element.classList.add('markets-widget');
  const heading = document.createElement('h2'); heading.className = 'offline-widget-title';
  const list = document.createElement('div'); list.className = 'markets-list'; list.setAttribute('aria-label', 'Cryptocurrency prices');
  const footer = document.createElement('div'); footer.className = 'markets-footer'; footer.setAttribute('role', 'status');
  const attribution = document.createElement('span'); attribution.className = 'markets-attribution'; attribution.textContent = 'Powered by CoinPaprika';
  const freshness = document.createElement('span'); footer.append(attribution, freshness); element.append(heading, list, footer);

  const quoteCache = new Map();
  let refreshTimer, sequence = 0;
  const refreshMs = () => Math.max(60, Number(context.instance.settings.refreshMinutes) || 60) * 60000;
  const cacheKey = (id, currency) => `market-quote:${id}:${currency}`;
  const draw = () => {
    const selected = getCoins(context.instance.settings);
    list.replaceChildren(...selected.flatMap(coin => {
      const item = quoteCache.get(coin.id);
      return item ? [makeRow(item)] : [];
    }));
  };

  const refresh = async () => {
    const current = ++sequence, settings = context.instance.settings;
    const selected = getCoins(settings), currency = MARKET_CURRENCIES.includes(settings.currency) ? settings.currency : 'USD';
    if (!selected.length) { freshness.textContent = 'Choose cryptocurrencies in widget settings.'; return; }
    if (globalThis.chrome?.permissions && !await chrome.permissions.contains({ origins: ['https://api.coinpaprika.com/*'] })) {
      freshness.textContent = 'Allow CoinPaprika access in widget settings to load prices.'; draw(); return;
    }
    const errors = [];
    await Promise.all(selected.map(async coin => {
      const key = cacheKey(coin.id, currency);
      try {
        const cached = await readCache(services, key, refreshMs(), async () => {
          const query = new URLSearchParams({ quotes: currency });
          const response = await fetch(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(coin.id)}?${query}`, { signal: scope.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
          const raw = await boundedJson(response), quote = raw?.quotes?.[currency];
          const price = Number(quote?.price), change = Number(quote?.percent_change_24h);
          if (!Number.isFinite(price) || typeof raw?.last_updated !== 'string') throw new Error(`No current quote for ${coin.symbol}.`);
          return { id: coin.id, name: coin.name, symbol: coin.symbol, mark: coin.mark, price, change, currency, sourceUpdatedAt: Date.parse(raw.last_updated) || 0 };
        });
        if (!scope.signal.aborted && current === sequence) { quoteCache.set(coin.id, { ...cached, fetchedAt: cached.fetchedAt }); draw(); }
      } catch (error) {
        if (!scope.signal.aborted) {
          errors.push(`${coin.symbol}: ${error.message || 'request failed'}`);
          const saved = await services.getWidgetContent(key).catch(() => null);
          if (saved?.price !== undefined && current === sequence) { quoteCache.set(coin.id, saved); draw(); }
        }
      }
    }));
    if (scope.signal.aborted || current !== sequence) return;
    const latest = Math.max(0, ...[...quoteCache.values()].map(item => item.sourceUpdatedAt || 0));
    const savedAt = Math.max(0, ...[...quoteCache.values()].map(item => item.fetchedAt || 0));
    const age = ageLabel(latest || savedAt);
    freshness.textContent = errors.length
      ? quoteCache.size ? `${errors.length} unavailable · showing saved quotes · ${age}` : `Could not load prices · ${errors[0]}`
      : age;
  };
  const schedule = () => { clearInterval(refreshTimer); refreshTimer = setInterval(() => refresh().catch(() => {}), refreshMs()); };
  scope.cleanup(() => clearInterval(refreshTimer));
  scope.listen(document, 'visibilitychange', () => { if (!document.hidden) refresh().catch(() => {}); });
  draw(); refresh().catch(error => { freshness.textContent = error?.message || 'Crypto prices are unavailable.'; }); schedule();
  return { update() { heading.textContent = context.instance.settings.title; for (const id of [...quoteCache.keys()]) if (!getCoins(context.instance.settings).some(coin => coin.id === id)) quoteCache.delete(id); draw(); refresh().catch(() => {}); schedule(); } };
}
