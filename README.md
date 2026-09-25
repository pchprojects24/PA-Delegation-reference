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

## Features

- **At Sea notes** — 63 medications have an *At Sea* section with shipboard
  guidance (seasickness, heat, cold chain, port-visit STIs/PEP, alcohol
  withdrawal after sailing, fires/cyanide, outbreaks in close quarters,
  divers/aircrew, eye injuries). Meds that sedate or blur vision carry a
  **Duty impact** badge — search `duty impact` to list them. Notes live in the
  `atSeaNotes` map in `meds.html`, keyed by medication name.
- **Antibiotic guidance** — indications consistently mark *first-line* /
  *alternative* use; anti-infectives suggested in *Alternatives* that aren't on
  this delegated list are tagged **not in guide** (list: `notInGuideDrugs` in
  `meds.html`); the Infectious Disease category links to
  [Bugs & Drugs](https://www.bugsanddrugs.org/) for cross-checking empiric
  choices.
- **Canadian units and labelling** — mg/mL (not ratio) epinephrine, mcg,
  mmol, µmol/L, °C, metric measures, "subcut" (not SQ/SC), and no retired FDA
  pregnancy letter categories. Dosing aligned with Canadian sources where they
  differ from US practice (PHAC gonorrhea guide, NACI Tdap in pregnancy,
  Canadian ketorolac and croup dexamethasone labelling).

- **Search** across medication names, categories, indications, and all detail
  sections, with ranked autocomplete suggestions and match highlighting. Small
  result sets (5 or fewer) open automatically; larger ones stay collapsed so the
  list is easy to scan.
- **Category quick-jump** bar to go straight to any category, plus a floating
  back-to-top button.
- **Keyboard support** — press `/` anywhere to focus search, arrow keys to
  navigate suggestions, `Enter` to select, `Escape` to clear.
- **Accordion layout** with per-medication expand/collapse, an
  expand/collapse-all control, and a "Close" button at the bottom of each
  entry that returns you to its header.
- **Save as PDF** — export exactly what you need through the browser's print
  dialog ("Save as PDF"):
  - **Current view** — the *Save as PDF* button next to *Expand all* saves
    everything currently shown (e.g. your search results).
  - **One category** — the *PDF* button in each category header.
  - **One medication** — the *Save as PDF* button at the bottom of an open entry.

  Exports are fully expanded, include a title, date/time, the active search,
  and a disclaimer, and suggest a matching file name. Printing normally
  (Ctrl/Cmd+P) still works and prints the current view.
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
