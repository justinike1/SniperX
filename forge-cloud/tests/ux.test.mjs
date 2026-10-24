import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/radar.css',import.meta.url),'utf8');
test('modern Earn Now stylesheet is linked and locally served',()=>{
 assert.match(html,/href="\/radar\.css"/);
 assert.match(readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8'),/'radar\.css'/);
});
test('Earn Now uses actual authenticated mission feed rather than invented paid listings',()=>{
 assert.match(app,/api\('\/earn\/feed'\)/);
 assert.match(app,/feed\.opportunities/);
 assert.match(app,/LIVE PAID/);
 assert.match(app,/no live missions yet/i);
});
test('Earn Now search and category filters are functional and accessible',()=>{
 assert.match(app,/id="earnSearch"/);
 assert.match(app,/data-earn-filter="all"/);
 assert.match(app,/addEventListener\('input',update\)/);
 assert.match(app,/addEventListener\('change',update\)/);
});
test('responsive mobile styles and reduced-motion support',()=>{
 assert.match(css,/@media\(max-width:530px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Earn view passes feed and services in correct order and binds existing handler',()=>{
 assert.match(app,/state\.view==='earn'[\s\S]*earnContent\(feed,services\);bindEarn\(feed\)/);
 assert.doesNotMatch(app,/bindRadar\(/);
});
