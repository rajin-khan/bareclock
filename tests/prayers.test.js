import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences, dateAt, timeAt, swapWorldCity } from '../time.js';
import { prayers, followingDate, prayerRequest, prayerDisplay, parsePrayerCalendar, createPrayerCache } from '../prayers.js';

const preferences = changes => normalizePreferences({ zone: 'Asia/Dhaka', cityName: 'Dhaka', cityRegion: 'Dhaka', cityCountry: 'Bangladesh', ...changes });
const request = (date = '2026-10-05', changes = {}) => prayerRequest(preferences(changes), 'Asia/Dhaka', date);
const payload = (date = '2026-10-05') => ({ code: 200, data: [request(date).yesterday, date, followingDate(date)].map(day => ({
  date: { gregorian: { date: day.split('-').reverse().join('-') } },
  timings: Object.fromEntries(prayers.map(([id], i) => [id, `${day}T${['04:36', '11:47', '16:03', '17:42', '18:57'][i]}:00+06:00`])),
  meta: { method: { name: 'Karachi' } },
})) });

test('prayers are optional and validated; a timezone is never treated as a location', () => {
  assert.equal(normalizePreferences(null).showPrayers, false);
  assert.equal(prayerRequest(normalizePreferences(null), 'Asia/Dhaka', '2026-10-05'), null);
  assert.equal(request('2026-10-05', { cityName: 'UTC', cityId: 'utc', zone: 'UTC' }), null);
  const p = preferences({ prayerMethod: 'bad', prayerSchool: 1, prayerOffsets: { Fajr: 6 } });
  assert.equal('prayerMethod' in p, false);
  assert.equal('prayerSchool' in p, false);
  assert.equal('prayerOffsets' in p, false);
});

test('one request uses exact city details and source defaults without any minute adjustments', () => {
  const url = new URL(request('2026-12-31', { prayerMethod: '1', prayerSchool: '1' }).url);
  assert.equal(url.pathname, '/v1/calendarByAddress/from/30-12-2026/to/01-01-2027');
  assert.equal(url.searchParams.get('address'), 'Dhaka, Dhaka, Bangladesh');
  assert.equal(url.searchParams.has('school'), false);
  assert.equal(url.searchParams.has('method'), false);
  assert.equal(url.searchParams.get('iso8601'), 'true');
  assert.equal(url.searchParams.get('timezonestring'), 'Asia/Dhaka');
  assert.equal(url.searchParams.has('tune'), false);
  assert.equal(url.searchParams.has('latitudeAdjustmentMethod'), false);
  assert.equal(new URL(request('2026-10-05', { cityCountry: 'United Kingdom' }).url).searchParams.has('school'), false);
  assert.equal(new URL(request('2026-10-05', { prayerSchool: '0' }).url).searchParams.has('school'), false);
  assert.equal(new URL(request().url).searchParams.has('method'), false);
  assert.equal(new URL(request().url).searchParams.has('school'), false);
  assert.equal(followingDate('2028-02-28'), '2028-02-29');
});

test('swapping back to a selected device city preserves the location needed for prayer times', () => {
  const london = { id: '2643743', name: 'London', country: 'United Kingdom', zone: 'Europe/London' };
  const p = preferences({ showPrayers: true, cities: [london] });
  const away = swapWorldCity(p, london, 'Asia/Dhaka');
  const back = swapWorldCity(away, away.cities[0], 'Asia/Dhaka');
  assert.equal(back.cityName, 'Dhaka');
  assert.equal(back.cityCountry, 'Bangladesh');
  assert.ok(prayerRequest(back, back.zone, '2026-10-05'));
  assert.equal(back.cities[0].name, 'London');
});

test('the highlight stays on the current prayer and changes exactly when the next begins', () => {
  const data = payload();
  data.data[2].timings.Fajr = '2026-10-06T04:37:00+06:00';
  const calendar = parsePrayerCalendar(data, request());
  assert.equal(prayerDisplay(calendar, '2026-10-05', new Date('2026-10-05T04:35:59+06:00')).nextIndex, 0);
  assert.equal(prayerDisplay(calendar, '2026-10-05', new Date('2026-10-05T04:35:59+06:00')).currentIndex, 4);
  for (const [index, time] of calendar.days[1].times.entries()) {
    const display = prayerDisplay(calendar, '2026-10-05', new Date(time));
    assert.equal(display.nextIndex, (index + 1) % 5);
    assert.equal(display.currentIndex, index);
    assert.equal(display.tomorrow, index === 4);
  }
  const afterIsha = prayerDisplay(calendar, '2026-10-05', new Date('2026-10-05T23:59:00+06:00'));
  assert.equal(afterIsha.times[0], '2026-10-06T04:37:00+06:00');
  assert.equal(afterIsha.times[1], calendar.days[1].times[1]);
  assert.equal(afterIsha.currentIndex, 4);
  assert.equal(timeAt(new Date(afterIsha.times[0]), 'Asia/Dhaka', true).hour, '04');
  const midnight = new Date('2026-10-05T18:00:00Z');
  assert.equal(dateAt(midnight, 'Asia/Dhaka', 'numeric'), '2026-10-06');
  assert.equal(prayerDisplay(calendar, '2026-10-06', midnight).nextIndex, 0);
  assert.equal(prayerDisplay(calendar, '2026-10-06', midnight).currentIndex, 4);
  assert.equal(prayerDisplay(calendar, '2026-10-06', midnight).times[4], calendar.days[1].times[4]);
});

