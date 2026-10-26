#!/usr/bin/env python3
"""Guarded Forge v1.1 patch preflight + apply. Does not commit, push, or deploy.
Usage: python3 install_v11.py --repo /path/to/SniperX [--apply]
"""
import argparse, hashlib, pathlib, subprocess, sys

EXPECTED = {
    'forge-cloud/package.json':'dc2652dc56be1de841e293bb8ac51e9f9fe951a0',
    'forge-cloud/src/db.mjs':'7bbb016ecc615f7e2f69a53ec130a79faabf1239',
    'forge-cloud/src/handlers.mjs':'80a7d389ef19a5306bb9b37927c6b7d3cd0a206d',
    'forge-cloud/src/server.mjs':'794f21c02f2348dea4bf9cd9345d4c949ad7a1c3',
}
ADDED = [
    'forge-cloud/src/stripe_test.mjs','forge-cloud/src/reconcile.mjs',
    'forge-cloud/tests/stripe-test.test.mjs','forge-cloud/tests/reconcile.test.mjs',
    'forge-cloud/tools/release-audit.mjs','forge-cloud/docs/STRIPE_TEST_PILOT.md',
]

def run(*args,cwd):
    result=subprocess.run(args,cwd=cwd,text=True,capture_output=True)
    if result.returncode:
        print(result.stdout,result.stderr,file=sys.stderr)
        raise SystemExit(f'Preflight stopped: {" ".join(args)}')
    return result.stdout.strip()

def blob_sha(content):
    return hashlib.sha1(f'blob {len(content)}\0'.encode()+content).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo',required=True)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    repo=pathlib.Path(args.repo).expanduser().resolve()
    patch=pathlib.Path(__file__).with_name('FORGE_V11_PILOT_PATCH_FROM_MAIN.diff')
    if not patch.is_file():raise SystemExit('Missing patch file beside installer')
    if run('git','rev-parse','--show-toplevel',cwd=repo)!=str(repo):raise SystemExit('--repo must be the Git repository root')
    if run('git','status','--porcelain','--','forge-cloud',cwd=repo):raise SystemExit('STOP: forge-cloud has uncommitted changes')
    if run('git','branch','--show-current',cwd=repo)=='':raise SystemExit('STOP: detached HEAD')
    for filename,expected in EXPECTED.items():
        path=repo/filename
        if not path.is_file() or blob_sha(path.read_bytes())!=expected:
            raise SystemExit(f'STOP: unexpected GitHub version of {filename}; do not overwrite or force')
    for filename in ADDED:
        if (repo/filename).exists():raise SystemExit(f'STOP: added file already exists: {filename}')
    run('git','apply','--check',str(patch),cwd=repo)
    print('PASS: clean Forge workspace, exact audited backend hashes, no duplicate additions, patch applies cleanly')
    if args.apply:
        run('git','apply',str(patch),cwd=repo)
        run('git','diff','--check',cwd=repo)
        print('APPLIED: scoped patch; run npm run check and npm test from forge-cloud. No commit, push or deploy was made.')
    else:print('DRY RUN: no files changed. Use --apply on a new feature branch after review.')

if __name__=='__main__':main()
