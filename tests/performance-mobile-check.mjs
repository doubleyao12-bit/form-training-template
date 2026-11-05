import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});mkdirSync('.validation',{recursive:true});
const results=[];const assert=(v,m)=>{if(!v)throw Error(m);};
try{for(const [width,height] of [[375,812],[390,844],[430,932],[1280,900]]){for(const mode of ['strength','reps','duration','breaths','multi','empty','one','many']){
const page=await browser.newPage({viewport:{width,height},isMobile:width<700,hasTouch:width<700});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
await page.goto(`http://localhost:5188/tests/performance-fixture.html?mode=${mode}`);await page.waitForSelector('.performance-page');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${mode} overflow`);
const title=await page.locator('h1').boundingBox();assert(title.width>200&&title.height<160,`${mode} collapsed title`);
assert(await page.locator('.performance-summary,.performance-recent').count()===0,'redundant content removed');
if(mode==='empty'){assert(await page.locator('svg').count()===0,'empty chart');assert(await page.getByText('还没有训练记录').count()===1,'empty explanation');}
else if(mode==='one'){assert(await page.locator('svg').count()===0,'one-session misleading trend');assert(await page.getByText('当前表现 · 仅 1 次训练').count()===1,'one-session state');}
else{
const svg=await page.locator('svg').boundingBox();assert(svg.width<=width&&svg.y<height,`${mode} chart not in first screen`);
const point=page.locator('.performance-point-target').first();await point.focus();await page.keyboard.press('Enter');assert((await page.locator('.performance-point-detail').innerText()).includes('恢复训练'),'point keyboard detail');
const marker=await page.locator('.performance-point').first().boundingBox();if(width<700)await page.touchscreen.tap(marker.x+marker.width/2,marker.y+marker.height/2);else await page.mouse.click(marker.x+marker.width/2,marker.y+marker.height/2);
assert((await page.locator('.performance-point-detail').innerText()).includes('恢复训练'),'point touch detail');
for(const window of ['4W','8W','6M','ALL']){await page.getByRole('button',{name:window,exact:true}).click();assert(await page.getByRole('button',{name:window,exact:true}).getAttribute('aria-pressed')==='true','window');}
if(mode==='multi'||mode==='reps'){const selectors=page.locator('.performance-metrics button');assert(await selectors.count()===2,'metric contexts');await selectors.nth(1).click();assert(await selectors.nth(1).getAttribute('aria-pressed')==='true','metric switch');}
if(mode==='breaths'){assert(await page.locator('polyline').count()===0,'breaths no progression line');assert(await page.locator('.performance-records').count()===0,'breaths no PR');}
assert(await page.locator('.performance-last tbody tr').count()===(mode==='multi'||mode==='reps'?2:mode==='strength'||mode==='many'?3:1),'all sets from latest instance');
await page.getByRole('button',{name:'查看本次训练 ↗'}).click();assert(await page.evaluate(()=>Boolean(document.body.dataset.session)),'existing History callback');
}
await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));const last=page.locator('.performance-records').last();if(await last.count()){const r=await last.boundingBox();const nav=await page.locator('.mobile-nav').boundingBox();if(nav)assert(r.y+r.height<=nav.y,'bottom navigation overlap');}
await page.screenshot({path:`.validation/performance-${mode}-${width}.png`,fullPage:true});assert(errors.length===0,errors.join(';'));results.push({width,height,mode,pass:true});await page.close();
}}writeFileSync('.validation/performance-mobile-results.json',JSON.stringify(results,null,2));console.log('32 rendered viewport/state checks passed; contexts, windows, point touch/keyboard, empty/one, breaths, History callback and nav clearance.');}finally{await browser.close();}
