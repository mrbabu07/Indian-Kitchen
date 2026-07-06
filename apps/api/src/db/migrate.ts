import fs from 'node:fs'; import path from 'node:path'; import { db } from './index';
async function main(){const sql=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');await db.query(sql);console.log('Database migrated');await db.end()} main().catch(e=>{console.error(e);process.exit(1)});
