# 300 scenarios - report

Produced by `tools/scenario-report.js` against the fourteen-step build with step
15 added. Reproduce with:

```js
(0,eval)(await fetch('/walk-harness.js').then(r=>r.text()));
(0,eval)(await fetch('/scenario-report.js').then(r=>r.text()));
await window.__REPORT(300)
```

**Read this section first.** Nothing below is an assertion that the tool is
correct. Three of the checks could not tell you much, and they say so in place
rather than being left out.

---

## What the run could not tell you

| Check | Why it says little |
|---|---|
| **Stop reasons** | **0 of 300 walks stopped for manual review**, so there were no stop reasons to count. Every stop path in the graph is unexercised by this run. This is a gap in the sampling, not evidence that stops are fine |
| **Node coverage** | 33 `auto` nodes are invisible to it. They resolve without rendering, are never written to the session log, and the instrument cannot see them either way. Coverage is over the 95 interactive nodes only |
| **Not-reached nodes** | Sampling proves rarity, never deadness. The 17 below may all be perfectly reachable |

An earlier version of this report claimed 50 unreached nodes. 33 of those were
`auto` nodes that had certainly run - the start node among them. The number was
wrong, and it is recorded here because a coverage figure that counts nodes the
instrument cannot observe is worse than no figure.

---

## Outcomes

| Outcome | Count |
|---|---|
| Determination | 300 (100%) |
| Manual-review stop | 0 |
| Incomplete (hit the 200-iteration ceiling) | 0 |
| Error | 0 |

- Walks that errored: **0**
- Walks that hit the iteration ceiling: **0**
- Walks that self-looped (same node twice in a row): **0**
- Walks visiting any node twice: **0**
- Walks asking any question twice: **0**

## Node coverage

95 interactive nodes. **78 reached, 17 not.**

Not reached in 300 walks - rare, not proven dead:

`p1_diag_input` · `p_provider_specialty` · `p1_check_treats` · `p2_diag_input2` ·
`p2_diag_written_check` · `p2_diag_q` · `p3_q1` · `p3_q2a` · `p3_dept_other` ·
`p3_q2b` · `p4_q2` · `p4_referral_required` · `p4_referral_auth` ·
`p4_diag_input` · `p4_q3` · `p5_urgent_fax` · `p5_insurance1_ask`

## Orphans - this is the check that proves deadness

Static scan for node ids with **zero inbound references** anywhere in the source:

| Node | Kind | Status |
|---|---|---|
| `p4_diag_input` | diagnosis | **Dead.** Appears once in the file, its own definition |
| `p5_urgent_fax` | yesno | **Dead.** Appears once in the file, its own definition |

Both pre-date this branch - they are orphaned in `fed4d81` too, so neither was
introduced by the renumber. Not removed here: this phase was asked for a report,
and deleting graph nodes is a decision to take deliberately, the way
`p1_name_manual` was. Logged in `OPEN-ITEMS.md`.

## Step 15 - SMS Outreach

Of 300 walks, **51 reached step 15**; the other 249 are "NR" - held, stopped, or
not a Camelback assignment, so the question does not arise.

| Result | Count |
|---|---|
| **Eligible** | **1** |
| In-clinic scheduling only | 16 |
| No phone number on file | 15 |
| No text consent recorded | 9 |
| Missing information (all variants) | 10 |

**1 in 51 may be stricter than intended, and is the main thing to look at.** The
same 51 walks came out 20-eligible before this change. The missing-information
gate is the broadest part: `outstandingItems()` counts an unapplied document
label and a referring-provider address as missing information, and either one
currently blocks a text.

Two branches of `buildSmsEligibility()` never fire in 300 walks and did not fire
in any fixture: `"not scheduled through Valerie"` and `"not a Camelback receiving
assignment"`. Both are unreachable because routing sends those referrals to a
different bucket before eligibility is computed. They are kept as backstops and
labelled as such rather than left looking load-bearing.

## Fixtures

`tools/sms-fixtures.js` - 8 cases, **8 pass**. They drive the real page; there is
no stub of `buildSmsEligibility()`, because a second implementation of the rule
would pass while the shipped one was broken.

Two fixtures were wrong before they were right, and the tool was correct both
times: Byrne is Camelback-only, so assigning him to Arrowhead is corrected by the
tool rather than ignored, and Cataldo never reaches the scheduling bucket at all.
