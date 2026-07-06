'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Check, ChefHat, Clock3, Eye, Flame, Maximize2, Power, Settings2, StickyNote, Utensils, X } from 'lucide-react';
import { api } from '@/lib/api';

const nextStatus:any={placed:'accepted',accepted:'preparing',preparing:'ready'};
const labels:any={accepted:'Accept ticket',preparing:'Start cooking',ready:'Mark ready'};

export default function KitchenBoard({orders,update}:{orders:any[];update:(order:any,status:string)=>Promise<void>}){
  const [filter,setFilter]=useState('all');
  const [sound,setSound]=useState(()=>typeof window!=='undefined'&&localStorage.getItem('kitchen-sound')!=='off');
  const [busy,setBusy]=useState<string|null>(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [menuItems,setMenuItems]=useState<any[]>([]);
  const [selected,setSelected]=useState<any|null>(null);
  const [summary,setSummary]=useState<any>({today_orders:0,pending_orders:0});
  const [stockNotice,setStockNotice]=useState('');
  const [,tick]=useState(0);
  const knownOrders=useRef(new Set<string>());

  useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),30000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{api('/api/staff/orders/summary').then(setSummary)},[orders]);
  useEffect(()=>{
    const currentIds=new Set(orders.map(order=>order.id));
    const hasNew=[...currentIds].some(id=>!knownOrders.current.has(id));
    if(knownOrders.current.size&&hasNew&&sound)playAlert();
    knownOrders.current=currentIds;
  },[orders,sound]);

  const visible=useMemo(()=>orders.filter(order=>filter==='all'||order.status===filter),[orders,filter]);
  const counts={placed:orders.filter(order=>order.status==='placed').length,accepted:orders.filter(order=>order.status==='accepted').length,preparing:orders.filter(order=>order.status==='preparing').length,ready:orders.filter(order=>order.status==='ready').length};
  function toggleSound(){const next=!sound;setSound(next);localStorage.setItem('kitchen-sound',next?'on':'off');if(next)playAlert()}
  async function openMenu(){setMenuItems(await api('/api/staff/menu-availability'));setMenuOpen(true)}
  async function toggleItem(item:any){const updated:any=await api(`/api/staff/menu-availability/${item.id}`,{method:'PATCH',body:JSON.stringify({available:!item.available})});setMenuItems(current=>current.map(value=>value.id===item.id?{...value,available:updated.available}:value))}
  async function markOrderItemOut(order:any,item:any){if(!confirm(`Mark ${item.item_name} out of stock for all customers?`))return;await api(`/api/staff/orders/${order.id}/items/${item.id}/out-of-stock`,{method:'PATCH',body:'{}'});setStockNotice(`${item.item_name} is now hidden from customer menus.`);setTimeout(()=>setStockNotice(''),3500)}
  async function advance(order:any){if(busy)return;setBusy(order.id);try{await update(order,nextStatus[order.status])}finally{setBusy(null)}}

  return <div className="kds">{stockNotice&&<div className="kdsToast"><Check/>{stockNotice}</div>}<div className="kdsTop"><div className="kdsSummary"><article><Flame/><span>New<b>{counts.placed}</b></span></article><article><ChefHat/><span>Cooking<b>{counts.accepted+counts.preparing}</b></span></article><article><Check/><span>Handled today<b>{summary.today_orders}</b></span></article></div><div className="kdsTools"><button onClick={openMenu}><Settings2/> Menu stock</button><button onClick={toggleSound}>{sound?<Bell/>:<BellOff/>}{sound?'Sound on':'Sound off'}</button><button onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize2/> Fullscreen</button></div></div><div className="kdsFilters">{[['all','All tickets'],['placed','New'],['accepted','Accepted'],['preparing','Preparing']].map(([value,label])=><button className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{label}<b>{value==='all'?orders.length:(counts as any)[value]}</b></button>)}</div><div className="kdsGrid">{visible.map(order=><KitchenTicket key={order.id} order={order} busy={busy===order.id} advance={()=>advance(order)} view={()=>setSelected(order)} outOfStock={(item:any)=>markOrderItemOut(order,item)}/>)}{!visible.length&&<div className="kdsEmpty"><Utensils/><h2>No tickets here.</h2><p>The kitchen is clear for this view.</p></div>}</div>{menuOpen&&<MenuAvailability items={menuItems} close={()=>setMenuOpen(false)} toggle={toggleItem}/>} {selected&&<KitchenTicketDetail order={selected} close={()=>setSelected(null)} outOfStock={(item:any)=>markOrderItemOut(selected,item)}/>}</div>;
}

