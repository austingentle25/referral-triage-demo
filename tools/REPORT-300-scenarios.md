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
| **Node coverage** | 33 `auto` nodes are invisible to it. They resolve without rendering, are never written to the session log, and the instrument cannot see them either way. Coverage is over the 93 interactive nodes only |
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

93 interactive nodes. **78 reached, 15 not.**

Not reached in 300 walks - rare, not proven dead:

`p1_diag_input` · `p_provider_specialty` · `p1_check_treats` · `p2_diag_input2` ·
`p2_diag_written_check` · `p2_diag_q` · `p3_q1` · `p3_q2a` · `p3_dept_other` ·
`p3_q2b` · `p4_q2` · `p4_referral_required` · `p4_referral_auth` · `p4_q3` ·
`p5_insurance1_ask`

## Orphans - this is the check that proves deadness

Static scan for node ids with **zero inbound references** anywhere in the source:
**none.**

`p4_diag_input` and `p5_urgent_fax` were found by this scan and have since been
removed. Removing them changed nothing: the same 300 seeds produced an identical
question sequence and an identical determination on every walk, which is what
removing unreachable code should do and is the only way to show it did.

## Step 15 - SMS Outreach

Of 300 walks, **51 reached step 15**; the other 249 are "NR" - held, stopped, or
not a Camelback assignment, so the question does not arise.

| Result | Count |
|---|---|
| **Eligible** | **1** |
| In-clinic scheduling only | 16 |
| Provider not on the SMS outreach list | 11 |
| No phone number on file | 11 |
| No text consent recorded | 8 |
| Missing information (all variants) | 4 |

Outreach runs for the ten providers the practice named on 9 September 2026:
Gramze, Kline, Maki, Klein, Muzaffar, Lichtenwalter, Byrne, Ibrahim, Eckhardt and
Homes. It is a `smsOutreach` flag on the roster, not a separate list of names, so
there is one place a provider is described.

The document label no longer blocks a text - it is applied automatically, so
nobody is waiting on it. It is filtered out of this gate only; the pending list
and the output card still report it.

Two branches of `buildSmsEligibility()` never fire in 300 walks and did not fire
in any fixture: `"not scheduled through Valerie"` and `"not a Camelback receiving
assignment"`. Both are unreachable because routing sends those referrals to a
different bucket before eligibility is computed. They are kept as backstops and
labelled as such rather than left looking load-bearing.

## Fixtures

`tools/sms-fixtures.js` - 9 cases, **9 pass**. They drive the real page; there is
no stub of `buildSmsEligibility()`, because a second implementation of the rule
would pass while the shipped one was broken.

Two fixtures were wrong before they were right, and the tool was correct both
times: Byrne is Camelback-only, so assigning him to Arrowhead is corrected by the
tool rather than ignored, and Cataldo never reaches the scheduling bucket at all.
