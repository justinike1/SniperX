#!/usr/bin/env python3
"""Safely integrate only SniperX Forge additions into existing GitHub-main checkout.
No deploy, payments, repo-root trading edits, push, or force updates.
"""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
PATCH=HERE/'FORGE_BACKEND_PATCH_FROM_MAIN.diff'
EXPECTED=json.loads((HERE/'assets/expected_git_main.json').read_text())

class HandoffError(RuntimeError): pass

def must_replace(text,old,new,count=1,description='replacement'):
    actual=text.count(old)
    if actual!=count:raise HandoffError(f'{description}: expected {count} exact match(es), found {actual}. Do NOT overwrite the existing UI; ask Cursor to reconcile this anchor.')
    return text.replace(old,new)

def integrate_ui(js,css):
    if 'function fastLaneContent(' in js or 'function walletContent(' in js or 'function quickPostForms(' in js:
        raise HandoffError('Forge UI features appear to be already installed. Do not install twice.')
    features=(HERE/'assets/forge_ui_features.js').read_text()
    styles=(HERE/'assets/forge_new_feature_styles.css').read_text()
    # Preserve all existing GitHub-main Earn Now HTML/CSS and inject our feature beneath its hero.
    old="const [feed,services]=await Promise.all([api('/earn/feed'),getServices()]);content.innerHTML=earnContent(feed,services);bindEarn(feed);bindServiceTemplates(services);"
    newer="const [feed,services,discovery]=await Promise.all([api('/earn/feed'),getServices(),api('/earn/discover?mode=ALL')]);content.innerHTML=earnTodayContent(feed,services,discovery);bindFastLane(discovery);bindEarn(feed);bindServiceTemplates(services);"
    js=must_replace(js,old,newer,2,'Earn Now rendering hooks')
    js=must_replace(js,"const [k,t,d]=titles[state.view];", "const [k,t,d]=state.view==='wallet'?['TEST WALLET','My test earnings','Simulated financial records only. No real money moves.']:titles[state.view];",1,'Wallet view heading')
    # New wallet view next to catalog; role-gated in applySession, server enforces role too.
    js=must_replace(js," }else if(state.view==='catalog'){",
     " }else if(state.view==='wallet'){\n  const wallet=await api('/wallet/me');content.innerHTML=walletContent(wallet);bindWallet(wallet);\n }else if(state.view==='catalog'){",1,'Wallet route')
    js=must_replace(js,
       "  content.innerHTML=state.user.role==='buyer'?missionForm():'<div class=\"notice\">Only buyer accounts may create service requests.</div>';\n  setupMissionWizard();",
       "  const intake=state.user.role==='buyer'?await api('/earn/shift-intakes'):null;\n  content.innerHTML=state.user.role==='buyer'?quickPostForms(intake?.intakes||[]):'<div class=\"notice\">Only buyer accounts may create service requests.</div>';\n  setupQuickPost();\n  setupMissionWizard();",1,'Buyer quick-post UI')
    # Keep mobile tab highlight in sync with the current view and close More menu after navigation.
    js=must_replace(js,
      " state.view=view;\n document.querySelectorAll('[data-view]').forEach(",
      " state.view=view;\n document.querySelectorAll('[data-mobile-view]').forEach(x=>{const active=x.dataset.mobileView===view;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current')});\n $('sidebar').classList.remove('nav-expanded');\n document.querySelectorAll('[data-view]').forEach(",1,'Mobile navigation state synchronization')
    # Turn on mobile dock only for authenticated users, and hide sensitive role paths.
    js=must_replace(js,"$('signout').hidden=!r.authenticated;",
      "$('signout').hidden=!r.authenticated;$('mobileDock').hidden=!r.authenticated;",1,'Mobile dock session visibility')
    js=must_replace(js,"(x.dataset.view==='admin'&&r.user?.role!=='admin');",
      "(x.dataset.view==='admin'&&r.user?.role!=='admin')||(x.dataset.view==='wallet'&&r.user?.role!=='worker');",1,'Wallet authorization UI')
    js=must_replace(js,"});}\n$('login').addEventListener('submit'",
      "});document.querySelectorAll('[data-mobile-view]').forEach(x=>{x.hidden=(x.dataset.mobileView==='new'&&r.user?.role!=='buyer')||(x.dataset.mobileView==='worker'&&r.user?.role!=='worker')||(x.dataset.mobileView==='wallet'&&r.user?.role!=='worker');x.classList.toggle('active',x.dataset.mobileView===state.view)});}\n$('login').addEventListener('submit'",1,'Mobile dock role filtering')
    js=must_replace(js,
      "try{const r=await api('/session');applySession(r);if(r.authenticated)await render()}",
      "document.querySelectorAll('[data-mobile-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.mobileView)));\n$('mobileMore').addEventListener('click',()=>{$('sidebar').classList.toggle('nav-expanded')});\ntry{const r=await api('/session');applySession(r);if(r.authenticated)await render()}",1,'Mobile dock event bindings')
    js=js.rstrip()+"\n\n"+features
    css=css.rstrip()+"\n\n/* SniperX Forge additive features: existing Earn Now design preserved above. */\n"+styles
    return js,css

