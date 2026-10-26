/* NUASA Project AI: study engine (shared by the browser and the Vercel function).
   Every number that appears in a generated project (population, sample size, strata, Likert tables,
   Chi-square and regression results) is computed here in code, so the arithmetic is always right and
   Chapters 3, 4 and 5 and the appendix always agree. All survey and panel figures are ILLUSTRATIVE. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.PJStudy = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- small helpers ---------- */
  function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function makeRng(seedStr) {
    let a = hashStr(seedStr) || 1;
    const next = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return {
      next, range: (lo, hi) => lo + (hi - lo) * next(), int: (lo, hi) => Math.floor(lo + (hi - lo + 1) * next()),
      norm: () => { let u = 0, v = 0; while (!u) u = next(); while (!v) v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
      pick: arr => arr[Math.floor(next() * arr.length)],
    };
  }
  /* split an integer total across weights (largest remainder), each part at least `min` */
  function splitInt(total, weights, min) {
    min = min || 0; const k = weights.length, base = Array(k).fill(min); let left = total - min * k;
    if (left < 0) { base.fill(0); left = total; }
    const sw = weights.reduce((a, b) => a + b, 0) || 1, raw = weights.map(w => left * w / sw), fl = raw.map(Math.floor);
    let rem = left - fl.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { fl[i]++; rem--; } });
    return base.map((b, i) => b + fl[i]);
  }
  const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"], TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function numWord(n) { if (n < 20) return ONES[n]; if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : ""); if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + numWord(n % 100) : ""); return String(n); }
  const words = n => numWord(n) + " (" + n + ")";
  const mn_ = s => s.replace(/^-(?=\d)/, "\u2212").replace(/^-0(\.0+)?$/, m => m.slice(1)); /* true minus sign, never a hyphen */
  const f1 = x => mn_((Math.round(x * 10) / 10).toFixed(1)), f2 = x => mn_((Math.round(x * 100) / 100).toFixed(2)), f3 = x => mn_((Math.round(x * 1000) / 1000).toFixed(3)), f4 = x => mn_((Math.round(x * 10000) / 10000).toFixed(4));
  const trimNum = (x, d) => String(+x.toFixed(d));
  const ROMAN = ["i", "ii", "iii", "iv", "v", "vi"], CHNUM = ["ONE", "TWO", "THREE", "FOUR", "FIVE"];
  const ordinal = ["One", "Two", "Three", "Four", "Five", "Six"];

  /* ---------- statistics ---------- */
  function gammaln(x) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
  function betacf(a, b, x) { const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d; for (let m = 1; m <= MAXIT; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break; } return h; }
  function betai(a, b, x) { if (x <= 0) return 0; if (x >= 1) return 1; const bt = Math.exp(gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
  const tTwoTail = (t, df) => betai(df / 2, 0.5, df / (df + t * t));
  const fSurv = (F, d1, d2) => betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * F));
  function gammaPQ(a, x) { /* regularised upper incomplete gamma Q(a,x) */ if (x <= 0) return 1; if (x < a + 1) { let ap = a, sum = 1 / a, del = sum; for (let n = 0; n < 300; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; } return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaln(a)); } let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d; for (let i = 1; i < 300; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break; } return Math.exp(-x + a * Math.log(x) - gammaln(a)) * h; }
  const chi2Surv = (x, df) => gammaPQ(df / 2, x / 2);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
  function corr(a, b) { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return sab / Math.sqrt(saa * sbb); }
  function inv(M) { const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => +(i === j)))); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; } } return A.map(r => r.slice(n)); }
  const matT = M => M[0].map((_, j) => M.map(r => r[j]));
  const matMul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  function ols(y, Xcols) { /* Xcols: array of regressor columns; intercept added */
    const n = y.length, X = y.map((_, i) => [1].concat(Xcols.map(c => c[i]))), k = X[0].length, Xt = matT(X), XtXi = inv(matMul(Xt, X));
    const beta = matMul(XtXi, matMul(Xt, y.map(v => [v]))).map(r => r[0]), fit = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0)), e = y.map((v, i) => v - fit[i]);
    const dof = n - k, ssr = e.reduce((s, v) => s + v * v, 0), my = mean(y), sst = y.reduce((s, v) => s + (v - my) ** 2, 0), r2 = 1 - ssr / sst, adj = 1 - (1 - r2) * (n - 1) / dof;
    const meat = Array.from({ length: k }, () => Array(k).fill(0)); X.forEach((r, i) => { for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a][b] += r[a] * r[b] * e[i] * e[i]; });
    const cov = matMul(matMul(XtXi, meat), XtXi).map(r => r.map(v => v * n / dof)), se = cov.map((r, i) => Math.sqrt(r[i])), t = beta.map((b, i) => b / se[i]), p = t.map(v => tTwoTail(Math.abs(v), dof));
    const F = ((sst - ssr) / (k - 1)) / (ssr / dof), Fp = fSurv(F, k - 1, dof), dw = e.slice(1).reduce((s, v, i) => s + (v - e[i]) ** 2, 0) / ssr;
    return { n, k, beta, se, t, p, r2, adj, F, Fp, dw, e, X, dof };
  }
  function vifs(Xcols) { return Xcols.map((c, i) => { const others = Xcols.filter((_, j) => j !== i); const m = ols(c, others); return 1 / (1 - m.r2); }); }
  function breuschPagan(res) { const e2 = res.e.map(v => v * v), Xc = res.X[0].slice(1).map((_, j) => res.X.map(r => r[j + 1])), m = ols(e2, Xc), lm = res.n * m.r2, df = Xc.length; return { lm, df, p: chi2Surv(lm, df) }; }

  /* ---------- markup helpers (see pj-doc.js for the grammar) ---------- */
  const row = a => a.join(" | ");
  function tableBlock(opts) { /* {no,title,kind,w,head,rows,source,split} */
    const out = ["", "[[TC]] Table " + opts.no + ": " + opts.title, "[[TB " + opts.kind + (opts.w ? " w=" + opts.w.join(",") : "") + (opts.split ? " split=" + opts.split : "") + "]]", row(opts.head)];
    opts.rows.forEach(r => out.push(row(r))); out.push("[[/TB]]", "[[TS]] " + opts.source, ""); return out.join("\n");
  }
  const SRC_RESEARCHER = "Source: Researcher’s compilation (2026).";
  const SRC_ILLUS = "Source: Illustrative sample data, to be replaced with the researcher’s field survey results (2026).";
  const SRC_ILLUS_PANEL = "Source: Illustrative sample data, to be replaced with the researcher’s extraction from annual reports (2026).";

  /* ---------- blueprint sanitiser (the client sends a blueprint; never trust it) ---------- */
  const lowerFirst = t => String(t).replace(/\b([A-Z][a-z]+)\b/g, m => m.toLowerCase());
  const cl = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]+/g, " ").replace(/[\u2014\u2013]/g, ", ").replace(/\s+/g, " ").trim().slice(0, n);
  function sanitizeBp(b) {
    b = b || {}; const ivs = (Array.isArray(b.ivs) ? b.ivs : []).slice(0, 4).map(v => ({
      name: cl(v && v.name, 90), abbr: cl(v && v.abbr, 8).toUpperCase(), phrase: cl(v && v.phrase, 130) || lowerFirst(cl(v && v.name, 90)), definition: cl(v && v.definition, 260), verb: ["determine", "assess", "examine", "ascertain", "evaluate", "investigate"].includes(String(v && v.verb)) ? v.verb : "determine",
      expected: v && v.expected === "-" ? "-" : "+", statements: (Array.isArray(v && v.statements) ? v.statements : []).slice(0, 4).map(s => cl(s, 200)).filter(Boolean),
    })).filter(v => v.name && v.statements.length === 4);
    const dv = b.dv || {}, st = (Array.isArray(b.strata) ? b.strata : []).slice(0, 3).map(s => cl(s, 40)).filter(Boolean);
    const out = {
      design: b.design === "expost" ? "expost" : "survey", title: cl(b.title, 240), org: cl(b.org, 80), orgShort: cl(b.orgShort || b.org, 40), place: cl(b.place, 80), sector: cl(b.sector, 80),
      field: cl(b.field, 60), construct: cl(b.construct, 70) || "the Independent Variables", controlName: cl(b.controlName, 40) || (b.design === "expost" ? "Firm Size" : "Department"),
      dv: { name: cl(dv.name, 90), abbr: cl(dv.abbr, 8).toUpperCase(), phrase: cl(dv.phrase, 90) || lowerFirst(cl(dv.name, 90)), definition: cl(dv.definition, 260), statements: (Array.isArray(dv.statements) ? dv.statements : []).slice(0, 4).map(s => cl(s, 200)).filter(Boolean) },
      ivs, strata: st, theories: (Array.isArray(b.theories) ? b.theories : []).slice(0, 4).map(t => ({ name: cl(t && t.name, 70), by: cl(t && t.by, 70) })).filter(t => t.name),
    };
    if (!out.title || !out.org || !out.dv.name || !out.dv.abbr || out.ivs.length < 3 || out.dv.statements.length !== 4) return null;
    while (out.strata.length < 3) out.strata.push(["Accounts and Finance", "Administration", "Operations"][out.strata.length]);
    return out;
  }

  /* ---------- the study: numbers + table blocks ---------- */
  function buildStudy(bp, form) {
    form = form || {}; const rng = makeRng((bp.title || "") + "|" + (bp.org || "")), D = bp.design, m = bp.ivs.length, S = { design: D, m, tables: {}, nos: {}, hyp: [], facts: [] };
    D === "expost" ? expost(bp, form, rng, S) : survey(bp, form, rng, S);
    const org = bp.orgShort || bp.org, post = D === "expost", L = { obj: [], rq: [], hyp: [], hypl: [] };
    bp.ivs.forEach((v, j) => {
      const end = j === m - 1 ? "." : j === m - 2 ? "; and" : ";", rel = post ? "the effect of the " + v.phrase + " on the " + bp.dv.phrase + " of " + org : "the relationship between the " + v.phrase + " and the " + bp.dv.phrase + " of " + org;
      L.obj.push("[[LI]] " + ROMAN[j] + ". " + v.verb + " " + rel + end);
      L.rq.push("[[LI]] " + ROMAN[j] + ". What is " + rel + "?");
      const h = "**H0" + (j + 1) + ":** " + (post ? "The " + v.phrase + " has no significant effect on the " + bp.dv.phrase + " of " + org + "." : "There is no significant relationship between the " + v.phrase + " and the " + bp.dv.phrase + " of " + org + ".");
      L.hyp.push("[[LI]] " + h); L.hypl.push(h);
    });
    S.lines = L;
    S.ph = Object.assign({}, S.tables, { OBJ: "\n" + L.obj.join("\n") + "\n", RQ: "\n" + L.rq.join("\n") + "\n", HYP: "\n" + L.hyp.join("\n") + "\n",
      EQ_CHI: "\n[[EQ]] χ² = Σ (O − E)² / E\n" });
    L.hypl.forEach((h, j) => { S.ph["HYP_" + (j + 1)] = "\n" + h + "\n"; });
    if (!post) S.ph.EQ_TARO = "\n[[EQ]] " + S.taro.formula + "\n[[EQ]] " + S.taro.calc + "\n";
    else S.ph.MODEL = "\n[[EQ]] " + bp.dv.abbr + "(it) = β0 + " + bp.ivs.map((v, j) => "β" + (j + 1) + v.abbr + "(it)").join(" + ") + " + β" + (m + 1) + "SIZE(it) + ε(it)\n";
    return S;
  }

  function survey(bp, form, rng, S) {
    let N = parseInt(form.population, 10); if (!(N >= 20 && N <= 600)) N = rng.int(48, 96);
    const strata = bp.strata, pop = splitInt(N, [rng.range(.28, .42), rng.range(.28, .4), rng.range(.2, .36)], 5), e = 0.05, raw = N / (1 + N * e * e), n = Math.round(raw), alloc = splitInt(n, pop, 1);
    const nonresp = Math.max(1, Math.round(n * 0.04)), R = n - nonresp, rate = R / n * 100, pilot = Math.max(10, Math.min(30, Math.round(n * 0.27))), alpha = +(rng.range(.78, .88)).toFixed(2);
    const respD = alloc.slice(); for (let i = 0; i < nonresp; i++) { let j = respD.indexOf(Math.max(...respD)); respD[j]--; }
    const jit = w => w.map(x => x * (0.85 + rng.next() * 0.3));
    const male = Math.round(R * rng.range(.5, .6)), gender = [male, R - male], age = splitInt(R, jit([.18, .4, .3, .12]), 1), qual = splitInt(R, jit([.15, .58, .27]), 1), yrs = splitInt(R, jit([.22, .44, .34]), 1);
    const pct = (x, tot) => f1(x / tot * 100), fmtN = x => String(x);
    S.N = N; S.n = n; S.R = R; S.pop = pop; S.alloc = alloc; S.strata = strata; S.rate = rate; S.pilot = pilot; S.alpha = alpha; S.nonresp = nonresp;
    S.taro = {
      formula: "n = N / (1 + N(e)²)", sub: "Substituting the values: N = " + N + ", e = 0.05",
      calc: "n = " + N + " / (1 + " + N + "(0.05)²) = " + N + " / (1 + " + trimNum(N * e * e, 4) + ") = " + N + " / " + trimNum(1 + N * e * e, 4) + " = " + f1(raw) + " ≈ " + n,
    };
    /* Chapter 3 tables */
    S.nos.T3_VAR = "3.1"; S.nos.T3_SAMPLE = "3.2";
    const varRows = bp.ivs.map(v => [v.name + " (" + v.abbr + ")", "Independent", v.definition, "4-point Likert-scale statements in Section B of the questionnaire", "Primary (Questionnaire)"]);
    varRows.push([bp.dv.name + " (" + bp.dv.abbr + ")", "Dependent", bp.dv.definition, "4-point Likert-scale statements in Section B of the questionnaire; read alongside available financial records", "Primary (Questionnaire) and Secondary (financial records, where available)"]);
    S.tables.T3_VAR = tableBlock({ no: "3.1", title: "Variable Definitions and Measurement", kind: "open", w: [18, 15, 26, 23, 18], head: ["Variable", "Type", "Definition", "Measurement", "Data Source"], rows: varRows, source: SRC_RESEARCHER });
    S.tables.T3_SAMPLE = tableBlock({ no: "3.2", title: "Summary of Sample Distribution by " + bp.controlName, kind: "grid", w: [44, 28, 28], head: [bp.controlName, "Population", "Sample Size"], rows: strata.map((s, i) => [s, pop[i], alloc[i]]).concat([["Total", N, n]]), source: SRC_RESEARCHER });
    /* Chapter 4 tables */
    let t = 0; const no = () => "4." + (++t);
    S.nos.T4_RETURN = no(); S.tables.T4_RETURN = tableBlock({ no: S.nos.T4_RETURN, title: "Questionnaire Administration and Return Rate", kind: "grid", w: [52, 24, 24], head: ["Category", "Number", "Percentage (%)"], rows: [["Copies administered", n, "100.0"], ["Copies returned and usable", R, f1(rate)], ["Copies not returned or rejected", nonresp, f1(100 - rate)]], source: SRC_ILLUS });
    const demo = (key, title, label, cats, counts) => { S.nos[key] = no(); S.tables[key] = tableBlock({ no: S.nos[key], title, kind: "grid", w: [52, 24, 24], head: [label, "Frequency", "Percentage (%)"], rows: cats.map((c, i) => [c, counts[i], pct(counts[i], R)]).concat([["Total", R, "100.0"]]), source: SRC_ILLUS }); };
    demo("T4_GENDER", "Gender Distribution of Respondents", "Gender", ["Male", "Female"], gender);
    demo("T4_AGE", "Age Distribution of Respondents", "Age Range", ["20 to 29 years", "30 to 39 years", "40 to 49 years", "50 years and above"], age);
    demo("T4_QUAL", "Educational Qualification of Respondents", "Qualification", ["OND / NCE", "HND / B.Sc.", "M.Sc. / MBA and above"], qual);
    demo("T4_DEPT", "Distribution of Respondents by " + bp.controlName, bp.controlName, strata, respD);
    demo("T4_YEARS", "Years of Service of Respondents", "Years of Service", ["Below 5 years", "5 to 10 years", "Above 10 years"], yrs);
    const lk = (mu, s) => { const w = [1, 2, 3, 4].map(i => Math.exp(-((i - mu) ** 2) / (2 * s * s)) * (0.85 + rng.next() * 0.3)), c = splitInt(R, w, 0); return { SD: c[0], D: c[1], A: c[2], SA: c[3] }; };
    const chi = o => { const E = R / 4; return ["SA", "A", "D", "SD"].reduce((s, k) => s + (o[k] - E) ** 2 / E, 0); };
    const mn = o => (4 * o.SA + 3 * o.A + 2 * o.D + o.SD) / R;
    const likertTable = (key, title, statements, mus, forceSig) => {
      const data = statements.map((s, i) => { let mu = mus[i], o = lk(mu, 0.9); if (forceSig && i === 3) { let g = 0; while (chi(o) < 9.5 && g++ < 12) { mu += 0.1; o = lk(mu, 0.8); } } return o; });
      S.nos[key] = no(); const means = data.map(mn), grand = mean(means);
      S.tables[key] = tableBlock({ no: S.nos[key], title, kind: "grid", w: [37, 8, 8, 8, 8, 10, 10, 11], head: ["Statement", "SA", "A", "D", "SD", "Total", "Mean", "Decision"], rows: statements.map((s, i) => [s, data[i].SA, data[i].A, data[i].D, data[i].SD, R, f2(means[i]), means[i] >= 2.5 ? "Agreed" : "Disagreed"]).concat([["Grand mean", "", "", "", "", "", f2(grand), grand >= 2.5 ? "Agreed" : "Disagreed"]]), source: SRC_ILLUS });
      return { data, means, grand };
    };
    S.iv = bp.ivs.map((v, j) => likertTable("T4_IV" + (j + 1), "Responses on " + v.name + " (" + v.abbr + ") and Profitability", v.statements, [rng.range(3.0, 3.35), rng.range(2.95, 3.3), rng.range(2.8, 3.25), rng.range(3.1, 3.45)], true));
    S.dvT = likertTable("T4_DV", "Responses on " + bp.dv.name + " (" + bp.dv.abbr + ")", bp.dv.statements, [rng.range(2.9, 3.3), rng.range(2.9, 3.3), rng.range(2.8, 3.25), rng.range(2.8, 3.25)], false);
    S.chi = bp.ivs.map((v, j) => {
      const o = S.iv[j].data[3], E = R / 4, cats = ["SA", "A", "D", "SD"], rows = cats.map(c => { const d = o[c] - E; return { c, O: o[c], E, d, sq: d * d, v: d * d / E }; }), x2 = rows.reduce((s, r) => s + r.v, 0), rej = x2 > 7.815;
      S.nos["T4_CHI" + (j + 1)] = no();
      S.tables["T4_CHI" + (j + 1)] = tableBlock({ no: S.nos["T4_CHI" + (j + 1)], title: "Chi-square Computation for Hypothesis " + (j + 1) + " (" + v.abbr + ")", kind: "grid", w: [20, 14, 14, 16, 18, 18], head: ["Response", "O", "E", "(O − E)", "(O − E)²", "(O − E)²/E"], rows: rows.map(r => [r.c, r.O, f1(r.E), f1(r.d), f2(r.sq), f2(r.v)]).concat([["Total", R, f1(R), "", "", f2(x2)]]), source: SRC_ILLUS });
      S.hyp.push({ x2, rej }); return { x2, rej, o, test: v.statements[3] };
    });
    S.facts = [
      "Population " + N + "; strata " + strata.map((s, i) => s + " " + pop[i]).join(", ") + "; Taro Yamane at 5% gives " + f1(raw) + ", rounded to a sample of " + n + "; sample by stratum " + strata.map((s, i) => s + " " + alloc[i]).join(", ") + ".",
      "Copies administered " + n + ", returned and usable " + R + " (" + f1(rate) + "%), not returned or rejected " + nonresp + ". Pilot study " + pilot + " respondents from a similar organisation; Cronbach's alpha " + f2(alpha) + ".",
      "Table numbers: return rate " + S.nos.T4_RETURN + "; gender " + S.nos.T4_GENDER + "; age " + S.nos.T4_AGE + "; qualification " + S.nos.T4_QUAL + "; " + bp.controlName.toLowerCase() + " " + S.nos.T4_DEPT + "; years of service " + S.nos.T4_YEARS + "; " + bp.ivs.map((v, j) => v.abbr + " " + S.nos["T4_IV" + (j + 1)]).join("; ") + "; " + bp.dv.abbr + " " + S.nos.T4_DV + "; chi-square " + bp.ivs.map((v, j) => "H" + (j + 1) + " " + S.nos["T4_CHI" + (j + 1)]).join("; ") + ".",
      "Demographics: male " + gender[0] + " (" + pct(gender[0], R) + "%), female " + gender[1] + "; age groups " + age.join("/") + "; qualification " + qual.join("/") + "; " + bp.controlName.toLowerCase() + " " + respD.join("/") + "; service " + yrs.join("/") + ".",
      ...bp.ivs.map((v, j) => v.abbr + " grand mean " + f2(S.iv[j].grand) + " (" + (S.iv[j].grand >= 2.5 ? "Agreed" : "Disagreed") + "); item means " + S.iv[j].means.map(f2).join(", ") + "; chi-square " + f2(S.chi[j].x2) + " against critical value 7.815, so H0" + (j + 1) + " is " + (S.chi[j].rej ? "rejected" : "not rejected") + ".")
      , bp.dv.abbr + " grand mean " + f2(S.dvT.grand) + "; item means " + S.dvT.means.map(f2).join(", ") + ".",
    ];
    return S;
  }

  function expost(bp, form, rng, S) {
    let k = parseInt(form.population, 10); if (!(k >= 5 && k <= 40)) k = rng.int(8, 12); const T = rng.int(8, 10), end = 2025, start = end - T + 1, m = bp.ivs.length, names = bp.ivs.map(v => v.abbr);
    const mu = bp.ivs.map(() => rng.range(12, 38)), sg = bp.ivs.map(() => rng.range(4, 9)), muY = rng.range(6, 14), sdY = rng.range(3, 4.5), insig = m === 4 && rng.next() < 0.6 ? rng.int(0, m - 1) : -1;
    const eff = bp.ivs.map((v, j) => (j === insig ? rng.range(-0.15, 0.15) : rng.range(0.7, 1.1)) * (v.expected === "-" ? -1 : 1) * sdY * 0.45);
    const firmFx = Array.from({ length: k }, () => rng.norm()), firmSz = Array.from({ length: k }, () => rng.norm()), firmX = Array.from({ length: k }, () => bp.ivs.map(() => rng.norm()));
    const Y = [], X = bp.ivs.map(() => []), SZ = [], F = [], YR = [];
    for (let i = 0; i < k; i++) for (let t = 0; t < T; t++) {
      const xs = bp.ivs.map((_, j) => mu[j] + sg[j] * (0.5 * firmX[i][j] + 0.85 * rng.norm())), z = xs.map((x, j) => (x - mu[j]) / sg[j]), size = 11.2 + 1.1 * firmSz[i] + 0.08 * t + 0.15 * rng.norm();
      let y = muY + 0.9 * firmFx[i] + 0.25 * (size - 11.2) + 1.6 * rng.norm(); z.forEach((zz, j) => { y += eff[j] / sg[j] * sg[j] * zz; });
      xs.forEach((x, j) => X[j].push(x)); Y.push(y); SZ.push(size); F.push(i + 1); YR.push(start + t);
    }
    const cols = X.concat([SZ]), res = ols(Y, cols), vf = vifs(cols), bpT = breuschPagan(res), N = Y.length, all = [Y].concat(X, [SZ]), nm = [bp.dv.abbr].concat(names, ["SIZE"]);
    S.k = k; S.popFirms = k + rng.int(4, 10); S.T = T; S.start = start; S.end = end; S.N = N; S.res = res; S.vif = vf; S.bpT = bpT; S.names = names; S.firms = k;
    S.nos = { T3_VAR: "3.1", T3_FIRMS: "3.2", T4_DESC: "4.1", T4_CORR: "4.2", T4_REG: "4.3", T4_VIF: "4.4", T4_DIAG: "4.5", T4_HYP: "4.6" };
    S.tables.T3_VAR = tableBlock({ no: "3.1", title: "Variable Definitions and Measurement", kind: "open", w: [26, 15, 38, 21], head: ["Variable", "Type", "Measurement", "Source"], rows: bp.ivs.map(v => [v.name + " (" + v.abbr + ")", "Independent", v.definition, "Annual reports and accounts"]).concat([[bp.dv.name + " (" + bp.dv.abbr + ")", "Dependent", bp.dv.definition, "Annual reports and accounts"], ["Firm Size (SIZE)", "Control", "Natural logarithm of total assets", "Annual reports and accounts"]]), source: SRC_RESEARCHER });
    S.tables.T3_FIRMS = tableBlock({ no: "3.2", title: "Firms Included in the Sample", kind: "open", w: [12, 48, 40], head: ["S/N", "Firm", "Period Covered"], rows: Array.from({ length: k }, (_, i) => [i + 1, "Firm " + (i + 1) + " (replace with the firm’s name)", start + " to " + end]), source: SRC_RESEARCHER });
    S.tables.T4_DESC = tableBlock({ no: "4.1", title: "Descriptive Statistics of Study Variables", kind: "open", w: [28, 12, 15, 15, 15, 15], head: ["Variable", "Obs.", "Mean", "Std. Dev.", "Minimum", "Maximum"], rows: all.map((a, i) => [nm[i], N, f2(mean(a)), f2(sd(a)), f2(Math.min(...a)), f2(Math.max(...a))]), source: SRC_ILLUS_PANEL });
    S.tables.T4_CORR = tableBlock({ no: "4.2", title: "Pearson Correlation Matrix", kind: "open", w: [16].concat(nm.map(() => 84 / nm.length)), head: [""].concat(nm), rows: nm.map((a, i) => [a].concat(nm.map((b, j) => f3(i === j ? 1 : corr(all[i], all[j]))))), source: SRC_ILLUS_PANEL });
    const lab = ["Constant"].concat(names, ["SIZE"]), sig = p => p < 0.01 ? "***" : p < 0.05 ? "**" : p < 0.1 ? "*" : "";
    S.tables.T4_REG = tableBlock({ no: "4.3", title: "Regression Results (Dependent Variable: " + bp.dv.abbr + ")", kind: "open", w: [26, 18, 20, 18, 18], head: ["Variable", "Coefficient", "Robust Std. Error", "t-Statistic", "p-value"], rows: lab.map((l, i) => [l, f4(res.beta[i]), f4(res.se[i]), f3(res.t[i]), f3(res.p[i]) + sig(res.p[i])]), source: "Source: Illustrative sample data (2026). R² = " + f3(res.r2) + "; Adjusted R² = " + f3(res.adj) + "; F(" + (res.k - 1) + "," + res.dof + ") = " + f2(res.F) + " (p = " + f3(res.Fp) + "); N = " + N + ". *** p<0.01, ** p<0.05, * p<0.10." });
    S.tables.T4_VIF = tableBlock({ no: "4.4", title: "Variance Inflation Factors", kind: "open", w: [50, 25, 25], head: ["Variable", "VIF", "1/VIF"], rows: names.concat(["SIZE"]).map((a, i) => [a, f3(vf[i]), f3(1 / vf[i])]).concat([["Mean VIF", f3(mean(vf)), ""]]), source: SRC_ILLUS_PANEL });
    S.tables.T4_DIAG = tableBlock({ no: "4.5", title: "Diagnostic Tests", kind: "open", w: [34, 18, 14, 34], head: ["Test", "Statistic", "p-value", "Conclusion"], rows: [["Breusch-Pagan heteroskedasticity (LM)", f3(bpT.lm), f3(bpT.p), bpT.p < 0.05 ? "Heteroskedasticity present; robust standard errors used" : "No evidence of heteroskedasticity"], ["Durbin-Watson autocorrelation", f3(res.dw), "", res.dw > 1.3 && res.dw < 2.7 ? "No serious autocorrelation" : "Possible autocorrelation"]], source: SRC_ILLUS_PANEL });
    S.hyp = bp.ivs.map((v, j) => ({ abbr: v.abbr, beta: res.beta[j + 1], p: res.p[j + 1], rej: res.p[j + 1] < 0.05 }));
    S.tables.T4_HYP = tableBlock({ no: "4.6", title: "Summary of Hypotheses Tests", kind: "open", w: [14, 30, 18, 14, 24], head: ["Hypothesis", "Variable", "Coefficient", "p-value", "Decision"], rows: S.hyp.map((h, j) => ["H0" + (j + 1), h.abbr, f4(h.beta), f3(h.p), h.rej ? "Reject H0" + (j + 1) : "Fail to reject H0" + (j + 1)]), source: SRC_ILLUS_PANEL });
    const rows = []; for (let i = 0; i < N; i++) rows.push([F[i], YR[i], f2(Y[i])].concat(X.map(c => f2(c[i])), [f2(SZ[i])]));
    S.panel = { head: ["Firm", "Year"].concat(nm), rows };
    S.facts = [
      "Panel of " + k + " firms over " + T + " years (" + start + " to " + end + "), " + N + " firm-year observations; pooled OLS with heteroskedasticity-robust (HC1) standard errors; control variable firm size (SIZE, log of total assets).",
      "Table numbers: descriptive " + S.nos.T4_DESC + "; correlation " + S.nos.T4_CORR + "; regression " + S.nos.T4_REG + "; VIF " + S.nos.T4_VIF + "; diagnostics " + S.nos.T4_DIAG + "; hypotheses " + S.nos.T4_HYP + ".",
      "Descriptives: " + nm.map((a, i) => a + " mean " + f2(mean(all[i])) + " sd " + f2(sd(all[i]))).join("; ") + ".",
      "Regression: R-squared " + f3(res.r2) + ", adjusted " + f3(res.adj) + ", F " + f2(res.F) + " (p " + f3(res.Fp) + "). " + S.hyp.map((h, j) => h.abbr + " coefficient " + f4(h.beta) + ", p " + f3(h.p) + " (" + (h.rej ? "significant, H0" + (j + 1) + " rejected" : "not significant, H0" + (j + 1) + " not rejected") + ")").join("; ") + ". SIZE coefficient " + f4(res.beta[m + 1]) + ", p " + f3(res.p[m + 1]) + ".",
      "Diagnostics: mean VIF " + f3(mean(vf)) + " (max " + f3(Math.max(...vf)) + "); Breusch-Pagan LM " + f3(bpT.lm) + " (p " + f3(bpT.p) + "); Durbin-Watson " + f3(res.dw) + ".",
    ];
    return S;
  }

  /* ---------- local sections: title page and appendix ---------- */
  function titlePage(bp, form) {
    const d = form.details || {}, lvl = form.level || "", up = s => String(s || "").toUpperCase();
    const degree = /Master/.test(lvl) ? "MASTER OF SCIENCE (M.Sc.) DEGREE IN ACCOUNTING" : "BACHELOR OF SCIENCE (B.Sc.) DEGREE IN ACCOUNTING";
    const fac = cl(d.faculty, 80) || "Faculty of Business Administration";
    return ["[[CTR]] " + up(bp.title), "[[SP]]", "[[SP]]", "[[CTRN]] BY", "[[SP]]", "[[CTR]] " + (cl(d.name, 80) ? up(cl(d.name, 80)) : "[YOUR FULL NAME]"), "[[CTRN]] REG. NO: " + (cl(d.regNo, 30) || "[YOUR REGISTRATION NUMBER]"), "[[SP]]", "[[SP]]",
      "[[CTRN]] A PROJECT SUBMITTED TO THE DEPARTMENT OF ACCOUNTING, " + up(fac) + ", UNIVERSITY OF UYO, IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF " + degree, "[[SP]]", "[[SP]]",
      "[[CTRN]] SUPERVISOR: " + (cl(d.supervisor, 80) || "[SUPERVISOR’S NAME]"), "[[SP]]", "[[CTRN]] " + up(cl(d.monthYear, 30) || "[MONTH AND YEAR]"), "[[PB]]"].join("\n");
  }
  function appendix(bp, S) {
    const o = ["[[PB]]", "[[CTR]] APPENDIX A"];
    if (bp.design === "expost") {
      o.push("[[CTR]] PANEL DATA USED IN THE STUDY", "[[CTRN]] (Illustrative data, to be replaced with figures extracted from the sampled firms’ annual reports)", "");
      const P = S.panel; o.push("[[TC]] Table A1: Panel Data of Sampled Firms, " + S.start + " to " + S.end, "[[TB open w=" + [10, 10].concat(P.head.slice(2).map(() => 80 / (P.head.length - 2))).map(x => +x.toFixed(1)).join(",") + "]]", row(P.head)); P.rows.forEach(r => o.push(row(r))); o.push("[[/TB]]", "[[TS]] " + SRC_ILLUS_PANEL);
      return o.join("\n");
    }
    o.push("[[CTR]] RESEARCH QUESTIONNAIRE", "[[CTRN]] Department of Accounting, University of Uyo", "", "Dear Respondent,",
      "This questionnaire has been designed to collect data for an academic research study titled “" + bp.title + ".” The information you provide will be used strictly for academic purposes and will be treated with the utmost confidentiality. Kindly complete it as candidly as possible by ticking (✓) the option that best represents your view.",
      "Thank you for your cooperation.", "Yours faithfully,", "The Researcher", "");
    o.push("[[H2]] SECTION A: DEMOGRAPHIC INFORMATION", "Please tick (✓) as appropriate.",
      "[[LI]] 1. Gender: Male [   ]   Female [   ]", "[[LI]] 2. Age range: 20 to 29 years [   ]   30 to 39 years [   ]   40 to 49 years [   ]   50 years and above [   ]", "[[LI]] 3. Educational qualification: OND / NCE [   ]   HND / B.Sc. [   ]   M.Sc. / MBA and above [   ]",
      "[[LI]] 4. " + bp.controlName + ": " + bp.strata.map(s => s + " [   ]").join("   "), "[[LI]] 5. Years of service: Below 5 years [   ]   5 to 10 years [   ]   Above 10 years [   ]", "");
    o.push("[[H2]] SECTION B: " + bp.field.toUpperCase().slice(0, 0) + "STATEMENTS ON THE STUDY VARIABLES", "Please indicate your level of agreement with each statement by ticking (✓) one box. Key: SA = Strongly Agree (4), A = Agree (3), D = Disagree (2), SD = Strongly Disagree (1).", "");
    const part = (lbl, name, st) => { o.push("**Part " + lbl + ": " + name + "**", "[[TB grid w=8,56,9,9,9,9]]", row(["S/N", "Statement", "SA", "A", "D", "SD"])); st.forEach((s, i) => o.push(row([i + 1, s, "", "", "", ""]))); o.push("[[/TB]]", ""); };
    bp.ivs.forEach((v, j) => part(String.fromCharCode(65 + j), v.name, v.statements)); part(String.fromCharCode(65 + bp.ivs.length), bp.dv.name, bp.dv.statements);
    o.push("[[CTRN]] Thank you for your time.");
    return o.join("\n");
  }

  const SMALL = /^(a|an|and|as|at|by|for|in|of|on|or the|to|the|with|from)$/i;
  const titleCase = t => String(t || "").trim().split(/\s+/).map((w, i) => /^[A-Z0-9()&]{2,}$/.test(w) ? w : i && SMALL.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { titleCase, hashStr, makeRng, splitInt, numWord, words, f1, f2, f3, f4, ROMAN, CHNUM, ordinal, ols, mean, sd, corr, chi2Surv, tTwoTail, sanitizeBp, buildStudy, titlePage, appendix, tableBlock, cl };
});
