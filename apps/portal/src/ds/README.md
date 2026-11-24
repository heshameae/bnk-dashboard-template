# Design system

The portal's look, in three files. Every page is built from these components and sets no colour, size or radius of its own, so a change here changes the whole portal.

| File | Holds |
|---|---|
| `tokens.css` | Every value: colour scales, semantic colours, type, space, radius, shadow, motion, layout sizes, and the dark theme. |
| `components.css` | The `ds-*` classes. Reads only semantic tokens. |
| `index.tsx` | The React components (`Button`, `LinkButton`, `Badge`, `Dot`, `Kbd`, `Field`, `Card`, `EmptyState`, `Avatar`, `Tabs`, `Segmented`, `Menu`, `Notice`, `PageHeader`, `SectionTitle`, `Dialog`) and the icon set (`Icon.*`, lucide). |

## Where the values came from

Measured off Vercel's dashboard on 2026-09-29: the gray scale, the 1px shadow borders, the 6px radius, the 36px controls, the 256px sidebar and the 56px topbar. Then made ours: Inter instead of Geist, with half the letter-spacing because Inter runs wider, and our blue as the brand accent.

## How to change it

| To change | Edit |
|---|---|
| The brand colour (links, focus ring, workspace mark) | `--ds-brand` in `tokens.css`, and its dark value |
| The primary button colour | `--ds-button-primary-bg` and `-hover` |
| The font | `--ds-font`, and the Google Fonts link in `index.html` |
| Corner roundness | `--ds-radius`, `--ds-radius-lg` |
| Dark mode | the `:root[data-theme='dark']` block. It redefines primitives only; everything else follows. |
| A component's look | its block in `components.css`, using tokens only |

## Rules

- A component reads semantic tokens (`--ds-text`, `--ds-bg-raised`, `--ds-border`), never a primitive (`--ds-gray-900`). Primitives are for `tokens.css` alone. This is what lets dark mode and a rebrand change one block.
- A raw hex or pixel value outside `tokens.css` is a bug, with two exceptions: `#fff` on a solid coloured fill, and 1px and 2px borders.
- Borders are drawn as `box-shadow`, so a border never shifts layout.
- Variants and sizes are `data-*` attributes (`data-variant="primary"`, `data-size="sm"`), not extra class names.
- Every name starts with `ds-`. The Model Explorer still uses its older tokens in `src/styles/tokens.css` until it moves onto these.
