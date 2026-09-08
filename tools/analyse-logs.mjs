#!/usr/bin/env node
/**
 * Referral Sync Helper - session log analysis
 *
 * Reads a directory of log exports (format tpr-session-log, version 2) and
 * reports how the graph is actually worked, as against how it could be worked.
 *
 *   node tools/analyse-logs.mjs <dir-of-exports> [--html out.html]
 *
 * Nothing here ships. index.html does not reference it and must not: the tool
 * makes no network calls and holds no state, and this reads files off disk.
 *
 * Format 1 exports carry none of the per-step detail. They are counted and
 * named rather than silently treated as empty walks, because "we have no data
 * yet" and "the data says nothing happens" look identical in a report otherwise.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node tools/analyse-logs.mjs <dir-of-exports> [--html out.html]");
  process.exit(2);
}
const htmlAt = process.argv.indexOf("--html");
const htmlOut = htmlAt !== -1 ? process.argv[htmlAt + 1] : null;

const files = readdirSync(dir).filter((f) => extname(f) === ".json");
const entries = [];
let legacyEntries = 0, badFiles = [];
for (const f of files) {
  let data;
  try { data = JSON.parse(readFileSync(join(dir, f), "utf8")); }
  catch { badFiles.push(f + " (not JSON)"); continue; }
  if (!data || data.format !== "tpr-session-log" || !Array.isArray(data.entries)) {
    badFiles.push(f + " (not a session log export)"); continue;
  }
  for (const e of data.entries) {
    if (!Array.isArray(e.steps) || !e.steps.length) { legacyEntries++; continue; }
    entries.push(e);
  }
}

const pct = (n, d) => (d ? ((100 * n) / d).toFixed(0) + "%" : "-");
const ms = (v) => (v >= 60000 ? (v / 60000).toFixed(1) + "m" : (v / 1000).toFixed(1) + "s");
function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ---- per node ----
const nodes = new Map();
const touch = (id, short, part) => {
  if (!nodes.has(id)) nodes.set(id, { id, short: short || id, part, times: [], reached: 0, backFrom: 0, backTo: 0 });
  return nodes.get(id);
};
for (const e of entries) {
  // Reached and timed are counted separately. The opening question is exported
  // with a null time by design, and pushing that into the timing array made it
  // rank as 0.0s across every walk - the tool takes care not to claim a step was
  // instantaneous and the analysis must not undo that.
  for (const s of e.steps) {
    const n = touch(s.node, s.short, s.part);
    n.reached++;
    if (typeof s.ms === "number") n.times.push(s.ms);
  }
  for (const b of e.backSteps || []) { touch(b.from, b.fromShort).backFrom++; touch(b.to, b.toShort).backTo++; }
}

// ---- paths ----
const paths = new Map();
for (const e of entries) {
  const key = e.steps.map((s) => s.node).join(">");
  paths.set(key, (paths.get(key) || 0) + 1);
}

// ---- outcomes ----
const outcomes = new Map(), stops = new Map();
for (const e of entries) {
  outcomes.set(e.outcome, (outcomes.get(e.outcome) || 0) + 1);
  if (e.stopReason) stops.set(e.stopReason, (stops.get(e.stopReason) || 0) + 1);
}

/**
 * Bimodal timing usually means the question is ambiguous and some operators
 * leave the tool to go and look something up. Detected as a wide split between
 * the fast half and the slow half rather than by fitting anything: with a
 * handful of samples per node a real mixture model would be false precision.
 */
function bimodality(times) {
  if (times.length < 6) return null;
  const s = [...times].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const lo = s.slice(0, mid), hi = s.slice(mid);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const ml = mean(lo), mh = mean(hi);
  if (ml <= 0) return null;
  return { ratio: mh / ml, lo: ml, hi: mh };
}

const rows = [...nodes.values()].map((n) => {
  const s = [...n.times].sort((a, b) => a - b);
  const total = s.reduce((a, b) => a + b, 0);
  return {
    ...n,
    n: n.reached,
    timed: s.length,
    median: s.length ? quantile(s, 0.5) : null,
    p90: s.length ? quantile(s, 0.9) : null,
    total: s.length ? total : null,
    backRate: n.reached ? n.backFrom / n.reached : 0,
    bim: bimodality(n.times),
  };
});

