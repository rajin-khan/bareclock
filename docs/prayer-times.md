# Prayer-time sources and accuracy

Researched 5 October 2026. The implementation uses [AlAdhan's API](https://aladhan.com/prayer-times-api), with its [published OpenAPI specification](https://api.aladhan.com/v1/documentation/openapi/prayer-times/yaml) checked against a live Dhaka request.

## Source choice

| Source | What it provides | Fit for bareclock |
| --- | --- | --- |
| [AlAdhan](https://aladhan.com/prayer-times-api) | Worldwide city, address, and coordinate requests; calculation methods, Asr school, adjustments, and date ranges | Chosen. A direct browser request works without an API key or backend. One daily request is sufficient. |
| [Adhan.js by Batoul Apps](https://github.com/batoulapps/adhan-js) | Astronomical calculations on the device, with methods, schools, and timezone-aware output | A good offline alternative, but would add a library and require coordinates that this app's directory currently omits. |
| [PrayTimes](https://praytimes.org/calculation) | Calculation formulas, method definitions, and high-latitude rules | Useful for understanding the differences. Reimplementing astronomy is unnecessary for this feature. |
| A local mosque or government authority | The timetable followed by that community, including local adjustments and congregation times | Best reference when matching a specific community. There is no single worldwide local-authority feed in this implementation. |

## Accuracy depends on the convention

Prayer times depend on geographic position and the date. Fajr and Isha vary with the chosen twilight angles or fixed intervals. Hanafi Asr uses a different shadow rule from standard Asr. Higher latitudes can require an additional convention when ordinary twilight calculations are unavailable. [PrayTimes explains these calculations](https://praytimes.org/calculation).

AlAdhan recommends the authority closest to the location and explains why its calculated times can differ from local timetables. Selecting a provider alone does not guarantee a match. The app uses AlAdhan's location default and displays the response's method and school in Settings. It does not calculate or adjust prayer times. [AlAdhan's method guidance](https://aladhan.com/calculation-methods) explains these differences.

The default method is selected by AlAdhan for the supplied city address. The request omits `method`, `school`, `latitudeAdjustmentMethod`, and `tune`, leaving these choices to the source. No regional Asr guess or minute adjustment is applied.

These are prayer start times, not mosque iqamah times. AlAdhan is not an official feed from every local authority. Matching a particular mosque or government timetable would require that authority's verified data, rather than adding offsets to this feed. City-level geocoding represents the selected city, not the user's precise position, elevation, or horizon. A city and its country/region are sent to AlAdhan only when the feature is enabled. No device geolocation permission is requested.

## Daily request and cache

The endpoint is `GET /v1/calendarByAddress/from/{DD-MM-YYYY}/to/{DD-MM-YYYY}`. The app sends only the city address, IANA timezone, and `iso8601=true`. The source specification documents these parameters.

One request covers yesterday through tomorrow. Yesterday handles a late Isha after midnight; tomorrow supplies the exact next Fajr after today's Isha. The response is checked for every requested date, five valid timestamps, and chronological order. Missing or unusable values produce an error instead of guessed times.

The cache key includes the main city's local date and the city address and timezone. Reloads and repeated ticks reuse the saved result. A new local day refreshes once; changing the city makes a new request if that combination is not already cached. The current-prayer highlight uses cached timestamps and does not fetch at prayer transitions. Failed requests stop until Retry, reconnection, or a new local date. Requests time out after 15 seconds.

All five prayers remain visible in an open strip with sun and moon symbols. The current prayer has stronger typography, an orbit around its symbol, and a Now label. The highlight follows the latest start time until the next prayer starts, including Isha overnight until Fajr. The next prayer appears separately in the header. At overnight boundaries, entries from adjacent days retain their original source timestamps; tomorrow's Fajr has a Tomorrow label. This is a display progression through the published start times, not a calculation of religious deadlines.

The clock and cached current-day prayer times remain usable offline. A fresh date requires the service. Browser storage clearing or eviction removes the cache; blocked storage limits reuse to the current page session.
