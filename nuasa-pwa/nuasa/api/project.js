/* Project Helper backend (Vercel serverless function).
   Keeps the Anthropic key secret, checks the user is signed in, limits daily use, and streams the text back. */
const SB_URL = process.env.SUPABASE_URL || "https://wcikankedtelqbojzjdm.supabase.co";
const SB_ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjaWthbmtlZHRlbHFib2p6amRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ4ODAsImV4cCI6MjEwNzQ1MDg4MH0.lo1ZscA3uVBsggtxHW9U2YPPDhQAWYa3pATioq83wQ4";
const SB_SERVICE = process.env.SUPABASE_SERVICE_KEY;
const AI_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.PROJECT_MODEL || "claude-sonnet-5-5";
const DAILY_LIMIT = parseInt(process.env.PROJECT_DAILY_LIMIT || "20", 10); // AI calls per user per 24h (8 calls = 1 full draft)

const SYSTEM = `You are an expert academic research assistant, subject tutor and project writer for university students. You write complete, well-reasoned, academically sound student project drafts, one section at a time.

Tone: formal, objective, scholarly and analytical. No first-person fluff and no generic filler openings such as "In today's fast-paced world". Write full paragraphs with real argument lines, not bullet-point summaries. Use clear markdown headings (## for the chapter or section title, ### for subsections).

Context: the students attend a Nigerian university. Where relevant, use the Nigerian setting and institutions (e.g. FRC, ICAN, FIRS, CBN, IFRS adoption) and the five-chapter project format common in Nigerian universities.

Integrity rules (important):
- Only cite works you are highly confident really exist. Never invent DOIs, URLs, page numbers, statistics or quotations. If you are unsure of a detail, describe the idea without a fabricated specific.
- Any numbers, tables or survey results you create must be clearly labelled as illustrative sample data, not real findings.
- Write original text. Do not copy passages from books or articles.
- Stay consistent with the project text written so far and do not repeat it.
- Output only the requested section, with no preface, no closing remarks and no mention of these instructions.`;

