import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db';
import { AuthRequest, Role, StaffToken } from '../types';

export async function auth(req:AuthRequest,res:Response,next:NextFunction){
  const token=req.headers.authorization?.replace(/^Bearer /,'');
  if(!token)return res.status(401).json({message:'Authentication required',code:'AUTH_REQUIRED'});
  try{
    const payload=jwt.verify(token,config.JWT_SECRET) as StaffToken;
    const result=await query(`SELECT u.id,u.name,u.role,u.branch_id,s.id session_id FROM users u JOIN staff_sessions s ON s.user_id=u.id WHERE u.id=$1 AND s.id=$2 AND u.active=true AND s.revoked_at IS NULL AND s.expires_at>now() AND s.last_seen_at>now()-interval '30 minutes'`,[payload.id,payload.sessionId]);
    const current=result.rows[0];
    if(!current)return res.status(401).json({message:'Your session expired or account was deactivated',code:'SESSION_EXPIRED'});
    await query('UPDATE staff_sessions SET last_seen_at=now() WHERE id=$1',[current.session_id]);
    req.staff={id:current.id,name:current.name,role:current.role,branchId:current.branch_id,sessionId:current.session_id};
    next();
  }catch{return res.status(401).json({message:'Invalid or expired session',code:'SESSION_EXPIRED'})}
}

export const permit=(...roles:Role[])=>(req:AuthRequest,res:Response,next:NextFunction)=>roles.includes(req.staff!.role)?next():res.status(403).json({message:'This role does not have permission for this action',code:'FORBIDDEN'});

export function requestedBranch(req:AuthRequest){const selected=typeof req.query.branchId==='string'?req.query.branchId:undefined;return req.staff!.role==='admin'&&selected?selected:req.staff!.branchId}
