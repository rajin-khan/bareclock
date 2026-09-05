import { normalizeColors } from './appearance.js';

const formatters = new Map();
const offsetFormatters = new Map();
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function formatter(zone, kind, hour12 = false) {
  const key = `${zone}|${kind}|${hour12}`;
  if (!formatters.has(key)) {
    const options = kind === 'date' || kind === 'date-short'
      ? { weekday: kind === 'date' ? 'long' : 'short', day: 'numeric', month: kind === 'date' ? 'long' : 'short' }
      : kind === 'day'
        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
        : { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: hour12 ? 'h12' : 'h23' };
    formatters.set(key, new Intl.DateTimeFormat('en-GB', { ...options, timeZone: zone, calendar: 'gregory', numberingSystem: 'latn' }));
  }
  return formatters.get(key);
}

export function localZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function validZone(zone) {
  if (typeof zone !== 'string' || zone.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
}

export function uses12Hours(format, locale) {
  if (format === '12') return true;
  if (format === '24') return false;
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
}

export function timeAt(now, zone, hour12) {
  const parts = Object.fromEntries(formatter(zone, 'time', hour12).formatToParts(now).map(p => [p.type, p.value]));
  return { hour: parts.hour.padStart(2, '0'), minute: parts.minute, second: parts.second, period: parts.dayPeriod ? parts.dayPeriod.toUpperCase() : '' };
}

export function dateAt(now, zone, style = 'full') {
  const kind = style === 'numeric' ? 'day' : style === 'short' ? 'date-short' : 'date';
  const p = Object.fromEntries(formatter(zone, kind).formatToParts(now).map(p => [p.type, p.value]));
  if (style === 'numeric') return `${p.year}-${p.month}-${p.day}`;
  return `${p.weekday}, ${p.day} ${p.month}`;
}

export function calendarDates(now, zone) {
  const today = dateAt(now, zone, 'numeric');
  const center = new Date(`${today}T12:00:00Z`);
  const label = new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', timeZone: 'UTC' });
  return Array.from({ length: 31 }, (_, index) => {
    const date = new Date(center);
    date.setUTCDate(date.getUTCDate() + index - 15);
    const parts = Object.fromEntries(label.formatToParts(date).map(part => [part.type, part.value]));
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: parts.weekday, month: parts.month };
  });
}

function calendarDay(now, zone) {
  const p = Object.fromEntries(formatter(zone, 'day').formatToParts(now).map(p => [p.type, p.value]));
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86400000;
}

export function relativeDay(now, zone, mainZone) {
  const days = calendarDay(now, zone) - calendarDay(now, mainZone);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `${days} days ahead` : `${-days} days behind`;
}

export function nextTickDelay(now, seconds) {
  const interval = seconds ? 1000 : 60000;
  return interval - (now % interval) + 20;
}

export function zoneOffsetMinutes(now, zone) {
  let current = offsetFormatters.get(zone);
  if (!current) {
    current = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    offsetFormatters.set(zone, current);
  }
  const parts = Object.fromEntries(current.formatToParts(now).map(part => [part.type, part.value]));
  const wallAsUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  const utcToSecond = Math.floor(now.getTime() / 1000) * 1000;
  return Math.round((wallAsUTC - utcToSecond) / 60000);
}

const normalizeLongitude = longitude => ((longitude % 360 + 540) % 360) - 180;

