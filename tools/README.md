# tools/

Authoring-time scripts. **Nothing here ships.** `index.html` does not reference
any of it and must not: the deployed tool makes no network calls beyond the
webfont and keeps no state, and these read and write files on disk.

## `analyse-logs.mjs`

```bash
node tools/analyse-logs.mjs <dir-of-exports> [--html out.html]
```

Reads session log exports (Log → Copy log, saved as `.json`) and reports:

- outcomes and stop reasons
- how many distinct paths through the graph were actually walked
- where operator time goes, ranked by total time across all walks
- questions with bimodal timing - a fast group and a slow group, which usually
  means some operators leave the tool to go and look something up
- questions answered and then reversed, by back-navigation rate

**Coverage of the 120 nodes is reported as what was reached.** Nodes that appear
in no log are simply absent from the table; the graph shape is not read from
`index.html`, so this says "these were used" rather than "these 40 are dead".
Reading the graph too would make it a second parser of the file to keep in step.

Exports made before log format 2 carry no per-step detail. They are counted and
named as skipped rather than treated as empty walks - "we have no data yet" and
"the data says nothing happens" must not look the same in a report.

## `walk-harness.js`

Paste into the browser console with the tool open.

```js
const R = window.__HARNESS(120);   // 120 seeded walks
window.__DIGEST(R)                 // seed=hash of the determination
```

To prove a change altered nothing, serve the old build alongside the new one,
run `__DIGEST` on each, and compare. Same seeds, same choices, so a difference in
the digest is a difference in the determination. Every "no determination changed"
claim in this repo's commit messages was produced this way.

It drives the real page rather than calling the graph directly, because a large
part of the payor routing - the edge-case dispatch and the Mercy skip included -
lives in `applyPayorChoice()` in the render half of the file. A harness that
stubs the DOM cannot see it, and reports `p10_pcp_letter` and
`p4_edge_case_mercy_check` as unreachable when this one reaches them on 4% and
0.25% of walks respectively.

It samples paths; it does not enumerate them. **"Never reached in 400 walks"
means rare, not dead** - use grep for inbound references to prove a node is
orphaned.

## `invariants.js`

```js
// with walk-harness.js already loaded:
await window.__CHECK(300)   // -> {ok, failures, summary}
```

Runs the walks and asserts a list of properties that have each been broken at
least once. Every check names the bug it came from, so nobody deletes one for
looking redundant:

| Check | Broke on |
|---|---|
| Every walk ends somewhere | A harness counted a stopped loop as success and hid a 158-iteration loop |
| No question asked twice in one walk | Care Team, asked twice on 42% of referrals for a day |
| Every determination records a diagnosis | Referrals finished with the chart note short |
| Every diagnosis resolves to a specialty | Twice: an entry pickable with nothing behind it |
| A restricted provider says so on the card | The in-clinic restriction stripped by two formatters |
| Paths resume to the same determination | Resume wrote answers into the wrong fields |

It reads the canonical diagnosis list back out of the served source, so it needs
no setup beyond loading the harness first.

**The reviewer line is normalised before comparing.** The first referral of a
session is asked who is working it and every later one carries the answer, so the
same answers legitimately give two different trails. It is excluded by name, not
by dropping the whole comparison - a checker that reports a known-benign failure
every run is one nobody reads.
