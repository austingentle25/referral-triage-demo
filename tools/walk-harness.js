/*
 * Referral Sync Helper - determination harness
 *
 * Paste into the browser console with the tool open, then:
 *
 *   const R = window.__HARNESS(120);          // 120 seeded walks
 *   window.__DIGEST(R)                        // seed=hash, for before/after diff
 *
 * To prove a change altered nothing, serve the old build alongside the new one,
 * run __DIGEST on each, and compare. Same seeds, same choices, so any difference
 * in the digest is a difference in the determination.
 *
 * It drives the real page - real renderers, real event handlers - rather than
 * calling the graph directly. That is deliberate and it is the difference that
 * matters: a large part of the payor routing, including the whole edge-case
 * dispatch and the Mercy skip, lives in applyPayorChoice() in the render half of
 * the file, not in the node definitions. A harness that stubs the DOM and walks
 * the graph cannot see any of it, and will report those nodes as unreachable
 * when they are reached on 4% of walks.
 *
 * What it is not: it samples paths, it does not enumerate them. "Never reached
 * in 400 walks" means rare, not dead - use grep for inbound references to prove
 * a node is orphaned.
 *
 * Three rules learned the hard way, all still load-bearing:
 *
 *  - Terminal means a determination is present (.output-card). An earlier
 *    version counted "the loop stopped" as a completion and hid a 158-iteration
 *    infinite loop.
 *  - Candidate buttons come from the question card only, and are keyed by
 *    identity (data-provider, then element id, then label). Keyed by position or
 *    by label, regrouping a list or rewording a button changes what the walker
 *    clicks and reads as a routing change when nothing routed differently.
 *  - The provider filter is excluded from answer inputs. It filters; it does not
 *    answer.
 */

