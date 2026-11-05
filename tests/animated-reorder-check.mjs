import { loadPlaywright } from "./playwright-runtime.mjs";
import {pathToFileURL} from 'node:url';
import {writeFileSync} from 'node:fs';
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});
const check=(v,m)=>{if(!v)throw Error(m);};
const results=[];
try{
  for(const [width,height] of [[375,812],[390,844],[430,932]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    await page.route('https://**/*',r=>r.abort());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5188/tests/mobile-reorder.html?many=1');
    await page.locator('[data-order-row]').first().waitFor();
    await page.getByLabel('记录 lunge').fill('13');
    const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('form-local-mobile-reorder-test')));
    const before=await stored();
    const handle=page.locator('[data-order-row="hold"] .exercise-drag-handle');await handle.scrollIntoViewIfNeeded();
    const start=await handle.boundingBox(),cardStart=await page.locator('[data-order-row="hold"]').boundingBox(),x=start.x+start.width/2,y=start.y+start.height/2;
    const cdp=await page.context().newCDPSession(page);
    const touch=async(type,dy)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y:dy}]});
    await touch('touchStart',y);await page.waitForTimeout(230);
    await page.locator('.exercise-drag-overlay').waitFor();
    await touch('touchMove',height-40);
    await page.waitForFunction(()=>scrollY>250,{},{timeout:5000});
    await page.waitForTimeout(350);
    check(await page.getByTestId('save-count').textContent()==='0','Drag persisted intermediate swaps');
    check(JSON.stringify(await stored())===JSON.stringify(before),'Dragging mutated persisted set data');
    const offset=()=>page.locator('.order-dragging').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);
    const down=await offset();
    check(down>250,'Cannot cross multiple cards');
    check(await page.locator('[data-order-row]').evaluateAll(rows=>rows.some(e=>!e.classList.contains('order-dragging')&&getComputedStyle(e).transform!=='none')),'Other cards did not make space');
    const overlay=await page.locator('.exercise-drag-overlay').boundingBox();check(Math.abs(overlay.y-(cardStart.y+height-40-y))<6,`Floating card not following finger (${overlay.y}px)`);
    await page.screenshot({path:`.validation/animated-drag-${width}.png`});
    await touch('touchMove',150);await page.waitForTimeout(220);const reverse=await offset();check(reverse<down,'Cannot reverse direction in the same gesture');
    await page.screenshot({path:`.validation/animated-drag-${width}-mid.png`});
    await touch('touchMove',height-40);await page.waitForTimeout(650);await touch('touchEnd');
    await page.waitForFunction(()=>document.querySelector('[data-testid="save-count"]').textContent==='1');
    const after=await stored();check(after.findIndex(r=>r.id==='hold')>=3,'Single gesture did not move across multiple rows');
    for(const row of before)check(JSON.stringify(after.find(r=>r.id===row.id).set)===JSON.stringify(row.set),'Set data lost');
    await page.reload();await page.locator('[data-order-row]').first().waitFor();
    check((await page.locator('[data-order-row]').evaluateAll(rows=>rows.map(r=>r.dataset.orderRow))).join(',')===after.map(r=>r.id).join(','),'Reload lost order');
    // Cancelled gestures restore the original order without a persistence call.
    await page.evaluate(()=>window.scrollTo(0,0));const b=await page.locator('.exercise-drag-handle').first().boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+22,y:b.y+22}]});await page.waitForTimeout(230);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+22,y:b.y+80}]});await touch('touchCancel');
    await page.waitForTimeout(180);check(await page.getByTestId('save-count').textContent()==='0','Cancelled drag persisted');check(await page.locator('.exercise-drag-overlay').count()===0,'Cancelled overlay remained');
    await page.emulateMedia({reducedMotion:'reduce'});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+22,y:b.y+22}]});await page.waitForTimeout(230);
    await page.locator('.exercise-order.is-sorting').waitFor();
    check(await page.locator('[data-order-row]').first().evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','Reduced motion not respected');
    await touch('touchCancel');
    check(errors.length===0,errors.join(';'));results.push({width,height,freeMultiRowDrag:true,reverseWithinGesture:true,floatingFollowsFinger:true,animatedShifts:true,continuousEdgeScroll:true,saveOnceOnDrop:true,setDataRetained:true,localReload:true,cancelSafe:true,reducedMotion:true});
    await page.close();
  }
  writeFileSync('.validation/animated-reorder-results.json',JSON.stringify(results,null,2));
  console.log('Animated native touch drag passed 375/390/430: multi-row movement, reversal, continuous scroll, floating/shifting cards, one save on drop, cancel/reload/set retention and reduced motion (local fixture, not iPhone/cloud).');
}finally{await browser.close();}