export function solarMapGeometry(now, width = 1000, height = 500, step = 5) {
  const year = now.getUTCFullYear();
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = leap ? 366 : 365;
  const day = Math.floor((Date.UTC(year, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 + now.getUTCMilliseconds() / 3600000;
  const gamma = TAU / days * (day - 1 + (hour - 12) / 24);
  const equation = 229.18 * (.000075 + .001868 * Math.cos(gamma) - .032077 * Math.sin(gamma) - .014615 * Math.cos(2 * gamma) - .040849 * Math.sin(2 * gamma));
  const declination = .006918 - .399912 * Math.cos(gamma) + .070257 * Math.sin(gamma) - .006758 * Math.cos(2 * gamma) + .000907 * Math.sin(2 * gamma) - .002697 * Math.cos(3 * gamma) + .00148 * Math.sin(3 * gamma);
  const sunLongitude = normalizeLongitude((720 - hour * 60 - equation) / 4);
  const mapY = latitude => Math.max(0, Math.min(height, (90 - latitude) / 180 * height));
  const points = [];
  for (let x = 0; x <= width; x += step) {
    const longitude = x / width * 360 - 180;
    const hourAngle = normalizeLongitude(longitude - sunLongitude) * RAD;
    let latitude = Math.atan2(-Math.cos(declination) * Math.cos(hourAngle), Math.sin(declination));
    if (latitude > Math.PI / 2) latitude -= Math.PI;
    if (latitude < -Math.PI / 2) latitude += Math.PI;
    points.push([x, mapY(latitude * DEG)]);
  }
  if (points[points.length - 1][0] !== width) points.push([width, points[0][1]]);
  const terminator = points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const capY = declination >= 0 ? 0 : height;
  return {
    terminator,
    daylight: `${terminator}L${width} ${capY}L0 ${capY}Z`,
    sunLongitude,
    sunLatitude: declination * DEG,
    sunX: (sunLongitude + 180) / 360 * width,
    sunY: mapY(declination * DEG),
  };
}

export function sameCity(a, b) {
  if (a.id && b.id) return a.id === b.id;
  return a.zone === b.zone && a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

export function isDeviceCity(preferences, deviceZone) {
  if (!preferences.zone) return true;
  const canonical = zone => new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone;
  const deviceParts = deviceZone.split('/');
  const deviceName = deviceParts[deviceParts.length - 1].replace(/_/g, ' ').toLowerCase();
  return canonical(preferences.zone) === canonical(deviceZone) && (!preferences.cityName || preferences.cityName.trim().toLowerCase() === deviceName);
}

export function swapWorldCity(preferences, selected, deviceZone) {
  const preferredParts = preferences.zone ? preferences.zone.split('/') : [];
  const deviceParts = deviceZone.split('/');
  const current = {
    name: preferences.zone ? preferences.cityName || preferredParts[preferredParts.length - 1].replace(/_/g, ' ') : deviceParts[deviceParts.length - 1].replace(/_/g, ' '),
    zone: preferences.zone || deviceZone,
    ...(preferences.cityId ? { id: preferences.cityId } : {}),
    ...(preferences.cityRegion ? { region: preferences.cityRegion } : {}),
    ...(preferences.cityCountry ? { country: preferences.cityCountry } : {}),
  };
  const index = preferences.cities.findIndex(city => sameCity(city, selected));
  if (index < 0) return preferences;
  const local = isDeviceCity({ zone: selected.zone, cityName: selected.name }, deviceZone);
  return {
    ...preferences,
    zone: local ? null : selected.zone, cityName: local ? '' : selected.name, cityId: local ? '' : selected.id || '',
    cityRegion: local ? '' : selected.region || '', cityCountry: local ? '' : selected.country || '',
    cities: preferences.cities.flatMap((city, position) => position === index ? [current] : sameCity(city, current) ? [] : [city]),
  };
}

export function normalizePreferences(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const oneOf = (key, allowed, fallback) => allowed.includes(p[key]) ? p[key] : fallback;
  const cities = Array.isArray(p.cities) ? p.cities.filter(c => c && validZone(c.zone) && typeof c.name === 'string' && c.name.trim()).map(c => ({
    zone: c.zone, name: c.name.slice(0, 200),
    ...(typeof c.id === 'string' && c.id.length <= 100 ? { id: c.id } : {}),
    ...(typeof c.country === 'string' ? { country: c.country.slice(0, 100) } : {}),
    ...(typeof c.region === 'string' ? { region: c.region.slice(0, 200) } : {}),
  })) : [];
  return {
    style: oneOf('style', ['simple', 'flip', 'digital', 'dial', 'stack', 'halo', 'horizon', 'world'], 'simple'),
    theme: oneOf('theme', ['dark', 'light'], 'dark'),
    colors: normalizeColors(p.colors),
    controls: oneOf('controls', ['subtle', 'standard'], 'subtle'),
    showHints: p.showHints === true,
    hourFormat: oneOf('hourFormat', ['auto', '12', '24'], 'auto'),
    clockSize: typeof p.clockSize === 'number' && Number.isFinite(p.clockSize) ? Math.min(100, Math.max(55, p.clockSize)) : 80,
    weight: oneOf('weight', ['400', '550', '650'], '550'),
    showDate: p.showDate !== false,
    showCity: p.showCity !== false,
    showPeriod: p.showPeriod !== false,
    dateStyle: oneOf('dateStyle', ['full', 'short', 'numeric', 'cards'], 'full'),
    autoHide: p.autoHide !== false,
    seconds: p.seconds === true,
    zone: validZone(p.zone) ? p.zone : null,
    cityName: typeof p.cityName === 'string' ? p.cityName.slice(0, 200) : '',
    cityId: typeof p.cityId === 'string' ? p.cityId.slice(0, 100) : '',
    cityRegion: typeof p.cityRegion === 'string' ? p.cityRegion.slice(0, 200) : '',
    cityCountry: typeof p.cityCountry === 'string' ? p.cityCountry.slice(0, 100) : '',
    showWorld: p.showWorld !== false,
    tileSize: oneOf('tileSize', ['compact', 'large'], 'compact'),
    keepAwake: p.keepAwake === true,
    cities: cities.filter((city, index) => !cities.slice(0, index).some(previous => sameCity(city, previous))),
  };
}
