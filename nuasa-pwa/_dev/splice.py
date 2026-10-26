import re
SITE='/home/claude/pjwork/site/'
src=open('/home/claude/nuasa/nuasa/index.html',encoding='utf8').read()   # always start from the pristine original
head=open('region_head.js',encoding='utf8').read(); tail=open('region_tail.js',encoding='utf8').read(); css=open('css_add.css',encoding='utf8').read()
home=open(SITE+'tools/pj-home.html',encoding='utf8').read()

# ---- 1. JS region: new head + Topic Generator (verbatim, two tiny edits) + new tail ----
a=src.index('/* ---------- Project AI Studio page ---------- */')
b=src.index('/* ---------- Home feed, file manager, offline files ---------- */')
region=src[a:b]
tg_a=region.index('/* ---------- Project Topic Generator ---------- */'); tg_b=region.index('function pjOpen()')
tg=region[tg_a:tg_b]
old1='const pt=$("#pjT");if(pt)PJ.form.topic=pt.value;tgRead();PJ.tab=to;pjRender();return}'
new1='pjReadForm();tgRead();PJ.tab=to;pjRender();return}'
old2='if(c("#pjToTopics")){const pt=$("#pjT");if(pt)PJ.form.topic=pt.value;PJ.tab="topics";pjRender();return}'
new2='if(c("#pjToTopics")){pjReadForm();PJ.tab="topics";pjRender();return}'
assert old1 in tg and old2 in tg
tg=tg.replace(old1,new1).replace(old2,new2)
assert 'PJ.form.words' not in tg and 'mdx(' not in tg, "topic generator still depends on removed code"
out=src[:a]+head+"\n"+tg+tail+"\n"+src[b:]

# ---- 2. CSS: append before the closing </style> of the app stylesheet ----
i=out.index('</style></head>') if '</style></head>' in out else out.index('</style>')
out=out[:i]+css+out[i:]

# ---- 3. <link> to the Tailwind file, in <head> before the first <style> ----
j=out.index('<style>')
out=out[:j]+'<link rel="stylesheet" href="/pj-home.css">\n'+out[j:]

# ---- 4. the home template, right after the overlay container ----
k='<div id="pjp" aria-label="Project AI Studio"></div>'
assert k in out
out=out.replace(k,k+'\n<!--PJ-HOME-START--><template id="pjHomeTpl">'+home+'</template><!--PJ-HOME-END-->',1)

# ---- 5. the two scripts, before the app script ----
m=out.index('<script>',out.index('tus.min.js'))
out=out[:m]+'<script src="/pj-study.js"></script>\n<script src="/pj-doc.js"></script>\n'+out[m:]
open(SITE+'index.html','w',encoding='utf8').write(out)
print("index.html:",len(src)//1024,"KB ->",len(out)//1024,"KB")

# ---- 6. service worker: new version, new static files cached one by one so a missing upload never blocks an update ----
sw=open('/home/claude/nuasa/nuasa/sw.js',encoding='utf8').read()
sw=sw.replace('const VERSION = "v13";','const VERSION = "v14";')
sw=sw.replace('self.addEventListener("install", e => {\n  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));\n});',
 'const EXTRA = ["/pj-home.css", "/pj-study.js", "/pj-doc.js"]; // Project AI files, cached one by one so a missing upload can never block an update\nself.addEventListener("install", e => {\n  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE).then(() => Promise.all(EXTRA.map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));\n});')
assert 'EXTRA' in sw and 'v14' in sw
open(SITE+'sw.js','w',encoding='utf8').write(sw)
print("sw.js updated")
