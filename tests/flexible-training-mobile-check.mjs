import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});mkdirSync('.validation',{recursive:true});
const check=(v,m)=>{if(!v)throw new Error(m);};
try{for(const [width,height] of [[375,812],[390,844],[430,932],[1440,1000]]){for(const mode of ['library','plan','carry','today']){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<500,isMobile:width<500});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:5203/tests/flexible-training-fixture.html?mode=${mode}`;await page.goto(url);
  if(mode==='library'){
    for(const q of ['罗马尼亚','Romanian','史密斯','深蹲']){await page.getByLabel('搜索动作').fill(q);await page.locator('.search-results article').first().waitFor({state:'visible'});check(await page.locator('.search-results details').count()===0,'Search results hidden in disclosure');}
    await page.getByLabel('搜索动作').fill('不存在的动作zz');await page.getByText('没有匹配动作').waitFor();await page.getByRole('button',{name:'清除搜索'}).last().click();await page.getByText('按动作模式找',{exact:true}).waitFor();
  }else if(mode==='plan'){
    await page.locator('.plan-editor-session>summary').click();
    await page.getByRole('button',{name:'＋ 增加动作'}).click();await page.getByLabel('搜索具体动作').fill('Push-Up');
    await page.locator('.replacement-option').filter({hasText:'俯卧撑'}).first().click();check(await page.locator('.plan-editor-intent').count()===4,'Plan add failed');
    await page.locator('.plan-intent-toolbar').first().getByRole('combobox').selectOption('anchor');
    await page.locator('.plan-editor-intent').first().getByRole('button',{name:'删除',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();check(await page.locator('.plan-editor-intent').count()===3,'Confirmed delete failed');
    const firstTitle=await page.locator('.plan-replace-trigger').first().textContent();await page.locator('.exercise-drag-handle').first().press('ArrowDown');await page.waitForTimeout(200);check(await page.locator('.plan-replace-trigger').first().textContent()!==firstTitle,'Plan reorder failed');
    await page.getByRole('button',{name:'保存到原计划'}).click();check(await page.getByTestId('saved-count').textContent()==='3','Plan save count wrong');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fixture-v23-plan')));check(new Set(saved.sessions[0].intents.map(i=>i.defaultVariationId)).size===3,`Plan reorder duplicated actions: ${JSON.stringify(saved.sessions[0].intents)}`);await page.reload();await page.locator('.plan-editor-session>summary').click();check(await page.locator('.plan-editor-intent').count()===3,'Plan reload failed');
  }else if(mode==='carry'){
    const candidate=page.locator('.replacement-options .replacement-option').filter({hasText:'单侧负重行走'}).first();
    const choices=page.locator('.replacement-options .replacement-option');check(await choices.count()>0,'Carry candidates missing');check(await choices.first().isEnabled(),'Carry choice disabled');await choices.first().click();check((await page.getByTestId('selection').textContent()).includes('workout'),'Temporary scope missing');
    await page.reload();await page.getByLabel('设为今后默认').check();await page.getByRole('button',{name:'浏览完整动作库 →'}).click();await page.getByLabel('搜索具体动作').fill('杠铃后蹲');await page.locator('.replacement-options .replacement-option').first().click();await page.getByLabel('目标次数').fill('8');await page.getByRole('button',{name:'确认调整并替换'}).click();const selected=await page.getByTestId('selection').textContent();check(selected.includes('"mode":"reps"')&&selected.includes('"scope":"plan"'),'Measurement adjustment/scope missing');
  }else{
    const checks=page.locator('.warmup-check');await checks.first().click();await page.waitForFunction(()=>document.querySelector('.warmup-check')?.getAttribute('aria-pressed')==='true');await page.reload();await page.waitForFunction(()=>document.querySelector('.warmup-check')?.getAttribute('aria-pressed')==='true');
    await page.getByRole('button',{name:'下一次同堂训练'}).click();await page.waitForFunction(()=>[...document.querySelectorAll('.warmup-check')].every(e=>e.getAttribute('aria-pressed')==='false'));
    await page.getByRole('button',{name:'删除动作'}).first().click();await page.getByRole('heading',{name:/删除/}).waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();
  }
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width} overflow`);check(errors.length===0,errors.join(';'));
  await page.screenshot({path:`.validation/v23-${mode}-${width}.png`,fullPage:true});await page.close();
}}console.log('PASS: 375/390/430 and desktop; Plan add/delete/reorder/save, flat search, Carry, measurement adjustment, warm-up occurrence/reload.');}finally{await browser.close();}
