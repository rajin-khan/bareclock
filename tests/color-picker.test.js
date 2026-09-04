import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsv, hsvToHex } from '../color-picker.js';
import { palettes } from '../appearance.js';

test('picker conversion preserves theme colors and RGB boundaries exactly', () => {
  const colors = new Set(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#808080', '#010101']);
  Object.values(palettes).forEach(palette => Object.values(palette).forEach(color => colors.add(color)));
  colors.forEach(color => assert.equal(hsvToHex(hexToHsv(color)), color, color));
});

test('picker hue wraps and achromatic edits preserve the chosen hue', () => {
  assert.equal(hsvToHex({ h: 360, s: 100, v: 100 }), '#ff0000');
  assert.equal(hsvToHex({ h: -120, s: 100, v: 100 }), '#0000ff');
  assert.equal(hexToHsv('#808080', 240).h, 240);
  assert.equal(hsvToHex({ h: 120, s: 200, v: 200 }), '#00ff00');
  assert.equal(hsvToHex({ h: 120, s: 100, v: -1 }), '#000000');
});
