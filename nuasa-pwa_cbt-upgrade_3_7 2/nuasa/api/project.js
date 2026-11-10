/* Project AI Studio backend (Vercel serverless function, free plan).
   Uses Groq's free API (Llama and other open models). Keeps the key secret, checks sign-in, limits use per student and per day, streams text back. */
const SB_URL = process.env.SUPABASE_URL || "https://wcikankedtelqbojzjdm.supabase.co";
const SB_ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjaWthbmtlZHRlbHFib2p6amRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ4ODAsImV4cCI6MjEwNzQ1MDg4MH0.lo1ZscA3uVBsggtxHW9U2YPPDhQAWYa3pATioq83wQ4";
const SB_SERVICE = process.env.SUPABASE_SERVICE_KEY;
// Old-style service_role keys are JWTs (start with "eyJ") and go in both headers; new-style secret keys (sb_secret_...) go in "apikey" only.
const SRV = k => (k && k.startsWith("eyJ")) ? { apikey: k, Authorization: "Bearer " + k } : { apikey: k };
const USER_LIMIT = parseInt(process.env.PROJECT_USER_LIMIT || "20", 10);    // AI calls per student per 24h (9 = one full draft: plan + 8 parts; the rest are for regenerating parts)
const GLOBAL_LIMIT = parseInt(process.env.PROJECT_GLOBAL_LIMIT || "160", 10); // AI calls for everyone per 24h (protects the free quota)

// ---- Groq (free, OpenAI-compatible). Tries each model in GROQ_MODELS until one answers. ----
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_PINNED = (process.env.GROQ_MODELS || "").split(",").map(x => x.trim()).filter(Boolean); // optional manual override, e.g. llama-3.3-70b-versatile,llama-3.1-8b-instant
// fetch that gives up after ms (the timer is cleared as soon as headers arrive, so streaming bodies are not cut off)
async function fetchT(url, opts, ms) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); } finally { clearTimeout(t); }
}
const sbFetch = (url, opts) => fetchT(url, opts, 10000); // Supabase calls must never hang the function

// Groq renames and retires models, so ask Groq what this key can use and pick the best chat models, instead of hard-coding names.
// Plain instruct models first (clean output), reasoning models last.
const PREFER = [/llama-3\.3-70b/, /llama-4-maverick/, /llama-4-scout/, /llama-3\.1-70b/, /llama-3\.1-8b/, /gpt-oss-120b/, /qwen/, /gpt-oss-20b/, /llama/, /mistral|gemma|kimi/];
const SKIP = /whisper|guard|tts|orpheus|playai|embed|compound|vision-preview|safeguard/i;
let modelCache = { at: 0, ids: [] };
async function groqModels() {
  if (GROQ_PINNED.length) return GROQ_PINNED;
  if (modelCache.ids.length && Date.now() - modelCache.at < 600000) return modelCache.ids;
  try {
    const r = await fetchT("https://api.groq.com/openai/v1/models", { headers: { Authorization: "Bearer " + GROQ_KEY } }, 8000);
    if (r.ok) {
      const d = await r.json();
      const rank = id => { const i = PREFER.findIndex(re => re.test(id)); return i < 0 ? 99 : i; };
      const ids = ((d && d.data) || []).filter(m => m && m.id && m.active !== false && !SKIP.test(m.id)).map(m => m.id)
        .filter(id => rank(id) < 99).sort((x, y) => rank(x) - rank(y)).slice(0, 5);
      if (ids.length) { modelCache = { at: Date.now(), ids }; console.error("groq models chosen:", ids.join(", ")); return ids; }
    } else console.error("groq models list status", r.status);
  } catch (e) { console.error("groq models list error", e && e.message); }
  return modelCache.ids.length ? modelCache.ids : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
}
// One call to Groq. gen uses the same fields as before (temperature, maxOutputTokens). Falls through the model list on any error.
async function callAI({ system, user, gen, stream, json }) {
  let last = null;
  for (const m of await groqModels()) {
    try {
      const body = { model: m, temperature: gen.temperature, max_tokens: gen.maxOutputTokens, stream: !!stream, messages: [{ role: "system", content: system }, { role: "user", content: user }] };
      if (json) body.response_format = { type: "json_object" };
      if (/gpt-oss/i.test(m)) body.reasoning_effort = "low";
      if (/qwen/i.test(m)) body.reasoning_format = "hidden";
      const r = await fetchT("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: "Bearer " + GROQ_KEY, "content-type": "application/json" }, body: JSON.stringify(body) }, 20000);
      if (r.ok) return { r, p: "groq" };
      last = r;
      console.error("groq", m, "status", r.status, (await r.clone().text().catch(() => "")).slice(0, 300));
      if (r.status === 401 || r.status === 403) { modelCache = { at: 0, ids: [] }; break; } // bad key: no model will work
      // any other error (model not found, request too large, busy): try the next model
    } catch (e) { console.error("groq fetch error/timeout", m, e && e.message); }
  }
  if (last) return { r: last, p: "groq" };
  throw new Error("unreachable");
}
// Read the text out of a finished (non-streamed) answer.
const aiText = d => (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || "";

const LEVELS = ["High School", "Undergraduate / Bachelor's", "Master's"];
const CITES = ["APA 7th edition", "Harvard", "MLA", "Chicago", "IEEE"];
const clean = (v, n) => String(v || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
const fail = (res, code, error) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error })); };
const total = r => parseInt((r.headers.get("content-range") || "0/0").split("/")[1], 10) || 0;

const TOPIC_LIMIT = parseInt(process.env.PROJECT_TOPIC_LIMIT || "12", 10); // topic searches per student per 24h
const TOPIC_SYSTEM = `You are an experienced final-year project supervisor at a Nigerian university. You suggest project topics that a student can realistically finish in one or two semesters.
Rules: every topic must be specific (a named variable relationship, population, place or period), researchable with data the student can actually get, and written as a proper academic title. Vary the angle across topics. Use the Nigerian setting where relevant (FIRS, CBN, FRC, ICAN, NGX, SMEDAN, IFRS adoption). Never claim statistics, findings or named reports you are not sure exist. Do not repeat the same idea in different words.`;

