# Open items

Everything outstanding on Referral Sync Helper, and what has closed. Kept in the
repo so a decision is not rediscovered as new work later.

**Last updated:** 8 September 2026, after a second review pass.

---

## Closed

| # | Item | Outcome |
|---|---|---|
| A1 | Step 9 — provider vs clinic network | **Clinic-wide.** The scheduling guide's provider sheet has no insurance column, and its insurance sheet is headed "Insurance Plans Not Accepted (Camelback)". Step 9 maps to the contracting question that already existed |
| A2 | Auto Feedback issue titles | **Keep the report text.** Private tracker, redacted twice, and unskimmable titles make triage worse |
| A3 | Log transfer — reviewer notes | **Keep them.** Real operational context, staff-to-staff |
| B1 | Fifteen-step restructure | **Live.** All 118 nodes carry their reference step; 117 of 120 baseline walks identical, the 3 that differ are exactly those reaching the new step 10 question |
| B2 | Step 10 — PCP letter | **Live.** On file → create the edge-case referral authorization from it. Not on file → outbound fax to the PCP first |
| C1 | Milette / Sturm / Thayer | **Done.** Sturm and Thayer are APPs and are selectable, along with Jensen, Murphy, Franco and Ning. Milette appears nowhere in the scheduling guide and is removed |
| — | Not-needed states | **Live.** A non-Camelback assignment now names the six steps it skips rather than stopping silently |
| — | Eckhardt and Homes | **Restored.** Both are in scope per the guide; they had been wrongly unselectable |
| D1 | Escalation branch skipped the payor picker | **Fixed.** `p4_valerie_athena_desc` still pointed at the old manual contracting question, so every Engineering escalation hand-answered contracting, referral and authorization. 12 of 120 walks took that route |
| D2 | Self-pay was asked about referral and authorization | **Fixed.** Self-pay now answers both, with the reason named on the output card. The three sites that set self-pay - payor screen, contracting toggle, resume - share one function so they cannot drift |
| D3 | Payor crumb recorded below the auto-crumb derived from it | **Fixed.** The trail read conclusion-then-evidence on Mercy packages. Paths saved by the old build still resume, and are rewritten into the new order |
| E1 | Provider picker was one ungrouped scroll of 29 | **Fixed.** Type-ahead filter over name, specialty and location, plus location headings on top of the existing rank order. Same providers, same order within a group |
| E2 | Two step chips, one of them hardcoded to 15 | **Fixed.** They were one PART_LABELS table read twice, not two taxonomies. The duplicate is gone; the survivor names itself as the Notion workflow step |
| E3 | Provider question asked two things over three interaction models | **Fixed.** One instruction over the list, with "Not in this list - open the full picker" and "No provider treats this diagnosis". Both branch targets unchanged |
| E4 | Progress measured against the whole graph | **Fixed.** "Question N of about M on this path", M measured from 300 seeded walks per question. Bar keeps its monotonic clamp |
| E5 | Accessibility: comboboxes, button names, live regions, focus | **Fixed.** All three type-aheads are real comboboxes with arrow keys; 29 provider rows have accessible names; the field warning and the paused banner leave the accessibility tree when not showing; one focus-visible rule covers everything tabbable |
| E6 | Enter did nothing on the multi-field forms | **Fixed.** Enter clicks Continue, inheriting its validation. The single text questions already submitted on Enter and were re-tested |
| E7 | Timer reset mid-walk, and its scope was unstated | **Fixed.** render() runs on every view switch and reset the clock each time, so a look at the log lost the question's time. Two labelled clocks now: question and referral |
| E8 | Green Yes / red No on neutral questions | **Fixed.** Both neutral, same border, told apart by position and label. --picked-solid and --review-solid keep their meaning elsewhere |
| E9 | Two report channels, neither naming its destination | **Fixed.** One "Report a problem" group; each summary says what it is for and whether anything is transmitted |
| E10 | Feedback reports could not be matched to what the reviewer saw | **Fixed.** Step label, question and node ID on their own labelled lines, in the same words as the chip on screen |
| F1 | Feedback arrived with nobody's name on it | **Fixed.** A first question asks who is working the referral, once per tab. The name leads the issue title so triage order can be decided from the list |
| F2 | Authorization chased on referrals we are not scheduling | **Fixed.** Feedback #11. The referral question is still asked; the authorization chain is skipped with the reason on the output card. Matched on the action note, not the bucket - that also holds referrals which come back to us |
| F3 | Nothing recorded what a walk actually did | **Fixed.** Log format 2: node ids on every timing, back-navigation with source and destination, the answer sequence, and the stop reason. `tools/analyse-logs.mjs` reads a directory of exports; `tools/selftest-analyse.mjs` covers it |
| F4 | `p1_name_manual` was orphaned | **Removed.** A full 48-provider select node with no inbound reference anywhere in the file. Proved by grep, not by walking |
| F5 | One auto check wrote three different crumb labels | **Fixed.** `Provider is Loli/Bahu?`, `Provider is Cataldo?` and `Provider is Loli/Bahu/Cataldo?` were one check. Feedback reports quote these paths verbatim, so the same step read as three across reports and any analysis keyed on step name split them |
| F6 | The determination harness lived nowhere | **Committed.** `tools/walk-harness.js`. Every "no determination changed" claim in this repo's history was produced by it and none of it was reproducible by anyone else |
| F7 | The tool asserted that a provider treats the diagnosis | **Fixed.** Three nodes set `providerTreatsDx = true` without checking, and that flag is what `p4_diag_entry` reads to skip the real check - so the assertion switched off the validation that would have caught a mismatch. `p2_diag_auto` and `p2_dept_closer` were the root: both answer "does this *location* have anyone", before any provider is chosen. Now only a confirmed match sets it |
| F8 | Sixteen providers listed with no specialty on file | **Closed, no action.** All sixteen are `inactive:true` and cannot be selected, so the specialty gap is unreachable. Confirming them against Athena by NPI was never needed |

