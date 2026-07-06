import { Router } from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { z } from 'zod';
import { query } from '../db';
import { auth, permit } from '../middleware/auth';
import { config } from '../config';
import { AuthRequest } from '../types';

export const adminRouter = Router();
adminRouter.use(auth, permit('admin'));

const categorySchema = z.object({ name:z.string().min(2), description:z.string().optional().nullable(), sort_order:z.coerce.number().int().default(0), active:z.boolean().default(true) });
const menuSchema = z.object({ category_id:z.string().uuid(), name:z.string().min(2), description:z.string().optional().nullable(), price:z.coerce.number().nonnegative(), image_url:z.string().optional().nullable(), food_type:z.enum(['veg','non_veg']), available:z.boolean().default(true) });
const tableSchema = z.object({ name:z.string().min(1), capacity:z.coerce.number().int().positive(), active:z.boolean().default(true) });
const resources = {
  categories:{ table:'categories', fields:['name','description','sort_order','active'], schema:categorySchema },
  menu:{ table:'menu_items', fields:['category_id','name','description','price','image_url','food_type','available'], schema:menuSchema },
  tables:{ table:'restaurant_tables', fields:['name','capacity','active'], schema:tableSchema }
} as const;

for (const [path, resource] of Object.entries(resources)) {
  adminRouter.get(`/${path}`, async (req:AuthRequest, res, next) => {
    try {
      const sql = path === 'menu'
        ? 'SELECT m.*,c.name category_name FROM menu_items m JOIN categories c ON c.id=m.category_id WHERE m.branch_id=$1 ORDER BY c.sort_order,m.name'
        : `SELECT * FROM ${resource.table} WHERE branch_id=$1 ORDER BY created_at DESC`;
      res.json((await query(sql, [req.staff!.branchId])).rows);
    } catch (e) { next(e); }
  });
  adminRouter.post(`/${path}`, async (req:AuthRequest, res, next) => {
    try {
      const parsed = resource.schema.parse(req.body) as Record<string,unknown>;
      const fields = resource.fields.filter(field => parsed[field] !== undefined);
      const values = fields.map(field => parsed[field]);
      const result = await query(`INSERT INTO ${resource.table}(branch_id,${fields.join(',')}) VALUES($1,${fields.map((_,i) => `$${i+2}`).join(',')}) RETURNING *`, [req.staff!.branchId,...values]);
      res.status(201).json(result.rows[0]);
    } catch (e) { next(e); }
  });
  adminRouter.patch(`/${path}/:id`, async (req:AuthRequest, res, next) => {
    try {
      const parsed = resource.schema.partial().parse(req.body) as Record<string,unknown>;
      const fields = resource.fields.filter(field => parsed[field] !== undefined);
      if (!fields.length) return res.status(400).json({message:'No changes supplied'});
      const values = fields.map(field => parsed[field]);
      const result = await query(`UPDATE ${resource.table} SET ${fields.map((field,i) => `${field}=$${i+1}`).join(',')}${resource.table === 'menu_items' ? ',updated_at=now()' : ''} WHERE id=$${fields.length+1} AND branch_id=$${fields.length+2} RETURNING *`, [...values,String(req.params.id),req.staff!.branchId]);
      if (!result.rows[0]) return res.status(404).json({message:'Record not found'});
      res.json(result.rows[0]);
    } catch (e) { next(e); }
  });
  adminRouter.delete(`/${path}/:id`, async (req:AuthRequest, res, next) => {
    try {
      const result = await query(`DELETE FROM ${resource.table} WHERE id=$1 AND branch_id=$2 RETURNING id`, [String(req.params.id),req.staff!.branchId]);
      if (!result.rows[0]) return res.status(404).json({message:'Record not found'});
      res.status(204).end();
    } catch (e) { next(e); }
  });
}

adminRouter.get('/branches', async (req:AuthRequest,res,next) => {
  try { res.json((await query('SELECT id,name,slug,address,phone,gst_number,gst_percent,active FROM branches WHERE id=$1', [req.staff!.branchId])).rows); }
  catch (e) { next(e); }
});

adminRouter.patch('/branches/:id', async (req:AuthRequest,res,next) => {
  try {
    if (String(req.params.id) !== req.staff!.branchId) return res.status(403).json({message:'You can only manage your assigned branch'});
    const parsed = z.object({ name:z.string().min(2).optional(), address:z.string().min(4).optional(), phone:z.string().optional(), gst_number:z.string().optional(), gst_percent:z.coerce.number().min(0).max(100).optional(), razorpay_key_id:z.string().optional(), razorpay_key_secret:z.string().optional() }).parse(req.body);
    const fields = Object.keys(parsed), values = Object.values(parsed);
    if (!fields.length) return res.status(400).json({message:'No changes supplied'});
    const result = await query(`UPDATE branches SET ${fields.map((field,i) => `${field}=$${i+1}`).join(',')},updated_at=now() WHERE id=$${fields.length+1} RETURNING id,name,slug,address,phone,gst_number,gst_percent,active`, [...values,req.staff!.branchId]);
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

adminRouter.get('/staff', async (req:AuthRequest,res,next) => {
  try { res.json((await query('SELECT id,name,email,role,active,created_at FROM users WHERE branch_id=$1 ORDER BY created_at DESC', [req.staff!.branchId])).rows); }
  catch (e) { next(e); }
});
adminRouter.post('/staff', async (req:AuthRequest,res,next) => {
  try {
    const parsed = z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(6),role:z.enum(['operator','kitchen'])}).parse(req.body);
    const passwordHash = await bcrypt.hash(parsed.password,12);
    const result = await query('INSERT INTO users(branch_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,active', [req.staff!.branchId,parsed.name,parsed.email,passwordHash,parsed.role]);
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
});
adminRouter.patch('/staff/:id', async (req:AuthRequest,res,next) => {
  try {
    const parsed = z.object({name:z.string().min(2).optional(),role:z.enum(['operator','kitchen']).optional(),active:z.boolean().optional(),password:z.string().min(6).optional()}).parse(req.body);
    const update:Record<string,unknown> = {...parsed};
    if (parsed.password) { update.password_hash = await bcrypt.hash(parsed.password,12); delete update.password; }
    const fields = Object.keys(update), values = Object.values(update);
    if (!fields.length) return res.status(400).json({message:'No changes supplied'});
    const result = await query(`UPDATE users SET ${fields.map((field,i) => `${field}=$${i+1}`).join(',')},updated_at=now() WHERE id=$${fields.length+1} AND branch_id=$${fields.length+2} AND role!='admin' RETURNING id,name,email,role,active`, [...values,String(req.params.id),req.staff!.branchId]);
    if (!result.rows[0]) return res.status(404).json({message:'Staff member not found'});
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

adminRouter.get('/tables/:id/qr', async (req:AuthRequest,res,next) => {
  try {
    const result = await query('SELECT qr_token,name FROM restaurant_tables WHERE id=$1 AND branch_id=$2', [String(req.params.id),req.staff!.branchId]);
    if (!result.rows[0]) return res.status(404).end();
    const png = await QRCode.toBuffer(`${config.PUBLIC_APP_URL}/menu/${result.rows[0].qr_token}`, {width:900,margin:2,color:{dark:'#21160f',light:'#fffaf0'}});
    res.type('png').attachment(`${result.rows[0].name.replace(/\s+/g,'-').toLowerCase()}-qr.png`).send(png);
  } catch (e) { next(e); }
});
