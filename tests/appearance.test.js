import test from 'node:test';
import assert from 'node:assert/strict';
import { palettes, themeCatalog, matchingTheme, normalizeColors, displayColors, contrast, controlColor } from '../appearance.js';
import { normalizePreferences } from '../time.js';

test('custom colors survive persistence while malformed values cannot enter CSS', () => {
  const raw = { theme: 'light', colors: { background: '#AABBCC', time: 'url(https://example.com)', details: '#123456', extra: '#ffffff' } };
  const saved = normalizePreferences(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(saved.colors, { background: '#aabbcc', details: '#123456' });
  assert.equal(displayColors(saved).time, palettes.light.time);
  assert.deepEqual(normalizeColors(null), {});
});

test('every preset is readable on its page and tile backgrounds', () => {
  for (const [name, p] of Object.entries(palettes)) {
    assert.ok(contrast(p.time, p.background) >= 3, `${name} digits`);
    assert.ok(contrast(p.details, p.background) >= 4.5, `${name} details`);
    assert.ok(contrast(p.tileText, p.tile) >= 4.5, `${name} tiles`);
    assert.ok(contrast(p.time, p.tile) >= 3, `${name} flip digits`);
  }
});

test('theme identity survives reload and a custom edit clears the preset selection', () => {
  assert.equal(themeCatalog.length, Object.keys(palettes).length);
  assert.equal(new Set(themeCatalog.map(theme => theme.id)).size, themeCatalog.length);
  for (const theme of themeCatalog) {
    const preferences = normalizePreferences(JSON.parse(JSON.stringify({ theme: theme.mode, colors: palettes[theme.id] })));
    assert.equal(matchingTheme(displayColors(preferences))?.id, theme.id);
  }
  assert.equal(matchingTheme({ ...palettes.dracula, time: '#123456' }), undefined);
});

test('controls stay visible even when custom foreground and background are identical', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  for (const bg of ['#000000', '#ffffff', '#777777', '#ffff00', '#0000ff', '#ff0000', '#123456']) {
    assert.ok(contrast(controlColor(bg), bg) >= 3.2, bg);
    assert.ok(contrast(controlColor(bg, 4.5), bg) >= 4.5, bg);
  }
});
