import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildDirectory, searchDirectory } from '../city-directory.js';

const data = JSON.parse(gunzipSync(readFileSync(new URL('../data/cities.json.gz', import.meta.url))));
const directory = buildDirectory(data);

test('bundled directory covers more than 200,000 cities and towns', () => {
  assert.ok(directory.length > 200000);
  assert.ok(new Set(directory.map(entry => entry.city.country)).size > 200);
});

test('Bangladesh cities, native names, and alternate spellings resolve', () => {
  for (const query of ['Dhaka', 'Sylhet', 'Khulna', 'Chittagong', 'ঢাকা']) {
    const results = searchDirectory(directory, query).items;
    assert.ok(results.some(city => city.country === 'Bangladesh' && city.zone === 'Asia/Dhaka'), query);
  }
});

test('cities sharing a timezone remain separate search results', () => {
  const mumbai = searchDirectory(directory, 'Mumbai').items.find(city => city.country === 'India');
  const delhi = searchDirectory(directory, 'New Delhi').items.find(city => city.country === 'India');
  assert.ok(mumbai);
  assert.ok(delhi);
  assert.notEqual(mumbai.id, delhi.id);
  assert.equal(mumbai.zone, delhi.zone);
});

test('country, region and timezone queries page through all matches', () => {
  const first = searchDirectory(directory, 'United States', 60);
  const second = searchDirectory(directory, 'United States', 120);
  assert.equal(first.items.length, 60);
  assert.equal(second.items.length, 120);
  assert.equal(first.total, second.total);
  assert.ok(first.total > 1000);
  assert.ok(searchDirectory(directory, 'Springfield Illinois').items.some(city => city.name === 'Springfield' && city.region === 'Illinois'));
  assert.ok(searchDirectory(directory, 'Asia/Dhaka').total > 100);
});

test('UTC and accents are searchable; no matches are explicit', () => {
  assert.equal(searchDirectory(directory, 'UTC').items[0].name, 'UTC');
  assert.ok(searchDirectory(directory, 'Sao Paulo').items.some(city => city.name === 'São Paulo'));
  assert.equal(searchDirectory(directory, 'zzzz-no-city-exists').total, 0);
});

test('limited search preserves ranking, pagination and the full match count', () => {
  const entries = ['elsewhere', 'harbor north', 'harbor'].map((name, id) => ({
    city: { id, name }, name, aliases: [], search: `${name} harbor`,
  }));
  assert.deepEqual(searchDirectory(entries, 'harbor', 1), { items: [entries[2].city], total: 3 });
  assert.deepEqual(searchDirectory(entries, 'harbor', 2).items, [entries[2].city, entries[1].city]);
  assert.deepEqual(searchDirectory(entries, '', 1), { items: [entries[0].city], total: 3 });
  assert.deepEqual(searchDirectory(entries, '', 0), { items: [], total: 3 });
});
