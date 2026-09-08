# Open items

Everything outstanding on Referral Sync Helper, and what has closed. Kept in the
repo so a decision is not rediscovered as new work later.

**Last updated:** 8 September 2026, after clearing the open list on judgement.

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
| F9 | The diagnosis picker matched inside words | **Fixed.** A query of four characters or fewer now has to land on a whole word, and a multi-word query matches on any of its words. `AS`, `PE`, `HTN`, `AR` and `ACS` stop offering something unrelated; `VT` and `MI` find the right diagnosis, which the substring match had been burying; `SOB on exertion` and `c/o chest pain` find something at all |
| F10 | The restriction showed on one provider picker, not the other | **Fixed.** The search list carries the same annotation as the tap list, at the point of choosing rather than on the output card twenty questions later |
| F11 | No release notes in the tool | **Live.** The About tab opens with the three most recent user-visible changes |
| F12 | `is_qualifying` covered past and upcoming | **Split.** Attendance applies to a past encounter; an upcoming one only has to be still on the books. Both on-screen definitions and `TPR-RULES.md` say so now |
| F13 | The patient name sat in the header all session | **Initials.** "K.L.B. · Task-1234", full name on hover and still on the screen where it was typed. The Task ID identifies the referral; the initials say which patient you are on |
| F14 | APP specialties | **Keep as they are.** An APP sees the patients of the physician they work with, so inheriting that physician's specialties is the behaviour that matches the work. No sheet can settle it because none covers APPs, and the current rule has a reason rather than being an accident |
| F15 | The insurance questions, one systematic pass | **Measured, and clean.** Over 400 walks, 183 consulted the grid and those runs ask a median of 3 insurance questions. Everything the grid answers is at zero: contracted, referral required and authorization required are never asked by hand. What survives is not redundant - whether Valerie and Athena agree (100%), whether the record synced and came back eligible (78%), and the mismatch branch. See below |
| F16 | `TPR-RULES.md` out of step | **Updated.** Definitions split, and it now records the fifteen-step structure it claimed to describe |

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


### 2. The step numbering runs backwards

By design, and stated plainly rather than hidden. The workflow is a checklist
whose steps can be worked in any order; this is a wizard whose order is fixed by
dependency. Measured over 40 walks it goes backwards 1.6 times per referral,
always in one of three places — 7 to 4, 11 to 1, 15 to 7.

The progress bar is driven by position and never runs backwards, so this shows
only in the step name. **Option (b) remains available:** move the fax sweep after
registration and the commonest jump disappears. Small, provable against the
120-seed baseline. Not taken.


### 3. The insurance mismatch branch is three questions and a free-text box

The one thing the measurement turned up. When Valerie and Athena disagree the
tool asks which insurance needs fixing (51% of grid runs), then what kind of
mismatch it is from a list (34%), then asks for the same thing again in prose
(28%).

That is the shape feedback has complained about twice already - a type from a
list followed by a description of the type. Folding the last two into one screen
is the obvious consolidation.

**Not done.** `p4_ins_mismatch_type` routes on its answer - "Self-pay on Valerie,
insurance listed in Athena" goes somewhere different from the rest - so merging
it into a form changes crumb structure and the resume path, not just the layout.
That is a bigger change than the registration consolidation it resembles, and it
wants doing deliberately rather than at the end of a long day.

### 4. The last single-question trip back to the referral fax

The referring provider's specialty question sits alone between Care Team and Full
Registration, in 38% of walks. Folding it into a form would mean asking it on the
62% that do not need it. **Leave it** — recorded so it is not rediscovered.




---

## How to answer

Tell me the numbers: *"Maki is General only; APPs narrower; do 3(b)."* Anything
not mentioned stays as it is.
