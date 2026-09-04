# bareclock: themes and identity

The name is bareclock, set lowercase with a terminal period in the visible wordmark. The short description is “A clock for your browser.” The live tab title retains the time first. The clock face stays free of credits; Settings carries the creator signature and attribution.

## Reading Rajin's products

Read the local implementations in Portfolio, README Stack, and Puffnotes before this pass:

- Portfolio's handwritten hero and footer use La Belle Aurore alongside restrained system typography. Neutral near-black backgrounds and clear spacing do most of the work.
- README Stack pairs Satoshi with a small La Belle Aurore footer signature rotated −2 degrees. Its off-white paper palette and compact controls keep the tool prominent.
- Puffnotes uses a “Created by” signature and has three distinct moods: Warm, Galaxy, and Komorebi. Its cream, blue-black, and teal/brown palettes provide useful color direction without needing to import its animated backgrounds.

bareclock keeps the reference subtle: a compact Settings credit, a direct portfolio link, quiet spacing, and a clock that remains the focus. Settings use the native system stack. No packages, external fonts, or background media were added.

Local references:

- `PORTFOLIO/astro@latest/src/pages/index.astro`, `src/components/footer.astro`, `src/assets/css/main.css`
- `README-STACK-MARQUEE/public/styles.css`, `public/index.html`
- `PUFF/puffnotes/src/lib/themeManager.js`, `src/components/marketing/WarmFooter.jsx`, `src/index.css`

## Theme sources

The 24 themes comprise six essentials, four Catppuccin flavors, nine other community variants, and five original palettes adapted from Rajin’s product work. The app presents them only as bareclock themes. Theme colors are facts taken from the palette references below; clock role mapping and preview implementation are original to this app. These are adaptations for a clock, not official endorsements or complete editor theme ports.

| Family | Source | Clock mapping |
| --- | --- | --- |
| Dracula | [Official palette](https://github.com/dracula/dracula-theme#color-palette-oss) | Background/current-line surfaces, purple digits, foreground supporting text |
| Catppuccin | [Official palette](https://catppuccin.com/palette/) | Base background, mauve digits, subtext1 details; surface0 dark tiles and mantle light tiles; standard text for tile digits |
| Nord | [Colors and palettes](https://www.nordtheme.com/docs/colors-and-palettes/) | Polar Night surfaces, Frost digits, Snow Storm details |
| Tokyo Night | [Night](https://github.com/folke/tokyonight.nvim/blob/main/lua/tokyonight/colors/night.lua) and [inherited Storm palette](https://github.com/folke/tokyonight.nvim/blob/main/lua/tokyonight/colors/storm.lua) | Night background, blue digits, fg_dark details, Storm tiles |
| Gruvbox | [Canonical palette](https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim) | Medium backgrounds, yellow dark digits and red light digits; supporting text from the neutral ramp |
| Rosé Pine | [Palette data](https://github.com/rose-pine/palette/blob/main/palette.json) | Main and Dawn backgrounds; rose/pine digits, readable subtle/text values |
| Solarized | [Canonical values](https://ethanschoonover.com/solarized/#the-values) | Base backgrounds; base1 dark digits and base01 light digits. Light details use base01 rather than base00; tile text uses base02 for small-text contrast |

The Originals group includes Ink, Canvas, Warm, Galaxy, and Komorebi. Their product references remain design provenance and do not appear in Settings. Some supporting text values are adjusted for small text on flat backgrounds. Each card shows the actual clock background, digit color, and supporting color.

All themes persist through the existing preference storage key, preserving users' saved world clocks and earlier custom colors. Removed signature display settings are ignored during normalization. A theme change suppresses color transitions; stored custom colors are applied in the document head to avoid a flash of the default palette.

## Contrast

The automated checks require at least 3:1 for the large clock on both plain and flip surfaces, and 4.5:1 for details and world-clock digits. Custom colors stay editable; a hint reports insufficient contrast. Settings use their own light/dark tokens so a custom low-contrast clock cannot obscure its settings.
