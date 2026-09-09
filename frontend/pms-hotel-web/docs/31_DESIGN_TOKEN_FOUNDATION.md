# 31 — Design Token Foundation

## Purpose

This document is the authoritative implementation handoff for the PMS Hotel Boutique Web Sprint 0 design-token foundation.

Source:
- Figma file key: `lGXGAZmQp30BtmzSri0Vwj`
- Figma collections:
  - `PMS / Primitives`
  - `PMS / Semantic`
- Typography source: local Figma Text Styles prefixed `PMS /`
- Effects source: local Figma Effect Style `PMS / Shadow / Card`

Figma node IDs and variable/style IDs are traceability only. They MUST NOT be used as runtime business IDs.

---

# 1. Core color primitives

These values were read directly from the Figma local variables.

| Figma variable | CSS variable | Value |
|---|---|---|
| `color/sage/700` | `--pms-color-sage-700` | `#586456` |
| `color/sage/600` | `--pms-color-sage-600` | `#6B7868` |
| `color/sage/500` | `--pms-color-sage-500` | `#7C8B78` |
| `color/sage/200` | `--pms-color-sage-200` | `#D9E2D4` |
| `color/sage/100` | `--pms-color-sage-100` | `#EDF1EA` |
| `color/sand/500` | `--pms-color-sand-500` | `#C9A97E` |
| `color/sand/200` | `--pms-color-sand-200` | `#E8D8C0` |
| `color/neutral/0` | `--pms-color-neutral-0` | `#FFFFFF` |
| `color/neutral/50` | `--pms-color-neutral-50` | `#F8F7F3` |
| `color/neutral/100` | `--pms-color-neutral-100` | `#F1F0EC` |
| `color/neutral/200` | `--pms-color-neutral-200` | `#E2E1DC` |
| `color/neutral/500` | `--pms-color-neutral-500` | `#8A8F89` |
| `color/neutral/600` | `--pms-color-neutral-600` | `#6B716C` |
| `color/neutral/800` | `--pms-color-neutral-800` | `#343934` |
| `color/neutral/900` | `--pms-color-neutral-900` | `#252925` |
| `color/dark` | `--pms-color-dark` | `#28302B` |
| `color/green/600` | `--pms-color-green-600` | `#4F7A63` |
| `color/green/100` | `--pms-color-green-100` | `#E5F1E9` |
| `color/amber/600` | `--pms-color-amber-600` | `#A8732A` |
| `color/amber/100` | `--pms-color-amber-100` | `#F7ECD8` |
| `color/red/600` | `--pms-color-red-600` | `#A85454` |
| `color/red/100` | `--pms-color-red-100` | `#F5E3E3` |
| `color/blue/600` | `--pms-color-blue-600` | `#55778F` |
| `color/blue/100` | `--pms-color-blue-100` | `#E4EEF4` |
| `color/violet/600` | `--pms-color-violet-600` | `#766B91` |
| `color/violet/100` | `--pms-color-violet-100` | `#ECE8F3` |

---

# 2. Semantic color tokens

The semantic variables in Figma are aliases to the primitives above. Production CSS MUST preserve the semantic layer instead of using primitive colors directly in feature components.

