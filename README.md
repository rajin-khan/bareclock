# bareclock

A browser clock by Rajin Khan with eight clock styles: simple, mechanical flip, segmented digital, dial, stacked numerals, halo, horizon, and world map. Fullscreen, a searchable world clock rail, 24 themes, and adjustable display settings.

## Run

No dependencies or installation step. Use the existing Python runtime:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [the local clock](http://127.0.0.1:4173). With pnpm available, `pnpm dev` runs the same command. A hosted version needs a static HTTPS server; there is no build step.

## Use

- Settings apply immediately and persist in this browser.
- `F` toggles fullscreen, `S` opens settings, and `W` shows or hides world clocks. With no saved cities, `W` opens the picker.
- Escape closes the topmost dialog. Browser fullscreen can also be exited with Escape.
- Search cities, alternate spellings, countries, regions, or IANA timezone names. Use Show more cities to browse additional results.
- Click a world clock to swap it with the main clock. The previous main city, including the device's city, occupies that rail slot. A duplicate of the previous main city elsewhere in the rail is removed.
- Remove a city directly with the × on its tile, or in Settings. Reorder cities in Settings. Cities sharing a timezone are saved independently.
- Use device timezone restores automatic following of the device timezone.
- Swapping back to the device city also restores automatic device-time mode. The return control disappears once that city is already shown.
- Clock size ranges from 55% to 100%, with Small, Medium, and Large presets. The default is 80%. Choose regular, medium, or bold digits.
- More display options controls the date, date style, city name, AM/PM, and automatic hiding of controls. Seconds and 12/24-hour format have separate controls.
- Themes includes 24 visual previews, grouped into Essentials, Catppuccin, Community, and Originals. Filter by light or dark. The current theme is named in Settings and custom edits are labeled Custom. See [theme sources and design direction](docs/themes-and-brand.md).
- Custom colors provides color pickers and hex inputs for the background, time, date/city, tile background, and tile time. Settings, city search, Help, and notices follow the selected palette. Panel text and controls adapt when custom colors would make them hard to read. Low-contrast combinations show a reading hint. Light/Dark or Reset colors restores that theme's palette. Saved colors are applied before the first paint on reload.
- Controls default to a smaller, quieter appearance. More display options includes standard controls and keyboard hints.
- Reset display settings restores visual defaults while preserving the selected timezone and world clocks.
- World clocks move below the main clock on narrow screens.
- All creator and source credits live in Settings. A compact credit links to Rajin Khan’s portfolio. The clock display has no creator signature.

## Runtime and city data

The app reads the device clock and uses the browser's IANA timezone database. It does not request location or contact a time API. Accuracy depends on the device clock and the browser's timezone rules.

Live faces update their existing text and SVG nodes. The world map calculates its solar curve once per minute, and static labels update only when needed. One timeout aligns updates to a minute, or second when seconds are enabled or Halo is selected. The Halo ring tracks seconds through one lap per minute even when numeric seconds are hidden. Hidden tabs pause it; returning to the tab rereads the clock and device timezone. Flip animations run only when digits change and respect reduced motion. Time separators are steady, never blinking.

The directory contains 235,669 GeoNames cities and towns across 246 countries and territories. It includes populated places over 500 people and administrative seats through level four, subject to source coverage. See [source attribution and rebuild instructions](data/README.md).

The 10.3 MB compressed directory loads only when the picker opens. Parsing and searching run in a worker so they cannot block the clock. Results render in pages of 60. The worker is released 30 seconds after the picker closes. Browsers without built-in gzip decoding use the equivalent uncompressed JSON file. If the directory cannot load, the small bundled timezone picker remains available with an explicit status and retry action.

No executable dependencies, analytics, external runtime fonts, or external search requests. Search data and the signature font are bundled with the app.

## Offline and updates

The service worker caches the small app and signature font after the first successful load. The full city directory is cached after its first use and kept separately so visual updates do not require downloading it again. Browser storage clearing or eviction removes offline copies. Saved world clocks work without reopening the full directory.

For code updates, change `CACHE` in `sw.js` and deploy the app files together. The worker caches a complete release before activation. After installation, the new worker takes over; reload an open tab to use its new assets. Change `DIRECTORY_CACHE` only when updating the city data. The worker removes only its own obsolete app and directory caches.

Browser API references: [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [fullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API), and [screen wake lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## Verification

```sh
node --test tests/*.test.js
```

Twenty-seven tests cover time/date boundaries, daylight saving transitions, fractional offsets, delayed timers, locale defaults, invalid preferences, city identity, swaps and return state involving the device timezone, duplicate handling, expanded city coverage, alternate/native names, region/timezone search, pagination, solar geometry, timezone meridians, size validation, date formats, color persistence, theme identity, the eight clock styles, SEO assets, and palette/control contrast, including flip digits.

Browser verification covers the core clock, styles, appearance, mobile layout, fullscreen, persistence, city selection, and offline reopening. The preview browser declined screen wake lock, so the failure status was verified; successful keep-awake behavior on a granting device remains unverified. Mobile checks use a resized desktop browser rather than physical hardware.

## Planning

See the [product brief](docs/product-brief.md), [glossary](CONTEXT.md), and [visual polish review](docs/polish-review.md).
