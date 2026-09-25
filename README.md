# PA Delegation Reference

A personal, static, dependency-free reference for the medications I'm
delegated to use as a Physician Assistant with the Royal Canadian Navy at
sea. No build step, server, or install required — open the pages directly
in a browser or host them on any static host (e.g. GitHub Pages).

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Personal landing page with at-sea reminders and a link to the med guide. |
| `scenarios.html` | Scenario summaries: 13 common situations (anaphylaxis, arrest, seizure, hyperkalemia, smoke/cyanide, alcohol withdrawal, …) showing how the guide's meds fit together, each linking to its full entry. |
| `meds.html` | Interactive medication reference: 16 categories, 144 medications with dosing, indications, contraindications, monitoring, escalation guidance, and clinical pearls. |
| `infusion.html` | Infusion calculator: dose (mcg/kg/min, mcg/min, mg/min, mg/h, units/h …) ↔ pump rate (mL/h), with example concentrations for the guide's infusion drugs and a printable rate table. |

## Features

- **Smarter search** — also finds Canadian brand names, abbreviations and
  plain-language uses (`Zofran`, `TXA`, `D50`, `pink eye`, `birth control`…),
  ranking the main drugs for a use first. Short terms (≤3 characters, e.g.
  `NS`, `UTI`) match at the start of a word. Terms live in
  `data/search-aliases.js`.
- **Pocket card** — compact, dosing-only, two-column PDF of whatever is on
  screen (or of your favourites) for printing or laminating.
- **Home-screen app** — *Add to Home Screen* installs it with its own icon and
  opens it full-screen (`manifest.webmanifest`, `icons/`).

- **Weight-based doses** — enter a weight (kg) on the med page and every
  mg/kg, mcg/kg, mL/kg, units/kg or mmol/kg figure shows the worked-out amount
  next to it (per dose, per day, per minute or per hour). A max stated in the
  same clause caps the result, and a draw-up volume is shown for injectable
  doses when the entry lists exactly one concentration. The weight is kept for
  the browser tab only.
- **Favourites & recently viewed** — star any entry; favourites and the last 8
  entries opened appear as quick links above the list (stored on the device).
- **Links to entries** — each medication has its own address
  (`meds.html#med-ketamine`); opening an entry updates the URL, and *Copy link*
  copies it.

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

Plain HTML/JS with no build step. Styling uses the
[Tailwind CSS CDN](https://tailwindcss.com) and icons use
[Lucide](https://lucide.dev) (pinned to `0.475.0`), both loaded with `defer`;
icon creation runs on `DOMContentLoaded`.

| Path | Contents |
| --- | --- |
| `data/meds-data.js` | The medication database (`medData`) — edit this to add or change a medication. |
| `data/at-sea-notes.js` | *At Sea* notes and *Duty impact* flags, keyed by medication name. |
| `data/search-aliases.js` | Extra search terms (brand names, abbreviations, uses), keyed by medication name. |
| `js/meds.js` | Med page logic: normalizing/indexing the data, search, rendering, weight-based doses, favourites, PDF and pocket-card export. |

The data files are classic scripts (not JSON), so the pages also work when
opened directly from disk. They load before `js/meds.js`, which normalizes,
indexes and renders them at load time.

> **Disclaimer:** For clinical reference only. Verify dosing and protocols
> against current guidelines and your supervising physician's delegation
> agreement.