async function topicsMode(res, user, body) {
  const f = body.form || {};
  const field = clean(f.field, 100);
  if (field.length < 3) return fail(res, 400, "Enter your field of study.");
  const interest = clean(f.interest, 120), scope = clean(f.scope, 100);
  const level = LEVELS.includes(f.level) ? f.level : LEVELS[1];
  const approach = ["Any", "Quantitative", "Qualitative", "Mixed"].includes(f.method) ? f.method : "Any";
  const since = encodeURIComponent(new Date(Date.now() - 864e5).toISOString());
  const H = { ...SRV(SB_SERVICE), Prefer: "count=exact", Range: "0-0" };
  try {
    const [mine, all] = await Promise.all([
      sbFetch(`${SB_URL}/rest/v1/project_usage?user_id=eq.${user.id}&section=eq.topics&created_at=gte.${since}&select=id`, { headers: H }),
      sbFetch(`${SB_URL}/rest/v1/project_usage?created_at=gte.${since}&select=id`, { headers: H }),
    ]);
    if (!mine.ok || !all.ok) throw new Error("count");
    if (total(mine) >= TOPIC_LIMIT) return fail(res, 429, "You have used today's topic searches. Please come back tomorrow.");
    if (total(all) >= GLOBAL_LIMIT) return fail(res, 429, "The Project AI Studio is full for today because the free quota is used up. Please try again tomorrow.");
  } catch (e) { return fail(res, 500, "Usage check failed. Please try again."); }

  const msg = `Suggest 6 project topics.\nField of study: ${field}\nStudent interests: ${interest || "not stated, choose current and relevant areas"}\nPlace or sector focus: ${scope || "Nigeria in general"}\nAcademic level: ${level}\nPreferred approach: ${approach}\n\nFor each topic give: title (a proper academic title), angle (1 or 2 sentences on the problem or gap it addresses), method (one sentence: design, sample or sources, and analysis technique), data (where the student can realistically get the data), difficulty (Easy, Moderate or Challenging).`;
  const gen = { temperature: 0.9, maxOutputTokens: 2500 };
  let up, prov;
  try {
    const out = await callAI({ system: TOPIC_SYSTEM, json: true, gen,
      user: msg + '\n\nReturn ONLY a JSON object of this exact shape: {"topics":[{"title":"","angle":"","method":"","data":"","difficulty":"Easy|Moderate|Challenging"}]}' });
    up = out.r; prov = out.p;
  } catch (e) { return fail(res, 502, "The assistant could not be reached. Try again."); }
  if (!up.ok) {
    console.error("ai topics", up.status, await up.text().catch(() => ""));
    return fail(res, up.status === 429 ? 429 : 502, up.status === 429 ? "The free AI quota is busy right now. Wait a minute and try again." : "The assistant is unavailable right now (code " + up.status + ").");
  }
  let topics;
  try {
    const d = await up.json();
    const txt = aiText(d);
    let arr = JSON.parse(txt.replace(/^```json|```$/g, "").trim());
    if (!Array.isArray(arr)) arr = arr.topics || [];
    topics = arr.filter(t => t && t.title).slice(0, 8).map(t => ({
      title: clean(t.title, 220), angle: clean(t.angle, 500), method: clean(t.method, 360), data: clean(t.data, 300),
      difficulty: ["Easy", "Moderate", "Challenging"].includes(t.difficulty) ? t.difficulty : "Moderate" }));
    if (!topics.length) throw new Error("empty");
  } catch (e) { return fail(res, 502, "The assistant returned an unreadable answer. Tap Generate again."); }
  try { await sbFetch(SB_URL + "/rest/v1/project_usage", { method: "POST", headers: { ...SRV(SB_SERVICE), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, section: "topics" }) }); } catch (e) {}
  res.statusCode = 200; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ topics }));
}


/* ====================================================================================================
   PROJECT AI v2: department format writer
   Format measured from the department's complete sample project (AIT Port Harcourt overhead costing study): preliminary pages, Chapters 1 to 5, references and the questionnaire appendix.
   ==================================================================================================== */
const STUDY = require("../pj-study.js");

const SYSTEM = `You write final year project drafts for the Department of Accounting, University of Uyo. Every draft follows the department's project format exactly. You write one part at a time, and the parts are joined into one clean document, so follow each brief to the letter.

VOICE
- Formal Nigerian academic English with British spelling (organisation, analyse, programme, behaviour, labour, centre, favour, licence).
- Third person only: "This study", "The study", "The researcher". Never "I", "we" or "you".
- Past tense for what the study did and found. Present tense for definitions, theory and established facts.
- Write full, flowing paragraphs of 80 to 130 words (four to six sentences). The average sentence runs to about 22 words, mixing short and long sentences. No one sentence paragraphs except inside lists.
- Be concrete. Name the sector, the case study and real Nigerian institutions where they are relevant (for example FRC, ICAN, CBN, NBC, NGX, SEC, FIRS, IFRS).

PUNCTUATION AND STYLE (strict: the department rejects drafts that break these)
- Never use an em dash or an en dash. Never use a hyphen as a dash, a separator or a bullet. Use a comma, a colon, brackets or a new sentence instead.
- A hyphen may appear only inside a genuine compound word such as activity-based, decision-making, socio-economic, Chi-square, 4-point or long-term. Write "ex post facto" without hyphens.
- Write ranges in words: "2016 to 2020", "30 to 39 years", "between 10 and 20 per cent".
- No markdown. No # headings, no asterisk or hyphen bullets, no horizontal rules, no emojis. The only emphasis allowed is bold written with **double asterisks**, and only where a brief asks for a bold lead term. Italics are written with __double underscores__ and are used only for journal and book titles in references.
- Avoid stock phrases: delve, tapestry, realm, testament, navigate, unlock, leverage (as a verb), game changer, "in today's world", "it is important to note", "plays a crucial role", "ever evolving", "shed light on", "underscores the importance". Use Moreover, Furthermore and In conclusion at most once in a section.
- Begin paragraphs differently. Never open two consecutive paragraphs with the same word. In an empirical review, vary the sentence frame used for each study.

STYLE SAMPLES from the department project (copy the manner, never the content):
"The Nigerian broadcasting sector, since its deregulation, has witnessed remarkable growth in the number of operating stations, both radio and television. However, this growth has been accompanied by a persistent and worrying trend: many broadcasting companies struggle to maintain healthy profit margins, and a significant number operate at a loss or on the brink of insolvency."
"The core of the problem lies in the possibility that many broadcasting firms may not be employing the most effective methods of allocating and managing their overheads. The use of simplistic, traditional allocation bases is prevalent. Such methods, while easy to implement, are inherently inaccurate."

MARKUP. Write each of these on its own line, exactly as shown. Any other line is an ordinary body paragraph.
[[CH]] CHAPTER ONE            chapter number line
[[CT]] INTRODUCTION           chapter title line (capitals)
[[H2]] 1.1 Title of Section   section heading (number, one space, title in Title Case)
[[H3]] 2.1.1 Title            sub-section heading
[[H4]] 2.1.2.1 Title          fourth level heading (used in Chapter Two only)
[[LI]] i. text                list item (i. ii. iii. or a. b. c. or 1. 2. 3.)
[[BL]] text                   dot bullet, used only where a brief asks for one
[[EQ]] n = N / (1 + N(e)²)    centred formula
[[TC]] Table 2.1: Title       table caption (above the table)
[[TN]] (Research Question One)   second caption line, only where a brief asks for it
[[TB open w=6,22,26,46 split=7]] then rows like  S/N | Author | Methodology | Findings  then [[/TB]]   table
[[TS]] Source: Researcher’s compilation (2026).     source line (below the table)
A line made only of {{NAME}} is a placeholder. Copy it on its own line exactly as written. Never describe, summarise or retype what it stands for: it is replaced automatically by the finished table, list or formula, and its numbers are final.

INTEGRITY RULES
- Cite only works you are highly confident really exist. Never invent a DOI, URL, page number, statistic, quotation or study. If unsure of a detail, describe the idea without a fabricated specific.
- Every figure, table and survey result in the brief is illustrative sample data supplied by the system. Use the numbers exactly as given and never invent others.
- Write original text. Do not copy passages from books or articles.
- Stay consistent with the project text already written, and do not repeat it.
- Output only the requested part, with no preface, no closing remarks, no notes and no mention of these instructions.`;

