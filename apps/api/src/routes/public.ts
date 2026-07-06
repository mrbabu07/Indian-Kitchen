import { Router } from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { query } from '../db';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { emitOrder, getOrder } from '../lib/orders';
import { orderLimiter, publicReadLimiter } from '../middleware/security';

export const publicRouter = Router();

publicRouter.get('/default-table', publicReadLimiter, async (_req,res,next) => {
  try {
    const result=await query('SELECT t.qr_token FROM restaurant_tables t JOIN branches b ON b.id=t.branch_id WHERE t.active=true AND b.active=true ORDER BY t.created_at LIMIT 1');
    if(!result.rows[0])return res.status(404).json({message:'No active table is configured'});
    res.json({token:result.rows[0].qr_token});
  } catch(e){next(e)}
});

publicRouter.get('/menu/:token', publicReadLimiter, async (req, res, next) => {
  try {
    const t = await query('SELECT t.*,b.name branch_name,b.address,b.phone,b.gst_percent FROM restaurant_tables t JOIN branches b ON b.id=t.branch_id WHERE t.qr_token=$1 AND t.active=true AND b.active=true', [req.params.token]);
    if (!t.rows[0]) return res.status(404).json({ message: 'Table not found' });
    const cats = await query('SELECT * FROM categories WHERE branch_id=$1 AND active=true ORDER BY sort_order,name', [t.rows[0].branch_id]);
    const items = await query('SELECT * FROM menu_items WHERE branch_id=$1 AND available=true ORDER BY name', [t.rows[0].branch_id]);
    res.json({ table: t.rows[0], categories: cats.rows.map(c => ({ ...c, items: items.rows.filter(i => i.category_id === c.id) })) });
  } catch (e) { next(e); }
});

const orderSchema = z.object({
  tableToken: z.string().uuid(), paymentMethod: z.enum(['cash', 'upi']),
  customerName: z.string().max(120).optional(), customerPhone: z.string().max(30).optional(), notes: z.string().max(500).optional(),
  items: z.array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(20), specialInstructions: z.string().max(300).optional() })).min(1)
});

