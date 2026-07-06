import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db';
import { auth, permit } from '../middleware/auth';
import { AuthRequest } from '../types';
import { emitOrder, nextStatus } from '../lib/orders';

export const staffRouter = Router();
staffRouter.use(auth);

staffRouter.get('/orders', async (req:AuthRequest,res,next) => {
  try {
    const active=req.query.active==='true';
    let where='o.branch_id=$1';
    if(active)where+=" AND o.status NOT IN ('served','cancelled')";
    const result=await query(`SELECT o.*,t.name table_name,json_agg(json_build_object('id',oi.id,'menu_item_id',oi.menu_item_id,'item_name',oi.item_name,'unit_price',oi.unit_price,'quantity',oi.quantity,'special_instructions',oi.special_instructions,'line_total',oi.line_total,'image_url',mi.image_url) ORDER BY oi.item_name) items FROM orders o JOIN restaurant_tables t ON t.id=o.table_id JOIN order_items oi ON oi.order_id=o.id LEFT JOIN menu_items mi ON mi.id=oi.menu_item_id WHERE ${where} GROUP BY o.id,t.name ORDER BY o.created_at DESC LIMIT 200`,[req.staff!.branchId]);
    res.json(result.rows);
  } catch(e){next(e)}
});

staffRouter.patch('/orders/:id/status',permit('admin','operator','kitchen'),async(req:AuthRequest,res,next)=>{
  try {
    const {status}=z.object({status:z.enum(['accepted','preparing','ready','served','cancelled'])}).parse(req.body);
    if(req.staff!.role==='kitchen'&&!['accepted','preparing','ready'].includes(status))return res.status(403).json({message:'Kitchen cannot set this status'});
    if(req.staff!.role==='operator'&&!['served','cancelled'].includes(status))return res.status(403).json({message:'Operator cannot set this status'});
    const id=String(req.params.id);
    await transaction(client=>nextStatus(client,id,status,req.staff!.branchId));
    res.json(await emitOrder(req.app.get('io'),id));
  } catch(e){next(e)}
});

staffRouter.patch('/orders/:id/payment',permit('admin','operator'),async(req:AuthRequest,res,next)=>{
  try {
    const id=String(req.params.id);
    const result=await query("UPDATE orders SET payment_status='paid',updated_at=now() WHERE id=$1 AND branch_id=$2 AND payment_method='cash' AND payment_status='pending' RETURNING id",[id,req.staff!.branchId]);
    if(!result.rows[0]){
      const current=await query('SELECT payment_status FROM orders WHERE id=$1 AND branch_id=$2',[id,req.staff!.branchId]);
      if(current.rows[0]?.payment_status==='paid')return res.json(await emitOrder(req.app.get('io'),id));
      return res.status(400).json({message:'Cash order is not pending'});
    }
    res.json(await emitOrder(req.app.get('io'),id));
  } catch(e){next(e)}
});

staffRouter.get('/menu-availability',permit('admin','kitchen'),async(req:AuthRequest,res,next)=>{
  try {
    const result=await query('SELECT m.id,m.name,m.description,m.image_url,m.food_type,m.available,c.name category_name FROM menu_items m JOIN categories c ON c.id=m.category_id WHERE m.branch_id=$1 ORDER BY c.sort_order,m.name',[req.staff!.branchId]);
    res.json(result.rows);
  } catch(e){next(e)}
});

staffRouter.patch('/menu-availability/:id',permit('admin','kitchen'),async(req:AuthRequest,res,next)=>{
  try {
    const {available}=z.object({available:z.boolean()}).parse(req.body);
    const result=await query('UPDATE menu_items SET available=$1,updated_at=now() WHERE id=$2 AND branch_id=$3 RETURNING id,name,available',[available,String(req.params.id),req.staff!.branchId]);
    if(!result.rows[0])return res.status(404).json({message:'Menu item not found'});
    req.app.get('io').to(`branch:${req.staff!.branchId}`).emit('menu:availability',result.rows[0]);
    res.json(result.rows[0]);
  } catch(e){next(e)}
});

staffRouter.get('/analytics',permit('admin'),async(req:AuthRequest,res,next)=>{
  try {
    const [summary,top,daily]=await Promise.all([
      query("SELECT count(*) orders,COALESCE(sum(total) FILTER(WHERE payment_status='paid'),0) revenue FROM orders WHERE branch_id=$1 AND created_at>=current_date",[req.staff!.branchId]),
      query("SELECT oi.item_name,sum(oi.quantity)::int quantity,sum(oi.line_total) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.branch_id=$1 AND o.payment_status='paid' GROUP BY oi.item_name ORDER BY quantity DESC LIMIT 5",[req.staff!.branchId]),
      query("SELECT created_at::date AS report_date,sum(total) FILTER(WHERE payment_status='paid') revenue,count(*) orders FROM orders WHERE branch_id=$1 AND created_at>=current_date-6 GROUP BY created_at::date ORDER BY created_at::date",[req.staff!.branchId])
    ]);
    res.json({summary:summary.rows[0],topItems:top.rows,daily:daily.rows});
  } catch(e){next(e)}
});
