/**
 * Referral Sync Helper - feedback relay
 *
 * Takes a feedback submission from the tool and opens a GitHub Issue for it.
 * Exists so the GitHub token stays on the server: anything shipped to the page
 * can be read out of it, so the browser never sees a credential and never talks
 * to the GitHub API directly.
 *
 * Configuration (see DEPLOY.md):
 *   GITHUB_TOKEN   - secret, set with `wrangler secret put GITHUB_TOKEN`
 *   GITHUB_REPO    - var, "owner/name" of the repo that receives the issues
 *   ALLOWED_ORIGIN - var, the exact origin allowed to POST here
 */

const MAX_NOTE = 4000;
const MAX_PATH = 8000;
const MAX_FIELD = 300;
const MAX_BODY_BYTES = 32 * 1024;

function cors(env, extra) {
  const h = {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  return Object.assign(h, extra || {});
}

function json(env, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: cors(env, { "Content-Type": "application/json; charset=utf-8" }),
  });
}

function clean(v, max) {
  if (typeof v !== "string") return "";
  // Control characters other than tab and newline have no business in an issue.
  return v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/**
 * Second pass at the same redaction the page applies before sending. The page
 * can be bypassed - anyone who has read its source can post here directly - so
 * the rules are enforced again on arrival rather than trusted.
 *
 * Dates and long digit runs: a date of birth, a phone number, an MRN. The
 * Worker cannot know the patient's name, so that part is the page's job and
 * this is what remains enforceable here.
 */
const REDACTION = "[removed]";

function redact(t) {
  return String(t || "")
    .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, REDACTION)
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, REDACTION)
    .replace(/\b\d{7,}\b/g, REDACTION)
    .replace(/\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g, REDACTION);
}

/** Fenced so a submission cannot break out of the block and inject markdown. */
function fence(text) {
  let ticks = "```";
  while (text.indexOf(ticks) !== -1) ticks += "`";
  return ticks + "\n" + text + "\n" + ticks;
}

function buildIssue(item) {
  // Title: who reported it, where it happened, then enough of the report to
  // recognise it in a list. The name leads because triage order depends on it,
  // and the issue list is the only place that decision gets made.
  const where = item.part || item.short || "Referral Sync Helper";
  let gist = item.note.replace(/\s+/g, " ").trim();
  if (gist.length > 60) gist = gist.slice(0, 60).replace(/\s+\S*$/, "") + "...";
  const who = item.reviewer ? "[" + item.reviewer + "] " : "";
  const title = (who + where + ": " + gist).slice(0, 240);

  const lines = [];
  lines.push("**Reported by:** " + (item.reviewer || "(not given)"));
  lines.push("");
  lines.push("**Step:** " + (item.part || "-") + (item.short ? " - " + item.short : ""));
  lines.push("");
  lines.push("**Question shown:**");
  lines.push("");
  lines.push(fence(item.text || "-"));
  lines.push("");
  lines.push("**Feedback:**");
  lines.push("");
  lines.push(fence(item.note));
  lines.push("");
  lines.push("**Task ID:** " + (item.taskId || "-"));
  lines.push("");
  lines.push("**Path so far:**");
  lines.push("");
  lines.push(fence(item.path || "-"));
  lines.push("");
  lines.push("**Submitted:** " + (item.at || "-"));
  lines.push("");
  lines.push("**Node:** `" + (item.nodeId || "-") + "`");
  lines.push("");
  lines.push(
    "<sub>Opened automatically by the feedback relay. The patient name and every " +
      "other free-text field that could carry patient information are redacted " +
      "before sending; the Task ID and the name of the staff member reporting are " +
      "kept deliberately - the first as an internal reference, the second so " +
      "somebody can come back to them. No visitor identifying information is " +
      "collected.</sub>"
  );
  return { title: title, body: lines.join("\n") };
}

/**
 * Double-tap guard. Holds a fingerprint of each accepted submission for 60
 * seconds and refuses an exact repeat, so a second tap on Send cannot open a
 * second issue.
 *
 * Backed by KV rather than module memory. Memory was tried first and does not
 * work: consecutive requests land on different isolates, so the second tap
 * never sees the first. It filed a duplicate issue on the live deployment
 * before this was changed.
 *
 * Still not a rate limiter - it stops an identical repeat, nothing wider.
 */
const DEDUPE_TTL_S = 60;

