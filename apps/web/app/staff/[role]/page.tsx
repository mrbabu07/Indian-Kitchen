'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, BellRing, ChefHat, Clock3, Download, Edit3, Eye, EyeOff, IndianRupee, LayoutDashboard, LogOut, Menu, Plus, QrCode, RefreshCcw, Settings, Trash2, Users, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { API, api, money } from '@/lib/api';

const nextStatus:any={placed:'accepted',accepted:'preparing',preparing:'ready',ready:'served'};
const actionLabel:any={accepted:'Accept order',preparing:'Start preparing',ready:'Mark ready',served:'Mark served'};

export default function Dashboard({params}:{params:{role:string}}) {
  const router=useRouter();
  const [staff,setStaff]=useState<any>();
  const [orders,setOrders]=useState<any[]>([]);
  const [analytics,setAnalytics]=useState<any>();
  const [tab,setTab]=useState('orders');
  const [resources,setResources]=useState<Record<string,any[]>>({});
  const [loading,setLoading]=useState(false);

  const load=useCallback(async()=>{
    const current=JSON.parse(localStorage.getItem('staff')||'null');
    if(!current)return router.push('/staff/login');
    if(current.role!==params.role)return router.push(`/staff/${current.role}`);
    setStaff(current);
    setOrders(await api(`/api/staff/orders?active=${params.role==='kitchen'}`));
    if(params.role==='admin')setAnalytics(await api('/api/staff/analytics'));
  },[params.role,router]);

  useEffect(()=>{
    load();
    const socket=io(API,{auth:{token:localStorage.getItem('token')}});
    socket.on('order:new',(order:any)=>setOrders(current=>[order,...current]));
    socket.on('order:updated',(order:any)=>setOrders(current=>current.map(value=>value.id===order.id?order:value)));
    return()=>{socket.close()};
  },[load]);

  async function updateOrder(order:any,status:string){await api(`/api/staff/orders/${order.id}/status`,{method:'PATCH',body:JSON.stringify({status})});await load();}
  async function markPaid(id:string){await api(`/api/staff/orders/${id}/payment`,{method:'PATCH',body:'{}'});await load();}
  async function openResource(name:string){
    setTab(name);setLoading(true);
    try{
      const paths=name==='settings'?['branches']:name==='menu'?['menu','categories']:[name];
      const values=await Promise.all(paths.map(path=>api(`/api/admin/${path}`)));
      setResources(current=>({...current,...Object.fromEntries(paths.map((path,index)=>[path,values[index]]))}));
    }finally{setLoading(false)}
  }

  if(!staff)return <div className="center">Opening workspace…</div>;
  const active=orders.filter(order=>!['served','cancelled'].includes(order.status));
  const visibleOrders=params.role==='kitchen'?active:orders;
  const title=tab==='orders'?(params.role==='kitchen'?'Kitchen display':'Live orders'):tab[0].toUpperCase()+tab.slice(1);
  return <main className="dash">
    <aside className="sidebar"><div className="brand light"><span>IK</span> Indian Kitchen</div><nav><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}><LayoutDashboard/> Live orders</button>{params.role==='admin'&&<><button className={tab==='menu'?'active':''} onClick={()=>openResource('menu')}><Menu/> Menu items</button><button className={tab==='categories'?'active':''} onClick={()=>openResource('categories')}><RefreshCcw/> Categories</button><button className={tab==='tables'?'active':''} onClick={()=>openResource('tables')}><QrCode/> Tables & QR</button><button className={tab==='staff'?'active':''} onClick={()=>openResource('staff')}><Users/> Staff</button><button className={tab==='analytics'?'active':''} onClick={()=>setTab('analytics')}><BarChart3/> Analytics</button><button className={tab==='settings'?'active':''} onClick={()=>openResource('settings')}><Settings/> Restaurant settings</button></>}</nav><div className="staffMini"><span>{staff.name[0]}</span><div><b>{staff.name}</b><small>{staff.role}</small></div><button aria-label="Log out" onClick={()=>{localStorage.clear();router.push('/staff/login')}}><LogOut/></button></div></aside>
    <section className="workspace"><header><div><p className="eyebrow red">{staff.role} workspace</p><h1>{title}</h1></div><div className="live"><i/> Live</div></header>
      {loading&&<div className="adminLoading">Loading controls…</div>}
      {tab==='orders'&&<OrderBoard orders={visibleOrders} active={active} role={params.role} update={updateOrder} paid={markPaid}/>} 
      {tab==='analytics'&&analytics&&<div className="analytics"><article><p>Today’s revenue</p><h2>{money(analytics.summary.revenue)}</h2></article><article><p>Orders today</p><h2>{analytics.summary.orders}</h2></article><section><h3>Top dishes</h3>{analytics.topItems.map((item:any,index:number)=><div className="rank" key={item.item_name}><b>0{index+1}</b><span>{item.item_name}</span><em>{item.quantity} sold</em></div>)}</section></div>}
      {['menu','categories','tables','staff'].includes(tab)&&!loading&&<AdminResource type={tab} rows={resources[tab]||[]} categories={resources.categories||[]} reload={()=>openResource(tab)}/>} 
      {tab==='settings'&&!loading&&<SettingsPanel branch={resources.branches?.[0]} reload={()=>openResource('settings')}/>} 
    </section>
  </main>;
}