| Figma semantic | CSS semantic | Resolves to |
|---|---|---|
| `brand/primary` | `--color-brand-primary` | `--pms-color-sage-500` |
| `brand/primary-hover` | `--color-brand-primary-hover` | `--pms-color-sage-600` |
| `brand/primary-strong` | `--color-brand-primary-strong` | `--pms-color-sage-700` |
| `brand/soft` | `--color-brand-soft` | `--pms-color-sage-200` |
| `brand/subtle` | `--color-brand-subtle` | `--pms-color-sage-100` |
| `brand/accent` | `--color-brand-accent` | `--pms-color-sand-500` |
| `brand/accent-soft` | `--color-brand-accent-soft` | `--pms-color-sand-200` |
| `brand/dark` | `--color-brand-dark` | `--pms-color-dark` |
| `surface/page` | `--color-surface-page` | `--pms-color-neutral-50` |
| `surface/card` | `--color-surface-card` | `--pms-color-neutral-0` |
| `surface/subtle` | `--color-surface-subtle` | `--pms-color-neutral-100` |
| `surface/dark` | `--color-surface-dark` | `--pms-color-dark` |
| `text/primary` | `--color-text-primary` | `--pms-color-neutral-900` |
| `text/secondary` | `--color-text-secondary` | `--pms-color-neutral-600` |
| `text/inverse` | `--color-text-inverse` | `--pms-color-neutral-0` |
| `text/brand` | `--color-text-brand` | `--pms-color-sage-700` |
| `border/default` | `--color-border-default` | `--pms-color-neutral-200` |
| `border/strong` | `--color-border-strong` | `--pms-color-neutral-500` |
| `system/success` | `--color-system-success` | `--pms-color-green-600` |
| `system/success-soft` | `--color-system-success-soft` | `--pms-color-green-100` |
| `system/warning` | `--color-system-warning` | `--pms-color-amber-600` |
| `system/warning-soft` | `--color-system-warning-soft` | `--pms-color-amber-100` |
| `system/error` | `--color-system-error` | `--pms-color-red-600` |
| `system/error-soft` | `--color-system-error-soft` | `--pms-color-red-100` |
| `system/info` | `--color-system-info` | `--pms-color-blue-600` |
| `system/info-soft` | `--color-system-info-soft` | `--pms-color-blue-100` |
| `system/service` | `--color-system-service` | `--pms-color-violet-600` |
| `system/service-soft` | `--color-system-service-soft` | `--pms-color-violet-100` |

### Rule

Feature CSS/components SHOULD reference semantic tokens, for example:

```css
.card {
  background: var(--color-surface-card);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
}
```

Avoid:

```css
.card {
  background: #ffffff;
  color: #252925;
}
```

unless implementing the token layer itself.

---

# 3. Spacing primitives

Read directly from `PMS / Primitives`.

| Figma | CSS | Value |
|---|---|---:|
| `space/2` | `--space-2` | `8px` |
| `space/3` | `--space-3` | `12px` |
| `space/4` | `--space-4` | `16px` |
| `space/5` | `--space-5` | `20px` |
| `space/6` | `--space-6` | `24px` |
| `space/8` | `--space-8` | `32px` |
| `space/10` | `--space-10` | `40px` |
| `space/12` | `--space-12` | `48px` |
| `space/16` | `--space-16` | `64px` |

Do not invent intermediate PMS spacing tokens in Sprint 0. Add a new spacing token only after a Figma/design-system decision.

---

# 4. Radius primitives

| Figma | CSS | Value |
|---|---|---:|
| `radius/sm` | `--radius-sm` | `8px` |
| `radius/md` | `--radius-md` | `12px` |
| `radius/lg` | `--radius-lg` | `16px` |
| `radius/xl` | `--radius-xl` | `24px` |

---

# 5. Typography styles

Figma uses two font families:
- `Lora` for display/H1/H2.
- `Inter` for H3/body/label/caption.

No font files are stored in this repository. Font loading strategy must use an approved Web mechanism (for example Next.js font tooling) and must not commit local font binaries.

| Figma style | CSS token/class intent | Family | Weight/style | Size | Line height | Letter spacing |
|---|---|---|---|---:|---:|---:|
| `PMS / Display / XL` | Display XL | Lora | 400 Regular | 52px | 62px | -1% |
| `PMS / Heading / H1` | H1 | Lora | 400 Regular | 40px | 50px | -0.5% |
| `PMS / Heading / H2` | H2 | Lora | 400 Regular | 32px | 42px | -0.3% |
| `PMS / Heading / H3` | H3 | Inter | 600 Semi Bold | 24px | 32px | -0.2% |
| `PMS / Body / LG` | Body LG | Inter | 400 Regular | 18px | 28px | 0 |
| `PMS / Body / MD` | Body MD | Inter | 400 Regular | 16px | 24px | 0 |
| `PMS / Label / MD` | Label MD | Inter | 500 Medium | 14px | 20px | 0 |
| `PMS / Caption` | Caption | Inter | 400 Regular | 12px | 18px | 0.5% |

