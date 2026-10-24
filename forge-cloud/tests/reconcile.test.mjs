import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openStore} from '../src/db.mjs';
import {auditSandboxLedger,launchReadiness} from '../src/reconcile.mjs';
import {splitPayment} from '../src/core.mjs';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forge-reconcile-test-'));
const store=openStore(path.join(dir,'test.sqlite'));
const uid=randomUUID(), buyer=randomUUID(), missionId=randomUUID();
const date=new Date().toISOString();
store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',uid,'worker@example.invalid','x','worker','Worker',date);
store.run('INSERT INTO users VALUES(?,?,?,?,?,?)',buyer,'buyer@example.invalid','x','buyer','Buyer',date);
const mission={id:missionId,status:'COMPLETED',buyerAccepted:true,workerUserId:uid,priceCents:10000,safetyHold:false};
store.run('INSERT INTO missions VALUES(?,?,?,?,?,?)',missionId,buyer,uid,JSON.stringify(mission),date,date);
const split=splitPayment(10000);
store.run('INSERT INTO sandbox_mission_funding VALUES(?,?,?,?,?,?,?,?)',missionId,10000,split.workerPayCents,split.platformFeeCents,'RELEASED',buyer,date,date);
store.run('INSERT INTO sandbox_wallet_ledger VALUES(?,?,?,?,?,?,?,?)',randomUUID(),uid,missionId,null,'MISSION_RELEASE',split.workerPayCents,'mission-release:'+missionId,date);
try{
  await test('a consistent funded completed mission reconciles but still has launch blockers',()=>{
    const r=auditSandboxLedger(store);assert.equal(r.ok,true,JSON.stringify(r.issues));
    const l=launchReadiness(store,{stripeTestConfigured:true});
    assert.equal(l.stripeTestConfigured,true);assert.equal(l.publicLaunchAllowed,false);assert.equal(l.realPayoutsEnabled,false);
    assert.ok(l.blockers.some(x=>x.id==='employment_law'));
  });
  await test('test checkout cannot become a worker balance',()=>{
    store.run('INSERT INTO stripe_test_checkout_sessions VALUES(?,?,?,?,?,?,?)',missionId,'cs_test_example','https://checkout.stripe.com/c/pay/cs_test_example',10000,'PAID_TEST',date,date);
    const r=auditSandboxLedger(store);
    assert.equal(r.ok,true);assert.equal(r.counts.testCheckoutSessions,1);
    assert.equal(store.one('SELECT COALESCE(SUM(amount_cents),0) AS cents FROM sandbox_wallet_ledger WHERE worker_user_id=?',uid).cents,split.workerPayCents);
  });
  await test('mismatched funding is flagged',()=>{
    store.run('UPDATE sandbox_mission_funding SET worker_cents=worker_cents-1 WHERE mission_id=?',missionId);
    const r=auditSandboxLedger(store);assert.equal(r.ok,false);
    assert.ok(r.issues.some(x=>x.code==='INCORRECT_SPLIT'));
    assert.ok(r.issues.some(x=>x.code==='MISSING_OR_WRONG_WORKER_CREDIT'));
    store.run('UPDATE sandbox_mission_funding SET worker_cents=? WHERE mission_id=?',split.workerPayCents,missionId);
  });
  await test('double-credit and missing payout refund are flagged',()=>{
    const duplicate=randomUUID();
    store.run('INSERT INTO sandbox_wallet_ledger VALUES(?,?,?,?,?,?,?,?)',duplicate,uid,missionId,null,'MISSION_RELEASE',split.workerPayCents,'extra:'+duplicate,date);
    assert.ok(auditSandboxLedger(store).issues.some(x=>x.code==='MISSING_OR_WRONG_WORKER_CREDIT'));
    store.run('DELETE FROM sandbox_wallet_ledger WHERE id=?',duplicate);
    const payoutId=randomUUID();
    store.run('INSERT INTO sandbox_payouts VALUES(?,?,?,?,?,?,?,?,?,?)',payoutId,uid,'reconcile-refund-key-00001','STANDARD',1000,0,1000,'FAILED_SIMULATED',date,date);
    store.run('INSERT INTO sandbox_wallet_ledger VALUES(?,?,?,?,?,?,?,?)',randomUUID(),uid,null,payoutId,'PAYOUT_RESERVED',-1000,'payout-reserve:'+payoutId,date);
    const r=auditSandboxLedger(store);assert.equal(r.ok,false);
    assert.ok(r.issues.some(x=>x.code==='FAILED_PAYOUT_NOT_RESTORED'));
    const l=launchReadiness(store);assert.equal(l.publicLaunchAllowed,false);assert.ok(l.blockers.some(x=>x.id==='sandbox_integrity'));
  });
}finally{store.close();fs.rmSync(dir,{recursive:true,force:true})}
