import asyncio
from playwright.async_api import async_playwright
BASE="http://localhost:8770/"; STUB=open('/home/claude/pjwork/e2e_stubs.js').read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, service_workers='block')
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        async def route(r):
            u=r.request.url
            if u.startswith(BASE): return await r.continue_()
            if u.endswith('supabase.js'): return await r.fulfill(body=STUB,content_type='application/javascript')
            await r.fulfill(status=200,body='',content_type='text/plain')
        await ctx.route('**/*', route)
        await pg.goto(BASE); await pg.wait_for_timeout(1200)
        await pg.evaluate("S.user={id:'u1'}"); await pg.evaluate("pjOpen()"); 
        await pg.wait_for_timeout(500); await pg.screenshot(path='/home/claude/pjwork/m_splash.png')
        await pg.wait_for_timeout(3000)
        print("view:",await pg.evaluate("PJ.view"),"| pjp class:",await pg.evaluate("document.getElementById('pjp').className"),"| has home:",await pg.evaluate("!!document.getElementById('pjHomeIn')"),"| ready:",await pg.evaluate("document.getElementById('pjHomeIn')&&document.getElementById('pjHomeIn').dataset.ready"))
        await pg.wait_for_timeout(1500); await pg.screenshot(path='/home/claude/pjwork/m_home.png')
        await pg.locator('#pjHome section button[data-pj="start"]').first.click(); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/pjwork/m_setup.png', full_page=False)
        print("errors:",errs)
        await b.close()
asyncio.run(main())
