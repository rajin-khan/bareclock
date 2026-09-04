# Visual polish review

Applied better-typography and better-ui to the requested clock revision.

## Typography and distance readability

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | styles.css:32, styles.css:53 | Thin Helvetica time at weight 200, smaller world times | System font stack, rounded display where available, weight 550, larger responsive digits | Clearer strokes and larger numerals for viewing at a distance |
| Medium | styles.css:31, styles.css:37 | Small tracked city label and small date | Natural-case city and larger date, both medium weight | More readable supporting information |

## Composition and restraint

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Low | index.html:46, app.js:165, styles.css:35 | Decorative dot markers and repeated local-time labels | City alone, steady colons between digit groups, device reset only when needed | Removes distractions requested by the user |
| Low | styles.css:60, styles.css:76 | Smaller flip/digital faces | Larger faces with auto side margins, separate AM/PM placement | Keeps the digit groups optically centered |
| Low | styles.css:2, styles.css:85 | Warm tinted palette and tighter panel corners | Neutral monochrome palette and softer panel corners | Consistent Apple-style appearance |

## Verification

- Browser checked simple, flip, and digital styles; seconds; dark/light appearance; settings; and a world clock.
- Checked the narrow mobile layout and restored the browser viewport afterward.
- DOM geometry confirmed horizontal fit and centered digital digits with seconds visible.
- Confirmed the rendered display stack and weight 550.
- No console errors or warnings reported. JavaScript syntax checks passed.
- Temporary test city removed; the user's light appearance and 12-hour preference restored.
- Not verified: physical viewing distance, physical mobile devices, and animation replay at 10% speed.

Approve for the inspected visual changes. No high-severity findings remain in this pass.

## Follow-up: return state, signature, controls, and colors

Applied better-ui and better-colors on 4 September 2026.

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | app.js, time.js | Back to Dhaka remained after returning through the rail | Device-city identity controls visibility; swapping back resumes device-time mode | A return action should disappear once its destination is already shown |
| Low | styles.css | 25px signature, 20px toolbar icons and visible shortcut hints | 12px subdued signature, 16px toolbar icons, hints off by default | Keeps emphasis on the clock, as requested |
| Medium | appearance.js, app.js, index.html, styles.css | Only dark/light colors | Six presets, five custom color roles, separate settings colors, adapting control color and contrast feedback | Display customization must leave settings usable |

Measured preset contrast against the actual page/tile pairs: light time 15.46:1, light details 5.49:1, light tile time 14.15:1; dark time 18.29:1, dark details 7.74:1, dark tile time 16.62:1. All six presets meet 3:1 for large time and 4.5:1 for supporting text. Subtle controls range from 3.21:1 to 3.26:1 before idle fading. The signature is intentionally subdued at the user's request and is not intended as primary reading content.

Verified in the browser: Dhaka → Sylhet → Dhaka, disappearance of the return control, preservation of the rail city, 12px signature, signature size adjustment, light/dark preset appearance, live hex editing and reload persistence, theme reset, and mobile color controls. At the narrow viewport, page width and viewport were both 312px and the settings panel fit within 12px side margins. Temporary test city removed, light theme restored, viewport reset. All 21 automated tests pass.

Not verified: operating-system native color-picker dialog, physical mobile hardware, physical viewing distance, and animation replay at 10% speed. No new motion was added beyond the signature's opacity transition.

Approve for the inspected changes. No high-severity findings remain.

## Final launch pass

Applied the accessibility, layout, typography, color, and UI polish checks on 4 September 2026 to the complete clock, Settings, city picker, onboarding, About page, and responsive states.

- Added five distance-readable faces: Dial, Stack, Halo, Horizon, and World. World keeps the exact numeric time dominant over a low-detail day-side map.
- Added a first-use-only five-step native dialog. Keyboard focus, accessible names, progress text, Back/Next actions, Escape, reduced motion, and the persistent help entry were checked in the browser.
- Reworked Settings into short disclosures with custom geometric icons, balanced select padding, 24 theme previews, custom colors, and the La Belle Aurore credit at 15px.
- Checked the world face and offline introduction at desktop and narrow phone widths. Content remained visible and controls remained reachable.
- Rebalanced all eight faces across desktop, portrait phone, and phone landscape. Removed the fixed 480px mobile minimum that pushed dates below short viewports, and gave landscape world clocks a compact side rail.
- Swept all eight faces with seconds both on and off at desktop, portrait, and landscape sizes: all 48 geometry states stayed inside the viewport with no page overflow.
- Verified offline reopening for the clock, About page, and a previously loaded city directory.
- Verified canonical metadata, structured data, crawler files, exact 1200 × 630 social images, install icons, local links, JavaScript syntax, and 25 automated tests.

Not verified: physical-device viewing distance, a successful Wake Lock grant on hardware that permits it, or motion replay at 10% speed. No high-severity findings remain in the inspected surfaces.

## World, motion, theme, and runtime follow-up

Completed on 4 September 2026.

- World now draws a seasonal solar terminator and daylight area, calculated once per minute. Its timezone meridian follows the selected timezone's current UTC offset, including DST and fractional offsets. This is the timezone's reference meridian, not a city-coordinate or political timezone-boundary map.
- Horizon uses two slowly translating CSS gradient layers. Motion respects reduced-motion preferences and GPU promotion applies only while that face is selected.
- Help uses a horizontal desktop layout, compact landscape layout, and a vertical narrow-screen layout. Plain copy describes each feature directly. First-use behavior, later reopening, all five steps, and mobile fit were checked.
- Settings, city search, notices, and Help use the active palette and custom colors. Panel text keeps sufficient contrast when display colors conflict. Themes uses a custom paintbrush SVG.
- Live Simple, Digital, Dial, Stack, Halo, Horizon, and World faces update existing elements rather than rebuilding their SVG and text trees every second. Date, title, and city work is gated to minute or settings changes. Pointer activity extends one idle deadline rather than replacing a timeout for every event.
- Rounded map coordinates reduced the silhouette from 60,411 to 39,853 bytes. Added basic viewport and aspect-ratio fallbacks and guards around optional animation APIs. No packages or build step were added.
- Both social images were re-exported from their HTML pages as native 1200 by 630 PNGs with plain copy.

Verification: all 27 automated tests pass, including fractional UTC offsets, DST, and seasonal solar geometry. Browser checks confirmed that all eight faces tick with seconds on; London switches the meridian to UTC+01:00; returning to Dhaka restores UTC+06:00 and hides the return action; reload preserves preferences and keeps onboarding closed. Catppuccin Mocha and Latte panels, city search, Help, phone portrait, and landscape were inspected. No browser warnings or errors were reported.

Physical hardware, obsolete browser engines, and successful screen-wake-lock grants remain unverified. Modern browser support is the tested baseline; CSS and animation fallbacks improve older-browser behavior without adding a polyfill bundle.

Halo follow-up: changed the outer ring from minute progress to second progress. Halo schedules a second-aligned tick even with numeric seconds hidden, reuses its SVG, and resets without a reverse animation at :00. Browser inspection confirmed a changing ring with zero numeric-second elements, including the minute reset. Narrow Help was also checked at a 312 by 448 CSS-pixel viewport with no horizontal clipping.
