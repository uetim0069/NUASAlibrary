import asyncio, json, re, sys
from playwright.async_api import async_playwright
BASE="http://localhost:8770/"
STUB=open('/home/claude/pjwork/e2e_stubs.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':1280,'height':820}, accept_downloads=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.on('console', lambda m: errs.append('console.error '+m.text) if m.type=='error' else None)
        async def route(r):
            u=r.request.url
            if u.startswith(BASE): return await r.continue_()
            if u.endswith('supabase.js'): return await r.fulfill(body=STUB,content_type='application/javascript')
            await r.fulfill(status=200,body='',content_type='text/css' if 'css' in u else 'application/javascript' if u.endswith('.js') else 'text/plain')
        await ctx.route('**/*', route)
        await pg.goto(BASE); await pg.wait_for_timeout(1200)
        print("app booted; S defined:", await pg.evaluate("typeof S"), "| PJStudy:", await pg.evaluate("typeof PJStudy"), "| PJDoc:", await pg.evaluate("typeof PJDoc"))
        await pg.evaluate("S.user={id:'u1',email:'stu@uniuyo.edu.ng'}")
        # ---- opening animation: measure when the splash goes away ----
        ms=await pg.evaluate("""new Promise(r=>{const t0=performance.now();pjOpen();
            const seen={start:!!document.getElementById('pjSplash')};
            const iv=setInterval(()=>{if(!document.getElementById('pjSplash')){clearInterval(iv);r({ms:Math.round(performance.now()-t0),seen,ready:document.getElementById('pjHomeIn').dataset.ready})}},5)})""")
        print("SPLASH:", ms)
        await pg.wait_for_timeout(1800); await pg.screenshot(path='/home/claude/pjwork/e_home_desktop.png')
        # ---- real click on the hero CTA, then the setup form ----
        await pg.locator('#pjHome section button[data-pj="start"]').first.click(); await pg.wait_for_timeout(300)
        print("view after Get started:", await pg.evaluate("PJ.view"))
        await pg.fill('#pjT','Overhead costing and the profitability of broadcasting companies in Nigeria: a case study of AIT Port Harcourt')
        await pg.fill('#pjOrg','AIT Port Harcourt'); await pg.fill('#pjPop','65')
        await pg.click('[data-mt="survey"]')
        await pg.click('.pjDet summary'); await pg.fill('#pjDn','Jane Doe'); await pg.fill('#pjDr','20/AC/001'); await pg.fill('#pjDs','Prof. A. B. Udoh'); await pg.fill('#pjDm','October 2026')
        await pg.screenshot(path='/home/claude/pjwork/e_setup.png')
        await pg.click('#pjGo'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='/home/claude/pjwork/e_running.png')
        await pg.wait_for_function("pjAllDone()", timeout=180000)
        await pg.wait_for_timeout(500)
        st=await pg.evaluate("""({keys:Object.keys(PJ.parts),lens:Object.fromEntries(Object.entries(PJ.parts).map(([k,v])=>[k,v.length])),
           dash:Object.entries(PJ.parts).filter(([k,v])=>/[\\u2014\\u2013]/.test(v)).map(x=>x[0]),brace:Object.entries(PJ.parts).filter(([k,v])=>/\\{\\{/.test(v)).map(x=>x[0]),
           spaced:Object.entries(PJ.parts).filter(([k,v])=>/ - /.test(v)).map(x=>x[0]),yr:Object.entries(PJ.parts).filter(([k,v])=>/(19|20)\\d\\d-(19|20)\\d\\d/.test(v)).map(x=>x[0]),
           cites:pjCites().slice(0,6),ncites:pjCites().length,bp:PJ.bp&&PJ.bp.design,tables:(pjMarkup().match(/\\[\\[TB /g)||[]).length,run:PJ.run,err:PJ.err})""")
        print(json.dumps(st,indent=1))
        print("usage logged by server:", await pg.evaluate("fetch('/__usage').then(r=>r.json())"))
        await pg.screenshot(path='/home/claude/pjwork/e_work_top.png')
        for sid,name in (('c3','e_ch3'),('c4','e_ch4'),('c2b','e_ch2b')):
            await pg.evaluate(f"document.getElementById('pjs-{sid}').scrollIntoView()"); await pg.wait_for_timeout(250)
            await pg.screenshot(path=f'/home/claude/pjwork/{name}.png')
        # ---- Word export ----
        async with pg.expect_download() as dl: await pg.click('#pjDoc')
        d=await dl.value; await d.save_as('/home/claude/pjwork/e2e.docx'); print("downloaded:", d.suggested_filename)
        # ---- saved project + reopening via the home screen ----
        await pg.evaluate("pjClose()"); await pg.evaluate("pjOpen()"); await pg.wait_for_timeout(3300)
        shown=await pg.evaluate("!document.querySelector('[data-pj=continue]').classList.contains('tw-hidden')")
        print("Continue button visible on home:", shown)
        # ---- mobile ----
        m=await ctx.new_page(); await m.set_viewport_size({'width':390,'height':844})
        await m.goto(BASE); await m.wait_for_timeout(1000)
        await m.evaluate("S.user={id:'u1'}"); await m.evaluate("pjOpen()"); await m.wait_for_timeout(3600)
        await m.locator('#pjHome section button[data-pj="start"]').first.click(); await m.wait_for_timeout(300)
        await m.screenshot(path='/home/claude/pjwork/e_setup_mobile.png')
        print("ERRORS:", [e for e in errs if 'favicon' not in e][:8])
        await b.close()
asyncio.run(main())
