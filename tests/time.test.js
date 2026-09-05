import test from 'node:test';
import assert from 'node:assert/strict';
import { timeAt, dateAt, calendarDates, relativeDay, uses12Hours, nextTickDelay, normalizePreferences, sameCity, swapWorldCity, isDeviceCity, zoneOffsetMinutes, solarMapGeometry } from '../time.js';
import { cityCatalog, searchCities } from '../cities.js';

test('12-hour midnight and noon are unambiguous; 24-hour midnight is 00', () => {
  assert.deepEqual(timeAt(new Date('2026-09-04T00:00:00Z'), 'UTC', false), { hour: '00', minute: '00', second: '00', period: '' });
  assert.equal(timeAt(new Date('2026-09-04T00:00:00Z'), 'UTC', true).period, 'AM');
  assert.equal(timeAt(new Date('2026-09-04T12:00:00Z'), 'UTC', true).period, 'PM');
  assert.equal(timeAt(new Date('2026-09-04T00:00:00Z'), 'UTC', true).hour, '12');
});

test('timezones handle half-hour and quarter-hour offsets', () => {
  const now = new Date('2026-09-04T00:00:00Z');
  assert.equal(timeAt(now, 'Asia/Kolkata', false).minute, '30');
  assert.equal(timeAt(now, 'Asia/Kathmandu', false).minute, '45');
  assert.equal(zoneOffsetMinutes(now, 'Asia/Dhaka'), 360);
  assert.equal(zoneOffsetMinutes(now, 'Asia/Kolkata'), 330);
  assert.equal(zoneOffsetMinutes(now, 'Asia/Kathmandu'), 345);
});

