# Project AI v2: stopping point

Marked at the end of the first working session. Everything below is what exists, what was tested,
and exactly where to pick up next time.

## WHERE WE STOPPED

**Last completed step:** a full end to end test in a real browser (your real `index.html` plus your real
`api/project.js`, with only Supabase and Gemini faked). It passed: 3 second splash, home page, setup form,
plan plus 8 written parts, tables expanded, dashes removed, saved project, Word download.

**I was in the middle of:** looking at the on-screen preview of each chapter. Reviewed so far: splash,
home page (phone and desktop), 3D icons, setup form, Chapter 3 preview. **Not yet looked at:** the on-screen
Chapter 4 tables, Table 2.1 in Chapter 2, the phone view of the writing screen, and the exported
`project-draft.docx` from the full run (a sample .docx was checked page by page, the full-run one was not).

## HOW TO UPDATE THE SITE

Upload the contents of the `nuasa/` folder to your GitHub repo, replacing what is there.
Changed or new files: `index.html`, `sw.js`, `api/project.js` (important: the `api` folder must be in GitHub),
and three NEW files in the repo root: `pj-study.js`, `pj-doc.js`, `pj-home.css`.
Everything else is unchanged. Do not upload `_dev/` or this file (they are for working on the project).

- No SQL change is needed (`project_usage.section` is plain text).
- Vercel environment variables (same as before): `GEMINI_API_KEY`, `SUPABASE_SERVICE_KEY`.
  Optional: `GEMINI_MODEL` (default gemini-2.5-flash), `PROJECT_USER_LIMIT` (**default is now 20**, was 16),
  `PROJECT_GLOBAL_LIMIT` (160), `PROJECT_TOPIC_LIMIT` (12).
- A full draft now costs **9 requests** (1 plan + 8 parts). With the global limit of 160 that is about 17 full
  drafts a day for the whole department. Raise `PROJECT_GLOBAL_LIMIT` if you are on a paid Gemini plan.
- The service worker is now `v14`. After deploying, open the app, then refresh once or twice so phones pick it up.

## WHAT WAS BUILT

1. **Department format writer** (`api/project.js`, `pj-study.js`). Format measured from `submit.docx`.
   A one-time "plan" call fixes the variables, objectives, questions, hypotheses and questionnaire items, so
   Chapters 1 to 5 and the appendix always agree. Population, Taro Yamane sample, strata, Likert tables,
   Chi-square and regression numbers are computed in code (not by the AI). With population 65 it reproduces
   your Table 3.2 exactly (65, 56, 20/18/18, 54 returned, 96.4%).
   Two methods: questionnaire survey (your project) or ex post facto (regression on annual report data).
2. **Real Word file** (`pj-doc.js`). US Letter, 1 inch margins, Times New Roman 12 pt, double spacing, justified,
   0.5 inch first-line indent, bold numbered headings (real Heading styles), three-line tables at 10 pt with the
   caption above and a source line below, "Cont'd." splitting for Table 2.1, page numbers top right (none on the
   title page).
3. **Style rules**: no em dashes, en dashes, spaced hyphens or hyphen bullets. Enforced in the prompt and again
   in code on every streamed chunk and on export. Genuine compounds (activity-based, Chi-square) are kept.
4. **Project AI home page** (`pj-home.css`, template inside `index.html`, source in `tools/`). Tailwind
   (prefix `tw-`, scoped, preflight off, so the rest of the app is untouched). 3 second opening animation, then
   the page built like your reference image, with two animated 3D icons made from stacked SVG slices.

## MEASURED FORMAT (from submit.docx), for reference

