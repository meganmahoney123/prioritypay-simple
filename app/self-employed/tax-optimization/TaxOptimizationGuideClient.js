"use client";

import { useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import guideHtml from "./guideHtml";
import guideStyles from "./guideStyles";

// Renders the Tax Optimization guide on the Bloom theme, following the same
// pattern as SelfEmployedTaxGuideClient.js for the basics guide: guideHtml
// (extracted from se-optimization-guide.html, restructured -- see the
// comments at the top of guideHtml.js) is mounted via dangerouslySetInnerHTML
// inside a <div className="se-guide"> wrapper so guideStyles.js's
// ".se-guide "-prefixed CSS has a real ancestor to descend from, and
// PublicHeader/PublicFooter replace the standalone file's own site
// chrome (which this file never had, unlike the basics guide's source).
//
// Unlike the basics guide, this page ships two extra pieces of vanilla JS
// beyond the "shorten this guide to my situation" filter: CALCUTIL (shared
// number-input formatting helpers) and TAX (the 2026 sole-prop vs. S-corp
// tax engine backing the S-corp calculator in the structure section). All
// four scripts from the original standalone file are concatenated here,
// in their original order, inside one useEffect -- CALCUTIL and TAX are
// declared with `var` so the calculator's own IIFE (which runs last) can
// close over them, exactly as they did as separate <script> tags in the
// original file.
export default function TaxOptimizationGuideClient() {
  useEffect(() => {
(function(){
  var state = {also:[]};
  var status = document.getElementById('filter-status');
  var selects = document.querySelectorAll('.sel select');
  selects.forEach(function(s){ state[s.getAttribute('data-q')] = ''; });
  var boxes = document.querySelectorAll('.chk input');
  var showallBtn = document.getElementById('showall');
  var reroute = document.getElementById('reroute');

  function has(v){ return state.also.indexOf(v) > -1; }

  var RANK = {u30:0, p30:1, p75:2, p150:3, p400:4};
  function atLeast(band){
    if(!state.profit) return false;
    return RANK[state.profit] >= RANK[band];
  }
  function relevant(tags){
    if(tags.indexOf('core') > -1) return true;
    for(var i=0;i<tags.length;i++){
      var t = tags[i];
      if(t === 'p75' || t === 'p150' || t === 'p400') { if(atLeast(t)) return true; continue; }
      if(t === 'spouse' && (has('spouse') || state.otherplan === 'spousew2')) return true;
      if(t === 'hdhp' && state.health === 'hdhp') return true;
      if(t === 'marketplace' && state.health === 'marketplace') return true;
      if(t === 'scorp' && state.setup === 'scorp') return true;
      if(has(t)) return true;
    }
    return false;
  }

  function answered(){
    if(state.also.length) return true;
    for(var i = 0; i < selects.length; i++){
      if(selects[i].value) return true;
    }
    return false;
  }

  function apply(){
    var rows = document.querySelectorAll('details.row');
    var hidden = 0;

    rows.forEach(function(el){
      var tags = (el.getAttribute('data-t')||'').split(' ');
      var why = el.querySelector('.why');
      if(why) why.remove();
      var keep = !answered() || relevant(tags);
      el.classList.toggle('off', !keep);
      // keep the table of contents in step
      var tocLi = document.querySelector('.toc-sec li[data-ref="'+el.id+'"]');
      if(tocLi) tocLi.classList.toggle('off', !keep);
      if(!keep){
        el.open = false;
        hidden++;
        var note = document.createElement('div');
        note.className = 'why';
        note.textContent = 'Based on your answers, probably not your situation';
        el.querySelector('summary').appendChild(note);
      }
    });

    // hide a whole section, its TOC block and its nav item when every row is gone
    document.querySelectorAll('section[id]').forEach(function(sec){
      var all = sec.querySelectorAll('details.row').length;
      var off = sec.querySelectorAll('details.row.off').length;
      var gone = all > 0 && all === off;
      sec.classList.toggle('off', gone);
      var t = document.querySelector('.toc-sec[data-sec="'+sec.id+'"]');
      if(t) t.classList.toggle('off', gone);
      var n = document.querySelector('nav.mini li[data-sec="'+sec.id+'"]');
      if(n) n.classList.toggle('off', gone);
    });

    var shown = rows.length - hidden;
    var count = document.getElementById('toc-count');
    if(!answered()){
      status.textContent = 'Showing all ' + rows.length + ' topics.';
      if(count) count.textContent = document.querySelectorAll('section[id]').length + ' sections · ' + rows.length + ' topics';
      showallBtn.hidden = true;
      document.body.classList.remove('showall');
    } else if(hidden === 0){
      status.textContent = 'All ' + rows.length + ' topics look relevant to you.';
      if(count) count.textContent = document.querySelectorAll('section[id]').length + ' sections · ' + rows.length + ' topics';
      showallBtn.hidden = true;
      document.body.classList.remove('showall');
    } else {
      status.textContent = 'Shortened to ' + shown + ' of ' + rows.length + ' topics.';
      if(count){
        var secsLeft = document.querySelectorAll('section[id]:not(.off)').length;
        count.textContent = secsLeft + ' sections · ' + shown + ' topics for you';
      }
      showallBtn.hidden = false;
    }
  }

  showallBtn.addEventListener('click', function(){
    var on = document.body.classList.toggle('showall');
    showallBtn.textContent = on ? 'Shorten it again' : 'Show the rest anyway';
  });

  selects.forEach(function(sel){
    sel.addEventListener('change', function(){
      state[sel.getAttribute('data-q')] = sel.value;
      sel.classList.toggle('set', !!sel.value);
      if(reroute) reroute.hidden = !(false);
      apply();
    });
  });

  boxes.forEach(function(box){
    box.addEventListener('change', function(){
      var v = box.getAttribute('data-v');
      if(v === 'none' && box.checked){
        boxes.forEach(function(b){ if(b !== box) b.checked = false; });
      } else if(box.checked){
        boxes.forEach(function(b){ if(b.getAttribute('data-v') === 'none') b.checked = false; });
      }
      state.also = [];
      boxes.forEach(function(b){
        var val = b.getAttribute('data-v');
        if(b.checked && val !== 'none') state.also.push(val);
      });
      if(document.querySelector('.chk input[data-v="none"]').checked) state.also.push('__none');
      apply();
    });
  });

  document.getElementById('reset').addEventListener('click', function(){
    state = {also:[]};
    selects.forEach(function(s){
      state[s.getAttribute('data-q')] = '';
      s.value = '';
      s.classList.remove('set');
    });
    boxes.forEach(function(b){ b.checked = false; });
    document.body.classList.remove('showall');
    showallBtn.textContent = 'Show the rest anyway';
    if(reroute) reroute.hidden = true;
    apply();
  });

  // Opening a row from a TOC link should expand it
  document.querySelectorAll('.toc-sec li a').forEach(function(a){
    a.addEventListener('click', function(){
      var el = document.querySelector(a.getAttribute('href'));
      if(el && el.tagName === 'DETAILS') el.open = true;
    });
  });
})();

// small shared helpers; no shared state
var CALCUTIL = {
  money: function(n){ return '$' + Math.round(n).toLocaleString('en-US'); },
  parse: function(v){ var n=parseFloat(String(v).replace(/[^0-9.]/g,'')); return isNaN(n)?0:n; },
  fmt:   function(n){ return n ? Math.round(n).toLocaleString('en-US') : '0'; },
  bindNum: function(el, onChange, markTouched){
    if(!el) return;
    el.addEventListener('input', function(){
      if(markTouched) el.dataset.touched = '1';
      var c = el.selectionStart, before = el.value.length;
      el.value = CALCUTIL.fmt(CALCUTIL.parse(el.value));
      var d = el.value.length - before;
      try { el.setSelectionRange(Math.max(0,c+d), Math.max(0,c+d)); } catch(e){}
      onChange();
    });
  }
};

// 2026 tax engine, shared by all guide calculators.
// Figures traced to figures-2026.md.
var TAX = (function(){
  var BR = {
    single: [[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]],
    mfj:    [[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]]
  };
  var SD = {single:16100, mfj:32200};
  var QBI_THRESH = {single:201750, mfj:403500};
  var QBI_PHASE  = {single:276750, mfj:553500};
  var SS_CAP = 184500;

  function inctax(ti, status){
    var b = BR[status], t=0, prev=0;
    for(var i=0;i<b.length;i++){
      if(ti > b[i][0]){ t += (b[i][0]-prev)*b[i][1]; prev = b[i][0]; }
      else { t += Math.max(0, ti-prev)*b[i][1]; return t; }
    }
    return t;
  }

  function seTax(profit){
    var ne = profit * 0.9235;
    if(ne <= 0) return {total:0, ne:0};
    var ss = Math.min(ne, SS_CAP) * 0.124;
    var mc = ne * 0.029;
    return {total: ss+mc, ne: ne};
  }

  // QBI with the wage limitation that applies above the threshold.
  // wages = W-2 wages the business paid (0 for a sole proprietor).
  function qbiDeduction(qbi, preQbiTaxable, wages, status){
    var full = 0.20 * Math.max(0, qbi);
    var incomeCap = 0.20 * Math.max(0, preQbiTaxable);
    var thresh = QBI_THRESH[status], phase = QBI_PHASE[status];
    var limited;
    if(preQbiTaxable <= thresh){
      limited = full;                                   // no wage test yet
    } else {
      var wageLimit = 0.50 * wages;                     // 50% of W-2 wages
      if(preQbiTaxable >= phase){
        limited = Math.min(full, wageLimit);            // fully phased in
      } else {
        var pct = (preQbiTaxable - thresh) / (phase - thresh);
        limited = full - (full - Math.min(full, wageLimit)) * pct;
      }
    }
    return Math.max(0, Math.min(limited, incomeCap));
  }

  function soleProp(profit, status, other){
    other = other || 0;
    var se = seTax(profit);
    var half = se.total/2;
    var businessIncome = profit - half;                  // only this is QBI
    var agi = businessIncome + other;
    var pre = Math.max(0, agi - SD[status]);
    var qbi = qbiDeduction(businessIncome, pre, 0, status);  // no W-2 wages
    var ti  = Math.max(0, pre - qbi);
    var it  = inctax(ti, status);
    return {label:'Sole proprietor', profit:profit, salary:null, other:other,
            employmentTax:se.total, preAgiDeduction:half, agi:agi,
            standard:SD[status], preQbi:pre, qbi:qbi, taxable:ti,
            incomeTax:it, total:se.total+it};
  }

  function sCorp(profit, salary, status, other){
    other = other || 0;
    salary = Math.max(0, Math.min(salary, profit));
    var employerFica = Math.min(salary,SS_CAP)*0.062 + salary*0.0145;
    var employmentTax = employerFica*2;                  // employer + employee halves
    var passthrough = profit - salary - employerFica;    // only this is QBI
    var agi = salary + passthrough + other;
    var pre = Math.max(0, agi - SD[status]);
    var qbi = qbiDeduction(passthrough, pre, salary, status);
    var ti  = Math.max(0, pre - qbi);
    var it  = inctax(ti, status);
    return {label:'S-corp', profit:profit, salary:salary, other:other,
            employmentTax:employmentTax, preAgiDeduction:employerFica, agi:agi,
            standard:SD[status], preQbi:pre, qbi:qbi, taxable:ti,
            incomeTax:it, total:employmentTax+it};
  }


  return {soleProp:soleProp, sCorp:sCorp, inctax:inctax, seTax:seTax,
          QBI_THRESH:QBI_THRESH, SD:SD};
})();

(function(){
  var el=function(i){return document.getElementById(i);};
  var money=CALCUTIL.money, parse=CALCUTIL.parse, fmt=CALCUTIL.fmt;
  var profit=el('cs-profit'), status=el('cs-status'), other=el('cs-other'), salary=el('cs-salary');
  if(!profit) return;

  function render(){
    var p=parse(profit.value), st=status.value, o=parse(other.value);
    var s = salary.dataset.touched ? parse(salary.value) : Math.round(p*0.60);
    if(!salary.dataset.touched) salary.value = fmt(s);
    el('cs-salnote').textContent = p>0 ? Math.round(s/p*100)+'% of profit' : '';

    var a=TAX.soleProp(p,st,o), b=TAX.sCorp(p,s,st,o), set=function(i,v){ el(i).textContent=v; };
    set('o-p1',money(a.profit));        set('o-p2',money(b.profit));
    set('o-sal',money(b.salary));
    set('o-o1', o?money(o):'None');   set('o-o2', o?money(o):'None');
    set('o-e1',money(a.employmentTax)); set('o-e2',money(b.employmentTax));
    set('o-d1',money(a.preAgiDeduction)+' (half the SE tax)');
    set('o-d2',money(b.preAgiDeduction)+' (employer payroll tax)');
    set('o-a1',money(a.agi));           set('o-a2',money(b.agi));
    set('o-s1','−'+money(a.standard)); set('o-s2','−'+money(b.standard));
    set('o-q1',money(a.preQbi));        set('o-q2',money(b.preQbi));
    set('o-b1',money(a.qbi));           set('o-b2',money(b.qbi));
    set('o-t1',money(a.taxable));       set('o-t2',money(b.taxable));
    set('o-i1',money(a.incomeTax));     set('o-i2',money(b.incomeTax));
    set('o-f1',money(a.total));         set('o-f2',money(b.total));

    var diff=a.total-b.total, r=el('cs-result'), note=el('cs-note');
    if(p<=0){ r.textContent=''; note.textContent=''; return; }
    r.textContent = diff>0 ? 'On these numbers the S-corp column is '+money(diff)+' lower in federal tax.'
                  : diff<0 ? 'On these numbers the S-corp column is '+money(-diff)+' higher in federal tax.'
                  : 'On these numbers the two columns come out the same.';
    var parts=[];
    parts.push('Employment tax differs by '+money(Math.abs(a.employmentTax-b.employmentTax))+
               ' and income tax by '+money(Math.abs(a.incomeTax-b.incomeTax))+
               ', because wages are not counted in the 20% business deduction.');
    if(diff>0) parts.push('Running an S-corp costs roughly $1,400 to $3,200 a year in payroll processing and a second tax return, which comes out of that figure.');
    if(a.preQbi > TAX.QBI_THRESH[st]) parts.push('This profit is above the point where the 20% deduction becomes limited by W-2 wages, which is why the two columns diverge sharply here.');
    if(o>0) parts.push('Other household income of '+money(o)+' fills the lower brackets first, so business profit is taxed on top of it. That usually narrows the gap between the two columns.');
    parts.push('State and local tax is not included and can reverse the result.');
    note.textContent = parts.join(' ');
  }

  CALCUTIL.bindNum(profit, render, false);
  CALCUTIL.bindNum(other,  render, false);
  CALCUTIL.bindNum(salary, render, true);
  status.addEventListener('change', render);
  render();
})();
  }, []);

  return (
    <div style={BLOOM_TOKENS}>
      {/* Figtree + IBM Plex Mono are already loaded globally in app/layout.js,
          same as self-employed-tax-guide -- no font <link> needed here. */}
      <style dangerouslySetInnerHTML={{ __html: guideStyles }} />
      <PublicHeader />
      <div className="se-guide">
        <div dangerouslySetInnerHTML={{ __html: guideHtml }} />
      </div>
      <PublicFooter />
    </div>
  );
}
