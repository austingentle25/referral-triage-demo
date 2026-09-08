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