test('timezone offsets follow daylight saving for the world-map meridian', () => {
  assert.equal(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/New_York'), -300);
  assert.equal(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/New_York'), -240);
});

test('solar map geometry tracks the seasons without invalid path data', () => {
  const june = solarMapGeometry(new Date('2026-06-21T12:00:00Z'));
  const december = solarMapGeometry(new Date('2026-12-21T12:00:00Z'));
  assert.ok(june.sunLatitude > 23 && june.sunLatitude < 24);
  assert.ok(december.sunLatitude < -23 && december.sunLatitude > -24);
  for (const geometry of [june, december]) {
    assert.ok(geometry.sunX >= 0 && geometry.sunX <= 1000);
    assert.ok(geometry.sunY >= 0 && geometry.sunY <= 500);
    assert.match(geometry.terminator, /^M/);
    assert.match(geometry.daylight, /Z$/);
    assert.doesNotMatch(geometry.daylight, /NaN|Infinity/);
  }
});

test('New York skips the missing spring hour and repeats the autumn hour', () => {
  assert.equal(timeAt(new Date('2026-03-08T06:59:59Z'), 'America/New_York', false).hour, '01');
  assert.equal(timeAt(new Date('2026-03-08T07:00:00Z'), 'America/New_York', false).hour, '03');
  assert.equal(timeAt(new Date('2026-11-01T05:59:59Z'), 'America/New_York', false).hour, '01');
  assert.deepEqual(timeAt(new Date('2026-11-01T06:00:00Z'), 'America/New_York', false), { hour: '01', minute: '00', second: '00', period: '' });
});

test('calendar comparisons cross month, year, and international date boundaries', () => {
  const newYear = new Date('2026-12-31T20:00:00Z');
  assert.equal(relativeDay(newYear, 'Asia/Dhaka', 'Europe/London'), 'Tomorrow');
  assert.equal(relativeDay(newYear, 'Europe/London', 'Asia/Dhaka'), 'Yesterday');
  assert.equal(relativeDay(newYear, 'Asia/Dhaka', 'Asia/Tokyo'), 'Today');
  const dateLine = new Date('2026-01-01T10:30:00Z');
  assert.equal(relativeDay(dateLine, 'Pacific/Kiritimati', 'Pacific/Pago_Pago'), '2 days ahead');
  assert.equal(dateAt(new Date('2026-09-04T06:00:00Z'), 'Asia/Dhaka'), 'Friday, 4 September');
});

test('device defaults and overrides select the expected hour cycle', () => {
  assert.equal(uses12Hours('auto', 'en-US'), true);
  assert.equal(uses12Hours('auto', 'en-GB'), false);
  assert.equal(uses12Hours('24', 'en-US'), false);
  assert.equal(uses12Hours('12', 'en-GB'), true);
});

test('ticks realign to wall time after delayed callbacks', () => {
  assert.equal(nextTickDelay(61234, false), 58786);
  assert.equal(nextTickDelay(61234, true), 786);
  assert.equal(nextTickDelay(120000, false), 60020);
});

test('invalid stored preferences cannot break the clock', () => {
  const prefs = normalizePreferences({ style: 'bad', zone: 'Mars/Olympus', cities: [null, { name: 'Bad', zone: 'invalid' }, { name: 'London', zone: 'Europe/London' }, { name: 'London', zone: 'Europe/London' }], seconds: 'false' });
  assert.equal(prefs.style, 'simple');
  for (const style of ['simple', 'flip', 'digital', 'dial', 'stack', 'halo', 'horizon', 'world']) assert.equal(normalizePreferences({ style }).style, style);
  assert.equal(prefs.zone, null);
  assert.equal(prefs.seconds, false);
  assert.equal(prefs.cities.length, 1);
  assert.equal(normalizePreferences(null).cities.length, 0);
});

test('city picker supports accents, aliases and IANA timezone searches', () => {
  const catalog = cityCatalog();
  assert.equal(searchCities(catalog, 'Dacca')[0].name, 'Dhaka');
  assert.equal(searchCities(catalog, 'sao paulo')[0].name, 'São Paulo');
  assert.equal(searchCities(catalog, 'Europe/London')[0].name, 'London');
  assert.equal(searchCities(catalog, 'Mumbai').length, 0);
  assert.equal(searchCities(catalog, 'no-such-city-xyz').length, 0);
  assert.ok(catalog.length > 300);
});

test('different cities in the same timezone persist independently', () => {
  const cities = [{ id: '1', name: 'Dhaka', zone: 'Asia/Dhaka' }, { id: '2', name: 'Sylhet', zone: 'Asia/Dhaka' }];
  const preferences = normalizePreferences({ cities: [...cities, cities[0]] });
  assert.equal(preferences.cities.length, 2);
  assert.equal(sameCity(preferences.cities[0], cities[0]), true);
  assert.equal(sameCity(preferences.cities[0], cities[1]), false);
});

test('swapping a world city preserves the current device city in its rail slot', () => {
  const london = { id: 'ldn', name: 'London', region: 'England', country: 'United Kingdom', zone: 'Europe/London' };
  const preferences = normalizePreferences({ cities: [london] });
  const swapped = swapWorldCity(preferences, london, 'Asia/Dhaka');
  assert.equal(swapped.zone, 'Europe/London');
  assert.equal(swapped.cityName, 'London');
  assert.deepEqual(swapped.cities, [{ name: 'Dhaka', zone: 'Asia/Dhaka' }]);
  const restored = swapWorldCity(swapped, swapped.cities[0], 'Asia/Dhaka');
  assert.equal(restored.zone, null);
  assert.equal(restored.cityName, '');
  assert.equal(isDeviceCity(restored, 'Asia/Dhaka'), true);
  assert.deepEqual(restored.cities, [london]);
});

test('return-to-device state recognizes stored Dhaka but distinguishes cities sharing its timezone', () => {
  assert.equal(isDeviceCity(normalizePreferences({ zone: 'Asia/Dhaka', cityName: 'Dhaka' }), 'Asia/Dhaka'), true);
  assert.equal(isDeviceCity(normalizePreferences({ zone: 'Asia/Dacca', cityName: 'Dhaka' }), 'Asia/Dhaka'), true);
  assert.equal(isDeviceCity(normalizePreferences({ zone: 'Asia/Dhaka', cityName: 'Sylhet' }), 'Asia/Dhaka'), false);
  const sylhet = { name: 'Sylhet', zone: 'Asia/Dhaka' };
  const swapped = swapWorldCity(normalizePreferences({ cities: [sylhet] }), sylhet, 'Asia/Dhaka');
  assert.equal(isDeviceCity(swapped, 'Asia/Dhaka'), false);
  const restored = swapWorldCity(swapped, swapped.cities[0], 'Asia/Dhaka');
  assert.equal(restored.zone, null);
  assert.deepEqual(restored.cities, [sylhet]);
});

test('swapping does not duplicate a main city already saved elsewhere', () => {
  const dhaka = { name: 'Dhaka', zone: 'Asia/Dhaka' };
  const london = { name: 'London', zone: 'Europe/London' };
  const p = normalizePreferences({ cities: [dhaka, london] });
  assert.deepEqual(swapWorldCity(p, london, 'Asia/Dhaka').cities, [dhaka]);
});

test('size and display preferences validate and dates retain the chosen timezone', () => {
  assert.equal(normalizePreferences({ clockSize: 900 }).clockSize, 100);
  assert.equal(normalizePreferences({ clockSize: NaN }).clockSize, 80);
  assert.equal(normalizePreferences({ clockSize: 5 }).clockSize, 55);
  assert.equal(normalizePreferences({ weight: '100' }).weight, '550');
  assert.equal(normalizePreferences({ showDate: false }).showDate, false);
  const now = new Date('2026-12-31T20:00:00Z');
  assert.equal(dateAt(now, 'Asia/Dhaka', 'numeric'), '2027-01-01');
  assert.equal(dateAt(now, 'Asia/Dhaka', 'short'), 'Fri, 1 Jan');
});

test('world clock sizes default to compact and preserve the large choice', () => {
  for (const tileSize of [undefined, 'comfortable', 'compact', 'invalid']) {
    assert.equal(normalizePreferences({ tileSize }).tileSize, 'compact');
  }
  assert.equal(normalizePreferences({ tileSize: 'large' }).tileSize, 'large');
});


test('calendar cards center the selected timezone date across midnight and month boundaries', () => {
  const before = calendarDates(new Date('2026-12-31T17:59:59Z'), 'Asia/Dhaka');
  const after = calendarDates(new Date('2026-12-31T18:00:00Z'), 'Asia/Dhaka');
  assert.equal(before.length, 31);
  assert.equal(before[15].iso, '2026-12-31');
  assert.deepEqual(after[15], { iso: '2027-01-01', day: 1, weekday: 'Fri', month: 'Jan' });
  assert.equal(before[16].iso, after[15].iso);
  assert.equal(calendarDates(new Date('2024-03-01T00:00:00Z'), 'UTC')[14].iso, '2024-02-29');
  assert.equal(normalizePreferences({ dateStyle: 'cards' }).dateStyle, 'cards');
});
