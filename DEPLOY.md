# Deploying the feedback relay

Feedback submitted in Referral Sync Helper currently lives in the page and dies
with the tab. This relay sends each report to a GitHub Issue so it becomes a
trackable item instead.

The relay exists for one reason: a GitHub token must never reach the browser.
Anything the page holds can be read out of it with dev tools, so the page talks
to the relay and the relay talks to GitHub.

**Everything below needs your own accounts. I cannot run any of it, and I have
not verified the live deployment — only the Worker's logic offline.**

---

## Decide first: where the issues should go

`wrangler.toml` ships with `GITHUB_REPO = "REPLACE_ME/REPLACE_ME"` deliberately.
Choose before you deploy.

**Issues on a public repository are readable by anyone on the internet, with no
GitHub account needed.** `austingentle25/referral-triage-demo` is public.

What a report carries:

| Field | Risk |
|---|---|
| `note` | **Free text, typed by staff working a real referral.** Unbounded. Nothing stops someone writing a patient's name into it. |
| `path` | The decision path, with the patient-name step removed. Still carries diagnosis, provider, insurance answers and the Task ID. |
| `taskId` | Internal task identifier |
| `short`, `part`, `text`, `nodeId` | Internal workflow structure |

The patient name is stripped, but that is the only automatic protection, and it
cannot protect a name typed into the note itself.

**Recommendation: point this at a private repo** — `austingentle25/tpr-ops-docs`
already exists and is private, or make a new private one for the issues. The
relay works the same either way; only the token's scope changes. Choosing the
public repo means accepting that clinical triage detail and anything staff type
is published, permanently and to everyone.

---

## Steps, in order

### 1. Create a fine-grained personal access token

<https://github.com/settings/personal-access-tokens/new>

- **Resource owner:** your account
- **Repository access:** *Only select repositories* → the one repo you chose above
- **Permissions:** Repository permissions → **Issues: Read and write**. Nothing else.
- **Expiration:** as short as you will tolerate re-issuing. 90 days is reasonable.

Do not use a classic token. A classic token cannot be scoped to a single repo,
so a leak would expose everything you own.

Copy the token when it is shown — GitHub will not show it again.

### 2. Install and log into Wrangler

There is no Node on the machine this was built on, so this is the first thing
you will need that I could not run.

```bash
npm install -g wrangler
```

```bash
wrangler login
```

That opens a browser to authorise Cloudflare. A free Workers plan is enough.

### 3. Point the Worker at your repo

Edit `worker/wrangler.toml`:

```toml
GITHUB_REPO = "austingentle25/tpr-ops-docs"   # or whichever you chose
ALLOWED_ORIGIN = "https://austingentle25.github.io"
```

`ALLOWED_ORIGIN` is already correct for the current deployment. It must be the
exact origin with no trailing slash and no path — requests from anywhere else
are refused.

### 4. Store the token as a secret

```bash
cd worker && wrangler secret put GITHUB_TOKEN
```

Paste the token at the prompt. It is stored encrypted by Cloudflare and is never
written to any file in this repo.

**Do not** put it in `wrangler.toml` under `[vars]`. That file is committed, so
the token would be public the moment you pushed.

### 5. Deploy

```bash
cd worker && wrangler deploy
```

Wrangler prints the URL, of the form
`https://referral-sync-feedback.<your-subdomain>.workers.dev`.

### 6. Plug the URL into the tool

In `index.html`, find:

```js
var FEEDBACK_RELAY_URL = "";
```

Set it to the URL from step 5, then commit and push. GitHub Pages redeploys in
about a minute.

While that constant is empty the tool behaves exactly as it did before — reports
are kept in the page and copied out by hand — so there is no broken state
between now and the deploy.

### 7. Check it end to end

Open the live tool, flag a problem on any question, and confirm:

- the button reads **Sent ✓**
- an issue appears on the repo you chose
- the feedback view shows **issue #N** against that report

Then break it on purpose: set `FEEDBACK_RELAY_URL` to a wrong URL locally and
submit. The button should read **Kept here — not sent**, and the feedback view
should show a red bar with **Retry sending**. Feedback must never disappear
silently, and that is the path that proves it.

---

## Testing the Worker without deploying

```bash
cd worker && /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc test/harness.js
```

36 checks, no install needed. It stubs `fetch`, `Response` and `Headers`, and
covers the method and origin gates, missing configuration, empty and
whitespace-only notes, unparseable and oversized bodies, the length caps, the
issue formatting, markdown-fence escaping, control-character stripping, and
that the token never appears in a response or an issue body.

It cannot tell you anything about the live deployment. Only step 7 can.

Once wrangler is installed you can also run it locally:

```bash
cd worker && wrangler dev
```

---

## What this does not do

**No rate limiting.** The relay caps body size, rejects empty notes and refuses
foreign origins, but nothing stops a determined person who has read the page
source from posting repeatedly and filling the tracker with issues. Real rate
limiting on Workers needs KV or a Durable Object to hold counters. If the relay
is ever abused, that is the fix; it was left out rather than faked, because a
per-isolate counter would look like protection and provide none.

**No deduplication.** Submitting the same report twice opens two issues.

**Reviewer notes and the Engineering flag are untouched.** Only the per-question
feedback box sends anything. The Engineering flag still drafts a Slack message
for you to paste, and it does include the patient name.

## Rotating or revoking the token

```bash
cd worker && wrangler secret put GITHUB_TOKEN     # replace
```

```bash
cd worker && wrangler secret delete GITHUB_TOKEN  # revoke
```

With the secret gone the relay returns "Relay is not configured" and the tool
reports feedback as not sent — it keeps it in the page rather than losing it.
Deleting the token on GitHub has the same effect.
