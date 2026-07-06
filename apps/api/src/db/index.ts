import { Pool, PoolClient, QueryResultRow } from 'pg';
import { config } from '../config';
export const db=new Pool({connectionString:config.DATABASE_URL,ssl:config.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});
export const query=<T extends QueryResultRow=any>(text:string,params?:unknown[])=>db.query<T>(text,params);
export async function transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await db.connect();try{await c.query('BEGIN');const v=await fn(c);await c.query('COMMIT');return v}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
