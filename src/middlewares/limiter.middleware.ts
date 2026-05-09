import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 5 * 1000, 
    max: 10, 
    message: {message:"Too many requests from this IP, please try again later",status:"failed"},
});
