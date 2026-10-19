# Reader themes

The Modern design direction uses an editorial serif, a restrained violet accent, and a shared spacing rhythm. Eight built-in themes apply to every reader control and navigation panel; the source pages keep their original colors.

```ts
const book = createFlipbook(element, { source, theme: 'modern' });
book.setTheme('midnight');
book.on('themechange', (state) => console.log(state.theme));
```

| Theme             | Surface   | Text      | Accent    | Typography                       |
| ----------------- | --------- | --------- | --------- | -------------------------------- |
| Classic (default) | `#f9f7f1` | `#243c35` | `#9c3526` | System sans                      |
| Modern            | `#faf8fd` | `#231c30` | `#553f83` | IBM Plex Serif, Georgia fallback |
| Sepia             | `#f7eedc` | `#433125` | `#884326` | Georgia                          |
| Midnight          | `#25212e` | `#f1ecfa` | `#d4b6ff` | System sans                      |
| Ocean             | `#f2f9fc` | `#173b4a` | `#005c7a` | System sans                      |
| Forest            | `#f3f8ef` | `#243b2a` | `#326437` | System sans                      |
| Slate             | `#252b33` | `#f0f3f6` | `#9bcaff` | System sans                      |
| High Contrast     | `#000000` | `#ffffff` | `#ffe45c` | System sans                      |

No fonts are downloaded by the library. Hosts may self-host IBM Plex Serif; otherwise Modern uses Georgia. Reader body text is 14px, helper text 12px, and navigation headings 16px. Spacing uses 4/8/12/16/24/32px steps. Controls have distinct hover, pressed, current-page, disabled and focus-visible states; navigation controls are at least 40px high.

## Customize tokens

Pass typed overrides when embedding; the same values also theme the lightbox header:

```ts
import { createFlipbook, type ThemeTokens } from 'folio3d';
const brand: Partial<ThemeTokens> = { accent: '#005a7a', font: 'Georgia, serif' };
const book = createFlipbook(element, { source, theme: 'ocean', themeOverrides: brand });
book.setTheme('forest'); // Keeps brand overrides.
book.setThemeOverrides({ paper: '#f1fafb' }); // Replaces the entire override map.
book.setThemeOverrides({}); // Restores scoped CSS and the selected preset.
```

Available tokens are `ink`, `paper`, `stage`, `muted`, `border`, `hover`, `accent`, and `font`. Values must be valid CSS colors or a CSS font-family for `font`. Unknown names and invalid values throw before changing appearance. Caller maps and `getState().themeOverrides` are copied. Preset/override changes emit `themechange` only when configuration changes, preserve the selected page, and do not rasterize document pages again.

Precedence is built-in preset, then host CSS, then JavaScript overrides. Clearing JavaScript overrides reveals host CSS again. Customization is per instance, with no storage or network requests added. Check your custom palette's contrast against both paper and stage surfaces.

Use scoped CSS after the distributed stylesheet. Keep matching tokens on a custom lightbox wrapper when customizing its header too.

```css
#catalog .folio3d {
  --folio-ink: #231c30;
  --folio-paper: #faf8fd;
  --folio-stage: #e8e3ef;
  --folio-muted: #62576f;
  --folio-border: #d3c9e1;
  --folio-hover: #ebe3f5;
  --folio-accent: #553f83;
  --folio-font: Georgia, serif;
}
```

Choose a built-in theme using `theme` or `setTheme`, then override tokens for a brand variant. Existing integrations default to Classic. Do not recolor document canvases, replace focus outlines with color alone, or use global `button` rules to theme a reader.

## Accessibility and review checks

- Keep text contrast at least 4.5:1; keep focus/current-page indicators at least 3:1 against adjacent surfaces.
- Tab to Browse and each navigation view; Escape closes the panel and returns focus. In a lightbox, a second Escape closes the reader.
- Paging thumbnails or removing a bookmark must retain visible keyboard focus.
- At 390px width, the toolbar wraps and the navigation panel stays within the reader. Long contents titles wrap.
- Empty contents and bookmark lists state what is missing. Failed thumbnails retain working page buttons.
- Test each theme with both image and PDF books, with reduced motion and in a lightbox.

“Browse”, “Contents”, “Bookmarks” and “Preview unavailable” are literal action/status labels. Avoid unexplained symbols as the only accessible name.
