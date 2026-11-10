/* NUASA Project AI: document module (browser + Node).
   Turns the generated markup into (a) the on-screen paper preview and (b) a real .docx file that follows the
   department format measured from the student project:
   US Letter, 1 inch margins, Times New Roman 12 pt, double spacing, justified text, 0.5 inch first-line indent,
   bold section headings, open three-line tables (10 pt, single spaced) with the caption above and a source line below,
   page numbers top right. No external libraries. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(); else root.PJDoc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- sanitiser: house style (no dash punctuation, no markdown clutter) ---------- */
  function clean(t) {
    t = String(t == null ? "" : t).replace(/\r/g, "");
    t = t.replace(/\b((?:19|20)\d{2})\s*[\u2013\u2014-]\s*((?:19|20)\d{2})\b/g, "$1 to $2"); /* 2016-2020 -> 2016 to 2020 */
    t = t.replace(/(\d)\s*\u2013\s*(\d)/g, "$1 to $2");                                       /* 30-39 written with an en dash */
    t = t.replace(/\s*(?:\u2014|\u2013|--+)\s*/g, ", ");           /* em dash, en dash, double hyphen */
    t = t.replace(/(^|[^\w])\s-\s(?=\S)/g, "$1, ").replace(/(\w) - (\w)/g, "$1, $2"); /* spaced hyphen used as a dash */
    t = t.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, "");     /* horizontal rules */
    t = t.replace(/,\s*,/g, ",").replace(/,\s*([.;:!?])/g, "$1").replace(/\(\s*,\s*/g, "(").replace(/\s+,/g, ",");
    t = t.replace(/[ \t]{2,}(?=\S)/g, m => m.length > 6 ? m : " ");
    return t;
  }

  /* ---------- parser: markup -> blocks ---------- */
  function parse(src) {
    const lines = String(src || "").replace(/\r/g, "").split("\n"), out = []; let i = 0;
    const push = (t, x, extra) => out.push(Object.assign({ t, x: x == null ? "" : String(x).trim() }, extra || {}));
    while (i < lines.length) {
      let l = lines[i].replace(/\s+$/, ""); i++;
      if (!l.trim()) continue;
      let m;
      if ((m = l.match(/^\[\[TB([^\]]*)\]\]\s*$/))) {
        const opt = m[1], kind = /\bfig\b/.test(opt) ? "fig" : /\bgrid\b/.test(opt) ? "grid" : "open", w = (opt.match(/\bw=([\d.,]+)/) || [])[1], sp = (opt.match(/\bsplit=(\d+)/) || [])[1], rows = [];
        while (i < lines.length && !/^\[\[\/TB\]\]/.test(lines[i])) { if (lines[i].trim()) rows.push(lines[i].split("|").map(c => c.trim())); i++; } i++;
        out.push({ t: "tb", kind, w: w ? w.split(",").map(Number) : null, split: sp ? +sp : 0, rows }); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l)) { /* markdown pipe table fallback */
        const rows = [l]; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
        out.push({ t: "tb", kind: "open", w: null, split: 0, rows: rows.filter(r => !/^\s*\|?[\s:\-|]+\|?\s*$/.test(r)).map(r => r.replace(/^\s*\||\|\s*$/g, "").split("|").map(c => c.trim())) }); continue;
      }
      if ((m = l.match(/^\[\[(CH|CT|H2|H3|H4|LI|BL|EQ|TC|TN|TS|CTR|CTRN|RF|PH|PL|FC)\]\]\s*(.*)$/))) { push(m[1].toLowerCase(), m[2]); continue; }
      if ((m = l.match(/^\[\[SEC\s+(\w+)\]\]/))) { out.push({ t: "sec", k: m[1] }); continue; }
      if ((m = l.match(/^\[\[(TOC|LOF|LOT|LOA)\]\]/))) { out.push({ t: "toc", k: m[1] }); continue; }
      if (/^\[\[PB\]\]/.test(l)) { out.push({ t: "pb" }); continue; }
      if (/^\[\[SP\]\]/.test(l)) { out.push({ t: "sp" }); continue; }
      if ((m = l.match(/^#{1}\s+(.*)/))) { push(/^CHAPTER\s/i.test(m[1]) ? "ch" : "ct", m[1]); continue; }
      if ((m = l.match(/^##\s+(.*)/))) { push("h2", m[1]); continue; }
      if ((m = l.match(/^#{3,4}\s+(.*)/))) { push("h3", m[1]); continue; }
      if ((m = l.match(/^\s*[-*\u2022\u00b7]\s+(.*)/))) { push("bl", m[1]); continue; }
      push("p", l.trim());
    }
    /* split long tables into "Cont'd." parts, the way the department file does for Table 2.1 */
    const res = [];
    for (let k = 0; k < out.length; k++) {
      const b = out[k];
      if (b.t === "tb" && b.split && b.rows.length - 1 > b.split) {
        const cap = res.length && res[res.length - 1].t === "tc" ? res.pop() : null, nx = out[k + 1] && out[k + 1].t === "ts" ? out[++k] : null, head = b.rows[0], body = b.rows.slice(1);
        for (let s = 0, n = 0; s < body.length; s += b.split, n++) {
          if (cap) res.push({ t: "tc", x: cap.x.replace(/[.]\s*$/, "") + (n ? " Cont’d." : "") });
          res.push({ t: "tb", kind: b.kind, w: b.w, split: 0, rows: [head].concat(body.slice(s, s + b.split)) });
          if (nx) res.push({ t: "ts", x: nx.x });
          if (s + b.split < body.length) res.push({ t: "pb" });
        }
      } else res.push(b);
    }
    const fin = [];
    for (let k = 0; k < res.length; k++) { const b = res[k]; if (b.t === "ch" && res[k + 1] && res[k + 1].t === "ct") { fin.push(Object.assign({}, b, { ct: res[k + 1].x })); k++; } else fin.push(b); }
    return fin;
  }

  /* ---------- inline formatting ---------- */
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function inl(s) { /* -> [{text,b,i}] */
    s = String(s).replace(/\*(?!\*)([^*\n]+)\*(?!\*)/g, "__$1__"); const out = []; let b = false, it = false;
    s.split(/(\*\*|__)/).forEach(tok => { if (tok === "**") b = !b; else if (tok === "__") it = !it; else if (tok) out.push({ text: tok, b, i: it }); });
    return out.length ? out : [{ text: "", b: false, i: false }];
  }
  const inlHTML = s => inl(s).map(r => { let h = esc(r.text); if (r.i) h = "<i>" + h + "</i>"; if (r.b) h = "<b>" + h + "</b>"; return h; }).join("");
  const numHTML = x => { const m = String(x).match(/^(\d+(?:\.\d+)+)\s+(.*)$/); return m ? '<span class="dp-n">' + esc(m[1]) + "</span>" + inlHTML(m[2]) : inlHTML(x); };
  const plain = s => inl(s).map(r => r.text).join("");

  /* ---------- contents lists (table of contents, lists of figures, tables, appendices) ---------- */
  function entriesOf(blocks) {
    const toc = [], lof = [], lot = [], loa = []; let ti = 0, fi = 0, ai = 0;
    blocks.forEach((b, k) => {
      if (b.t === "ph") toc.push({ lv: 1, x: plain(b.x), bm: "_PJH" + k });
      else if (b.t === "ch") toc.push({ lv: 1, x: plain(b.x) + (b.ct ? ": " + plain(b.ct) : ""), bm: "_PJH" + k });
      else if (b.t === "h2") toc.push({ lv: 2, x: plain(b.x), bm: "_PJH" + k });
      else if (b.t === "h3") toc.push({ lv: 3, x: plain(b.x), bm: "_PJH" + k });
      else if (b.t === "h4") toc.push({ lv: 4, x: plain(b.x), bm: "_PJH" + k });
      if (b.t === "tc" && !/Cont\u2019d\.?\s*$/.test(b.x)) lot.push({ x: plain(b.x), bm: "_PJT" + k });
      if (b.t === "fc") lof.push({ x: plain(b.x), bm: "_PJF" + k });
      if (b.t === "ctr" && /^APPENDIX [A-Z]\s*$/i.test(b.x)) { const nx = blocks[k + 1]; loa.push({ x: plain(b.x) + (nx && nx.t === "ctr" ? ": " + plain(nx.x) : ""), bm: "_PJA" + k }); }
    });
    return { TOC: toc, LOF: lof, LOT: lot, LOA: loa };
  }

  /* ---------- on-screen preview ---------- */
  function toHTML(blocks) {
    const EN = entriesOf(blocks), LBL = { TOC: "", LOF: "", LOT: "", LOA: "" };
    return blocks.map(b => {
      switch (b.t) {
        case "ch": return '<h2 class="dp-ch">' + inlHTML(b.x) + "</h2>" + (b.ct ? '<div class="dp-ct">' + inlHTML(b.ct) + "</div>" : "");
        case "h4": return '<h4 class="dp-h3">' + numHTML(b.x) + "</h4>";
        case "tn": return '<p class="dp-tc" style="margin-top:-4px!important">' + inlHTML(b.x) + "</p>";
        case "fc": return '<p class="dp-tc" style="text-align:center">' + inlHTML(b.x) + "</p>";
        case "ph": return '<div class="dp-ct dp-ph">' + inlHTML(b.x) + "</div>";
        case "pl": return '<p class="dp-pl">' + inlHTML(b.x) + "</p>";
        case "sec": return "";
        case "toc": return '<div class="dp-toc">' + EN[b.k].map(e => '<p class="dp-tl l' + (e.lv || 1) + '">' + esc(e.x) + "</p>").join("") + (EN[b.k].length ? '<p class="dp-ts">Page numbers appear when you open the Word file and choose Yes to update fields.</p>' : "") + "</div>";
        case "ct": return '<div class="dp-ct">' + inlHTML(b.x) + "</div>";
        case "h2": return '<h3 class="dp-h2">' + numHTML(b.x) + "</h3>";
        case "h3": return '<h4 class="dp-h3">' + numHTML(b.x) + "</h4>";
        case "li": return '<p class="dp-li">' + inlHTML(b.x) + "</p>";
        case "bl": return '<p class="dp-li">\u00b7 ' + inlHTML(b.x) + "</p>";
        case "rf": return '<p class="dp-rf">' + inlHTML(b.x) + "</p>";
        case "eq": return '<p class="dp-eq">' + inlHTML(b.x) + "</p>";
        case "tc": return '<p class="dp-tc">' + inlHTML(b.x) + "</p>";
        case "ts": return '<p class="dp-ts">' + inlHTML(b.x) + "</p>";
        case "ctr": return '<p class="dp-ctr"><b>' + inlHTML(b.x) + "</b></p>";
        case "ctrn": return '<p class="dp-ctr">' + inlHTML(b.x) + "</p>";
        case "pb": return '<div class="dp-pb"></div>';
        case "sp": return '<div class="dp-sp"></div>';
        case "tb": {
          if (b.kind === "fig") return '<div class="dp-tw"><table class="dp-tb fig"><colgroup>' + b.w.map(w => '<col style="width:' + w + '%">').join("") + "</colgroup>" + b.rows.map((r, ri) => "<tr>" + r.map((c, ci) => c === "^" ? "" : "<td" + (ci === 2 && ri === 0 ? ' rowspan="' + b.rows.length + '"' : "") + ' class="c"' + (ci !== 1 ? ' style="border:1px solid currentColor;padding:8px"' : ' style="font-size:20px"') + ">" + inlHTML(c) + "</td>").join("") + "</tr>").join("") + "</table></div>";
          const n = b.rows[0] ? b.rows[0].length : 1, W = b.w && b.w.length === n ? b.w : Array(n).fill(100 / n);
          return '<div class="dp-tw"><table class="dp-tb ' + b.kind + '"><colgroup>' + W.map(w => '<col style="width:' + w + '%">').join("") + "</colgroup>" + b.rows.map((r, ri) => "<tr>" + W.map((_, ci) => (ri ? "<td" : "<th") + (b.kind === "grid" && ci ? ' class="c"' : "") + ">" + inlHTML(r[ci] || "") + (ri ? "</td>" : "</th>")).join("") + "</tr>").join("") + "</table></div>";
        }
        default: return "<p class=\"dp-p\">" + inlHTML(b.x) + "</p>";
      }
    }).join("");
  }
  function toText(blocks) {
    return blocks.map(b => b.t === "tb" ? b.rows.map(r => r.join("\t")).join("\n") : b.t === "pb" || b.t === "sec" || b.t === "toc" ? "\n" : b.t === "sp" ? "" : (b.t === "bl" ? "\u00b7 " : "") + plain(b.x || "")).join("\n\n");
  }

  /* ---------- DOCX ---------- */
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const FONT = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>';
  const TEXTW = 9360; /* 6.5 inch */
  function runs(text, o) {
    o = o || {}; return inl(text).map(r => {
      const rp = (r.b || o.b ? "<w:b/><w:bCs/>" : "") + (r.i || o.i ? "<w:i/><w:iCs/>" : "") + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : "");
      return "<w:r>" + (rp ? "<w:rPr>" + rp + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + esc(r.text) + "</w:t></w:r>";
    }).join("");
  }
  let PENDING_PB = false;
  function para(style, inner, extra) { /* a pending page break is applied to this paragraph; pPr order: pStyle, keepNext, pageBreakBefore, ... */
    let ex = extra || "", pb = PENDING_PB ? "<w:pageBreakBefore/>" : ""; PENDING_PB = false;
    if (pb) ex = ex.startsWith("<w:keepNext/>") ? "<w:keepNext/>" + pb + ex.slice(13) : pb + ex;
    return "<w:p><w:pPr>" + (style ? '<w:pStyle w:val="' + style + '"/>' : "") + ex + "</w:pPr>" + inner + "</w:p>";
  }
  function headingRuns(text) { /* "1.1 Title" -> "1.1" TAB "Title" (tab, as in the department file) */
    const m = String(text).match(/^(\d+(?:\.\d+)+)\s+(.*)$/); if (!m) return runs(text);
    return '<w:r><w:t xml:space="preserve">' + m[1] + "</w:t></w:r><w:r><w:tab/></w:r>" + runs(m[2]);
  }
  function figXML(b) {
    const n = b.rows[0].length, W0 = b.w && b.w.length === n ? b.w : Array(n).fill(100 / n), sum = W0.reduce((a, c) => a + c, 0), W = W0.map(w => Math.round(w / sum * TEXTW)), nil = k => "<w:" + k + ' w:val="nil"/>', bx = k => "<w:" + k + ' w:val="single" w:sz="8" w:space="0" w:color="000000"/>';
    let x = '<w:tbl><w:tblPr><w:tblW w:w="' + TEXTW + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + ["top", "left", "bottom", "right", "insideH", "insideV"].map(nil).join("") + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + W.map(w => '<w:gridCol w:w="' + w + '"/>').join("") + "</w:tblGrid>";
    b.rows.forEach((r, ri) => {
      x += "<w:tr><w:trPr><w:cantSplit/></w:trPr>";
      W.forEach((w, ci) => {
        const c = r[ci] || "", box = ci !== 1 && !!c, vm = ci === 2 ? (ri === 0 ? '<w:vMerge w:val="restart"/>' : c === "^" ? "<w:vMerge/>" : "") : "";
        x += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + vm + (box ? "<w:tcBorders>" + bx("top") + bx("left") + bx("bottom") + bx("right") + "</w:tcBorders>" : "") + '<w:vAlign w:val="center"/></w:tcPr>' + para("PJTable", c === "^" ? "" : runs(c, { b: ci !== 1, sz: ci === 1 ? 32 : 22 }), '<w:jc w:val="center"/>') + "</w:tc>";
      }); x += "</w:tr>";
    });
    return x + "</w:tbl>" + para("PJTableGap", "");
  }
  function tableXML(b) {
    if (b.kind === "fig") return figXML(b);
    const n = b.rows[0].length, W0 = b.w && b.w.length === n ? b.w : Array(n).fill(100 / n), sum = W0.reduce((a, c) => a + c, 0), W = W0.map(w => Math.round(w / sum * TEXTW));
    const keep = b.rows.length <= 14, bd = (k, v) => '<w:' + k + ' w:val="' + v + '" w:sz="4" w:space="0" w:color="000000"/>', open = b.kind === "open";
    const tblB = open ? bd("top", "single") + bd("left", "nil") + bd("bottom", "single") + bd("right", "nil") + bd("insideH", "nil") + bd("insideV", "nil") : bd("top", "single") + bd("left", "single") + bd("bottom", "single") + bd("right", "single") + bd("insideH", "single") + bd("insideV", "single");
    let x = '<w:tbl><w:tblPr><w:tblW w:w="' + TEXTW + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + tblB + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + W.map(w => '<w:gridCol w:w="' + w + '"/>').join("") + "</w:tblGrid>";
    b.rows.forEach((r, ri) => {
      x += "<w:tr><w:trPr><w:cantSplit/>" + (ri === 0 ? "<w:tblHeader/>" : "") + "</w:trPr>";
      W.forEach((w, ci) => {
        const jc = b.kind === "grid" && ci ? "center" : "left", tcb = ri === 0 && open ? "<w:tcBorders>" + bd("top", "single") + bd("bottom", "single") + "</w:tcBorders>" : "";
        x += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + tcb + "</w:tcPr>" + para("PJTable", runs(r[ci] || "", { b: ri === 0, sz: 20 }), (keep && ri < b.rows.length - 1 ? "<w:keepNext/>" : "") + '<w:jc w:val="' + jc + '"/>') + "</w:tc>";
      }); x += "</w:tr>";
    });
    return x + "</w:tbl>" + para("PJTableGap", "");
  }
  let BMID = 100;
  const bm = (name, inner) => { const id = ++BMID; return '<w:bookmarkStart w:id="' + id + '" w:name="' + name + '"/>' + inner + '<w:bookmarkEnd w:id="' + id + '"/>'; };
  const FLD = (instr, cached) => '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ' + instr + ' </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>' + (cached || "") + '</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
  function listXML(kind, ent) {
    const o = [];
    ent.forEach((e, i) => {
      const lv = kind === "TOC" ? e.lv : 1, st = kind === "TOC" ? "TOC" + lv : "PJListEntry";
      o.push("<w:p><w:pPr><w:pStyle w:val=\"" + st + "\"/></w:pPr>" + (kind === "TOC" && !i ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-4" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : "") + runs(e.x) + "<w:r><w:tab/></w:r>" + FLD("PAGEREF " + e.bm + " \\h", "") + "</w:p>");
    });
    if (kind === "TOC" && ent.length) o.push('<w:p><w:pPr><w:pStyle w:val="PJTableGap"/></w:pPr><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>');
    return o.join("");
  }
  function secXML(kind) { /* none: cover pages, no page number shown; roman: preliminary pages; the last section (decimal) closes the body */
    return '<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="' + (kind === "none" ? "rId3" : "rId2") + '"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:pgNumType w:fmt="lowerRoman"' + (kind === "none" ? ' w:start="1"' : "") + '/><w:cols w:space="720"/></w:sectPr></w:pPr></w:p>';
  }
  function bodyXML(blocks) {
    const o = [], EN = entriesOf(blocks); PENDING_PB = false; BMID = 100; let hasSec = false;
    blocks.forEach((b, k) => {
      switch (b.t) {
        case "ch": o.push(para("Heading1", bm("_PJH" + k, runs(b.x) + (b.ct ? "<w:r><w:br/></w:r>" + runs(b.ct) : "")))); break;
        case "ct": o.push(para("PJChapterTitle", runs(b.x))); break;
        case "ph": o.push(para("PJPrelim", bm("_PJH" + k, runs(b.x)))); break;
        case "h2": o.push(para("Heading2", bm("_PJH" + k, headingRuns(b.x)))); break;
        case "h3": o.push(para("Heading3", bm("_PJH" + k, headingRuns(b.x)))); break;
        case "h4": o.push(para("Heading4", bm("_PJH" + k, headingRuns(b.x)))); break;
        case "li": o.push(para("PJList", runs(b.x))); break;
        case "bl": o.push(para("PJList", runs("\u00b7 " + b.x))); break;
        case "rf": o.push(para("PJReference", runs(b.x))); break;
        case "eq": o.push(para("PJEquation", runs(b.x))); break;
        case "tc": o.push(para("PJCaption", bm("_PJT" + k, runs(b.x, { b: true })))); break;
        case "tn": o.push(para("PJCaptionSub", runs(b.x, { b: true }))); break;
        case "fc": o.push(para("PJCaptionFig", bm("_PJF" + k, runs(b.x, { b: true })))); break;
        case "ts": o.push(para("PJSource", runs(b.x))); break;
        case "ctr": o.push(para("PJCentre", /^APPENDIX [A-Z]\s*$/i.test(b.x) ? bm("_PJA" + k, runs(b.x, { b: true })) : runs(b.x, { b: true }))); break;
        case "ctrn": o.push(para("PJCentre", runs(b.x))); break;
        case "pl": o.push(para("PJPlain", runs(b.x))); break;
        case "sp": o.push(para("PJCentre", "")); break;
        case "pb": PENDING_PB = true; break;
        case "sec": o.push(secXML(b.k)); hasSec = true; PENDING_PB = false; break;
        case "toc": o.push(listXML(b.k, EN[b.k])); break;
        case "tb": if (b.rows.length) { if (PENDING_PB) o.push(para("PJTableGap", "")); o.push(tableXML(b)); } break;
        default: o.push(para("PJBody", runs(b.x)));
      }
    });
    return { xml: o.join(""), hasSec };
  }
  function stylesXML() {
    const st = (id, name, based, ppr, rpr, extra) => '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + name + '"/>' + (based ? '<w:basedOn w:val="' + based + '"/>' : "") + (extra || "") + '<w:qFormat/><w:pPr>' + (ppr || "") + "</w:pPr><w:rPr>" + (rpr || "") + "</w:rPr></w:style>";
    const dbl = '<w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/>', sgl = '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + NS + "><w:docDefaults><w:rPrDefault><w:rPr>" + FONT + '<w:color w:val="000000"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-GB" w:eastAsia="en-GB" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>' + sgl + "</w:pPr></w:pPrDefault></w:docDefaults>"
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
      + '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>'
      + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
      + st("Header", "header", "Normal", '<w:tabs><w:tab w:val="center" w:pos="4680"/><w:tab w:val="right" w:pos="9360"/></w:tabs>', "")
      + st("Heading1", "heading 1", "Normal", '<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="0" w:after="240" w:line="480" w:lineRule="auto"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/>', "<w:b/><w:bCs/><w:sz w:val=\"28\"/><w:szCs w:val=\"28\"/>", '<w:next w:val="PJBody"/>')
      + st("PJChapterTitle", "Chapter Title", "Normal", '<w:keepNext/><w:spacing w:before="0" w:after="240" w:line="480" w:lineRule="auto"/><w:jc w:val="center"/>', "<w:b/><w:bCs/><w:sz w:val=\"28\"/><w:szCs w:val=\"28\"/>")
      + st("Heading2", "heading 2", "Normal", '<w:keepNext/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:spacing w:before="120" w:after="0" w:line="480" w:lineRule="auto"/><w:jc w:val="both"/><w:outlineLvl w:val="1"/>', "<w:b/><w:bCs/>", '<w:next w:val="PJBody"/>')
      + st("Heading3", "heading 3", "Normal", '<w:keepNext/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/><w:jc w:val="both"/><w:outlineLvl w:val="2"/>', "<w:b/><w:bCs/>", '<w:next w:val="PJBody"/>')
      + st("Heading4", "heading 4", "Normal", '<w:keepNext/><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/><w:jc w:val="both"/><w:outlineLvl w:val="3"/>', "<w:b/><w:bCs/>", '<w:next w:val="PJBody"/>')
      + st("PJPrelim", "Preliminary Heading", "Normal", '<w:keepNext/><w:pageBreakBefore/><w:spacing w:before="0" w:after="240" w:line="480" w:lineRule="auto"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/>', "<w:b/><w:bCs/><w:sz w:val=\"28\"/><w:szCs w:val=\"28\"/>")
      + st("PJPlain", "Project Plain", "Normal", '<w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/><w:jc w:val="left"/>', "")
      + st("PJCaptionSub", "Project Table Caption 2", "Normal", '<w:keepNext/><w:spacing w:before="0" w:after="120" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', "<w:b/><w:bCs/>")
      + st("PJCaptionFig", "Project Figure Caption", "Normal", '<w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', "<w:b/><w:bCs/>")
      + [1, 2, 3, 4].map(n => st("TOC" + n, "toc " + n, "Normal", '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs><w:spacing w:before="0" w:after="80" w:line="276" w:lineRule="auto"/><w:ind w:left="' + (n - 1) * 360 + '" w:right="560"/>', n === 1 ? "<w:b/><w:bCs/>" : "")).join("")
      + st("PJListEntry", "Project List Entry", "Normal", '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9350"/></w:tabs><w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/><w:ind w:right="560"/>', "")
      + st("PJBody", "Project Body", "Normal", dbl + '<w:ind w:firstLine="720"/><w:jc w:val="both"/>', "")
      + st("PJList", "Project List", "Normal", dbl + '<w:jc w:val="both"/>', "")
      + st("PJReference", "Project Reference", "Normal", '<w:spacing w:before="0" w:after="160" w:line="360" w:lineRule="auto"/><w:ind w:left="720" w:hanging="720"/><w:jc w:val="both"/>', "")
      + st("PJEquation", "Project Equation", "Normal", '<w:spacing w:before="120" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>', "")
      + st("PJCaption", "Project Table Caption", "Normal", '<w:keepNext/><w:spacing w:before="240" w:after="120" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', "<w:b/><w:bCs/>")
      + st("PJSource", "Project Table Source", "Normal", '<w:spacing w:before="60" w:after="240" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/>', "")
      + st("PJTable", "Project Table Text", "Normal", '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="20"/><w:szCs w:val="20"/>')
      + st("PJTableGap", "Project Table Gap", "Normal", '<w:spacing w:before="0" w:after="0" w:line="40" w:lineRule="exact"/>', '<w:sz w:val="2"/>')
      + st("PJCentre", "Project Centred", "Normal", '<w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>', "")
      + "</w:styles>";
  }
  const pageField = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';

  /* store-only zip writer */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ c >>> 8; return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    files.forEach(f => {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data), lh = new Uint8Array(30 + name.length), dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true); dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true); dv.setUint16(26, name.length, true); dv.setUint16(28, 0, true); lh.set(name, 30);
      const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, off, true); ch.set(name, 46);
      parts.push(lh, data); cen.push(ch); off += lh.length + data.length;
    });
    const csz = cen.reduce((s, c) => s + c.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, csz, true); ev.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [end]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  function toDocx(blocks, meta) {
    meta = meta || {}; const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const bd = bodyXML(blocks), hdrRef = '<w:headerReference w:type="default" r:id="rId2"/>';
    const doc = H + "<w:document " + NS + "><w:body>" + bd.xml + "<w:sectPr>" + hdrRef + '<w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>' + (bd.hasSec ? '<w:pgNumType w:fmt="decimal" w:start="1"/>' : "") + '<w:cols w:space="720"/></w:sectPr></w:body></w:document>';
    return zip([
      { name: "[Content_Types].xml", data: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
      { name: "_rels/.rels", data: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
      { name: "docProps/core.xml", data: H + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(meta.title || "Project") + "</dc:title><dc:creator>NUASA Project AI</dc:creator></cp:coreProperties>" },
      { name: "word/_rels/document.xml.rels", data: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>' },
      { name: "word/styles.xml", data: stylesXML() },
      { name: "word/settings.xml", data: H + "<w:settings " + NS + '><w:updateFields w:val="true"/><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>' },
      { name: "word/header1.xml", data: H + "<w:hdr " + NS + '><w:p><w:pPr><w:pStyle w:val="Header"/><w:jc w:val="right"/></w:pPr>' + pageField + "</w:p></w:hdr>" },
      { name: "word/header2.xml", data: H + "<w:hdr " + NS + '><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p></w:hdr>' },
      { name: "word/document.xml", data: doc },
    ]);
  }

  return { clean, parse, toHTML, toText, toDocx, plain };
});
