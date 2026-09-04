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
    ['index.html', 'https://bareclock.vercel.app/', 'https://bareclock.vercel.app/assets/og/bareclock.png?v=2'],
    ['about/index.html', 'https://bareclock.vercel.app/about/', 'https://bareclock.vercel.app/assets/og/themes.png?v=2'],
  ]) {
    const html = await read(path);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path} should have one h1`);
    assert.match(html, new RegExp(`<link rel="canonical" href="${canonical.replaceAll('.', '\\.')}">`));
    assert.ok(html.includes(`<meta property="og:image" content="${image}">`));
    assert.ok(html.includes(`<meta property="og:image:secure_url" content="${image}">`));
    assert.ok(html.includes('<meta property="og:image:type" content="image/png">'));
    assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
    assert.ok(html.includes('<meta property="og:image:height" content="630">'));
    assert.ok(html.includes(`<meta name="twitter:image" content="${image}">`));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(html.includes('<meta name="twitter:title"'));
    assert.ok(html.includes('<meta name="twitter:description"'));
    const imagePath = new URL(image).pathname.slice(1);
    const imageBytes = await readFile(new URL(`../${imagePath}`, import.meta.url));
    assert.deepEqual(pngSize(imageBytes), [1200, 630]);
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
  assert.match(robots, /Sitemap: https:\/\/bareclock\.vercel\.app\/sitemap\.xml/);
  assert.deepEqual([...sitemap.matchAll(/<loc>(.+?)<\/loc>/g)].map(match => match[1]), [
    'https://bareclock.vercel.app/',
    'https://bareclock.vercel.app/about/',
  ]);
});
