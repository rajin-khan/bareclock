# bareclock: themes and identity

The name is bareclock, set lowercase with a terminal period in the visible wordmark. The short description is “A clock for your browser.” The live tab title retains the time first. The clock face stays free of credits; Settings carries the creator signature and attribution.

## Theme sources

The 24 themes comprise six essentials, four Catppuccin flavors, nine other community variants, and five original palettes. The app presents them only as bareclock themes. Palette values come from the references below; clock role mapping and preview implementation are original to this app. These are adaptations for a clock, not official endorsements or complete editor theme ports.

| Family | Source | Clock mapping |
| --- | --- | --- |
| Dracula | [Official palette](https://github.com/dracula/dracula-theme#color-palette-oss) | Background/current-line surfaces, purple digits, foreground supporting text |
| Catppuccin | [Official palette](https://catppuccin.com/palette/) | Base background, mauve digits, subtext1 details; surface0 dark tiles and mantle light tiles; standard text for tile digits |
| Nord | [Colors and palettes](https://www.nordtheme.com/docs/colors-and-palettes/) | Polar Night surfaces, Frost digits, Snow Storm details |
| Tokyo Night | [Night](https://github.com/folke/tokyonight.nvim/blob/main/lua/tokyonight/colors/night.lua) and [inherited Storm palette](https://github.com/folke/tokyonight.nvim/blob/main/lua/tokyonight/colors/storm.lua) | Night background, blue digits, fg_dark details, Storm tiles |
| Gruvbox | [Canonical palette](https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim) | Medium backgrounds, yellow dark digits and red light digits; supporting text from the neutral ramp |
| Rosé Pine | [Palette data](https://github.com/rose-pine/palette/blob/main/palette.json) | Main and Dawn backgrounds; rose/pine digits, readable subtle/text values |
| Solarized | [Canonical values](https://ethanschoonover.com/solarized/#the-values) | Base backgrounds; base1 dark digits and base01 light digits. Light details use base01 rather than base00; tile text uses base02 for small-text contrast |

The Originals group includes Ink, Canvas, Warm, Galaxy, and Komorebi. Some supporting text values are adjusted for small text on flat backgrounds. Each card shows the actual clock background, digit color, and supporting color.

All themes persist through the existing preference storage key, preserving users' saved world clocks and earlier custom colors. Removed signature display settings are ignored during normalization. A theme change suppresses color transitions; stored custom colors are applied in the document head to avoid a flash of the default palette.

## Contrast

The automated checks require at least 3:1 for the large clock on both plain and flip surfaces, and 4.5:1 for details and world-clock digits. Custom colors stay editable; a hint reports insufficient contrast. Settings follow the selected palette and use readable fallback colors when custom colors conflict.
