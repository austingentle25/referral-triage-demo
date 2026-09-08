# TPR Referral Triage Tool

A single self-contained HTML file that walks staff through triaging inbound
cardiology referrals and produces a copy-ready output card for Athena.

Open `index.html` in a browser. No build step, no dependencies, no server.

## How it works

One question per screen, across a 120-node decision graph. Each node is tagged
with the step it maps to in the fifteen-step Notion reference workflow, shown in
the header chip. The wizard asks in dependency order, so those steps can run out
of sequence - the progress bar tracks position on the path, not the step number.

Questions come in seven interactive kinds (`yesno`, `yesno3`, `text`, `select`,
`diagnosis`, `form` for a multi-field screen, and `payor` for the insurance grid
lookup) plus `auto` nodes that resolve silently and record an `(auto)`
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
- **Session log, two live timers and pause.** One clock for the question on
  screen and one for the referral as a whole; both are wall-clock, so a
  backgrounded tab cannot lose handle time.
- **Insurance grid lookup.** 307 packages from the Abrazo referral grid. Entering
  the payor ID answers contracting, referral and authorization from the grid
  rather than asking, and says on the output card where the answers came from.
- **Report a problem**, in two channels that name their destinations: one files
  to the issue tracker, one copies a Slack message for you to paste.
- **Notion link** in the header, available throughout.

## Privacy

Everything entered lives in memory for the tab's lifetime. There is no
`localStorage` and no persistence of any kind — the session log included.
Refreshing the page clears everything.

**One thing does leave the page**, and this section used to say nothing did. When
a reviewer presses Send on a feedback report, that report goes to a Cloudflare
Worker and becomes an issue in a private tracker. Nothing else is transmitted,
and nothing is sent without that press. The patient name, every free-text field
that could carry patient information, dates and long digit runs are stripped
before it leaves — in the page, and again in the Worker, because a rule enforced
only in the browser protects nobody against a browser that skips it. The
reviewer's own name is kept deliberately. See `DEPLOY.md` for the field-by-field
table.

Otherwise the only network call is the webfont.

## Data

The provider roster, specialties, practice locations and department numbers are
real and reflect the Biltmore Cardiology configuration. Links to internal systems
require authentication.
