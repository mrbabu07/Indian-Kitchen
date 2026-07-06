import { rateLimit } from 'express-rate-limit';

const response = {message:'Too many attempts. Please wait a few minutes and try again.'};
export const loginLimiter = rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,skipSuccessfulRequests:true,message:response});
export const orderLimiter = rateLimit({windowMs:10*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:response});
export const publicReadLimiter = rateLimit({windowMs:60*1000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,message:response});
