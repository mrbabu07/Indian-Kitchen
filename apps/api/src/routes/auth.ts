import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query,transaction } from '../db';
import { config } from '../config';
import { auth } from '../middleware/auth';
import { loginLimiter } from '../middleware/security';
import { AuthRequest } from '../types';

export const authRouter=Router();
authRouter.post('/login',loginLimiter,async(req,res,next)=>{try{const{email,password}=z.object({email:z.string().email(),password:z.string().min(6)}).parse(req.body);const result=await query('SELECT * FROM users WHERE email=$1 AND active=true',[email]);const user=result.rows[0];if(!user||!await bcrypt.compare(password,user.password_hash))return res.status(401).json({message:'Invalid email or password'});const session=await transaction(async client=>{await client.query('UPDATE staff_sessions SET revoked_at=now() WHERE user_id=$1 AND (expires_at<=now() OR last_seen_at<=now()-interval \'30 minutes\') AND revoked_at IS NULL',[user.id]);return(await client.query("INSERT INTO staff_sessions(user_id,branch_id,expires_at) VALUES($1,$2,now()+interval '12 hours') RETURNING id",[user.id,user.branch_id])).rows[0]});const staff={id:user.id,branchId:user.branch_id,role:user.role,name:user.name,sessionId:session.id};res.json({token:jwt.sign(staff,config.JWT_SECRET,{expiresIn:'12h'}),staff:{id:user.id,branchId:user.branch_id,role:user.role,name:user.name}})}catch(e){next(e)}});
authRouter.get('/me',auth,(req:AuthRequest,res)=>res.json(req.staff));
authRouter.post('/logout',auth,async(req:AuthRequest,res,next)=>{try{await query('UPDATE staff_sessions SET revoked_at=now() WHERE id=$1',[req.staff!.sessionId]);res.status(204).end()}catch(e){next(e)}});