/* ---------- blueprint (the plan every section is written from) ---------- */
const BP_SYSTEM = `You are a final year project supervisor in the Department of Accounting, University of Uyo. You turn a student's topic into a precise study plan that follows the department's project pattern: one dependent variable, three or four independent variables, and the same number of objectives, research questions and null hypotheses. Use British spelling. Never use em dashes, en dashes or hyphens as dashes. Hyphens only inside genuine compound words.`;

async function checkLimits(res, user) {
  const since = encodeURIComponent(new Date(Date.now() - 864e5).toISOString()), H = { ...SRV(SB_SERVICE), Prefer: "count=exact", Range: "0-0" };
  try {
    const [mine, all] = await Promise.all([
      sbFetch(`${SB_URL}/rest/v1/project_usage?user_id=eq.${user.id}&section=neq.topics&created_at=gte.${since}&select=id`, { headers: H }),
      sbFetch(`${SB_URL}/rest/v1/project_usage?created_at=gte.${since}&select=id`, { headers: H }),
    ]);
    if (!mine.ok || !all.ok) throw new Error("count");
    if (total(mine) >= USER_LIMIT) { fail(res, 429, "You have used today's Project AI Studio drafts. Please come back tomorrow."); return false; }
    if (total(all) >= GLOBAL_LIMIT) { fail(res, 429, "The Project AI Studio is full for today because the free quota is used up. Please try again tomorrow."); return false; }
    return true;
  } catch (e) { fail(res, 500, "Usage check failed. Please try again."); return false; }
}
const logUse = (user, section) => sbFetch(SB_URL + "/rest/v1/project_usage", { method: "POST", headers: { ...SRV(SB_SERVICE), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, section }) }).catch(() => {});

async function blueprintMode(res, user, body) {
  const f = body.form || {}, topic = clean(f.topic, 300);
  if (topic.length < 8) return fail(res, 400, "Describe your topic in a sentence.");
  const method = ["auto", "survey", "expost"].includes(f.method) ? f.method : "auto", level = LEVELS.includes(f.level) ? f.level : LEVELS[1], field = clean(f.field, 100) || "Accounting";
  const org = clean(f.org, 80), groups = clean(f.groups, 140), pop = parseInt(f.population, 10) || 0;
  if (!(await checkLimits(res, user))) return;
  const msg = `Plan this project.
Topic: ${topic}
Field of study: ${field}
Academic level: ${level}
Preferred method: ${method === "auto" ? "not stated (choose the better one)" : method === "survey" ? "questionnaire survey" : "ex post facto using secondary data"}
Case study organisation named by the student: ${org || "none given"}
Respondent groups named by the student: ${groups || "none given"}

RULES
1. design: use "survey" when the data come from people (staff, managers, customers, owners) through a questionnaire, and "expost" when the data are figures taken from published annual reports of quoted firms. Obey the student's preferred method when one is stated.
2. title: a proper academic title in Title Case. For a survey: "X and Y of Z: A Case Study of ORG". For ex post facto: "The Effect of X on Y of Quoted Z in Nigeria". No dashes.
3. org: the full case study organisation (use the student's if given, otherwise the one in the topic, otherwise a sensible type of organisation in Akwa Ibom or Nigeria). orgShort is a short name (for example "AIT Port Harcourt"). place is town and state. For ex post facto, org describes the group of firms (for example "quoted oil and gas firms in Nigeria") and orgShort is "the sampled firms".
4. sector: a short phrase such as "broadcasting industry". construct: the overall concept that the independent variables belong to, in Title Case, such as "Overhead Costing" or "Tax Incentives" (used in headings like "Dimensions of Overhead Costing").
5. dv: ONE dependent variable. name in Title Case, abbr of 3 to 5 capitals, phrase is a lowercase noun phrase for use after "of the" (for example "profitability"), definition in one sentence of at most 28 words, and exactly 4 statements for a 4-point agreement scale about this variable (positive wording, about 14 words each, all different).
6. ivs: 4 independent variables (3 only if the topic truly has no fourth). Each has name in Title Case, abbr of 2 to 5 capitals, phrase in lowercase for use after "the relationship between the" (for example "method of overhead cost allocation"), definition of at most 28 words, verb chosen from determine, assess, examine, ascertain, use each verb once, expected sign "+" or "-" for its effect on the dependent variable, and exactly 4 statements about the practice or condition. Statements 1 to 3 describe the practice. Statement 4 must read: "The <phrase> significantly affects the <dv phrase> of <orgShort>." For ex post facto studies the statements are still required but are not used for analysis.
7. strata: exactly 3 respondent groups (for a survey, departments of the organisation or categories of respondents; for ex post facto, three short labels such as "Small firms", "Medium firms", "Large firms").
8. controlName: "Department" or "Respondent Category" for a survey, "Firm Size" for ex post facto.
9. theories: exactly 4 real, well known theories that suit the topic, each with its real proponent (for example "Activity-Based Costing Theory", "Cooper and Kaplan"). Only theories you are sure exist.
10. Do not use dashes of any kind in any text.`;
  const gen = { temperature: 0.6, maxOutputTokens: 4500 };
  const BP_SHAPE = `

Return ONLY a JSON object of exactly this shape (no markdown, no extra keys). dv.statements must have exactly 4 strings. ivs is an array of 3 or 4 objects. strata has exactly 3 strings. theories has exactly 4 objects.
{"design":"survey|expost","title":"","construct":"","org":"","orgShort":"","place":"","sector":"","controlName":"",
"dv":{"name":"","abbr":"","phrase":"","definition":"","statements":["","","",""]},
"ivs":[{"name":"","abbr":"","phrase":"","definition":"","verb":"determine|assess|examine|ascertain|evaluate|investigate","expected":"+|-","statements":["","","",""]}],
"strata":["","",""],"theories":[{"name":"","by":""}]}`;
  let up, prov;
  try {
    const out = await callAI({ system: BP_SYSTEM, json: true, gen, user: msg + BP_SHAPE });
    up = out.r; prov = out.p;
  } catch (e) { return fail(res, 502, "The assistant could not be reached. Try again."); }
  if (!up.ok) { console.error("ai blueprint", up.status, await up.text().catch(() => "")); return fail(res, up.status === 429 ? 429 : 502, up.status === 429 ? "The free AI quota is busy right now. Wait a minute and try again." : "The assistant is unavailable right now (code " + up.status + ")."); }
  let bp;
  try {
    const d = await up.json(), txt = aiText(d);
    bp = STUDY.sanitizeBp(JSON.parse(txt.replace(/^```json|```$/g, "").trim()));
    if (!bp) throw new Error("incomplete");
    if (method !== "auto") bp.design = method;
    bp.field = field; if (pop) bp.population = pop;
  } catch (e) { return fail(res, 502, "The assistant returned an incomplete plan. Tap Start again."); }
  await logUse(user, "blueprint");
  res.statusCode = 200; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify({ bp }));
}

