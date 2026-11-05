import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

type RowBox={id:string;top:number;height:number};
type Drag={id:string;pointerId:number;startY:number;y:number;active:boolean;timer:number;scroll:number;rows:RowBox[];gap:number;original:string[];preview:string[]};
type Floating={node:ReactNode;top:number;left:number;width:number;delta:number;today:boolean;dropping:boolean};

export function ExerciseOrder({ids,disabled,onOrder,renderItem}:{ids:string[];disabled?:boolean;onOrder:(ids:string[])=>Promise<void>;renderItem:(id:string,index:number,handle:ReactNode)=>ReactNode}){
  const [order,setOrder]=useState(ids),[dragging,setDragging]=useState<string|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const [floating,setFloating]=useState<Floating|null>(null),[offsets,setOffsets]=useState<Record<string,number>>({});
  const host=useRef<HTMLDivElement>(null),latest=useRef(order),gesture=useRef<Drag|null>(null);
  const frame=useRef(0),dropTimer=useRef(0),landing=useRef(0);
  const signature=ids.join('|');
  useEffect(()=>{if(!gesture.current){latest.current=ids;setOrder(ids);}},[signature]);
  useEffect(()=>()=>{if(gesture.current)window.clearTimeout(gesture.current.timer);cancelAnimationFrame(frame.current);window.clearTimeout(dropTimer.current);},[]);
  function update(next:string[]){latest.current=next;setOrder(next);}
  async function save(next:string[]){setSaving(true);setError('');try{await onOrder(next);}catch(cause){setError(cause instanceof Error?cause.message:String(cause));update(ids);}finally{setSaving(false);}}
  function project(g:Drag){
    const source=g.rows.find(r=>r.id===g.id)!;
    const center=source.top+source.height/2+g.y-g.startY+window.scrollY-g.scroll;
    const target=g.rows.filter(r=>r.id!==g.id&&center>r.top+r.height/2).length;
    // Stable, untransformed document coordinates avoid oscillating hit tests.
    const next=g.original.filter(id=>id!==g.id);next.splice(target,0,g.id);g.preview=next;
    let top=g.rows[0].top;const shifts:Record<string,number>={};
    for(const id of next){const row=g.rows.find(r=>r.id===id)!;shifts[id]=top-row.top;if(id===g.id)landing.current=top;top+=row.height+g.gap;}
    setOffsets(shifts);setFloating(f=>f?{...f,delta:g.y-g.startY}:f);
  }
  function tick(){
    const g=gesture.current;if(!g?.active)return;
    if(Math.abs(g.y-g.startY)>3){const edge=110;const speed=g.y<edge?-Math.min(18,(edge-g.y)/5):g.y>window.innerHeight-edge?Math.min(18,(g.y-window.innerHeight+edge)/5):0;if(speed){const before=window.scrollY;window.scrollBy(0,speed);if(before!==window.scrollY)project(g);}}
    frame.current=requestAnimationFrame(tick);
  }
  function activate(g:Drag){
    if(gesture.current!==g||!host.current)return;
    const nodes=[...host.current.querySelectorAll<HTMLElement>(':scope > [data-order-row]')];
    const node=nodes.find(n=>n.dataset.orderRow===g.id);if(!node)return;
    const rect=node.getBoundingClientRect();
    g.rows=nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.orderRow!,top:r.top+window.scrollY,height:r.height};});
    g.gap=parseFloat(getComputedStyle(host.current).rowGap)||0;g.scroll=window.scrollY;g.active=true;
    setDragging(g.id);
    setFloating({node:renderItem(g.id,g.original.indexOf(g.id),<span className="exercise-drag-handle">⠿</span>),top:rect.top,left:rect.left,width:rect.width,delta:0,today:!!host.current.closest('.exercise-preview'),dropping:false});
    landing.current=rect.top+window.scrollY;frame.current=requestAnimationFrame(tick);
  }
  function finish(cancelled=false){
    const g=gesture.current;if(!g)return;
    window.clearTimeout(g.timer);cancelAnimationFrame(frame.current);gesture.current=null;setOffsets({});
    if(cancelled||!g.active){setFloating(null);setDragging(null);return;}
    setFloating(f=>f?{...f,dropping:true,delta:landing.current-window.scrollY-f.top}:f);
    update(g.preview);dropTimer.current=window.setTimeout(()=>{setFloating(null);setDragging(null);},160);
    if(g.preview.join('|')!==g.original.join('|'))void save(g.preview);
  }
  const visibleOrder=order.length===ids.length&&order.every(id=>ids.includes(id))?order:ids;
  return <><div ref={host} className={`exercise-order ${floating&&!floating.dropping?'is-sorting':''}`} aria-label="当前训练动作顺序">{visibleOrder.map((id,index)=>{
    const handle=<button type="button" className="exercise-drag-handle" disabled={disabled||saving||!!floating?.dropping} aria-label={`调整第 ${index+1} 个动作顺序，长按拖动或使用上下方向键`} aria-pressed={dragging===id}
      onClick={e=>{e.preventDefault();e.stopPropagation();}}
      onKeyDown={e=>{if(e.key==='Escape'){finish(true);return;}if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();e.stopPropagation();if(gesture.current)return;const target=index+(e.key==='ArrowUp'?-1:1);if(target<0||target>=visibleOrder.length)return;const next=[...visibleOrder];[next[index],next[target]]=[next[target],next[index]];update(next);void save(next);}}
      onPointerDown={e=>{if(gesture.current||e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const g:Drag={id,pointerId:e.pointerId,startY:e.clientY,y:e.clientY,active:false,timer:0,scroll:window.scrollY,rows:[],gap:0,original:[...visibleOrder],preview:[...visibleOrder]};gesture.current=g;if(e.pointerType==='mouse')activate(g);else g.timer=window.setTimeout(()=>activate(g),180);}}
      onPointerMove={e=>{const g=gesture.current;if(!g||e.pointerId!==g.pointerId)return;e.stopPropagation();g.y=e.clientY;if(!g.active){if(Math.abs(g.y-g.startY)>12)finish(true);return;}project(g);}}
      onPointerUp={e=>{const g=gesture.current;if(e.pointerId!==g?.pointerId)return;e.preventDefault();e.stopPropagation();if(g.active){g.y=e.clientY;project(g);}finish();}}
      onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>{if(gesture.current)finish(true);}}>⠿</button>;
    return <div data-order-row={id} className={dragging===id?'order-dragging':''} style={{transform:offsets[id]?`translate3d(0,${offsets[id]}px,0)`:undefined}} key={id}>{renderItem(id,index,handle)}</div>;
  })}{saving&&<p role="status">Saving order…</p>}{error&&<p role="alert">{error} · 顺序未确认保存，请重试</p>}</div>{floating&&createPortal(<div aria-hidden="true" inert className={`exercise-drag-overlay ${floating.dropping?'is-dropping':''}`} style={{top:floating.top,left:floating.left,width:floating.width,transform:`translate3d(0,${floating.delta}px,0) scale(${floating.dropping?1:1.015})`}}><div className={floating.today?'today-page exercise-preview':undefined} style={{padding:0}}>{floating.node}</div></div>,document.body)}</>;
}
