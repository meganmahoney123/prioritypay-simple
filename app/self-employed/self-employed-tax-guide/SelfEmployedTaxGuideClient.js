"use client";

import { useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import guideHtml from "./guideHtml";
import guideStyles from "./guideStyles";

// Renders the approved Bloom-theme design ("PriorityPay SE Tax Guide.html",
// from the Aug 2026 redesign handoff zip) essentially verbatim -- this
// replaced an earlier version built from a different draft
// (se-basics-guide_3.html) that used its own gold/serif "editorial" look,
// inconsistent with the rest of the redesigned site. Same 39-topic content,
// restyled to match. guideHtml.js/guideStyles.js are extracted straight from
// the approved design file (see the comments in each) with one change:
// guideStyles.js's CSS has every selector prefixed with ".se-guide " (its
// :root/body rules become plain ".se-guide") so its color/font variables and
// bare-tag selectors (body, p, a, h1...) can never leak onto PublicHeader/
// PublicFooter or any other page. This is a manual-prefix scope rather than
// the CSS @scope at-rule -- an earlier version used @scope and merged the
// "se-guide" class directly onto the .wrap div, which silently broke that
// div's own ".wrap{max-width:1000px...}" centering rule (rendering the page
// flush to the left edge instead of centered) because @scope's handling of
// non-:scope selectors matching the scope root itself proved unreliable.
// guideHtml's .wrap div is now nested inside a real <div className="se-guide">
// wrapper below, so ".se-guide .wrap" is a genuine, unambiguous descendant
// selector. PublicHeader/PublicFooter are also wrapped in BLOOM_TOKENS here
// (as every other page that renders them directly does, e.g.
// sole-proprietor-vs-llc-vs-s-corp/EntityScenarioClient.js) -- an earlier
// version omitted this, which left CSS vars like --color-accent undefined
// for the header, so its "Get started" button rendered with a transparent
// background instead of solid purple. The design file's
// own <header class="site-head">/<footer class="site-foot"> are dropped in
// favor of the real PublicHeader/PublicFooter components below -- also why
// this doesn't reintroduce the design file's own footer copy, which still
// says "Money movement is performed by Dwolla, Inc." (stale, already
// corrected sitewide in PublicFooter.js).
//
// The interactive "shorten this guide to my situation" filter (four
// dropdowns + checkboxes that hide irrelevant rows) is the same vanilla JS
// from the original file, run client-side in a useEffect against the
// dangerouslySetInnerHTML'd DOM below -- it operates purely on element
// ids/classes already present in guideHtml, so porting it needed no
// rewriting, just moving it from a <script> tag into React's mount
// lifecycle.
export default function SelfEmployedTaxGuideClient() {
  useEffect(() => {
(function(){
  var state = {setup:'', year:'', w2:'', also:[]};
  var status = document.getElementById('filter-status');
  var selects = document.querySelectorAll('.sel select');
  var boxes = document.querySelectorAll('.chk input');
  var showallBtn = document.getElementById('showall');
  var reroute = document.getElementById('reroute');

  function has(v){ return state.also.indexOf(v) > -1; }

  function relevant(tags){
    if(tags.indexOf('core') > -1) return true;
    for(var i=0;i<tags.length;i++){
      var t = tags[i];
      if(t === 'first' && state.year === 'first') return true;
      if(t === 'behind' && (has('behind') || state.year === 'unfiled')) return true;
      if(t === 'w2yes' && (state.w2 === 'w2yes' || state.w2 === 'spouse')) return true;
      if(t !== 'first' && t !== 'behind' && t !== 'w2yes' && has(t)) return true;
    }
    return false;
  }

  function answered(){
    return !!(state.setup || state.year || state.w2 || state.also.length);
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
      reroute.hidden = !(state.setup === 'scorp' || state.setup === 'partners');
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
    state = {setup:'', year:'', w2:'', also:[]};
    selects.forEach(function(s){ s.value = ''; s.classList.remove('set'); });
    boxes.forEach(function(b){ b.checked = false; });
    document.body.classList.remove('showall');
    showallBtn.textContent = 'Show the rest anyway';
    reroute.hidden = true;
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
  }, []);

  return (
    <div style={BLOOM_TOKENS}>
      {/* Figtree + IBM Plex Mono (the design's --display/--body/--util fonts)
          are already loaded globally in app/layout.js, so no font <link>
          is needed here. */}
      <style dangerouslySetInnerHTML={{ __html: guideStyles }} />
      <PublicHeader />
      <div className="se-guide">
        <div dangerouslySetInnerHTML={{ __html: guideHtml }} />
      </div>
      <PublicFooter />
    </div>
  );
}