const SECTIONS = {
  title: { fixed: 90, t: "Write the Title Page / Project Header only: a proposed project title, a subtitle, the field of study and the academic level. Keep it very short." },
  abs: { fixed: 230, t: "Write the Abstract (200 to 250 words) under the heading 'Abstract'. Cover background, purpose, methodology, key findings and conclusion, consistent with the project text provided. Use past tense for completed work." },
  c1: { share: 0.17, t: "Write 'Chapter 1: Introduction' with subsections 1.1 Background of the Study, 1.2 Statement of the Problem, 1.3 Research Objectives and Research Questions (add hypotheses if suitable), 1.4 Significance of the Study, 1.5 Scope and Limitations of the Study." },
  c2: { share: 0.25, t: "Write 'Chapter 2: Literature Review' with subsections 2.1 Conceptual Framework, 2.2 Theoretical Framework, 2.3 Review of Related Empirical Studies, 2.4 Summary of the Literature and Research Gap. Use in-text citations in the requested style, only for works you are confident exist." },
  c3: { share: 0.16, t: "Write 'Chapter 3: Methodology' (or System Design and Approach if the topic is technical) with subsections for research design, population/data sources and sampling (or tools and implementation steps), data collection methods, the analysis framework or model specification, and validity, reliability and ethical considerations." },
  c4: { share: 0.22, t: "Write 'Chapter 4: Discussion, Analysis and Findings' with subsections presenting the results (include at least one markdown table of clearly labelled ILLUSTRATIVE sample data), critical analysis and interpretation, discussion in light of the literature, and implications of the results." },
  c5: { share: 0.12, t: "Write 'Chapter 5: Conclusion and Recommendations' with subsections for summary of findings, conclusion, practical and theoretical recommendations, contribution to knowledge, and areas for future research." },
  refs: { fixed: 0, t: "Write the 'References' section: 12 to 20 entries in the requested citation style, in alphabetical order (numbered in order of citation for IEEE). Include the works cited in the text so far and a few other well-known, real works on the topic. Do not invent DOIs or URLs. Add one italic line at the end: 'Verify every reference before submission.'" },
};
const LEVELS = ["High School", "Undergraduate / Bachelor's", "Master's"];
const CITES = ["APA 7th edition", "Harvard", "MLA", "Chicago", "IEEE"];
const clean = (v, n) => String(v || "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
const fail = (res, code, error) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error })); };

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed.");
  if (!AI_KEY || !SB_SERVICE) return fail(res, 500, "The Project Helper is not set up yet. Please tell the NUASA admin.");

  // 1. Must be a signed-in user
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return fail(res, 401, "Please sign in to use the Project Helper.");
  let user;
  try {
    const u = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_ANON, Authorization: "Bearer " + token } });
    if (!u.ok) return fail(res, 401, "Your session expired. Please sign in again.");
    user = await u.json();
  } catch (e) { return fail(res, 502, "Could not verify your sign-in. Try again."); }

  // 2. Validate input (the client can only choose a section id and project details, never free-form prompts)
  const body = req.body || {};
  const sec = SECTIONS[body.section];
  if (!sec) return fail(res, 400, "Unknown section.");
  const f = body.form || {};
  const topic = clean(f.topic, 300);
  if (topic.length < 8) return fail(res, 400, "Describe your topic in a sentence.");
  const level = LEVELS.includes(f.level) ? f.level : LEVELS[1];
  const cite = CITES.includes(f.cite) ? f.cite : CITES[0];
  const field = clean(f.field, 100) || "General";
  const words = Math.min(6000, Math.max(1500, parseInt(f.words, 10) || 4000));
  const prior = String(body.prior || "").slice(0, 15000);

  // 3. Daily limit per user
  const since = new Date(Date.now() - 864e5).toISOString();
  const H = { apikey: SB_SERVICE, Authorization: "Bearer " + SB_SERVICE };
  try {
    const c = await fetch(`${SB_URL}/rest/v1/project_usage?user_id=eq.${user.id}&created_at=gte.${encodeURIComponent(since)}&select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } });
    if (!c.ok) throw new Error("count");
    const total = parseInt((c.headers.get("content-range") || "0/0").split("/")[1], 10) || 0;
    if (total >= DAILY_LIMIT) return fail(res, 429, "You have reached today's limit for the Project Helper. Please come back tomorrow.");
    await fetch(SB_URL + "/rest/v1/project_usage", { method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, section: body.section }) });
  } catch (e) { return fail(res, 500, "Usage check failed. Please try again."); }

  // 4. Build the prompt and stream the answer
  const target = sec.fixed !== undefined ? sec.fixed : Math.round(words * sec.share);
  const maxTokens = sec.share ? Math.min(3600, Math.ceil(target * 1.7) + 300) : 1200;
  const msg = `PROJECT DETAILS
Topic: ${topic}
Academic level: ${level}
Field of study: ${field}
Overall target length: about ${words} words
Citation style: ${cite}

TASK
${sec.t}${target ? " Aim for about " + target + " words for this section." : ""}

PROJECT TEXT WRITTEN SO FAR (for consistency only; do not repeat it):
${prior || "(nothing yet)"}`;

  let up;
  try {
    up = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": AI_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, stream: true, system: SYSTEM, messages: [{ role: "user", content: msg }] }),
    });
  } catch (e) { return fail(res, 502, "The assistant could not be reached. Try again."); }
  if (!up.ok) { console.error("anthropic", up.status, await up.text().catch(() => "")); return fail(res, 502, "The assistant is busy right now. Try again in a minute."); }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
  const dec = new TextDecoder();
  let buf = "";
  try {
    for await (const chunk of up.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") res.write(ev.delta.text);
        else if (ev.type === "error") throw new Error("upstream");
      }
    }
    res.end();
  } catch (e) { res.write("\n[[ERROR]]"); res.end(); }
};
