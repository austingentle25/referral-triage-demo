/*
 * Referral Sync Helper - 300-scenario report
 *
 *   (0,eval)(await fetch('/walk-harness.js').then(r=>r.text()));
 *   (0,eval)(await fetch('/scenario-report.js').then(r=>r.text()));
 *   await window.__REPORT(300)
 *
 * Reports what it found. It does NOT assert that everything is fine, and every
 * section that could not be produced says so in `couldNotRun` instead of being
 * silently omitted - an absent section and a clean section must never look the
 * same. Read `couldNotRun` before believing anything else here.
 *
 * Node-level facts (visited twice, coverage) come from the tool's own session
 * log, which records a node id per step. It is read by stubbing the clipboard
 * and pressing the tool's export button, so this reads exactly what an operator
 * would export rather than a private copy of the truth.
 */
(function () {
  // An auto node resolves without rendering, so it is never written to
  // stepTimings and the log cannot see it. Counting those as "not reached" reported
  // 50 unvisited nodes when 33 of them had certainly run - the start node among
  // them. Coverage is therefore stated over the interactive nodes the instrument
  // can actually observe, and the blind spot is named rather than averaged away.
  function kindOf(src, id) {
    var m = src.match(new RegExp("\\n    " + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":\\s*\\{\\s*kind:\"([a-z0-9]+)\""));
    return m ? m[1] : "auto";
  }

  function nodeIdsFromSource(src) {
    var start = src.indexOf("var NODES = {");
    if (start === -1) return null;
    var end = src.indexOf("\n  };", start);
    if (end === -1) return null;
    var block = src.slice(start, end);
    var ids = [];
    var re = /\n    ([A-Za-z_][A-Za-z0-9_]*):\s*\{/g, m;
    while ((m = re.exec(block))) ids.push(m[1]);
    return ids;
  }

  // Inbound references, which is what actually proves deadness. Definitions are
  // written `id: {` and every reference is a quoted string, so counting quoted
  // occurrences counts references and not the definition.
  function inboundCounts(src, ids) {
    var counts = {};
    ids.forEach(function (id) {
      var re = new RegExp('"' + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"', "g");
      counts[id] = (src.match(re) || []).length;
    });
    return counts;
  }

  function captureLog() {
    var grabbed = null;
    var realClip = navigator.clipboard && navigator.clipboard.writeText;
    var realExec = document.execCommand;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText = function (t) { grabbed = t; return Promise.resolve(); };
      }
      document.execCommand = function (cmd) {
        if (cmd === "copy") {
          var ta = document.querySelector("textarea");
          if (ta && ta.value) grabbed = ta.value;
          return true;
        }
        return realExec.apply(document, arguments);
      };
      var logBtn = [].slice.call(document.querySelectorAll("button"))
        .filter(function (b) { return /^log\b|session log|^log$/i.test(b.textContent.trim()); })[0];
      if (logBtn) logBtn.click();
      var exportBtn = document.getElementById("logExportBtn");
      if (!exportBtn) return { error: "no export button - could not reach the session log view" };
      exportBtn.click();
      if (!grabbed) return { error: "export produced nothing" };
      return { text: grabbed };
    } catch (e) {
      return { error: String(e) };
    } finally {
      if (navigator.clipboard && realClip) navigator.clipboard.writeText = realClip;
      document.execCommand = realExec;
    }
  }

  window.__REPORT = async function (n) {
    n = n || 300;
    var couldNotRun = [];
    if (!window.__HARNESS) return { couldNotRun: ["walk-harness.js is not loaded - nothing ran"] };

    var R = window.__HARNESS(n);

    // ---- outcomes, straight off the walks ----
    var outcomes = {};
    R.forEach(function (r) { outcomes[r.end] = (outcomes[r.end] || 0) + 1; });
    var errored = R.filter(function (r) { return r.end === "error"; })
                   .map(function (r) { return { seed: r.seed, err: r.err }; });
    // The harness ceiling is 200 iterations. A walk that ends "incomplete" hit it.
    var hitCeiling = R.filter(function (r) { return r.end === "incomplete"; })
                      .map(function (r) { return { seed: r.seed, iters: r.iters }; });

    // ---- a question asked twice in one walk (text level, always available) ----
    var repeatedQuestion = [];
    R.forEach(function (r) {
      var seen = {}, dupes = [];
      (r.asked || []).forEach(function (q) { seen[q] = (seen[q] || 0) + 1; if (seen[q] === 2) dupes.push(q); });
      if (dupes.length) repeatedQuestion.push({ seed: r.seed, questions: dupes });
    });

    // ---- node-level, from the tool's own export ----
    var nodesSeen = {}, revisited = [], selfLooped = [], logRuns = 0;
    var cap = captureLog();
    if (cap.error) {
      couldNotRun.push("node-level checks (visited twice, self-loop, coverage-reached): " + cap.error);
    } else {
      try {
        var parsed = JSON.parse(cap.text);
        var runs = parsed.runs || parsed.entries || (Array.isArray(parsed) ? parsed : null);
        if (!runs) throw new Error("export shape not recognised: " + Object.keys(parsed).join(","));
        logRuns = runs.length;
        runs.forEach(function (run) {
          var counts = {}, prev = null, selfHit = null;
          (run.steps || []).forEach(function (st) {
            if (!st || !st.node) return;
            nodesSeen[st.node] = (nodesSeen[st.node] || 0) + 1;
            counts[st.node] = (counts[st.node] || 0) + 1;
            if (prev === st.node && !selfHit) selfHit = st.node;
            prev = st.node;
          });
          var twice = Object.keys(counts).filter(function (k) { return counts[k] > 1; });
          if (twice.length) revisited.push({ run: run.seq, nodes: twice.slice(0, 5) });
          if (selfHit) selfLooped.push({ run: run.seq, node: selfHit });
        });
      } catch (e) {
        couldNotRun.push("node-level checks: could not parse the exported log - " + e);
      }
    }

    // ---- coverage and the static scan ----
    var reached = null, notReached = null, orphans = null, autoInvisible = null;
    try {
      var src = await fetch(location.pathname + "?rep=" + Date.now()).then(function (r) { return r.text(); });
      var ids = nodeIdsFromSource(src);
      if (!ids || !ids.length) {
        couldNotRun.push("node coverage and orphan scan: could not read the NODES block out of the served source");
      } else {
        if (Object.keys(nodesSeen).length) {
          var interactive = ids.filter(function (i) { return kindOf(src, i) !== "auto"; });
          autoInvisible = ids.length - interactive.length;
          reached = interactive.filter(function (i) { return nodesSeen[i]; });
          notReached = interactive.filter(function (i) { return !nodesSeen[i]; })
            .map(function (i) { return { id: i, kind: kindOf(src, i) }; });
        } else {
          couldNotRun.push("node coverage: no node ids came back from the log, so reached-vs-not cannot be stated");
        }
        var inbound = inboundCounts(src, ids);
        orphans = ids.filter(function (i) { return inbound[i] === 0; });
      }
    } catch (e) {
      couldNotRun.push("node coverage and orphan scan: " + e);
    }

    // ---- step 15 ----
    var done = R.filter(function (r) { return r.end === "determination"; });
    var smsField = "Step 15 - SMS outreach";
    var haveSms = done.filter(function (r) { return r.det && r.det[smsField] != null; }).length;
    if (!haveSms) couldNotRun.push("step 15: no determination carried a \"" + smsField + "\" field");
    var smsDist = {};
    done.forEach(function (r) {
      var v = (r.det || {})[smsField]; if (v == null) return;
      smsDist[v] = (smsDist[v] || 0) + 1;
    });
    var reachedSms = 0, eligible = 0, notEligible = {};
    Object.keys(smsDist).forEach(function (k) {
      if (k.indexOf("NR") === 0) return;          // did not arise
      reachedSms += smsDist[k];
      if (k === "Yes") eligible += smsDist[k];
      else notEligible[k] = smsDist[k];
    });

    return {
      walks: n,
      couldNotRun: couldNotRun,
      outcomes: outcomes,
      stopReasons: (function () {
        // Stop reasons live on the log entries, not on the walk result.
        if (cap.error) return "unavailable - " + cap.error;
        try {
          var runs = JSON.parse(cap.text).runs || [];
          var byReason = {};
          runs.forEach(function (r) {
            if (r.outcome !== "Manual review") return;
            var k = r.stopReason || "(no reason recorded)";
            byReason[k] = (byReason[k] || 0) + 1;
          });
          return Object.keys(byReason).length ? byReason : "no walk stopped for manual review";
        } catch (e) { return "unavailable - " + e; }
      })(),
      errored: errored,
      hitIterationCeiling: hitCeiling,
      repeatedQuestionInOneWalk: repeatedQuestion,
      nodeVisitedTwiceInOneWalk: cap.error ? "unavailable" : revisited,
      selfLooped: cap.error ? "unavailable" : selfLooped,
      logRunsRead: logRuns,
      coverage: {
        note: "Sampling proves RARITY, never deadness. A node in notReached was not visited by these " +
              n + " walks and may still be perfectly reachable. Only orphanNodeIds below proves deadness.",
        blindSpot: autoInvisible == null ? "unknown" :
          autoInvisible + " auto nodes are excluded entirely: they resolve without rendering, are never " +
          "written to the session log, and this instrument cannot see them either way. Coverage below is " +
          "over interactive nodes only.",
        interactiveNodes: reached && notReached ? reached.length + notReached.length : null,
        reachedCount: reached ? reached.length : null,
        notReachedCount: notReached ? notReached.length : null,
        notReached: notReached
      },
      orphanNodeIds: {
        note: "Zero inbound references anywhere in the source. This is the check that proves deadness.",
        ids: orphans
      },
      step15: {
        reachedStep15: reachedSms,
        eligible: eligible,
        notEligibleReasons: notEligible,
        fullDistributionIncludingNotApplicable: smsDist
      }
    };
  };
})();
