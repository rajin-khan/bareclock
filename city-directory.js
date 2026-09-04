// Pure indexing/search functions shared by the worker and regression tests.
export function cleanSearch(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_/.,'-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildDirectory(data) {
  const countryAliases = { GB: 'UK Britain England Scotland Wales', US: 'USA America', AE: 'UAE', KR: 'Korea', TR: 'Turkey Turkiye' };
  const zones = data.zones.map(zone => {
    try { return new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone; } catch { return null; }
  });
  const regions = data.regions.map(([code, region]) => ({
    country: data.countries[code] || code,
    region,
    search: cleanSearch(`${region} ${data.countries[code] || code} ${code} ${countryAliases[code] || ''}`),
  }));
  const entries = [];
  for (const [id, name, regionIndex, zoneIndex, aliases] of data.cities) {
    if (!zones[zoneIndex]) continue;
    const region = regions[regionIndex];
    entries.push({
      city: { id: String(id), name, region: region.region, country: region.country, zone: zones[zoneIndex] },
      name: cleanSearch(name),
      aliases: aliases.split('\t').map(cleanSearch),
      search: cleanSearch(`${name} ${aliases} ${region.search} ${data.zones[zoneIndex]} ${zones[zoneIndex]}`),
    });
  }
  // Explicit UTC remains available even though it isn't a populated place.
  entries.push({ city: { id: 'utc', name: 'UTC', region: '', country: 'Coordinated Universal Time', zone: 'UTC' }, name: 'utc', aliases: ['gmt'], search: 'utc gmt coordinated universal time' });
  return entries;
}

export function searchDirectory(entries, query, limit = 60) {
  const normalized = cleanSearch(query);
  const words = normalized.split(' ').filter(Boolean);
  const buckets = [[], [], [], [], []];
  for (const entry of entries) {
    if (!words.every(word => entry.search.includes(word))) continue;
    const rank = !normalized ? 4 : entry.name === normalized ? 0 : entry.aliases.includes(normalized) ? 1 : entry.name.startsWith(normalized) ? 2 : words.every(word => entry.name.includes(word)) ? 3 : 4;
    buckets[rank].push(entry.city);
  }
  const all = buckets.flat();
  return { items: all.slice(0, limit), total: all.length };
}
