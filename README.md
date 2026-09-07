# Referral Triage Guide

A single-file, offline-capable decision-tree wizard for triaging inbound specialty
referrals. Staff answer one question per screen; the tool walks a 110-node graph
across six parts and emits a copy-ready output card summarising every field that
needs to be written back into the EHR.

Open `index.html` in a browser. There is no build step and no server.

## What it demonstrates

- **A declarative decision graph.** 110 nodes of five kinds (`yesno`, `yesno3`,
  `text`, `select`, `diagnosis`) plus `auto` nodes that branch silently, so the
  flow only asks a question when the answer is not already derivable.
- **Resume by paste.** Every run emits a `WHY THIS PATH` breadcrumb string.
  Paste it back on the first screen and the engine replays the answers to put
  you exactly where you left off — session restore with zero storage.
- **Specificity-aware keyword matching.** A diagnosis is mapped to specialties
  by keyword, with each hit recorded by position so a generic term nested inside
  a longer one ("hypertension" inside "pulmonary hypertension") does not drag in
  the wrong specialty. Terms genuinely shared by two specialties still match both.
- **Redundancy gates.** Once a determination is settled, later parts skip the
  question and record an auditable `(auto)` breadcrumb explaining why.
- **A session log.** Each determination is logged as it completes, with its full
  output card recoverable, and exits available at every point.

## Data in this repository is fictional

The provider roster, site names, department numbers, payer names and hostnames
are invented for demonstration. Nothing here corresponds to a real practice,
clinician, patient, or payer contract.

## Privacy model

Everything entered is held in memory for the life of the tab. There are no
network calls other than the webfont, no `localStorage`, and no persistence of
any kind — the session log included. Refreshing the page clears everything.
