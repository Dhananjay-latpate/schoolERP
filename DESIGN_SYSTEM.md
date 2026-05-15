# Resillix Design System — "Calm Operations"

A single, documented design language for the Resillix School ERP. It is
implemented as design tokens + component classes in
[`src/app/globals.css`](src/app/globals.css) and consumed by the UI
primitives in [`src/components/ui`](src/components/ui).

## Principles

1. **Content first.** Chrome recedes; data leads. No decorative noise.
2. **Neutral foundation.** Warm near-blacks on warm off-whites. Colour is used
   sparingly and only to carry meaning (status, focus, brand).
3. **Borders over shadows.** Surfaces are defined by 1px hairline borders.
   Elevation is reserved for true overlays — menus, modals, toasts.
4. **One brand accent.** Resillix teal (`--color-brand-royal`). Re-theme for a
   client by overriding the `--color-brand-*` tokens — nothing else changes.
5. **Consistent rhythm.** One spacing scale, one type scale, one motion curve.
6. **Accessible by default.** Visible keyboard focus, reduced-motion support,
   AA-contrast text colours.

## Tokens (CSS custom properties)

| Group | Tokens | Notes |
| --- | --- | --- |
| Brand | `--color-brand-royal` (accent), `--color-brand-sky`, `--color-brand-sky-light`, `--color-brand-navy`/`-sapphire` (dark panels) | Client-themeable. |
| Surfaces | `--color-surface-bg`, `--color-surface-card`, `--color-surface-border`, `--color-surface-muted`, `--color-surface-divider`, `--color-surface-overlay` | |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`, `--color-text-link` | |
| Status | `--color-status-success` / `-warning` / `-error` / `-info` | Plus `*-light` brand washes for badge fills. |
| Radii | `--radius-xs` 4 · `--radius-sm` 8 · `--radius-md` 10 · `--radius-lg` 14 · `--radius-xl` 20 · `--radius-2xl` 28 · `--radius-full` | `sm` = controls, `lg` = cards. |
| Elevation | `--shadow-xs/sm/card/raised/modal`, `--shadow-glow*` (focus rings) | Deliberately quiet. |
| Motion | `--ease-brand`, `--ease-bounce`, `--duration-fast` 120ms / `-normal` 200ms / `-slow` 320ms | |
| Type | `--font-sans` (Inter) | 15px base, line-height 1.55, `-0.018em` heading tracking. |

All colour/radius/shadow tokens are also registered with Tailwind v4 via
`@theme inline`, so they're available as utilities (`bg-surface-card`,
`text-text-secondary`, `border-surface-border`, `rounded-lg`, …).

## Component classes

- **Buttons** — `.btn-primary` (solid ink), `.btn-secondary` (white + hairline),
  `.btn-ghost` (chromeless), `.btn-danger`, `.btn-pay` (brand-accent CTA for
  payment flows). Sizes: `.btn-sm` / `.btn-lg`. Full width: `.btn-block`.
  → use the [`Button`](src/components/ui/Button.tsx) component.
- **Surfaces** — `.card`, `.card-interactive` (hover lift), `.card-raised`,
  `.card-accent` (thin brand keyline), `.card-glass` (sticky headers),
  `.panel-inset` (quiet inset region).
- **Forms** — `.input-base` (shared by [`Input`](src/components/ui/Input.tsx),
  [`Select`](src/components/ui/Select.tsx),
  [`Textarea`](src/components/ui/Textarea.tsx)) + `.input-error`.
  Labels via [`Label`](src/components/ui/Label.tsx).
- **Badges** — `.badge-base` + `.badge-info` / `-success` / `-warning` /
  `-error` / `-violet` / `-muted`. → [`Badge`](src/components/ui/Badge.tsx).
  Inline indicators: `.status-dot` (+ `-success`/`-warning`/`-error`/`-info`).
- **Steppers** — `.step-item` / `.step-icon` (+ `-active` / `-done` /
  `-inactive`); add `.steps-on-light` on the wrapper for light surfaces, omit
  it on dark `.sidebar-dark` panels.
- **Tables** — `.data-table` (uppercase muted header, hairline rows, hover).
- **Fees** — `.fee-card` / `.fee-row` / `.fee-total`.
- **Overlays** — `.overlay-backdrop` + `.modal-panel`.
- **Loading** — `.skeleton` (shimmer). Progress via
  [`Progress`](src/components/ui/Progress.tsx).
- **Brand** — `.brand-gradient`, `.sidebar-dark`, `.logo-mark`.

## Layout & typography helpers

`.page-shell` (centered max-w container with responsive gutters),
`.stack` / `.stack-tight` / `.stack-loose` (vertical rhythm), `.divider`,
`.eyebrow` / `.eyebrow-accent` (uppercase section labels), `.tabular-nums`,
`.text-balance`. Animations: `.animate-fade-in`, `.animate-rise`.

## Re-theming for a client

Override the brand tokens once (e.g. in a wrapper or `:root`):

```css
:root {
  --color-brand-royal: #1a4dad;   /* client primary */
  --color-brand-sky: #3b82f6;
  --color-brand-sky-light: #e8f0fe;
}
```

Buttons, links, focus rings, badges, steppers and accents all follow. Keep the
neutral surface/text tokens unless the client truly needs a different canvas.
