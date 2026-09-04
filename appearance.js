export const palettes = {
  dark: { background: '#08090b', time: '#f5f5f7', details: '#a1a1a6', tile: '#151619', tileText: '#f5f5f7' },
  light: { background: '#f5f5f7', time: '#1d1d1f', details: '#636368', tile: '#ebebee', tileText: '#1d1d1f' },
  sand: { background: '#f1ece3', time: '#37332d', details: '#71685e', tile: '#e6dfd3', tileText: '#37332d' },
  midnight: { background: '#101820', time: '#e5edf5', details: '#a2b1bf', tile: '#1c2935', tileText: '#e5edf5' },
  forest: { background: '#121b17', time: '#e4ede5', details: '#a2b5a8', tile: '#203028', tileText: '#e4ede5' },
  plum: { background: '#211a23', time: '#f2e7ef', details: '#b9a8b5', tile: '#342938', tileText: '#f2e7ef' },
  dracula: { background: '#282a36', time: '#bd93f9', details: '#f8f8f2', tile: '#44475a', tileText: '#f8f8f2' },
  'catppuccin-mocha': { background: '#1e1e2e', time: '#cba6f7', details: '#bac2de', tile: '#313244', tileText: '#cdd6f4' },
  'catppuccin-macchiato': { background: '#24273a', time: '#c6a0f6', details: '#b8c0e0', tile: '#363a4f', tileText: '#cad3f5' },
  'catppuccin-frappe': { background: '#303446', time: '#ca9ee6', details: '#b5bfe2', tile: '#414559', tileText: '#c6d0f5' },
  'catppuccin-latte': { background: '#eff1f5', time: '#8839ef', details: '#5c5f77', tile: '#e6e9ef', tileText: '#4c4f69' },
  nord: { background: '#2e3440', time: '#88c0d0', details: '#d8dee9', tile: '#3b4252', tileText: '#eceff4' },
  'tokyo-night': { background: '#1a1b26', time: '#7aa2f7', details: '#a9b1d6', tile: '#24283b', tileText: '#c0caf5' },
  'gruvbox-dark': { background: '#282828', time: '#fabd2f', details: '#bdae93', tile: '#3c3836', tileText: '#ebdbb2' },
  'gruvbox-light': { background: '#fbf1c7', time: '#9d0006', details: '#665c54', tile: '#ebdbb2', tileText: '#3c3836' },
  'rose-pine': { background: '#191724', time: '#ebbcba', details: '#908caa', tile: '#1f1d2e', tileText: '#e0def4' },
  'rose-pine-dawn': { background: '#faf4ed', time: '#286983', details: '#464261', tile: '#f2e9e1', tileText: '#464261' },
  'solarized-dark': { background: '#002b36', time: '#93a1a1', details: '#839496', tile: '#073642', tileText: '#93a1a1' },
  'solarized-light': { background: '#fdf6e3', time: '#586e75', details: '#586e75', tile: '#eee8d5', tileText: '#073642' },
  ink: { background: '#050505', time: '#f5f5f5', details: '#a3a3a3', tile: '#171717', tileText: '#f5f5f5' },
  canvas: { background: '#f7f7f5', time: '#171717', details: '#666663', tile: '#ececea', tileText: '#171717' },
  'puff-warm': { background: '#fdf6ec', time: '#362112', details: '#6b6258', tile: '#f0e9df', tileText: '#362112' },
  'puff-galaxy': { background: '#0a0e27', time: '#e8eaf6', details: '#b8bfde', tile: '#0f1642', tileText: '#e8eaf6' },
  komorebi: { background: '#071c20', time: '#e7bd87', details: '#dfd2b9', tile: '#352820', tileText: '#f4ebd7' },
};

// Names and sources are separate from the five editable display color roles.
export const themeCatalog = [
  ['dark', 'Graphite', 'Essentials', 'dark'], ['light', 'Paper', 'Essentials', 'light'],
  ['sand', 'Sand', 'Essentials', 'light'], ['midnight', 'Midnight', 'Essentials', 'dark'],
  ['forest', 'Forest', 'Essentials', 'dark'], ['plum', 'Plum', 'Essentials', 'dark'],
  ['catppuccin-mocha', 'Catppuccin Mocha', 'Catppuccin', 'dark'],
  ['catppuccin-macchiato', 'Catppuccin Macchiato', 'Catppuccin', 'dark'],
  ['catppuccin-frappe', 'Catppuccin Frappé', 'Catppuccin', 'dark'],
  ['catppuccin-latte', 'Catppuccin Latte', 'Catppuccin', 'light'],
  ['dracula', 'Dracula', 'Community', 'dark'], ['nord', 'Nord', 'Community', 'dark'],
  ['tokyo-night', 'Tokyo Night', 'Community', 'dark'],
  ['gruvbox-dark', 'Gruvbox Dark', 'Community', 'dark'],
  ['gruvbox-light', 'Gruvbox Light', 'Community', 'light'],
  ['rose-pine', 'Rosé Pine', 'Community', 'dark'],
  ['rose-pine-dawn', 'Rosé Pine Dawn', 'Community', 'light'],
  ['solarized-dark', 'Solarized Dark', 'Community', 'dark'],
  ['solarized-light', 'Solarized Light', 'Community', 'light'],
  ['ink', 'Ink', 'Originals', 'dark'], ['canvas', 'Canvas', 'Originals', 'light'],
  ['puff-warm', 'Warm', 'Originals', 'light'],
  ['puff-galaxy', 'Galaxy', 'Originals', 'dark'], ['komorebi', 'Komorebi', 'Originals', 'dark'],
].map(([id, name, group, mode]) => ({ id, name, group, mode }));

export function matchingTheme(colors) {
  return themeCatalog.find(theme => Object.keys(palettes.dark).every(key => palettes[theme.id][key] === colors[key]));
}

export function validColor(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value); }

export function normalizeColors(raw) {
  return Object.fromEntries(Object.keys(palettes.dark).filter(key => validColor(raw && raw[key])).map(key => [key, raw[key].toLowerCase()]));
}

export function displayColors(preferences) {
  return { ...palettes[preferences.theme], ...normalizeColors(preferences.colors) };
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

export function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
}

export function mix(a, b, amount) {
  const channel = (color, offset) => parseInt(color.slice(offset, offset + 2), 16);
  return '#' + [1, 3, 5].map(offset => Math.round(channel(a, offset) * (1 - amount) + channel(b, offset) * amount).toString(16).padStart(2, '0')).join('');
}

// Keep controls legible on any user background without changing their chosen colors.
export function controlColor(background, minimum = 3.2) {
  const ink = contrast('#ffffff', background) > contrast('#000000', background) ? '#ffffff' : '#000000';
  for (let step = 1; step <= 100; step++) {
    const color = mix(background, ink, step / 100);
    if (contrast(color, background) >= minimum) return color;
  }
  return ink;
}
