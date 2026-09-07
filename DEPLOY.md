# Deploying the feedback relay

Feedback submitted in Referral Sync Helper currently lives in the page and dies
with the tab. This relay sends each report to a GitHub Issue so it becomes a
trackable item instead.

The relay exists for one reason: a GitHub token must never reach the browser.
Anything the page holds can be read out of it with dev tools, so the page talks
to the relay and the relay talks to GitHub.

Everything that does not need your credentials is done — see below. **Two steps
remain and only you can do them: creating the GitHub token, and logging into
Cloudflare. I have not verified the live deployment**, only the Worker's logic
offline and the issue format against real GitHub.

---

## Already done

| | |
|---|---|
| Issue repo | **`austingentle25/referral-sync-feedback`** — created, private |
| `wrangler.toml` | Points at it. `ALLOWED_ORIGIN` set to the live tool |
| Issue format | Proved against real GitHub — [issue #1](https://github.com/austingentle25/referral-sync-feedback/issues/1) |
| Worker logic | 41 offline checks pass |
| Redaction | Applied in the page and again in the Worker |

The issues go to a **private** repo, not the tool's public one. Feedback is free
text typed while working a real referral; issues on a public repo are readable
by anyone on the internet with no account. Delete the proof issue whenever you
like — it exists to show what an issue looks like.

## What is redacted before anything is sent

The page scrubs first, then the Worker scrubs again on arrival, because a rule
enforced only in the page protects nobody against a client that skips it.

| Removed | Where |
|---|---|
| The patient name for that determination, whole and by each part of it (so "Capes" is caught as well as "Steven H Capes") | Page only — the Worker cannot know the name |
| Dates in any common form — a date of birth typed into the note | Page and Worker |
| Runs of 7+ digits — MRN, account numbers | Page and Worker |
| Formatted phone numbers | Page and Worker |
| The patient-name step of the path | Already dropped before this |

What survives is the complaint itself, the step, the node id, the Task ID and
the decision path. A note reading *"Steven Capes has DOB 05/13/1948, phone
602-555-0100, MRN 1234567890 - this question is unclear"* arrives as
*"[removed] [removed] has DOB [removed], phone [removed], MRN [removed] - this
question is unclear"*.

The Task ID is kept deliberately: it is what makes a report actionable, and it
is an internal task reference rather than patient identity.

---

## What is left, and only you can do it

Two steps need your own credentials. I cannot create a token or authorise a
Cloudflare account on your behalf, and there is no Node on this machine, so
wrangler could not be installed or run here either.

### 1. Create a fine-grained personal access token

<https://github.com/settings/personal-access-tokens/new>

- **Resource owner:** your account
- **Repository access:** *Only select repositories* → **`referral-sync-feedback`**
- **Permissions:** Repository permissions → **Issues: Read and write**. Nothing else.
- **Expiration:** as short as you will tolerate re-issuing. 90 days is reasonable.

Do not use a classic token — it cannot be scoped to one repo, so a leak would
expose everything you own.

Copy the token when it is shown. GitHub will not show it again.

### 2. Install and log into Wrangler

```bash
npm install -g wrangler
```

```bash
wrangler login
```

That opens a browser to authorise Cloudflare. A free Workers plan is enough.

### 3. Store the token as a secret

```bash
cd worker && wrangler secret put GITHUB_TOKEN
```

Paste the token at the prompt. It is stored encrypted by Cloudflare and is never
written to any file in this repo.

**Do not** put it in `wrangler.toml` under `[vars]`. That file is committed, so
the token would be public the moment you pushed.

### 4. Deploy

```bash
cd worker && wrangler deploy
```

Wrangler prints the URL, of the form
`https://referral-sync-feedback.<your-subdomain>.workers.dev`.

### 5. Plug the URL into the tool

In `index.html`, find:

```js
var FEEDBACK_RELAY_URL = "";
```

Set it to the URL from step 4, then commit and push. GitHub Pages redeploys in
about a minute.

While that constant is empty the tool behaves exactly as it did before — reports
are kept in the page and copied out by hand — so there is no broken state
between now and the deploy.

### 6. Check it end to end

Open the live tool, flag a problem on any question, and confirm:

- the button reads **Sent ✓**
- an issue appears in `referral-sync-feedback`
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

41 checks, no install needed. It stubs `fetch`, `Response` and `Headers`, and
covers the method and origin gates, missing configuration, empty and
whitespace-only notes, unparseable and oversized bodies, the length caps, the
issue formatting, markdown-fence escaping, control-character stripping, and
that the token never appears in a response or an issue body.

It cannot tell you anything about the live deployment. Only step 6 can.

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
