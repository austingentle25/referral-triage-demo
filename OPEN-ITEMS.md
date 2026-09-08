# Open items

Everything outstanding on Referral Sync Helper, and what has closed. Kept in the
repo so a decision is not rediscovered as new work later.

**Last updated:** 7 September 2026, after the third round of grid-redundancy removals.

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

### 5. Sixteen names still listed but unselectable

Of the original twenty-two, six turned out to be in the scheduling guide: two in
scope and restored, four active as APPs. **The remaining sixteen appear nowhere in
it.** Confirming them against Athena by NPI needs access I do not have.

### 6. The last single-question trip back to the referral fax

The referring provider's specialty question sits alone between Care Team and Full
Registration, in 38% of walks. Folding it into a form would mean asking it on the
62% that do not need it. **Leave it** — recorded so it is not rediscovered.

### 7. The insurance questions deserve one systematic pass

The referral grid made existing questions redundant in **three separate places, found
three separate ways** - one by hitting it, one by asking about it, one by a 15-walk sweep.
That is a pattern, not three coincidences: every question the grid can now answer was
written before the grid existed, and there is no list of which ones those are.

The remaining insurance questions should be checked against the 307 packages in one pass
rather than waiting for a fourth accident. Measurement only - no code changes - so it can
be done and read before anything is decided.

### 8. Keep the rules in step

`TPR-RULES.md` in the private docs repo is the rules of record. The fifteen-step
structure has landed and its structure section has not been updated to match.

---

## How to answer

Tell me the numbers: *"Maki is General only; APPs narrower; do 3(b)."* Anything
not mentioned stays as it is.
