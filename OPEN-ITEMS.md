# Open items — for approval

Everything outstanding on Referral Sync Helper, numbered so you can approve or
reject each one. **Nothing here is built yet.** Approve the ones you want and I
will implement, verify and merge them.

Each item says what changes, why, what it risks, and what I would do. Where I
would leave it alone, I say so — an item being on this list is not an argument
for doing it.

---

## A. Waiting on an answer from you

These are blocked on a decision, not on work.

### A1. Step 9 — does provider-level network get checked separately?

The 15-step reference names step 9 "Check clinic **and provider** network". The
tool asks one contracting question, at clinic level: *Is this plan contracted
with Biltmore?*

If production also checks whether the individual provider participates in the
plan, the tool has no equivalent and Phase 2 would need one. If clinic-level is
the whole check, step 9 maps cleanly to what already exists and there is nothing
to build.

**I need the answer before Phase 2 can finish.** I will not invent a question
for it.

### A2. Auto Feedback — drop the report text from the issue title?

An issue is titled `Part 4 - Insurance Check: <first 60 characters of the
report>`. The body is redacted and so is the title, but the title is the widest
exposure — it appears in notification emails, issue lists and search.

The residual risk is that redaction cannot catch a nickname, a misspelling, or a
different patient's name typed into free text. Dropping the gist would leave
titles like `Part 4 - Insurance Check: Contracted?` — safer, and worse to triage
from a list.

**My read:** keep the gist. The tracker is private, the text is redacted twice,
and a title you cannot skim makes the whole feature harder to use. But it is a
two-line change and the call is yours.

### A3. Log transfer — strip reviewer notes?

A transferred session log carries reviewer notes as written. They are free text,
so they could contain anything. The export already redacts the patient name and
identifies rows by Task ID.

**My read:** keep them. They carry real operational context and the export is
staff-to-staff inside Valerie Health, not staff-to-internet. Say the word and
they come out.

---

## B. Phase 2 of the reorg

### B1. Restructure the tool around the 15 reference steps

Regroup 118 nodes from 6 parts into the 15 numbered steps, renumber the part
labels, context badges and progress weighting, and add explicit **Not needed**
states for steps a given path skips.

Established in Phase 1: 5 steps map cleanly, 4 are split across parts, 3 are
partial or mismatched, 3 have no equivalent. Steps 3 and 14 need no work — 3 is
upstream, and 14 already exists as the `Closed` / `Review` scheduling status.

**Risk: this is the largest change on the list.** It moves every question's
label and grouping while preserving every routing decision exactly. It would be
verified by the standing 180-walk sweep plus a direct before-and-after
comparison that identical inputs produce identical determinations.

**Blocked on A1.**

### B2. Step 10 — a checkpoint for the PCP referral fax

You confirmed this is real: triggered for plans like Mercy when the PCP has to
be asked for a referral.

Today the Mercy path only raises a banner — *"Mercy Plan requires a referral
from PCP — make sure Special Notes captures this"* — and nothing records whether
the fax was actually sent. This would add a checkpoint that does, and carry it
into the notes.

**Can be done independently of B1.** Small and self-contained.

---

## C. Things I would fix

### C1. Three roster entries that can be picked but never match anything

`Tiffany Milette`, `Danielle Strum` and `Diana Thayer` are on the active roster
with no specialty and no locations. They are selectable, and because they have
no specialty they can never match a diagnosis — so choosing one leads somewhere
unhelpful with no explanation.

They are on the practice's locations sheet, so they are active staff; they are
probably not physicians who take referrals. **Options:** give them specialties
and locations, or move them to a non-selectable "staff" group like the inactive
providers. I need to know which they are before choosing.

### C2. `is_qualifying` is used for both past and upcoming appointments

The rule includes "not Cancelled or No Show", which cannot apply to a future
appointment. It should split into `is_qualifying_past` and
`is_qualifying_upcoming`.

Carried over from the original logic spec. No reported failure — flagged as a
latent inconsistency, not a live bug.

### C3. The last single-question trip back to the referral fax

The referring provider's specialty question sits alone between Care Team and
Full Registration, in 38% of walks. Folding it into a form would mean asking it
on the 62% that do not need it.

**My read: leave it.** Recorded so it is not rediscovered as new.

---

## D. Housekeeping

### D1. Trim the workers.dev subdomain step from DEPLOY.md

It registered itself on retry; the dashboard trip was unnecessary. The step
should become a footnote about what to do if auto-registration fails, not a
required step.

### D2. Confirm the 22 inactive providers against Athena by NPI

Twenty came from the practice's archived public directory; two (Jody Eckhardt,
Lorraine Homes) are absent from the locations sheet. All are listed but
unselectable. Absence from a directory is the only evidence — worth confirming
before treating the list as settled.

**Not something I can do.** It needs Athena access.

### D3. Keep the rules in step with the tool after Phase 2

`TPR-RULES.md` in the private docs repo carries the rules of record. If B1
lands, its structure section needs updating in the same sitting.

---

## How to answer

Reply on the pull request, or just tell me the numbers: *"do B2, C1 as staff
group, D1; skip A2 and A3; A1 is clinic-level only."* I will implement what you
approve, verify it the usual way, and merge.