function KitchenTicket({order,busy,advance,view,outOfStock}:{order:any;busy:boolean;advance:()=>void;view:()=>void;outOfStock:(item:any)=>void}){
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(order.created_at).getTime())/60000));
  const priority=minutes>=20?'urgent':minutes>=12?'warning':'';
  return <article className={`kdsTicket ${order.status} ${priority}`}><header><div><span>#{order.order_number}</span><h2>{order.table_name}</h2></div><div className="kdsAge"><Clock3/><b>{minutes}m</b><small>{priority==='urgent'?'URGENT':priority==='warning'?'CHECK':'ELAPSED'}</small></div></header><div className="kdsStatus"><i/>{order.status}<button onClick={view}><Eye/> View full ticket</button></div><section className="kdsItems">{order.items.map((item:any)=><div className={item.special_instructions?'hasNote':''} key={item.id}>{item.image_url?<img src={item.image_url} alt=""/>:<strong>{item.quantity}</strong>}<span><b>{item.quantity}Ã— {item.item_name}</b>{item.special_instructions&&<small><StickyNote/> {item.special_instructions}</small>}</span><button className="itemStockButton" onClick={()=>outOfStock(item)}>Out of stock</button></div>)}</section>{order.notes&&<div className="kdsOrderNote"><StickyNote/><span><b>Order note</b>{order.notes}</span></div>}<footer><span>{order.items.reduce((sum:number,item:any)=>sum+item.quantity,0)} items Â· {new Date(order.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>{nextStatus[order.status]&&<button disabled={busy} onClick={advance}>{busy?'Updatingâ€¦':labels[nextStatus[order.status]]}</button>}{order.status==='ready'&&<b className="readyLabel"><Check/> Waiting for service</b>}</footer></article>;
}

function MenuAvailability({items,close,toggle}:{items:any[];close:()=>void;toggle:(item:any)=>void}){return <div className="kitchenPanel"><div onClick={close}/><aside><header><div><p>KITCHEN CONTROL</p><h2>Menu stock</h2><span>Hide sold-out dishes from the customer menu instantly.</span></div><button onClick={close}><X/></button></header><section>{items.map(item=><article className={!item.available?'soldOut':''} key={item.id}><img src={item.image_url||'/images/menu/butter-chicken.jpg'} alt=""/><div><small>{item.category_name}</small><b>{item.name}</b><span>{item.available?'Available to order':'Hidden Â· Sold out'}</span></div><button onClick={()=>toggle(item)}><Power/>{item.available?'Mark sold out':'Make available'}</button></article>)}</section></aside></div>}

function KitchenTicketDetail({order,close,outOfStock}:{order:any;close:()=>void;outOfStock:(item:any)=>void}){return <div className="kitchenPanel"><div onClick={close}/><aside><header><div><p>FULL KITCHEN TICKET #{order.order_number}</p><h2>{order.table_name}</h2><span>{new Date(order.created_at).toLocaleString('en-IN')}</span></div><button onClick={close}><X/></button></header>{order.notes&&<div className="kdsOrderNote"><StickyNote/><span><b>Order note</b>{order.notes}</span></div>}<section className="fullKitchenItems">{order.items.map((item:any)=><article key={item.id}><img src={item.image_url||'/images/menu/butter-chicken.jpg'} alt=""/><strong>{item.quantity}Ã—</strong><div><h3>{item.item_name}</h3>{item.special_instructions?<p><StickyNote/> {item.special_instructions}</p>:<span>No special instruction</span>}</div><button className="itemStockButton" onClick={()=>outOfStock(item)}>Mark out of stock</button></article>)}</section></aside></div>}

function playAlert(){try{const AudioContext=(window.AudioContext||(window as any).webkitAudioContext);const context=new AudioContext();[0,0.18].forEach(delay=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.connect(gain);gain.connect(context.destination);oscillator.frequency.value=delay?880:660;gain.gain.setValueAtTime(.16,context.currentTime+delay);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+delay+.22);oscillator.start(context.currentTime+delay);oscillator.stop(context.currentTime+delay+.22)});setTimeout(()=>context.close(),700)}catch{}}

