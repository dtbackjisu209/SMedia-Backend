import "reflect-metadata";
import express from 'express';
import cors from 'cors'; 
import { errorHandler } from './core/handler/error-handle.js';
import postRouter from './modules/post/post.route.js';

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/v1/posts', postRouter);
app.use(errorHandler);

export default app;