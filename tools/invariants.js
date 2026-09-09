/*
 * Referral Sync Helper - invariant check.
 *
 * Paste into the browser console with the tool open, then:
 *
 *   await window.__CHECK(300)      // returns {ok, failures, summary}
 *
 * Needs walk-harness.js loaded first; it drives the same walks.
 *
 * Every invariant here is a bug that actually happened. None of them is a
 * hypothetical, and the comment on each says which one, so nobody deletes a
 * check because it looks redundant.
 */
(function () {
  function pct(n, d) { return d ? Math.round((100 * n) / d) + "%" : "-"; }

  window.__CHECK = async function (n) {
    n = n || 300;
    if (!window.__HARNESS) return { ok: false, failures: [{ name: "setup", detail: "load walk-harness.js first" }] };

    var R = window.__HARNESS(n);
    var done = R.filter(function (r) { return r.end === "determination"; });
    var fail = [];
    // Coverage is recorded next to every verdict. A check that examined nothing
    // passes and a check that examined everything passes, and without this they
    // are the same green line. The canonical-diagnosis check silently examined
    // zero entries whenever the source fetch failed, and the restricted-provider
    // check covered three of five for 2000 walks because the walker could not
    // choose the other two. Both read as clean runs.
    var cover = {};
    function check(name, bad, detail, examined) {
      cover[name] = examined;
      if (bad && bad.length) fail.push({ name: name, count: bad.length, of: n, detail: detail, sample: bad.slice(0, 3) });
    }
    // Nothing to examine is a fault in the checker, and it is reported as one
    // rather than left to be read off a coverage number nobody reads at 08:23.
    function needs(name, examined, why) {
      if (!examined) fail.push({ name: name, count: 0, of: n, detail: "checked nothing - " + why, sample: [] });
    }

    // A harness that counted "the loop stopped" as success once hid a
    // 158-iteration infinite loop. Anything that is neither a determination nor
    // a stop-with-a-reason is that bug coming back.
    check("every walk ends somewhere",
      R.filter(function (r) { return r.end === "incomplete" || r.end === "error"; }).map(function (r) { return r.seed; }),
      "walks that ran out of iterations or threw", n);

    // Care Team was asked twice on 42% of referrals for a day, and the output
    // card kept whichever answer came second.
    check("no question asked twice in one walk",
      R.filter(function (r) {
        var seen = {};
        return (r.asked || []).some(function (q) { seen[q] = (seen[q] || 0) + 1; return seen[q] > 1; });
      }).map(function (r) { return r.seed; }),
      "a repeated question can be answered differently the second time and overwrite the first", n);

    // The diagnosis is meant to be on every referral - it goes in the chart note.
    check("every determination records a diagnosis",
      done.filter(function (r) { return !/(^|→)\s*Diagnosis: /.test(r.det["Why this path"] || ""); }).map(function (r) { return r.seed; }),
      "a referral finishing without one leaves the chart note short", done.length);

    // Twice now a canonical diagnosis has been added with no keyword behind it.
    // It is pickable and carries nothing, so provider matching degrades in
    // silence - worse than the entry not being there.
    // The canonical list lives inside the page's IIFE, so it is read back out of
    // the served source rather than reached for. Self-contained on purpose: this
    // script runs unattended and should not need setting up.
    if (!window.__CANON) {
      try {
        var src = await fetch(location.pathname + "?inv=" + Date.now()).then(function (r) { return r.text(); });
        var m = src.match(/var CANONICAL_DIAGNOSES = \[([\s\S]*?)\n  \];/);
        window.__CANON = m ? (m[1].match(/"((?:[^"\\]|\\.)*)"/g) || []).map(function (x) {
          return x.slice(1, -1).replace(/\\"/g, '"');
        }) : [];
      } catch (e) { window.__CANON = []; }
    }

    // Step to a diagnosis screen rather than hoping the last walk left us on one.
    (function reachDiagnosis() {
      var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      function type(v) {
        var el = document.querySelector("#stage input[type=text]:not(#providerFilter)");
        if (!el) return false;
        setV.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true }));
        var go = Array.prototype.slice.call(document.querySelectorAll("#stage .card button"))
          .filter(function (b) { return /continue/i.test(b.textContent); })[0];
        if (go) go.click();
        return true;
      }
      document.getElementById("headerReset").click();
      for (var i = 0; i < 5 && !document.getElementById("dxSearch"); i++) {
        if (!type("check")) break;
      }
    })();

    var dx = document.getElementById("dxSearch");
    if (dx) {
      var noSpec = [];
      var setV = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      var canon = [];
      setV.call(dx, "a"); dx.dispatchEvent(new Event("input", { bubbles: true }));
      // Walk the table through the picker rather than reaching into the closure.
      (window.__CANON || []).forEach(function (d) {
        setV.call(dx, d); dx.dispatchEvent(new Event("input", { bubbles: true }));
        var row = document.querySelector("#dxSuggestions .dx-suggestion[data-val]");
        if (row && !row.classList.contains("dx-suggestion-custom") && !row.classList.contains("dx-suggestion-general")) {
          if (!row.querySelector(".dx-suggestion-cat")) noSpec.push(d);
        }
      });
      setV.call(dx, ""); dx.dispatchEvent(new Event("input", { bubbles: true }));
      check("every diagnosis resolves to a specialty", noSpec,
        "pickable but carrying nothing for provider matching", (window.__CANON || []).length);
    }
    needs("every diagnosis resolves to a specialty", dx && (window.__CANON || []).length,
      dx ? "the canonical diagnosis list could not be read out of the served source"
         : "could not reach a diagnosis screen to drive the picker");

    // The in-clinic restriction was set correctly and then stripped by two
    // formatters, so three chart notes read "Ready for Scheduling" with nothing
    // saying not to outreach the patient.
    var RESTRICTED = ["Akil Loli, MD", "Marwan Bahu, MD", "Kristin Franco, ANP", "Amilee Ning, PA-C", "Renzo Cataldo, MD"];
    var seenRestricted = RESTRICTED.filter(function (name) {
      return done.some(function (r) { return r.det["Provider"] === name; });
    });
    check("a restricted provider says so on the card",
      done.filter(function (r) {
        return RESTRICTED.indexOf(r.det["Provider"]) !== -1 && !r.det["Scheduling restriction"];
      }).map(function (r) { return r.seed + " " + r.det["Provider"]; }),
      "the restriction has been silently dropped by a formatter before", seenRestricted.length);
    // Selection is by typed surname, so a restricted provider the walker cannot
    // type is one this check never sees. It passed on three of five for 2000 walks.
    needs("a restricted provider says so on the card", seenRestricted.length === RESTRICTED.length,
      "only reached " + seenRestricted.join(", ") + " of " + RESTRICTED.length +
      " restricted providers - add the missing surname to NM in walk-harness.js");

    // Resume is how work crosses a version boundary. A path that does not come
    // back to the same determination is a path that quietly loses something.
    var broke = [];
    done.slice(0, Math.min(done.length, 60)).forEach(function (r) {
      var rr = resumeOnce(r.det["Why this path"]);
      if (rr.error || !rr.done) { broke.push(r.seed + " " + (rr.error || "no determination").slice(0, 50)); return; }
      var keys = Object.keys(r.det).concat(Object.keys(rr.det));
      var diff = keys.filter(function (k) { return norm(r.det[k]) !== norm(rr.det[k]); });
      if (diff.length) broke.push(r.seed + " " + diff.slice(0, 2).join(", "));
    });
    check("paths resume to the same determination", broke,
      "checked on the first 60 walks", Math.min(done.length, 60));

    // The reviewer line is the one difference that is real and not a fault. The
    // first referral of a session is asked who is working it; every later one -
    // including a resumed one - carries the answer. So the same answers give
    // "Reviewer: X" once and "Reviewer (auto): X - carried" thereafter. Excluded
    // by name rather than by exclusion of the whole trail, because a checker that
    // reports a known-benign failure every hour is a checker nobody reads.
    function norm(v) {
      return String(v == null ? "" : v).replace(/Reviewer(?: \(auto\))?: [^→]*/g, "Reviewer: -");
    }

    function resumeOnce(path) {
      document.getElementById("headerReset").click();
      var d = document.querySelector(".resume-box"); if (d) d.open = true;
      var ta = document.getElementById("resumeInput");
      if (!ta) return { error: "no resume box" };
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(ta, path);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      document.getElementById("resumeBtn").click();
      var err = document.getElementById("resumeError");
      var det = {};
      Array.prototype.forEach.call(document.querySelectorAll(".output-card .output-box"), function (b) {
        det[(b.querySelector(".ob-label") || {}).textContent] = (b.querySelector(".ob-value") || {}).textContent;
      });
      return {
        error: err && err.style.display === "block" ? err.textContent : null,
        done: !!document.querySelector(".output-card"), det: det
      };
    }

    var lens = R.map(function (r) { return (r.asked || []).length; }).sort(function (a, b) { return a - b; });
    return {
      ok: fail.length === 0,
      failures: fail,
      coverage: cover,
      summary: {
        walks: n,
        determinations: done.length + " (" + pct(done.length, n) + ")",
        stops: R.filter(function (r) { return r.end === "stop"; }).length,
        questionsMedian: lens[Math.floor(lens.length / 2)],
        questionsMax: lens[lens.length - 1]
      }
    };
  };
})();
