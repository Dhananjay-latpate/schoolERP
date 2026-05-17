# Clarity Design System

A calm, minimal design language for the school ERP — modeled on the restraint
of Apple's product surfaces. It is implemented as design tokens + component
classes in [`src/app/globals.css`](src/app/globals.css) and consumed by the UI
primitives in [`src/components/ui`](src/components/ui).

## Principles

1. **Generous whitespace.** Air is the primary layout tool; density is earned,
   never default.
2. **One accent.** A single confident blue (`--color-brand-royal`) carries
   every primary action, link and focus state. Everything else is neutral.
3. **Crisp hierarchy.** Type and spacing — not boxes and colour — separate one
   thing from the next.
4. **Quiet surfaces.** Soft, diffuse shadows and hairline borders. No
   decorative gradients, no noise.
5. **Consistent rhythm.** One spacing scale, one type scale, one motion curve.
6. **Accessible by default.** Visible keyboard focus, reduced-motion support,
   AA-contrast text colours.

## Tokens (CSS custom properties)

| Group | Tokens | Notes |
| --- | --- | --- |
| Brand | `--color-brand-royal` (accent `#0071e3`), `--color-brand-sky`, `--color-brand-sky-light`, `--color-brand-navy`/`-sapphire` (dark panels) | Re-brand a client by overriding `--color-brand-royal`. |
| Surfaces | `--color-surface-bg` `#f5f5f7`, `--color-surface-card`, `--color-surface-border`, `--color-surface-muted`, `--color-surface-divider`, `--color-surface-overlay` | |
| Text | `--color-text-primary` `#1d1d1f`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`, `--color-text-link` | |
| Status | `--color-status-success` / `-warning` / `-error` / `-info` | Plus `*-light` brand washes for badge / callout fills. |
| Radii | `--radius-xs` 6 · `--radius-sm` 10 · `--radius-md` 12 · `--radius-lg` 16 · `--radius-xl` 22 · `--radius-2xl` 28 · `--radius-full` | `sm` = controls, `md` = callouts, `lg` = cards. |
| Elevation | `--shadow-xs/sm/card/raised/modal`, `--shadow-glow*` (focus rings) | Soft and diffuse. |
| Motion | `--ease-brand`, `--ease-bounce`, `--duration-fast` 130ms / `-normal` 220ms / `-slow` 340ms | |
| Type | `--font-sans` (Inter) | 15px base, line-height 1.6, `-0.021em` heading tracking. |

All colour/radius/shadow tokens are also registered with Tailwind v4 via
`@theme inline`, so they're available as utilities (`bg-surface-card`,
`text-text-secondary`, `border-surface-border`, `rounded-lg`, …).

## Component classes

- **Buttons** — `.btn-primary` (accent blue — the main action),
  `.btn-secondary` (white + hairline), `.btn-ghost` (chromeless), `.btn-danger`,
  `.btn-pay` (large accent CTA for payment flows). Sizes: `.btn-sm` / `.btn-lg`.
  Full width: `.btn-block`. → use the [`Button`](src/components/ui/Button.tsx)
  component.
- **Surfaces** — `.card`, `.card-interactive` (hover lift), `.card-raised`,
  `.card-accent` (thin accent keyline), `.card-glass` (sticky headers),
  `.card-premium`, `.panel-inset` (quiet inset region).
- **Forms** — `.input-base` (shared by [`Input`](src/components/ui/Input.tsx),
  [`Select`](src/components/ui/Select.tsx),
  [`Textarea`](src/components/ui/Textarea.tsx)) + `.input-error`. Field error
  text uses `.form-error`. Labels via [`Label`](src/components/ui/Label.tsx).
- **Callouts** — `.callout` + `.callout-info` / `-success` / `-warning` /
  `-error`. One shared inline-notice block; compose with flex utilities for an
  icon + copy layout.
- **Badges** — `.badge-base` + `.badge-info` / `-success` / `-warning` /
  `-error` / `-violet` / `-muted`. → [`Badge`](src/components/ui/Badge.tsx).
  Inline indicators: `.status-dot` (+ `-success`/`-warning`/`-error`/`-info`).
- **Steppers** — `.step-item` / `.step-icon` (+ `-active` / `-done` /
  `-inactive`); add `.steps-on-light` on the wrapper for light surfaces.
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

Override the brand accent once (e.g. in a wrapper or `:root`):

```css
:root {
  --color-brand-royal: #6d28d9;   /* client primary */
  --color-brand-sky: #8b5cf6;
  --color-brand-sky-light: #f1ecfd;
}
```

Buttons, links, focus rings, badges, steppers and accents all follow. Keep the
neutral surface/text tokens unless the client truly needs a different canvas.