// Property-based walker. Terminal = a determination is present (.output-card).
// A stop-card is a legitimate manual-review end but is NOT a determination, and
// "the loop stopped" is never counted as either - an earlier harness counted a
// stopped loop as a completion and hid a 158-iteration infinite loop.
window.__HARNESS = function(n){
const S=(e,v)=>{if(!e)return;const p=e.tagName==='SELECT'?window.HTMLSelectElement:(e.tagName==='TEXTAREA'?window.HTMLTextAreaElement:window.HTMLInputElement);Object.getOwnPropertyDescriptor(p.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
const KNOWN=['22796','45897','3150','1467','679628','1910','58750','100575','549986','325316','112','44273'];
const DX=['chest pain','angina','stroke','atrial fibrillation','heart failure','hyperlipidemia','aortic stenosis'];
// Every restricted provider is named here on purpose. Selection is by typing a
// surname, so a restricted provider absent from this list is one the walker can
// never choose - and the "restricted provider says so on the card" invariant
// then passes without having checked them. Franco and Ning were invisible that
// way for 2000 walks. Adding a restricted provider to the tool means adding the
// surname here.
const NM=['Byrne','Kline','Cataldo','Loli','Bahu','Gupta','Mix','Maki','Sturm','Kholghi','Klein','Ibrahim','Franco','Ning'];
function walk(seed){
 let s=(seed*2654435761)>>>0; const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 document.getElementById('headerReset').click();
 const asked=[]; let iters=0; let out=null, stop=false;
 for(iters=0;iters<200;iters++){
  if(document.querySelector('.output-card')){out='done';break;}
  if(document.querySelector('.stop-card')){stop=true;break;}
  const q=((document.querySelector('#stage h2')||{}).textContent||'').trim(); if(q)asked.push(q);
  if(document.getElementById('payorSearch')){
    if(rnd()<0.7){const inp=document.getElementById('payorSearch');S(inp,KNOWN[Math.floor(rnd()*KNOWN.length)]);
      const f=document.querySelector('#payorSuggestions .dx-suggestion[data-val]'); if(f){f.click();continue;}}
    const outs=[...document.querySelectorAll('.payor-out')]; if(!outs.length)break;
    outs[Math.floor(rnd()*outs.length)].click();
    const opts=['Yes','Yes','No','Edge case','Self-pay']; const c=opts[Math.floor(rnd()*opts.length)];
    const cb=document.querySelector('[data-f="contracted"] .form-opt[data-v="'+c+'"]'); if(!cb)break; cb.click();
    if(c==='Yes'){const r=document.querySelector('[data-f="referral"] .form-opt[data-v="'+(rnd()<0.5?'Yes':'No')+'"]');if(r)r.click();
                  const a=document.querySelector('[data-f="auth"] .form-opt[data-v="'+(rnd()<0.5?'Yes':'No')+'"]');if(a)a.click();}
    const go=document.getElementById('payorManualGo'); if(!go||go.disabled)break; go.click(); continue;}
  if(document.querySelector('.form-fields')){
    document.querySelectorAll('.form-field').forEach(fd=>{const o=[...fd.querySelectorAll('.form-opt')];
      if(o.length)o[Math.floor(rnd()*o.length)].click();
      else{const t=fd.querySelector('.form-text');const lab=(fd.querySelector('.form-q')||{}).textContent||'';
        if(t&&!t.value&&/referral date/i.test(lab))S(t,'06/18/2026'); else if(t&&!t.value&&rnd()<0.5)S(t,'x');}});
    const g=document.getElementById('btnFormGo'); if(!g||g.disabled)break; g.click(); continue;}
  const ps=document.getElementById('providerSearch'),sel=document.querySelector('#stage select'),
        tx=document.querySelector('#stage input[type=text]:not(#providerFilter), #stage textarea:not(#feedbackInput):not(#engFlagInput):not(#reviewerNoteInput)');
  if(ps){S(ps,NM[Math.floor(rnd()*NM.length)]);let o=[...document.querySelectorAll('#providerSuggestions .dx-suggestion[data-val]')];
    if(!o.length){S(ps,'Byrne');o=[...document.querySelectorAll('#providerSuggestions .dx-suggestion[data-val]')];}
    if(o.length)o[Math.floor(rnd()*o.length)].click();}
  else if(sel){const o=[...sel.options].filter(x=>!x.disabled&&x.value&&x.value!=='__OTHER__');if(o.length)S(sel,o[Math.floor(rnd()*o.length)].value);}
  else if(tx){let v=DX[Math.floor(rnd()*DX.length)];if(/patient's name/i.test(q))v='Patient'+seed;else if(/task id/i.test(q))v=String(4000+seed);
    else if(/who is working this referral/i.test(q))v='Austin Gentle';
    S(tx,v);const sg=[...document.querySelectorAll('.dx-suggestion[data-val]')];if(sg.length&&/diagnos/i.test(q))sg[Math.floor(rnd()*sg.length)].click();}
  // Only the question card. The feedback and engineering boxes live outside it,
  // and matching them by label meant every relabel changed what the walker
  // clicked - which reads as a routing change and is not one.
  const B=[...document.querySelectorAll('#stage .card button, #stage .payor-out')].filter(b=>!/back|start over|next patient|remove|×|flag|draft|save note|update note|clear all|reopen|add to feedback|paste a log|copy log|add these|retry|about/i.test(b.textContent));
  // Pick by identity, not DOM position: a change that only regroups rows must
  // not make the walker choose a different provider and look like a routing change.
  // Stable identity: the provider name, else the element id, else the label.
  // Keyed this way, neither regrouping rows nor rewording a button can make the
  // walker choose differently and read as a routing change.
  const key=b=>b.getAttribute('data-provider')||b.id||b.textContent;
  B.sort((x,y)=>key(x).localeCompare(key(y)));
  const c=B.find(b=>/continue|submit/i.test(b.textContent)); const g=c||(B.length?B[Math.floor(rnd()*B.length)]:null); if(!g)break; g.click();}
 let det=null;
 if(out==='done'){det={};[...document.querySelectorAll('.output-card .output-box')].forEach(b=>{
   det[(b.querySelector('.ob-label')||{}).textContent]=(b.querySelector('.ob-value')||{}).textContent;});}
 return {seed, end: out==='done'?'determination':(stop?'stop':'incomplete'), iters, asked, det};
}
const res=[]; for(let k=1;k<=(n||120);k++){try{res.push(walk(k));}catch(e){res.push({seed:k,end:'error',err:String(e)});}}
return res;
};
window.__H=function(s){let a=5381;for(let i=0;i<s.length;i++)a=((a*33)^s.charCodeAt(i))>>>0;return a.toString(36)+':'+s.length;};
// Compact digest: seed:hash-of-determination. Small enough to move between tabs.
window.__DIGEST=function(R){return R.map(r=>r.seed+'='+(r.end==='determination'?window.__H(JSON.stringify(r.det)):r.end)).join(',');};
window.__FLAGS=function(R){return R.map(r=>({s:r.seed,n:(r.asked||[]).length,
  esc:(r.asked||[]).some(q=>/Anything else Engineering needs/i.test(q)),
  contr:(r.asked||[]).some(q=>/Is this plan contracted with Biltmore/i.test(q)),
  payor:(r.asked||[]).some(q=>/What's the insurance payor ID/i.test(q)),
  lateRef:(r.asked||[]).some(q=>/toolbox \/ insurance grid say a referral is required/i.test(q)),
  lateAuth:(r.asked||[]).some(q=>/grid say referral authorization is required/i.test(q)),
  selfpay:/self-pay/i.test((r.det||{})['Grid: Contracted']||'')}));};
