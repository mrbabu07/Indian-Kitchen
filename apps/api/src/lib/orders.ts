import { Server } from 'socket.io';
import { PoolClient } from 'pg';
import { query } from '../db';
import { audit } from './audit';

export async function getOrder(id:string){const order=await query(`SELECT o.*,t.name table_name,b.name branch_name,b.address,b.phone,b.gst_number,collector.name payment_collected_by_name,acceptor.name accepted_by_name,preparer.name preparing_by_name,ready_staff.name ready_by_name,server.name served_by_name,canceller.name cancelled_by_name FROM orders o JOIN restaurant_tables t ON t.id=o.table_id JOIN branches b ON b.id=o.branch_id LEFT JOIN users collector ON collector.id=o.payment_collected_by LEFT JOIN users acceptor ON acceptor.id=o.accepted_by LEFT JOIN users preparer ON preparer.id=o.preparing_by LEFT JOIN users ready_staff ON ready_staff.id=o.ready_by LEFT JOIN users server ON server.id=o.served_by LEFT JOIN users canceller ON canceller.id=o.cancelled_by WHERE o.id=$1`,[id]);if(!order.rows[0])return null;const items=await query('SELECT oi.*,m.image_url FROM order_items oi LEFT JOIN menu_items m ON m.id=oi.menu_item_id WHERE oi.order_id=$1 ORDER BY oi.item_name',[id]);const history=await query('SELECT h.*,u.name changed_by_name FROM order_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.order_id=$1 ORDER BY h.created_at',[id]);return{...order.rows[0],items:items.rows,status_history:history.rows}}
export async function emitOrder(io:Server,id:string,event='order:updated'){const order=await getOrder(id);if(order)io.to(`branch:${order.branch_id}`).emit(event,order);return order}

export async function nextStatus(client:PoolClient,id:string,status:string,branchId:string,userId:string,reason?:string,override=false){
  const allowed:any={placed:['accepted','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['served','cancelled']};
  const currentResult=await client.query('SELECT * FROM orders WHERE id=$1 AND branch_id=$2 FOR UPDATE',[id,branchId]);const current=currentResult.rows[0];
  if(!current)throw new Error('Order not found');if(current.status===status)return;
  if(status==='cancelled'&&!reason?.trim())throw new Error('Cancellation reason is required');
  if(!override&&!allowed[current.status]?.includes(status))throw new Error(`Cannot change ${current.status} to ${status}`);
  if(status==='served'&&current.payment_status!=='paid')throw new Error('Payment must be received before serving this order');
  const actorColumn:any={accepted:'accepted_by',preparing:'preparing_by',ready:'ready_by',served:'served_by',cancelled:'cancelled_by'};
  const timeColumn:any={accepted:'accepted_at',preparing:'preparing_at',ready:'ready_at',served:'served_at',cancelled:'cancelled_at'};
  const actor=actorColumn[status],time=timeColumn[status];
  await client.query(`UPDATE orders SET status=$1::order_status,updated_at=now()${actor?`,${actor}=$3,${time}=now()`:''}${status==='cancelled'?',cancellation_reason=$4':''} WHERE id=$2`,actor?(status==='cancelled'?[status,id,userId,reason||null]:[status,id,userId]):[status,id]);
  await client.query('INSERT INTO order_status_history(branch_id,order_id,from_status,to_status,changed_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[branchId,id,current.status,status,userId,reason||null]);
  await audit({branchId,userId,action:override?'order.override':'order.status_change',entityType:'order',entityId:id,before:{status:current.status},after:{status},metadata:{reason}},client);
}
