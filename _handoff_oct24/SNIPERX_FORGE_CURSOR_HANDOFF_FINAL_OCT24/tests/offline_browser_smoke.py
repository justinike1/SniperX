"""Offline mocked-network browser smoke for Forge handoff. NOT a payment/production test."""
import asyncio,json,pathlib,sys
from playwright.async_api import async_playwright
BASE=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else pathlib.Path('/mnt/data/SniperX-Forge-Earn-Today-Engine/forge-cloud/public')
OUT=pathlib.Path(__file__).resolve().parent
html=(BASE/'index.html').read_text().replace('<script type="module" src="/app.js"></script>','')
js=(BASE/'app.js').read_text()
css=(BASE/'style.css').read_text()+'\n'+(BASE/'radar.css').read_text()
async def smoke(role,device,width,height):
 errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  ctx=await browser.new_context(viewport={'width':width,'height':height},is_mobile=(device=='mobile'),has_touch=(device=='mobile'))
  page=await ctx.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await page.set_content(html,wait_until='domcontentloaded')
   await page.add_style_tag(content=css)
   stub=r'''(role)=>{window.fetch=async(url,opts={})=>{const k=String(url).replace(/^\/api/,'').split('?')[0];const z={
 '/session':{authenticated:true,user:{id:'stub-'+role,role,displayName:'Test '+role,email:'fake@example.invalid'},csrf:'local-csrf'},
 '/earn/feed':{opportunities:[],mode:'DEMONSTRATION_ONLY',realListings:0,livePayments:false,realDispatch:false},
 '/earn/discover':{mode:'ALL',missions:[],careers:[],workerAvailability:{active:false},inventory:{simulatedMissions:0,sourcedCareerAds:0,paidToday:0},guarantees:{sameDayStart:false,sameDayPayment:false}},
 '/services':{services:[],realOrdersAccepted:false},
 '/wallet/me':{mode:'SIMULATED_TEST_FUNDS',balanceCents:0,currency:'usd',ledger:[],payouts:[],realPayoutsEnabled:false},
 '/earn/shift-intakes':{intakes:[],livePlacements:0},
 '/catalog':{industries:[]},
 '/missions':{missions:[]},
 '/workers/me':{worker:null},
 '/jobs':{jobs:[]},
 '/admin/overview':{summary:{totalMissions:0,participants:0,safetyHolds:0,completedGrossCents:0,workerPayCents:0},intelligence:{uncoveredCount:0,skillGaps:[]}}
}; const item=z[k];return {ok:!!item,status:item?200:404,json:async()=>item||{error:'Not mocked: '+k}}}}'''
   await page.evaluate(stub,role)
   await page.add_script_tag(type='module',content=js)
   await page.wait_for_selector('#dashboard:not([hidden])',timeout=7000)
   if device=='mobile':
    await page.wait_for_selector('#mobileDock:not([hidden])',timeout=7000)
    assert await page.locator('#mobileDock').is_visible(),'Mobile dock hidden'
    await page.locator('#mobileDock [data-mobile-view="earn"]').click()
   else:await page.locator('#nav [data-view="earn"]').click()
   await page.wait_for_selector('.fast-lane',timeout=7000)
   assert '0 verified paid-today missions' in (await page.locator('#fastStat').inner_text()).lower()
   assert await page.locator('[data-fast-mode="CAREERS"]').is_visible()
   await page.locator('[data-fast-mode="CAREERS"]').click()
   assert 'No sourced career listings' in (await page.locator('#fastResults').inner_text())
   if role=='worker':
    if device=='mobile':await page.locator('#mobileDock [data-mobile-view="wallet"]').click()
    else:await page.locator('#nav [data-view="wallet"]').click()
    await page.wait_for_selector('#walletForm',timeout=7000)
    assert await page.locator('#walletPayoutButton').is_disabled()
    if device=='mobile':assert await page.locator('#mobileDock [data-mobile-view="wallet"].active').is_visible()
    assert 'simulated' in (await page.locator('.wallet-page').inner_text()).lower()
   elif role=='buyer':
    if device=='mobile':await page.locator('#mobileDock [data-mobile-view="new"]').click()
    else:await page.locator('#nav [data-view="new"]').click()
    await page.wait_for_selector('#quickProjectForm',timeout=7000)
    assert await page.locator('#quickProjectForm').is_visible()
    if device=='mobile':assert await page.locator('#mobileDock [data-mobile-view="new"].active').is_visible()
    await page.locator('[data-intake-mode="SHIFT"]').click()
    assert await page.locator('#quickShiftForm').is_visible()
    assert not await page.locator('#quickProjectForm').is_visible()
   size=await page.evaluate('({viewport:window.innerWidth,scroll:document.documentElement.scrollWidth})')
   assert size['scroll']<=size['viewport']+2,str(size)
   assert not errors,str(errors)
   await page.screenshot(path=str(OUT/f'smoke-{role}-{device}.png'),full_page=True)
   return {'device':device,'role':role,'status':'PASS','scope':'Mocked browser JS and CSS, no real HTTP/payment','noPageErrors':True,'noHorizontalOverflow':True}
  finally:await ctx.close();await browser.close()
async def main():
 result=[]
 for role in ['worker','buyer']:
  for name,width,height in [('desktop',1440,900),('mobile',390,844)]:
   try:
    x=await smoke(role,name,width,height);result.append(x);print('PASS',role,name)
   except Exception as e:
    result.append({'role':role,'device':name,'status':'FAIL','error':repr(e)});print('FAIL',role,name,str(e)[:400])
 (OUT/'browser-smoke-results.json').write_text(json.dumps(result,indent=2))
 if any(x['status']!='PASS' for x in result):raise SystemExit(1)
asyncio.run(main())