function fingerprint(item) {
  const s = [item.note, item.nodeId, item.taskId, item.reviewer].join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + ":" + s.length;
}

async function seenRecently(env, key) {
  if (!env.RELAY_DEDUPE) return false; // unbound in dev - fail open, never closed
  try {
    return (await env.RELAY_DEDUPE.get(key)) !== null;
  } catch (err) {
    return false; // a KV outage must not stop feedback being sent
  }
}

/**
 * Recorded only after an issue actually exists. Marking it on arrival would mean
 * a submission GitHub rejected still counted as seen, so the reviewer's retry
 * would be answered "already sent" with nothing on the other end - which is the
 * one failure this whole design is meant to prevent.
 */
async function rememberSent(env, key) {
  if (!env.RELAY_DEDUPE) return;
  try {
    await env.RELAY_DEDUPE.put(key, "1", { expirationTtl: DEDUPE_TTL_S });
  } catch (err) {
    /* the issue exists; failing to record that is not worth failing the request */
  }
}

// The outbound call is bound once, here, rather than written as a bare `fetch`
// inside the exported handler. A bare `fetch` in that position resolved to the
// handler itself on the Workers runtime and threw "Callback returned incorrect
// type; expected 'Promise'" - which the offline harness could never show,
// because it stubs globalThis.fetch and so has nothing to shadow.
const httpPost = globalThis.fetch.bind(globalThis);

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      // Nothing here reaches the page beyond a generic message: an exception
      // string can carry request detail, and this runs with a token in scope.
      console.log("RELAY_EXCEPTION " + (err && err.stack ? err.stack : String(err)));
      return json(env, 500, { ok: false, error: "Relay error." });
    }
  },
};

async function handle(request, env) {
  {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }
    if (request.method !== "POST") {
      return json(env, 405, { ok: false, error: "Use POST." });
    }
    if (!env.ALLOWED_ORIGIN || request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      return json(env, 403, { ok: false, error: "Origin not allowed." });
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
      // Deliberately vague - this message reaches the page.
      return json(env, 500, { ok: false, error: "Relay is not configured." });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(env, 413, { ok: false, error: "That feedback is too large to send." });
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      return json(env, 400, { ok: false, error: "Could not read that submission." });
    }

    const item = {
      note: redact(clean(payload.note, MAX_NOTE)),
      // Staff, not patient. Deliberately kept and never redacted - a report with
      // nobody's name on it cannot be followed up, which is why it is asked.
      reviewer: clean(payload.reviewer, MAX_FIELD),
      short: clean(payload.short, MAX_FIELD),
      part: clean(payload.part, MAX_FIELD),
      nodeId: clean(payload.nodeId, MAX_FIELD),
      taskId: clean(payload.taskId, MAX_FIELD),
      text: clean(payload.text, MAX_PATH),
      path: redact(clean(payload.path, MAX_PATH)),
      at: clean(payload.at, MAX_FIELD),
    };

    if (!item.note) {
      return json(env, 400, { ok: false, error: "Write something before sending." });
    }

    const fp = fingerprint(item);
    if (await seenRecently(env, fp)) {
      // Reported as success: the feedback is recorded, just not twice. Telling
      // the reviewer it failed would invite a third tap.
      return json(env, 200, { ok: true, duplicate: true, number: null, url: null });
    }

    const issue = buildIssue(item);

    let res;
    try {
      res = await httpPost("https://api.github.com/repos/" + env.GITHUB_REPO + "/issues", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.GITHUB_TOKEN,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "referral-sync-helper-feedback-relay",
        },
        body: JSON.stringify({ title: issue.title, body: issue.body }),
      });
    } catch (err) {
      return json(env, 502, { ok: false, error: "Could not reach GitHub." });
    }

    if (!res.ok) {
      // The upstream body can echo the request, so it is neither logged nor
      // returned - a token must not be able to surface through an error path.
      return json(env, 502, {
        ok: false,
        error: "GitHub rejected the request (" + res.status + ").",
      });
    }

    await rememberSent(env, fp);

    let created = {};
    try {
      created = await res.json();
    } catch (err) {
      /* the url is a nicety, not required */
    }

    return json(env, 200, {
      ok: true,
      number: created.number || null,
      url: created.html_url || null,
    });
  }
}

// Exported for the offline test harness only; the Worker itself uses `fetch`.
export const __test = { clean, fence, buildIssue, redact };
