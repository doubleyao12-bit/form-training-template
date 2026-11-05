import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync} from "node:fs";
import {pathToFileURL} from "node:url";
const { chromium } = await loadPlaywright();
const base=process.env.FORM_FIXTURE_URL??"http://127.0.0.1:5193/tests/library-v22-fixture.html";
const browser=await chromium.launch({headless:true});
mkdirSync(".validation",{recursive:true});
const check=(ok,message)=>{if(!ok)throw new Error(message);};
try{
  for(const [width,height] of [[375,812],[390,844],[430,932]]){
    for(const mode of ["library","plan","today"]){
      const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
      page.setDefaultTimeout(8000);
      const errors=[];page.on("pageerror",error=>errors.push(error.message));
      await page.goto(`${base}?mode=${mode}`);await page.locator(mode==="library"?".library-page":".plan-replacement-sheet").waitFor();
      if(mode==="library"){
        const squat=page.locator(".exercise-groups:not(.body-groups)>details").filter({has:page.locator(":scope > summary b",{hasText:"蹲"})}).first();
        if(!await squat.evaluate(element=>element.hasAttribute("open")))await squat.locator(":scope > summary").click();
        const family=squat.locator(".exercise-family-list>details>summary").filter({hasText:"深蹲"}).first();
        await family.click();
        check(await page.getByText("史密斯机深蹲").count()>0,`${width}: machine action missing`);
        await page.getByLabel("搜索动作").fill("Double-Dumbbell Front-Rack Squat");
        await page.locator(".search-results .exercise-family-list>details>summary").first().click();
        check(await page.getByText("双哑铃前架深蹲").count()>0,`${width}: English search missing`);
      }else{
        check(await page.getByRole("heading",{name:"替换动作"}).count()===1,`${mode}: replacement sheet missing`);
        check(await page.locator(".replacement-equipment button").count()>0,`${mode}: equipment quick choices missing`);
        await page.locator(".replacement-options .replacement-option").filter({hasText:"史密斯机深蹲"}).click();
        if(mode==="plan"){
          check(await page.getByText("已改为 史密斯机深蹲").count()>0,"Plan draft not updated");
          await page.getByRole("button",{name:"保存到原计划"}).click();
          check(await page.getByTestId("plan-id").textContent()==="same-plan-id","Plan ID changed");
          check(await page.getByTestId("plan-default").textContent()==="smith-squat--default","Plan save did not persist draft");
          await page.getByRole("button",{name:"重新打开原计划"}).click();
          check(await page.getByTestId("plan-default").textContent()==="smith-squat--default","Plan reload lost action");
        }else{
          check(await page.getByTestId("workout-selection").textContent()==="smith-squat--default","Today workout selection missing");
          check(await page.getByTestId("plan-default").textContent()==="back-squat--legacy-default","Today mutated Plan default");
        }
      }
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ${width}: horizontal overflow`);
      check(errors.length===0,`${mode} ${width}: ${errors.join("; ")}`);
      await page.screenshot({path:`.validation/v22-${mode}-${width}.png`,fullPage:true});
      await page.close();
    }
  }
  console.log("V2.2 rendered checks passed at 375, 390, 430: library, Plan replacement/save/reload, Today-only replacement, overflow.");
}finally{await browser.close();}
