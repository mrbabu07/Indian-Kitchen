import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';
dotenv.config({path:path.resolve(__dirname,'../.env')});
const schema=z.object({PORT:z.coerce.number().default(4000),DATABASE_URL:z.string().min(1),JWT_SECRET:z.string().min(16),FRONTEND_URL:z.string().default('http://localhost:3000'),PUBLIC_APP_URL:z.string().default('http://localhost:3000'),RAZORPAY_KEY_ID:z.string().optional(),RAZORPAY_KEY_SECRET:z.string().optional(),GST_PERCENT:z.coerce.number().default(5)});
export const config=schema.parse(process.env);
