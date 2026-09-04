# Testing

Run the automated checks with Node.js 22 or newer:

```sh
node --test tests/*.test.js
```

GitHub Actions runs them on Node.js 22 and 24. The suite covers time and date boundaries, daylight saving changes, fractional offsets, saved preferences, city identity and search, clock swaps, solar geometry, theme contrast, and public metadata and images.

## Browser checks

For UI or runtime changes, check the affected flows through the local server:

- Open each affected face with seconds on and off. Check that the displayed time advances and the date fits.
- Check desktop, narrow portrait, and short landscape layouts with world clocks visible.
- Switch between a dark and light theme, then try custom colors. Settings, search, and help should remain readable.
- Add, swap, remove, and reorder cities. Swapping back to the device city should remove the return control.
- Navigate dialogs by keyboard, including Escape and focus returning to the opener. Check reduced motion.
- Reload to verify saved preferences. Check the introduction in a fresh browser profile, then verify it stays closed on later visits and opens from the question mark.
- After a successful load, go offline and reload. After loading the city picker once, check offline search too.
- Check fullscreen and screen wake lock where supported. An unavailable API should leave the clock usable.
- For Halo, check that the ring advances with seconds even when numeric seconds are hidden, including the reset at the minute boundary.

Use browser developer tools to unregister the service worker when testing uncached assets. Before a release, test once with the service worker active so caching does not hide a missing asset or stale file.

## Current verification limits

The initial browser checks covered all eight faces, desktop and resized mobile layouts, themes, city swaps, first-use help, and offline reopening. Physical mobile devices, obsolete browser engines, and a successful screen wake lock grant have not been verified. Modern browsers are the supported baseline.
