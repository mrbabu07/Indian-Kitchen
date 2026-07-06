'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Check, ChefHat, Clock3, Flame, Maximize2, StickyNote, Utensils } from 'lucide-react';

const nextStatus:any={placed:'accepted',accepted:'preparing',preparing:'ready'};
const labels:any={accepted:'Accept ticket',preparing:'Start cooking',ready:'Mark ready'};

export default function KitchenBoard({orders,update}:{orders:any[];update:(order:any,status:string)=>Promise<void>}){
  const [filter,setFilter]=useState('all');
  const [sound,setSound]=useState(()=>typeof window!=='undefined'&&localStorage.getItem('kitchen-sound')!=='off');
  const [busy,setBusy]=useState<string|null>(null);
  const [,tick]=useState(0);
  const knownOrders=useRef(new Set<string>());

  useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),30000);return()=>clearInterval(timer)},[]);
  useEffect(()=>{
    const currentIds=new Set(orders.map(order=>order.id));
    const hasNew=[...currentIds].some(id=>!knownOrders.current.has(id));
    if(knownOrders.current.size&&hasNew&&sound)playAlert();
    knownOrders.current=currentIds;
  },[orders,sound]);

  const visible=useMemo(()=>orders.filter(order=>filter==='all'||order.status===filter),[orders,filter]);
  const counts={placed:orders.filter(order=>order.status==='placed').length,accepted:orders.filter(order=>order.status==='accepted').length,preparing:orders.filter(order=>order.status==='preparing').length,ready:orders.filter(order=>order.status==='ready').length};
  function toggleSound(){const next=!sound;setSound(next);localStorage.setItem('kitchen-sound',next?'on':'off');if(next)playAlert()}
  async function advance(order:any){if(busy)return;setBusy(order.id);try{await update(order,nextStatus[order.status])}finally{setBusy(null)}}

  return <div className="kds"><div className="kdsTop"><div className="kdsSummary"><article><Flame/><span>New<b>{counts.placed}</b></span></article><article><ChefHat/><span>Cooking<b>{counts.accepted+counts.preparing}</b></span></article><article><Check/><span>Ready<b>{counts.ready}</b></span></article></div><div className="kdsTools"><button onClick={toggleSound}>{sound?<Bell/>:<BellOff/>}{sound?'Sound on':'Sound off'}</button><button onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize2/> Fullscreen</button></div></div><div className="kdsFilters">{[['all','All tickets'],['placed','New'],['accepted','Accepted'],['preparing','Preparing'],['ready','Ready']].map(([value,label])=><button className={filter===value?'active':''} onClick={()=>setFilter(value)} key={value}>{label}<b>{value==='all'?orders.length:(counts as any)[value]}</b></button>)}</div><div className="kdsGrid">{visible.map(order=><KitchenTicket key={order.id} order={order} busy={busy===order.id} advance={()=>advance(order)}/>)}{!visible.length&&<div className="kdsEmpty"><Utensils/><h2>No tickets here.</h2><p>The kitchen is clear for this view.</p></div>}</div></div>;
}

function KitchenTicket({order,busy,advance}:{order:any;busy:boolean;advance:()=>void}){
  const minutes=Math.max(0,Math.floor((Date.now()-new Date(order.created_at).getTime())/60000));
  const priority=minutes>=20?'urgent':minutes>=12?'warning':'';
  return <article className={`kdsTicket ${order.status} ${priority}`}><header><div><span>#{order.order_number}</span><h2>{order.table_name}</h2></div><div className="kdsAge"><Clock3/><b>{minutes}m</b><small>{priority==='urgent'?'URGENT':priority==='warning'?'CHECK':'ELAPSED'}</small></div></header><div className="kdsStatus"><i/>{order.status}</div><section className="kdsItems">{order.items.map((item:any)=><div className={item.special_instructions?'hasNote':''} key={item.id}><strong>{item.quantity}</strong><span><b>{item.item_name}</b>{item.special_instructions&&<small><StickyNote/> {item.special_instructions}</small>}</span></div>)}</section>{order.notes&&<div className="kdsOrderNote"><StickyNote/><span><b>Order note</b>{order.notes}</span></div>}<footer><span>{order.items.reduce((sum:number,item:any)=>sum+item.quantity,0)} items · {new Date(order.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>{nextStatus[order.status]&&<button disabled={busy} onClick={advance}>{busy?'Updating…':labels[nextStatus[order.status]]}</button>}{order.status==='ready'&&<b className="readyLabel"><Check/> Waiting for service</b>}</footer></article>;
}

function playAlert(){try{const AudioContext=(window.AudioContext||(window as any).webkitAudioContext);const context=new AudioContext();[0,0.18].forEach(delay=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.connect(gain);gain.connect(context.destination);oscillator.frequency.value=delay?880:660;gain.gain.setValueAtTime(.16,context.currentTime+delay);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+delay+.22);oscillator.start(context.currentTime+delay);oscillator.stop(context.currentTime+delay+.22)});setTimeout(()=>context.close(),700)}catch{}}
