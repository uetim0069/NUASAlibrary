/* Project AI "Kin" interface: a glowing orb that follows the cursor, a step checklist and a live status card.
   No dependencies. index.html calls PJKin.workStage(), PJKin.setupStage(), PJKin.mount() and PJKin.sync(). */
(function () {
  "use strict";
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var SUB = {
    title: "Cover, declaration, certification", abs: "Summary of the whole study", c1: "Background, objectives, hypotheses",
    c2a: "Concepts and theories", c2b: "Empirical review and gaps", c3: "Design, sample and models", c4: "Tables, tests and discussion",
    c5: "Summary, conclusion, recommendations", refs: "Only works that exist, verify each", appx: "The questionnaire"
  };
  var I = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5c.6 4.9 4.6 8.9 9.5 9.5-4.9.6-8.9 4.6-9.5 9.5-.6-4.9-4.6-8.9-9.5-9.5 4.9-.6 8.9-4.6 9.5-9.5Z"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>',
    ff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3.5 6.5v11l8-5.5-8-5.5Zm9 0v11l8-5.5-8-5.5Z"/></svg>'
  };
  var CFG = { stateText: { run: "Project AI is writing", done: "Draft complete", err: "Project AI stopped", pause: "Project AI is paused", idle: "Project AI is ready" } };

  /* ---------- markup ---------- */
  function orb() {
    return '<div class="kinOrbArea"><div class="kinOrbMove"><div class="kinOrbHalo"></div><div class="kinTilt"><div class="kinOrb"><span class="kinEyes"><i></i><i></i></span></div></div></div></div>';
  }
  function pill(t) { return '<div class="kinPill" role="status"><span class="kinDot"></span><span id="kinPillT">' + esc(t) + '</span></div>'; }
  function stepHTML(s) {
    return '<a class="pjRi ' + esc(s.s) + '" data-go="' + esc(s.id) + '"><span class="pjD ' + esc(s.s) + '"></span><span class="kinStT"><b>' + esc(s.t) + '</b><small>' + esc(SUB[s.id] || "") + '</small></span></a>';
  }
  function timeHTML(list) {
    return list.map(function (c) {
      return '<span class="kinTm ' + esc(c.s) + '"><i class="kinTi"></i>' + esc(c.t) + '</span>';
    }).join("");
  }
  function actHTML(d) {
    var a = [];
    if (d.run) a.push('<button type="button" class="kinAct" data-kact="stop">' + I.star + 'Stop</button>');
    else if (d.canCont) a.push('<button type="button" class="kinAct" data-kact="cont">' + I.star + 'Continue</button>');
    if (d.has) { a.push('<button type="button" class="kinAct" data-kact="doc">' + I.star + 'Word file</button>'); a.push('<button type="button" class="kinAct" data-kact="copy">' + I.star + 'Copy</button>'); }
    if (d.hasPlan) a.push('<button type="button" class="kinAct" data-kact="plan">' + I.star + 'Study plan</button>');
    if (!d.run) a.push('<button type="button" class="kinAct" data-kact="new">' + I.star + 'New project</button>');
    return a.join("");
  }
  function aiCard(d) {
    return '<div class="kinAi"><div class="kinAiH"><span class="kinLogo">' + I.star + '</span><b>PROJECT AI</b></div>'
      + '<p class="kinSmall" id="kinSmall">' + esc(d.small) + '</p>'
      + '<div class="kinBig" id="kinBig">' + esc(d.big) + '</div>'
      + '<div class="kinTms" id="kinTms">' + timeHTML(d.chips) + '</div>'
      + '<p class="kinMsg" id="kinMsg">' + esc(d.msg) + '</p>'
      + '<p class="kinFoot">Based on your topic &middot; a starting draft, not a final submission</p></div>'
      + '<div class="kinActs" id="kinActs">' + actHTML(d) + '</div>';
  }
  /* the writing screen */
  function workStage(d) {
    return '<section class="kin" data-state="' + esc(d.state) + '" data-cur="' + esc(d.cur) + '" aria-label="Project AI">'
      + '<div class="kinGrid"><div class="kinL">' + orb() + pill(d.pill)
      + '<div class="kinChk"><div class="kinChkH"><span>PROJECT STEPS</span><b id="kinCnt">' + d.n + ' / ' + d.total + '</b></div><div class="kinChkL" id="kinChkL">' + d.steps.map(stepHTML).join("") + '</div></div></div>'
      + '<div class="kinR"><div class="kinPills">' + d.pills.map(function (p, i) { return '<span class="kinPl' + (i ? " alt" : "") + '">' + esc(p) + '</span>'; }).join("") + '</div>'
      + (d.topic ? '<div class="kinBub">' + esc(d.topic) + '</div>' : '') + aiCard(d) + '</div></div></section>';
  }
  /* the setup screen: the topic box is the ask bar (it keeps the id pjT, so the existing code reads it) */
  function setupStage(d) {
    var lv = [["High School", "High school"], ["Undergraduate / Bachelor's", "Bachelor's"], ["Master's", "Master's"]],
      mt = [["auto", "Let it choose", "from your topic"], ["survey", "Questionnaire", "survey of respondents"], ["expost", "Ex post facto", "annual report data"]];
    var steps = [["1", "It plans your study first", "Variables, objectives, questions and hypotheses are fixed once, so every chapter agrees."],
    ["2", "It writes in your department's format", "Times New Roman 12 pt, double spacing, numbered sections, three line tables."],
    ["3", "Make it yours", "Edit or regenerate any section, then download a real Word file."]];
    return '<section class="kin kinSetupStage" data-state="idle" aria-label="Project AI"><div class="kinGrid"><div class="kinL">' + orb() + pill(CFG.stateText.idle)
      + '<div class="kinChk"><div class="kinChkH"><span>HOW IT WORKS</span><b>3 steps</b></div><div class="kinChkL">'
      + steps.map(function (s) { return '<div class="pjRi wait kinNo"><span class="pjD num">' + s[0] + '</span><span class="kinStT"><b>' + esc(s[1]) + '</b><small>' + esc(s[2]) + '</small></span></div>'; }).join("")
      + '</div></div></div>'
      + '<div class="kinR"><div class="kinPills"><span class="kinPl">Draft writer</span><span class="kinPl alt">Project format</span></div>'
      + '<div class="kinAi"><div class="kinAiH"><span class="kinLogo">' + I.star + '</span><b>PROJECT AI</b></div>'
      + '<p class="kinSmall">Hello, what are we writing?</p><div class="kinBig kinBigS">Your project topic</div>'
      + '<p class="kinMsg">I will write a complete draft in your department\'s format: title page, abstract, five chapters, references and a questionnaire appendix.</p>'
      + '<div class="kinLb">Academic level</div><div class="kinChips" id="pjLv">' + lv.map(function (x) { return '<button type="button" class="pjOpt kinChip' + (d.level === x[0] ? ' on' : '') + '" data-lv="' + esc(x[0]) + '">' + x[1] + '</button>'; }).join("") + '</div>'
      + '<div class="kinLb">Research method</div><div class="kinChips" id="pjMt">' + mt.map(function (x) { return '<button type="button" class="pjOpt kinChip' + (d.method === x[0] ? ' on' : '') + '" data-mt="' + x[0] + '">' + x[1] + '<small>' + x[2] + '</small></button>'; }).join("") + '</div>'
      + '<p class="kinFoot">A draft is a starting point &middot; check every reference and replace the sample data</p></div>'
      + '<p class="kinErr" id="kinErr" role="alert"></p>'
      + '<div class="kinAsk"><textarea id="pjT" rows="1" maxlength="300" aria-label="Project topic" placeholder="Ask Project AI to write on a topic, e.g. Effect of tax compliance costs on the profitability of SMEs in Akwa Ibom State">' + esc(d.topic) + '</textarea>'
      + '<button type="button" class="kinSend" id="kinSend" aria-label="Generate draft">' + I.send + '</button></div>'
      + '<div class="kinActs"><button type="button" class="kinAct" id="pjToTopics">' + I.star + 'Not sure of a topic? Generate ideas</button></div>'
      + '</div></div></section>';
  }

  /* ---------- live updates while a draft is written ---------- */
  function setText(id, t) { var e = document.getElementById(id); if (e && e.textContent !== t) e.textContent = t; }
  function sync(d) {
    var k = document.querySelector("#pjp .kin"); if (!k || !d || !d.steps) return;
    k.dataset.state = d.state;
    setText("kinPillT", d.pill); setText("kinSmall", d.small); setText("kinBig", d.big); setText("kinMsg", d.msg); setText("kinCnt", d.n + " / " + d.total);
    var tm = document.getElementById("kinTms"); if (tm) { var h = timeHTML(d.chips); if (tm.innerHTML !== h) tm.innerHTML = h; }
    var ac = document.getElementById("kinActs"); if (ac) { var a = actHTML(d); if (ac.innerHTML !== a) ac.innerHTML = a; }
    if (k.dataset.cur !== d.cur) {
      k.dataset.cur = d.cur;
      var L = document.getElementById("kinChkL"), c = L && L.querySelector(".pjRi.run");
      if (L && c) L.scrollTo({ top: c.offsetTop - L.clientHeight / 2 + c.offsetHeight / 2, behavior: "smooth" });
    }
  }

  /* ---------- the orb: follows the cursor (or a finger), looks at it, blinks, floats when idle ---------- */
  var P = { x: null, y: null, t: 0 }, S = { x: 0, y: 0, ex: 0, ey: 0, rx: 0, ry: 0 }, raf = 0, last = 0, bound = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tick(ts) {
    var pj = document.getElementById("pjp"), area = pj && pj.classList.contains("show") && pj.querySelector(".kinOrbArea");
    if (!area) { raf = 0; return; }
    var mv = area.querySelector(".kinOrbMove"), ti = area.querySelector(".kinTilt"), ey = area.querySelector(".kinEyes"), ob = area.querySelector(".kinOrb");
    var r = area.getBoundingClientRect(), W = r.width, H = r.height, sz = ob.offsetWidth, cx = r.left + W / 2, cy = r.top + H / 2;
    var dt = Math.min(64, last ? ts - last : 16); last = ts;
    var idle = P.x === null || ts - P.t > 4500, tx, ty, ex, eY, rx, ry;
    var maxX = Math.max(0, (W - sz) / 2 - 6), maxY = Math.max(0, (H - sz * 1.08) / 2 - 6);
    if (idle) {
      tx = Math.sin(ts / 2100) * maxX * .35; ty = Math.cos(ts / 2700) * maxY * .3; ex = Math.sin(ts / 2100) * sz * .03; eY = 0; rx = 0; ry = Math.sin(ts / 2100) * 4;
    } else {
      var dx = P.x - cx, dy = P.y - cy;
      tx = clamp(dx * .6, -maxX, maxX); ty = clamp(dy * .5, -maxY, maxY);
      var ox = P.x - (cx + S.x), oy = P.y - (cy + S.y), dist = Math.hypot(ox, oy) || 1, k = Math.min(1, dist / 220);
      ex = ox / dist * k * sz * .075; eY = oy / dist * k * sz * .055;
      ry = clamp(ox / 260, -1, 1) * 13; rx = -clamp(oy / 260, -1, 1) * 9;
    }
    if (RM) { tx = 0; ty = 0; rx = 0; ry = 0; }
    var f = 1 - Math.exp(-dt / 120);
    S.x += (tx - S.x) * f; S.y += (ty - S.y) * f; S.ex += (ex - S.ex) * (f * 1.6 > 1 ? 1 : f * 1.6); S.ey += (eY - S.ey) * (f * 1.6 > 1 ? 1 : f * 1.6); S.rx += (rx - S.rx) * f; S.ry += (ry - S.ry) * f;
    mv.style.transform = "translate3d(" + S.x.toFixed(1) + "px," + S.y.toFixed(1) + "px,0)";
    ti.style.transform = "rotateX(" + S.rx.toFixed(2) + "deg) rotateY(" + S.ry.toFixed(2) + "deg)";
    ey.style.transform = "translate(" + S.ex.toFixed(2) + "px," + S.ey.toFixed(2) + "px)";
    raf = requestAnimationFrame(tick);
  }
  function ensure() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
  function bind() {
    if (bound) return; bound = true;
    var mark = function (e) { P.x = e.clientX; P.y = e.clientY; P.t = performance.now(); ensure(); };
    window.addEventListener("pointermove", mark, { passive: true });
    window.addEventListener("pointerdown", mark, { passive: true });
    window.addEventListener("resize", ensure);
    setInterval(function () {
      var k = document.querySelector("#pjp .kin"); if (!k || Math.random() < .3) return;
      k.classList.add("kinBlink"); setTimeout(function () { k.classList.remove("kinBlink"); }, 150);
    }, 2600);
    var pj = document.getElementById("pjp"); if (!pj) return;
    pj.addEventListener("click", function (e) {
      var t = e.target, b;
      if ((b = t.closest("[data-kact]"))) {
        var a = b.dataset.kact, q = function (s) { return document.querySelector(s); };
        if (a === "plan") { var d = q("#pjp .pjPlan"); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
        var el = { stop: q("#pjStop"), cont: q("#pjCont") || q("#pjRetry"), doc: q("#pjDoc"), copy: q("#pjCopy"), "new": q("#pjNew") }[a];
        if (el) el.click(); return;
      }
      if (t.closest("#kinSend")) {
        var go = document.getElementById("pjGo"); if (go) { go.click(); var s = document.getElementById("pjE"), m = document.getElementById("kinErr"); if (s && m) m.textContent = s.textContent; }
      }
    });
    pj.addEventListener("keydown", function (e) {
      if (e.target && e.target.id === "pjT" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); var b = document.getElementById("kinSend"); if (b) b.click(); }
    });
    pj.addEventListener("input", function (e) {
      var t = e.target; if (!t || t.id !== "pjT") return;
      t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 150) + "px";
      var k = t.closest(".kin"); if (k) k.dataset.state = t.value.trim() ? "listen" : "idle";
      var m = document.getElementById("kinErr"); if (m) m.textContent = "";
    });
  }
  function mount() {
    bind(); ensure();
    var t = document.getElementById("pjT"); if (t && t.closest(".kin")) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 150) + "px"; }
  }
  window.PJKin = { workStage: workStage, setupStage: setupStage, sync: sync, mount: mount };
})();