function OrderBoard({orders,active,role,update,paid}:{orders:any[];active:any[];role:string;update:(o:any,s:string)=>void;paid:(id:string)=>void}){
  return <><div className="stats"><article><Clock3/><span><b>{active.length}</b> Active orders</span></article><article><BellRing/><span><b>{active.filter(order=>order.status==='placed').length}</b> Awaiting action</span></article><article><IndianRupee/><span><b>{orders.filter(order=>order.payment_status==='paid').length}</b> Paid orders</span></article></div><div className="tickets">{orders.map(order=><article className={`ticket ${order.status}`} key={order.id}><div className="ticketHead"><div><p>ORDER #{order.order_number}</p><h3>{order.table_name}</h3></div><span>{order.status}</span></div><div className="ticketItems">{order.items.map((item:any)=><div key={item.id}><b>{item.quantity}×</b><span>{item.item_name}{item.special_instructions&&<small>{item.special_instructions}</small>}</span></div>)}</div>{role!=='kitchen'&&<div className="ticketMeta"><span>{money(order.total)}</span><span className={order.payment_status}>{order.payment_method} · {order.payment_status}</span></div>}<div className="actions">{role==='kitchen'&&['placed','accepted','preparing'].includes(order.status)&&<button onClick={()=>update(order,nextStatus[order.status])}>{actionLabel[nextStatus[order.status]]}</button>}{role==='operator'&&order.payment_method==='cash'&&order.payment_status==='pending'&&<button onClick={()=>paid(order.id)}>Cash received</button>}{role==='operator'&&order.status==='ready'&&<button onClick={()=>update(order,'served')}>Mark served</button>}{role==='admin'&&nextStatus[order.status]&&<button onClick={()=>update(order,nextStatus[order.status])}>{actionLabel[nextStatus[order.status]]}</button>}</div></article>)}{!orders.length&&<div className="empty"><ChefHat/><h3>All caught up.</h3><p>New orders will appear here instantly.</p></div>}</div></>;
}

function AdminResource({type,rows,categories,reload}:{type:string;rows:any[];categories:any[];reload:()=>void}){
  const [editing,setEditing]=useState<any|null>(null);const [creating,setCreating]=useState(false);const [error,setError]=useState('');
  const singular:any={menu:'Menu item',categories:'Category',tables:'Table',staff:'Staff member'};
  async function remove(row:any){if(!confirm(`Delete ${row.name}? This cannot be undone.`))return;await api(`/api/admin/${type}/${row.id}`,{method:'DELETE'});reload();}
  async function toggle(row:any){const field=type==='menu'?'available':'active';await api(`/api/admin/${type}/${row.id}`,{method:'PATCH',body:JSON.stringify({[field]:!row[field]})});reload();}
  return <div className="adminSurface"><div className="adminToolbar"><div><b>{rows.length}</b><span>{singular[type]} records</span></div><button onClick={()=>setCreating(true)}><Plus/> Add {singular[type]}</button></div>{error&&<div className="adminError">{error}</div>}<div className="adminTable"><div className="adminTableHead"><span>{type==='menu'?'Item':'Name'}</span><span>Details</span><span>Status</span><span>Actions</span></div>{rows.map(row=><div className="adminRow" key={row.id}><div className="adminIdentity">{type==='menu'&&<img src={row.image_url||'/images/menu/butter-chicken.jpg'} alt=""/>}<div><b>{row.name}</b><small>{type==='menu'?row.category_name:type==='staff'?row.role:type==='tables'?`QR: ${row.qr_token.slice(0,8)}…`: `Order ${row.sort_order}`}</small></div></div><div className="adminDetails">{type==='menu'?<><b>{money(row.price)}</b><small>{row.description}</small></>:type==='staff'?<span>{row.email}</span>:type==='tables'?<span>{row.capacity} seats</span>:<span>{row.description||'No description'}</span>}</div><button className={`statusPill ${(type==='menu'?row.available:row.active)?'on':'off'}`} onClick={()=>toggle(row)}>{(type==='menu'?row.available:row.active)?<><Eye/> Active</>:<><EyeOff/> Hidden</>}</button><div className="rowActions">{type==='tables'&&<button title="Download QR" onClick={()=>downloadQr(row)}><Download/></button>}<button title="Edit" onClick={()=>setEditing(row)}><Edit3/></button>{type!=='staff'&&<button title="Delete" className="danger" onClick={()=>remove(row)}><Trash2/></button>}</div></div>)}</div>{(creating||editing)&&<AdminModal type={type} value={editing} categories={categories} close={()=>{setCreating(false);setEditing(null)}} saved={()=>{setCreating(false);setEditing(null);reload()}} error={setError}/>}</div>;
}

async function downloadQr(row:any){const response=await fetch(`${API}/api/admin/tables/${row.id}/qr`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});const blob=await response.blob();const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=`${row.name}-qr.png`;anchor.click();URL.revokeObjectURL(anchor.href);}

function AdminModal({type,value,categories,close,saved,error}:{type:string;value:any;categories:any[];close:()=>void;saved:()=>void;error:(x:string)=>void}){
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget));let body:any={...form};if(type==='menu')body={...body,price:Number(body.price),...(!value?{available:true}:{})};if(type==='categories')body={...body,sort_order:Number(body.sort_order||0),...(!value?{active:true}:{})};if(type==='tables')body={...body,capacity:Number(body.capacity),...(!value?{active:true}:{})};if(type==='staff'&&!body.password)delete body.password;try{await api(`/api/admin/${type}${value?`/${value.id}`:''}`,{method:value?'PATCH':'POST',body:JSON.stringify(body)});saved()}catch(e:any){error(e.message)}}
  return <div className="adminModal"><div className="adminModalBackdrop" onClick={close}/><form onSubmit={submit}><button type="button" className="modalClose" onClick={close}><X/></button><p className="eyebrow red">{value?'Edit':'Create'} record</p><h2>{value?'Update':'Add'} {type==='menu'?'menu item':type==='categories'?'category':type==='tables'?'table':'staff member'}</h2><div className="adminFormGrid"><label>Name<input name="name" defaultValue={value?.name} required/></label>{type==='menu'&&<><label>Category<select name="category_id" defaultValue={value?.category_id} required><option value="">Choose category</option>{categories.map(category=><option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Price (₹)<input name="price" type="number" step="0.01" defaultValue={value?.price} required/></label><label>Food type<select name="food_type" defaultValue={value?.food_type||'veg'}><option value="veg">Vegetarian</option><option value="non_veg">Non-vegetarian</option></select></label><label className="wide">Image URL<input name="image_url" defaultValue={value?.image_url} placeholder="/images/menu/dish.jpg"/></label><label className="wide">Description<textarea name="description" defaultValue={value?.description}/></label></>}{type==='categories'&&<><label>Display order<input name="sort_order" type="number" defaultValue={value?.sort_order||0}/></label><label className="wide">Description<textarea name="description" defaultValue={value?.description}/></label></>}{type==='tables'&&<label>Capacity<input name="capacity" type="number" min="1" defaultValue={value?.capacity||4} required/></label>}{type==='staff'&&<><label>Email<input name="email" type="email" defaultValue={value?.email} disabled={!!value} required={!value}/></label><label>Role<select name="role" defaultValue={value?.role||'operator'}><option value="operator">Operator</option><option value="kitchen">Kitchen staff</option></select></label><label className="wide">{value?'New password (optional)':'Password'}<input name="password" type="password" minLength={6} required={!value}/></label></>}</div><button className="saveButton">{value?'Save changes':'Create record'}</button></form></div>;
}

function SettingsPanel({branch,reload}:{branch:any;reload:()=>void}){
  const [message,setMessage]=useState('');if(!branch)return <div className="panel">Branch not found.</div>;
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form:any=Object.fromEntries(new FormData(event.currentTarget));form.gst_percent=Number(form.gst_percent);try{await api(`/api/admin/branches/${branch.id}`,{method:'PATCH',body:JSON.stringify(form)});setMessage('Restaurant settings saved successfully.');reload()}catch(e:any){setMessage(e.message)}}
  return <div className="settingsPanel"><div className="settingsIntro"><Settings/><div><h2>Restaurant settings</h2><p>Control the information customers see, tax calculation and UPI gateway credentials.</p></div></div><form onSubmit={save}><section><h3>Branch profile</h3><div className="adminFormGrid"><label>Restaurant name<input name="name" defaultValue={branch.name}/></label><label>Phone<input name="phone" defaultValue={branch.phone}/></label><label className="wide">Address<textarea name="address" defaultValue={branch.address}/></label><label>GST number<input name="gst_number" defaultValue={branch.gst_number}/></label><label>GST percentage<input name="gst_percent" type="number" step="0.01" defaultValue={branch.gst_percent}/></label></div></section><section><h3>Razorpay UPI</h3><p>Leave secret fields blank to keep environment-based credentials.</p><div className="adminFormGrid"><label>Key ID<input name="razorpay_key_id" placeholder="rzp_live_…"/></label><label>Key secret<input name="razorpay_key_secret" type="password" placeholder="••••••••••••"/></label></div></section>{message&&<p className="settingsMessage">{message}</p>}<button className="saveButton">Save restaurant settings</button></form></div>;
}
