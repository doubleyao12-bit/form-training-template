import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync,writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});mkdirSync(".validation",{recursive:true});
const assert=(value,message)=>{if(!value)throw new Error(message);};const results=[];
try{for(const [width,height] of [[375,812],[390,844],[430,932]]){for(const mode of ["library","picker"]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.route("https://**/*",route=>route.abort());
  await page.goto(`http://localhost:5192/tests/library-fixture.html?mode=${mode}`);
  if(mode==="picker")await page.getByRole("button",{name:"动作地图"}).click();
  await page.waitForSelector(mode==="picker"?".exercise-map":".exercise-groups");
  const topLevelSummaries=page.locator(mode==="picker"?".exercise-map>details:not(.exercise-map-secondary)>summary":".exercise-groups:not(.body-groups)>details>summary");
  await topLevelSummaries.filter({hasText:"旋转 / 全身整合"}).click();
  if(mode==="picker"){
    await page.locator(".exercise-map-secondary>summary").click();
    await page.locator(".exercise-map-secondary>details>summary").filter({hasText:"腘绳肌"}).click();
  }else{
    await page.locator(".secondary-discovery>summary").click();
    await page.locator(".body-groups>details>summary").filter({hasText:"腘绳肌"}).click();
  }
  const copy=await page.locator("body").innerText();
  assert(copy.includes("按动作模式找")&&copy.includes("按身体 / 功能找"),`${mode}: discovery dimensions missing`);
  assert(copy.includes("移动 / 负重移动")&&copy.includes("旋转 / 全身整合"),`${mode}: primary categories missing`);
  const catalog=await page.locator("body").textContent();
  assert(catalog.includes("北欧腿弯举")&&catalog.includes("土耳其起立"),`${mode}: key additions absent from navigation`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width}: horizontal overflow`);
  const summaries=topLevelSummaries;for(let i=0;i<await summaries.count();i++){const box=await summaries.nth(i).boundingBox();assert(box&&box.width>200&&box.height>=44,`${mode}: unusable disclosure target`);}
  await page.screenshot({path:`.validation/library-${mode}-${width}.png`,fullPage:true});
  if(mode==="library"){
    await page.getByLabel("搜索动作").fill("北欧腿弯举");const searchCopy=await page.locator("body").innerText();assert(searchCopy.includes("搜索结果")&&searchCopy.includes("北欧腿弯举"),"Search path failed");assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`search ${width}: horizontal overflow`);
    await page.getByLabel("搜索动作").fill("");
    const hinge=topLevelSummaries.filter({hasText:"髋铰链"});await hinge.click();
    const familyList=hinge.locator("..").locator(".exercise-family-list");
    const deadlift=familyList.locator(":scope > details > summary").filter({hasText:/^硬拉族/});await deadlift.click();
    await deadlift.locator("..").locator(".library-exercise > summary").filter({hasText:"杠铃传统硬拉"}).click();
    const familyCopy=await familyList.innerText();
    assert(familyCopy.includes("杠铃传统硬拉")&&familyCopy.includes("六角杠硬拉")&&familyCopy.includes("哑铃传统硬拉"),`${width}: deadlift methods not discoverable`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`family ${width}: horizontal overflow`);
  }
  assert(errors.length===0,errors.join("; "));results.push({width,height,mode,pass:true});await page.close();
}}writeFileSync(".validation/library-mobile-results.json",JSON.stringify(results,null,2));console.log("Exercise Library and replacement map passed 375/390/430 rendered checks: taxonomy paths, key additions, disclosure targets and overflow.");}finally{await browser.close();}
