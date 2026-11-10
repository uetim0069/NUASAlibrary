/* Builds the Project AI home screen:
   1) expands the markers in pj-home.src.html (3D icons, logo, splash letters) into pj-home.html
   2) compiles Tailwind into ../pj-home.css (only the classes used)
   Run:  node tools/build-home.js     (needs: npm i -D tailwindcss@3 in the tools folder) */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const dir = __dirname, root = path.join(dir, "..");
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const stops = ["#c4b5fd", "#7c8cff", "#b45cf0", "#d946ef", "#3b0764"];       /* iridescent edge: lilac, blue, purple, pink, deep violet */
const edge = t => { const k = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(k)); return mix(stops[i], stops[i + 1], k - i); };
let uid = 0;
function icon(kind, N = 18, step = 2.5) {
  const id = "g" + (++uid), arrow = kind === "arrow";
  const vb = arrow ? "0 0 140 120" : "0 0 130 130";
  const sil = arrow ? "8,62 126,6 98,62 126,118" : null;
  const bubble = "M34 10H96A26 26 0 0 1 122 36V78A26 26 0 0 1 96 104H82L66 124L54 104H34A26 26 0 0 1 8 78V36A26 26 0 0 1 34 10Z";
  const shape = c => arrow ? `<polygon points="${sil}" fill="${c}"/>` : `<path d="${bubble}" fill="${c}"/>`;
  let s = "";
  for (let i = N; i >= 1; i--) s += `<svg class="tw-absolute tw-inset-0 tw-h-full tw-w-full" viewBox="${vb}" style="transform:translateZ(${(-i * step).toFixed(1)}px)" aria-hidden="true">${shape(edge((i - 1) / (N - 1)))}</svg>`;
  const front = arrow
    ? `<defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3e8ff"/><stop offset=".55" stop-color="#c4a2fb"/><stop offset="1" stop-color="#a78bfa"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs>
       <polygon points="8,62 98,62 126,118" fill="url(#${id}b)"/><polygon points="8,62 126,6 98,62" fill="url(#${id}a)"/><polyline points="8,62 126,6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>`
    : `<defs><linearGradient id="${id}a" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#f1e4ff"/><stop offset=".5" stop-color="#c79bfc"/><stop offset="1" stop-color="#9d5bf2"/></linearGradient><radialGradient id="${id}h" cx=".28" cy=".2" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
       <path d="${bubble}" fill="url(#${id}a)"/><path d="${bubble}" fill="url(#${id}h)"/>`;
  return s + `<svg class="tw-absolute tw-inset-0 tw-h-full tw-w-full" viewBox="${vb}" style="transform:translateZ(0)" aria-hidden="true">${front}</svg>`;
}
function logo(px, big) {
  const id = "l" + (++uid), r = big ? "tw-rounded-[26px]" : "tw-rounded-[10px]";
  return `<span class="tw-relative tw-grid ${r} tw-place-items-center tw-bg-black tw-shadow-[0_0_${big ? 70 : 22}px_rgba(217,70,239,.5),inset_0_0_0_1px_rgba(255,255,255,.16)]" style="width:${px}px;height:${px}px"><svg viewBox="0 0 24 24" style="width:${Math.round(px * .56)}px;height:${Math.round(px * .56)}px"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0abfc"/><stop offset=".5" stop-color="#a78bfa"/><stop offset="1" stop-color="#67e8f9"/></linearGradient></defs><path d="M12 1.8 22.2 12 12 22.2 1.8 12Z" fill="url(#${id})"/><path d="M12 7.2 16.8 12 12 16.8 7.2 12Z" fill="#000"/><path d="M12 10 14 12 12 14 10 12Z" fill="#fff"/></svg></span>`;
}
const letters = "Project AI".split("").map((c, i) => c === " " ? '<span class="tw-inline-block tw-w-[.28em]"></span>' : `<span class="tw-inline-block tw-opacity-0 tw-animate-letter ${i > 7 ? "tw-bg-[linear-gradient(90deg,#c4b5fd,#f0abfc)] tw-bg-clip-text tw-text-transparent" : ""}" style="animation-delay:${(0.45 + i * 0.075).toFixed(2)}s">${c}</span>`).join("");

let html = fs.readFileSync(path.join(dir, "pj-home.src.html"), "utf8")
  .replace("<!--@ARROW-->", icon("arrow")).replace("<!--@BUBBLE-->", icon("bubble"))
  .replace("<!--@LOGO_BIG-->", logo(84, true)).replace("<!--@LOGO_SM-->", logo(36, false)).replace("<!--@LETTERS-->", letters);
html = html.replace(/<!--(?!@)[\s\S]*?-->/g, "");   /* drop authoring comments */
fs.writeFileSync(path.join(dir, "pj-home.html"), html);
cp.execFileSync(path.join(dir, "node_modules/.bin/tailwindcss"), ["-c", path.join(dir, "tailwind.config.js"), "-i", path.join(dir, "input.css"), "-o", path.join(root, "pj-home.css"), "--minify"], { stdio: "inherit", cwd: dir });
/* 3) put the finished home screen into index.html between the PJ-HOME markers */
const idx = path.join(root, "index.html"), page = fs.readFileSync(idx, "utf8"), a = page.indexOf("<!--PJ-HOME-START-->"), b = page.indexOf("<!--PJ-HOME-END-->");
if (a < 0 || b < 0) throw new Error("PJ-HOME markers not found in index.html");
fs.writeFileSync(idx, page.slice(0, a) + '<!--PJ-HOME-START--><template id="pjHomeTpl">' + html + "</template>" + page.slice(b));
console.log("pj-home.html", (html.length / 1024).toFixed(1) + " KB;  pj-home.css", (fs.statSync(path.join(root, "pj-home.css")).size / 1024).toFixed(1) + " KB");