/* ---------- streaming placeholder expander: {{T4_AGE}} becomes the finished table, even across chunk boundaries ---------- */
function expander(map) {
  let buf = "";
  const sub = s => s.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (m, k) => Object.prototype.hasOwnProperty.call(map, k) ? map[k] : "");
  return {
    push(t) { buf += t; const i = buf.lastIndexOf("{{"); let cut = buf.length; if (i >= 0 && buf.indexOf("}}", i) < 0) cut = i; else if (buf.endsWith("{")) cut = buf.length - 1; const out = sub(buf.slice(0, cut)); buf = buf.slice(cut); return out; },
    end() { const out = sub(buf).replace(/\{\{[^}]*$/, ""); buf = ""; return out; },
  };
}

/* ---------- section briefs ---------- */
const plainLine = l => l.replace(/^\[\[LI\]\]\s*/, "").replace(/\*\*/g, "");
function brief(bp, S, f) {
  const post = bp.design === "expost";
  return `PROJECT BRIEF
Title: ${bp.title}
Case study: ${bp.org}${bp.place ? " (" + bp.place + ")" : ""}. Short name: ${bp.orgShort}. Sector: ${bp.sector}. Field: ${bp.field || f.field || "Accounting"}. Level: ${f.level || "Undergraduate"}.
Research design: ${post ? "ex post facto, using secondary data from published annual reports analysed by regression" : "descriptive survey with a structured questionnaire, with a supporting ex post facto element using available financial records"}.
Dependent variable: ${bp.dv.name} (${bp.dv.abbr}): ${bp.dv.definition}
Independent variables:
${bp.ivs.map((v, i) => `${i + 1}. ${v.name} (${v.abbr}): ${v.definition}`).join("\n")}
Control variable: ${bp.controlName}.
Theories (in this order): ${bp.theories.map(t => t.name + " (" + t.by + ")").join("; ")}.
OBJECTIVES (fixed, same wording in every chapter):
${S.lines.obj.map(plainLine).join("\n")}
RESEARCH QUESTIONS (fixed):
${S.lines.rq.map(plainLine).join("\n")}
HYPOTHESES (fixed):
${S.lines.hypl.map(h => h.replace(/\*\*/g, "")).join("\n")}
FACTS (computed by the system, exact; use them as given):
${S.facts.map(x => "- " + x).join("\n")}`;
}
const IVN = bp => bp.ivs.map(v => v.name + " (" + v.abbr + ")").join(", ");
const sectorRef = bp => bp.sector || "the sector";

