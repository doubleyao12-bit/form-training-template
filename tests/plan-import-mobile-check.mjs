import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync,writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});mkdirSync(".validation",{recursive:true});
const extra=[
  {exercise:"pallof-press--legacy-default",measurement:"reps",sets:3,reps:10},
  {exercise:"goblet-squat--legacy-default",measurement:"reps",sets:3,reps:8},
  {exercise:"dead-bug--default",measurement:"reps",sets:2,reps:10},
];
const sample=JSON.stringify({version:"form.plan-import.v1",plan:{name:"Strength & Athletic V2",goalSummary:"建立全身力量与躯干控制",sessions:[
  {order:0,title:"A · 下肢力量",purpose:"深蹲主导与侧链稳定",warmupProfile:"A",exercises:[
    {order:0,exercise:"back-squat--legacy-default",measurement:"reps",sets:4,reps:5,loadKg:60},
    {order:1,exercise:"short-lever-copenhagen-plank--default",measurement:"duration",sets:3,durationSeconds:20,side:"eachSide"},
    ...extra.map((item,index)=>({...item,order:index+2})),
  ]},
  {order:1,title:"B · 呼吸与控制",warmupProfile:"B",exercises:[
    {order:0,exercise:"wall-breathing",measurement:"breaths",sets:2,breaths:5},
    {order:1,exercise:"back-squat--legacy-default",measurement:"reps",sets:3,reps:5},
    ...extra.map((item,index)=>({...item,order:index+2})),
  ]},
]}});
const assert=(value,message)=>{if(!value)throw new Error(message)};const results=[];
try{for(const [width,height] of [[375,812],[390,844],[430,932]]){const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.route("https://**/*",route=>route.abort());await page.goto("http://localhost:5192/tests/plan-import-fixture.html");await page.waitForSelector(".plan-import-paste");
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: paste overflow`);const textarea=page.getByLabel("粘贴方案");const box=await textarea.boundingBox();assert(box&&box.width>=width-50&&box.height>280,`${width}: paste target unusable`);await page.screenshot({path:`.validation/plan-import-paste-${width}.png`,fullPage:true});
  await textarea.fill("not json");await page.getByRole("button",{name:"解析并校验"}).click();await page.waitForSelector(".plan-import-errors");assert((await page.locator("body").innerText()).includes("方案暂时无法导入"),`${width}: error state missing`);
  await textarea.fill(sample);await page.getByRole("button",{name:"解析并校验"}).click();await page.waitForSelector(".plan-import-preview");const copy=await page.locator("body").innerText();assert(copy.includes("Strength & Athletic V2")&&copy.includes("杠铃后蹲")&&copy.includes("3 组 × 20 秒 / 每侧")&&copy.includes("2 组 × 5 次呼吸"),`${width}: preview incomplete`);assert(await page.getByRole("button",{name:"覆盖当前计划"}).isVisible(),`${width}: overwrite action hidden`);assert(await page.getByRole("button",{name:"另存为新计划"}).isVisible(),`${width}: create action hidden`);await page.getByRole("button",{name:"覆盖当前计划"}).click();assert(await page.getByText("历史训练记录不会删除").isVisible(),`${width}: confirmation missing`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: preview overflow`);await page.screenshot({path:`.validation/plan-import-preview-${width}.png`,fullPage:true});assert(errors.length===0,errors.join("; "));results.push({width,height,pass:true});await page.close();}
writeFileSync(".validation/plan-import-mobile-results.json",JSON.stringify(results,null,2));console.log("Plan Import passed rendered 375/390/430 checks: paste, error, preview, apply visibility and overflow.");}finally{await browser.close();}
