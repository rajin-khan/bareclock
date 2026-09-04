# Architecture

bareclock is a static site with no build step or executable dependencies. Serve the repository root over HTTP for development or HTTPS for public use.

## Files

| File | Responsibility |
| --- | --- |
| `index.html`, `styles.css` | Clock, settings, city picker, About modal, and help |
| `app.js` | UI events, clock faces, scheduling, and browser APIs |
| `time.js` | Timezones, dates, preferences, clock swaps, and solar geometry |
| `appearance.js` | Themes, custom colors, and contrast |
| `cities.js` | Small fallback city catalog |
| `city-directory.js`, `city-worker.js` | Full directory indexing and search |
| `data/` | Generated GeoNames directory and attribution |
| `sw.js` | Offline app and directory caches |
| `about/` | Public About page |
| `og/` | HTML sources and browser exporter for social images and icons |
| `tests/` | Tests using Node.js built-in modules |

## Time and rendering

The device clock supplies the current time. The browser's IANA timezone database supplies local offsets and daylight saving rules. No location request or time API is involved.

One timeout aligns updates to the next minute, or second when seconds are visible or Halo is selected. Hidden tabs pause updates and reread the clock when shown again. Live faces update existing text and SVG nodes. Flip animates only changed digits. Motion respects reduced-motion preferences.

The World face calculates the solar terminator once per minute. Its vertical line represents the selected timezone's current UTC offset, including daylight saving time. It is a reference meridian, not a city position or political timezone boundary.

## City search

The full directory loads only when the picker opens. Its gzip file is about 10.3 MB; browsers without built-in gzip decoding load the equivalent JSON. A worker indexes and searches the data, and the UI displays results in pages of 60. The worker is released 30 seconds after the picker closes.

If loading fails, the small bundled catalog remains available with a retry option. Saved cities retain their own identity even when several share a timezone. See [data sources and rebuilding](../data/README.md).

## Offline and updates

The service worker installs a complete set of core assets before activation. It keeps the city directory in a separate cache after the first search, so app updates do not redownload that data. Browser storage clearing or eviction removes offline copies.

Bump `CACHE` in `sw.js` when changing cached app files, and publish those files together. The new worker activates after installation; an already open tab needs a reload to use the new files. Bump `DIRECTORY_CACHE` only when replacing city data.

## Public URLs and social images

Canonical metadata currently targets `https://bareclock.vercel.app/`. If hosting at another domain, update `index.html`, `about/index.html`, `robots.txt`, `sitemap.xml`, and the expectations in `tests/static.test.js`. The app is intended to run at the domain root.

To regenerate social images, open `/og/index.html` or `/og/themes.html` through the local server, choose Render PNG, and save the download under `assets/og/`. The images must remain 1200 × 630 pixels. `/og/icon.html` provides the app icon source.

Social metadata is present in the initial HTML so crawlers do not need JavaScript. Both public pages declare a PNG image, its HTTPS URL, dimensions, and matching X card metadata. When replacing a social image, increment its `?v=` value in both pages and the static test expectations so crawlers can fetch a fresh image. Existing posts may retain a platform-cached preview until that platform fetches the page again.