test('ISO offsets handle DST and a late Isha on the next civil day', () => {
  const data = payload('2026-03-29');
  data.data.forEach(day => { for (const id of Object.keys(day.timings)) day.timings[id] = day.timings[id].replace('+06:00', '+01:00'); });
  data.data[1].timings = Object.fromEntries(prayers.map(([id], i) => [id, ['2026-03-29T04:30:00+01:00', '2026-03-29T13:05:00+01:00', '2026-03-29T16:40:00+01:00', '2026-03-29T19:25:00+01:00', '2026-03-30T00:10:00+01:00'][i]]));
  const calendar = parsePrayerCalendar(data, request('2026-03-29'));
  const display = prayerDisplay(calendar, '2026-03-29', new Date('2026-03-29T23:05:00Z'));
  assert.equal(display.nextIndex, 4);
  assert.equal(display.tomorrow, false);
  const afterMidnight = prayerDisplay(calendar, '2026-03-30', new Date('2026-03-29T23:05:00Z'));
  assert.equal(afterMidnight.nextIndex, 4);
  assert.equal(afterMidnight.lastNight, true);
  assert.equal(afterMidnight.currentIndex, 3);
  assert.equal(Date.parse(calendar.days[1].times[0]), Date.parse('2026-03-29T03:30:00Z'));
});

test('invalid, missing and polar-day results are rejected instead of displaying stale times', () => {
  for (const mutation of [
    data => { data.code = 500; },
    data => { data.data.pop(); },
    data => { data.data[0].timings.Fajr = 'Invalid date'; },
    data => { data.data[0].timings.Fajr = '04:36'; },
    data => { data.data[0].timings.Asr = data.data[0].timings.Dhuhr; },
  ]) {
    const data = payload(); mutation(data);
    assert.throws(() => parsePrayerCalendar(data, request()));
  }
});

test('requests deduplicate, survive reload/offline, and refresh only for a new date or city', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  let calls = 0;
  const fetcher = async url => {
    calls++;
    const start = followingDate(new URL(url).pathname.split('/')[4].split('-').reverse().join('-'));
    return { ok: true, json: async () => payload(start) };
  };
  const cache = createPrayerCache(fetcher, storage);
  await Promise.all(Array.from({ length: 10 }, () => cache.get(request())));
  assert.equal(calls, 1);
  await cache.get(request());
  const offlineCache = createPrayerCache(() => { throw new Error('offline'); }, storage);
  await offlineCache.get(request());
  assert.equal(calls, 1);
  await cache.get(request('2026-10-06'));
  await cache.get(request('2026-10-06', { cityName: 'Sylhet' }));
  await cache.get(request('2026-10-06', { prayerMethod: '3' }));
  await cache.get(request('2026-10-06', { prayerSchool: '0' }));
  assert.equal(calls, 3);
});

test('a failed fetch waits for explicit retry; inaccessible storage leaves an in-memory cache', async () => {
  let calls = 0;
  const cache = createPrayerCache(async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return { ok: true, json: async () => payload() };
  }, { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } });
  await assert.rejects(cache.get(request()), /offline/);
  await assert.rejects(cache.get(request()), /offline/);
  assert.equal(calls, 1);
  await cache.get(request(), true);
  await cache.get(request());
  assert.equal(calls, 2);
});

test('all loaded cities for the day remain cached when switching among many locations', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const cache = createPrayerCache(async () => ({ ok: true, json: async () => payload() }), storage);
  for (let i = 0; i < 15; i++) await cache.get(request('2026-10-05', { cityName: `City ${i}` }));
  const reopened = createPrayerCache(() => { throw new Error('An already-loaded city should not fetch again'); }, storage);
  await reopened.get(request('2026-10-05', { cityName: 'City 0' }));
  await reopened.get(request('2026-10-05', { cityName: 'City 14' }));
});
