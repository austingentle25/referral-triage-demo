# Open items

Everything outstanding on Referral Sync Helper, and what has closed. Kept in the
repo so a decision is not rediscovered as new work later.

**Last updated:** 9 September 2026, after the fourteen-step renumber and step 15.

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
| G1 | Urgent referrals used the 60-day window (#19) | **Fixed.** 7 days when urgent. Urgency comes from the diagnosis as well as the fax marking, so the diagnosis moved to the front to settle it before the window question is asked |
| G2 | The diagnosis was skipped on some referrals (#22) | **Fixed.** Asked first, on every referral. The three later entry gates already read "diagnosis present?" and now simply stop asking. 0 of 200 walks reach a determination without one |
| G3 | Care Team came five questions after insurance (#15) | **Fixed.** It runs straight after the payor question and hands back to wherever the gate that sent it in was going |
| G4 | "Any other block?" had Yes as the bad answer (#16) | **Fixed.** Now "Is everything else clear to schedule?", under a new node id so paths saved before it are refused rather than replayed into the opposite branch |
| G5 | No way to say the authorization is being created by hand (#18) | **Fixed.** A third answer for when the number is already held - same create-new instructions, no outbound request |
| G6 | The referral date had to be cleared before retyping (#23) | **Fixed.** Today's date is filled in greyed, and the first keystroke clears it |
| G7 | ICD-10 phrasings found nothing (#21) | **Fixed.** Eight added, each checked against the live matcher. Also fixed a fault it exposed: a shared qualifier like "unspecified" could carry a match on its own, so "Chest pain, unspecified" was answered with endocarditis |
| G8 | Peter Maki's specialty | **General only**, decided by Austin. Kevin Murphy inherits |
| G9 | A loop before the insurance question (#17) | **Closed against G1.** Not reproducible on its own - the attached path runs straight through. Same task and same two-week appointment as #19; the tool kept resolving the wrong provider from an appointment that should not have counted |
| G10 | Two more ICD-10 phrasings (#24) | **Fixed.** And a fault they exposed: brackets split a keyword, so "Nonrheumatic aortic (valve) insufficiency" matched nothing at all even though "valve insufficiency" is a Structural keyword. Brackets become spaces before matching, which every parenthesised ICD-10 description needed |
| G11 | Care Team asked twice (#25, #26) | **Fixed.** A regression from moving the block after insurance: it is entered from there and from the part 7 urgent routes, and nothing stopped a run doing both. 84 of 200 walks asked it twice. One gate, asked once |
| G12 | Atherosclerosis of aorta (#27) | **Added**, with a keyword under Interventional. Without one it would have sat in the list resolving to no specialty - the same trap the valve entry fell into |
| G13 | The in-clinic restriction never reached the notes | **Fixed.** Reported from Task-2276. Set correctly as prose on the action note, then removed twice: `specDisposition()` substring-matches "ready to schedule" and returns the generic disposition, and `shortActionNote()` trims on " - " before a lowercase letter - which is exactly the shape of "do not manually outreach". It comes off the `inClinicOnly` flag now: its own line on the card, all three notes, and a banner when the provider is picked |
| H1 | Awaiting Info meant the wrong thing | **Fixed.** Austin: it is a Valerie status, and only for being unable to call the payor at all - out of hours. Both answers used to set it, so every referral reaching that question came out tagged and dispositioned "Eligibility Pending" whether or not anyone was waiting |
| H2 | Missing phone was half modelled | **Fixed.** Outbound AthenaFax to the **referring provider**, not the PCP, with the chart note on the card. Ends Pending, which is what it already was - no new terminal state |
| H3 | Mercy needed the authorization object | **Fixed.** The grid marks authorization "No" on all four Mercy packages, which is right about the payor and wrong here: the object is created from the PCP letter. Left to the grid, the authorization steps were skipped and nobody was told to make it |
| I1 | Renumber to the client's fourteen steps | **Done, on branch `step-renumber-14`.** Their step 2 collapses our old 1 and 2; their step 1 is our old 3; everything from their step 3 up matched by name already, one number apart. Proved by replaying the 300 recorded baseline walks - identical asked-question sequence on all 300, 0 end-state changes, and the only field differing anywhere is "Why this path" on 101 walks, entirely step labels. 80/80 paths saved on the old build still resume |
| I2 | Step 15, SMS Outreach | **Done, on branch.** Five conditions, naming the one that blocked it. Excluded off the `inClinicOnly` flag, never a name list. A new consent question on the demographics screen, because nothing recorded text consent before |
| H4 | PIMC (58277) | **Flagged, not decided.** Eligibility is deliberately still checked. The card says the rule is unsettled and to check before finishing |

---

## Decisions - settled, do not re-litigate

| # | Decision | Why |
|---|---|---|
| D-A | **Step 2 keeps our determination, not the client's resolve-or-review.** | The client's step 2 is a single resolve-or-manual-review. Ours is the whole Part 1/Part 2 node set: specialty matching, provider/location reconciliation, established-patient continuity, APP routing for hospital follow-ups, and the in-clinic and non-Valerie restrictions. Adopting their shape would drop all of it. Only the number changed |
| D-B | **SMS consent is asked, not assumed.** | Nothing recorded text consent. What looked like it was a static "Calls YES, Texts YES" line telling the operator what to set in Athena - an instruction, not an answer coming back. Absence is not permission, so it is asked and an absent answer blocks outreach |
| D-C | **Non-Valerie and non-Camelback SMS guards are kept though unreachable.** | Both are excluded a layer earlier by bucket routing, so neither branch fires. Kept as backstops, labelled as unreachable, and the Cataldo fixture asserts the routing that makes them unreachable - so a routing change fails a test rather than sending a text |

---

## Still open


### 1. The location addresses are guesses, and want replacing (#20)

Twelve of the fourteen departments now show an address in the pickers. **None of
it came from Athena.** It was gathered on 8 September from public listings -
Abrazo and Biltmore Cardiology location pages, Optum's Arizona cardiac services
directory, Healthgrades and Yelp - and the screen says it is unverified.

Two findings from gathering it are why that label is there:

- **Wickenburg** appears as 519 W Rose Ln (85390) in one source and 1395 W
  Wickenburg Way (85380) in another. Both are shown rather than one being picked.
- **18700 N 64th Dr** houses Biltmore at one suite and a different cardiology
  practice at another. Suite numbers are the least reliable part of this, and a
  suite number is the part an operator would actually use.

**Terrace (678) and Kierland (772) are blank.** Nothing public matched them, and
a plausible-looking guess is worse than a gap.

Replace the table from Athena when someone can export it - it is one object,
`DEPT_ADDRESSES`, keyed by the exact department strings.


### 2. Three payor grid rows are cut off mid-sentence

Found while answering the PIMC question. The name field of three rows ends
mid-sentence, so whatever instruction they carried is not in our copy:

| Package | Text ends |
|---|---|
| **58277** PIMC | "...(case policy) - If they are using this as insurance we" |
| **443448** The Kempton Group | "...the issue with claims has been resolved - we" |
| 16726 | "BCBS OR" - probably Oregon, probably not truncated |

Either the source grid truncates these or my extraction did. Worth checking the
original for those two rows.

### 3. Molina Complete Care carries the Mercy note but not the Mercy flag

Package **698480**, "AHCCCS - Molina Complete Care - Medicare Advantage", carries
the note *"Mercycare Advantage referral must come from PCP (not specialty)"* but
has no `edgeCase:"Mercy"`, so none of the Mercy handling fires for it.

Either the note was copied down a column in the source grid and does not apply,
or Molina genuinely needs the same PCP-letter handling and is currently missing
it. **Not guessed either way.** Austin asked me to check the grid on whether the
Mercy rule covers all Mercy - it covers the four flagged ones, and this is the
fifth row that mentions it.

### 4. The step numbering runs backwards

By design, and stated plainly rather than hidden. The workflow is a checklist
whose steps can be worked in any order; this is a wizard whose order is fixed by
dependency. Measured over 40 walks it goes backwards 1.6 times per referral,
always in one of three places — 7 to 4, 11 to 1, 15 to 7.

The progress bar is driven by position and never runs backwards, so this shows
only in the step name. **Option (b) remains available:** move the fax sweep after
registration and the commonest jump disappears. Small, provable against the
120-seed baseline. Not taken.


### 5. The insurance mismatch branch is three questions and a free-text box

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

### 6. The last single-question trip back to the referral fax

The referring provider's specialty question sits alone between Care Team and Full
Registration, in 38% of walks. Folding it into a form would mean asking it on the
62% that do not need it. **Leave it** — recorded so it is not rediscovered.





### 7. Two orphaned nodes, proved dead by the static scan

`p4_diag_input` (diagnosis) and `p5_urgent_fax` (yesno) each appear exactly once
in `index.html` - their own definition - and have zero inbound references
anywhere. Found by the orphan scan in `tools/scenario-report.js`. Both are
orphaned in `fed4d81` too, so neither came from the renumber.

**Not removed.** Deleting graph nodes is a deliberate decision, the way
`p1_name_manual` was in F4. Same evidence standard: proved by inbound reference
count, not by not having been walked.

### 8. Step 15 may be stricter than intended

1 of 51 walks that reach step 15 comes out SMS-eligible. The same 51 were
20-eligible before the change. The broadest gate is missing information:
`outstandingItems()` counts an unapplied document label and a referring-provider
address as missing, and either currently blocks a text.

Narrowing it is a judgement about the work, not a code question - say which of
those should stop an outreach text and it is a one-line change.

### 9. Nothing exercises the manual-review stops

0 of 300 walks stopped for manual review, so every stop path is unexercised by
the sampling and the stop-reason section of the report has nothing in it. That is
a gap in coverage, not evidence the stops are right.

---

## How to answer

Tell me the numbers: *"Maki is General only; APPs narrower; do 3(b)."* Anything
not mentioned stays as it is.
