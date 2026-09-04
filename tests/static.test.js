import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test('public pages expose one useful heading and complete canonical social metadata', async () => {
  for (const [path, canonical, image] of [
    ['index.html', 'https://bareclock.com/', 'https://bareclock.com/assets/og/bareclock.png'],
    ['about/index.html', 'https://bareclock.com/about/', 'https://bareclock.com/assets/og/themes.png'],
  ]) {
    const html = await read(path);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path} should have one h1`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll('.', '\\.')}">`));
    assert.ok(html.includes(`<meta property="og:image" content="${image}">`));
    assert.ok(html.includes('<meta name="description"'));
  }
  const root = await read('index.html');
  const structured = root.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert.equal(JSON.parse(structured)['@type'], 'WebApplication');
});

test('social and app images have exact production dimensions', async () => {
  const files = [
    ['assets/og/bareclock.png', 1200, 630],
    ['assets/og/themes.png', 1200, 630],
    ['assets/icons/icon-512.png', 512, 512],
    ['assets/icons/icon-192.png', 192, 192],
    ['assets/icons/apple-touch-icon.png', 180, 180],
  ];
  for (const [path, width, height] of files) {
    const buffer = await readFile(new URL(`../${path}`, import.meta.url));
    assert.deepEqual(pngSize(buffer), [width, height], path);
  }
});

test('crawler files name only public canonical pages', async () => {
  const [robots, sitemap] = await Promise.all([read('robots.txt'), read('sitemap.xml')]);
  assert.match(robots, /Sitemap: https:\/\/bareclock\.com\/sitemap\.xml/);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.+?)<\/loc>/g)].map(match => match[1]), [
    'https://bareclock.com/',
    'https://bareclock.com/about/',
  ]);
});
