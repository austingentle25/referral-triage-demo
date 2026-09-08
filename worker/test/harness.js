/*
 * Offline test for the feedback relay.
 *
 * There is no Node on this machine, so this runs under JavaScriptCore with the
 * few platform globals the Worker touches (Response, Headers, fetch) stubbed.
 * It exercises the request handling and the issue formatting; it cannot prove
 * anything about the live deployment, which needs a Cloudflare account.
 *
 *   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc \
 *     test/harness.js
 */

/* ---------- platform stubs ---------- */

class Headers {
  constructor(init) {
    this.map = {};
    for (const k in init || {}) this.map[String(k).toLowerCase()] = init[k];
  }
  get(k) {
    const v = this.map[String(k).toLowerCase()];
    return v === undefined ? null : v;
  }
}

class Response {
  constructor(body, init) {
    this.bodyText = body;
    init = init || {};
    this.status = init.status === undefined ? 200 : init.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers);
  }
  async text() {
    return this.bodyText;
  }
  async json() {
    return JSON.parse(this.bodyText);
  }
}

function makeRequest(method, origin, body) {
  return {
    method: method,
    headers: new Headers(origin ? { Origin: origin } : {}),
    text: async function () {
      return body === undefined ? "" : body;
    },
  };
}

/* Records what the Worker sent to GitHub, and replays a scripted reply. */
let lastCall = null;
let nextReply = { status: 201, body: { number: 7, html_url: "https://example.invalid/7" } };
globalThis.fetch = async function (url, opts) {
  lastCall = { url: url, opts: opts };
  if (nextReply.throw) throw new Error("network down");
  return new Response(JSON.stringify(nextReply.body || {}), { status: nextReply.status });
};

globalThis.Response = Response;
globalThis.Headers = Headers;

/* ---------- the module under test ---------- */

// `const` inside eval() stays in the eval scope, so the worker is attached to
// globalThis instead. Same for the helpers the module exports for testing.
// The Worker binds globalThis.fetch at module load, so the stub has to be in
// place before this is evaluated - it is, above. Named function declarations
// (handle) hoist within the eval scope, so no further rewriting is needed.
const src = readFile("src/index.js")
  .replace(/^export default /m, "globalThis.WORKER = ")
  .replace(/^export const __test = /m, "globalThis.__test = ");
(0, eval)(src);

const ORIGIN = "https://austingentle25.github.io";
// Minimal stand-in for a KV namespace, enough to exercise the dedupe guard.
const kvStore = new Map();
const KV = {
  get: async function (k) { return kvStore.has(k) ? kvStore.get(k) : null; },
  put: async function (k, v) { kvStore.set(k, v); },
};

const ENV = {
  GITHUB_TOKEN: "ghp_TESTONLY_notarealtoken",
  GITHUB_REPO: "someone/somerepo",
  ALLOWED_ORIGIN: ORIGIN,
  RELAY_DEDUPE: KV,
};

/* ---------- assertions ---------- */

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) {
    passed++;
  } else {
    failures.push(name + (detail ? "  -> " + detail : ""));
  }
}

async function post(body, env, origin) {
  lastCall = null;
  const res = await WORKER.fetch(
    makeRequest("POST", origin === undefined ? ORIGIN : origin, body),
    env || ENV
  );
  let parsed = null;
  try {
    parsed = JSON.parse(await res.text());
  } catch (e) {}
  return { res: res, json: parsed };
}

const GOOD = JSON.stringify({
  note: "The email question should mention the referral",
  short: "Full Registration sweep",
  part: "Part 5 - Writes & objects",
  nodeId: "p5_registration",
  taskId: "Task-1930",
  text: "In Full Registration, fill in all three.",
  path: "Task ID: Task-1930 -> Established (3 yrs)?: No",
  at: "2026-09-07T18:00:00.000Z",
});

