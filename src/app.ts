import "reflect-metadata";
import express from 'express';
import cors from 'cors'; 
import { errorHandler } from './core/handler/error-handle.js';
import postRouter from './modules/post/post.route.js';
import authRouter from './modules/auth/auth.route.js';

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/auth', authRouter);
app.use(errorHandler);

export default app;