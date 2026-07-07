# PA Delegation Reference

A personal, static, dependency-free reference for the medications I'm
delegated to use as a Physician Assistant with the Royal Canadian Navy at
sea. No build step, server, or install required — open the pages directly
in a browser or host them on any static host (e.g. GitHub Pages).

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Personal landing page with at-sea reminders and a link to the med guide. |
| `meds.html` | Interactive medication reference: 16 categories, 144 medications with dosing, indications, contraindications, monitoring, escalation guidance, and clinical pearls. |
| `meds.html.backup` | Earlier snapshot of the medication page, kept for reference. |

## Features

- **Search** across medication names, categories, indications, and all detail
  sections, with ranked autocomplete suggestions, match highlighting, and the
  last search persisted in `localStorage`.
- **Keyboard support** — press `/` anywhere to focus search, arrow keys to
  navigate suggestions, `Enter` to select, `Escape` to clear.
- **Accordion layout** with per-medication expand/collapse and an
  expand/collapse-all control; matching results auto-expand during search.
- **Print friendly** — printing expands all content and hides the controls.
- **Accessible** — ARIA-annotated combobox and accordions, `inert` collapsed
  panels.

## Tech notes

Both pages are self-contained HTML files. Styling uses the
[Tailwind CSS CDN](https://tailwindcss.com) and icons use
[Lucide](https://lucide.dev) (pinned to `0.475.0`), both loaded with `defer`;
icon creation runs on `DOMContentLoaded`. The medication database lives in the
`medData` array inside `meds.html` — to add or edit a medication, edit that
array; the page normalizes, indexes, and renders it at load time.

> **Disclaimer:** For clinical reference only. Verify dosing and protocols
> against current guidelines and your supervising physician's delegation
> agreement.
