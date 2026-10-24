import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUrl, searchDestination, flattenBookmarks, calendarDays, nextWallpaper, formatDuration, DEFAULT_SETTINGS } from '../core.js';

test('URLs reject executable schemes and preserve valid web links', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', 'chrome://settings', 'https://', 'not a website']) assert.equal(safeUrl(value), null);
  assert.equal(safeUrl('example.com/docs'), 'https://example.com/docs');
  assert.equal(safeUrl('http://example.com'), 'http://example.com/');
});

test('search distinguishes URLs from searches and escapes queries', () => {
  assert.equal(searchDestination('  ', 'google'), null);
  assert.equal(searchDestination('github.com/openai', 'brave'), 'https://github.com/openai');
  assert.equal(searchDestination('hello & world', 'brave'), 'https://search.brave.com/search?q=hello%20%26%20world');
  assert.equal(searchDestination('javascript:alert(1)', 'google'), 'https://www.google.com/search?q=javascript%3Aalert(1)');
});

test('bookmarks preserve nested folder context, IDs, and untitled entries', () => {
  const tree = [{ title: '', children: [{ title: 'Work', children: [{ id: '1', title: '', url: 'https://example.com' }, { title: 'Docs', children: [{ id: '2', title: 'API', url: 'https://example.org' }] }] }] }];
  const result = flattenBookmarks(tree);
  assert.equal(result.length, 2); assert.equal(result[0].title, 'https://example.com');
  assert.equal(result[1].folder, 'Work / Docs'); assert.equal(result[1].id, '2');
});

test('calendar handles leap years, Monday starts, and year boundaries', () => {
  const february = calendarDays(2024, 1);
  assert.equal(february.length, 42); assert.equal(february[0].date.getDay(), 1);
  assert.equal(february.filter(day => day.current).length, 29);
  const january = calendarDays(2026, 0);
  assert.equal(january[0].date.getFullYear(), 2025);
  assert.equal(january.filter(day => day.current).length, 31);
});

test('wallpaper rotation respects fixed, new-tab, elapsed, and first-run settings', () => {
  const settings = { ...DEFAULT_SETTINGS, wallpaperAt: 1000, wallpaper: 2, rotation: '5' };
  assert.equal(nextWallpaper(settings, 300999), 2);
  assert.equal(nextWallpaper(settings, 301000), 0);
  assert.equal(nextWallpaper({ ...settings, rotation: '0' }, 99999999, true), 2);
  assert.equal(nextWallpaper({ ...settings, rotation: 'tab' }, 1001, true), 0);
  assert.equal(nextWallpaper({ ...settings, rotation: 'tab' }, 1001, false), 2);
  assert.equal(nextWallpaper({ ...settings, wallpaperAt: 0 }, 99999999, true), 2);
});

test('audio durations handle unloaded media and longer tracks', () => {
  assert.equal(formatDuration(NaN), '0:00'); assert.equal(formatDuration(Infinity), '0:00');
  assert.equal(formatDuration(185.9), '3:05'); assert.equal(formatDuration(3601), '60:01');
});