| Item | Value |
|---|---|
| Page and margins | US Letter, 1 inch all round |
| Font | Times New Roman 12 pt body, tables 10 pt |
| Body | double spaced, justified, first-line indent 0.5 inch, 0 pt after |
| Headings | bold; "1.1" then a tab; chapter lines centred capitals (file mixes 12, 13, 14 pt; I used 14 pt) |
| Lists | typed i. ii. / a. b. / 1. 2.; bold lead term followed by a colon |
| Tables | open three-line style (top rule, rule under header, bottom rule, no verticals); caption above in bold; "Source:" line below; the sample table is a full grid |
| Page number | top right header |
| Chapter 1 | about 3,050 words, 33 prose paragraphs, 1.1 to 1.8 |
| Chapter 2 | about 6,100 words, 73 paragraphs (after removing your duplicated 2.4), Table 2.1 with 21 studies |
| Chapter 3 | about 2,370 words, 31 paragraphs, 3.1 to 3.11, Tables 3.1 and 3.2 |
| Sampling | N = 65, Taro Yamane at 5%, n = 56, stratified 20/18/18 |
| Instrument | 4-point Likert (SA 4, A 3, D 2, SD 1), criterion mean 2.50, Cronbach's alpha above 0.70, pilot of 15 |
| Test | Chi-square goodness of fit, df 3, critical value 7.815 at 0.05 |
| Objectives, questions, hypotheses | same number, one to one (4, 4, 4), roman numerals, H01 to H04 |

## TESTED, AND NOT TESTED

Tested: maths of the engine, placeholder expansion at every chunk boundary, the API handler with mocked
Gemini and Supabase (both methods), a full browser run, the splash timer (3,012 ms measured), .docx opens in
python-docx and LibreOffice, no stray blank pages, strict Word element order.

**NOT tested (do these first next time):**
1. **A real Gemini run.** The AI was faked. The prompts are written carefully but I have never seen the real
   model's output. Expect to tune wording, paragraph counts and dash behaviour after one real draft.
2. **Opening the .docx in real Microsoft Word** and on a phone (only LibreOffice was available). Check the
   header page numbers, table borders and References > Table of Contents.
3. The remaining screens listed under "where we stopped".
4. The service worker update on a real phone.

## NEXT SESSION, IN ORDER

1. Deploy, run one real survey draft end to end, and send me the .docx. I tune the prompts against it.
2. Run one ex post facto draft too.
3. Finish the visual review (Chapter 4 tables, Table 2.1, phone writing screen).
4. Add a checker after each part that warns when paragraph counts or word counts drift from the measured
   blueprint, and offers to regenerate.
5. Optional: table of contents and list of tables as front matter in the .docx; purple accent for the studio
   screens so they match the new home page (kept green for now).

## DECISIONS I MADE THAT YOU SHOULD CONFIRM

- Chapters 4 and 5 are not in `submit.docx` (it stops at Chapter 3). Their structure follows the earlier
  survey chapters from `PROJECT_PRINT.docx` (4.1 return rate, demographics, research questions, hypotheses,
  discussion; 5.1 to 5.9 including Implications and Limitations).
- Title page assumes **Faculty of Business Administration** (editable in the form). Please confirm.
- Margins are 1 inch all round. Your file also has negative indents on many paragraphs (text running past the
  margin); I did not copy that.
- Every table of results says "Illustrative sample data, to be replaced with the researcher's field survey
  results". I kept that deliberately so invented data is never presented as real.
- Table 2.1 and the reference list contain only works the AI is confident exist, so Table 2.1 may have fewer
  than 21 rows. Students must still verify every reference. Uncertain entries end with [verify details].
- The one-line academic integrity note is still added at the very end of the Word file, as the old version
  did. Delete that one line from `pjMarkup()` in `index.html` if you want it gone.
- Setting these rules cannot guarantee a draft passes any AI detector, and the tool does not claim to.

## FOLDER MAP

```
nuasa/                  <- upload this to GitHub
  index.html  sw.js  pj-study.js  pj-doc.js  pj-home.css
  api/project.js
  tools/                <- optional: Tailwind source for the home page
    pj-home.src.html  tailwind.config.js  input.css  build-home.js  pj-home.html
_dev/                   <- do NOT upload: my local test rig (browser test, mock server, sample blueprint)
```
Rebuild the home page after editing `tools/pj-home.src.html`:
`cd tools && npm i -D tailwindcss@3 && cd .. && node tools/build-home.js`
(this regenerates `pj-home.css` and re-injects the template into `index.html`).
