# AfterBuy Design System

## Direction

AfterBuy uses a restrained indigo product language inspired by the supplied
design board. Surfaces are crisp and quiet, typography is platform-native, and
semantic color appears only for actions, selection, and deadline state. Premium
quality comes from alignment, density, and complete interaction states.

## Color

- Brand anchor: Indigo `#5B46F6`.
- Light canvas: cool near-white, with white primary surfaces and slate content.
- Dark canvas: near-black indigo-neutral, with tonal surfaces rather than heavy
  shadows.
- Success, warning, danger, and information colors use paired foreground and
  soft-surface roles. Never communicate status with hue alone.
- Body, supporting, and placeholder text must maintain WCAG AA contrast.

Components consume semantic theme roles. Raw colors belong only in
`src/theme/tokens.ts`, native app configuration, or brand assets.

## Typography

Use the platform system family: San Francisco on iOS, Roboto/system on Android,
and the native UI stack on web. Roles are `largeTitle`, `screenTitle`, `title`,
`sectionTitle`, `headline`, `body`, `subheadline`, `label`, and `caption`.
Respect system font scaling and allow wrapping except where truncation is
essential to preserve a control.

## Layout

- Base spacing unit: 4.
- Compact horizontal gutter: 20; expanded gutter: 24.
- Cards and grouped surfaces: 12-16 radius maximum.
- Buttons and fields: 10-14 radius; status chips may be pills.
- Compact navigation uses a four-destination bottom bar. Widths at 768 and
  above use a navigation rail and bounded or split content where useful.
- Prefer grouped rows and open canvas rhythm over nested cards.

## Components

- Buttons: primary, secondary, tertiary, and danger; each supports pressed,
  focused, disabled, and busy states.
- Inputs: visible label, AA placeholder, focus ring, hint/error text, and native
  keyboard semantics.
- Segmented control: compact single-choice navigation with accessible selected
  state; native-feeling geometry on each platform.
- Status pill: neutral, accent, success, warning, or danger with text/icon cue.
- Deadline card: label, date, remaining-time state, and optional next action.
- Lists: full-width grouped rows with consistent leading artwork, metadata,
  trailing status, and platform iconography.
- Feedback: skeleton for loading, instructive empty state, snackbar/toast for
  transient feedback, native alert for interruptive decisions.

## Motion

Motion is quiet and purposeful. Press feedback is immediate; state changes use
120-220ms ease-out transitions; navigation follows platform conventions. Honor
Reduce Motion by removing scale and large spatial movement.

## Screen Hierarchy

Home is attention-first, followed by capture shortcuts and recent purchases.
Purchase detail uses `Details`, `Receipts`, `Protection`, and `Activity` sections.
Protection contains return windows, warranty, and claims. Activity contains
delivery and reminder history. Existing deep links remain valid.

## Quality Bar

Verify compact iOS, compact Android, tablet, and web widths in both themes,
with large text and reduced motion. No clipped controls, fabricated content,
unlabeled icon actions, raw screen-level colors, or decorative card grids.