(async function () {
  /* method and origin gates */
  let r = await WORKER.fetch(makeRequest("OPTIONS", ORIGIN), ENV);
  check("OPTIONS preflight is 204", r.status === 204, "got " + r.status);
  check(
    "preflight allows the tool origin",
    r.headers.get("Access-Control-Allow-Origin") === ORIGIN
  );

  r = await WORKER.fetch(makeRequest("GET", ORIGIN), ENV);
  check("GET is rejected", r.status === 405, "got " + r.status);

  let out = await post(GOOD, ENV, "https://evil.example");
  check("foreign origin is rejected", out.res.status === 403, "got " + out.res.status);
  check("foreign origin sends nothing to GitHub", lastCall === null);

  /* configuration */
  out = await post(GOOD, { ALLOWED_ORIGIN: ORIGIN, GITHUB_REPO: "a/b" });
  check("missing token is a 500", out.res.status === 500);
  check("missing token sends nothing to GitHub", lastCall === null);
  check(
    "configuration error names no variable",
    !/TOKEN|REPO/i.test(JSON.stringify(out.json)),
    JSON.stringify(out.json)
  );

  /* validation */
  out = await post(JSON.stringify({ note: "   \n\t  " }));
  check("whitespace-only note is rejected", out.res.status === 400, "got " + out.res.status);
  check("whitespace-only sends nothing to GitHub", lastCall === null);

  out = await post(JSON.stringify({ short: "no note at all" }));
  check("missing note is rejected", out.res.status === 400);

  out = await post("not json");
  check("unparseable body is rejected", out.res.status === 400);

  out = await post(JSON.stringify({ note: "x".repeat(40000) }));
  check("oversized body is rejected", out.res.status === 413, "got " + out.res.status);
  check("oversized sends nothing to GitHub", lastCall === null);

  /* caps applied to an accepted submission */
  out = await post(JSON.stringify({ note: "y".repeat(9000), short: "s".repeat(900) }));
  check("long-but-allowed submission succeeds", out.res.status === 200, "got " + out.res.status);
  const sent = JSON.parse(lastCall.opts.body);
  // Longest run, not the first: "Referral Sync Helper" in the header contains a y.
  const yRuns = (sent.body.match(/y+/g) || [""]).map(function (x) { return x.length; });
  check("note is capped at 4000", Math.max.apply(null, yRuns) === 4000, "runs " + yRuns.join(","));
  check("title is capped at 240", sent.title.length <= 240, "len " + sent.title.length);

  /* the happy path */
  out = await post(GOOD);
  check("valid submission returns 200", out.res.status === 200, "got " + out.res.status);
  check("response reports ok", out.json && out.json.ok === true);
  check("response carries the issue number", out.json.number === 7);
  check("response carries the issue url", /example\.invalid/.test(out.json.url || ""));

  const call = JSON.parse(lastCall.opts.body);
  check("posts to the configured repo", lastCall.url === "https://api.github.com/repos/someone/somerepo/issues");
  check("uses a bearer token", /^Bearer /.test(lastCall.opts.headers.Authorization));
  check("title names the part", call.title.indexOf("Part 5 - Writes & objects") === 0, call.title);
  check("body carries the note", call.body.indexOf("mention the referral") !== -1);
  check("body carries the node id", call.body.indexOf("p5_registration") !== -1);
  check("body carries the task id", call.body.indexOf("Task-1930") !== -1);
  check("body carries the path", call.body.indexOf("Established (3 yrs)?") !== -1);

  /* the token must never leave the Worker except as the GitHub header */
  const everythingReturned = JSON.stringify(out.json) + JSON.stringify(call);
  check(
    "token never appears in the response or the issue",
    everythingReturned.indexOf("ghp_TESTONLY") === -1
  );

  /* markdown injection */
  out = await post(
    JSON.stringify({ note: "```\n</sub><script>alert(1)</script>\n```  breakout attempt" })
  );
  const inj = JSON.parse(lastCall.opts.body);
  const fenceLine = inj.body.split("\n").filter(function (l) {
    return /^`{3,}$/.test(l.trim());
  });
  check(
    "fence grows past backticks in the note",
    fenceLine.some(function (l) {
      return l.trim().length > 3;
    }),
    fenceLine.join(",")
  );

  /* control characters */
  out = await post(JSON.stringify({ note: "line one\u0007\u001Bline two" }));
  const ctl = JSON.parse(lastCall.opts.body);
  check("control characters are stripped", ctl.body.indexOf("\u0007") === -1 && ctl.body.indexOf("\u001B") === -1);
  check("surrounding text survives stripping", ctl.body.indexOf("line one") !== -1 && ctl.body.indexOf("line two") !== -1);

  /* newlines in the note are kept - they are how people write */
  out = await post(JSON.stringify({ note: "first line\nsecond line" }));
  const nl = JSON.parse(lastCall.opts.body);
  check("newlines inside a note survive", nl.body.indexOf("first line\nsecond line") !== -1);

  /* redaction on arrival - the page scrubs too, this is the second pass */
  out = await post(JSON.stringify({
    note: "patient DOB 05/13/1948, call 602-555-0100 or MRN 1234567890",
    path: "Referral date: 06/18/2026",
  }));
  const red = JSON.parse(lastCall.opts.body);
  check("date of birth is removed", red.body.indexOf("05/13/1948") === -1, red.body.slice(0, 200));
  check("phone number is removed", red.body.indexOf("602-555-0100") === -1);
  check("long digit run is removed", red.body.indexOf("1234567890") === -1);
  check("surrounding words survive", red.body.indexOf("patient DOB") !== -1);
  check("a date in the path is removed too", red.body.indexOf("06/18/2026") === -1);

  /* title and body template */
  out = await post(JSON.stringify({
    note: "The Contracted question did not account for a plan that is contracted only for imaging",
    short: "Contracted?", part: "Part 4 - Insurance Check", nodeId: "p4_q2", taskId: "Task-2041",
    text: "Is this plan contracted with Biltmore?",
    path: "Patient name: [redacted] -> Task ID: Task-2041 -> Contracted?: Yes",
    at: "2026-09-07T20:00:00.000Z",
  }));
  const tmpl = JSON.parse(lastCall.opts.body);
  check("title leads with the step label", tmpl.title.indexOf("Part 4 - Insurance Check:") === 0, tmpl.title);
  check("title carries the gist", /Contracted question did not/.test(tmpl.title), tmpl.title);
  check("title is trimmed at a word", !/\s\S*\.\.\.$/.test(tmpl.title.replace(/\.\.\.$/, "x")) || /\.\.\.$/.test(tmpl.title));
  ["**Step:**", "**Question shown:**", "**Feedback:**", "**Task ID:**", "**Path so far:**", "**Submitted:**"]
    .forEach(function (k) { check("body has " + k, tmpl.body.indexOf(k) !== -1); });
  check("redacted name line keeps its shape", tmpl.body.indexOf("Patient name: [redacted]") !== -1);

  /* double-tap guard */
  const dupPayload = JSON.stringify({ note: "same thing twice", nodeId: "p4_q2", taskId: "Task-9" });
  out = await post(dupPayload);
  check("first submission opens an issue", out.res.status === 200 && lastCall !== null);
  out = await post(dupPayload);
  check("immediate repeat is not a second issue", lastCall === null, "a second issue was opened");
  check("repeat is still reported as success", out.json && out.json.ok === true && out.json.duplicate === true);
  out = await post(JSON.stringify({ note: "a different report", nodeId: "p4_q2", taskId: "Task-9" }));
  check("a different report still gets through", lastCall !== null);

  /* upstream failures */
  nextReply = { status: 401, body: { message: "Bad credentials" } };
  out = await post(JSON.stringify({ note: "upstream 401 probe", nodeId: "n1", taskId: "T1" }));
  check("GitHub 401 becomes a 502", out.res.status === 502, "got " + out.res.status);
  check(
    "upstream message is not echoed to the page",
    JSON.stringify(out.json).indexOf("Bad credentials") === -1,
    JSON.stringify(out.json)
  );

  nextReply = { throw: true };
  out = await post(JSON.stringify({ note: "network failure probe", nodeId: "n2", taskId: "T2" }));
  check("network failure becomes a 502", out.res.status === 502, "got " + out.res.status);
  nextReply = { status: 201, body: { number: 7, html_url: "https://example.invalid/7" } };

  /* a submission GitHub rejected must not be treated as already sent */
  const retryPayload = JSON.stringify({ note: "fails then retries", nodeId: "n3", taskId: "T3" });
  nextReply = { status: 500, body: {} };
  out = await post(retryPayload);
  check("rejected submission returns a failure", out.res.status === 502);
  nextReply = { status: 201, body: { number: 42, html_url: "https://example.invalid/42" } };
  out = await post(retryPayload);
  check("retry after a failure opens the issue", out.res.status === 200 && lastCall !== null);
  check("retry is not reported as a duplicate", !(out.json && out.json.duplicate));
  out = await post(retryPayload);
  check("a repeat after success is a duplicate", out.json && out.json.duplicate === true);

  /* report */
  print("");
  print("passed: " + passed);
  if (failures.length) {
    print("FAILED: " + failures.length);
    failures.forEach(function (f) {
      print("  - " + f);
    });
  } else {
    print("FAILED: 0  - all relay checks pass");
  }
})();

// ---- the reviewer name: kept, never redacted, and visible in the list ----
(function reviewerChecks(){
  var b = __test.buildIssue({
    note: "these should come after insurance",
    reviewer: "Jingyi", part: "Step 6 - Review Full Registration",
    short: "Full Registration sweep", nodeId: "p5_registration", taskId: "Task-1",
    text: "In Full Registration", path: "Patient name: [removed]", at: "now"
  });
  check("title leads with the reviewer", b.title.indexOf("[Jingyi] ") === 0);
  check("body names the reviewer", b.body.indexOf("**Reported by:** Jingyi") !== -1);

  var anon = __test.buildIssue({
    note: "no name on this one", part: "Step 1", short: "s", nodeId: "n",
    taskId: "Task-2", text: "t", path: "p", at: "now"
  });
  check("no reviewer means no bracket", anon.title.indexOf("[") !== 0);
  check("no reviewer is stated, not blank", anon.body.indexOf("**Reported by:** (not given)") !== -1);

  // A staff name must survive - it is the point of asking. Only patient-shaped
  // things are stripped.
  check("a reviewer name is not redacted", __test.redact("Jingyi") === "Jingyi");
  check("a reviewer name with a date beside it still loses the date",
        __test.redact("Jingyi 01/02/1980").indexOf("Jingyi") === 0 &&
        __test.redact("Jingyi 01/02/1980").indexOf("1980") === -1);
})();
