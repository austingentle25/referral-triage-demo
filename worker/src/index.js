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
  const step = item.short || "Unlabelled step";
  const part = item.part ? item.part + " - " : "";
  const title = ("Feedback: " + part + step).slice(0, 240);

  const lines = [];
  lines.push("**Reported from Referral Sync Helper.**");
  lines.push("");
  lines.push("| | |");
  lines.push("|---|---|");
  lines.push("| Step | " + (item.short || "-") + " |");
  lines.push("| Part | " + (item.part || "-") + " |");
  lines.push("| Node | `" + (item.nodeId || "-") + "` |");
  lines.push("| Task | " + (item.taskId || "-") + " |");
  lines.push("| Submitted | " + (item.at || "-") + " |");
  lines.push("");
  lines.push("### What was reported");
  lines.push("");
  lines.push(fence(item.note));
  if (item.text) {
    lines.push("");
    lines.push("### Screen text");
    lines.push("");
    lines.push(fence(item.text));
  }
  if (item.path) {
    lines.push("");
    lines.push("### How they got there");
    lines.push("");
    lines.push(fence(item.path));
  }
  lines.push("");
  lines.push(
    "<sub>Opened automatically by the feedback relay. The path is recorded with " +
      "the patient-name step removed, and no visitor identifying information is " +
      "collected.</sub>"
  );
  return { title: title, body: lines.join("\n") };
}

export default {
  async fetch(request, env) {
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

    const issue = buildIssue(item);

    let res;
    try {
      res = await fetch("https://api.github.com/repos/" + env.GITHUB_REPO + "/issues", {
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
  },
};

// Exported for the offline test harness only; the Worker itself uses `fetch`.
export const __test = { clean, fence, buildIssue, redact };
