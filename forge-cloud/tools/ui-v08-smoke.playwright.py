from playwright.sync_api import sync_playwright
from pathlib import Path
import tempfile
import subprocess, json
app=Path(__file__).resolve().parents[1]
html=(app/'public/index.html').read_text().replace('<script type="module" src="/app.js"></script>','')
js=(app/'public/app.js').read_text(); css=(app/'public/style.css').read_text()
screens=app.parent/'PREVIEWS';screens.mkdir(exist_ok=True)
catalog_payload=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {INDUSTRIES,SERVICES} from './src/marketplace.mjs';console.log(JSON.stringify({industries:INDUSTRIES,services:SERVICES}))"],cwd=app,text=True))
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
 else if(p==='/api/catalog')value={industries:window.__forgeCatalog.industries};
 else if(p==='/api/services')value={services:window.__forgeCatalog.services};
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
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 errors=[]
 def page(role,width,height):
  q=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  q.on('pageerror',lambda err:errors.append(str(err)))
  q.set_content(html,wait_until='domcontentloaded');q.add_style_tag(content=css);q.evaluate(mock,role);q.evaluate('(payload)=>window.__forgeCatalog=payload',catalog_payload);q.add_script_tag(content=js,type='module')
  q.locator('.forge-hero').wait_for(timeout=10000);return q
 buyer=page('buyer',1440,900)
 assert buyer.locator('.forge-hero h2').inner_text()=='Less busywork.\nMore progress.'
 assert buyer.locator('.focus-tile').count()==3
 buyer.screenshot(path=str(screens/'v08-Customer-Home.png'),full_page=True)
 buyer.locator('[data-go="new"]').first.click();buyer.locator('#wizardNext').wait_for()
 buyer.locator('input[name=title]').fill('Write ten product descriptions')
 buyer.locator('textarea[name=description]').fill('Write ten detailed product descriptions for customer provided products.')
 buyer.locator('#wizardNext').click();buyer.locator('input[name=city]').fill('Newark');buyer.locator('input[name=skills]').fill('Writing, Editing')
 buyer.locator('#wizardNext').click();assert 'Write ten product descriptions' in buyer.locator('#missionReview').inner_text()
 buyer.screenshot(path=str(screens/'v08-Request.png'),full_page=True)
 buyer.locator('#wizardSubmit').click();buyer.locator('#missionResults').get_by_text('Write ten product descriptions').wait_for()
 buyer.locator('#nav [data-view=earn]').click();buyer.locator('.earn-card').first.wait_for(timeout=6000);assert buyer.locator('.earn-card').count()==8
 buyer.screenshot(path=str(screens/'v08-Earn.png'),full_page=True)
 buyer.locator('[data-template=product-copy]').click();assert buyer.locator('.forge-dialog').is_visible();assert 'no paid projects' in buyer.locator('.forge-dialog').inner_text().lower();buyer.locator('.forge-dialog button[type=submit]').click();buyer.locator('#missionForm').wait_for();assert buyer.locator('input[name=title]').input_value()=='Write product descriptions'
 buyer.locator('#nav [data-view=catalog]').click();buyer.locator('.catalog-card').first.wait_for(timeout=6000);assert buyer.locator('.catalog-card').count()==25
 buyer.locator('#catalogSearch').fill('nurs');assert buyer.locator('.catalog-card').count()==1
 assert 'Registered nurse' in buyer.locator('.catalog-card').inner_text()
 buyer.locator('#catalogSearch').fill('');buyer.locator('#catalogFilter').select_option('regulated');assert buyer.locator('.catalog-card').count()>5;buyer.locator('#catalogFilter').select_option('');buyer.screenshot(path=str(screens/'v08-Work-Catalog.png'),full_page=True)
 buyer.locator('#nav [data-view=jobs]').click();buyer.locator('#jobSearch').fill('customer');assert 'Customer Support Specialist' in buyer.locator('#jobResults').inner_text()
 worker=page('worker',1400,900)
 worker.screenshot(path=str(screens/'v08-Worker-Home.png'),full_page=True)
 worker.locator('.hero-cta').click();worker.locator('.earn-card').first.wait_for(timeout=6000);assert worker.locator('.earn-card').count()==8
 worker.locator('[data-go=worker]').first.click();worker.locator('#workerForm').wait_for()
 admin=page('admin',1200,900)
 admin.locator('.hero-cta').click();admin.locator('#inviteForm').wait_for()
 mobile=page('worker',390,844)
 mobile.screenshot(path=str(screens/'v08-Mobile-Home.png'),full_page=True)
 assert mobile.evaluate('document.documentElement.scrollWidth')<=390, 'Mobile horizontal overflow on home'
 mobile.locator('#nav [data-view=catalog]').click();mobile.locator('.catalog-card').first.wait_for()
 assert mobile.evaluate('document.documentElement.scrollWidth')<=390, 'Mobile catalog overflow'
 mobile.locator('#catalogSearch').fill('aviation');assert mobile.locator('.catalog-card').count()==1
 mobile.screenshot(path=str(screens/'v08-Mobile-Catalog.png'),full_page=True)
 print('Browser page errors:',errors);assert not errors
 browser.close()
print('All v0.8 browser smoke assertions passed. Screens:', screens)
