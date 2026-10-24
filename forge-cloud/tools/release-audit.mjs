/** Usage: FORGE_DB_PATH=./data/forge.sqlite node tools/release-audit.mjs */
import path from 'node:path';
import fs from 'node:fs';
import {openStore} from '../src/db.mjs';
import {launchReadiness} from '../src/reconcile.mjs';
const filepath=path.resolve(process.env.FORGE_DB_PATH||'data/forge.sqlite');
if(!fs.existsSync(filepath)){console.error(`No Forge database at ${filepath}; refusing to create an empty audit database.`);process.exit(2)}
const store=openStore(filepath);
try{
  const result=launchReadiness(store,{stripeTestConfigured:!!process.env.FORGE_STRIPE_TEST_SECRET_KEY?.startsWith('sk_test_')});
  console.log(JSON.stringify(result,null,2));
  if(!result.ledger.ok)process.exitCode=1;
}finally{store.close()}
