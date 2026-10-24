from playwright.sync_api import sync_playwright
from pathlib import Path
import os
import shutil
import tempfile
app=Path(__file__).resolve().parents[1]
html=(app/'public/index.html').read_text().replace('<script type="module" src="/app.js"></script>','')
js=(app/'public/app.js').read_text()
css=(app/'public/style.css').read_text()
screens=Path(tempfile.mkdtemp(prefix='forge-ui-preview-'))
mock='''(role)=>{
 window.__forgeMock={role,missions:[],jobs:[{id:'a',source:'GREENHOUSE',title:'Customer Support Specialist',employer:'Sample Employer (test)',location:'Newark, NJ',lastVerifiedAt:'2026-10-24T08:00:00Z',applyURL:'https://boards.greenhouse.io/example/jobs/123'}]};
 window.fetch=async (input, options={})=>{
 const p=String(input),m=options.method||'GET',f=window.__forgeMock;
 let value={};
 if(p==='/api/session')value={authenticated:true,user:{id:'testuser',email:'test@example.invalid',role:f.role,displayName:'Test Person'},csrf:'synthetic-for-ux-test'};
 else if(p==='/api/admin/overview')value={summary:{totalMissions:0,participants:0,safetyHolds:0,completedGrossCents:0,workerPayCents:0},intelligence:{uncoveredCount:0,skillGaps:[]}};
 else if(p==='/api/missions'&&m==='GET')value={missions:f.missions};
 else if(p==='/api/missions'&&m==='POST'){const x=JSON.parse(options.body);f.missions.unshift({id:'new-mission-1',status:'NEW',safetyHold:false,priceCents:Math.round(x.priceUSD*100),...x});value={mission:f.missions[0]}}
 else if(p==='/api/jobs')value={jobs:f.jobs};
 else if(p==='/api/admin/workers')value={workers:[]};
 else if(p==='/api/admin/audit')value={events:[]};
 else if(p==='/api/admin/verification/cases')value={cases:[]};
 else if(p==='/api/verification/me')value={cases:[]};
 else if(p==='/api/verification/me/eligibility')value={eligibleForRegulatedWork:false,reasons:['No real verification is available']};
 else if(p==='/api/workers/me')value={worker:null};
 else if(p==='/api/auth/logout')value={ok:true};
 else if(p==='/api/admin/invitations')value={email:'invited@example.invalid',role:'buyer',invitation:'synthetic-only'};
 else if(p==='/api/admin/jobs/refresh')value={count:1,configuredSources:1};
 else throw new Error('Unmocked path: '+p+' method '+m);
 return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 };
}'''
with sync_playwright() as p:
 def browser_path():
  configured=os.getenv('FORGE_BROWSER_EXECUTABLE')
  if configured and Path(configured).exists():
   return configured
  for candidate in ('/usr/bin/chromium','/usr/bin/chromium-browser','/usr/local/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/google-chrome'):
   if Path(candidate).exists():
    return candidate
  return shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('google-chrome-stable')
 launch_opts={'headless':True,'args':['--no-sandbox']}
 if browser_path():
  launch_opts['executable_path']=browser_path()
 browser=p.chromium.launch(**launch_opts)
 errors=[]
 def make_page(role,width,height):
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  page.on('pageerror',lambda err: errors.append(str(err)))
  page.set_content(html,wait_until='domcontentloaded')
  page.add_style_tag(content=css)
  page.evaluate(mock,role)
  page.add_script_tag(content=js,type="module")
  return page
 buyer=make_page('buyer',1400,900)
 buyer.locator('#viewtitle').wait_for(state='attached',timeout=10000)
 assert buyer.locator('#viewtitle').inner_text()=='Your workspace'
 assert buyer.locator('.focus-tile').count()==3
 buyer.screenshot(path=f'{screens}/SniperX-Forge-v07-Customer-Home.png',full_page=True)
 buyer.locator('[data-go="new"]').first.click()
 assert buyer.locator('#stepName').inner_text()=='Step 1 of 3'
 buyer.locator('#wizardNext').click()
 assert buyer.locator('#stepName').inner_text()=='Step 1 of 3','incomplete wizard must not advance'
 buyer.locator('input[name="title"]').fill('Write ten product descriptions')
 buyer.locator('textarea[name="description"]').fill('Write ten descriptive product descriptions for customer provided merchandise.')
 buyer.locator('#wizardNext').click()
 assert buyer.locator('#stepName').inner_text()=='Step 2 of 3'
 buyer.locator('input[name="city"]').fill('Newark')
 buyer.locator('input[name="skills"]').fill('Writing, Editing')
 buyer.locator('#wizardNext').click()
 assert buyer.locator('#stepName').inner_text()=='Step 3 of 3'
 assert 'Write ten product descriptions' in buyer.locator('#missionReview').inner_text()
 buyer.screenshot(path=f'{screens}/SniperX-Forge-v07-Request-Wizard.png',full_page=True)
 buyer.locator('#wizardBack').click()
 assert buyer.locator('#stepName').inner_text()=='Step 2 of 3'
 buyer.locator('#wizardNext').click()
 buyer.locator('#wizardSubmit').click()
 buyer.locator('#missionResults').get_by_text('Write ten product descriptions').wait_for()
 buyer.locator('#missionSearch').fill('nothing-xyz')
 assert 'No projects found' in buyer.locator('#missionResults').inner_text()
 buyer.locator('#missionSearch').fill('product descriptions')
 assert 'Write ten product descriptions' in buyer.locator('#missionResults').inner_text()
 buyer.locator('#nav button[data-view="jobs"]').click()
 buyer.locator('#jobSearch').fill('customer')
 assert 'Customer Support Specialist' in buyer.locator('#jobResults').inner_text()
 buyer.locator('#jobSearch').fill('unmatched')
 assert 'No matching jobs' in buyer.locator('#jobResults').inner_text()
 buyer.locator('#clearJobFilters').click()
 assert 'Customer Support Specialist' in buyer.locator('#jobResults').inner_text()
 buyer.screenshot(path=f'{screens}/SniperX-Forge-v07-Jobs-Browser.png',full_page=True)
 # Admin modal review rendered with native dialog, no blocking JS prompt.
 admin=make_page('admin',1365,850)
 admin.locator('[data-go="admin"]').first.click()
 admin.locator('#inviteForm').wait_for()
 admin.screenshot(path=f'{screens}/SniperX-Forge-v07-Admin-Workspace.png',full_page=True)
 # Worker onboarding remains available.
 worker=make_page('worker',1000,800)
 worker.locator('#nav button[data-view="worker"]').click()
 worker.locator('#workerForm').wait_for()
 # Mobile nav scroll contained and tap targets usable.
 mobile=make_page('buyer',390,844)
 mobile.screenshot(path=f'{screens}/SniperX-Forge-v07-Mobile-Home.png',full_page=True)
 width=mobile.evaluate('document.documentElement.scrollWidth')
 print('mobile content width',width)
 assert width<=390,f'Mobile horizontal overflow: {width}'
 assert mobile.locator('#nav').is_visible()
 mobile.locator('#nav [data-view=jobs]').click()
 mobile.locator('#jobSearch').wait_for()
 mobile.screenshot(path=f'{screens}/SniperX-Forge-v07-Mobile-Jobs.png',full_page=True)
 print('Browser errors',errors)
 assert not errors
 browser.close()
print('UI BROWSER SMOKE TESTS PASSED')
print('Synthetic screenshot files:', screens)
