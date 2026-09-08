#!/usr/bin/env node
/**
 * Self-test for analyse-logs.mjs.
 *
 * Builds a fixture in the shape the tool actually exports - verified against a
 * real format-2 export, including the null ms on the untimed opening step - and
 * checks that each section of the report says what the fixture was built to say.
 *
 *   node tools/selftest-analyse.mjs
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "tpr-logs-"));
const step = (node, short, part, ms) => ({ node, short, part, ms });

// Two shapes of walk, so there is a common path and a rare one.
const common = [
  step("p_patient_name", "Patient name", 0, null),   // untimed by design
  step("p_task_id", "Task ID", 0, 4000),
  step("p0_status", "Established (3 yrs)?", 1, 3000),
  step("p2_diag_input2", "Diagnosis", 1, 20000),
];
const rare = common.concat([step("p9_payor_id", "Payor ID", 9, 45000)]);

const entries = [];
// 10 common walks. The diagnosis question is deliberately bimodal: half at 2s,
// half at 40s, which is the "operator left to go and look it up" signature.
for (let i = 0; i < 10; i++) {
  const steps = common.map((s) => ({ ...s }));
  steps[3].ms = i < 5 ? 2000 : 40000;
  entries.push({
    runId: "common-" + i, outcome: "Complete", ms: 9000,
    stopReason: "", stopPart: null, steps,
    // Every common walk reverses out of the diagnosis question.
    backSteps: [{ from: "p2_diag_input2", fromShort: "Diagnosis", to: "p0_status", toShort: "Established (3 yrs)?" }],
  });
}
// 2 rare walks, one of them a stop.
entries.push({ runId: "rare-0", outcome: "Complete", ms: 72000, stopReason: "", stopPart: null, steps: rare, backSteps: [] });
entries.push({ runId: "rare-1", outcome: "Manual review", ms: 72000,
  stopReason: "No provider available who treats the diagnosis.", stopPart: 2, steps: rare, backSteps: [] });
// A format-1 entry, which must be counted as skipped rather than as an empty walk.
const legacy = { runId: "legacy-0", outcome: "Complete", ms: 1000 };

writeFileSync(join(dir, "a.json"), JSON.stringify({ format: "tpr-session-log", version: 2, entries }));
writeFileSync(join(dir, "b.json"), JSON.stringify({ format: "tpr-session-log", version: 1, entries: [legacy] }));
writeFileSync(join(dir, "c.json"), "not json at all");

const out = execFileSync(process.execPath, [join(import.meta.dirname, "analyse-logs.mjs"), dir], { encoding: "utf8" });
rmSync(dir, { recursive: true, force: true });

let failed = 0;
const check = (name, cond) => { console.log((cond ? "  ok   " : "  FAIL ") + name); if (!cond) failed++; };

check("counts the walks it can use", /Walks analysed:\s+12/.test(out));
check("names format-1 entries as skipped, not empty", /Skipped \(format 1[^)]*\): 1/.test(out));
check("names the unreadable file", /c\.json \(not JSON\)/.test(out));
check("reports outcomes", /11\s+92%\s+Complete/.test(out) && /1\s+8%\s+Manual review/.test(out));
check("reports the stop reason", /No provider available who treats the diagnosis\./.test(out));
check("finds two distinct paths", /distinct paths: 2 across 12 walks/.test(out));
check("ranks the payor question by total time", /Payor ID/.test(out));
check("spots the bimodal diagnosis question", /BIMODAL[\s\S]*Diagnosis/.test(out));
check("does not call a single-mode question bimodal", !/BIMODAL[\s\S]*Established/.test(out));
// 10 of the 12 walks that reached the question reversed out of it. The
// denominator is everyone who saw it, not everyone who went back.
check("reports the reversed question against everyone who saw it", /83%\s+10 of 12\s+Diagnosis/.test(out));
check("the untimed opening step still counts for coverage", /Reached but never timed[\s\S]*n=12\s+Patient name/.test(out));
check("an untimed step is not ranked as instant", !/0\.0s\s+0\.0s\s+0\.0s\s+12\s+Patient name/.test(out));

console.log(failed ? "\nFAILED: " + failed : "\nall analyser checks pass");
process.exit(failed ? 1 : 0);
