import { PoolClient } from 'pg';
import { query } from '../db';

type AuditInput={branchId?:string|null;userId?:string|null;action:string;entityType:string;entityId?:string|null;before?:unknown;after?:unknown;metadata?:unknown};
export async function audit(input:AuditInput,client?:PoolClient){const runner=client?client.query.bind(client):query;await runner('INSERT INTO audit_logs(branch_id,user_id,action,entity_type,entity_id,before_data,after_data,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)',[input.branchId||null,input.userId||null,input.action,input.entityType,input.entityId||null,input.before?JSON.stringify(input.before):null,input.after?JSON.stringify(input.after):null,input.metadata?JSON.stringify(input.metadata):null])}
