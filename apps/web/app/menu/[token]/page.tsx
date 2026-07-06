'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { API, api, money } from '@/lib/api';

type Item = { id:string; name:string; description:string; price:string; image_url:string; food_type:string };
type Cart = Record<string, { item:Item; qty:number; note?:string }>;

export default function Menu({ params }:{ params:{ token:string } }) {
  const [data, setData] = useState<any>();
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<any>();
  const [payment, setPayment] = useState<'cash'|'upi'>('cash');
  const [error, setError] = useState('');

  useEffect(() => { api(`/api/public/menu/${params.token}`).then(setData).catch(e => setError(e.message)); }, [params.token]);
  useEffect(() => {
    if (!order?.id || ['served','cancelled'].includes(order.status)) return;
    const timer = setInterval(() => api(`/api/public/orders/${order.id}`).then(setOrder), 5000);
    return () => clearInterval(timer);
  }, [order]);

  const total = useMemo(() => Object.values(cart).reduce((sum, x) => sum + Number(x.item.price) * x.qty, 0), [cart]);
  const qty = Object.values(cart).reduce((sum, x) => sum + x.qty, 0);
  function add(item:Item, delta=1) {
    setCart(current => { const next = {...current}, count = (next[item.id]?.qty || 0) + delta; if (count <= 0) delete next[item.id]; else next[item.id] = {item, qty:count}; return next; });
  }

  async function checkout() {
    const cartBeforePayment = {...cart};
    try {
      setError('');
      const result:any = await api('/api/public/orders', { method:'POST', body:JSON.stringify({ tableToken:params.token, paymentMethod:payment, items:Object.values(cart).map(x => ({menuItemId:x.item.id, quantity:x.qty, specialInstructions:x.note})) }) });
      if (payment !== 'upi' || !result.razorpay) {
        setOrder(result.order); setCart({}); setOpen(false); return;
      }

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) throw new Error('Payment service is loading. Please retry.');
      let completed = false;
      const rollback = async (message:string) => {
        if (completed) return;
        completed = true;
        await api(`/api/public/orders/${result.id}/payment-failed`, {method:'POST', body:'{}'}).catch(() => undefined);
        setCart(cartBeforePayment); setOpen(true); setError(message);
      };
      const gateway = new Razorpay({
        key:result.keyId, amount:result.razorpay.amount, currency:'INR', name:'Indian Kitchen', order_id:result.razorpay.id,
        method:{upi:true,card:false},
        handler:async (response:any) => {
          try {
            const paidOrder = await api(`/api/public/orders/${result.id}/verify-payment`, {method:'POST', body:JSON.stringify(response)});
            completed = true; setOrder(paidOrder); setCart({}); setOpen(false);
          } catch (e:any) { await rollback(e.message || 'Payment verification failed. Your cart has been restored.'); }
        },
        modal:{ ondismiss:() => rollback('Payment cancelled. Your cart has been restored.') }
      });
      gateway.on('payment.failed', () => rollback('Payment failed. No order was sent to the kitchen; your cart is ready to retry.'));
      gateway.open();
    } catch (e:any) { setCart(cartBeforePayment); setOpen(true); setError(e.message); }
  }

  if (error && !data) return <div className="center">{error}</div>;
  if (!data) return <div className="center">Preparing the menu…</div>;
  if (order) return <div className="orderStatus"><div className="brand"><span>IK</span> Indian Kitchen</div><p className="eyebrow red">Order #{order.order_number}</p><h1>Your meal is<br/><em>{order.status === 'placed' ? 'on its way to the kitchen' : order.status}.</em></h1><div className="steps">{['placed','accepted','preparing','ready','served'].map((status,index) => <div className={['placed','accepted','preparing','ready','served'].indexOf(order.status) >= index ? 'done' : ''} key={status}><i/>{status}</div>)}</div><p>{order.payment_status === 'paid' ? 'Payment received' : order.payment_method === 'cash' ? 'Please pay cash at the counter.' : 'Confirming payment…'}</p>{order.payment_status === 'paid' && <a className="primary" href={`${API}/api/invoices/${order.id}`}>Download invoice</a>}<button className="textBtn" onClick={() => setOrder(null)}>Back to menu</button></div>;

  return <main className="menuPage"><script src="https://checkout.razorpay.com/v1/checkout.js"/><header className="menuHero"><div className="menuOverlay"/><div><p className="eyebrow">{data.table.branch_name}</p><h1>Good food.<br/><em>No hurry.</em></h1><p>{data.table.name} · {data.table.address}</p></div></header><div className="categoryNav">{data.categories.map((category:any) => <a key={category.id} href={`#c-${category.id}`}>{category.name}</a>)}</div><div className="menuContent">{data.categories.map((category:any) => <section id={`c-${category.id}`} key={category.id}><p className="eyebrow red">Explore</p><h2>{category.name}</h2><p className="sectionDesc">{category.description}</p><div className="menuGrid">{category.items.map((item:Item) => <article className="menuCard" key={item.id}><div className="foodImg" style={{backgroundImage:`url(${item.image_url})`}}><span className={item.food_type}>{item.food_type === 'veg' ? 'Veg' : 'Non-veg'}</span></div><div className="foodBody"><h3>{item.name}</h3><p>{item.description}</p><div><b>{money(item.price)}</b><button onClick={() => add(item)}>{cart[item.id] ? <><Minus onClick={event => {event.stopPropagation(); add(item,-1);}}/> {cart[item.id].qty} <Plus/></> : <>Add <Plus/></>}</button></div></div></article>)}</div></section>)}</div>{qty > 0 && <button className="cartBar" onClick={() => setOpen(true)}><span><ShoppingBag/> {qty} item{qty > 1 ? 's' : ''}</span><b>{money(total)} · View cart</b></button>}{open && <div className="drawer"><div className="backdrop" onClick={() => setOpen(false)}/><aside><button className="close" onClick={() => setOpen(false)}><X/></button><p className="eyebrow red">Your table</p><h2>Almost ready.</h2>{Object.values(cart).map(line => <div className="cartItem" key={line.item.id}><div><b>{line.item.name}</b><span>{money(line.item.price)}</span></div><div><button onClick={() => add(line.item,-1)}><Minus/></button>{line.qty}<button onClick={() => add(line.item)}><Plus/></button></div></div>)}<div className="payment"><label><input type="radio" checked={payment === 'cash'} onChange={() => setPayment('cash')}/> Cash at counter</label><label><input type="radio" checked={payment === 'upi'} onChange={() => setPayment('upi')}/> Pay by UPI</label></div>{error && <p className="error">{error}</p>}<button className="checkout" onClick={checkout}>Place order · {money(total * 1.05)}</button><small>Includes 5% GST</small></aside></div>}</main>;
}