const L = [];
const say = (t = "") => L.push(t);

say("REFERRAL SYNC HELPER - SESSION LOG ANALYSIS");
say("Generated " + new Date().toISOString());
say("");
say("Files read:        " + files.length);
say("Walks analysed:    " + entries.length);
if (legacyEntries) say("Skipped (format 1, no per-step detail): " + legacyEntries);
if (badFiles.length) { say("Unreadable:"); badFiles.forEach((b) => say("  - " + b)); }

if (!entries.length) {
  say("");
  say("No walks with per-step detail. Either no logs have been exported since");
  say("format 2 shipped, or the exports are older. Nothing below can be");
  say("computed from what is here - this is an empty dataset, not a finding.");
} else {
  say("");
  say("OUTCOMES");
  [...outcomes.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => say("  " + String(v).padStart(5) + "  " + pct(v, entries.length).padStart(5) + "  " + k));
  if (stops.size) {
    say("");
    say("STOP REASONS");
    [...stops.entries()].sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => say("  " + String(v).padStart(5) + "  " + k));
  }

  say("");
  say("PATH DISTRIBUTION");
  say("  distinct paths: " + paths.size + " across " + entries.length + " walks");
  const top = [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  top.forEach(([k, v], i) => say("  " + (i + 1) + ". " + v + " walks (" + pct(v, entries.length) + "), " + k.split(">").length + " questions"));
  const once = [...paths.values()].filter((v) => v === 1).length;
  say("  paths seen exactly once: " + once + " (" + pct(once, paths.size) + " of distinct paths)");

  say("");
  say("WHERE OPERATOR TIME GOES - ranked by total time across all walks");
  say("  " + "total".padStart(8) + "  " + "median".padStart(7) + "  " + "p90".padStart(7) + "  " + "n".padStart(4) + "  question");
  const timedRows = rows.filter((r) => r.timed > 0).sort((a, b) => b.total - a.total);
  timedRows.slice(0, 20)
    .forEach((r) => say("  " + ms(r.total).padStart(8) + "  " + ms(r.median).padStart(7) + "  " + ms(r.p90).padStart(7) + "  " + String(r.n).padStart(4) + "  " + r.short));
  const untimed = rows.filter((r) => !r.timed);
  if (untimed.length) {
    say("");
    say("  Reached but never timed - the clock does not run on these:");
    untimed.forEach((r) => say("    n=" + r.n + "  " + r.short));
  }

  const bim = rows.filter((r) => r.bim && r.bim.ratio >= 4).sort((a, b) => b.bim.ratio - a.bim.ratio);
  say("");
  say("BIMODAL TIMING - a fast group and a slow group on the same question,");
  say("which usually means some operators leave the tool to look something up");
  if (!bim.length) say("  none (needs at least 6 samples on a node)");
  bim.slice(0, 12).forEach((r) => say("  " + r.bim.ratio.toFixed(1) + "x  " + ms(r.bim.lo) + " vs " + ms(r.bim.hi) + "  n=" + r.n + "  " + r.short));

  const back = rows.filter((r) => r.backFrom > 0).sort((a, b) => b.backRate - a.backRate);
  say("");
  say("ANSWERED THEN REVERSED - highest back-navigation rate");
  if (!back.length) say("  none recorded");
  back.slice(0, 12).forEach((r) => say("  " + pct(r.backFrom, r.reached).padStart(5) + "  " + r.backFrom + " of " + r.reached + "  " + r.short));
}

const out = L.join("\n");
console.log(out);
if (htmlOut) {
  writeFileSync(htmlOut, "<!doctype html><meta charset=utf-8><title>Session log analysis</title>" +
    "<pre style=\"font:13px ui-monospace,Menlo,monospace;padding:24px;line-height:1.5\">" +
    out.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])) + "</pre>");
  console.error("\nwrote " + htmlOut);
}
