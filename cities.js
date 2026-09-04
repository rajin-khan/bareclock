// Friendly search aliases supplement the browser's own IANA timezone list.
const featured = [
  ['Dhaka', 'Bangladesh', 'Asia/Dhaka', 'Dacca'],
  ['London', 'United Kingdom', 'Europe/London', 'UK Britain'],
  ['New York', 'United States', 'America/New_York', 'NYC USA US'],
  ['Tokyo', 'Japan', 'Asia/Tokyo', ''],
  ['Paris', 'France', 'Europe/Paris', ''],
  ['Dubai', 'United Arab Emirates', 'Asia/Dubai', 'UAE'],
  ['Singapore', 'Singapore', 'Asia/Singapore', ''],
  ['Sydney', 'Australia', 'Australia/Sydney', ''],
  ['Los Angeles', 'United States', 'America/Los_Angeles', 'LA USA US'],
  ['Chicago', 'United States', 'America/Chicago', 'USA US'],
  ['Denver', 'United States', 'America/Denver', 'USA US'],
  ['Toronto', 'Canada', 'America/Toronto', ''],
  ['Vancouver', 'Canada', 'America/Vancouver', ''],
  ['Mexico City', 'Mexico', 'America/Mexico_City', ''],
  ['São Paulo', 'Brazil', 'America/Sao_Paulo', 'Sao Paulo'],
  ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires', ''],
  ['Berlin', 'Germany', 'Europe/Berlin', ''],
  ['Madrid', 'Spain', 'Europe/Madrid', ''],
  ['Rome', 'Italy', 'Europe/Rome', ''],
  ['Amsterdam', 'Netherlands', 'Europe/Amsterdam', ''],
  ['Istanbul', 'Türkiye', 'Europe/Istanbul', 'Turkey'],
  ['Kyiv', 'Ukraine', 'Europe/Kyiv', 'Kiev'],
  ['Moscow', 'Russia', 'Europe/Moscow', ''],
  ['Cairo', 'Egypt', 'Africa/Cairo', ''],
  ['Lagos', 'Nigeria', 'Africa/Lagos', ''],
  ['Nairobi', 'Kenya', 'Africa/Nairobi', ''],
  ['Johannesburg', 'South Africa', 'Africa/Johannesburg', ''],
  ['Riyadh', 'Saudi Arabia', 'Asia/Riyadh', ''],
  ['Tehran', 'Iran', 'Asia/Tehran', ''],
  ['Karachi', 'Pakistan', 'Asia/Karachi', ''],
  ['New Delhi', 'India', 'Asia/Kolkata', 'Delhi'],
  ['Kathmandu', 'Nepal', 'Asia/Kathmandu', 'Katmandu'],
  ['Colombo', 'Sri Lanka', 'Asia/Colombo', ''],
  ['Bangkok', 'Thailand', 'Asia/Bangkok', ''],
  ['Jakarta', 'Indonesia', 'Asia/Jakarta', ''],
  ['Hong Kong', 'Hong Kong', 'Asia/Hong_Kong', ''],
  ['Shanghai', 'China', 'Asia/Shanghai', ''],
  ['Taipei', 'Taiwan', 'Asia/Taipei', ''],
  ['Seoul', 'South Korea', 'Asia/Seoul', ''],
  ['Manila', 'Philippines', 'Asia/Manila', ''],
  ['Perth', 'Australia', 'Australia/Perth', ''],
  ['Adelaide', 'Australia', 'Australia/Adelaide', ''],
  ['Melbourne', 'Australia', 'Australia/Melbourne', ''],
  ['Auckland', 'New Zealand', 'Pacific/Auckland', ''],
  ['Honolulu', 'United States', 'Pacific/Honolulu', 'Hawaii'],
  ['UTC', 'Coordinated Universal Time', 'UTC', 'GMT'],
];

function canonical(zone) {
  try { return new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone; } catch { return null; }
}

export function zoneName(zone) {
  const parts = zone.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

export function cityCatalog() {
  const seen = new Set();
  const result = [];
  for (const [name, country, zone, aliases] of featured) {
    const key = canonical(zone);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push({ name, country, zone: key, aliases });
    }
  }
  const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [];
  for (const zone of zones) {
    const key = canonical(zone);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push({ name: zoneName(zone), country: zone.split('/').slice(0, -1).join(' / ').replace(/_/g, ' '), zone: key, aliases: '' });
    }
  }
  return result;
}

export function searchCities(catalog, query) {
  const clean = str => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ').toLowerCase();
  const words = clean(query).trim().split(/\s+/).filter(Boolean);
  return catalog.filter(c => words.every(w => clean(`${c.name} ${c.country} ${c.zone} ${c.aliases}`).includes(w)));
}
