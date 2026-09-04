# City directory

Derived from [GeoNames cities500](https://download.geonames.org/export/dump/cities500.zip), [countryInfo](https://download.geonames.org/export/dump/countryInfo.txt), and [admin1CodesASCII](https://download.geonames.org/export/dump/admin1CodesASCII.txt). GeoNames data is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Downloaded 4 September 2026. This bundled extract contains 235,669 cities and towns in 246 countries and territories, with 394 source timezone identifiers. Coverage includes populated places over 500 people and administrative seats through level four, subject to GeoNames coverage. It does not claim every settlement on Earth.

Changes from the source: retain city ID, name, alternate names, country, first-level region, and timezone; exclude records without a country/timezone; order by reported population; dictionary-encode shared region/timezone strings; serialize as compact JSON and gzip. Coordinates and other unused source fields are omitted. The application also exposes UTC.

`metadata.json` records source checksum, coverage, and sizes. `cities.json.gz` is used by browsers supporting built-in gzip decompression. `cities.json` is a fallback. Both contain the same directory.

Rebuild with the Python standard library:

```sh
python3 scripts/build-city-directory.py /path/to/cities500.zip /path/to/admin1CodesASCII.txt /path/to/countryInfo.txt
```

Update `DIRECTORY_CACHE` in `sw.js` when replacing the data. The main clock does not download this directory. Opening the picker fetches it, and subsequent requests use the offline cache.
