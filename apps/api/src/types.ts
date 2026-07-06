import { Request } from 'express';
export type Role='admin'|'operator'|'kitchen';
export interface StaffToken {id:string;branchId:string;role:Role;name:string;sessionId:string}
export interface AuthRequest extends Request {staff?:StaffToken}
