/*
 * Referral Sync Helper - step 15 (SMS Outreach) fixtures
 *
 *   (0,eval)(await fetch('/sms-fixtures.js').then(r=>r.text()));
 *   await window.__SMS_FIXTURES()
 *
 * These drive the real page. There is no stub of buildSmsEligibility() anywhere
 * here on purpose: a second implementation of the rule would pass while the
 * shipped one was broken, which is the failure this is meant to catch.
 *
 * Each fixture is a baseline "everything is fine" run with ONE condition
 * knocked out, so the reason it reports is attributable to that condition and
 * nothing else.
 */
(function () {
  var setV = function (el, v) {
    if (!el) return;
    var proto = el.tagName === "SELECT" ? window.HTMLSelectElement
              : el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement
              : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  function q() { return ((document.querySelector("#stage h2") || {}).textContent || "").trim(); }
  function cards() {
    return [].slice.call(document.querySelectorAll("#stage .card button, #stage .payor-out"))
      .filter(function (b) { return !/back|start over|next patient|remove|×|flag|draft|save note|update note|clear all|reopen|paste a log|copy log|add these|retry|about|add to feedback/i.test(b.textContent); });
  }
  function clickText(re) {
    var b = cards().filter(function (x) { return re.test(x.textContent); })[0];
    if (b) { b.click(); return true; }
    return false;
  }
  function go() {
    var b = cards().filter(function (x) { return /continue|submit/i.test(x.textContent); })[0];
    if (b && !b.disabled) { b.click(); return true; }
    return false;
  }

  // opts: { provider, camelback, phone, consent, address, docLabel }
  function drive(opts) {
    document.getElementById("headerReset").click();
    var seen = [], trace = [];
    for (var i = 0; i < 260; i++) {
      if (document.querySelector(".output-card") || document.querySelector(".stop-card")) break;
      var text = q(); if (text) seen.push(text);

      // Multi-field forms: answer each field by its own label.
      if (document.querySelector(".form-fields")) {
        [].forEach.call(document.querySelectorAll(".form-field"), function (fd) {
          var lab = (fd.querySelector(".form-q") || {}).textContent || "";
          var opts_ = [].slice.call(fd.querySelectorAll(".form-opt"));
          var want = "Yes";
          if (/phone number for this patient/i.test(lab)) want = opts.phone === false ? "No" : "Yes";
          else if (/consented to text/i.test(lab)) want = opts.consent === false ? "No" : "Yes";
          // Not "home address" anywhere on screen: the address question is worded
          // as the Match Demographics alert check, and matching the wrong words
          // silently answered Yes and made the fixture pass nothing.
          else if (/Match Demographics|address already matches/i.test(lab)) want = opts.address === false ? "No" : "Yes";
          if (opts_.length) {
            var pick = opts_.filter(function (o) { return (o.getAttribute("data-v") || o.textContent).trim().indexOf(want) === 0; })[0] || opts_[0];
            pick.click();
          } else {
            var t = fd.querySelector(".form-text");
            if (t && !t.value) setV(t, /referral date/i.test(lab) ? "06/18/2026" : "x");
          }
        });
        if (!go()) break;
        continue;
      }

      // Insurance grid: a known contracted payor, no referral or auth required.
      if (document.getElementById("payorSearch")) {
        setV(document.getElementById("payorSearch"), "22796");
        var f = document.querySelector("#payorSuggestions .dx-suggestion[data-val]");
        if (f) { f.click(); continue; }
        var outs = [].slice.call(document.querySelectorAll(".payor-out"));
        if (!outs.length) break;
        outs[0].click();
        var cb = document.querySelector('[data-f="contracted"] .form-opt[data-v="Yes"]'); if (cb) cb.click();
        var r = document.querySelector('[data-f="referral"] .form-opt[data-v="No"]'); if (r) r.click();
        var a = document.querySelector('[data-f="auth"] .form-opt[data-v="No"]'); if (a) a.click();
        var pg = document.getElementById("payorManualGo"); if (!pg || pg.disabled) break; pg.click();
        continue;
      }

      var ps = document.getElementById("providerSearch");
      var sel = document.querySelector("#stage select");
      var tx = document.querySelector("#stage input[type=text]:not(#providerFilter), #stage textarea:not(#feedbackInput):not(#engFlagInput):not(#reviewerNoteInput)");

      if (ps) {
        setV(ps, opts.provider);
        var o = [].slice.call(document.querySelectorAll("#providerSuggestions .dx-suggestion[data-val]"));
        if (o.length) o[0].click();
      } else if (sel) {
        var want = null;
        // Department pickers decide condition 1.
        if (/department|location/i.test(text)) want = opts.camelback === false ? "Arrowhead" : "Camelback";
        var opt = [].slice.call(sel.options).filter(function (x) { return !x.disabled && x.value && x.value !== "__OTHER__"; });
        var chosen = want ? (opt.filter(function (x) { return x.value.indexOf(want) === 0; })[0] || opt[0]) : opt[0];
        if (chosen) setV(sel, chosen.value);
        trace.push({ q: text.slice(0, 55), want: want, chose: chosen && chosen.value });
      } else if (tx) {
        var v = "Hyperlipidemia";
        if (/patient's name/i.test(text)) v = "SmsFixture";
        else if (/task id/i.test(text)) v = "Task-9001";
        else if (/who is working this referral/i.test(text)) v = "Austin Gentle";
        setV(tx, v);
        var sg = [].slice.call(document.querySelectorAll(".dx-suggestion[data-val]"));
        if (sg.length && /diagnos/i.test(text)) sg[0].click();
      }

      // Steer the yes/no questions that decide the fixture.
      if (/Camelback/i.test(text) && !document.querySelector(".form-fields")) {
        if (clickText(opts.camelback === false ? /^No/i : /^Yes/i)) continue;
      }
      if (/phone on file, referring provider/i.test(text)) { if (clickText(/^Yes/i)) continue; }
      if (/labelled in Athena/i.test(text)) { if (clickText(opts.docLabel === false ? /^No/i : /^Yes/i)) continue; }
      if (/marked Urgent/i.test(text)) { if (clickText(/^No/i)) continue; }

      if (!go()) {
        var b = cards().filter(function (x) { return /^Yes/i.test(x.textContent); })[0] || cards()[0];
        if (!b) break;
        b.click();
      }
    }
    var det = {};
    [].forEach.call(document.querySelectorAll(".output-card .output-box"), function (b) {
      det[(b.querySelector(".ob-label") || {}).textContent] = (b.querySelector(".ob-value") || {}).textContent;
    });
    return {
      sms: det["Step 15 - SMS outreach"],
      provider: det["Provider"], bucket: det["Bucket"],
      done: !!document.querySelector(".output-card"),
      stopped: !!document.querySelector(".stop-card"),
      questions: seen.length, seen: seen, det: det, trace: trace
    };
  }

  // Exposed for diagnosis: a failing fixture has to be attributable to the
  // product or to this driver, and telling those apart needs the trail.
  window.__SMS_DRIVE = drive;

  window.__SMS_FIXTURES = function () {
    var base = { provider: "Byrne", camelback: true, phone: true, consent: true, address: true, docLabel: true };
    function mix(extra) { var o = {}; for (var k in base) o[k] = base[k]; for (var k2 in extra) o[k2] = extra[k2]; return o; }

    var cases = [
      { name: "Camelback + unrestricted + complete", opts: mix({}), expect: /^Yes$/ },
      // Byrne is Camelback-only, so picking Arrowhead for him is corrected by the
      // tool - "Provider practices at that dept? (auto): No - switched to
      // Camelback". A non-Camelback fixture needs a provider who actually
      // practises at one, or it silently tests the Camelback path instead.
      { name: "1. non-Camelback (Gupta at Arrowhead)", opts: mix({ provider: "Gupta", camelback: false }), expect: /^NR/ },
      { name: "2. in-clinic-only provider (Loli)", opts: mix({ provider: "Loli" }), expect: /in-clinic scheduling only/ },
      { name: "2. in-clinic-only APP (Franco)", opts: mix({ provider: "Franco" }), expect: /in-clinic scheduling only/ },
      // Cataldo comes out "NR", not "not scheduled through Valerie": non-Valerie
      // referrals are routed to the sscardio bucket before eligibility is ever
      // computed, so they never reach the scheduling bucket. The guard inside
      // buildSmsEligibility is therefore unreachable today and is kept as a
      // backstop - this fixture asserts the routing that makes it unreachable,
      // so if that routing changes the assertion fails here rather than a text
      // going out.
      { name: "2. non-Valerie provider (Cataldo) - excluded by routing", opts: mix({ provider: "Cataldo" }), expect: /^NR/ },
      { name: "4. no phone on file", opts: mix({ phone: false }), expect: /no phone number on file/ },
      { name: "5. no text consent", opts: mix({ consent: false }), expect: /no text consent recorded/ },
      { name: "3. missing information (address)", opts: mix({ address: false }), expect: /missing information/ }
    ];

    var results = cases.map(function (c) {
      var r;
      try { r = drive(c.opts); } catch (e) { return { name: c.name, error: String(e) }; }
      var pass = r.sms != null && c.expect.test(r.sms);
      return { name: c.name, pass: pass, got: r.sms == null ? "(no SMS field - run did not finish)" : r.sms,
               expected: String(c.expect), provider: r.provider, done: r.done, stopped: r.stopped };
    });
    var failed = results.filter(function (r) { return !r.pass; });
    return { ok: failed.length === 0, total: results.length, failed: failed.length, results: results };
  };
})();
