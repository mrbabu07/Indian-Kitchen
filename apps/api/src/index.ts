import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import http from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { config } from './config';
import { db } from './db';
import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { staffRouter } from './routes/staff';
import { adminRouter } from './routes/admin';
import { invoiceRouter } from './routes/invoice';
import { StaffToken } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:config.FRONTEND_URL}});

app.set('trust proxy',1);
app.set('io',io);
app.use(helmet());
app.use(cors({origin:config.FRONTEND_URL,methods:['GET','POST','PATCH','DELETE'],allowedHeaders:['Content-Type','Authorization']}));
app.use((req,res,next)=>{const requestId=String(req.headers['x-request-id']||crypto.randomUUID());res.setHeader('X-Request-Id',requestId);next()});
app.use(express.json({limit:'250kb'}));
app.get('/health',async(_req,res)=>{await db.query('SELECT 1');res.json({status:'ok'})});
app.use('/api/auth',authRouter);
app.use('/api/public',publicRouter);
app.use('/api/staff',staffRouter);
app.use('/api/admin',adminRouter);
app.use('/api/invoices',invoiceRouter);
app.use((_req,res)=>res.status(404).json({message:'API route not found'}));
app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);if(err instanceof ZodError)return res.status(400).json({message:'Invalid request',issues:err.issues});res.status(err.message==='Order not found'?404:400).json({message:err.message||'Unexpected error'})});

io.use((socket,next)=>{try{const token=socket.handshake.auth.token;if(!token)return next(new Error('Authentication required'));socket.data.staff=jwt.verify(token,config.JWT_SECRET) as StaffToken;next()}catch{next(new Error('Invalid session'))}});
io.on('connection',socket=>socket.join(`branch:${socket.data.staff.branchId}`));
server.listen(config.PORT,()=>console.log(`Indian Kitchen API on ${config.PORT}`));