Suggested CSS custom properties:

```css
--font-family-display: "Lora", serif;
--font-family-body: "Inter", sans-serif;

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

--font-size-display-xl: 52px;
--line-height-display-xl: 62px;

--font-size-h1: 40px;
--line-height-h1: 50px;

--font-size-h2: 32px;
--line-height-h2: 42px;

--font-size-h3: 24px;
--line-height-h3: 32px;

--font-size-body-lg: 18px;
--line-height-body-lg: 28px;

--font-size-body-md: 16px;
--line-height-body-md: 24px;

--font-size-label-md: 14px;
--line-height-label-md: 20px;

--font-size-caption: 12px;
--line-height-caption: 18px;

--letter-spacing-display-xl: -0.01em;
--letter-spacing-h1: -0.005em;
--letter-spacing-h2: -0.003em;
--letter-spacing-h3: -0.002em;
--letter-spacing-body: 0;
--letter-spacing-label: 0;
--letter-spacing-caption: 0.005em;
```

---

# 6. Shadow

Figma effect style:

`PMS / Shadow / Card`

Exact effect:
- type: Drop Shadow
- x: `0`
- y: `8`
- blur radius: `24`
- spread: `0`
- color approximately `rgba(31, 38, 33, 0.10)`

CSS:

```css
--shadow-card: 0 8px 24px 0 rgba(31, 38, 33, 0.10);
```

---

# 7. External Google tokens

The Figma file contains separate collections:

- `External / Google / Primitives`
- `External / Google / Semantic`

These MUST NOT be merged into the PMS core token namespace.

Values:

| External token | Value |
|---|---|
| `color/white` | `#FFFFFF` |
| `color/outline-border` | `#747776` |
| `color/outline-text` | `#1F1F1F` |
| `color/logo-proxy-blue` | `#4285F4` |
| `dimension/button-radius` | `4px` |
| `dimension/button-gap` | `12px` |
| `dimension/button-padding-x` | `12px` |

Semantic aliases:
- `google/button/background`
- `google/button/border`
- `google/button/text`
- `google/button/logo-proxy`
- `google/button/radius`
- `google/button/gap`
- `google/button/padding-x`

These tokens exist only to preserve the external provider presentation contract. They should be isolated from PMS semantic tokens.

---

# 8. Sprint 0 implementation constraints

## MUST

- Implement core primitive and semantic PMS variables.
- Implement typography foundation.
- Implement card shadow.
- Preserve external Google tokens separately if the technical Google button foundation is introduced.
- Use semantic tokens from features.
- Document Figma source and traceability.
- Keep Web design token source in one authoritative location.

## MUST NOT

- Invent colors.
- Invent spacing values.
- Invent radius values.
- Create dark mode values; Figma currently defines the PMS semantic collection in `Light` mode only.
- Create new visual components merely to demonstrate tokens.
- Use Figma variable IDs as runtime values.
- Merge Google external tokens into PMS core primitives.

---

# 9. Suggested `tokens.css` foundation

