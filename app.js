import { localZone, uses12Hours, timeAt, dateAt, relativeDay, nextTickDelay, normalizePreferences, sameCity, swapWorldCity, isDeviceCity, zoneOffsetMinutes, solarMapGeometry } from './time.js';
import { palettes, themeCatalog, matchingTheme, displayColors, controlColor, contrast, mix, validColor } from './appearance.js';
import { cityCatalog, searchCities, zoneName } from './cities.js';

const $ = id => document.getElementById(id);
const storageKey = 'clock.preferences.v1';
const onboardingKey = 'bareclock.onboarding.v1';
let storageAvailable = true;
let raw = null;
try { raw = JSON.parse(localStorage.getItem(storageKey)); } catch { storageAvailable = false; }
let prefs = normalizePreferences(raw);
let onboardingSeen = Boolean(raw);
try { onboardingSeen = onboardingSeen || localStorage.getItem(onboardingKey) === '1'; } catch {}
let onboardingStep = 0;
let deviceZone = localZone();
const catalog = cityCatalog();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function stopMotion() {
  const face = document.querySelector('.clock-face');
  if (reducedMotion.matches && face && face.getAnimations) face.getAnimations().forEach(animation => animation.cancel());
}
if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', stopMotion);
else if (reducedMotion.addListener) reducedMotion.addListener(stopMotion);
let ticker, idleTimer, noticeTimer, wakeLock, wakePending = false;
let idleDeadline = 0;
let pickerMode = 'add';
let previousFace = '', previousDigits = '', previousStructure = '';
let lastWorldMinute = '', lastDate = '', lastMainMinute = '';
let solarMinute = -1, solarGeometry;
let cityWorker, workerIdleTimer, searchDebounce;
let searchRequest = 0, cityLimit = 60, directoryReady = false;
let hour12Key = '', hour12Value = false;

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(svg.namespaceURI, 'use');
  use.setAttribute('href', `#i-${name}`);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#i-${name}`);
  svg.append(use);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

function notify(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 4500);
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(prefs)); storageAvailable = true; }
  catch { storageAvailable = false; notify('Settings could not be saved. They will reset when you close this page.'); }
  updateOfflineStatus();
}

function updateOfflineStatus() {
  $('offline-status').textContent = storageAvailable ? 'Saved in this browser.' : 'Settings are not being saved.';
}

function mainZone() { return prefs.zone || deviceZone; }
function hour12() {
  const key = `${prefs.hourFormat}|${navigator.language}`;
  if (key !== hour12Key) { hour12Key = key; hour12Value = uses12Hours(prefs.hourFormat, navigator.language); }
  return hour12Value;
}

function update(key, value) {
  const themeChange = key === 'theme' || key === 'colors';
  if (themeChange) document.documentElement.classList.add('changing-theme');
  prefs[key] = value;
  if (key === 'theme') prefs.colors = {};
  save();
  syncControls();
  if (key === 'cities') buildRail();
  render(true);
  schedule();
  if (key === 'style') revealClock();
  if (key === 'keepAwake') syncWakeLock();
  if (key === 'autoHide') showControls();
  if (themeChange) {
    void document.documentElement.offsetHeight;
    requestAnimationFrame(() => document.documentElement.classList.remove('changing-theme'));
  }
}