const SEC = {
  abs: { words: 310, t: (bp, S) => `Write the ABSTRACT as ONE paragraph of 240 to 300 words, with no heading and no markup tokens. Move through: the background and problem, the objective, the research design, the population and sample size and sampling method, the instrument or data source and the analysis technique (with the actual numbers from FACTS), the main findings stated exactly as in FACTS (say which hypotheses were rejected or not rejected), the conclusion, and the main recommendations. Past tense. State that the figures are drawn from the study's data. Do not cite sources.` },

  c1: { words: 3050, t: (bp, S) => {
    const post = bp.design === "expost", rel = post ? "effect of" : "relationship between", m = bp.ivs.length;
    return `Write CHAPTER ONE: INTRODUCTION: about 3,000 words in about 33 paragraphs, using exactly this skeleton. Do not add or drop sections.

[[CH]] CHAPTER ONE
[[CT]] INTRODUCTION
[[H2]] 1.1 Background to the Study
7 paragraphs of 95 to 115 words: (1) the sector and its place in the Nigerian economy; (2) the operating environment, competition and cost pressures; (3) why the dependent variable matters for survival and growth; (4) to (6) the independent variables and how each relates to the dependent variable, using the exact names and abbreviations; (7) the case study and the purpose of the study.
[[H2]] 1.2 Statement of the Problem
3 paragraphs of 130 to 150 words: (1) the situation and the evidence of the problem; (2) the mechanism by which weaknesses in the independent variables hurt the dependent variable; (3) the gap, the case study and why this study is needed. No fabricated statistics.
[[H2]] 1.3 Objectives of the Study
One paragraph of about 60 words: "The main objective of this study is to examine the ${rel} ${post ? "the independent variables and" : "overall"} ... " in your own words, naming the dependent variable and ${bp.orgShort}, ending with: "Specifically, the study intends to achieve the following objectives; to:"
{{OBJ}}
[[H2]] 1.4 Research Questions
One sentence: "In line with the objectives of the study, the following research questions were formulated to guide the study:"
{{RQ}}
[[H2]] 1.5 Hypotheses of Study
One sentence: "The following null hypotheses were formulated and tested at the 5% level of significance:"
{{HYP}}
[[H2]] 1.6 Significance of the Study
A lead-in paragraph of about 45 words, then 6 paragraphs of 75 to 95 words, each beginning "To the management of ...", "To investors and owners ...", "To regulators and policy makers ..." (name the real bodies), "To accounting and finance professionals ...", "To academics and researchers ...", "To students and the general public ...". Plain text, no bold.
[[H2]] 1.7 Scope and Limitations of the Study
Two paragraphs of 80 to 90 words on the scope (variables, population, location, period). Then one lead-in sentence "The study was subject to the following limitations:" and 4 paragraphs of 55 to 75 words, each beginning with a bold label such as **Geographical Scope:**, **Data Availability and Accessibility:**, **Respondent Bias:**, **Time and Resource Constraints:**.
[[H2]] 1.8 Operational Definition of Key Concepts
One lead-in sentence, then exactly 15 terms in strict alphabetical order, each as one line: [[LI]] **a. Term:** definition of 35 to 45 words ending with how the term is used in this study. Letters a to o. Include the dependent variable, every independent variable (with abbreviation) and the main sector and case study concepts.`;
  } },

  c2a: { words: 3200, t: (bp, S) => {
    const post = bp.design === "expost", m = bp.ivs.length;
    return `Write the first half of CHAPTER TWO: REVIEW OF RELATED LITERATURE: about 3,200 words, using exactly this skeleton. The rest of the chapter is written separately, so stop after the last theory in 2.2.

[[CH]] CHAPTER TWO
[[CT]] REVIEW OF RELATED LITERATURE
[[H2]] 2.1 Conceptual Review
[[H3]] 2.1.1 ${bp.construct}
3 paragraphs of 105 to 125 words: what ${bp.construct} means (with one or two real authorities), why it matters in the ${sectorRef(bp)}, and the Nigerian operating realities that shape it.
[[H3]] 2.1.2 Dimensions of ${bp.construct}
One lead-in paragraph of about 60 words naming the ${m} dimensions used in the study.
${bp.ivs.map((v, j) => `[[H4]] 2.1.2.${j + 1} ${v.name}\nOne paragraph of 130 to 160 words beginning "This dimension refers to ...": define it, explain how it is practised in the ${sectorRef(bp)}, cite one or two real authorities in the form (Surname, Year) or (Surname and Surname, Year), and state its link with ${bp.dv.name}.`).join("\n")}
[[H3]] 2.1.3 ${bp.dv.name}
2 paragraphs of 100 to 120 words: the meaning of ${bp.dv.name}, why it is the central concern of managers and owners, and what drives it in Nigeria.
[[H3]] 2.1.4 Measurement of ${bp.dv.name}
One lead-in sentence, then four fourth level headings, one for each of the four best known measures of ${bp.dv.name}${post ? " (each must be a ratio that can be worked out from annual reports)" : ""}, numbered 2.1.4.1 to 2.1.4.4, each with the measure's name as its title and one paragraph of 70 to 90 words defining it and how it is read.
[[H3]] 2.1.5 Theoretical Linkage Between ${bp.construct} and ${bp.dv.name}
One lead-in paragraph of about 70 words, then ${m} paragraphs of 130 to 150 words, one per dimension in order, opening First, Second${m > 2 ? ", Third" : ""}${m > 3 ? " and Fourth" : ""}, each explaining the mechanism by which the dimension raises or lowers ${bp.dv.name}. End with one closing paragraph of about 90 words.${post ? " Add one sentence saying that firm size is controlled for because larger firms tend to have different cost structures." : ""}
[[H2]] 2.2 Theoretical Review
One paragraph of about 45 words introducing the theories that anchor the study.
${bp.theories.map((t, k) => `[[H3]] 2.2.${k + 1} ${t.name} (${t.by}, YEAR)\nReplace YEAR with the year the theory was first published only if you are sure of it, otherwise write the heading as ${t.name} (${t.by}). Paragraph 1 (about 85 words): origin and proponent. Paragraph 2 (about 100 words): the central idea and its key tenets, written in prose, with no list. Paragraph 3 (about 75 words): the theory in the context of ${sectorRef(bp)}. Paragraph 4 (about 70 words) beginning "The relevance of this theory to the present study lies in ...".`).join("\n")}`;
  } },

  c2b: { words: 3200, t: (bp, S) => {
    const m = bp.ivs.length;
    return `Write the second half of CHAPTER TWO: about 3,200 words, using exactly this skeleton. Do not repeat the chapter or title lines; continue straight from the end of section 2.2, which is already written.

[[H2]] 2.3 Empirical Review
One paragraph of about 70 words saying the review is organised by the research objectives and mainly uses Nigerian evidence.
${bp.ivs.map((v, j) => `[[H3]] 2.3.${j + 1} ${v.name} and ${bp.dv.name}\n4 to 5 paragraphs of about 85 words. Each discusses one or two named studies in the form: Authors (Year) investigated ..., used ... (design, sample, tool), and found ... Mix Nigerian and international studies from 2008 to 2024. Close with one sentence on what the evidence means for this study.`).join("\n")}
[[H3]] 2.3.${m + 1} Summary of Empirical Evidence
One lead-in sentence saying that Table 2.1 summarises the empirical studies reviewed, then
[[TC]] Table 2.1: Summary of Empirical Studies Reviewed
[[TB open w=7,23,32,38 split=7]]
S/N | Author | Methodology | Findings
(one row per study discussed in 2.3, between 14 and 21 rows, numbered from 1. Author: surnames and year, for example Eze & Okoye (2021). Methodology: 8 to 18 words naming the design, sample and tool. Findings: 18 to 35 words.)
[[/TB]]
[[TS]] Source: Researcher’s compilation (2026).
then 2 paragraphs of about 90 words on the pattern the table shows.
[[H2]] 2.4 Summary of Literature and Knowledge Gaps
8 paragraphs of 80 to 90 words: what the literature agrees on; where studies disagree; the gaps in terms of sector, location, period, variables and method; how the present study fills them; and how it is positioned against the theories in 2.2. Close with a paragraph beginning "Against this background, ...".

CITATION RULES: only studies and authors you are highly confident exist. Do not invent sample sizes or findings that you do not know; describe what is generally established when unsure. Every study in Table 2.1 must be discussed in 2.3 and vice versa.`;
  } },

  c3: { words: 2400, t: (bp, S) => bp.design === "expost" ? `Write CHAPTER THREE: METHODOLOGY (ex post facto): about 2,300 words in about 28 paragraphs, using exactly this skeleton. {{...}} lines are placeholders.

[[CH]] CHAPTER THREE
[[CT]] METHODOLOGY
[[H2]] 3.1 Introduction
One paragraph of about 90 words previewing the chapter.
[[H2]] 3.2 Research Design
2 paragraphs of about 115 words: the study adopted an ex post facto design because the data already exist in published annual reports and the researcher cannot manipulate them; explain the panel (pooled firm-year) structure and why it suits the objectives.
[[H2]] 3.3 Population of the Study
One paragraph of about 100 words: the population is the ${S.popFirms} firms in the group named in the brief that were listed in 2025.
[[H2]] 3.4 Sample Size and Sampling Technique
One paragraph of about 120 words: purposive sampling of ${S.k} firms that met three criteria (listed throughout ${S.start} to ${S.end}; published complete annual reports for every year; not delisted, merged or suspended). State that the ${S.k} firms over ${S.T} years give ${S.N} firm-year observations.
{{T3_FIRMS}}
One sentence referring to Table 3.2.
[[H2]] 3.5 Sources and Method of Data Collection
3 paragraphs of about 90 words: secondary data from audited annual reports and accounts, NGX publications and company websites; the period; extraction by content analysis into a data sheet; why audited statements are reliable.
[[H2]] 3.6 Description of Research Variables
One lead-in paragraph of about 50 words, then ${bp.ivs.length + 1} paragraphs of about 45 words, each starting with a bold lead: ${bp.ivs.map(v => "**" + v.name + " (" + v.abbr + "):**").join(", ")} and **${bp.dv.name} (${bp.dv.abbr}):**, then a paragraph on **Firm Size (SIZE):** as the control variable.
{{T3_VAR}}
[[H2]] 3.7 Model Specification
One paragraph of about 70 words introducing the model.
{{MODEL}}
One paragraph of about 90 words defining each symbol (it means firm i in year t; beta zero is the intercept; the other betas are coefficients; epsilon is the error term).
[[H2]] 3.8 Method of Data Analysis
[[H3]] 3.8.1 Descriptive Statistics and Correlation Analysis
One paragraph of about 90 words.
[[H3]] 3.8.2 Regression Analysis
One paragraph of about 100 words: pooled OLS with heteroskedasticity-robust standard errors, significance at 5 per cent.
[[H3]] 3.8.3 Diagnostic Tests
One paragraph of about 110 words: variance inflation factor (values below 10 acceptable), Breusch-Pagan test for heteroskedasticity, Durbin-Watson statistic for autocorrelation.
[[H2]] 3.9 Validity and Reliability of the Data
2 paragraphs of about 85 words.
[[H2]] 3.10 Decision Rule
One paragraph of about 90 words: reject the null hypothesis when the p-value is below 0.05, otherwise do not reject.` : `Write CHAPTER THREE: METHODOLOGY (questionnaire survey): about 2,400 words in about 30 paragraphs, using exactly this skeleton. {{...}} lines are placeholders.

[[CH]] CHAPTER THREE
[[CT]] METHODOLOGY
[[H2]] 3.1 Research Design
3 paragraphs of about 115 words: (1) a descriptive cross-sectional survey design, why it suits the problem, data collected from respondents with a structured questionnaire without manipulating variables; (2) how the design allows the relationship between each independent variable and ${bp.dv.name} to be examined; (3) beginning "In addition to the survey design, the study also made use of an ex post facto approach in respect of the secondary financial data taken from the records of ${bp.orgShort}, where available, since such data relate to events that had already occurred ..."
[[H2]] 3.2 Population of the Study
2 paragraphs of about 90 words: the population is ${S.N} persons in these groups: ${S.strata.map((s, i) => s + " (" + S.pop[i] + ")").join(", ")}. Describe ${bp.org}${bp.place ? " (" + bp.place + ")" : ""} in one or two sentences, say why only these groups were included and who was excluded.
[[H2]] 3.3 Sample Size Determination and Sampling Technique
One paragraph of about 70 words introducing the Taro Yamane formula at a 5% margin of error and 95% confidence level.
{{EQ_TARO}}
One paragraph of about 130 words: the sample of ${S.n} drawn from ${S.N}, and stratified random sampling in proportion to the size of each group, summarised in Table 3.1.
{{T3_SAMPLE}}
[[H2]] 3.4 Sources and Nature of Data
2 paragraphs of about 100 words: primary data from the questionnaire, complemented by oral interviews with selected principal officers; and secondary data from textbooks, journals, past projects and the records of ${bp.orgShort} where made available. Say the data are cross-sectional.
[[H2]] 3.5 Development of the Research Instrument
2 paragraphs of about 100 words: a structured questionnaire; Section A for demographic information; Section B in ${bp.ivs.length} parts, one per independent variable in the order of the objectives (${IVN(bp)}), each with four statements on a 4-point Likert scale (Strongly Agree 4, Agree 3, Disagree 2, Strongly Disagree 1), and that ${bp.dv.name} is measured through the related items. The questionnaire is in Appendix A. Say that ${S.n} copies were administered by hand and retrieved.
[[H2]] 3.6 Validation and Reliability of the Research Instrument
2 paragraphs. Paragraph 1 (about 130 words): what validation is, and how the supervisor and other lecturers checked content and context validity and corrections were made. Paragraph 2 (about 160 words): what reliability is, the options (test re-test, Cronbach's Alpha, pilot study), and that a pilot study of ${S.pilot} respondents from a similar organisation outside the sample gave a Cronbach's alpha of ${STUDY.f2(S.alpha)}, above the 0.70 threshold, so the instrument was reliable.
[[H2]] 3.7 Measurement and Description of Variables of the Study
One paragraph of about 90 words: this sub-section identifies the dependent and independent variables, how each is measured, and the a priori expectation shown with a positive (+) or negative (−) sign, based on the theoretical framework and empirical review in Chapter Two. Refer to Table 3.2.
{{T3_VAR}}
[[H2]] 3.8 Conceptual Specification of the Model
One paragraph of about 90 words: a conceptual model is a diagram showing the relationship between dependent and independent variables; Figure 3.1 presents the model of this study showing the ${bp.ivs.length} independent variables (${bp.ivs.map(v => v.name).join(", ")}) in relation to ${bp.dv.name}.
{{FIG_MODEL}}
[[H2]] 3.9 Model Specification
One paragraph of about 110 words: model specification is the use of symbols to represent variables in mathematical form; a model is simple with one independent variable and multiple with more than one, with the general functional form as follows
{{EQ_GEN}}
One paragraph of about 60 words defining the symbols: Y the dependent variable, α0 the regression constant, β1 to βn the coefficients, X1 to Xn the independent variables and ε the stochastic error term.
One paragraph of about 70 words applying this to the study: ${bp.dv.name} (${bp.dv.abbr}) is the dependent variable and ${IVN(bp)} are the independent variables, measured as in Table 3.2. The functional and econometric specifications are as follows:
{{EQ_SPEC}}
One paragraph of about 110 words: the subscript i denotes the individual respondent (i = 1, 2, ..., ${S.R}); the a priori expectations in Table 3.2 are ${bp.ivs.map(v => v.abbr + " " + (v.expected === "-" ? "negative" : "positive")).join(", ")}; and the model complements the Likert scale and Chi-square analysis in Section 3.10, which is the primary basis for testing the hypotheses in Chapter Four.
[[H2]] 3.10 Method of Data Analysis
One paragraph of about 120 words: descriptive statistics (frequency counts, percentages, mean scores) used for the demographic data and the research questions; the weights 4, 3, 2 and 1; the criterion mean of 2.50; "Agreed" at 2.50 and above and "Disagreed" below it. One paragraph of about 70 words: the Chi-square test of goodness of fit, at the 0.05 level, tests the ${bp.ivs.length} null hypotheses in Chapter One, and the statistic is expressed as:
{{EQ_CHI}}
One paragraph of about 60 words: O is the observed frequency, E the expected frequency, found by dividing the number of respondents to a statement by the four response categories, on the assumption of an equal distribution under the null hypothesis.
[[H2]] 3.11 Decision Rule
One paragraph of about 90 words: for each hypothesis the calculated Chi-square value is compared with the critical value at 3 degrees of freedom (k minus 1, where k is 4 response categories) and the 0.05 level, which is 7.815; reject the null hypothesis and accept the alternate hypothesis if the calculated value is greater than 7.815, otherwise accept the null hypothesis.` },

  c4: { words: 2300, t: (bp, S) => {
    const m = bp.ivs.length;
    if (bp.design === "expost") return `Write CHAPTER FOUR: DATA ANALYSIS AND FINDINGS (ex post facto): about 2,300 words, using exactly this skeleton. Every number must come from FACTS. {{...}} lines are placeholders.

[[CH]] CHAPTER FOUR
[[CT]] DATA ANALYSIS AND FINDINGS
[[H2]] 4.1 Descriptive Statistics
One lead-in paragraph of about 60 words,
{{T4_DESC}}
then 2 paragraphs of about 100 words interpreting the means, spread and range of the variables.
[[H2]] 4.2 Correlation Analysis
One lead-in sentence,
{{T4_CORR}}
then 2 paragraphs of about 100 words on the strength and direction of the relationships and the absence of very high correlations among the independent variables.
[[H2]] 4.3 Regression Analysis
One lead-in paragraph of about 60 words,
{{T4_REG}}
then ${m + 1} paragraphs of about 90 words: the explanatory power (R squared, adjusted R squared) and the F-statistic; then one paragraph per independent variable with its coefficient, p-value and meaning; and the control variable.
[[H2]] 4.4 Diagnostic Tests
[[H3]] 4.4.1 Multicollinearity
{{T4_VIF}}
One paragraph of about 80 words.
[[H3]] 4.4.2 Heteroskedasticity and Autocorrelation
{{T4_DIAG}}
One paragraph of about 90 words.
[[H2]] 4.5 Test of Hypotheses
One lead-in paragraph of about 60 words (5% level, p-value rule),
{{T4_HYP}}
then, for each hypothesis in turn:
${bp.ivs.map((v, j) => `[[H3]] 4.5.${j + 1} Hypothesis ${STUDY.ordinal[j]}\n{{HYP_${j + 1}}}\nOne paragraph of about 80 words with the coefficient, p-value, decision and meaning.`).join("\n")}
[[H2]] 4.6 Discussion of Findings
${m} paragraphs of about 120 words (one per hypothesis) linking each result to Chapter Two (name the theory and one or two studies already cited in the text so far), then one closing paragraph of about 90 words.
[[H2]] 4.7 Summary of Chapter
One paragraph of about 90 words.`;
    return `Write CHAPTER FOUR: PRESENTATION, ANALYSIS AND FINDINGS (survey): about 1,900 words of your own writing, using exactly this skeleton. Every number must come from FACTS. Every {{...}} line is a placeholder for a finished table or finished text, so copy it on its own line and write nothing in its place.

[[CH]] CHAPTER FOUR
[[CT]] PRESENTATION, ANALYSIS AND FINDINGS
[[H2]] 4.1 Presentation of Questionnaire Return Rate
One paragraph of about 55 words introducing the questionnaire administration and return rate,
{{T4_RETURN}}
then one paragraph of about 70 words interpreting the table.
[[H2]] 4.2 Demographic Characteristics of Respondents
In this order, each table followed by one paragraph of about 45 words interpreting it: {{T4_GENDER}} then {{T4_AGE}} then {{T4_QUAL}} then {{T4_DEPT}} then {{T4_YEARS}}.
[[H2]] 4.3 Analysis of Data Based on Research Questions
One paragraph of about 70 words on the 4-point scale, the weights 4, 3, 2 and 1 and the criterion mean of 2.50.
${bp.ivs.map((v, j) => `{{T4_IV${j + 1}}}\nthen one paragraph of about 70 words: the grand mean score of ${v.abbr} against the criterion mean of 2.50, the decision, and the answer to research question ${STUDY.ordinal[j].toLowerCase()}.`).join("\n")}
[[H2]] 4.4 Test of Hypotheses
One paragraph of about 70 words saying the ${m} hypotheses formulated in Chapter One were tested with the Chi-square technique, expressed as χ² = Σ(O − E)²/E, rejecting H0 where the calculated value exceeds the critical value of 7.815 at 3 degrees of freedom and the 0.05 level.
${bp.ivs.map((v, j) => `{{HYPH_${j + 1}}}\n{{HYP_${j + 1}}}\n{{CHI_INTRO_${j + 1}}}\n{{T4_CHI${j + 1}}}\n{{CHI_TXT_${j + 1}}}`).join("\n")}
[[H2]] 4.5 Discussion of Findings
${m} paragraphs of about 120 words (one per hypothesis, in order) linking each result to the theory and one or two studies already cited in Chapter Two, and to the a priori expectation in Chapter Three, then one closing paragraph of about 90 words.`;
  } },

  c5: { words: 2300, t: (bp, S) => `Write CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATIONS: about 2,300 words, using exactly this skeleton. Use the results in FACTS and the earlier text. Do not introduce new numbers. Write in paragraphs, with no numbered lists.

[[CH]] CHAPTER FIVE
[[CT]] SUMMARY, CONCLUSION AND RECOMMENDATIONS
[[H2]] 5.1 Summary of the Study
5 paragraphs of about 100 words: (1) what the study examined and what motivated it; (2) what Chapter One covered (background, problem, the ${bp.ivs.length} objectives, questions and hypotheses, significance, scope, definitions); (3) what Chapter Two reviewed (conceptual, theoretical and empirical review and the gap); (4) what Chapter Three set out (${bp.design === "expost" ? "ex post facto design, sample of firms and period, model, diagnostics" : "survey design, population, sample, instrument, validation, model, Chi-square analysis"}); (5) what Chapter Four did.
[[H2]] 5.2 Summary of Findings
One lead-in sentence "Based on the analysis of data carried out in Chapter Four, the following findings emerged from the study:" then ${bp.ivs.length} paragraphs of 70 to 90 words, one per hypothesis in order, each opening with the finding in plain words (for example "${bp.ivs[0].name} has a significant effect on ${bp.dv.name} ...") and giving the grand mean or coefficient, the test result, the decision, and whether it agrees with the a priori expectation.
[[H2]] 5.3 Conclusion
2 paragraphs of about 110 words.
[[H2]] 5.4 Implications of the Findings
[[H3]] 5.4.1 Implications for Policy
One paragraph of about 90 words (name the relevant regulators).
[[H3]] 5.4.2 Implications for Practice
One paragraph of about 90 words.
[[H3]] 5.4.3 Implications for Academic Literature
One paragraph of about 90 words.
[[H2]] 5.5 Recommendations
One lead-in sentence "Arising from the findings and conclusions of this study, the following recommendations are made:" then 3 paragraphs of 90 to 110 words, each with two recommendations tied to findings: the first for the management of ${bp.orgShort}, the second for professionals and practitioners, the third for regulators and policy makers.
[[H2]] 5.6 Contribution to Knowledge
One paragraph of about 110 words.
[[H2]] 5.7 Suggestions for Further Studies
One lead-in sentence "Building on the findings and limitations of this study, future research could usefully pursue the following directions:" then 3 paragraphs of about 60 words, each beginning "A study ..." or "Further studies ...".` },

  refs: { words: 1700, t: (bp, S, f, cites) => `Write the REFERENCES list: 30 to 40 entries in ${f.cite || "APA 7th edition"} style, in strict alphabetical order by first author's surname, each on its own line as [[RF]] entry. Write "and" (never an ampersand) before the last author, with initials after the surname. Use __double underscores__ for journal names with volume, and for book titles.
Include an entry for every in-text citation below whenever you are confident the work exists. Where unsure of volume, issue or pages, leave the detail out rather than guess, and end that entry with [verify details]. Then add well known textbooks and authorities relevant to the topic (only ones you are sure exist) until you reach at least 30 entries.
IN-TEXT CITATIONS FOUND IN THE PROJECT: ${cites && cites.length ? cites.join("; ") : "(none detected)"}` },
};
const SEC_ORDER = Object.keys(SEC);

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed.");
  if (!GROQ_KEY || !SB_SERVICE) return fail(res, 500, "The Project AI Studio is not set up yet. Please tell the NUASA admin.");

  // 1. Must be a signed-in user
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(res, 401, "Please sign in to use the Project AI Studio.");
  let user;
  try {
    const u = await sbFetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_ANON, Authorization: "Bearer " + token } });
    if (!u.ok) return fail(res, 401, "Your session expired. Please sign in again.");
    user = await u.json();
  } catch (e) { return fail(res, 502, "Could not verify your sign-in. Try again."); }

  const body = req.body || {};
  if (body.mode === "topics") return topicsMode(res, user, body);
  if (body.mode === "blueprint") return blueprintMode(res, user, body);

  // 2. Validate input (the client can only pick a section id and project details, never free-form prompts)
  const sec = SEC[body.section];
  if (!sec) return fail(res, 400, "Unknown section.");
  const f = body.form || {}, topic = clean(f.topic, 300);
  if (topic.length < 8) return fail(res, 400, "Describe your topic in a sentence.");
  const bp = STUDY.sanitizeBp(body.bp);
  if (!bp) return fail(res, 400, "The project plan is missing. Go back and tap Start again.");
  const level = LEVELS.includes(f.level) ? f.level : LEVELS[1], cite = CITES.includes(f.cite) ? f.cite : CITES[0];
  let S;
  try { S = STUDY.buildStudy(bp, { population: f.population, level, details: f.details }); } catch (e) { console.error("study", e); return fail(res, 400, "The project plan could not be read. Go back and tap Start again."); }
  const prior = String(body.prior || "").slice(-12000);
  const cites = (Array.isArray(body.cites) ? body.cites : []).slice(0, 90).map(c => clean(c, 90)).filter(Boolean);

  // 3. Limits: per student and for the whole site (keeps usage inside the free quota)
  if (!(await checkLimits(res, user))) return;

  // 4. Build the prompt and stream the answer from Groq
  const msg = `${brief(bp, S, { level, field: bp.field })}\nCitation style: ${cite}\n\nTASK\n${sec.t(bp, S, { cite, level }, cites)}\n\nPROJECT TEXT WRITTEN SO FAR (for consistency only; do not repeat it):\n${prior || "(nothing yet)"}`;
  const gen = { maxOutputTokens: Math.min(14000, Math.ceil(sec.words * 1.8) + 900), temperature: 0.75 };
  let up, prov;
  try {
    const out = await callAI({ system: SYSTEM, user: msg, gen, stream: true });
    up = out.r; prov = out.p;
  } catch (e) { return fail(res, 502, "The assistant could not be reached. Try again."); }
  if (!up.ok) {
    console.error("ai", prov, up.status, await up.text().catch(() => ""));
    return fail(res, up.status === 429 ? 429 : 502, up.status === 429 ? "The free AI quota is busy right now. Wait a minute and tap Continue." : "The assistant is unavailable right now (code " + up.status + "). Check the Groq API key, then try again.");
  }

  // Count this call only now that the AI accepted it, so failed attempts do not use up a student's daily drafts.
  await logUse(user, body.section);

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
  const dec = new TextDecoder(), ex = expander(S.ph);
  let buf = "";
  try {
    for await (const chunk of up.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        if (line.slice(5).trim() === "[DONE]") continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.error) throw new Error("upstream");
        const t = ev.choices && ev.choices[0] && ev.choices[0].delta && ev.choices[0].delta.content;
        if (t) { const o = ex.push(t); if (o) res.write(o); }
      }
    }
    const tail = ex.end(); if (tail) res.write(tail);
    res.end();
  } catch (e) { res.write("\n[[ERROR]]"); res.end(); }
};
module.exports.expander = expander; module.exports.SEC_ORDER = SEC_ORDER; module.exports._test = { SEC, SYSTEM, brief };
