# TPR Referral Triage Tool

A single self-contained HTML file that walks staff through triaging inbound
cardiology referrals and produces a copy-ready output card for Athena.

Open `index.html` in a browser. No build step, no dependencies, no server.

## How it works

One question per screen, across a 110-node decision graph in six parts:

| Part | Purpose |
|---|---|
| 0 | Patient, task ID, patient type |
| 1 | Determine the receiving provider |
| 2 | Determine the location / department |
| 3 | Reconcile provider against location |
| 4 | Scheduling eligibility (insurance, contracting, referral & authorization) |
| 5 | Writes & objects (care team, registration, auth, chart export) |

Questions come in five interactive kinds (`yesno`, `yesno3`, `text`, `select`,
`diagnosis`) plus `auto` nodes that resolve silently and record an `(auto)`
breadcrumb, so the flow only asks when the answer isn't already derivable.

## Features

- **Resume by paste.** Every run emits a `WHY THIS PATH` breadcrumb string. Paste
  it back on the first screen and the engine replays your answers to put you
  exactly where you left off — session restore with no storage.
- **Diagnosis → specialty matching.** ~210 keywords across General,
  Interventional, Structural and Electrophysiology, matched by span containment
  so a generic term nested inside a longer one ("hypertension" inside "pulmonary
  hypertension") doesn't pull in the wrong specialty. Terms genuinely shared by
  two specialties still match both.
- **Provider-aware department pickers.** Each picker leads with the sites the
  selected provider actually practises at; the rest stay reachable, because a
  referral can legitimately name a site the provider doesn't cover.
- **Light and dark mode.** Follows the system preference; the header toggle
  overrides it. Every visible text node meets WCAG AA (4.5:1) in both themes.
- **Fluid typography.** All sizes are `rem`, driven by one clamped root size, so
  the interface scales with the viewport.
- **Session log, live timer and pause**, plus a one-tap engineering escalation
  note.
- **Notion link** in the header, available throughout.

## Privacy

Everything entered lives in memory for the tab's lifetime. There are no network
calls other than the webfont, no `localStorage`, and no persistence of any kind —
the session log included. Refreshing the page clears everything. No patient data
is stored or transmitted.

## Data

The provider roster, specialties, practice locations and department numbers are
real and reflect the Biltmore Cardiology configuration. Links to internal systems
require authentication.
