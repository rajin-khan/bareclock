# Browser clock brief

## Confirmed from the initial brief

- Open a browser tab and immediately see the time and date.
- Support both normal window viewing and user-initiated fullscreen.
- Prioritize simplicity, speed, efficiency, legibility, and tasteful visual design.
- Provide settings for choosing clock styles.
- Include flip, simple, and digital clock concepts. Their visual definitions were resolved in the accepted decisions below.
- Use a plain background color for now.
- Offer optional, small world clocks on the right, with customization of their arrangement.

## Interview status

The interview is complete. All recommendations were accepted across three rounds. Implementation is authorized.

## Accepted decisions

- Desktop is the primary target, with a usable mobile layout. World clocks move below the main clock on narrow screens.
- Initial clock styles are clean typography, mechanical flip, and segmented digital. Clean typography is the default. Analog is outside the initial scope.
- Default appearance uses warm off-white digits on near-black. A light option is available, with generous empty space and restrained controls.
- The main clock follows the device timezone by default, with a selectable override.
- Both 12-hour and 24-hour time are supported. Seconds are off initially.
- A small date accompanies the time, for example “Friday, 4 September.” Display preferences apply across clock styles.
- World clocks are added through a searchable city picker. The rail starts empty and scrolls when needed.
- Clicking a world clock swaps it with the main clock, as revised below.
- Each world clock shows city and time, plus yesterday or tomorrow when its date differs from the main clock.
- World clocks can be added, removed, and reordered. The rail can be hidden, with compact and comfortable tile sizes.
- The rail stays on the right on desktop. Free positioning is outside the initial scope.
- Preferences are saved in this browser. No account or cross-device sync is needed.
- The app can reopen offline after its first successful load.
- An optional keep-screen-awake setting supports extended viewing.
- Controls fade after inactivity and return on pointer movement, touch, or keyboard interaction.

## Final accepted decisions

- Settings open in a small panel over the clock and changes apply immediately.
- Initial hour format follows the device locale, with a manual override.
- Fullscreen preserves the layout. A separate control hides the world clock rail.
- Selecting a world clock exchanges it with the previous main city in the rail. Use device timezone returns the main clock to the device timezone.
- Dark/light appearance, clock style, hour format, seconds, and rail controls form the initial customization set, expanded in the later revision below.
- Clock sizing is responsive with a user-adjustable size, as revised below.
- Custom fonts, color pickers, backgrounds, alarms, timers, and weather are outside the first version.

No product decisions remain open.

No architectural decision records are warranted yet.

## Implementation

The first version is implemented as a static browser app. Run and verification details are in README.md.

## Accepted visual revision

- Remove decorative dots. Keep steady colons between hour, minute, and second groups. Colons must not blink.
- Remove “local time” labels from the interface. Show only the city above the main clock and expose device timezone reset when needed.
- Use Apple system typography, heavier and larger time digits, larger date/city labels, and a neutral monochrome palette for distance readability.

## Expanded cities and customization

- Use a much larger city directory. The implementation bundles 235,669 GeoNames populated places with region, country, aliases, and timezone data.
- Preserve different city identities even when they share a timezone.
- Clicking a world clock swaps it with the main clock. The previous main city, including the device's city, moves into that slot.
- Put a removal control directly on each tile, retaining removal and reordering in settings.
- Reduce the default clock size to 80%, with a 55–100% slider and Small, Medium, and Large presets.
- Add digit weight, date style, date/city/AM-PM visibility, control auto-hide, and a display reset.
- Use “bareclock.” as the product wordmark.
- Keep the linked “Rajin Khan” signature inside Settings, small and subtle, using La Belle Aurore and linking to https://rajinkhan.com.


## Watch-face expansion

The final style set is Simple, Flip, Digital, Dial, Stack, Halo, Horizon, and World. They apply watch-face and StandBy principles such as glanceability, distance readability, large medium-weight numerals, low-detail hierarchy, restrained motion, atmospheric color, and a schematic day-side world map without copying Apple face names or complications.

## First-run experience and launch polish

- Show a five-step introduction only on first use, then keep it available from the lower-left question mark.
- Give offline use its own introduction step and explain that the full city directory becomes available offline after the picker loads once.
- Keep all credits in Settings, with short labels and custom geometric icons rather than an icon library.
- Ship an About page, canonical metadata, structured data, crawler files, an install manifest, app icons, and HTML-authored Open Graph image sources.
