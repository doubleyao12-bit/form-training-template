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
    await page.goto('http://127.0.0.1:5188/tests/mobile-reorder.html');
    await page.locator('[data-order-row]').first().waitFor({timeout:10000}).catch(cause=>{throw Error(`${cause.message}; page errors: ${errors.join(';')}`);});
    const ids=()=>page.locator('[data-order-row]').evaluateAll(rows=>rows.map(r=>r.dataset.orderRow));
    const before=await ids();
    await page.getByRole('link',{name:'动作教程 ↗'}).first().tap();
    check(await page.getByTestId('action').textContent()==='tutorial','Tutorial action unusable');
    await page.getByRole('button',{name:'更换动作'}).first().tap();
    check(await page.getByTestId('action').textContent()==='replacement','Replacement action unusable');
    await page.getByLabel('记录 lunge').fill('13');
    check(JSON.stringify(await ids())===JSON.stringify(before),'Editing set accidentally reordered');
    const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('form-local-mobile-reorder-test')));
    const handle=page.locator('[data-order-row="hold"] .exercise-drag-handle');
    await handle.scrollIntoViewIfNeeded();
    const start=await handle.boundingBox(),target=await page.locator('[data-order-row="lunge"]').boundingBox();
    const cdp=await page.context().newCDPSession(page);
    const x=start.x+start.width/2,y=start.y+start.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await page.waitForTimeout(230);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:target.y+Math.min(50,target.height/2)}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('[data-order-row]').dataset.orderRow==='lunge');
    const ordered=await ids();
    check(ordered.join(',')==='lunge,hold,walk,breath','Native touch handle reorder failed');
    await page.reload();await page.locator('[data-order-row]').first().waitFor();
    check(JSON.stringify(await ids())===JSON.stringify(ordered),'Local fixture reload lost order');
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('form-local-mobile-reorder-test')));
    for(const row of savedBefore)check(JSON.stringify(after.find(r=>r.id===row.id).set)===JSON.stringify(row.set),'Entered/completed/measurement set data changed');
    await page.locator('.exercise-drag-handle').first().focus();await page.keyboard.press('ArrowDown');
    await page.waitForFunction(()=>document.querySelector('[data-order-row]').dataset.orderRow==='hold');
    check(errors.length===0,`Browser errors: ${errors.join(';')}`);
    results.push({width,height,nativeTouchReorder:true,actionsUsable:true,inputDoesNotDrag:true,localReloadRetained:true,setDataRetained:true,keyboardReorder:true,errors});
    await page.close();
  }
  writeFileSync('.validation/mobile-reorder-results.json',JSON.stringify(results,null,2));
  console.log('Actual ExerciseOrder native touch and keyboard regression passed at 375/390/430; local fixture order reload and entered/completed/measurement values retained. Not an iPhone or new cloud acceptance claim.');
}finally{await browser.close();}