---

## Still open

### 1. Peter Maki's specialty — two sheets disagree

| Source | Says |
|---|---|
| Provider Specific Rules | General, Interventional |
| Diagnosis → Specialty | **General only**, with the hypercholesterolemia exception in the notes column |
| The tool today | General, Interventional |

Changing this alters which diagnoses route to him — a real determination change —
so it is flagged rather than guessed. **Kevin Murphy, his APP, inherits whichever
you decide.**

### 2. APP specialties

Each APP carries the specialty of the physician they work with, because that is
whose patients they see. The Diagnosis → Specialty sheet covers physicians only,
so no APP appears on it and the sheet cannot settle this.

Franco therefore reads *General, Interventional, Structural* because Loli does.
Right, or should an APP carry something narrower?

### 3. The step numbering runs backwards

By design, and stated plainly rather than hidden. The workflow is a checklist
whose steps can be worked in any order; this is a wizard whose order is fixed by
dependency. Measured over 40 walks it goes backwards 1.6 times per referral,
always in one of three places — 7 to 4, 11 to 1, 15 to 7.

The progress bar is driven by position and never runs backwards, so this shows
only in the step name. **Option (b) remains available:** move the fax sweep after
registration and the commonest jump disappears. Small, provable against the
120-seed baseline. Not taken.

### 4. `is_qualifying` covers past and upcoming appointments

The rule includes "not Cancelled or No Show", which cannot apply to a future
appointment. Should split into `is_qualifying_past` and `is_qualifying_upcoming`.
No reported failure — a latent inconsistency, not a live bug.

### 5. The last single-question trip back to the referral fax

The referring provider's specialty question sits alone between Care Team and Full
Registration, in 38% of walks. Folding it into a form would mean asking it on the
62% that do not need it. **Leave it** — recorded so it is not rediscovered.

### 6. The patient name sits in the header all session

Raised in the UX pass and **not changed**, because the default is a decision
rather than a defect. Today `updateHeaderSub()` replaces "Based on Updated
Notion · Biltmore Cardiology" with "<name> · Task-1234" and leaves it there for
the whole run, which in a shared workspace is a patient name on screen
continuously.

Two options, both small:

- **Initials.** "A.G. · Task-1234". Nothing to click, nothing to learn, and the
  operator can still tell which patient they are on. Two initials collide often
  enough that the Task ID is doing the identifying anyway.
- **Click to reveal.** Show "Task-1234" with the name behind a tap that hides
  itself again on the next question. Exact when wanted, absent the rest of the
  time; one more thing to know about.

The name is only ever in memory either way - this is about what a passer-by
sees, not about storage. Say which and it is a few lines.

### 7. The diagnosis picker matches on bare substrings

Found while measuring, not reported from the floor. Full write-up in
`tools/FINDINGS-diagnosis-matching.md`.

There are two matchers. `specialtiesForDiagnosis()` is careful - word boundaries
for short keywords, span containment - and should be left alone. The diagnosis
picker's own search is `d.toLowerCase().indexOf(q) !== -1`, with no word
boundary and no minimum length.

So typing `AS` offers "Coronary Artery Di**se**ase", `PE` offers "Angina
**Pe**ctoris", and `HTN` offers "Chest Tig**htn**ess". Seven of twenty
abbreviations produce a confidently wrong top suggestion. The same line explains
why a query longer than the canonical name never matches at all, which is why
every piece of fax shorthand tested failed.

**This has to be settled before any synonym work.** Adding abbreviations to a
substring picker makes precision worse, not better. Fixing it changes which
suggestions appear on the diagnosis screen, so it needs your sign-off rather
than being folded in quietly.

### 8. The provider restriction shows on one picker and not the other

`relevantProvidersListHtml` annotates a restricted provider "schedulable, but no
manual outreach" and dims the row. `renderSelectNode`, used by `p2_name_here`
for the same decision, emits plain options with no label and nothing disabled.

Nothing is lost - the output card still says `SMS eligible: No - in-clinic
scheduling only` and the status is still Review - but the operator finds out
about twenty questions after the choice rather than at it.

### 9. The insurance questions deserve one systematic pass

The referral grid made existing questions redundant in **three separate places, found
three separate ways** - one by hitting it, one by asking about it, one by a 15-walk sweep.
That is a pattern, not three coincidences: every question the grid can now answer was
written before the grid existed, and there is no list of which ones those are.

The remaining insurance questions should be checked against the 307 packages in one pass
rather than waiting for a fourth accident. Measurement only - no code changes - so it can
be done and read before anything is decided.

### 10. Keep the rules in step

`TPR-RULES.md` in the private docs repo is the rules of record. The fifteen-step
structure has landed and its structure section has not been updated to match.

---

## How to answer

Tell me the numbers: *"Maki is General only; APPs narrower; do 3(b)."* Anything
not mentioned stays as it is.
