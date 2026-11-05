import { loadPlaywright } from "./playwright-runtime.mjs";
import {mkdirSync} from "node:fs";
import {pathToFileURL} from "node:url";
const { chromium } = await loadPlaywright();
const browser=await chromium.launch({headless:true});
mkdirSync(".validation",{recursive:true});
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
try {
  for(const [width,height] of [[375,812],[390,844],[430,932]]) {
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    const errors=[];page.on("pageerror",error=>errors.push(error.message));
    await page.route("https://**/*",route=>route.abort());
    await page.goto("http://localhost:5192/tests/plan-v2-fixture.html");
    await page.getByRole("button",{name:/Example · Four-Session Strength/}).click();
    await page.locator(".plan-session-details > details").first().locator("summary").first().click();
    assert(await page.getByText("MAIN WORKOUT").first().isVisible(),`${width}: exact workout hidden`);
    assert(await page.getByText("杠铃后蹲").first().isVisible(),`${width}: variation name unresolved`);
    await page.locator(".plan-warmup summary").first().click();
    assert(await page.getByText("90/90 靠墙呼吸").first().isVisible(),`${width}: warm-up hidden`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: detail overflow`);
    await page.screenshot({path:`.validation/plan-v2-detail-${width}.png`,fullPage:true});
    await page.getByRole("button",{name:"编辑计划"}).click();
    await page.locator(".plan-editor-session > summary").first().click();
    await page.locator(".plan-editor-intent > summary").first().click();
    await page.getByRole("button",{name:/替换动作/}).first().click();
    assert(await page.getByRole("dialog",{name:"替换动作"}).isVisible(),`${width}: replacement sheet missing`);
    assert(await page.getByText("推荐替换").first().isVisible(),`${width}: recommendations missing`);
    await page.screenshot({path:`.validation/plan-v21-recommend-${width}.png`});
    await page.getByRole("button",{name:/浏览完整动作库/}).click();
    assert(await page.locator(".replacement-families details").count()>0,`${width}: full library unavailable`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: replacement overflow`);
    await page.screenshot({path:`.validation/plan-v21-library-${width}.png`});
    await page.getByRole("button",{name:"关闭"}).click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: editor overflow`);
    await page.screenshot({path:`.validation/plan-v2-editor-${width}.png`,fullPage:true});
    await page.getByRole("button",{name:"返回详情"}).click();
    await page.getByRole("button",{name:"删除计划"}).click();
    assert(await page.getByText("训练历史不会被删除").isVisible(),`${width}: safety copy missing`);
    assert(errors.length===0,errors.join("; "));
    await page.close();
  }
  console.log("Plan V2 rendered 375/390/430 checks passed: detail, warm-up, exact names, edit, confirm, overflow.");
} finally {await browser.close();}