publicRouter.post('/orders', orderLimiter, async (req, res, next) => {
  try {
    const input = orderSchema.parse(req.body);
    const created = await prisma.$transaction(async tx => {
      const table = await tx.restaurantTable.findFirst({
        where: { qrToken: input.tableToken, active: true, branch: { active: true } },
        include: { branch: true }
      });
      if (!table) throw new Error('Invalid table');

      const uniqueIds = [...new Set(input.items.map(x => x.menuItemId))];
      const menuItems = await tx.menuItem.findMany({ where: { id: { in: uniqueIds }, branchId: table.branchId, available: true } });
      if (menuItems.length !== uniqueIds.length) throw new Error('One or more items are unavailable');

      const subtotal = input.items.reduce((sum, x) => sum + Number(menuItems.find(m => m.id === x.menuItemId)!.price) * x.quantity, 0);
      const taxAmount = subtotal * Number(table.branch.gstPercent) / 100;
      const total = subtotal + taxAmount;
      const order = await tx.order.create({
        data: {
          branchId: table.branchId, tableId: table.id, paymentMethod: input.paymentMethod,
          subtotal: new Prisma.Decimal(subtotal), taxAmount: new Prisma.Decimal(taxAmount), total: new Prisma.Decimal(total),
          customerName: input.customerName, customerPhone: input.customerPhone, notes: input.notes,
          items: { create: input.items.map(x => {
            const item = menuItems.find(m => m.id === x.menuItemId)!;
            return { branchId: table.branchId, menuItemId: item.id, itemName: item.name, unitPrice: item.price, quantity: x.quantity, specialInstructions: x.specialInstructions, lineTotal: item.price.mul(x.quantity) };
          }) }
        }
      });
      return { id: order.id, orderNumber: order.orderNumber.toString(), total, branch: table.branch };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (input.paymentMethod === 'cash') {
      const order = await emitOrder(req.app.get('io'), created.id, 'order:new');
      return res.status(201).json({ id: created.id, razorpay: null, keyId: null, order });
    }

    const keyId = created.branch.razorpayKeyId || config.RAZORPAY_KEY_ID;
    const keySecret = created.branch.razorpayKeySecret || config.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      await prisma.$transaction(tx => tx.order.delete({ where: { id: created.id } }));
      throw new Error('UPI payment is not configured');
    }

    try {
      const razorpay = await new Razorpay({ key_id: keyId, key_secret: keySecret }).orders.create({ amount: Math.round(created.total * 100), currency: 'INR', receipt: created.orderNumber });
      await prisma.order.update({ where: { id: created.id }, data: { razorpayOrderId: razorpay.id } });
      return res.status(201).json({ id: created.id, razorpay, keyId, order: await getOrder(created.id) });
    } catch (error) {
      // Compensating rollback: the local order and its nested items are removed if Razorpay order creation fails.
      await prisma.$transaction(tx => tx.order.delete({ where: { id: created.id } }));
      throw error;
    }
  } catch (e) { next(e); }
});

publicRouter.post('/orders/:id/verify-payment', async (req, res, next) => {
  try {
    const body = z.object({ razorpay_payment_id: z.string(), razorpay_order_id: z.string(), razorpay_signature: z.string() }).parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: String(req.params.id) }, include: { branch: true } });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.razorpayOrderId !== body.razorpay_order_id) return res.status(400).json({ message: 'Payment order mismatch' });
    const secret = order.branch.razorpayKeySecret || config.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error('Payment configuration missing');
    const expected = crypto.createHmac('sha256', secret).update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(body.razorpay_signature))) {
      await prisma.$transaction(tx => tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'failed', status: 'cancelled' } }));
      await query("INSERT INTO payment_transactions(branch_id,order_id,provider,event_type,status,amount,provider_order_id,provider_payment_id,payload) VALUES($1,$2,'razorpay','signature_verification','failed',$3,$4,$5,$6::jsonb)",[order.branchId,order.id,order.total.toString(),body.razorpay_order_id,body.razorpay_payment_id,JSON.stringify(body)]);
      return res.status(400).json({ message: 'Payment verification failed' });
    }
    await prisma.$transaction(async tx => {
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      if (current.paymentStatus !== 'pending' || current.status === 'cancelled') throw new Error('Order is no longer payable');
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'paid', razorpayPaymentId: body.razorpay_payment_id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await query("INSERT INTO payment_transactions(branch_id,order_id,provider,event_type,status,amount,provider_order_id,provider_payment_id,payload) VALUES($1,$2,'razorpay','payment_verified','paid',$3,$4,$5,$6::jsonb)",[order.branchId,order.id,order.total.toString(),body.razorpay_order_id,body.razorpay_payment_id,JSON.stringify(body)]);
    res.json(await emitOrder(req.app.get('io'), order.id, 'order:new'));
  } catch (e) { next(e); }
});

publicRouter.post('/orders/:id/payment-failed', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new Error('Order not found');
      if (order.paymentMethod !== 'upi' || order.paymentStatus !== 'pending') throw new Error('Order cannot be rolled back');
      return tx.order.update({ where: { id }, data: { paymentStatus: 'failed', status: 'cancelled' } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await query("INSERT INTO payment_transactions(branch_id,order_id,provider,event_type,status,amount,provider_order_id) SELECT branch_id,id,'razorpay','checkout_failed','failed',total,razorpay_order_id FROM orders WHERE id=$1",[result.id]);
    res.json({ id: result.id, status: result.status, paymentStatus: result.paymentStatus, rolledBack: true });
  } catch (e) { next(e); }
});

publicRouter.get('/orders/:id', async (req, res) => {
  const o = await getOrder(String(req.params.id));
  o ? res.json(o) : res.status(404).json({ message: 'Order not found' });
});