```css
:root {
  /* PMS primitives — color */
  --pms-color-sage-700: #586456;
  --pms-color-sage-600: #6B7868;
  --pms-color-sage-500: #7C8B78;
  --pms-color-sage-200: #D9E2D4;
  --pms-color-sage-100: #EDF1EA;

  --pms-color-sand-500: #C9A97E;
  --pms-color-sand-200: #E8D8C0;

  --pms-color-neutral-0: #FFFFFF;
  --pms-color-neutral-50: #F8F7F3;
  --pms-color-neutral-100: #F1F0EC;
  --pms-color-neutral-200: #E2E1DC;
  --pms-color-neutral-500: #8A8F89;
  --pms-color-neutral-600: #6B716C;
  --pms-color-neutral-800: #343934;
  --pms-color-neutral-900: #252925;

  --pms-color-dark: #28302B;

  --pms-color-green-600: #4F7A63;
  --pms-color-green-100: #E5F1E9;
  --pms-color-amber-600: #A8732A;
  --pms-color-amber-100: #F7ECD8;
  --pms-color-red-600: #A85454;
  --pms-color-red-100: #F5E3E3;
  --pms-color-blue-600: #55778F;
  --pms-color-blue-100: #E4EEF4;
  --pms-color-violet-600: #766B91;
  --pms-color-violet-100: #ECE8F3;

  /* PMS semantic colors */
  --color-brand-primary: var(--pms-color-sage-500);
  --color-brand-primary-hover: var(--pms-color-sage-600);
  --color-brand-primary-strong: var(--pms-color-sage-700);
  --color-brand-soft: var(--pms-color-sage-200);
  --color-brand-subtle: var(--pms-color-sage-100);
  --color-brand-accent: var(--pms-color-sand-500);
  --color-brand-accent-soft: var(--pms-color-sand-200);
  --color-brand-dark: var(--pms-color-dark);

  --color-surface-page: var(--pms-color-neutral-50);
  --color-surface-card: var(--pms-color-neutral-0);
  --color-surface-subtle: var(--pms-color-neutral-100);
  --color-surface-dark: var(--pms-color-dark);

  --color-text-primary: var(--pms-color-neutral-900);
  --color-text-secondary: var(--pms-color-neutral-600);
  --color-text-inverse: var(--pms-color-neutral-0);
  --color-text-brand: var(--pms-color-sage-700);

  --color-border-default: var(--pms-color-neutral-200);
  --color-border-strong: var(--pms-color-neutral-500);

  --color-system-success: var(--pms-color-green-600);
  --color-system-success-soft: var(--pms-color-green-100);
  --color-system-warning: var(--pms-color-amber-600);
  --color-system-warning-soft: var(--pms-color-amber-100);
  --color-system-error: var(--pms-color-red-600);
  --color-system-error-soft: var(--pms-color-red-100);
  --color-system-info: var(--pms-color-blue-600);
  --color-system-info-soft: var(--pms-color-blue-100);
  --color-system-service: var(--pms-color-violet-600);
  --color-system-service-soft: var(--pms-color-violet-100);

  /* spacing */
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* typography */
  --font-family-display: "Lora", serif;
  --font-family-body: "Inter", sans-serif;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  --font-size-display-xl: 52px;
  --line-height-display-xl: 62px;
  --font-size-h1: 40px;
  --line-height-h1: 50px;
  --font-size-h2: 32px;
  --line-height-h2: 42px;
  --font-size-h3: 24px;
  --line-height-h3: 32px;
  --font-size-body-lg: 18px;
  --line-height-body-lg: 28px;
  --font-size-body-md: 16px;
  --line-height-body-md: 24px;
  --font-size-label-md: 14px;
  --line-height-label-md: 20px;
  --font-size-caption: 12px;
  --line-height-caption: 18px;

  --letter-spacing-display-xl: -0.01em;
  --letter-spacing-h1: -0.005em;
  --letter-spacing-h2: -0.003em;
  --letter-spacing-h3: -0.002em;
  --letter-spacing-body: 0;
  --letter-spacing-label: 0;
  --letter-spacing-caption: 0.005em;

  /* effects */
  --shadow-card: 0 8px 24px 0 rgba(31, 38, 33, 0.10);
}
```

---

# 10. Traceability IDs

These are documentation-only.

Collections:
- `PMS / Primitives` — `VariableCollectionId:10:2`
- `PMS / Semantic` — `VariableCollectionId:10:3`
- `External / Google / Primitives` — `VariableCollectionId:476:5087`
- `External / Google / Semantic` — `VariableCollectionId:476:5088`

Typography style names are authoritative for implementation naming. Figma style IDs may be recorded for traceability but MUST NOT appear in production runtime code.

---

# 11. Definition of Done for token foundation

PASS only when:

- Every PMS core token implemented in CSS matches this document.
- Semantic aliases reference primitives instead of duplicating hex values.
- Typography matches family/weight/size/line-height/letter-spacing.
- Shadow matches Figma.
- No invented dark mode.
- No invented intermediate spacing/radii.
- Google tokens, if implemented, stay isolated.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- `31_DESIGN_TOKEN_FOUNDATION.md` and `tokens.css` remain synchronized.