def git(cwd,*args,check=True):
    return subprocess.run(['git',*args],cwd=cwd,check=check,capture_output=True,text=True)

def preflight(repo,older_ui=False):
    if not (repo/'.git').exists() and git(repo,'rev-parse','--is-inside-work-tree',check=False).returncode!=0:
        raise HandoffError('Open Cursor on the cloned SniperX Git repository root before installing.')
    root=Path(git(repo,'rev-parse','--show-toplevel').stdout.strip()).resolve()
    if root!=repo:raise HandoffError(f'--repo must be the exact Git repository root (actual root: {root})')
    dirty=git(repo,'status','--porcelain','--','forge-cloud').stdout.strip()
    if dirty:raise HandoffError('Forge files already have changes. Commit/stash those first; this installer will not overwrite them.')
    for filename,expected in EXPECTED.items():
        if older_ui and filename in {'forge-cloud/public/app.js','forge-cloud/public/radar.css'}:continue
        current=git(repo,'hash-object',filename).stdout.strip()
        if current!=expected:
            raise HandoffError(f'{filename} changed from the audited GitHub main version. Expected {expected}, found {current}. Stop and reconcile; do not blindly apply.')
    checked=subprocess.run(['git','apply','--check',str(PATCH)],cwd=repo,capture_output=True,text=True)
    if checked.returncode:raise HandoffError('Backend patch preflight failed:\n'+checked.stderr)
    js=(repo/'forge-cloud/public/app.js').read_text()
    css=(repo/'forge-cloud/public/radar.css').read_text()
    out_js,out_css=integrate_ui(js,css)  # Will fail before changes if any incompatible UI anchors.
    if out_js==js or out_css==css:raise HandoffError('UI integration unexpectedly did not change files.')
    return out_js,out_css

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--repo',required=True,help='Cloned GitHub repository root')
    ap.add_argument('--apply',action='store_true',help='Actually apply changes after complete preflight')
    ap.add_argument('--test-older-ui',action='store_true',help=argparse.SUPPRESS)
    args=ap.parse_args();repo=Path(args.repo).resolve()
    try:
        js,css=preflight(repo,args.test_older_ui)
        if not args.apply:
            print('PASS: repository hashes, backend patch, and latest-UI integration anchors. No files changed.')
            print('To apply, create a fresh branch then rerun with --apply.')
            return
        subprocess.run(['git','apply',str(PATCH)],cwd=repo,check=True)
        (repo/'forge-cloud/public/app.js').write_text(js)
        (repo/'forge-cloud/public/radar.css').write_text(css)
        print('PASS: Forge-only code applied. Not committed or pushed. No real payments or deployments.')
        print('NEXT: cd forge-cloud && npm run check && npm test')
        print('NEXT: review git diff --check and manually test mobile, desktop and role-based flows.')
    except (HandoffError,subprocess.CalledProcessError,FileNotFoundError) as exc:
        print('STOP: '+str(exc),file=sys.stderr);sys.exit(1)
if __name__=='__main__':main()
