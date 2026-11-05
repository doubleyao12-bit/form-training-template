import { loadPlaywright } from "./playwright-runtime.mjs";
// Local rendered evidence only: no Auth, Supabase requests, or real-user data.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});
const results=[];
// Optional reviewer-supplied CSS baseline; no dependency on the parent Git history.
const beforeCss = process.env.FORM_BASELINE_CSS ? readFileSync(process.env.FORM_BASELINE_CSS, 'utf8') : null;
const currentHtml=readFileSync('.validation/today.html','utf8');
if (beforeCss) writeFileSync('.validation/mobile-before.html',currentHtml.replace(/<style>[\s\S]*?<\/style>/,`<style>${beforeCss}</style>`));
const assert=(value,message)=>{if(!value)throw Error(message);};
try{
  for(const [width,height] of [[375,812],[390,844],[430,932],[1280,900]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:width<620,hasTouch:width<620});
    await page.route('https://**/*',r=>r.abort());
    if(width===375 && beforeCss){await page.goto(pathToFileURL(`${process.cwd()}/.validation/mobile-before.html`).href);const before=await page.locator('.exercise-order').evaluate(e=>({columns:getComputedStyle(e).gridTemplateColumns,rows:[...e.children].map(x=>({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,width:x.getBoundingClientRect().width}))}));results.push({beforeRegression:before});await page.screenshot({path:'.validation/mobile-before-375.png',fullPage:true});}
    for(const screen of ['today','workout']){
      await page.goto(pathToFileURL(`${process.cwd()}/.validation/${screen}.html`).href);
      if(screen==='today'&&width===375)await page.screenshot({path:'.validation/mobile-today-375-natural.png',fullPage:true});
      if(screen==='today'&&width<620){
        await page.evaluate(longest=>{
          const titles=['短杠杆哥本哈根支撑','浅幅侧向弓步','弹力带侧向走',...longest];
          const prescriptions=['每侧 12 步','每侧 30 秒','3 × 8','5 breaths'];
          document.querySelectorAll('.exercise-preview-row').forEach((row,i)=>{
            if(titles[i])row.querySelector('.exercise-preview-copy>b').textContent=titles[i];
            const copy=row.querySelector('.exercise-preview-copy');const p=document.createElement('small');p.textContent=prescriptions[i%4];copy.append(p);
          });
          const nav=document.createElement('nav');nav.className='mobile-nav';nav.innerHTML='<button>Today</button><button>Plan</button><button>Exercises</button><button>History</button><button>Profile</button>';document.body.append(nav);
        },JSON.parse(readFileSync('.validation/mobile-long-titles.json','utf8')));
      }
      const metrics=await page.evaluate(()=>{
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const rows=[...document.querySelectorAll('[data-order-row]')];
        return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,rows:rows.map(rect),titles:[...document.querySelectorAll('.exercise-preview-row>em,.workout-order-row>span')].map(rect),handles:[...document.querySelectorAll('.exercise-drag-handle')].map(rect),actions:[...document.querySelectorAll('.exercise-preview-actions a,.exercise-preview-actions button')].map(e=>({...rect(e),text:e.textContent,whiteSpace:getComputedStyle(e).whiteSpace,font:getComputedStyle(e).fontSize}))};
      });
      assert(metrics.documentWidth<=width,`${screen} ${width}: horizontal overflow`);
      const copy=await page.locator('body').innerText();assert(!copy.includes('ORIGINAL INTENT')&&!copy.includes('ORIGINAL SNAPSHOT')&&!copy.includes('Old Snapshot'),`${screen}: stale replaced exercise copy exposed`);
      assert(metrics.rows.length>0,`${screen}: no rows`);
      for(let i=0;i<metrics.rows.length;i++){const row=metrics.rows[i];assert(row.width>=width*.5,`${screen}: collapsed card`);if(i)assert(row.y>=metrics.rows[i-1].bottom-1,`${screen}: more than one exercise per row`);}
      for(const title of metrics.titles)assert(title.width>=(width<620?120:86),`${screen} ${width}: collapsed title (${title.width}px)`);
      for(const h of metrics.handles)assert(h.width>=44&&h.height>=44,`${screen}: handle target too small`);
      for(const a of metrics.actions)assert(a.whiteSpace==='nowrap'&&a.height>=44&&a.right<=width,`${screen}: fragmented/unusable action`);
      await page.screenshot({path:`.validation/mobile-${screen}-${width}.png`,fullPage:true});
      await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
      if(screen==='today'&&width<620){const clearance=await page.evaluate(()=>document.querySelector('.mobile-nav').getBoundingClientRect().top-document.querySelector('.exercise-order').lastElementChild.getBoundingClientRect().bottom);assert(clearance>=0,`Last card hidden by navigation: ${width}`);metrics.lastCardNavClearance=clearance;await page.screenshot({path:`.validation/mobile-${screen}-${width}-bottom.png`});}
      results.push({screen,width,height,...metrics});
    }
    await page.close();
  }
  writeFileSync('.validation/mobile-layout-results.json',JSON.stringify(results,null,2));
  console.log('Rendered Chromium mobile 375/390/430 and desktop 1280 checks passed: single-column cards, overflow, long Chinese titles, 4 prescriptions, 44px handles/actions and bottom-nav clearance.');
}finally{await browser.close();}
