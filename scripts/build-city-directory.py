"""Build the bundled GeoNames directory using only the Python standard library.

Usage: python3 scripts/build-city-directory.py cities500.zip admin1CodesASCII.txt countryInfo.txt
Source and attribution are recorded alongside the generated data.
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import zipfile

archive, admin_file, country_file = map(Path, sys.argv[1:4])
root = Path(__file__).resolve().parents[1]
countries = {}
for line in country_file.read_text().splitlines():
    if not line or line.startswith('#'):
        continue
    fields = line.split('\t')
    countries[fields[0]] = fields[4]
admins = {}
for line in admin_file.read_text().splitlines():
    fields = line.split('\t')
    admins[fields[0]] = fields[1]

regions, zones, rows = [], [], []
region_ids, zone_ids = {}, {}
with zipfile.ZipFile(archive) as source:
    for line in source.read('cities500.txt').decode('utf-8').splitlines():
        f = line.split('\t')
        if len(f) < 19 or not f[17] or not f[8]:
            continue
        region_key = f'{f[8]}.{f[10]}'
        if region_key not in region_ids:
            region_ids[region_key] = len(regions)
            regions.append([f[8], admins.get(region_key, '')])
        if f[17] not in zone_ids:
            zone_ids[f[17]] = len(zones)
            zones.append(f[17])
        aliases = list(dict.fromkeys([f[2], *f[3].split(',')]))
        aliases = [a for a in aliases if a and a.casefold() != f[1].casefold()]
        rows.append((int(f[14] or 0), [int(f[0]), f[1], region_ids[region_key], zone_ids[f[17]], '\t'.join(aliases)]))
rows.sort(key=lambda row: (-row[0], row[1][0]))
payload = {'countries': countries, 'regions': regions, 'zones': zones, 'cities': [row[1] for row in rows]}
data = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
output = root / 'data'
output.mkdir(exist_ok=True)
(output / 'cities.json').write_bytes(data)
(output / 'cities.json.gz').write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
metadata = {
    'source': 'https://download.geonames.org/export/dump/cities500.zip',
    'license': 'CC BY 4.0',
    'scope': 'GeoNames cities with population over 500 or administrative seats through PPLA4; records with a timezone',
    'cityCount': len(rows), 'countryCount': len({r[0] for r in regions}), 'timezoneCount': len(zones),
    'sourceSha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'jsonBytes': len(data), 'gzipBytes': (output / 'cities.json.gz').stat().st_size,
}
(output / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata, indent=2))
