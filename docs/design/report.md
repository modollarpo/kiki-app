# Design System & Accessibility Pass

Enterprise design pass for KIKI Agent™, delivered on `feat/design-system` in four
commits. Goal: a consistent type scale, self-hosted typography, an accessible
shared component kit, and WCAG 2.1 AA-clean marketing + dashboard surfaces in
both themes and at desktop/mobile widths — with no behavioural changes.

## Steps

| Step | Commit | Summary |
|---|---|---|
| A — Type scale | `021c387` | Central `fontSize` scale in `tailwind.config.ts` + `--fs-*`/`--lh-*` vars. Removed ad-hoc px font sizes across 92 files; added `scripts/audit-type.mjs` (wired into `npm run lint` and CI) so sub-12px/detached px sizing can't creep back. |
| B — Fonts | `000c57b` | Inter + JetBrains Mono self-hosted via `next/font/google`. Fixed `--font-mono`/`--font-sans` resolving to the same family. Removed Google Fonts hosts from CSP. |
| C — UI kit | `445c893` | Hardened shared components: `Button` (default `type="button"`, `aria-busy`/`aria-disabled`), `Input` (label association, `aria-invalid`, error `role="alert"`), `Toggle` (`role="switch"`), `ScrollableTable` (`role="region"`), `ProgressBar` (`role="progressbar"`). |
| D — Contrast & a11y | this commit | Text-safe accent tokens, `.force-dark` surface pinning, and a baseline-gated axe audit in CI. |

## Step D details

- **Text-safe accent tokens.** Accent hues (`#10b981` mint, `#3b82f6` blue, …)
  fail AA on light backgrounds. Added `tBlue…tPos` tokens in `kdls.ts` plus a
  `textSafe()` helper that maps any accent to its text-safe counterpart. Inline
  `color: K.<accent>` was migrated to `K.t<Accent>` by a codemod
  (`scripts/codemods/accent-text.mjs`, 44 files) and exposed as `.text-k*`
  utility remaps in `globals.css`.
- **Forced-dark surfaces.** Marketing sections that are always dark now pin every
  brand and `-d` surface token plus the dark `--t-*` text tokens under
  `.force-dark`, so light-theme tints can no longer land on dark backgrounds.
- **Component/UI fixes.** `Badge` uses `textSafe(color)`; `Button` solid mint
  uses `#04140E`; active nav and status pills use text-safe tokens; cookie
  consent colours raised to AA.
- **Mobile a11y.** Hamburger menu now has `aria-label`/`aria-expanded`; the
  horizontally scrollable terminal and comparison table are keyboard-focusable
  regions (`role="region"`, `tabIndex={0}`, `aria-label`).
- **Automated gate.** `scripts/a11y-audit.mjs` drives Playwright + axe-core over
  six pages × two themes × two widths against `scripts/a11y-baseline.json`
  (currently `0` violations). Runs in CI as the `a11y` job; fails only when
  violations exceed the recorded baseline.

## Verification

- `npm run type-check` — clean.
- `npm run lint` — clean ("No ESLint warnings or errors"); `audit:type` passes.
- `npm test` — 343 tests / 34 files passing.
- `npm run build` — succeeds (84 static pages).
- `npm run audit:a11y` — **0** WCAG 2.1 A/AA violation nodes across 24
  page/theme/width combinations (report: `docs/design/a11y-report.json`).
- Screenshots: `docs/design/before/` and `docs/design/after/` — 6 pages ×
  dark/light × 1440/390 px (24 each).

## Residual notes

- Static docs artifacts under `docs/output/` and `docs/generate-html.js` still
  reference Google Fonts; they are build-time output, not served by the app, and
  are out of scope for this pass.
- `test/connectors.test.ts > Shopify Connector > generateOAuthUrl` can exceed its
  5s timeout under CI load; it passes in isolation and is unrelated to this work.
