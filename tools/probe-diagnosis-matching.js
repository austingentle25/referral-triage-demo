/*
 * Diagnosis matching probe - paste into the browser console on a diagnosis screen.
 *
 * Not a Node script: both matchers live inside the page's IIFE, so the only
 * honest way to measure them is through the screen the operator actually uses.
 * Reimplementing the matcher here would measure the reimplementation.
 *
 * Reports, per category of input, how many produce a canonical suggestion. The
 * "Add ..." rows are the escape hatch and count as a miss - that is the operator
 * hand-assigning a specialty, which is the case this is meant to size.
 */
(function () {
  var dx = document.getElementById("dxSearch");
  if (!dx) { console.log("Not on a diagnosis screen."); return; }
  function set(v) {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(dx, v);
    dx.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function probe(s) {
    set(s);
    var rows = [].slice.call(document.querySelectorAll("#dxSuggestions .dx-suggestion[data-val]"));
    var canon = rows.filter(function (r) {
      return !r.classList.contains("dx-suggestion-custom") && !r.classList.contains("dx-suggestion-general");
    });
    return { q: s, matched: canon.length > 0, top: canon.length ? canon[0].childNodes[0].textContent.trim() : null };
  }
  var CASES = {
    "abbreviation": ["SOB","DOE","CP","ACS","CAD","CHF","AF","AFib","HTN","HLD","MI","PAD","SVT","VT","DVT","PE","AS","AR","MR","TAVR"],
    "fax shorthand": ["SOB on exertion","r/o ACS","c/o chest pain","eval for CAD","s/p MI","w/u for syncope","pt c/o palpitations","abn EKG","abnormal ECG","+ stress test"],
    "ICD-10 code": ["I48.20","I50.9","R07.9","I25.10","I10","E78.5","I35.0","R00.2","I63.9","I20.9"],
    "misspelling": ["atrial fibrilation","fibrillaton","hyperlipidemea","arrythmia","angina pectoralis","cardiomyapathy","tachycardya","palpatations"],
    "plain english": ["short of breath","racing heart","chest tightness","passing out","swollen ankles","heart murmur","high cholesterol","irregular heartbeat"],
    "canonical (control)": ["Chest Pain (R07.9)","Atrial Fibrillation (AFib)","Hyperlipidemia / Dyslipidemia","Aortic Stenosis"]
  };
  var out = {};
  Object.keys(CASES).forEach(function (k) {
    var rs = CASES[k].map(probe);
    out[k] = {
      matched: rs.filter(function (r) { return r.matched; }).length + "/" + rs.length,
      hits: rs.filter(function (r) { return r.matched; }).map(function (r) { return r.q + " -> " + r.top; }),
      misses: rs.filter(function (r) { return !r.matched; }).map(function (r) { return r.q; })
    };
  });
  set("");
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