function syncControls() {
  document.documentElement.dataset.theme = prefs.theme;
  syncAppearance();
  document.documentElement.style.setProperty('--clock-scale', prefs.clockSize / 100);
  document.documentElement.style.setProperty('--digit-weight', prefs.weight);
  $('app').classList.toggle('hide-period', !prefs.showPeriod);
  $('app').dataset.face = prefs.style;
  $('clock-size').value = prefs.clockSize;
  $('clock-size-value').textContent = `${prefs.clockSize}%`;
  $('digit-weight').value = prefs.weight;
  $('date-style').value = prefs.dateStyle;
  $('date-style').disabled = !prefs.showDate;
  for (const [id, key] of [['show-date', 'showDate'], ['show-city', 'showCity'], ['show-period', 'showPeriod'], ['auto-hide', 'autoHide']]) $(id).checked = prefs[key];
  $('date-display').hidden = !prefs.showDate;
  document.querySelector('.place').hidden = !prefs.showCity;
  document.querySelectorAll('[data-size]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.size) === prefs.clockSize)));
  document.querySelectorAll('[data-setting]').forEach(button => button.setAttribute('aria-pressed', String(prefs[button.dataset.setting] === button.dataset.value)));
  $('hour-format').value = prefs.hourFormat;
  $('seconds').checked = prefs.seconds;
  $('show-world').checked = prefs.showWorld;
  $('tile-size').value = prefs.tileSize;
  $('keep-awake').checked = prefs.keepAwake;
  $('main-zone-label').textContent = prefs.zone ? `${prefs.cityName || zoneName(prefs.zone)} / ${prefs.zone}` : 'Device timezone';
  $('reset-zone').hidden = isDeviceCity(prefs, deviceZone);
  $('world-rail').hidden = !prefs.showWorld || !prefs.cities.length;
  $('world-rail').classList.toggle('large', prefs.tileSize === 'large');
  $('world-button').setAttribute('aria-label', prefs.cities.length ? (prefs.showWorld ? 'Hide world clocks' : 'Show world clocks') : 'World clocks');
  $('world-button').setAttribute('aria-pressed', String(prefs.showWorld && prefs.cities.length > 0));
}

function syncAppearance() {
  const colors = displayColors(prefs);
  const root = document.documentElement;
  const guideText = controlColor(colors.background, 7);
  const panel = mix(colors.background, guideText, .055);
  const panelText = contrast(colors.time, panel) >= 4.5 ? colors.time : controlColor(panel, 7);
  const panelDetail = contrast(colors.details, panel) >= 4.5 ? colors.details : controlColor(panel, 4.5);
  root.style.setProperty('--bg', colors.background);
  root.style.setProperty('--panel', panel);
  root.style.setProperty('--card', colors.tile);
  root.style.setProperty('--fg', panelText);
  root.style.setProperty('--muted', panelDetail);
  root.style.setProperty('--faint', mix(colors.background, guideText, .5));
  root.style.setProperty('--line', mix(colors.background, guideText, .18));
  root.style.setProperty('--accent', panelText);
  root.style.setProperty('--hover', mix(panel, guideText, .08));
  root.style.setProperty('--shadow', `0 24px 90px ${prefs.theme === 'light' ? '#0000001f' : '#00000066'}`);
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--display-${key}`, value);
    const input = $(`color-${key}`);
    if (document.activeElement !== input) input.value = value;
    $(`swatch-${key}`).value = value;
  }
  root.style.setProperty('--display-control', controlColor(colors.background, prefs.controls === 'subtle' ? 3.2 : 4.5));
  root.style.setProperty('--display-hover', mix(colors.background, colors.time, .08));
  root.style.setProperty('--display-line', mix(colors.background, controlColor(colors.background), .25));
  root.style.setProperty('--display-tile-detail', controlColor(colors.tile, 4.5));
  root.style.setProperty('--guide-bg', colors.background);
  root.style.setProperty('--guide-panel', panel);
  root.style.setProperty('--guide-fg', guideText);
  root.style.setProperty('--guide-muted', mix(colors.background, guideText, .62));
  root.style.setProperty('--guide-line', mix(colors.background, guideText, .18));
  root.style.setProperty('--guide-accent', panelText);
  root.style.setProperty('--guide-accent-text', controlColor(panelText, 7));
  $('app').dataset.controls = prefs.controls;
  $('control-style').value = prefs.controls;
  $('show-hints').checked = prefs.showHints;
  document.querySelector('.keyboard-hints').hidden = !prefs.showHints;
  document.querySelector('meta[name="theme-color"]').content = colors.background;
  document.querySelectorAll('[data-palette]').forEach(button => button.setAttribute('aria-pressed', String(Object.keys(colors).every(key => colors[key] === palettes[button.dataset.palette][key]))));
  const currentTheme = matchingTheme(colors);
  $('active-theme').textContent = currentTheme ? currentTheme.name : 'Custom';
  const pairs = [['Time', colors.time, prefs.style === 'flip' ? colors.tile : colors.background, 3], ['Details', colors.details, colors.background, 4.5], ['World clocks', colors.tileText, colors.tile, 4.5]];
  const low = pairs.filter(([, fg, bg, target]) => contrast(fg, bg) < target);
  $('color-contrast').textContent = low.length ? `${low.map(([name, fg, bg]) => `${name}: ${contrast(fg, bg).toFixed(1)}:1`).join(' · ')}. Increase the contrast to make these colors easier to read.` : 'These colors have enough contrast.';
}

function buildThemes() {
  const library = $('theme-library');
  for (const group of [...new Set(themeCatalog.map(theme => theme.group))]) {
    const section = el('section', 'theme-group');
    section.setAttribute('aria-label', group);
    section.append(el('h3', 'theme-group-title', group));
    const grid = el('div', 'theme-grid');
    for (const theme of themeCatalog.filter(theme => theme.group === group)) {
      const palette = palettes[theme.id];
      const button = el('button', 'theme-card');
      button.dataset.palette = theme.id;
      button.dataset.mode = theme.mode;
      button.setAttribute('aria-label', theme.name);
      button.setAttribute('aria-pressed', 'false');
      button.style.setProperty('--preview-bg', palette.background);
      button.style.setProperty('--preview-time', palette.time);
      button.style.setProperty('--preview-detail', palette.details);
      const preview = el('span', 'theme-preview');
      preview.setAttribute('aria-hidden', 'true');
      preview.append(el('span', 'theme-preview-time', '12:48'), el('span', 'theme-preview-date', 'Friday, 4 September'));
      button.append(preview, el('span', 'theme-name', theme.name), el('span', 'theme-check', '✓'));
      button.lastChild.setAttribute('aria-hidden', 'true');
      button.addEventListener('click', () => {
        prefs.theme = theme.mode;
        update('colors', { ...palette });
      });
      grid.append(button);
    }
    section.append(grid);
    library.append(section);
  }
}

function revealClock() {
  if (reducedMotion.matches) return;
  const face = document.querySelector('.clock-face');
  if (!face || !face.animate) return;
  if (face.getAnimations) face.getAnimations().forEach(animation => animation.cancel());
  face.animate([{ opacity:.45, transform:'translateY(5px)' }, { opacity:1, transform:'translateY(0)' }], { duration:220, easing:'cubic-bezier(0.2,0,0,1)' });
}

function selectZone(city) {
  prefs.zone = city && city.zone || null;
  prefs.cityName = city && city.name || '';
  prefs.cityId = city && city.id || '';
  prefs.cityRegion = city && city.region || '';
  prefs.cityCountry = city && city.country || '';
  save();
  syncControls();
  render(true);
  revealClock();
}

// Segment order: top, upper right, lower right, bottom, lower left, upper left, middle.
const segmentPaths = [
  'M12 3H48L53 8L48 13H12L7 8Z', 'M50 15L55 10L60 15V48L55 53L50 48Z',
  'M50 62L55 57L60 62V95L55 100L50 95Z', 'M12 97H48L53 102L48 107H12L7 102Z',
  'M0 62L5 57L10 62V95L5 100L0 95Z', 'M0 15L5 10L10 15V48L5 53L0 48Z', 'M12 50H48L53 55L48 60H12L7 55Z',
];
const segments = ['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'];

function digitalDigit(value) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 60 110');
  svg.classList.add('segment-digit');
  segmentPaths.forEach((path, i) => {
    const piece = document.createElementNS(svg.namespaceURI, 'path');
    piece.setAttribute('d', path);
    if (segments[Number(value)][i] !== '1') piece.classList.add('segment-off');
    svg.append(piece);
  });
  return svg;
}

function updateDigitalDigit(svg, value) {
  svg.querySelectorAll('path').forEach((piece, index) => piece.classList.toggle('segment-off', segments[Number(value)][index] !== '1'));
}

function half(value, className) {
  const piece = el('span', `flip-half ${className}`);
  const inner = el('span');
  inner.append(el('b', '', value));
  piece.append(inner);
  return piece;
}

function flipDigit(value, old) {
  const digit = el('span', 'flip-digit');
  digit.append(half(value, 'flip-top'), half(value, 'flip-bottom'));
  if (old && old !== value && !reducedMotion.matches) {
    const back = half(old, 'flip-bottom');
    const top = half(old, 'flip-top flip-leaf-top');
    const bottom = half(value, 'flip-bottom flip-leaf-bottom');
    digit.append(back, top, bottom);
    bottom.addEventListener('animationend', () => { back.remove(); top.remove(); bottom.remove(); }, { once: true });
  }
  return digit;
}

function svgLine(className, x1, y1, x2, y2, angle = 0) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', className);
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  if (angle) line.setAttribute('transform', `rotate(${angle} 50 50)`);
  return line;
}

function dialFace(time) {
  const wrap = el('span', 'analog-face');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'analog-dial');
  svg.setAttribute('viewBox', '0 0 100 100');
  for (let hour = 0; hour < 12; hour++) {
    const major = hour % 3 === 0;
    svg.append(svgLine(`analog-tick${major ? ' major' : ''}`, 50, major ? 5 : 7, 50, major ? 13 : 11, hour * 30));
  }
  const second = Number(time.second);
  const minute = Number(time.minute) + second / 60;
  const hour = (Number(time.hour) % 12) + minute / 60;
  svg.append(svgLine('analog-hand analog-hour', 50, 52, 50, 28, hour * 30));
  svg.append(svgLine('analog-hand analog-minute', 50, 54, 50, 15, minute * 6));
  if (prefs.seconds) svg.append(svgLine('analog-hand analog-second', 50, 57, 50, 12, second * 6));
  wrap.append(svg);
  if (time.period) wrap.append(el('span', 'face-period analog-period', time.period));
  return wrap;
}

function stackFace(time) {
  const wrap = el('span', 'stack-face');
  wrap.append(el('span', 'stack-number', time.hour));
  const lower = el('span', 'stack-lower');
  lower.append(el('span', 'stack-number', time.minute));
  if (prefs.seconds) lower.append(el('span', 'stack-seconds', time.second));
  if (time.period) lower.append(el('span', 'face-period stack-period', time.period));
  wrap.append(lower);
  return wrap;
}

function haloFace(time) {
  const wrap = el('span', 'halo-face');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'halo-ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  for (const className of ['halo-track', 'halo-progress']) {
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('class', className);
    circle.setAttribute('cx', '50'); circle.setAttribute('cy', '50'); circle.setAttribute('r', '46');
    circle.setAttribute('pathLength', '100');
    svg.append(circle);
  }
  const progress = Number(time.second) / 60 * 100;
  svg.style.setProperty('--second-progress', 100 - progress);
  svg.classList.toggle('halo-reset', Number(time.second) === 0);
  const digits = el('span', 'halo-digits');
  digits.append(el('span', 'halo-time', `${time.hour}:${time.minute}`));
  if (prefs.seconds) digits.append(el('span', 'halo-seconds', time.second));
  if (time.period) digits.append(el('span', 'face-period halo-period', time.period));
  wrap.append(svg, digits);
  return wrap;
}

function horizonFace(time) {
  const wrap = el('span', 'horizon-face');
  wrap.append(el('span', 'horizon-time', `${time.hour}:${time.minute}`));
  if (prefs.seconds) wrap.append(el('span', 'horizon-seconds', time.second));
  if (time.period) wrap.append(el('span', 'face-period horizon-period', time.period));
  return wrap;
}

function offsetLabel(minutes) {
  if (!minutes) return 'UTC';
  const sign = minutes < 0 ? '-' : '+';
  const value = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function mapPath(className, data) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', className);
  path.setAttribute('d', data);
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  return path;
}

function currentSolarGeometry(now) {
  const minute = Math.floor(now.getTime() / 60000);
  if (minute !== solarMinute || !solarGeometry) {
    solarMinute = minute;
    solarGeometry = solarMapGeometry(now);
  }
  return solarGeometry;
}

function updateWorldFace(wrap, time, now, zone) {
  wrap.querySelector('.map-time-main').textContent = `${time.hour}:${time.minute}`;
  const seconds = wrap.querySelector('.map-seconds');
  if (seconds) seconds.textContent = time.second;
  const period = wrap.querySelector('.map-period');
  if (period) period.textContent = time.period;
  const minute = Math.floor(now.getTime() / 60000);
  if (wrap.dataset.mapMinute === String(minute)) return;
  wrap.dataset.mapMinute = String(minute);
  const geometry = currentSolarGeometry(now);
  const sunX = geometry.sunX / 10;
  const land = wrap.querySelector('.map-land');
  land.style.setProperty('--sun-x', `${sunX}%`);
  land.style.setProperty('--sun-left', `${sunX - 100}%`);
  land.style.setProperty('--sun-right', `${sunX + 100}%`);
  wrap.querySelector('.map-daylight').setAttribute('d', geometry.daylight);
  wrap.querySelector('.map-terminator').setAttribute('d', geometry.terminator);
  const offset = zoneOffsetMinutes(now, zone);
  const longitude = ((offset / 4 % 360 + 540) % 360) - 180;
  const zoneX = (longitude + 180) / 360 * 1000;
  const overlay = wrap.querySelector('.map-overlay');
  overlay.querySelectorAll('.map-zone-line').forEach(line => line.remove());
  (zoneX === 0 ? [0, 1000] : [zoneX]).forEach(x => {
    const line = document.createElementNS(overlay.namespaceURI, 'line');
    line.setAttribute('class', 'map-zone-line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', '24'); line.setAttribute('y2', '476');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    overlay.append(line);
  });
  const label = wrap.querySelector('.map-zone-label');
  label.textContent = offsetLabel(offset);
  label.style.setProperty('--zone-x', `${zoneX / 10}%`);
}

function worldFace(time, now, zone) {
  const wrap = el('span', 'map-face');
  const land = el('span', 'map-land');
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.setAttribute('class', 'map-overlay');
  overlay.setAttribute('viewBox', '0 0 1000 500');
  overlay.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.append(mapPath('map-daylight', ''), mapPath('map-terminator', ''));
  const label = el('span', 'map-zone-label');
  label.setAttribute('aria-hidden', 'true');
  const digits = el('span', 'map-time');
  digits.append(el('span', 'map-time-main', `${time.hour}:${time.minute}`));
  if (prefs.seconds) digits.append(el('span', 'map-seconds', time.second));
  if (time.period) digits.append(el('span', 'face-period map-period', time.period));
  wrap.append(land, overlay, label, digits);
  updateWorldFace(wrap, time, now, zone);
  return wrap;
}

function updateLiveFace(time, now, zone, digits) {
  const face = $('time-display');
  if (prefs.style === 'simple') {
    face.querySelectorAll('.simple-time').forEach((node, index) => { node.textContent = [time.hour, time.minute, time.second][index]; });
  } else if (prefs.style === 'digital') {
    face.querySelectorAll('.segment-digit').forEach((svg, index) => updateDigitalDigit(svg, digits[index]));
  } else if (prefs.style === 'dial') {
    const second = Number(time.second);
    const minute = Number(time.minute) + second / 60;
    const hour = (Number(time.hour) % 12) + minute / 60;
    face.querySelector('.analog-hour').setAttribute('transform', `rotate(${hour * 30} 50 50)`);
    face.querySelector('.analog-minute').setAttribute('transform', `rotate(${minute * 6} 50 50)`);
    const secondHand = face.querySelector('.analog-second');
    if (secondHand) secondHand.setAttribute('transform', `rotate(${second * 6} 50 50)`);
  } else if (prefs.style === 'stack') {
    const numbers = face.querySelectorAll('.stack-number');
    numbers[0].textContent = time.hour; numbers[1].textContent = time.minute;
    const seconds = face.querySelector('.stack-seconds');
    if (seconds) seconds.textContent = time.second;
  } else if (prefs.style === 'halo') {
    face.querySelector('.halo-time').textContent = `${time.hour}:${time.minute}`;
    const seconds = face.querySelector('.halo-seconds');
    if (seconds) seconds.textContent = time.second;
    const progress = Number(time.second) / 60 * 100;
    const ring = face.querySelector('.halo-ring');
    ring.classList.toggle('halo-reset', Number(time.second) === 0);
    ring.style.setProperty('--second-progress', 100 - progress);
  } else if (prefs.style === 'horizon') {
    face.querySelector('.horizon-time').textContent = `${time.hour}:${time.minute}`;
    const seconds = face.querySelector('.horizon-seconds');
    if (seconds) seconds.textContent = time.second;
  } else if (prefs.style === 'world') {
    updateWorldFace(face.querySelector('.map-face'), time, now, zone);
  } else return false;
  const period = face.querySelector('.face-period,.meridian');
  if (period) period.textContent = time.period;
  return true;
}

function renderFace(time, force, now, zone) {
  const groups = [time.hour, time.minute, ...(prefs.seconds ? [time.second] : [])];
  const digits = groups.join('');
  const faceKey = `${prefs.style}|${digits}|${time.period}${prefs.style === 'halo' ? '|' + time.second : ''}`;
  if (faceKey === previousFace && !force) return;
  const structureKey = `${prefs.style}|${prefs.seconds}|${Boolean(time.period)}`;
  if (!force && structureKey === previousStructure && updateLiveFace(time, now, zone, digits)) {
    $('time-accessible').textContent = `${groups.join(':')} ${time.period}`.trim();
    previousFace = faceKey;
    previousDigits = digits;
    return;
  }
  const oldDigits = previousFace.startsWith(prefs.style + '|') && previousDigits.length === digits.length && !force ? previousDigits : '';
  const face = $('time-display');
  face.className = `time-display style-${prefs.style}${prefs.seconds ? ' has-seconds' : ''}`;
  const content = document.createDocumentFragment();
  if (prefs.style === 'dial') content.append(dialFace(time));
  else if (prefs.style === 'stack') content.append(stackFace(time));
  else if (prefs.style === 'halo') content.append(haloFace(time));
  else if (prefs.style === 'horizon') content.append(horizonFace(time));
  else if (prefs.style === 'world') content.append(worldFace(time, now, zone));
  else {
    groups.forEach((value, index) => {
      if (index) content.append(el('span', 'time-separator', ':'));
      if (prefs.style === 'simple') content.append(el('span', 'simple-time', value));
      else {
        const group = el('span', prefs.style === 'flip' ? 'flip-group' : 'digital-group');
        [...value].forEach((n, i) => group.append(prefs.style === 'flip' ? flipDigit(n, oldDigits[index * 2 + i]) : digitalDigit(n)));
        content.append(group);
      }
    });
    if (time.period) content.append(el('span', 'meridian', time.period));
  }
  face.replaceChildren(content);
  $('time-accessible').textContent = `${groups.join(':')} ${time.period}`.trim();
  previousFace = faceKey;
  previousDigits = digits;
  previousStructure = structureKey;
}

function render(force = false) {
  const now = new Date();
  const zone = mainZone();
  const twelveHour = hour12();
  const time = timeAt(now, zone, twelveHour);
  renderFace(time, force, now, zone);
  const minuteKey = `${Math.floor(now.getTime() / 60000)}|${zone}`;
  if (force || minuteKey !== lastMainMinute) {
    const date = dateAt(now, zone, prefs.dateStyle);
    if (date !== lastDate || force) { $('date-display').textContent = date; lastDate = date; }
    const deviceCity = isDeviceCity(prefs, deviceZone);
    const city = prefs.cityName || zoneName(zone);
    $('place-name').textContent = prefs.zone ? city : zoneName(deviceZone);
    $('local-button').hidden = deviceCity;
    $('reset-zone').hidden = deviceCity;
    $('local-label').textContent = `Back to ${zoneName(deviceZone)}`;
    document.title = `${time.hour}:${time.minute}${time.period ? ` ${time.period}` : ''} | bareclock`;
    lastMainMinute = minuteKey;
  }
  if (force || minuteKey !== lastWorldMinute) {
    $('world-list').querySelectorAll('.world-tile').forEach((tile, index) => {
      const saved = prefs.cities[index];
      const worldTime = timeAt(now, saved.zone, twelveHour);
      tile.querySelector('.world-digits').textContent = `${worldTime.hour}:${worldTime.minute}`;
      tile.querySelector('.world-period').textContent = worldTime.period;
      tile.querySelector('.world-relative').textContent = relativeDay(now, saved.zone, zone);
      tile.querySelector('.world-select').setAttribute('aria-pressed', String(Boolean(prefs.zone) && sameCity({zone: prefs.zone, name: prefs.cityName, id: prefs.cityId}, saved)));
    });
    lastWorldMinute = minuteKey;
  }
}

function schedule() {
  clearTimeout(ticker);
  if (document.hidden) return;
  ticker = setTimeout(() => { render(); schedule(); }, nextTickDelay(Date.now(), prefs.seconds || prefs.style === 'halo'));
}

function cityLocation(city) {
  return [city.region, city.country].filter(Boolean).join(', ');
}

function commitCities() {
  save(); buildRail(); syncControls(); render(true);
}

function removeWorldCity(city, fromSettings = false) {
  const index = prefs.cities.findIndex(saved => sameCity(saved, city));
  if (index < 0) return;
  prefs.cities.splice(index, 1);
  commitCities();
  if (fromSettings) $('settings-add-world').focus();
  else ($('world-list').querySelector('.world-select') || $('world-button')).focus();
  notify(`Removed ${city.name}`);
}

function buildRail() {
  const list = document.createDocumentFragment();
  prefs.cities.forEach((city, index) => {
    const tile = el('div', 'world-tile');
    const select = el('button', 'world-select');
    select.title = `Show ${city.name} on the main clock${cityLocation(city) ? ', ' + cityLocation(city) : ''}`;
    select.setAttribute('aria-label', select.title);
    const time = el('span', 'world-time');
    time.append(el('span', 'world-digits'), el('small', 'world-period'));
    select.append(el('span', 'world-city', city.name), time, el('span', 'world-relative'));
    select.addEventListener('click', () => {
      prefs = swapWorldCity(prefs, city, deviceZone);
      commitCities();
      revealClock();
      const replacement = [...$('world-list').querySelectorAll('.world-select')][Math.min(prefs.cities.length - 1, index)];
      (replacement || $('world-button')).focus();
    });
    const remove = el('button', 'icon-button world-remove');
    remove.setAttribute('aria-label', `Remove ${city.name}`);
    remove.title = `Remove ${city.name}`;
    remove.append(icon('close'));
    remove.addEventListener('click', () => removeWorldCity(city));
    tile.append(select, remove);
    list.append(tile);
  });
  $('world-list').replaceChildren(list);
  buildSavedCities();
}

function buildSavedCities() {
  const list = document.createDocumentFragment();
  prefs.cities.forEach((city, index) => {
    const row = el('div', 'saved-city');
    const label = el('span', 'saved-city-name', city.name);
    label.title = [city.name, cityLocation(city)].filter(Boolean).join(', ');
    if (cityLocation(city)) label.append(el('small', '', cityLocation(city)));
    row.append(label);
    const actions = el('div', 'saved-actions');
    for (const [action, symbol, text] of [['up', 'up', `Move ${city.name} up`], ['down', 'down', `Move ${city.name} down`], ['remove', 'close', `Remove ${city.name}`]]) {
      const button = el('button', 'icon-button');
      button.setAttribute('aria-label', text);
      button.title = text;
      button.disabled = (action === 'up' && index === 0) || (action === 'down' && index === prefs.cities.length - 1);
      button.append(icon(symbol));
      button.addEventListener('click', () => {
        if (action === 'remove') { removeWorldCity(city, true); return; }
        const target = index + (action === 'up' ? -1 : 1);
        [prefs.cities[index], prefs.cities[target]] = [prefs.cities[target], prefs.cities[index]];
        commitCities();
        const nextAction = $('saved-cities').children[target] && $('saved-cities').children[target].querySelector('button:not(:disabled)');
        if (nextAction) nextAction.focus();
      });
      actions.append(button);
    }
    row.append(actions);
    list.append(row);
  });
  $('saved-cities').replaceChildren(list);
  $('saved-empty').hidden = prefs.cities.length > 0;
}

function openPicker(mode = 'add') {
  clearTimeout(workerIdleTimer);
  pickerMode = mode;
  cityLimit = 60;
  $('city-title').textContent = mode === 'main' ? 'Choose main city' : 'Add a city';
  $('city-search').value = '';
  $('city-dialog').showModal();
  renderCityResults();
  $('city-search').focus();
  showControls();
}

function directoryFailure() {
  directoryReady = false;
  if (cityWorker) cityWorker.terminate();
  cityWorker = null;
  const matches = searchCities(catalog, $('city-search').value);
  displayCityResults(matches.slice(0, 60), matches.length);
  $('city-search-status').textContent = "Couldn't load the full city list. You can still choose a timezone below.";
  $('city-show-more').hidden = true;
  $('city-retry').hidden = false;
}

function renderCityResults(append = false) {
  clearTimeout(searchDebounce);
  $('city-retry').hidden = true;
  const request = ++searchRequest;
  if (!append) { $('city-results').replaceChildren(); $('city-results').scrollTop = 0; }
  $('city-show-more').hidden = true;
  $('city-search-status').textContent = directoryReady ? 'Searching cities...' : 'Loading cities...';
  try {
    if (!cityWorker) {
      cityWorker = new Worker('./city-worker.js', { type: 'module' });
      cityWorker.addEventListener('message', ({ data }) => {
        if (data.id !== searchRequest || !$('city-dialog').open) return;
        if (data.error) { directoryFailure(); return; }
        directoryReady = true;
        displayCityResults(data.items, data.total);
        const total = data.total.toLocaleString();
        $('city-search-status').textContent = `${total} ${data.total === 1 ? 'place' : 'places'}${data.total > data.items.length ? ` · showing ${data.items.length.toLocaleString()}` : ''}`;
      });
      cityWorker.addEventListener('error', directoryFailure);
    }
    cityWorker.postMessage({ id: request, query: $('city-search').value, limit: cityLimit });
  } catch { directoryFailure(); }
}

function displayCityResults(matches, total) {
  const previousCount = $('city-results').children.length;
  const list = document.createDocumentFragment();
  matches.forEach(city => {
    const saved = prefs.cities.some(c => sameCity(c, city));
    const button = el('button', 'city-result');
    const label = el('span', '', city.name);
    label.append(el('small', '', cityLocation(city) || city.country));
    const action = pickerMode === 'main' ? 'Use' : saved ? 'Added' : '+';
    button.append(label, el('span', 'result-action', action));
    button.disabled = pickerMode === 'add' && saved;
    button.addEventListener('click', () => {
      if (pickerMode === 'main') selectZone(city);
      else {
        prefs.cities.push({ ...city });
        prefs.showWorld = true;
        commitCities();
      }
      $('city-dialog').close();
    });
    list.append(button);
  });
  if (!matches.length) list.append(el('p', 'no-results', 'No matches. Try a city, country, region, or timezone.'));
  $('city-results').replaceChildren(list);
  $('city-show-more').hidden = total <= matches.length;
  if (previousCount && matches.length > previousCount && cityLimit > 60) {
    const nextResult = $('city-results').children[previousCount];
    if (nextResult) nextResult.focus();
  }
}

function rememberOnboarding() {
  onboardingSeen = true;
  try { localStorage.setItem(onboardingKey, '1'); } catch {}
}

function syncOnboarding() {
  const steps = [...document.querySelectorAll('[data-onboarding-step]')];
  steps.forEach((step, index) => { step.hidden = index !== onboardingStep; });
  document.querySelectorAll('.progress-bars i').forEach((bar, index) => bar.classList.toggle('active', index <= onboardingStep));
  $('onboarding-progress').textContent = `${onboardingStep + 1} of ${steps.length}`;
  $('onboarding-back').hidden = onboardingStep === 0;
  $('onboarding-next').textContent = onboardingStep === steps.length - 1 ? 'Done' : 'Next';
}

function openOnboarding() {
  onboardingStep = 0;
  syncOnboarding();
  $('onboarding-dialog').showModal();
  $('onboarding-next').focus();
  showControls();
}

function finishOnboarding() {
  rememberOnboarding();
  $('onboarding-dialog').close();
}

function showControls() {
  $('app').classList.remove('idle');
  if (!prefs.autoHide) { clearTimeout(idleTimer); idleTimer = null; return; }
  idleDeadline = Date.now() + 4500;
  if (idleTimer) return;
  const checkIdle = () => {
    const remaining = idleDeadline - Date.now();
    if (remaining > 0) { idleTimer = setTimeout(checkIdle, remaining); return; }
    idleTimer = null;
    if (!document.querySelector('dialog[open],.chrome :focus-visible')) $('app').classList.add('idle');
  };
  idleTimer = setTimeout(checkIdle, 4500);
}

async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify("Fullscreen is unavailable. Use your browser's fullscreen control.");
  } catch { notify("Fullscreen did not open. Use your browser's fullscreen control."); }
}

function updateAwakeStatus(message) {
  $('awake-status').textContent = message || (wakeLock && !wakeLock.released ? 'Keeping the screen awake' : prefs.keepAwake ? 'Paused while this tab is hidden' : 'While this tab is visible');
}

async function syncWakeLock() {
  if (!('wakeLock' in navigator)) {
    $('keep-awake').disabled = true;
    updateAwakeStatus('Unavailable in this browser');
    return;
  }
  if (!prefs.keepAwake || document.hidden) {
    if (wakeLock) { const old = wakeLock; wakeLock = null; await old.release().catch(() => {}); }
    updateAwakeStatus();
    return;
  }
  if (wakeLock || wakePending) return;
  wakePending = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!prefs.keepAwake || document.hidden) { await lock.release(); return; }
    wakeLock = lock;
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null;
      updateAwakeStatus(prefs.keepAwake && !document.hidden ? 'Your device stopped this. Turn it off and on to try again.' : undefined);
    });
    updateAwakeStatus();
  } catch { updateAwakeStatus("Couldn't keep the screen awake. Check your device's power settings."); }
  finally { wakePending = false; }
}

$('help-button').addEventListener('click', openOnboarding);
$('about-button').addEventListener('click', () => { $('about-dialog').showModal(); showControls(); });
$('onboarding-back').addEventListener('click', () => { onboardingStep = Math.max(0, onboardingStep - 1); syncOnboarding(); });
$('onboarding-next').addEventListener('click', () => {
  const last = document.querySelectorAll('[data-onboarding-step]').length - 1;
  if (onboardingStep === last) finishOnboarding();
  else { onboardingStep += 1; syncOnboarding(); }
});
$('onboarding-dialog').addEventListener('close', rememberOnboarding);
$('settings-button').addEventListener('click', () => { $('settings-dialog').showModal(); showControls(); });
$('fullscreen-button').addEventListener('click', fullscreen);
$('world-button').addEventListener('click', () => prefs.cities.length ? update('showWorld', !prefs.showWorld) : openPicker());
$('add-world').addEventListener('click', () => openPicker());
$('settings-add-world').addEventListener('click', () => openPicker());
$('change-zone').addEventListener('click', () => openPicker('main'));
$('reset-zone').addEventListener('click', () => selectZone(null));
$('local-button').addEventListener('click', () => selectZone(null));
$('city-search').addEventListener('input', () => {
  cityLimit = 60;
  ++searchRequest;
  clearTimeout(searchDebounce);
  $('city-results').replaceChildren();
  $('city-show-more').hidden = true;
  $('city-search-status').textContent = 'Searching cities...';
  searchDebounce = setTimeout(() => renderCityResults(), 120);
});
$('city-show-more').addEventListener('click', () => { cityLimit += 60; renderCityResults(true); });
$('city-retry').addEventListener('click', () => renderCityResults());
$('city-dialog').addEventListener('close', () => {
  ++searchRequest;
  clearTimeout(searchDebounce);
  workerIdleTimer = setTimeout(() => { if (cityWorker) cityWorker.terminate(); cityWorker = null; directoryReady = false; }, 30000);
});
$('clock-size').addEventListener('input', event => update('clockSize', Number(event.target.value)));
for (const key of Object.keys(palettes.dark)) {
  const input = $(`color-${key}`);
  input.addEventListener('change', () => {
    const value = input.value.trim();
    if (!validColor(value)) { input.setCustomValidity('Use a six-digit hex color, such as #f5f5f7.'); input.reportValidity(); return; }
    input.setCustomValidity('');
    update('colors', { ...prefs.colors, [key]: value.toLowerCase() });
  });
  input.addEventListener('input', () => {
    input.setCustomValidity('');
    const value = input.value.trim();
    if (validColor(value)) update('colors', { ...prefs.colors, [key]: value.toLowerCase() });
  });
  input.addEventListener('blur', () => { input.value = displayColors(prefs)[key]; input.setCustomValidity(''); });
  $(`swatch-${key}`).addEventListener('input', event => update('colors', { ...prefs.colors, [key]: event.target.value }));
}
document.querySelectorAll('[data-theme-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.themeFilter;
  document.querySelectorAll('[data-theme-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelectorAll('[data-palette]').forEach(item => { item.hidden = filter !== 'all' && item.dataset.mode !== filter; });
  document.querySelectorAll('.theme-group').forEach(group => { group.hidden = !group.querySelector('[data-palette]:not([hidden])'); });
}));
$('reset-colors').addEventListener('click', () => update('colors', {}));
document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => update('clockSize', Number(button.dataset.size))));
$('reset-display').addEventListener('click', () => {
  const defaults = normalizePreferences(null);
  for (const key of ['style','theme','colors','controls','showHints','hourFormat','clockSize','weight','seconds','showDate','showCity','showPeriod','dateStyle','autoHide','tileSize']) prefs[key] = defaults[key];
  save(); syncControls(); render(true); schedule(); showControls();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('[data-setting]').forEach(button => button.addEventListener('click', () => update(button.dataset.setting, button.dataset.value)));
for (const [id, key] of [['seconds', 'seconds'], ['show-world', 'showWorld'], ['keep-awake', 'keepAwake'], ['show-date', 'showDate'], ['show-city', 'showCity'], ['show-period', 'showPeriod'], ['auto-hide', 'autoHide'], ['show-hints', 'showHints']]) $(id).addEventListener('change', e => update(key, e.target.checked));
for (const [id, key] of [['hour-format', 'hourFormat'], ['tile-size', 'tileSize'], ['digit-weight', 'weight'], ['date-style', 'dateStyle'], ['control-style', 'controls']]) $(id).addEventListener('change', e => update(key, e.target.value));
document.querySelectorAll('dialog').forEach(dialog => {
  let pointerDownOutside = false;
  const isOutside = e => { const r = dialog.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  dialog.addEventListener('pointerdown', e => { pointerDownOutside = isOutside(e); });
  dialog.addEventListener('click', e => { if (pointerDownOutside && isOutside(e)) dialog.close(); });
  dialog.addEventListener('close', showControls);
});
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  $('fullscreen-button').setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  $('fullscreen-button').replaceChildren(icon(active ? 'collapse' : 'expand'));
  showControls();
});
document.addEventListener('keydown', e => {
  showControls();
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.target.matches('input,select,textarea,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
  if (e.key.toLowerCase() === 'f') { e.preventDefault(); fullscreen(); }
  if (e.key.toLowerCase() === 's') { e.preventDefault(); $('settings-button').click(); }
  if (e.key.toLowerCase() === 'w') { e.preventDefault(); $('world-button').click(); }
});
document.addEventListener('pointermove', showControls, { passive: true });
document.addEventListener('pointerdown', showControls, { passive: true });
document.addEventListener('focusin', showControls);
function resume() { deviceZone = localZone(); render(true); schedule(); syncWakeLock(); showControls(); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) resume(); else { clearTimeout(ticker); clearTimeout(idleTimer); idleTimer = null; syncWakeLock(); } });
window.addEventListener('focus', resume);
window.addEventListener('pageshow', resume);
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  try { prefs = normalizePreferences(JSON.parse(event.newValue)); } catch { prefs = normalizePreferences(null); }
  buildRail(); syncControls(); resume();
});

// Reuse the actual digital renderer in its settings preview.
document.querySelector('.preview-digital').replaceChildren(digitalDigit('1'), digitalDigit('2'), el('span', 'preview-separator', ':'), digitalDigit('4'), digitalDigit('8'));
document.querySelectorAll('.style-preview').forEach(preview => preview.setAttribute('aria-hidden', 'true'));
buildThemes();
buildRail();
syncControls();
resume();
updateOfflineStatus();
if (!onboardingSeen) requestAnimationFrame(openOnboarding);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('./sw.js').then(async () => {
    await navigator.serviceWorker.ready;
    updateOfflineStatus();
  }).catch(() => {});
}
