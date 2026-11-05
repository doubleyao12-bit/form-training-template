import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function boot(){
  const events=new Map(),nodes={};let timeout,cleared=false,replaced;
  for(const id of ['boot-recovery','boot-message','boot-retry'])nodes[id]={hidden:id==='boot-retry',removed:false,remove(){this.removed=true;},addEventListener(type,fn){this[type]=fn;}};
  runInNewContext(script,{document:{getElementById:id=>nodes[id]},window:{location:{href:'https://example.test/?tab=plan#details',replace:url=>{replaced=url;}},addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)},setTimeout:fn=>{timeout=fn;return 1;},clearTimeout:()=>{cleared=true;},URL,Date});
  return {nodes,events,timeout:()=>timeout(),cleared:()=>cleared,replaced:()=>replaced};
}
test('timeout and entry errors show recovery without touching storage',()=>{
  for(const event of ['timeout','error','unhandledrejection']){const b=boot();event==='timeout'?b.timeout():b.events.get(event)();assert.equal(b.nodes['boot-retry'].hidden,false);b.nodes['boot-retry'].click();const url=new URL(b.replaced());assert.equal(url.searchParams.get('tab'),'plan');assert.equal(url.hash,'#details');assert.ok(url.searchParams.get('_form_reload'));}
  assert.doesNotMatch(script,/localStorage|sessionStorage|caches\.delete|serviceWorker/);
});
test('React commit removes fallback and detaches startup listeners',()=>{
  const b=boot();b.events.get('form:boot-ready')();assert.ok(b.cleared());assert.ok(b.nodes['boot-recovery'].removed);assert.equal(b.events.has('error'),false);b.timeout();assert.equal(b.nodes['boot-retry'].hidden,true);
});
